import { HeroGeometric } from '@/components/ui/shape-landing-hero';
import { FileText, Download, Upload, Sparkles, Search, Target, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import { SignUpButton, SignedIn, SignedOut } from '@clerk/nextjs';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function HomePage() {
    return (
        <HeroGeometric>
            <div className="relative z-10 container mx-auto px-4 py-20 space-y-32">
                {/* Core Features Section */}
                <section>
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-display font-bold text-gray-900 mb-4">
                            Everything you need to get hired
                        </h2>
                        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                            Powerful tools to help you build, optimize, and export your resume in minutes.
                        </p>
                    </div>

                    <div className="grid gap-8 md:grid-cols-3">
                        <Card className="p-8 border-none shadow-lg shadow-gray-200/50 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                            <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                                <FileText className="h-7 w-7" />
                            </div>
                            <h3 className="mb-3 text-xl font-display font-bold text-gray-900">
                                Smart Resume Builder
                            </h3>
                            <p className="text-gray-500 leading-relaxed">
                                Create professional resumes from scratch with our intuitive, AI-guided form builder.
                            </p>
                        </Card>

                        <Card className="p-8 border-none shadow-lg shadow-gray-200/50 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                            <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-50 text-purple-600">
                                <Upload className="h-7 w-7" />
                            </div>
                            <h3 className="mb-3 text-xl font-display font-bold text-gray-900">
                                Instant Import
                            </h3>
                            <p className="text-gray-500 leading-relaxed">
                                Upload your existing PDF or DOCX resume and let our AI automatically extract and format your data.
                            </p>
                        </Card>

                        <Card className="p-8 border-none shadow-lg shadow-gray-200/50 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                            <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-teal-600">
                                <Download className="h-7 w-7" />
                            </div>
                            <h3 className="mb-3 text-xl font-display font-bold text-gray-900">
                                Flexible Export
                            </h3>
                            <p className="text-gray-500 leading-relaxed">
                                Download your polished resume in ATS-friendly PDF or editable Word (DOCX) formats.
                            </p>
                        </Card>
                    </div>
                </section>

                {/* AI Power Section - The "Why" */}
                <section>
                    <div className="text-center mb-16">
                        <Badge variant="brand" shape="pill" className="mb-4 px-4 py-1.5 text-sm bg-indigo-50 text-indigo-700 border-indigo-100">
                            AI-Powered Advantage
                        </Badge>
                        <h2 className="text-3xl md:text-4xl font-display font-bold text-gray-900 mb-4">
                            Supercharge your job search
                        </h2>
                        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                            Gain a competitive edge with our suite of intelligent tools designed to get you past the screening layer.
                        </p>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                        <Card className="p-6 border-none bg-white shadow-sm ring-1 ring-gray-100 hover:ring-indigo-100 hover:shadow-md transition-all">
                            <div className="h-12 w-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
                                <Search className="h-6 w-6" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 mb-2">Role Analyzer</h3>
                            <p className="text-sm text-gray-500">
                                Paste a job description and our AI will extract the key skills and requirements you need to match.
                            </p>
                        </Card>

                        <Card className="p-6 border-none bg-white shadow-sm ring-1 ring-gray-100 hover:ring-emerald-100 hover:shadow-md transition-all">
                            <div className="h-12 w-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
                                <Target className="h-6 w-6" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 mb-2">ATS Matcher</h3>
                            <p className="text-sm text-gray-500">
                                Get a real-time compatibility score against job descriptions to ensure you beat the bots.
                            </p>
                        </Card>

                        <Card className="p-6 border-none bg-white shadow-sm ring-1 ring-gray-100 hover:ring-pink-100 hover:shadow-md transition-all">
                            <div className="h-12 w-12 rounded-xl bg-pink-50 text-pink-600 flex items-center justify-center mb-4">
                                <MessageSquare className="h-6 w-6" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 mb-2">Interview Prep</h3>
                            <p className="text-sm text-gray-500">
                                Practice with personalized interview questions generated from your specific target role.
                            </p>
                        </Card>

                        <Card className="p-6 border-none bg-white shadow-sm ring-1 ring-gray-100 hover:ring-amber-100 hover:shadow-md transition-all">
                            <div className="h-12 w-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
                                <Sparkles className="h-6 w-6" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 mb-2">Smart Suggestions</h3>
                            <p className="text-sm text-gray-500">
                                Receive intelligent suggestions for bullet points and professional summaries as you write.
                            </p>
                        </Card>
                    </div>
                </section>

                {/* CTA Section */}
                <section className="pb-20">
                    <div className="rounded-3xl bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-16 text-center text-white shadow-xl shadow-blue-900/20 relative overflow-hidden">
                        {/* Background decoration */}
                        <div className="absolute top-0 right-0 -m-10 h-64 w-64 bg-white/10 blur-3xl rounded-full" />
                        <div className="absolute bottom-0 left-0 -m-10 h-64 w-64 bg-white/10 blur-3xl rounded-full" />

                        <div className="relative z-10 max-w-3xl mx-auto">
                            <h2 className="mb-6 text-3xl md:text-4xl font-display font-bold">Ready to land your dream job?</h2>
                            <p className="mb-10 text-xl text-blue-100">
                                Join thousands of job seekers who have successfully upgraded their careers with Handcraft Resume.
                            </p>
                            <SignedOut>
                                <SignUpButton mode="modal">
                                    <button className="rounded-xl bg-white px-8 py-4 text-lg font-bold text-blue-600 transition-all hover:bg-blue-50 hover:scale-105 shadow-lg">
                                        Get Started for Free
                                    </button>
                                </SignUpButton>
                            </SignedOut>
                            <SignedIn>
                                <Link
                                    href="/dashboard"
                                    className="inline-block rounded-xl bg-white px-8 py-4 text-lg font-bold text-blue-600 transition-all hover:bg-blue-50 hover:scale-105 shadow-lg"
                                >
                                    Go to Dashboard
                                </Link>
                            </SignedIn>
                        </div>
                    </div>
                </section>
            </div>
        </HeroGeometric>
    );
}

