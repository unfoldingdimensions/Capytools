import type { Metadata } from 'next';
import Link from 'next/link';
import type { CSSProperties } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/card';
import { TEMPLATE_PAGE_COPY } from '@/lib/capyresume/seo/templates';
import { TEMPLATE_LIST, isPackUnlocked } from '@/lib/capyresume/templates';
import { SITE } from '@/lib/site';

export const metadata: Metadata = {
  title: 'CapyResume — a free, private resume builder that runs in your browser',
  description:
    'Write a resume in your browser: six single-column templates, PDF, DOCX and JSON export, no account, no watermark and no upload. Free and open source.',
  alternates: { canonical: '/' },
};

/** Stagger offsets for the hero reveal. */
const delay = (ms: number) => ({ '--reveal-delay': `${ms}ms` }) as CSSProperties;

/** Only claims the code already keeps: the licence, the storage model, the exports. */
const TRUST = [
  'free and open source, under the Apache-2.0 licence',
  'no account and no signup — there is nothing to sign in to',
  'your details never leave the tab; clearing browser data is the only way they go',
  'PDF, DOCX and JSON export, with no watermark on any of them',
] as const;

const STEPS = [
  {
    title: 'Write it',
    body: 'One plain form: contact details, roles, education, skills. Add as many roles as your career actually has.',
  },
  {
    title: 'Pick a template',
    body: 'Six single-column layouts, each table-free and set in a font every reader already has installed.',
  },
  {
    title: 'Export and send',
    body: 'Download a PDF or a DOCX, and keep a JSON copy so you can move the resume between your devices.',
  },
] as const;

const GUIDES = [
  {
    href: '/ats-resume-format',
    label: 'the ATS resume format',
    body: 'what a parser reads, what it throws away, and why the single column matters.',
  },
  {
    href: '/resume-templates',
    label: 'templates by role',
    body: 'starting points for nurses, teachers, engineers and more.',
  },
  {
    href: '/free-cv-builder',
    label: 'by country',
    body: 'what changes between the US, the UK, Canada and the rest.',
  },
] as const;

/**
 * The landing page. A server component on purpose: the hero reveal is a CSS animation
 * on the house tokens, so `/` ships no client JavaScript and the reduced-motion guard
 * in globals.css is the whole accessibility story.
 */
export default function LandingPage() {
  const templates = TEMPLATE_LIST.filter((spec) => isPackUnlocked(spec.pack));

  return (
    <div className="mx-auto max-w-5xl px-6 pb-20 pt-16 sm:pt-24">
      <section className="max-w-3xl">
        <p className="eyebrow reveal-up" style={delay(0)}>
          free and open source
        </p>
        <h1 className="reveal-up mt-6 font-display text-display-xl font-light" style={delay(100)}>
          A CV that&rsquo;s <em>actually</em> yours.
        </h1>
        <p className="reveal-up mt-6 text-lead-lg text-muted-foreground" style={delay(200)}>
          no signup, no watermark, no upload. you type, you choose a template, you export — and your
          details never leave this tab.
        </p>
        <div className="reveal-up mt-10 flex flex-wrap items-center gap-3" style={delay(300)}>
          <Button asChild size="lg">
            <Link href="/capyresume">open the builder</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/templates">browse the templates</Link>
          </Button>
        </div>
      </section>

      <ul className="reveal-up mt-14 grid gap-3 sm:grid-cols-2" style={delay(400)}>
        {TRUST.map((item) => (
          <li key={item} className="flex items-baseline gap-3 text-body-sm text-muted-foreground">
            <span aria-hidden className="text-primary">
              —
            </span>
            {item}
          </li>
        ))}
      </ul>

      <section className="mt-20">
        <h2 className="font-display text-display-md font-normal">
          Six templates, all of them free
        </h2>
        <p className="mt-3 max-w-2xl text-body-md text-muted-foreground">
          Every layout is a single column of plain text, with no tables and nothing set into an
          image — the shape a parser reads best.
        </p>
        {/* `auto-rows-fr` levels the rows: without it the grid's second row sits shorter
            than the first, which reads as a mistake rather than a rhythm. */}
        <ul className="mt-8 grid auto-rows-fr gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((spec) => {
            const copy = TEMPLATE_PAGE_COPY[spec.id];
            return (
              <li key={spec.id} className="flex">
                <Card hover className="flex h-full w-full flex-col p-6">
                  <CardTitle>
                    <Link href={`/templates/${spec.id}`} className="hover:underline">
                      {copy.heading}
                    </Link>
                  </CardTitle>
                  <p className="mt-3 flex-1 text-body-sm text-muted-foreground">
                    {copy.description}
                  </p>
                  <p className="eyebrow-micro mt-4">
                    {spec.fontFamily === 'Times-Roman' ? 'serif' : 'sans'} ·{' '}
                    {spec.headingCase === 'upper' ? 'upper-case headings' : 'title-case headings'}
                  </p>
                </Card>
              </li>
            );
          })}
        </ul>
        <p className="mt-8">
          <Link
            href="/templates"
            className="text-ui-sm text-sage-deep underline-offset-4 hover:underline dark:text-primary"
          >
            see the templates side by side
          </Link>
        </p>
      </section>

      <section className="mt-20">
        <h2 className="font-display text-display-md font-normal">How it works</h2>
        <ol className="mt-8 grid gap-8 sm:grid-cols-3">
          {STEPS.map((step, index) => (
            <li key={step.title}>
              <p className="eyebrow-micro">step {index + 1}</p>
              <h3 className="mt-3 font-display text-title-sm font-normal">{step.title}</h3>
              <p className="mt-2 text-body-sm text-muted-foreground">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-20">
        <h2 className="font-display text-display-md font-normal">Guides</h2>
        <ul className="mt-8 grid auto-rows-fr gap-4 sm:grid-cols-3">
          {GUIDES.map((guide) => (
            <li key={guide.href} className="flex">
              <Card hover className="flex h-full w-full flex-col p-6">
                <CardTitle>
                  <Link href={guide.href} className="hover:underline">
                    {guide.label}
                  </Link>
                </CardTitle>
                <p className="mt-3 text-body-sm text-muted-foreground">{guide.body}</p>
              </Card>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-20 rounded-3xl border border-border bg-card p-8 shadow-sm sm:p-12">
        <h2 className="font-display text-display-md font-normal">Your CV, in your hands</h2>
        <p className="mt-3 max-w-2xl text-body-md text-muted-foreground">
          {SITE.name} stores nothing on a server, because there is no server holding it. The
          document is assembled in the tab you are reading this in.
        </p>
        <div className="mt-8">
          <Button asChild size="lg">
            <Link href="/capyresume">open the builder</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
