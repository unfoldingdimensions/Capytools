# Security Policy

## The shape of this project

CapyResume is a static, client-side application. There is no server, no account, no
database and no telemetry: the résumé lives in the browser's `localStorage` and the
exported file is produced in the tab. That removes most of the classic attack surface and
creates a specific one — anything that makes data leave the browser, or that turns someone's
own content into something executable inside a file they send to an employer.

## Reporting a vulnerability

Use GitHub's private reporting form — **Security → Report a vulnerability** on
<https://github.com/unfoldingdimensions/CapyResume>, or directly:

<https://github.com/unfoldingdimensions/CapyResume/security/advisories/new>

Please do not open a public issue for a security problem, and please do not include real
résumé data: a minimal fake document reproduces almost anything here.

Include what you did, what happened, what you expected, the browser and version, and a proof
of concept if you have one. Reports found by reading the code are welcome — this is a small
codebase and the interesting bugs are escaping bugs.

## In scope

- **Anything that makes data leave the browser**: a request to a third party from the editor
  path, a runtime asset or font fetch that carries state, a leak of `localStorage` contents,
  a service worker caching more than it should.
- **Injection through user content**: a field value that executes in the preview or in a
  template, or that lands unescaped in an exported PDF, DOCX or JSON — including through
  the XML structures in the DOCX writer or the PDF text layer.
- **A malicious or malformed import**: crafted JSON that makes the app hang, crash, or write
  outside the expected storage key.
- **The licence path**, once it exists: a key that grants more than it claims, or a licence
  record that would cause any network call.
- **Reachable dependency vulnerabilities**: a known CVE in a package whose affected path
  this app actually exercises.

## Out of scope

- Editing your own copy of the bundle, devtools changes, or a fork with the licence check
  removed. The source is Apache-2.0 and is shipped to the browser by design; a fork that
  behaves differently is not a vulnerability in this project.
- Anyone with access to an unlocked device reading the screen or the browser's storage.
- The AI provider you choose in the BYOK panel: what it does with what you send it is
  between you and its terms. How _our_ client sends it is in scope; the provider's handling
  is not.
- Phishing, social engineering, spam, or volumetric attacks against a static host.
- Missing security headers on a deployment you run yourself. `next.config.ts` sets CSP,
  `X-Frame-Options`, `Referrer-Policy` and `Permissions-Policy`, and a self-hoster can
  change all of them.

## What to expect

Solo maintainer, best effort, no bug bounty — there is no revenue in this project yet.
Acknowledgement within about a week, an assessment shortly after, and either a fix or a
reasoned "won't fix" with the reasoning published. Credit in the advisory if you want it,
and genuine thanks either way.

## Supported versions

The build deployed from `main`. There are no maintained release branches: fixes land on
`main` and deploy from there.
