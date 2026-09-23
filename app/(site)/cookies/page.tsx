import { Metadata } from 'next';
import {
  AI_SETTINGS_KEY,
  PAPER_SIZE_KEY,
  RESUME_STORAGE_KEY as STORAGE_KEY,
  THEME_STORAGE_KEY,
} from '@/lib/capyresume/keys';
import { LegalH3, LegalP, LegalPage, LegalSection, LegalUL } from '@/components/legal/LegalPage';

export const metadata: Metadata = {
  title: 'Cookie policy | CapyResume',
  description:
    'CapyResume sets no cookies. This page lists the browser local storage entries it uses instead, and how to clear them.',
  alternates: { canonical: '/cookies' },
};

function Key({ children }: { children: string }) {
  return (
    <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm text-foreground">
      {children}
    </code>
  );
}

export default function CookiePolicyPage() {
  return (
    <LegalPage
      title="Cookie policy"
      lead="CapyResume sets no cookies. Not for functionality, not for analytics, not for advertising. This page exists to tell you that precisely, and to describe the browser storage the tool does use instead."
    >
      <LegalSection heading="1. The short version">
        <LegalP>
          There are no cookies to consent to. No cookie is set by CapyResume, no third-party cookie
          is loaded, and no tracking or advertising technology is present. Nothing about you is sent
          to us in a request header or a cookie, because there is no CapyResume server to send it
          to.
        </LegalP>
      </LegalSection>

      <LegalSection heading="2. What we use instead">
        <LegalP>
          The tool needs to remember two things: your résumé, and your display preference. It keeps
          them in your browser&apos;s <strong className="text-foreground">local storage</strong>,
          which is a different mechanism from cookies. Local storage is never attached to HTTP
          requests, so it is not transmitted anywhere as you browse — it is not visible to us, to a
          CDN, or to any other site.
        </LegalP>
        <LegalP>Here is every entry CapyResume can write:</LegalP>
        <LegalUL>
          <li>
            <Key>{STORAGE_KEY}</Key> — your résumé, as JSON. This is the tool&apos;s database. It
            exists only in your browser and contains whatever you have typed.
          </li>
          <li>
            <Key>{AI_SETTINGS_KEY}</Key> — the AI provider, model and API key you entered for the
            optional AI features. Written only if you turn those on, and removed the moment you
            remove your key from the tool. Nothing else in the app reads it. See section 4 of the
            Privacy Policy.
          </li>
          <li>
            <Key>{PAPER_SIZE_KEY}</Key> — whether you last exported A4 or US Letter, so a reload
            does not quietly change the paper your next download is printed on.
          </li>
          <li>
            <Key>{THEME_STORAGE_KEY}</Key> — whether you chose light or dark mode, or left it
            following your system. Set by the theme switcher and nothing else.
          </li>
        </LegalUL>
        <LegalP>
          That is the complete list. None of these values leave your device, and none of them
          identify you to us.
        </LegalP>
      </LegalSection>

      <LegalSection heading="3. Why there is no consent banner">
        <LegalP>
          Consent banners exist to obtain permission for cookies that track you, particularly for
          analytics and advertising. CapyResume runs neither, and stores nothing on your device that
          is not strictly necessary to do the job you asked for. With no tracking and no
          non-essential storage, there is nothing to ask consent for.
        </LegalP>
        <LegalP>
          If that changes — if we ever add analytics, for example — this page and the banner will
          appear together, before the tracking starts.
        </LegalP>
      </LegalSection>

      <LegalSection heading="4. Server and CDN logs">
        <LegalP>
          Delivering a web page requires a server to receive a request, and like any web host the
          CDN serving CapyResume will record ordinary request metadata such as your IP address and
          user-agent. That is a server log, not a cookie, and it is a function of how the web works
          rather than something CapyResume adds. We do not combine it with anything, and your résumé
          is never part of a request.
        </LegalP>
        <LegalP>
          Running the tool yourself avoids even this — CapyResume is open source and needs no
          backend.
        </LegalP>
      </LegalSection>

      <LegalSection heading="5. Third-party cookies">
        <LegalH3>None from us</LegalH3>
        <LegalP>
          CapyResume loads no third-party scripts, fonts or widgets that would set a cookie on our
          page.
        </LegalP>
        <LegalH3>The one case worth naming: AI providers</LegalH3>
        <LegalP>
          If you turn on the optional AI features and use your own key, your browser contacts your
          chosen provider directly. Any cookie that provider sets belongs to <em>their</em> domain,
          under <em>their</em> cookie policy, and is governed by your arrangements with them — not
          by this page. You will typically have such a session cookie simply because you have an
          account with them. We neither set it nor read it.
        </LegalP>
      </LegalSection>

      <LegalSection heading="6. How to clear what is stored">
        <LegalP>You are in control of all of it, and clearing it is immediate:</LegalP>
        <LegalUL>
          <li>
            <strong className="text-foreground">In the tool</strong> — use the JSON export to keep a
            backup, then the clear action to remove your résumé, and remove your API key to delete
            that entry. Clearing also stops any AI feature from working until you add a key again.
          </li>
          <li>
            <strong className="text-foreground">In your browser</strong> — your browser&apos;s
            site-data settings let you view and delete local storage for this site, either
            individually or all at once, exactly as you would clear cookies. Blocking storage
            entirely will stop CapyResume from saving your work between visits, though you can still
            edit and export within a session.
          </li>
        </LegalUL>
        <LegalP>
          Remember that clearing your browser data deletes your résumé, and we cannot restore it. If
          it matters, export the JSON first.
        </LegalP>
      </LegalSection>

      <LegalSection heading="7. Changes and contact">
        <LegalP>
          If we ever add anything that stores data on your device, it will be listed on this page
          before it ships, and the date at the top will change. Questions, corrections and reports
          are welcome in the project&apos;s issue tracker.
        </LegalP>
      </LegalSection>
    </LegalPage>
  );
}
