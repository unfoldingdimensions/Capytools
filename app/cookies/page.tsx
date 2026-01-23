import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
    title: 'Cookie Policy | Handcraft Resume',
    description: 'Cookie Policy for Handcraft Resume - Learn about how we use cookies and similar technologies.',
};

export default function CookiePolicyPage() {
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
                        Cookie Policy
                    </h1>
                    <p className="text-muted-foreground">
                        Last updated: January 24, 2026
                    </p>
                </header>

                {/* Content */}
                <div className="prose prose-zinc dark:prose-invert max-w-none">
                    <section className="mb-12">
                        <h2 className="text-2xl font-display font-bold mb-4">1. What Are Cookies?</h2>
                        <p className="text-muted-foreground leading-relaxed mb-4">
                            Cookies are small text files that are stored on your device when you visit a website. They help websites remember your preferences and improve your browsing experience.
                        </p>
                    </section>

                    <section className="mb-12">
                        <h2 className="text-2xl font-display font-bold mb-4">2. How We Use Cookies</h2>
                        <p className="text-muted-foreground leading-relaxed mb-4">
                            Handcraft Resume uses cookies and similar technologies for the following purposes:
                        </p>

                        <h3 className="text-xl font-semibold mb-3">2.1 Essential Cookies</h3>
                        <p className="text-muted-foreground leading-relaxed mb-4">
                            These cookies are necessary for the website to function properly:
                        </p>
                        <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
                            <li><strong>Authentication:</strong> To keep you logged in securely (via Clerk)</li>
                            <li><strong>Session management:</strong> To maintain your session state</li>
                            <li><strong>Security:</strong> To protect against cross-site request forgery</li>
                        </ul>

                        <h3 className="text-xl font-semibold mb-3">2.2 Functional Cookies</h3>
                        <p className="text-muted-foreground leading-relaxed mb-4">
                            These cookies enhance your experience:
                        </p>
                        <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
                            <li><strong>Theme preference:</strong> To remember your light/dark mode selection</li>
                            <li><strong>Language settings:</strong> To remember your language preference</li>
                            <li><strong>User preferences:</strong> To remember your layout and display preferences</li>
                        </ul>

                        <h3 className="text-xl font-semibold mb-3">2.3 Analytics Cookies</h3>
                        <p className="text-muted-foreground leading-relaxed mb-4">
                            These cookies help us understand how visitors use our website:
                        </p>
                        <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
                            <li><strong>Usage analytics:</strong> To understand which features are most popular</li>
                            <li><strong>Performance monitoring:</strong> To identify and fix issues</li>
                            <li><strong>Visitor statistics:</strong> To count visitors and page views</li>
                        </ul>
                    </section>

                    <section className="mb-12">
                        <h2 className="text-2xl font-display font-bold mb-4">3. Third-Party Cookies</h2>
                        <p className="text-muted-foreground leading-relaxed mb-4">
                            We use services from third parties that may set their own cookies:
                        </p>
                        <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
                            <li><strong>Clerk:</strong> For authentication and user management</li>
                            <li><strong>Vercel:</strong> For hosting and performance analytics</li>
                        </ul>
                        <p className="text-muted-foreground leading-relaxed mb-4">
                            These third parties have their own privacy and cookie policies. We encourage you to review them.
                        </p>
                    </section>

                    <section className="mb-12">
                        <h2 className="text-2xl font-display font-bold mb-4">4. Cookie Duration</h2>
                        <p className="text-muted-foreground leading-relaxed mb-4">
                            Cookies can be either session cookies or persistent cookies:
                        </p>
                        <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
                            <li><strong>Session cookies:</strong> Deleted when you close your browser</li>
                            <li><strong>Persistent cookies:</strong> Remain until they expire or you delete them (typically 30 days to 1 year)</li>
                        </ul>
                    </section>

                    <section className="mb-12">
                        <h2 className="text-2xl font-display font-bold mb-4">5. Managing Cookies</h2>
                        <p className="text-muted-foreground leading-relaxed mb-4">
                            You can control and manage cookies in several ways:
                        </p>

                        <h3 className="text-xl font-semibold mb-3">5.1 Browser Settings</h3>
                        <p className="text-muted-foreground leading-relaxed mb-4">
                            Most browsers allow you to:
                        </p>
                        <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
                            <li>View cookies stored on your device</li>
                            <li>Delete cookies individually or all at once</li>
                            <li>Block cookies from specific or all websites</li>
                            <li>Set preferences for first-party vs. third-party cookies</li>
                        </ul>

                        <h3 className="text-xl font-semibold mb-3">5.2 Impact of Disabling Cookies</h3>
                        <p className="text-muted-foreground leading-relaxed mb-4">
                            Please note that disabling essential cookies may affect the functionality of the Service. You may not be able to:
                        </p>
                        <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
                            <li>Stay logged in to your account</li>
                            <li>Save your preferences and settings</li>
                            <li>Use certain features of the Service</li>
                        </ul>
                    </section>

                    <section className="mb-12">
                        <h2 className="text-2xl font-display font-bold mb-4">6. Updates to This Policy</h2>
                        <p className="text-muted-foreground leading-relaxed mb-4">
                            We may update this Cookie Policy from time to time to reflect changes in our practices or legal requirements. We will post the updated policy on this page with a new &quot;Last updated&quot; date.
                        </p>
                    </section>

                    <section className="mb-12">
                        <h2 className="text-2xl font-display font-bold mb-4">7. Contact Us</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            If you have questions about our use of cookies, please contact us at privacy@handcraftresume.com
                        </p>
                    </section>
                </div>
            </div>
        </div>
    );
}
