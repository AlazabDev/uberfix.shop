import { Button } from "@/components/ui/button";
import { ArrowLeft, Shield, Lock, Eye, Database, Users, Clock, Trash2, Mail } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function PrivacyPolicyEnglish() {
  const navigate = useNavigate();
  const lastUpdated = "January 8, 2026";
  const effectiveDate = "January 8, 2026";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <Shield className="h-5 w-5 text-primary-foreground" />
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
          <h1 className="text-4xl font-bold mb-4">Privacy Policy</h1>
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span><strong>Last Updated:</strong> {lastUpdated}</span>
            <span><strong>Effective Date:</strong> {effectiveDate}</span>
          </div>
        </div>

        <div className="prose prose-lg dark:prose-invert max-w-none space-y-8">
          {/* Introduction */}
          <section className="bg-muted/50 p-6 rounded-lg border">
            <p className="text-lg leading-relaxed m-0">
              UberFix.shop ("UberFix", "we", "us", or "our") is committed to protecting your privacy and ensuring the security of your personal data. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our maintenance management platform and related services (collectively, the "Service").
            </p>
            <p className="mt-4 m-0">
              This policy is designed to comply with the <strong>Google API Services User Data Policy</strong>, <strong>Google OAuth Verification requirements</strong>, and <strong>Meta Platform Terms</strong>.
            </p>
          </section>

          {/* Section 1: Data We Collect */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <Database className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-semibold m-0">1. Information We Collect</h2>
            </div>
            
            <h3 className="text-xl font-medium mt-6 mb-3">1.1 Information You Provide Directly</h3>
            <ul className="space-y-2">
              <li><strong>Account Information:</strong> Full name, email address, phone number, company name, job title, and password when you create an account.</li>
              <li><strong>Profile Information:</strong> Profile photo, business address, and professional certifications.</li>
              <li><strong>Service Requests:</strong> Details of maintenance requests including descriptions, photos, locations, and scheduling preferences.</li>
              <li><strong>Property Information:</strong> Property addresses, unit details, access instructions, and building specifications.</li>
              <li><strong>Payment Information:</strong> Billing address and payment method details (processed securely through third-party payment processors).</li>
              <li><strong>Communications:</strong> Messages, feedback, and support requests you send to us.</li>
            </ul>

            <h3 className="text-xl font-medium mt-6 mb-3">1.2 Information Collected Automatically</h3>
            <ul className="space-y-2">
              <li><strong>Device Information:</strong> Device type, operating system, unique device identifiers, and browser type.</li>
              <li><strong>Usage Data:</strong> Pages visited, features used, time spent on the platform, and interaction patterns.</li>
              <li><strong>Location Data:</strong> With your consent, precise or approximate location for service dispatch optimization.</li>
              <li><strong>Log Data:</strong> IP address, access times, and referring URLs.</li>
            </ul>

            <h3 className="text-xl font-medium mt-6 mb-3">1.3 Information from Third Parties</h3>
            <ul className="space-y-2">
              <li><strong>OAuth Providers:</strong> When you authenticate via Google or Meta, we receive your basic profile information (name, email, profile picture) as authorized by you.</li>
              <li><strong>Business Partners:</strong> Property management companies may provide tenant or property information with appropriate authorization.</li>
            </ul>
          </section>

          {/* Section 2: How We Use Your Information */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <Eye className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-semibold m-0">2. How We Use Your Information</h2>
            </div>
            
            <h3 className="text-xl font-medium mt-6 mb-3">2.1 Service Delivery</h3>
            <ul className="space-y-2">
              <li>Process and manage maintenance requests</li>
              <li>Match service requests with qualified technicians</li>
              <li>Facilitate communication between clients and service providers</li>
              <li>Schedule appointments and send reminders</li>
              <li>Generate invoices and process payments</li>
            </ul>

            <h3 className="text-xl font-medium mt-6 mb-3">2.2 Service Improvement</h3>
            <ul className="space-y-2">
              <li>Analyze usage patterns to improve our platform</li>
              <li>Develop new features and services</li>
              <li>Conduct research and analytics</li>
              <li>Personalize your experience</li>
            </ul>

            <h3 className="text-xl font-medium mt-6 mb-3">2.3 Communication</h3>
            <ul className="space-y-2">
              <li>Send service-related notifications and updates</li>
              <li>Respond to inquiries and support requests</li>
              <li>Send important account and security alerts</li>
              <li>With consent, send marketing communications</li>
            </ul>

            <h3 className="text-xl font-medium mt-6 mb-3">2.4 Security and Compliance</h3>
            <ul className="space-y-2">
              <li>Detect and prevent fraud and abuse</li>
              <li>Enforce our terms of service</li>
              <li>Comply with legal obligations</li>
              <li>Protect the rights and safety of our users</li>
            </ul>
          </section>

          {/* Section 3: Data Sharing */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <Users className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-semibold m-0">3. Information Sharing</h2>
            </div>
            
            <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 p-4 rounded-lg mb-4">
              <p className="font-semibold text-green-800 dark:text-green-200 m-0">
                We do NOT sell, rent, or trade your personal information to third parties for their marketing purposes.
              </p>
            </div>

            <h3 className="text-xl font-medium mt-6 mb-3">3.1 Service Providers</h3>
            <p>We share information with third-party service providers who assist us in operating our platform:</p>
            <ul className="space-y-2">
              <li><strong>Cloud Hosting:</strong> Supabase (data storage and authentication)</li>
              <li><strong>Payment Processing:</strong> Secure payment gateways for transaction processing</li>
              <li><strong>Communication Services:</strong> Email and SMS providers for notifications</li>
              <li><strong>Analytics:</strong> Tools to understand platform usage and performance</li>
            </ul>

            <h3 className="text-xl font-medium mt-6 mb-3">3.2 Business Operations</h3>
            <ul className="space-y-2">
              <li><strong>Technicians:</strong> Relevant request details necessary to complete service</li>
              <li><strong>Property Managers:</strong> Service history and reports as authorized</li>
              <li><strong>Business Transfers:</strong> In the event of merger, acquisition, or sale of assets</li>
            </ul>

            <h3 className="text-xl font-medium mt-6 mb-3">3.3 Legal Requirements</h3>
            <p>We may disclose information when required by law, court order, or government request, or when necessary to protect our rights, prevent fraud, or ensure user safety.</p>
          </section>

          {/* Section 4: Data Security */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <Lock className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-semibold m-0">4. Data Security</h2>
            </div>
            
            <p>We implement industry-standard security measures to protect your information:</p>
            <ul className="space-y-2">
              <li><strong>Encryption:</strong> TLS/SSL encryption for data in transit; AES-256 encryption for data at rest</li>
              <li><strong>Access Controls:</strong> Role-based access controls and multi-factor authentication</li>
              <li><strong>Infrastructure:</strong> Secure cloud infrastructure with regular security audits</li>
              <li><strong>Monitoring:</strong> 24/7 security monitoring and intrusion detection</li>
              <li><strong>Employee Training:</strong> Regular security awareness training for all staff</li>
              <li><strong>Incident Response:</strong> Documented procedures for security incident handling</li>
            </ul>
          </section>

          {/* Section 5: Data Retention */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <Clock className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-semibold m-0">5. Data Retention</h2>
            </div>
            
            <p>We retain your information for as long as necessary to:</p>
            <ul className="space-y-2">
              <li>Provide our services to you</li>
              <li>Comply with legal obligations (typically 7 years for financial records)</li>
              <li>Resolve disputes and enforce agreements</li>
              <li>Maintain business records as required by law</li>
            </ul>
            <p className="mt-4">When you delete your account, we will delete or anonymize your personal information within 30 days, except where retention is required by law.</p>
          </section>

          {/* Section 6: Your Rights */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <Shield className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-semibold m-0">6. Your Rights</h2>
            </div>
            
            <p>You have the following rights regarding your personal information:</p>
            <ul className="space-y-2">
              <li><strong>Access:</strong> Request a copy of your personal data</li>
              <li><strong>Correction:</strong> Update or correct inaccurate information</li>
              <li><strong>Deletion:</strong> Request deletion of your personal data</li>
              <li><strong>Portability:</strong> Receive your data in a portable format</li>
              <li><strong>Objection:</strong> Object to certain processing activities</li>
              <li><strong>Restriction:</strong> Request limitation of processing</li>
              <li><strong>Withdrawal:</strong> Withdraw consent at any time</li>
            </ul>
            <p className="mt-4">To exercise these rights, contact us at <strong>privacy@uberfix.shop</strong>. We will respond within 30 days.</p>
          </section>

          {/* Section 7: Data Deletion */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <Trash2 className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-semibold m-0">7. Data Deletion Instructions</h2>
            </div>
            
            <p>To request complete deletion of your data:</p>
            <ol className="space-y-2">
              <li><strong>Method 1 - In-App:</strong> Go to Settings → Account → Delete Account</li>
              <li><strong>Method 2 - Email:</strong> Send a request to <strong>privacy@uberfix.shop</strong> with subject "Data Deletion Request"</li>
              <li><strong>Method 3 - Support:</strong> Contact our support team through the Help Center</li>
            </ol>
            <p className="mt-4">Upon receiving your request, we will:</p>
            <ul className="space-y-2">
              <li>Verify your identity</li>
              <li>Process the deletion within 30 days</li>
              <li>Send confirmation once complete</li>
              <li>Notify any third parties who received your data</li>
            </ul>
          </section>

          {/* Section 8: Google API Compliance */}
          <section className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-6 rounded-lg">
            <h2 className="text-2xl font-semibold mb-4">8. Google API Services Compliance</h2>
            <p>Our use of Google APIs complies with the <a href="https://developers.google.com/terms/api-services-user-data-policy" className="text-primary underline" target="_blank" rel="noopener noreferrer">Google API Services User Data Policy</a>:</p>
            <ul className="space-y-2 mt-4">
              <li>We only request the minimum scopes necessary for authentication (email, profile)</li>
              <li>We do not use Google user data for advertising purposes</li>
              <li>We do not use Google user data to train AI/ML models</li>
              <li>We do not sell or transfer Google user data to third parties</li>
              <li>Users can revoke access at any time via Google Account settings</li>
            </ul>
          </section>

          {/* Section 9: Meta Platform Compliance */}
          <section className="bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 p-6 rounded-lg">
            <h2 className="text-2xl font-semibold mb-4">9. Meta Platform Compliance</h2>
            <p>Our use of Meta APIs (Facebook, WhatsApp) complies with Meta Platform Terms:</p>
            <ul className="space-y-2 mt-4">
              <li>We only access data you explicitly authorize</li>
              <li>We use WhatsApp Business API solely for service-related communications</li>
              <li>We do not share Meta user data with unauthorized third parties</li>
              <li>We honor data deletion requests within 30 days</li>
              <li>Users can revoke access via Facebook/Meta account settings</li>
            </ul>
          </section>

          {/* Section 10: Cookies */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">10. Cookies and Tracking Technologies</h2>
            <p>We use cookies and similar technologies for:</p>
            <ul className="space-y-2">
              <li><strong>Essential Cookies:</strong> Required for platform functionality and security</li>
              <li><strong>Analytics Cookies:</strong> Help us understand how you use our platform</li>
              <li><strong>Preference Cookies:</strong> Remember your settings and preferences</li>
            </ul>
            <p className="mt-4">You can manage cookie preferences through your browser settings.</p>
          </section>

          {/* Section 11: Children's Privacy */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">11. Children's Privacy</h2>
            <p>Our Service is not intended for individuals under 18 years of age. We do not knowingly collect personal information from children. If we become aware that we have collected data from a child, we will delete it promptly.</p>
          </section>

          {/* Section 12: International Transfers */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">12. International Data Transfers</h2>
            <p>Your data may be transferred to and processed in countries other than your own. We ensure appropriate safeguards are in place, including standard contractual clauses and compliance with applicable data protection laws.</p>
          </section>

          {/* Section 13: Changes to Policy */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">13. Changes to This Policy</h2>
            <p>We may update this Privacy Policy periodically. We will notify you of material changes via email or prominent notice on our platform at least 30 days before the changes take effect. Your continued use of the Service after changes constitutes acceptance.</p>
          </section>

          {/* Section 14: Contact */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <Mail className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-semibold m-0">14. Contact Us</h2>
            </div>
            
            <p>For questions about this Privacy Policy or our data practices:</p>
            <div className="bg-muted p-4 rounded-lg mt-4 space-y-2">
              <p><strong>Data Protection Officer:</strong> privacy@uberfix.shop</p>
              <p><strong>General Inquiries:</strong> support@uberfix.shop</p>
              <p><strong>Phone:</strong> +20 100 400 6620</p>
              <p><strong>Address:</strong> UberFix Technologies, Maadi St 500, Cairo, Arab Republic of Egypt</p>
            </div>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t flex gap-4">
          <Button onClick={() => navigate(-1)} size="lg">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Site
          </Button>
          <Button variant="outline" onClick={() => navigate("/privacy-policy")}>
            النسخة العربية
          </Button>
        </div>
      </main>
    </div>
  );
}
