/**
 * UberFix API Gateway — OpenAPI 3.1 specification.
 * Hand-authored, kept in sync with `supabase/functions/maintenance-gateway`,
 * `api-oauth-token`, and `api-webhook-dispatcher`.
 */

const SUPABASE_URL = 'https://zrrffsjbfkphridqyais.supabase.co';

export const openApiSpec = {
  openapi: '3.1.0',
  info: {
    title: 'UberFix API Gateway',
    version: '1.0.0',
    description:
      'بوابة موحّدة لإدارة طلبات الصيانة، الفنيين، العقارات، والفواتير. تدعم API Key و OAuth2 client_credentials، وتوقّع Webhooks بـ HMAC-SHA256.',
    contact: { name: 'UberFix Platform', email: 'api@uberfix.shop' },
  },
  servers: [
    { url: `${SUPABASE_URL}/functions/v1`, description: 'Production (Lovable Cloud)' },
    { url: 'https://supabase.alazab.com/functions/v1', description: 'Self-hosted (Kong)' },
  ],
  security: [{ apiKey: [] }, { oauth2: [] }],
  components: {
    securitySchemes: {
      apiKey: {
        type: 'apiKey',
        in: 'header',
        name: 'X-API-Key',
        description: 'مفتاح ثابت للبوتات والأدوات الداخلية. الصيغة: `uf_xxxxxxxx`.',
      },
      oauth2: {
        type: 'oauth2',
        description: 'OAuth2 client_credentials. التوكن صالح ساعة، يحمل scopes معتمدة.',
        flows: {
          clientCredentials: {
            tokenUrl: `${SUPABASE_URL}/functions/v1/api-oauth-token`,
            scopes: {
              'requests:read': 'قراءة طلبات الصيانة',
              'requests:write': 'إنشاء/تعديل الطلبات',
              'properties:read': 'قراءة العقارات',
              'properties:write': 'تعديل العقارات',
              'technicians:read': 'قراءة الفنيين',
              'invoices:read': 'قراءة الفواتير',
              'webhooks:manage': 'إدارة اشتراكات Webhooks',
              'media:upload': 'رفع ملفات للتخزين الموجّه',
            },
          },
        },
      },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          error: { type: 'string', example: 'invalid_request' },
          error_description: { type: 'string', example: 'client_id is required' },
        },
      },
      TokenResponse: {
        type: 'object',
        properties: {
          access_token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
          token_type: { type: 'string', example: 'Bearer' },
          expires_in: { type: 'integer', example: 3600 },
          scope: { type: 'string', example: 'requests:read requests:write' },
        },
      },
      MaintenanceRequest: {
        type: 'object',
        required: ['client_phone', 'service_type'],
        properties: {
          client_phone: { type: 'string', example: '+201001234567' },
          client_name: { type: 'string', example: 'أحمد محمد' },
          service_type: {
            type: 'string',
            enum: ['ac_repair', 'plumbing', 'electrical', 'appliance', 'general'],
            example: 'ac_repair',
          },
          description: { type: 'string', example: 'التكييف لا يبرّد' },
          address: { type: 'string', example: 'القاهرة، المعادي' },
          property_id: { type: 'string', format: 'uuid', nullable: true },
          urgency: { type: 'string', enum: ['low', 'normal', 'high', 'emergency'], default: 'normal' },
          preferred_date: { type: 'string', format: 'date-time', nullable: true },
        },
      },
      MaintenanceRequestResponse: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          serial_number: { type: 'string', example: 'UF/MR/260426/0001' },
          status: { type: 'string', example: 'new' },
          stage: { type: 'string', example: 'submitted' },
          tracking_url: { type: 'string', format: 'uri' },
          sla_due_date: { type: 'string', format: 'date-time' },
          created_at: { type: 'string', format: 'date-time' },
        },
      },
      WebhookEvent: {
        type: 'object',
        properties: {
          event: { type: 'string', example: 'maintenance_request.created' },
          timestamp: { type: 'string', format: 'date-time' },
          data: { $ref: '#/components/schemas/MaintenanceRequestResponse' },
        },
      },
    },
    parameters: {
      IdempotencyKey: {
        name: 'Idempotency-Key',
        in: 'header',
        required: true,
        schema: { type: 'string', format: 'uuid' },
        description: 'UUID فريد لكل عملية كتابة. صالح 24 ساعة. تكرار المفتاح بنفس الجسم يُعيد نفس الاستجابة.',
      },
    },
  },
  paths: {
    '/api-oauth-token': {
      post: {
        tags: ['Authentication'],
        summary: 'إصدار توكن OAuth2',
        description: 'تبادل client_id/client_secret للحصول على Bearer token صالح ساعة.',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/x-www-form-urlencoded': {
              schema: {
                type: 'object',
                required: ['grant_type', 'client_id', 'client_secret'],
                properties: {
                  grant_type: { type: 'string', enum: ['client_credentials'] },
                  client_id: { type: 'string' },
                  client_secret: { type: 'string' },
                  scope: { type: 'string', example: 'requests:read requests:write' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'تم الإصدار',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/TokenResponse' } } },
          },
          '401': { description: 'بيانات اعتماد خاطئة', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '429': { description: 'تجاوز معدّل الطلبات' },
        },
      },
    },
    '/maintenance-gateway/requests': {
      post: {
        tags: ['Maintenance Requests'],
        summary: 'إنشاء طلب صيانة',
        description: 'إنشاء طلب جديد. يتطلّب scope `requests:write`.',
        security: [{ apiKey: [] }, { oauth2: ['requests:write'] }],
        parameters: [{ $ref: '#/components/parameters/IdempotencyKey' }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/MaintenanceRequest' } } },
        },
        responses: {
          '201': {
            description: 'تم الإنشاء',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/MaintenanceRequestResponse' } } },
          },
          '400': { description: 'بيانات غير صالحة' },
          '401': { description: 'مصادقة مفقودة' },
          '403': { description: 'Scope غير كافٍ' },
          '409': { description: 'Idempotency-Key مستخدم بجسم مختلف' },
        },
      },
      get: {
        tags: ['Maintenance Requests'],
        summary: 'قائمة الطلبات',
        security: [{ apiKey: [] }, { oauth2: ['requests:read'] }],
        parameters: [
          { name: 'status', in: 'query', schema: { type: 'string' } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 50, maximum: 200 } },
          { name: 'cursor', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          '200': {
            description: 'قائمة مرقّمة',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: { type: 'array', items: { $ref: '#/components/schemas/MaintenanceRequestResponse' } },
                    next_cursor: { type: 'string', nullable: true },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/maintenance-gateway/requests/{id}': {
      get: {
        tags: ['Maintenance Requests'],
        summary: 'تفاصيل طلب',
        security: [{ apiKey: [] }, { oauth2: ['requests:read'] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/MaintenanceRequestResponse' } } } },
          '404': { description: 'غير موجود' },
        },
      },
      patch: {
        tags: ['Maintenance Requests'],
        summary: 'تحديث طلب',
        security: [{ apiKey: [] }, { oauth2: ['requests:write'] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
          { $ref: '#/components/parameters/IdempotencyKey' },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  status: { type: 'string' },
                  notes: { type: 'string' },
                  assigned_technician_id: { type: 'string', format: 'uuid' },
                },
              },
            },
          },
        },
        responses: { '200': { description: 'تم التحديث' }, '404': { description: 'غير موجود' } },
      },
    },
    '/maintenance-gateway/track/{serial}': {
      get: {
        tags: ['Public'],
        summary: 'تتبّع طلب بالرقم التسلسلي',
        description: 'مسار عام لا يتطلب مصادقة. يُرجع بيانات مُقنّعة.',
        security: [],
        parameters: [{ name: 'serial', in: 'path', required: true, schema: { type: 'string', example: 'UF/MR/260426/0001' } }],
        responses: {
          '200': { description: 'حالة الطلب', content: { 'application/json': { schema: { $ref: '#/components/schemas/MaintenanceRequestResponse' } } } },
          '404': { description: 'غير موجود' },
        },
      },
    },
    '/maintenance-gateway/technicians': {
      get: {
        tags: ['Technicians'],
        summary: 'قائمة الفنيين',
        security: [{ apiKey: [] }, { oauth2: ['technicians:read'] }],
        parameters: [
          { name: 'specialty', in: 'query', schema: { type: 'string' } },
          { name: 'available_only', in: 'query', schema: { type: 'boolean', default: true } },
        ],
        responses: { '200': { description: 'OK' } },
      },
    },
    '/maintenance-gateway/invoices': {
      get: {
        tags: ['Invoices'],
        summary: 'قائمة الفواتير',
        security: [{ apiKey: [] }, { oauth2: ['invoices:read'] }],
        responses: { '200': { description: 'OK' } },
      },
    },
  },
  'x-webhook-events': {
    'maintenance_request.created': 'طلب جديد تمّ إنشاؤه',
    'maintenance_request.updated': 'تغيّرت بيانات أو حالة الطلب',
    'maintenance_request.assigned': 'تمّ تعيين فني',
    'maintenance_request.completed': 'اكتمل الطلب',
    'maintenance_request.cancelled': 'تمّ إلغاء الطلب',
    'invoice.created': 'فاتورة جديدة',
    'invoice.paid': 'تمّ سداد فاتورة',
  },
} as const;

export type OpenApiSpec = typeof openApiSpec;