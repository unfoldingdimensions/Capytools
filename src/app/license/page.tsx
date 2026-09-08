import type { Metadata } from "next";
import "@/components/landing/landing.css";
import { AmbientBackground } from "@/components/AmbientBackground";
import { Header } from "@/components/header";
import { SiteFooter } from "@/components/site-footer";
import { TransitionLink } from "@/components/TransitionLink";

export const metadata: Metadata = {
  title: "MIT License — Capytools",
  description:
    "Capytools is MIT-licensed. Use it, fork it, ship it — just keep the notice.",
};

const LICENSE_TEXT = `Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`;

export default function LicensePage() {
  return (
    <div className="lp flex min-h-dvh flex-col text-foreground">
      <AmbientBackground />
      <Header />

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 pb-24 pt-16">
        <span className="lp-label">License · MIT</span>
        <h1 className="lp-display mt-6 text-5xl sm:text-6xl">
          Free as in <em>calm</em>
          <span className="lp-dot">.</span>
        </h1>
        <p className="lp-lead mt-6 max-w-[42ch]">
          Capytools is MIT-licensed. Use it, fork it, ship it — just keep the
          notice.
        </p>

        <div className="lp-divider mt-14" aria-hidden="true" />

        <div className="lp-card mt-10 whitespace-pre-wrap font-mono text-[13px] leading-relaxed">
          {`Copyright (c) 2026 unfoldingdimensions\n\n${LICENSE_TEXT}`}
        </div>

        <div className="mt-12 flex flex-wrap items-center gap-x-8 gap-y-3">
          <TransitionLink href="/" className="lp-read-more">
            ← Back to the landing
          </TransitionLink>
          <TransitionLink href="/design" className="lp-read-more">
            Design notes
          </TransitionLink>
          <TransitionLink href="/notes" className="lp-read-more">
            Project notes
          </TransitionLink>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
