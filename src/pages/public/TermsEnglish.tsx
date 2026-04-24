import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, Users, CreditCard, Shield, AlertTriangle, Scale } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function TermsEnglish() {
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
                <FileText className="h-5 w-5 text-primary-foreground" />
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
          <h1 className="text-4xl font-bold mb-4">Terms and Conditions</h1>
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span><strong>Last Updated:</strong> {lastUpdated}</span>
            <span><strong>Effective Date:</strong> {effectiveDate}</span>
          </div>
        </div>

        <div className="prose prose-lg dark:prose-invert max-w-none space-y-8">
          {/* Introduction */}
          <section className="bg-muted/50 p-6 rounded-lg border">
            <p className="text-lg leading-relaxed m-0">
              Welcome to UberFix.shop. These Terms and Conditions ("Terms") govern your access to and use of the UberFix maintenance management platform, including our website, mobile applications, APIs, and related services (collectively, the "Service"). By accessing or using our Service, you agree to be bound by these Terms.
            </p>
          </section>

          {/* Section 1: Acceptance */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
            <p>By creating an account, accessing, or using UberFix.shop, you:</p>
            <ul className="space-y-2">
              <li>Confirm you have read, understood, and agree to these Terms</li>
              <li>Represent that you are at least 18 years of age</li>
              <li>Have the legal capacity to enter into binding agreements</li>
              <li>If acting on behalf of an organization, have authority to bind that organization</li>
            </ul>
            <p className="mt-4">If you do not agree to these Terms, you must not access or use our Service.</p>
          </section>

          {/* Section 2: Service Definition */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <FileText className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-semibold m-0">2. Service Description</h2>
            </div>
            
            <p>UberFix.shop is a comprehensive maintenance management platform that provides:</p>
            <ul className="space-y-2">
              <li><strong>Maintenance Request Management:</strong> Submit, track, and manage maintenance requests</li>
              <li><strong>Technician Dispatch:</strong> Connect with qualified maintenance professionals</li>
              <li><strong>Property Management:</strong> Manage property portfolios and maintenance histories</li>
              <li><strong>Scheduling:</strong> Appointment booking and calendar management</li>
              <li><strong>Reporting:</strong> Analytics and performance tracking</li>
              <li><strong>Communication:</strong> In-platform messaging and notifications</li>
              <li><strong>Billing:</strong> Invoice generation and payment processing</li>
            </ul>
          </section>

          {/* Section 3: User Accounts */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <Users className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-semibold m-0">3. User Accounts</h2>
            </div>

            <h3 className="text-xl font-medium mt-6 mb-3">3.1 Account Registration</h3>
            <p>To use certain features, you must create an account by providing:</p>
            <ul className="space-y-2">
              <li>Accurate, current, and complete information</li>
              <li>A valid email address you control</li>
              <li>A secure password meeting our requirements</li>
            </ul>

            <h3 className="text-xl font-medium mt-6 mb-3">3.2 Account Security</h3>
            <p>You are responsible for:</p>
            <ul className="space-y-2">
              <li>Maintaining the confidentiality of your login credentials</li>
              <li>All activities that occur under your account</li>
              <li>Immediately notifying us of any unauthorized access</li>
              <li>Using strong, unique passwords and enabling two-factor authentication</li>
            </ul>

            <h3 className="text-xl font-medium mt-6 mb-3">3.3 Account Types</h3>
            <ul className="space-y-2">
              <li><strong>Client Accounts:</strong> For property owners, managers, and tenants</li>
              <li><strong>Technician Accounts:</strong> For maintenance service providers</li>
              <li><strong>Administrator Accounts:</strong> For platform management</li>
            </ul>
          </section>

          {/* Section 4: Acceptable Use */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Acceptable Use</h2>

            <h3 className="text-xl font-medium mt-6 mb-3">4.1 Permitted Uses</h3>
            <ul className="space-y-2">
              <li>Submitting genuine maintenance requests</li>
              <li>Managing legitimate property portfolios</li>
              <li>Communicating with service providers professionally</li>
              <li>Accessing your own data and reports</li>
            </ul>

            <h3 className="text-xl font-medium mt-6 mb-3">4.2 Prohibited Conduct</h3>
            <p>You agree NOT to:</p>
            <ul className="space-y-2">
              <li>Violate any applicable laws or regulations</li>
              <li>Infringe on intellectual property rights</li>
              <li>Submit false, misleading, or fraudulent information</li>
              <li>Impersonate any person or entity</li>
              <li>Harass, abuse, or harm others</li>
              <li>Attempt to gain unauthorized access to systems</li>
              <li>Interfere with platform operations or security</li>
              <li>Use automated systems without authorization</li>
              <li>Reverse engineer or decompile our software</li>
              <li>Collect user data without consent</li>
              <li>Use the Service for spam or unsolicited communications</li>
            </ul>
          </section>

          {/* Section 5: Pricing and Payment */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <CreditCard className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-semibold m-0">5. Pricing and Payment</h2>
            </div>

            <h3 className="text-xl font-medium mt-6 mb-3">5.1 Subscription Plans</h3>
            <ul className="space-y-2">
              <li>Prices are displayed in the applicable currency (EGP, USD, EUR)</li>
              <li>All prices include applicable taxes unless otherwise stated</li>
              <li>Plans are billed monthly or annually in advance</li>
            </ul>

            <h3 className="text-xl font-medium mt-6 mb-3">5.2 Payment Terms</h3>
            <ul className="space-y-2">
              <li>Payment is due upon subscription or renewal</li>
              <li>We accept major credit cards and approved payment methods</li>
              <li>Failed payments may result in service suspension</li>
            </ul>

            <h3 className="text-xl font-medium mt-6 mb-3">5.3 Automatic Renewal</h3>
            <p>Subscriptions automatically renew unless cancelled at least 7 days before the renewal date. You will be notified before renewal.</p>

            <h3 className="text-xl font-medium mt-6 mb-3">5.4 Price Changes</h3>
            <p>We may modify pricing with 30 days advance notice. Existing subscriptions continue at current rates until renewal.</p>
          </section>

          {/* Section 6: Cancellation and Refunds */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Cancellation and Refunds</h2>

            <h3 className="text-xl font-medium mt-6 mb-3">6.1 Cancellation</h3>
            <ul className="space-y-2">
              <li>You may cancel your subscription at any time through account settings</li>
              <li>Access continues until the end of the current billing period</li>
              <li>No partial refunds for unused portions of billing periods</li>
            </ul>

            <h3 className="text-xl font-medium mt-6 mb-3">6.2 Refund Policy</h3>
            <ul className="space-y-2">
              <li>Full refund available within 14 days of initial subscription if Service not materially used</li>
              <li>Pro-rata refunds may be issued at our discretion for service outages</li>
              <li>Refund requests should be sent to billing@uberfix.shop</li>
            </ul>
          </section>

          {/* Section 7: Intellectual Property */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <Shield className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-semibold m-0">7. Intellectual Property</h2>
            </div>

            <h3 className="text-xl font-medium mt-6 mb-3">7.1 Our Intellectual Property</h3>
            <p>UberFix.shop and its licensors own all rights to:</p>
            <ul className="space-y-2">
              <li>The UberFix trademark, logo, and brand identity</li>
              <li>Platform software, code, and algorithms</li>
              <li>Documentation, designs, and user interfaces</li>
              <li>Content we create or commission</li>
            </ul>

            <h3 className="text-xl font-medium mt-6 mb-3">7.2 Your Content</h3>
            <ul className="space-y-2">
              <li>You retain ownership of content you submit</li>
              <li>You grant us a license to use your content to provide the Service</li>
              <li>You represent you have rights to content you submit</li>
            </ul>

            <h3 className="text-xl font-medium mt-6 mb-3">7.3 License Grant</h3>
            <p>We grant you a limited, non-exclusive, non-transferable license to use the Service for its intended purposes during your subscription.</p>
          </section>

          {/* Section 8: Limitation of Liability */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-semibold m-0">8. Limitation of Liability</h2>
            </div>

            <h3 className="text-xl font-medium mt-6 mb-3">8.1 Service Disclaimer</h3>
            <p>THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED.</p>

            <h3 className="text-xl font-medium mt-6 mb-3">8.2 Limitation</h3>
            <p>TO THE MAXIMUM EXTENT PERMITTED BY LAW:</p>
            <ul className="space-y-2">
              <li>We are not liable for indirect, incidental, special, or consequential damages</li>
              <li>Our total liability is limited to fees paid in the 12 months preceding the claim</li>
              <li>We are not responsible for actions of third-party service providers</li>
            </ul>

            <h3 className="text-xl font-medium mt-6 mb-3">8.3 Exclusions</h3>
            <p>Some jurisdictions do not allow certain limitations. In such cases, limitations apply to the fullest extent permitted.</p>
          </section>

          {/* Section 9: Indemnification */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Indemnification</h2>
            <p>You agree to indemnify and hold harmless UberFix.shop, its officers, directors, employees, and agents from any claims, damages, or expenses arising from:</p>
            <ul className="space-y-2">
              <li>Your use of the Service</li>
              <li>Your violation of these Terms</li>
              <li>Your violation of any third-party rights</li>
              <li>Content you submit through the Service</li>
            </ul>
          </section>

          {/* Section 10: Termination */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">10. Termination</h2>

            <h3 className="text-xl font-medium mt-6 mb-3">10.1 By You</h3>
            <p>You may terminate your account at any time through account settings or by contacting support.</p>

            <h3 className="text-xl font-medium mt-6 mb-3">10.2 By Us</h3>
            <p>We may suspend or terminate your account if you:</p>
            <ul className="space-y-2">
              <li>Violate these Terms</li>
              <li>Engage in fraudulent activity</li>
              <li>Fail to pay fees when due</li>
              <li>Pose a security risk to the platform</li>
            </ul>

            <h3 className="text-xl font-medium mt-6 mb-3">10.3 Effect of Termination</h3>
            <ul className="space-y-2">
              <li>Access to the Service will cease</li>
              <li>You may export your data before termination</li>
              <li>We may delete your data after 30 days</li>
              <li>Provisions that should survive will survive termination</li>
            </ul>
          </section>

          {/* Section 11: Modifications */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">11. Modifications to Terms</h2>
            <p>We may modify these Terms at any time. We will:</p>
            <ul className="space-y-2">
              <li>Notify you of material changes via email or platform notice</li>
              <li>Provide at least 30 days notice before changes take effect</li>
              <li>Allow you to terminate if you disagree with changes</li>
            </ul>
            <p className="mt-4">Continued use after changes constitutes acceptance of modified Terms.</p>
          </section>

          {/* Section 12: Governing Law */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <Scale className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-semibold m-0">12. Governing Law</h2>
            </div>
            
            <p>These Terms are governed by the laws of the Arab Republic of Egypt. Any disputes shall be resolved in the competent courts of Cairo, Egypt.</p>
          </section>

          {/* Section 13: Dispute Resolution */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">13. Dispute Resolution</h2>
            <p>Before initiating legal proceedings, you agree to:</p>
            <ol className="space-y-2">
              <li>Contact us at legal@uberfix.shop to attempt informal resolution</li>
              <li>Allow 30 days for good faith negotiation</li>
              <li>If unresolved, proceed to mediation or arbitration as appropriate</li>
            </ol>
          </section>

          {/* Section 14: General Provisions */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">14. General Provisions</h2>
            <ul className="space-y-2">
              <li><strong>Entire Agreement:</strong> These Terms constitute the complete agreement between you and UberFix.shop</li>
              <li><strong>Severability:</strong> If any provision is unenforceable, remaining provisions remain in effect</li>
              <li><strong>Waiver:</strong> Failure to enforce any right does not constitute waiver</li>
              <li><strong>Assignment:</strong> You may not assign these Terms without our consent</li>
              <li><strong>Force Majeure:</strong> We are not liable for failures due to circumstances beyond our control</li>
            </ul>
          </section>

          {/* Section 15: Contact */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">15. Contact Information</h2>
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <p><strong>Legal Inquiries:</strong> legal@uberfix.shop</p>
              <p><strong>General Support:</strong> support@uberfix.shop</p>
              <p><strong>Phone:</strong> +20 100 400 6620</p>
              <p><strong>Address:</strong> UberFix Technologies, Maadi St 500, Cairo, Arab Republic of Egypt</p>
            </div>
          </section>

          {/* Acknowledgment */}
          <section className="bg-primary/10 p-6 rounded-lg border border-primary/20">
            <h3 className="text-lg font-semibold mb-2">Acknowledgment</h3>
            <p className="m-0">By using UberFix.shop, you acknowledge that you have read, understood, and agree to be bound by these Terms and Conditions.</p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t flex gap-4">
          <Button onClick={() => navigate(-1)} size="lg">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Site
          </Button>
          <Button variant="outline" onClick={() => navigate("/terms-of-service")}>
            النسخة العربية
          </Button>
        </div>
      </main>
    </div>
  );
}
