import type { Metadata } from 'next';
// import { Inter, Outfit } from 'next/font/google';

import { ClerkProvider } from '@clerk/nextjs';
import { Providers } from './providers';
import './globals.css';
import React from 'react';
import { ThemeProvider } from '@/components/theme-provider';

// Font variables are now handled via CSS @import to avoid build connection issues
// but provide modern typography to the user.

export const metadata: Metadata = {
    title: 'Handcraft Resume - AI-Powered Resume Builder',
    description: 'Create professional resumes with AI assistance. Export to PDF and DOCX formats.',
    keywords: 'resume builder, CV maker, AI resume, professional resume, job application',
    authors: [{ name: 'Handcraft Resume' }],
    robots: 'index, follow',
    openGraph: {
        type: 'website',
        locale: 'en_US',
        url: process.env.NEXT_PUBLIC_APP_URL,
        siteName: 'Handcraft Resume',
        title: 'Handcraft Resume - AI-Powered Resume Builder',
        description: 'Create professional resumes with AI assistance',
    },
};

export const viewport = {
    width: 'device-width',
    initialScale: 1,
    themeColor: [
        { media: '(prefers-color-scheme: light)', color: 'white' },
        { media: '(prefers-color-scheme: dark)', color: 'black' },
    ],
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <ClerkProvider>
            <html lang="en" suppressHydrationWarning>
                {/* <body className={`${inter.variable} ${outfit.variable} font-sans antialiased`}> */}
                <body className={`font-sans antialiased`}>
                    <ThemeProvider
                        attribute="class"
                        defaultTheme="system"
                        enableSystem
                        disableTransitionOnChange
                    >
                        <Providers>{children}</Providers>
                    </ThemeProvider>
                </body>
            </html>
        </ClerkProvider>
    );
}
