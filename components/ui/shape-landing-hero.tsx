"use client";

import { motion } from "framer-motion";
import { FileText, CheckCircle, Shield, Users, ChevronDown, MoveRight } from "lucide-react";
import Link from 'next/link';
import { SignInButton, SignUpButton, SignedIn, SignedOut } from '@clerk/nextjs';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

function AnimatedParticles({ density = "low" }: { density?: "low" | "medium" | "high" }) {
    const count = density === "low" ? 20 : density === "medium" ? 40 : 60;

    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {Array.from({ length: count }).map((_, i) => (
                <motion.div
                    key={i}
                    className="absolute rounded-full bg-brand-500/10"
                    initial={{
                        x: Math.random() * 100 + "%",
                        y: Math.random() * 100 + "%",
                        scale: Math.random() * 0.5 + 0.5,
                        opacity: 0,
                    }}
                    animate={{
                        y: [null, Math.random() * -100 + "px"],
                        opacity: [0, 1, 0],
                    }}
                    transition={{
                        duration: Math.random() * 10 + 10,
                        repeat: Infinity,
                        ease: "linear",
                        delay: Math.random() * 5,
                    }}
                    style={{
                        width: Math.random() * 20 + 10 + "px",
                        height: Math.random() * 20 + 10 + "px",
                    }}
                />
            ))}
        </div>
    );
}

function HeroGeometric({
    children,
}: {
    children?: React.ReactNode;
}) {
    const fadeUpVariants: import("framer-motion").Variants = {
        hidden: { opacity: 0, y: 30 },
        visible: (i: number) => ({
            opacity: 1,
            y: 0,
            transition: {
                duration: 0.8,
                delay: 0.1 + i * 0.1,
                ease: [0.25, 0.4, 0.25, 1],
            },
        }),
    };

    return (
        <div className="relative min-h-screen w-full flex flex-col items-center justify-start overflow-x-hidden bg-white dark:bg-black">
            <nav className="absolute top-0 left-0 right-0 z-50 container mx-auto px-4 py-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-black text-white dark:bg-white dark:text-black">
                            <FileText className="h-5 w-5" />
                        </div>
                        <span className="text-xl font-display font-bold text-gray-900 dark:text-gray-100 tracking-tight">Handcraft Resume</span>
                    </div>
                    <div className="flex items-center space-x-4">
                        <SignedOut>
                            <SignInButton mode="modal">
                                <Button variant="ghostSubtle">
                                    Sign In
                                </Button>
                            </SignInButton>
                            <SignUpButton mode="modal">
                                <Button variant="default" className="rounded-full px-6">
                                    Get Started
                                </Button>
                            </SignUpButton>
                        </SignedOut>
                        <SignedIn>
                            <Link href="/dashboard">
                                <Button variant="default" className="rounded-full px-6">
                                    Go to Dashboard
                                </Button>
                            </Link>
                        </SignedIn>
                    </div>
                </div>
            </nav>

            <AnimatedParticles density="medium" />

            <div className="relative z-10 container mx-auto px-4 md:px-6 mt-32 md:mt-40 mb-20">
                <div className="max-w-4xl mx-auto text-center">
                    <motion.div
                        custom={0}
                        variants={fadeUpVariants}
                        initial="hidden"
                        animate="visible"
                        className="flex justify-center mb-6"
                    >
                        <Badge variant="outline" className="px-4 py-1.5 text-sm rounded-full bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
                            ✨ AI-Powered Resume Builder
                        </Badge>
                    </motion.div>

                    <motion.div
                        custom={1}
                        variants={fadeUpVariants}
                        initial="hidden"
                        animate="visible"
                    >
                        <h1 className="text-5xl sm:text-7xl md:text-8xl font-display font-bold text-gray-900 dark:text-white tracking-tight mb-8">
                            Craft Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-zinc-900 to-zinc-500 dark:from-white dark:to-zinc-500">Perfect Resume</span>
                        </h1>
                    </motion.div>

                    <motion.div
                        custom={2}
                        variants={fadeUpVariants}
                        initial="hidden"
                        animate="visible"
                    >
                        <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-400 mb-10 leading-relaxed max-w-2xl mx-auto px-4">
                            Create professional, ATS-friendly resumes in minutes with AI assistance.
                            Upload your old resume or start from scratch using our intuitive builder.
                        </p>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
                            <SignedOut>
                                <SignUpButton mode="modal">
                                    <Button size="xl" variant="default" className="w-full sm:w-auto rounded-full group h-14 px-8">
                                        Build Your Resume
                                        <MoveRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                                    </Button>
                                </SignUpButton>
                            </SignedOut>
                            <SignedIn>
                                <Link href="/dashboard">
                                    <Button size="xl" variant="default" className="w-full sm:w-auto rounded-full group h-14 px-8">
                                        Go to Dashboard
                                        <MoveRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                                    </Button>
                                </Link>
                            </SignedIn>

                            <Button size="xl" variant="outline" className="w-full sm:w-auto rounded-full h-14 px-8">
                                View Examples
                            </Button>
                        </div>

                        {/* Trust indicators */}
                        <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-12 text-sm font-medium text-gray-500 dark:text-gray-400">
                            <div className="flex items-center gap-2">
                                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100">
                                    <CheckCircle className="h-3.5 w-3.5" />
                                </div>
                                <span>Free to use</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100">
                                    <Shield className="h-3.5 w-3.5" />
                                </div>
                                <span>AES-256 Encrypted</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100">
                                    <Users className="h-3.5 w-3.5" />
                                </div>
                                <span>10,000+ Users</span>
                            </div>
                        </div>
                    </motion.div>
                </div>

                {children}

                {/* Scroll indicator */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.5, duration: 1 }}
                    className="absolute bottom-10 left-1/2 -translate-x-1/2 hidden md:block"
                >
                    <div className="animate-bounce p-2 rounded-full bg-white/50 backdrop-blur border border-gray-200 shadow-sm text-gray-400">
                        <ChevronDown className="h-5 w-5" />
                    </div>
                </motion.div>
            </div>
        </div>
    );
}

export { HeroGeometric };