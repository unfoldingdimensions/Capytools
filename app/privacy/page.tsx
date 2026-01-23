import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
    title: 'Privacy Policy | Handcraft Resume',
    description: 'Privacy Policy for Handcraft Resume - Learn how we collect, use, and protect your personal information.',
};

export default function PrivacyPolicyPage() {
    return (
        <div className="min-h-screen bg-background">
            <div className="max-w-4xl mx-auto px-6 py-16">
                {/* Back Button */}
                <Link href="/">
                    <Button variant="ghost" className="mb-8 -ml-4">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Home
                    </Button>
                </Link>

                {/* Header */}
                <header className="mb-12">
                    <h1 className="text-4xl md:text-5xl font-display font-bold tracking-tight mb-4">
                        Privacy Policy
                    </h1>
                    <p className="text-muted-foreground">
                        Last updated: January 24, 2026
                    </p>
                </header>

                {/* Content */}
                <div className="prose prose-zinc dark:prose-invert max-w-none">
                    <section className="mb-12">
                        <h2 className="text-2xl font-display font-bold mb-4">1. Introduction</h2>
                        <p className="text-muted-foreground leading-relaxed mb-4">
                            Welcome to Handcraft Resume (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;). We are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our AI-powered resume builder service.
                        </p>
                    </section>

                    <section className="mb-12">
                        <h2 className="text-2xl font-display font-bold mb-4">2. Information We Collect</h2>
                        <h3 className="text-xl font-semibold mb-3">2.1 Personal Information</h3>
                        <p className="text-muted-foreground leading-relaxed mb-4">
                            When you create an account or use our services, we may collect:
                        </p>
                        <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
                            <li>Name and contact information (email address)</li>
                            <li>Account credentials (managed securely via Clerk authentication)</li>
                            <li>Resume content you create (work experience, education, skills, etc.)</li>
                            <li>Job descriptions you upload for tailoring purposes</li>
                        </ul>

                        <h3 className="text-xl font-semibold mb-3">2.2 Technical Information</h3>
                        <p className="text-muted-foreground leading-relaxed mb-4">
                            We automatically collect certain technical information:
                        </p>
                        <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
                            <li>Browser type and version</li>
                            <li>Device information</li>
                            <li>IP address</li>
                            <li>Usage data and analytics</li>
                        </ul>
                    </section>

                    <section className="mb-12">
                        <h2 className="text-2xl font-display font-bold mb-4">3. How We Use Your Information</h2>
                        <p className="text-muted-foreground leading-relaxed mb-4">
                            We use the information we collect to:
                        </p>
                        <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
                            <li>Provide and maintain our resume building services</li>
                            <li>Process AI-powered resume enhancements using your provided API keys</li>
                            <li>Generate PDF exports of your resumes</li>
                            <li>Improve and personalize your experience</li>
                            <li>Communicate with you about service updates</li>
                            <li>Ensure security and prevent fraud</li>
                        </ul>
                    </section>

                    <section className="mb-12">
                        <h2 className="text-2xl font-display font-bold mb-4">4. BYOK (Bring Your Own Key) Policy</h2>
                        <p className="text-muted-foreground leading-relaxed mb-4">
                            Our service supports a &quot;Bring Your Own Key&quot; model for AI features:
                        </p>
                        <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
                            <li>Your API keys are encrypted and stored securely</li>
                            <li>We never share your API keys with third parties</li>
                            <li>API calls are made directly from our servers to the AI provider</li>
                            <li>You maintain full control and can delete your keys at any time</li>
                        </ul>
                    </section>

                    <section className="mb-12">
                        <h2 className="text-2xl font-display font-bold mb-4">5. Data Security</h2>
                        <p className="text-muted-foreground leading-relaxed mb-4">
                            We implement industry-standard security measures including:
                        </p>
                        <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
                            <li>SSL/TLS encryption for all data transmission</li>
                            <li>Encrypted storage for sensitive data</li>
                            <li>Regular security audits and updates</li>
                            <li>Secure authentication via Clerk</li>
                        </ul>
                    </section>

                    <section className="mb-12">
                        <h2 className="text-2xl font-display font-bold mb-4">6. Data Retention</h2>
                        <p className="text-muted-foreground leading-relaxed mb-4">
                            We retain your personal information for as long as your account is active or as needed to provide you services. You may request deletion of your data at any time by contacting us or deleting your account.
                        </p>
                    </section>

                    <section className="mb-12">
                        <h2 className="text-2xl font-display font-bold mb-4">7. Your Rights</h2>
                        <p className="text-muted-foreground leading-relaxed mb-4">
                            Depending on your location, you may have the following rights:
                        </p>
                        <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
                            <li>Access your personal data</li>
                            <li>Correct inaccurate data</li>
                            <li>Request deletion of your data</li>
                            <li>Export your data in a portable format</li>
                            <li>Opt-out of marketing communications</li>
                        </ul>
                    </section>

                    <section className="mb-12">
                        <h2 className="text-2xl font-display font-bold mb-4">8. Contact Us</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            If you have questions about this Privacy Policy, please contact us at privacy@handcraftresume.com
                        </p>
                    </section>
                </div>
            </div>
        </div>
    );
}
