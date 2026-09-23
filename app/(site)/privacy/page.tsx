import { Metadata } from 'next';
import { AI_SETTINGS_KEY, RESUME_STORAGE_KEY as STORAGE_KEY } from '@/lib/capyresume/keys';
import { LegalH3, LegalP, LegalPage, LegalSection, LegalUL } from '@/components/legal/LegalPage';

export const metadata: Metadata = {
  title: 'Privacy Policy | CapyResume',
  description:
    'CapyResume runs entirely in your browser. Your résumé is not uploaded, there is no account, and there is no server of ours holding your data.',
};

export default function PrivacyPolicyPage() {
  return (
    <LegalPage
      title="Privacy policy"
      lead="CapyResume is a résumé builder that runs entirely in your browser. This page describes what happens to your data — which is, deliberately, almost nothing. It is written to be read, not to be skipped."
    >
      <LegalSection heading="1. The short version">
        <LegalUL>
          <li>
            <strong className="text-foreground">There is no CapyResume account</strong> and no
            signup. We never ask for your name or email to use the tool.
          </li>
          <li>
            <strong className="text-foreground">Your résumé is never uploaded to us.</strong> It is
            stored in your own browser and the PDF, DOCX and JSON files are generated on your own
            device.
          </li>
          <li>
            <strong className="text-foreground">
              We run no analytics, no advertising and no tracking of any kind.
            </strong>
          </li>
          <li>
            <strong className="text-foreground">
              AI features are optional and use your own key,
            </strong>{' '}
            sent straight from your browser to the provider you pick. We are not in that
            conversation.
          </li>
        </LegalUL>
      </LegalSection>

      <LegalSection heading="2. Information we do not collect">
        <LegalP>
          Because there is no account and no server of ours handling your document, we do not
          collect, receive, store or have access to any of the following:
        </LegalP>
        <LegalUL>
          <li>
            Your résumé content — your name, contact details, employment history, education or
            skills
          </li>
          <li>Your name, email address, phone number or any contact information about you</li>
          <li>Documents you might have imported from elsewhere</li>
          <li>Your IP address, device fingerprint, browsing history or usage analytics</li>
          <li>Any API key you enter for the optional AI features</li>
        </LegalUL>
        <LegalP>
          We are not in a position to lose this data, sell it, or hand it over on request, because
          we never have it.
        </LegalP>
      </LegalSection>

      <LegalSection heading="3. Where your résumé actually lives">
        <LegalP>
          Your résumé is saved in your browser&apos;s local storage, under the key{' '}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm text-foreground">
            {STORAGE_KEY}
          </code>
          . It stays on your device. It is never transmitted anywhere.
        </LegalP>
        <LegalP>Three consequences worth understanding before you rely on the tool:</LegalP>
        <LegalUL>
          <li>
            <strong className="text-foreground">
              Clearing your site data deletes your résumé.
            </strong>{' '}
            So does using private/incognito mode, or clearing your cache. We cannot recover it,
            because we never had a copy.
          </li>
          <li>
            <strong className="text-foreground">
              Your résumé does not follow you between devices
            </strong>{' '}
            or browsers. It lives in one browser profile on one device.
          </li>
          <li>
            <strong className="text-foreground">
              The JSON export is your backup and your means of moving it.
            </strong>{' '}
            Download it and keep it somewhere you control. Importing that file restores your résumé
            exactly, on any device.
          </li>
        </LegalUL>
      </LegalSection>

      <LegalSection heading="4. Optional AI features (bring your own key)">
        <LegalP>
          CapyResume can help reword, tighten and format parts of your résumé. This is off unless
          you deliberately turn it on. When you do, here is exactly what happens:
        </LegalP>
        <LegalUL>
          <li>
            You paste an API key you obtained yourself from an AI provider. It is stored in this
            browser, under the key{' '}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm text-foreground">
              {AI_SETTINGS_KEY}
            </code>
            .
          </li>
          <li>
            <strong className="text-foreground">
              The request goes directly from your browser to that provider.
            </strong>{' '}
            There is no CapyResume server in the path — we cannot see your key, and we cannot see
            the text you sent.
          </li>
          <li>
            Only the text you explicitly ask to improve is transmitted, together with the
            instruction. Your résumé is not uploaded wholesale.
          </li>
          <li>
            That provider handles that text under <em>its own</em> privacy policy and terms, and
            sees your IP address as it would for any direct API call. We do not control and cannot
            speak for how they retain or use it — please read their policy before using a key.
          </li>
          <li>
            Any charges the provider makes are between you and them. We have no billing relationship
            with them on your behalf.
          </li>
          <li>
            You can remove your key at any time from the tool, which deletes it from this browser
            immediately.
          </li>
        </LegalUL>
        <LegalP>
          Because the key is stored locally and is readable by the page, treat it as you would a
          password typed into a website: use a key you are willing to rotate, set a spending limit
          with your provider, and remove it when you are done if you are on a shared computer.
        </LegalP>
      </LegalSection>

      <LegalSection heading="5. Hosting and server logs">
        <LegalP>
          CapyResume is a set of static files. They are served by a hosting provider or CDN, which —
          like any web host — will see ordinary request information such as your IP address and
          browser user-agent in order to deliver the page. We do not add analytics, we do not
          correlate those logs with anything, and nothing about your résumé is ever part of a
          request.
        </LegalP>
        <LegalP>
          You are also free to avoid all of this by running CapyResume yourself: it is open source
          and needs no backend.
        </LegalP>
      </LegalSection>

      <LegalSection heading="6. Cookies">
        <LegalP>
          CapyResume sets no cookies — not for functionality, not for analytics, not for
          advertising. We use your browser&apos;s local storage instead, which is not transmitted
          with requests. See the Cookie Policy for the full list of what is stored.
        </LegalP>
      </LegalSection>

      <LegalSection heading="7. Your rights">
        <LegalP>
          Data-protection laws such as the GDPR and CCPA give you rights to access, correct, export
          and delete the personal data an organisation holds about you. We support those rights in
          the simplest possible way: we hold no personal data about you, so there is nothing for us
          to disclose, correct or erase.
        </LegalP>
        <LegalP>
          Your control sits with you and is immediate — download a JSON export for a complete copy
          of everything, or clear your browser&apos;s site data to erase it. If you believe we do
          hold something of yours, write to us through the issue tracker and we will look into it.
        </LegalP>
      </LegalSection>

      <LegalSection heading="8. Children">
        <LegalP>
          CapyResume is a general-purpose document tool, not a service directed at children. Since
          we collect nothing at all, we hold no data about anyone of any age.
        </LegalP>
      </LegalSection>

      <LegalSection heading="9. Changes to this policy">
        <LegalP>
          If this policy changes — for example because we add an optional paid tier that requires an
          account — we will update this page and its date before that change takes effect. Because
          we hold no contact details, this page is the only place we can announce it.
        </LegalP>
      </LegalSection>

      <LegalSection heading="10. Contact">
        <LegalH3>Questions, corrections and reports</LegalH3>
        <LegalP>
          CapyResume is an open-source project, so the issue tracker is the honest place to reach
          the people who make it. Privacy questions, inaccuracies on this page and security reports
          are all welcome there. The full policy history is visible in the repository.
        </LegalP>
      </LegalSection>
    </LegalPage>
  );
}
