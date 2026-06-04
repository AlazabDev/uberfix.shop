import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Admin/owner only — one-time admin operation
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabaseClient.auth.getUser(token);
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    const { data: roles } = await supabaseClient
      .from('user_roles').select('role').eq('user_id', user.id);
    const isAdmin = roles?.some((r: { role: string }) => ['admin','owner'].includes(r.role));
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Define the actual folders with images
    const imageFolders = [
      'images/commercial',
      'images/construction',
      'images/cuate',
      'images/live_edge',
      'images/maintenance',
      'images/residential',
      'images/shops'
    ];

    let allImages: any[] = [];

    // Get images from each folder
    for (const folderPath of imageFolders) {
      console.log(`Scanning folder: ${folderPath}`);
      
      const { data: folderFiles, error: folderError } = await supabaseClient
        .storage
        .from('az_gallery')
        .list(folderPath, {
          limit: 1000,
          sortBy: { column: 'name', order: 'asc' }
        });

      if (folderError) {
        console.error(`Error reading folder ${folderPath}:`, folderError);
        continue;
      }

      if (folderFiles) {
        const images = folderFiles
          .filter(f => f.id !== null && isImage(f.name))
          .map(f => ({
            name: f.name,
            folder: getCategoryFromFolder(folderPath.split('/')[1]),
            path: `${folderPath}/${f.name}`
          }));
        
        console.log(`Found ${images.length} images in ${folderPath}`);
        allImages = allImages.concat(images);
      }
    }

    console.log(`Found ${allImages.length} images`);

    // Insert images into gallery_images table
    const imagesToInsert = allImages.map((img, index) => ({
      title: generateTitle(img.name, img.folder),
      description: `صورة من أعمالنا في ${img.folder}`,
      category: img.folder,
      image_url: `https://zrrffsjbfkphridqyais.supabase.co/storage/v1/object/public/az_gallery/${img.path}`,
      thumbnail_url: `https://zrrffsjbfkphridqyais.supabase.co/storage/v1/object/public/az_gallery/${img.path}`,
      is_featured: index < 5, // First 5 images are featured
      tags: [img.folder, 'أعمال', 'مشاريع'],
      display_order: index + 1
    }));

    // Check existing images to avoid duplicates
    const { data: existing } = await supabaseClient
      .from('gallery_images')
      .select('image_url');

    const existingUrls = new Set(existing?.map(e => e.image_url) || []);
    const newImages = imagesToInsert.filter(img => !existingUrls.has(img.image_url));

    console.log(`Inserting ${newImages.length} new images`);

    if (newImages.length > 0) {
      const { data, error: insertError } = await supabaseClient
        .from('gallery_images')
        .insert(newImages)
        .select();

      if (insertError) {
        throw insertError;
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `تم إضافة ${newImages.length} صورة بنجاح`,
          totalFound: allImages.length,
          inserted: newImages.length,
          skipped: allImages.length - newImages.length
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'جميع الصور موجودة مسبقاً',
        totalFound: allImages.length,
        inserted: 0,
        skipped: allImages.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

function isImage(filename: string): boolean {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
  return imageExtensions.some(ext => filename.toLowerCase().endsWith(ext));
}

function getCategoryFromFolder(folderName: string): string {
  const categoryMap: { [key: string]: string } = {
    'commercial': 'تجاري',
    'construction': 'إنشاءات',
    'cuate': 'كواتيه',
    'live_edge': 'حواف حية',
    'maintenance': 'صيانة',
    'residential': 'سكني',
    'shops': 'محلات'
  };

  return categoryMap[folderName.toLowerCase()] || folderName;
}

function generateTitle(filename: string, category: string): string {
  // Remove extension and numbers
  const name = filename.replace(/\.[^/.]+$/, '').replace(/\d+/g, '').trim();
  
  if (name.length > 3) {
    return name;
  }
  
  return `${category} - عمل متميز`;
}
