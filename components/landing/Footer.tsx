import Link from 'next/link';
import { FileText } from 'lucide-react';

export function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="border-t border-border bg-background py-16 px-6">
            <div className="max-w-7xl mx-auto">
                <div className="grid gap-12 md:grid-cols-4">
                    {/* Brand Column */}
                    <div className="md:col-span-2">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="h-8 w-8 rounded-lg bg-foreground flex items-center justify-center">
                                <FileText className="h-4 w-4 text-background" />
                            </div>
                            <span className="font-display font-bold text-xl">Handcraft Resume</span>
                        </div>
                        <p className="text-muted-foreground max-w-sm mb-6">
                            The AI-powered resume builder for professionals who want total control.
                            Bring your own API keys, own your data.
                        </p>
                        <div className="flex gap-4">
                            <a
                                href="https://github.com/unfoldingdimensions"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-muted-foreground hover:text-foreground transition-colors"
                                aria-label="GitHub"
                            >
                                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                                    <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                                </svg>
                            </a>
                        </div>
                    </div>

                    {/* Links Column */}
                    <div>
                        <h4 className="font-display font-bold text-sm uppercase tracking-wider mb-4">Product</h4>
                        <ul className="space-y-3">
                            <li>
                                <Link href="#features" className="text-muted-foreground hover:text-foreground transition-colors">
                                    Features
                                </Link>
                            </li>
                            <li>
                                <Link href="/templates" className="text-muted-foreground hover:text-foreground transition-colors">
                                    Templates
                                </Link>
                            </li>
                            <li>
                                <Link href="/career-advice" className="text-muted-foreground hover:text-foreground transition-colors">
                                    Career Advice
                                </Link>
                            </li>
                            <li>
                                <Link href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors">
                                    Pricing
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Legal Column */}
                    <div>
                        <h4 className="font-display font-bold text-sm uppercase tracking-wider mb-4">Legal</h4>
                        <ul className="space-y-3">
                            <li>
                                <Link href="/privacy" className="text-muted-foreground hover:text-foreground transition-colors">
                                    Privacy Policy
                                </Link>
                            </li>
                            <li>
                                <Link href="/terms" className="text-muted-foreground hover:text-foreground transition-colors">
                                    Terms of Service
                                </Link>
                            </li>
                            <li>
                                <Link href="/cookies" className="text-muted-foreground hover:text-foreground transition-colors">
                                    Cookie Policy
                                </Link>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="mt-16 pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
                    <p className="text-sm text-muted-foreground">
                        © {currentYear} Handcraft Resume. All rights reserved.
                    </p>
                    <p className="text-sm text-muted-foreground">
                        Made with precision for career-focused professionals.
                    </p>
                </div>
            </div>
        </footer>
    );
}
