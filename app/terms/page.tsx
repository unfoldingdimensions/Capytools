import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
    title: 'Terms of Service | Handcraft Resume',
    description: 'Terms of Service for Handcraft Resume - Read about the terms and conditions governing your use of our service.',
};

export default function TermsOfServicePage() {
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
                        Terms of Service
                    </h1>
                    <p className="text-muted-foreground">
                        Last updated: January 24, 2026
                    </p>
                </header>

                {/* Content */}
                <div className="prose prose-zinc dark:prose-invert max-w-none">
                    <section className="mb-12">
                        <h2 className="text-2xl font-display font-bold mb-4">1. Acceptance of Terms</h2>
                        <p className="text-muted-foreground leading-relaxed mb-4">
                            By accessing or using Handcraft Resume (&quot;the Service&quot;), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Service.
                        </p>
                    </section>

                    <section className="mb-12">
                        <h2 className="text-2xl font-display font-bold mb-4">2. Description of Service</h2>
                        <p className="text-muted-foreground leading-relaxed mb-4">
                            Handcraft Resume is an AI-powered resume builder that allows users to:
                        </p>
                        <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
                            <li>Create and edit professional resumes</li>
                            <li>Use AI to enhance resume content (with your own API keys)</li>
                            <li>Export resumes as high-quality PDF documents</li>
                            <li>Tailor resumes to specific job descriptions</li>
                            <li>Parse existing resume documents</li>
                        </ul>
                    </section>

                    <section className="mb-12">
                        <h2 className="text-2xl font-display font-bold mb-4">3. User Accounts</h2>
                        <h3 className="text-xl font-semibold mb-3">3.1 Registration</h3>
                        <p className="text-muted-foreground leading-relaxed mb-4">
                            To use certain features of the Service, you must create an account. You agree to provide accurate and complete information during registration and to keep your account information up to date.
                        </p>

                        <h3 className="text-xl font-semibold mb-3">3.2 Account Security</h3>
                        <p className="text-muted-foreground leading-relaxed mb-4">
                            You are responsible for maintaining the confidentiality of your account credentials. You agree to notify us immediately of any unauthorized use of your account.
                        </p>
                    </section>

                    <section className="mb-12">
                        <h2 className="text-2xl font-display font-bold mb-4">4. User Content</h2>
                        <h3 className="text-xl font-semibold mb-3">4.1 Ownership</h3>
                        <p className="text-muted-foreground leading-relaxed mb-4">
                            You retain full ownership of all content you create using the Service, including your resumes, personal information, and any other materials you submit.
                        </p>

                        <h3 className="text-xl font-semibold mb-3">4.2 License to Us</h3>
                        <p className="text-muted-foreground leading-relaxed mb-4">
                            By using the Service, you grant us a limited license to store, process, and display your content solely for the purpose of providing the Service to you.
                        </p>

                        <h3 className="text-xl font-semibold mb-3">4.3 Prohibited Content</h3>
                        <p className="text-muted-foreground leading-relaxed mb-4">
                            You agree not to submit content that is illegal, fraudulent, defamatory, or infringes on the rights of others.
                        </p>
                    </section>

                    <section className="mb-12">
                        <h2 className="text-2xl font-display font-bold mb-4">5. API Keys (BYOK)</h2>
                        <p className="text-muted-foreground leading-relaxed mb-4">
                            Our Service supports a &quot;Bring Your Own Key&quot; model for AI features:
                        </p>
                        <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
                            <li>You are responsible for obtaining and maintaining valid API keys</li>
                            <li>You must comply with the terms of service of the API providers (e.g., OpenAI, Google)</li>
                            <li>Any charges from API providers are your responsibility</li>
                            <li>We are not responsible for any issues arising from your use of third-party APIs</li>
                        </ul>
                    </section>

                    <section className="mb-12">
                        <h2 className="text-2xl font-display font-bold mb-4">6. Intellectual Property</h2>
                        <p className="text-muted-foreground leading-relaxed mb-4">
                            The Service, including its design, features, and content (excluding user content), is owned by Handcraft Resume and is protected by intellectual property laws. You may not copy, modify, or distribute any part of the Service without our express written permission.
                        </p>
                    </section>

                    <section className="mb-12">
                        <h2 className="text-2xl font-display font-bold mb-4">7. Disclaimers</h2>
                        <p className="text-muted-foreground leading-relaxed mb-4">
                            THE SERVICE IS PROVIDED &quot;AS IS&quot; WITHOUT WARRANTIES OF ANY KIND. We do not guarantee that:
                        </p>
                        <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
                            <li>The Service will be uninterrupted or error-free</li>
                            <li>AI-generated content will be accurate or suitable for your needs</li>
                            <li>Using our Service will result in job offers or interviews</li>
                        </ul>
                    </section>

                    <section className="mb-12">
                        <h2 className="text-2xl font-display font-bold mb-4">8. Limitation of Liability</h2>
                        <p className="text-muted-foreground leading-relaxed mb-4">
                            To the maximum extent permitted by law, Handcraft Resume shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising out of your use of the Service.
                        </p>
                    </section>

                    <section className="mb-12">
                        <h2 className="text-2xl font-display font-bold mb-4">9. Termination</h2>
                        <p className="text-muted-foreground leading-relaxed mb-4">
                            We reserve the right to suspend or terminate your access to the Service at any time for violations of these Terms. You may also close your account at any time.
                        </p>
                    </section>

                    <section className="mb-12">
                        <h2 className="text-2xl font-display font-bold mb-4">10. Changes to Terms</h2>
                        <p className="text-muted-foreground leading-relaxed mb-4">
                            We may update these Terms from time to time. We will notify you of significant changes. Continued use of the Service after changes constitutes acceptance of the new Terms.
                        </p>
                    </section>

                    <section className="mb-12">
                        <h2 className="text-2xl font-display font-bold mb-4">11. Contact Us</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            If you have questions about these Terms, please contact us at legal@handcraftresume.com
                        </p>
                    </section>
                </div>
            </div>
        </div>
    );
}
