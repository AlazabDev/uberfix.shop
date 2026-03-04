INSERT INTO wa_templates (
  tenant_id,
  name,
  category,
  language,
  header_type,
  header_content,
  body_text,
  footer_text,
  buttons,
  components,
  status
) VALUES (
  (SELECT id FROM companies LIMIT 1),
  'hello_world',
  'utility',
  'en',
  'text',
  'Welcome to UberFix',
  'Hello! Welcome to UberFix. We''re here to help you with all your maintenance needs. Thank you for choosing us!',
  'UberFix - Professional Maintenance Services',
  '[]'::jsonb,
  '[{"type": "HEADER", "format": "TEXT", "text": "Welcome to UberFix"}, {"type": "BODY", "text": "Hello! Welcome to UberFix. We''re here to help you with all your maintenance needs. Thank you for choosing us!"}, {"type": "FOOTER", "text": "UberFix - Professional Maintenance Services"}]'::jsonb,
  'draft'
) RETURNING id, name, status;