import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64, applicationType = 'technician' } = await req.json();

    if (!imageBase64) {
      throw new Error('Image data is required');
    }

    const openAIKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIKey) {
      throw new Error('OpenAI API key not configured');
    }

    console.log('🔍 Processing National ID with OCR...');

    // Use GPT-5 Vision for OCR
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // Vision model
        messages: [
          {
            role: 'system',
            content: 'You are an OCR expert. Extract data from Egyptian National ID cards. Return ONLY valid JSON with these exact fields: national_id (14 digits), full_name_arabic, birth_date (YYYY-MM-DD), address, gender (male/female), issue_date, expiry_date.',
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Extract all information from this Egyptian National ID card. Return ONLY JSON format.',
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${imageBase64}`,
                },
              },
            ],
          },
        ],
        max_tokens: 500,
        temperature: 0,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('OpenAI API error:', error);
      throw new Error(`OpenAI API error: ${error.error?.message || 'Unknown error'}`);
    }

    const result = await response.json();
    const extractedText = result.choices[0].message.content;

    console.log('📄 Extracted text:', extractedText);

    // Parse JSON response
    let extractedData;
    try {
      // Remove markdown code blocks if present
      const cleanedText = extractedText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      extractedData = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error('Failed to parse OCR response:', extractedText);
      throw new Error('Failed to extract structured data from ID card');
    }

    // Validate extracted data
    const nationalId = extractedData.national_id?.replace(/\D/g, '');
    
    if (!nationalId || nationalId.length !== 14) {
      throw new Error('Invalid National ID format. Must be 14 digits.');
    }

    // Check if National ID already exists
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: existing, error: checkError } = await supabaseClient
      .from('technician_applications')
      .select('id, status')
      .eq('national_id', nationalId)
      .maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking existing ID:', checkError);
    }

    if (existing) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'هذا الرقم القومي مسجل مسبقاً',
          existingApplication: existing,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('✅ OCR processing successful');

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          national_id: nationalId,
          full_name: extractedData.full_name_arabic,
          birth_date: extractedData.birth_date,
          address: extractedData.address,
          gender: extractedData.gender,
          issue_date: extractedData.issue_date,
          expiry_date: extractedData.expiry_date,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in process-national-id-ocr:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});