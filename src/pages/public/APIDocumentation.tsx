import { Button } from "@/components/ui/button";
import { ArrowLeft, Server, Key, Shield, Clock, Activity, AlertTriangle, Webhook } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function APIDocumentation() {
  const navigate = useNavigate();
  const lastUpdated = "January 8, 2026";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <Server className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold">UberFix.shop</span>
            </div>
            <Button variant="ghost" onClick={() => navigate(-1)}>
              Back
              <ArrowLeft className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">API Policy & Usage Documentation</h1>
          <p className="text-sm text-muted-foreground"><strong>Last Updated:</strong> {lastUpdated}</p>
        </div>

        <div className="prose prose-lg dark:prose-invert max-w-none space-y-8">
          {/* Introduction */}
          <section className="bg-muted/50 p-6 rounded-lg border">
            <p className="text-lg leading-relaxed m-0">
              The UberFix API provides programmatic access to our maintenance management platform. This document outlines our API policies, authentication requirements, rate limits, and usage guidelines.
            </p>
          </section>

          {/* API Overview */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <Server className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-semibold m-0">1. API Overview</h2>
            </div>

            <h3 className="text-xl font-medium mt-6 mb-3">1.1 Base URL</h3>
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <p className="text-sm text-muted-foreground m-0">
                The current production integration uses Supabase Edge Functions:
              </p>
              <code className="text-primary">https://&lt;project-ref&gt;.supabase.co/functions/v1</code>
            </div>

            <h3 className="text-xl font-medium mt-6 mb-3">1.2 API Versioning</h3>
            <ul className="space-y-2">
              <li>API version is included in the URL path</li>
              <li>Current version: v1</li>
              <li>Deprecated versions supported for 12 months after deprecation notice</li>
              <li>Breaking changes announced via changelog and email</li>
            </ul>

            <h3 className="text-xl font-medium mt-6 mb-3">1.3 Response Format</h3>
            <p>All API responses are returned in JSON format:</p>
            <div className="bg-muted p-4 rounded-lg">
              <pre className="text-sm overflow-x-auto m-0">
{`{
  "success": true,
  "data": { ... },
  "meta": {
    "request_id": "req_abc123",
    "timestamp": "2026-01-08T12:00:00Z"
  }
}`}
              </pre>
            </div>
          </section>

          {/* Authentication */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <Key className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-semibold m-0">2. Authentication</h2>
            </div>

            <h3 className="text-xl font-medium mt-6 mb-3">2.1 API Keys</h3>
            <ul className="space-y-2">
              <li>API keys are issued per application</li>
              <li>Keys must be kept confidential</li>
              <li>Never expose keys in client-side code</li>
              <li>Rotate keys periodically (recommended: every 90 days)</li>
            </ul>

            <h3 className="text-xl font-medium mt-6 mb-3">2.2 Request Authentication</h3>
            <div className="bg-muted p-4 rounded-lg">
              <p className="font-semibold mb-2">Required Headers:</p>
              <pre className="text-sm overflow-x-auto m-0">
{`External maintenance-gateway calls:
x-api-key: {api_key}
Content-Type: application/json

Internal app calls:
Authorization: Bearer {access_token_or_anon_key}
apikey: {anon_key}
Content-Type: application/json`}
              </pre>
            </div>

            <div className="bg-muted p-4 rounded-lg mt-4">
              <p className="font-semibold mb-2">maintenance-gateway Example</p>
              <pre className="text-sm overflow-x-auto m-0">
{`curl -X POST "https://zrrffsjbfkphridqyais.supabase.co/functions/v1/gateway" \\
  -H "x-api-key: {api_key}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "channel": "api",
    "client_name": "أحمد محمد",
    "client_phone": "01004006620",
    "service_type": "electrical",
    "description": "اختبار كامل لدورة حياة طلب الصيانة",
    "priority": "high"
  }'`}
              </pre>
            </div>

            <h3 className="text-xl font-medium mt-6 mb-3">2.3 OAuth 2.0</h3>
            <p>For user-context requests, use OAuth 2.0 bearer tokens:</p>
            <ul className="space-y-2">
              <li>Tokens obtained via OAuth authorization flow</li>
              <li>Access tokens expire after 1 hour</li>
              <li>Use refresh tokens for long-lived access</li>
            </ul>
          </section>

          {/* Rate Limiting */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <Clock className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-semibold m-0">3. Rate Limiting</h2>
            </div>

            <h3 className="text-xl font-medium mt-6 mb-3">3.1 Default Limits</h3>
            <div className="bg-muted p-4 rounded-lg">
              <table className="w-full m-0">
                <thead>
                  <tr>
                    <th className="text-left p-2 border-b">Tier</th>
                    <th className="text-left p-2 border-b">Requests/Minute</th>
                    <th className="text-left p-2 border-b">Requests/Day</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="p-2 border-b">Free</td>
                    <td className="p-2 border-b">60</td>
                    <td className="p-2 border-b">1,000</td>
                  </tr>
                  <tr>
                    <td className="p-2 border-b">Professional</td>
                    <td className="p-2 border-b">300</td>
                    <td className="p-2 border-b">10,000</td>
                  </tr>
                  <tr>
                    <td className="p-2">Enterprise</td>
                    <td className="p-2">1,000</td>
                    <td className="p-2">100,000</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3 className="text-xl font-medium mt-6 mb-3">3.2 Rate Limit Headers</h3>
            <div className="bg-muted p-4 rounded-lg">
              <pre className="text-sm overflow-x-auto m-0">
{`X-RateLimit-Limit: 300
X-RateLimit-Remaining: 295
X-RateLimit-Reset: 1704715200`}
              </pre>
            </div>

            <h3 className="text-xl font-medium mt-6 mb-3">3.3 Handling Rate Limits</h3>
            <ul className="space-y-2">
              <li>Monitor rate limit headers in responses</li>
              <li>Implement exponential backoff for retries</li>
              <li>Cache responses where appropriate</li>
              <li>Contact us for limit increases if needed</li>
            </ul>

            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-4 rounded-lg mt-4">
              <p className="font-semibold text-amber-800 dark:text-amber-200 mb-2">Rate Limit Exceeded Response:</p>
              <pre className="text-sm overflow-x-auto m-0 text-amber-700 dark:text-amber-300">
{`HTTP/1.1 429 Too Many Requests
{
  "error": "rate_limit_exceeded",
  "message": "Rate limit exceeded. Retry after 60 seconds.",
  "retry_after": 60
}`}
              </pre>
            </div>
          </section>

          {/* Data Access Rules */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <Shield className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-semibold m-0">4. Data Access Rules</h2>
            </div>

            <h3 className="text-xl font-medium mt-6 mb-3">4.1 Access Scopes</h3>
            <div className="bg-muted p-4 rounded-lg">
              <table className="w-full m-0">
                <thead>
                  <tr>
                    <th className="text-left p-2 border-b">Scope</th>
                    <th className="text-left p-2 border-b">Access Level</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="p-2 border-b font-mono text-sm">requests:read</td>
                    <td className="p-2 border-b">Read maintenance requests</td>
                  </tr>
                  <tr>
                    <td className="p-2 border-b font-mono text-sm">requests:write</td>
                    <td className="p-2 border-b">Create/update maintenance requests</td>
                  </tr>
                  <tr>
                    <td className="p-2 border-b font-mono text-sm">properties:read</td>
                    <td className="p-2 border-b">Read property data</td>
                  </tr>
                  <tr>
                    <td className="p-2 border-b font-mono text-sm">properties:write</td>
                    <td className="p-2 border-b">Create/update properties</td>
                  </tr>
                  <tr>
                    <td className="p-2 border-b font-mono text-sm">technicians:read</td>
                    <td className="p-2 border-b">Read technician data</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-mono text-sm">reports:read</td>
                    <td className="p-2">Access reports and analytics</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3 className="text-xl font-medium mt-6 mb-3">4.2 Data Isolation</h3>
            <ul className="space-y-2">
              <li>Each organization's data is isolated</li>
              <li>Cross-organization access is prohibited</li>
              <li>Row-level security enforced at database level</li>
            </ul>

            <h3 className="text-xl font-medium mt-6 mb-3">4.3 Sensitive Data</h3>
            <ul className="space-y-2">
              <li>PII is encrypted at rest and in transit</li>
              <li>Some fields are redacted in API responses</li>
              <li>Audit logs track all data access</li>
            </ul>
          </section>

          {/* Logging and Monitoring */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <Activity className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-semibold m-0">5. Logging & Monitoring</h2>
            </div>

            <h3 className="text-xl font-medium mt-6 mb-3">5.1 Request Logging</h3>
            <p>All API requests are logged with:</p>
            <ul className="space-y-2">
              <li>Request ID, timestamp, and duration</li>
              <li>HTTP method and endpoint</li>
              <li>Response status code</li>
              <li>Client IP address (anonymized after 30 days)</li>
              <li>API key identifier (not the full key)</li>
            </ul>

            <h3 className="text-xl font-medium mt-6 mb-3">5.2 Audit Trail</h3>
            <ul className="space-y-2">
              <li>All write operations create audit records</li>
              <li>Audit logs retained for 7 years</li>
              <li>Accessible via Admin API for Enterprise plans</li>
            </ul>

            <h3 className="text-xl font-medium mt-6 mb-3">5.3 Monitoring</h3>
            <ul className="space-y-2">
              <li>Real-time anomaly detection</li>
              <li>Automated alerts for suspicious activity</li>
              <li>Usage dashboards available in developer portal</li>
            </ul>
          </section>

          {/* Revocation */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-semibold m-0">6. Access Revocation</h2>
            </div>

            <h3 className="text-xl font-medium mt-6 mb-3">6.1 Self-Service Revocation</h3>
            <ul className="space-y-2">
              <li>Revoke API keys via developer portal</li>
              <li>Revoke OAuth tokens programmatically</li>
              <li>Immediate effect upon revocation</li>
            </ul>

            <h3 className="text-xl font-medium mt-6 mb-3">6.2 Automatic Revocation</h3>
            <p>Access may be automatically revoked for:</p>
            <ul className="space-y-2">
              <li>Suspected security compromise</li>
              <li>Terms of service violations</li>
              <li>Excessive rate limit violations</li>
              <li>Account suspension or termination</li>
            </ul>

            <h3 className="text-xl font-medium mt-6 mb-3">6.3 Revocation API</h3>
            <div className="bg-muted p-4 rounded-lg">
              <pre className="text-sm overflow-x-auto m-0">
{`POST /v1/oauth/revoke
Content-Type: application/x-www-form-urlencoded

token={token_to_revoke}&token_type_hint=access_token`}
              </pre>
            </div>
          </section>

          {/* Webhooks Section */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <Webhook className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-semibold m-0">7. Webhooks Policy</h2>
            </div>

            <h3 className="text-xl font-medium mt-6 mb-3">7.1 Purpose</h3>
            <p>Webhooks provide real-time notifications when events occur in UberFix. Use webhooks to:</p>
            <ul className="space-y-2">
              <li>Sync data with external systems</li>
              <li>Trigger automated workflows</li>
              <li>Update dashboards in real-time</li>
              <li>Send notifications to other platforms</li>
            </ul>

            <h3 className="text-xl font-medium mt-6 mb-3">7.2 Event Types</h3>
            <div className="bg-muted p-4 rounded-lg">
              <table className="w-full m-0">
                <thead>
                  <tr>
                    <th className="text-left p-2 border-b">Event</th>
                    <th className="text-left p-2 border-b">Description</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="p-2 border-b font-mono text-sm">request.created</td>
                    <td className="p-2 border-b">New maintenance request created</td>
                  </tr>
                  <tr>
                    <td className="p-2 border-b font-mono text-sm">request.updated</td>
                    <td className="p-2 border-b">Request status or details changed</td>
                  </tr>
                  <tr>
                    <td className="p-2 border-b font-mono text-sm">request.completed</td>
                    <td className="p-2 border-b">Request marked as completed</td>
                  </tr>
                  <tr>
                    <td className="p-2 border-b font-mono text-sm">technician.assigned</td>
                    <td className="p-2 border-b">Technician assigned to request</td>
                  </tr>
                  <tr>
                    <td className="p-2 border-b font-mono text-sm">invoice.created</td>
                    <td className="p-2 border-b">New invoice generated</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-mono text-sm">payment.received</td>
                    <td className="p-2">Payment successfully processed</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3 className="text-xl font-medium mt-6 mb-3">7.3 Payload Structure</h3>
            <div className="bg-muted p-4 rounded-lg">
              <pre className="text-sm overflow-x-auto m-0">
{`{
  "id": "evt_abc123",
  "type": "request.created",
  "created_at": "2026-01-08T12:00:00Z",
  "data": {
    "object": { ... }
  },
  "webhook_id": "wh_xyz789"
}`}
              </pre>
            </div>

            <h3 className="text-xl font-medium mt-6 mb-3">7.4 Signature Verification</h3>
            <p>All webhooks are signed with HMAC-SHA256. Verify signatures to ensure authenticity:</p>
            <div className="bg-muted p-4 rounded-lg">
              <pre className="text-sm overflow-x-auto m-0">
{`X-UberFix-Signature: sha256=abc123...
X-UberFix-Timestamp: 1704715200

// Verify by computing:
// HMAC-SHA256(timestamp + "." + payload, webhook_secret)`}
              </pre>
            </div>

            <h3 className="text-xl font-medium mt-6 mb-3">7.5 Retry Policy</h3>
            <ul className="space-y-2">
              <li>Webhooks retried up to 5 times on failure</li>
              <li>Exponential backoff: 1min, 5min, 30min, 2hr, 24hr</li>
              <li>Webhook disabled after 5 consecutive failures</li>
              <li>Expect 2xx response within 30 seconds</li>
            </ul>

            <h3 className="text-xl font-medium mt-6 mb-3">7.6 Security Considerations</h3>
            <ul className="space-y-2">
              <li>Only use HTTPS endpoints</li>
              <li>Always verify webhook signatures</li>
              <li>Implement idempotency (same event may be delivered multiple times)</li>
              <li>Process webhooks asynchronously</li>
              <li>Keep webhook secrets secure</li>
            </ul>
          </section>

          {/* Error Codes */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Error Codes</h2>
            <div className="bg-muted p-4 rounded-lg">
              <table className="w-full m-0">
                <thead>
                  <tr>
                    <th className="text-left p-2 border-b">Code</th>
                    <th className="text-left p-2 border-b">Status</th>
                    <th className="text-left p-2 border-b">Description</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="p-2 border-b font-mono text-sm">400</td>
                    <td className="p-2 border-b">Bad Request</td>
                    <td className="p-2 border-b">Invalid request parameters</td>
                  </tr>
                  <tr>
                    <td className="p-2 border-b font-mono text-sm">401</td>
                    <td className="p-2 border-b">Unauthorized</td>
                    <td className="p-2 border-b">Missing or invalid authentication</td>
                  </tr>
                  <tr>
                    <td className="p-2 border-b font-mono text-sm">403</td>
                    <td className="p-2 border-b">Forbidden</td>
                    <td className="p-2 border-b">Insufficient permissions</td>
                  </tr>
                  <tr>
                    <td className="p-2 border-b font-mono text-sm">404</td>
                    <td className="p-2 border-b">Not Found</td>
                    <td className="p-2 border-b">Resource does not exist</td>
                  </tr>
                  <tr>
                    <td className="p-2 border-b font-mono text-sm">429</td>
                    <td className="p-2 border-b">Too Many Requests</td>
                    <td className="p-2 border-b">Rate limit exceeded</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-mono text-sm">500</td>
                    <td className="p-2">Server Error</td>
                    <td className="p-2">Internal server error</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Contact */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Support</h2>
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <p><strong>API Support:</strong> api-support@uberfix.shop</p>
              <p><strong>Documentation:</strong> docs.uberfix.shop</p>
              <p><strong>Status Page:</strong> status.uberfix.shop</p>
              <p><strong>Developer Forum:</strong> community.uberfix.shop</p>
            </div>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t">
          <Button onClick={() => navigate(-1)} size="lg">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Site
          </Button>
        </div>
      </main>
    </div>
  );
}
