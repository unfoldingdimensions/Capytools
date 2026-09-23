# How open-source tools monetise themselves

Research notes, 2026-09-23. Scope: how open-source and source-available software actually
makes money, filtered against CapyResume's constraints (static client-only bundle, no
server, no account, no telemetry, Apache-2.0, consumer audience, solo maintainer).

Method: five parallel research passes (open core; client-side paid tiers; donations and
foundations; licence changes and forks; résumé/CV comparables), each required to attach a
verbatim quote and a URL to every claim. Quotes marked **✓ first-hand** I fetched and read
myself in this session; the rest come from the research passes and carry their URLs so you
can check them. Figures are as published on the dates given, not as remembered.

---

## 1. The models, and which ones are even reachable from here

| #   | Model                                    | Who does it                                                                                                                                   | What the buyer gets                         | Needs a server? | Available to CapyResume                     |
| --- | ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- | --------------- | ------------------------------------------- |
| 1   | **Open core** (feature/edition split)    | GitLab (MIT core + EE), MongoDB (SSPL, "not all of the features"), PostHog (`ee/`), Metabase (AGPL + EE), n8n (`.ee.`), Cal.com until 2026-04 | features withheld from the free edition     | no              | yes, but see §3(e)                          |
| 2   | **Delayed open source / Fair Source**    | Sentry (FSL → Apache/MIT after 2 years), Fair Source umbrella                                                                                 | the same complete software, two years early | no              | yes — but not OSI-approved                  |
| 3   | **Copyleft core + hosted/support**       | Grafana (AGPL, Cloud), Nextcloud (AGPL, support subs from 71.29€/user/yr), Supabase (Apache-2.0, hosted capacity $25/mo)                      | hosting, support, capacity                  | **yes**         | no                                          |
| 4   | **Dual licensing** (sell an exception)   | Sidekiq's first attempt; n8n's internal-use-only licence                                                                                      | legal permission                            | no              | technically yes; the evidence says it fails |
| 5   | **Paid client-side entitlement**         | tldraw (production gating), Sublime Text (honour system, $99), Obsidian (commercial licence, optional), Tailwind Plus ($299/$979 one-time)    | a key, or content                           | no              | **yes**                                     |
| 6   | **Donations / sponsorship / foundation** | Blender, Krita, Godot, Vue, curl, core-js                                                                                                     | recognition, capacity                       | no              | yes, and the numbers are in §2              |
| 7   | **Ads + one-time premium**               | Photopea                                                                                                                                      | removing ads for a fixed block of days      | no              | no (privacy claim)                          |
| 8   | **Enterprise integrations**              | draw.io (free Apache-2.0 app, paid Atlassian apps at $1.95/user/mo), Stirling-PDF (open core, Team $99/mo)                                    | per-seat team tooling                       | no              | no team surface                             |
| 9   | **Corporate reciprocity**                | Open Source Pledge: minimum $2,000 per developer per year, 35 member companies, $7,272,539 paid since launch                                  | goodwill                                    | no              | requires a company to notice you [35]       |

The structural point: **every model that reliably produces real money sells operation**
— hosting, capacity, support, per-seat team tooling [3][8]. CapyResume's no-server promise
removes that entire column. What remains is selling _artefacts_ (models 1, 2, 5) or asking
for gratitude (6).

## 2. Direct comparables: what open-source résumé builders actually earn

Reactive Resume — MIT, ~39k stars, the nearest peer — states "Free forever and open source.
No ads, paywalls, or tracking", and its `/pricing` returns 404: there is no paid tier [1].
Its hosted instance is funded by donations, and the reality of that is published: **€33 per
month raised against a €100/month goal**, with two GitHub sponsors [2]. OpenResume
(AGPL-3.0) and JSON Resume (400+ community themes) are likewise free with no monetisation
[3][4].

So the honest benchmark for "an open-source résumé builder that is free and asks nicely" is
**around thirty euros a month**, from a project with an order of magnitude more traffic than
CapyResume has today.

The commercial incumbents run the opposite playbook — cheap trials that auto-convert into
subscriptions: resume.io `$2.95 / 7 days → $29.95 every 4 weeks` with the free plan limited
to TXT downloads [6]; Zety `$1.95 / 14 days → $25.95 every 4 weeks`, or `$5.95/month` billed
`$71.40` yearly, free package TXT-only [8]; Enhancv's "free" plan is valid for 7 days [10];
FlowCV is the outlier with a genuinely free tier and `$5/month` billed yearly [5]. The
reputational bill is visible: Zety carries 12,764 Trustpilot reviews with 14% one-star, and
"Cancellation" is a top negative topic for resume.io, including September 2026 reviews about
repeated recurring charges [9].

Two findings from that set matter most. First, **resume.io itself sells non-renewing
one-time payments** "in certain countries" for people who want to download and leave —
"not a subscription and do not auto renew" [7]. Even the subscription-first incumbents
concede that this demand is one-off. Second, conversion expectations: median free-to-paid
conversion for consumer freemium apps is ~2.1–2.2%, against ~10.7–12.1% for hard paywalls
[11]; an older survey of 92 downloadable-software vendors found 0.99% sales-to-visits and
4.5% sales-to-downloads. Paid shares of a free user base are fractions of a percent
everywhere in this research.

## 3. The five findings that decide the shape

**(a) Selling permission fails; selling capability works.** Same author, same product, same
audience, two models tested in sequence: charging $50 for a _different licence_ to the same
Sidekiq software produced "33 for $1,650" in nine months; switching to paid-only extra
features produced ~140 sales and $70,000 in the following year [19][20]. Obsidian ran the
same experiment in reverse in Feb 2025 — it _removed_ the requirement to buy a commercial
licence ("Anyone can use Obsidian for work, for free") while keeping paid Sync, Publish,
Catalyst and the now-optional $50/user/yr licence [15][16].

**(b) Donations are not a plan at this class.** Blender shows the ceiling: $327,550/month
from 7,684 individuals and 46 corporate members, FY2024 income of €3,106,361, and — the
detail that matters — paying a corporate tier of €6k–240k/year buys only recognition, with
a published policy that donors "contribute... without acquiring decision-making power"
[27][28][29]. Krita funds four full-time developers from $2,871/month and 245 individual
donors, telling donors their reward is a great application [30][31]. Godot ended 2024 at
€49,678/month but is at €35,694/month now with more members [the live counter]. And the
floor: core-js, with roughly 9 billion npm downloads, drew $57/month when it asked, against
the ~$2,500/month needed, and its largest single donor was another open-source project
[34]. Sentry's own giving — $270,000 minimum against "more than $100mm in recurring
revenue" — is the same lesson from the other side: at this scale, the money in open source
is made by _selling something_, and given away as a rounding error [47]. Platform-level
giving is large in aggregate and thin per project: more than $100 million through GitHub
Sponsors since 2019, spread across thousands of maintainers [36].

**(c) A subscription fits this need badly.** The need is episodic: you build a résumé while
hunting, then stop for years. The incumbents monetise that with trials billed every four
weeks — 13 charges a year — and absorb the cancellation complaints as a cost of business
[6][8][9]. One-time/lifetime plan share is rising (6.4% → 10.3%, 2023–2025), and the
standard vendor guidance is that a product used sporadically may be better served by a
one-time purchase [11]. Photopea is the proof at the small end: a one-off-use creative tool
selling ad-free access in fixed day blocks, explicitly refusing donations and auto-renewal
[the founder's stated model].

(**d) A client-side gate is viable — but not with an OSI licence on the same code.**
tldraw ships exactly the mechanism proposed in the paid-tier plan: keys "validated on the
client. They can be public: you can safely include them in your frontend code", decoded and
verified "locally without making network requests to a license server", with the SDK
permitted "only in development" until a valid key is supplied and licence terms forbidding
users to "disable, change, or interfere with the Software's License Key enforcement"
[12][13][14] (**✓ first-hand**: I fetched the page and the raw `LICENSE.md` myself — §4 has
the full mechanics). That works because tldraw is selling to businesses under a proprietary
licence. Sublime Text is the honour-system version: $99
one-off, unlimited evaluation, and — the detail worth copying — it still phones home for
revocation, which its own forum documents as a contested tradeoff taken knowingly
[17][18]. Obsidian's FAQ and the Insomnia 8.0 reversal (accounts and cloud forced on a
local-first tool, walked back within weeks) both point the same way: **friction that
touches a user's trust costs more than the piracy it prevents** [16][26].

**(e) Never touch the code grant.** Every project that removed the OSI-approved option from
future releases had a funded rival within 8–15 days [37][38][40]. HashiCorp's BUSL move
produced OpenTofu (Linux Foundation, 41 days from fork to acceptance); Redis's dual
RSALv2/SSPL licence produced Valkey within eight days, backed by AWS, Google Cloud, Oracle,
Ericsson and Snap [39].
Grafana tightened from Apache-2.0 to **AGPLv3** — still OSI-approved — and got no fork of
consequence [43]. Elastic went to SSPL, lost the fight, and returned to AGPL in 2024 with
its own CTO explaining that the fork had made the restriction unnecessary [42]; Redis added
AGPLv3 back within 14 months [41]. Sentry's answer was to leave open source honestly rather
than pretend: Fair Source is defined as explicitly _not_ open source, with the Functional
Source License converting to Apache/MIT after two years, and Sentry's position that open
core "is not permissive enough... some product features are never open" [44][46]. The
criticism CapyResume would attract if it gates features is on the record from the people
who invented the alternatives: "'Open core' means proprietary software" [45].

## 4. Two mechanisms in detail

Both re-read first-hand from the vendors' own pages on 2026-09-23, because the paid-tier plan
borrows from both.

### tldraw: a client-side key that genuinely gates — and why it can

The mechanism as documented [12][13]:

- The default licence permits use **"only in development"**; production needs a key — trial
  (free, 100 days, one per commercial unit), commercial ("value-based pricing", sold through
  sales [48]), or hobby (non-commercial).
- Keys are **"validated on the client... They can be public: you can safely include them in
  your frontend code"**, and the SDK "decodes and verifies the key's signature locally
  without making network requests to a license server" [13].
- Each key encodes **the allowed hosts, the licence type and the expiration date**; the SDK
  checks the current hostname against the embedded domain list [13].
- Without a valid key: console errors, then **"after five seconds, stops rendering the
  editor"** [13]. A loud, visible failure — not a nag.
- Perpetual licences "don't have a time-based expiration. Instead, they're tied to a
  version": every patch release forever, but major/minor releases published after the
  licence's expiration date (plus a 30-day grace period) require renewal [13]. Annual
  licences get the same 30-day grace; trials get none [13].
- Telemetry is asymmetric and disclosed: **trial and hobby keys ping tldraw's servers** with
  licence ID, type, SDK version, build environment and deployment URL; **commercial keys
  send nothing**; nothing is sent from development [13].
- Where enforcement cannot be technical it is contractual: the licence forbids users to
  "disable, change, or interfere with the Software's License Key enforcement" [14].
- And the human note: "Please do not abuse trial licenses and tell your friends not to,
  either" [12].

**Why it works, and why it would not transfer.** Three things give that gate teeth, none of
them cryptographic: the buyer is a company whose procurement process wants a licence on
file, so the key is a compliance artefact as much as a technical one; the gated thing is the
only route to shipping a product, so the alternative to paying is not shipping; and the
licence is proprietary, so deleting the check breaches terms with a named counterparty
rather than exercising a software freedom [13][14]. A job-seeker has no procurement, no
audit and no counterparty, and forking is four minutes' work. **The mechanism transplants —
it is thirty lines we already planned — but the incentive that collects the money does
not.**

### Obsidian: a proprietary free app funded by optional services

The correction that matters most: Obsidian is **not open source**. It is closed-source
freeware funded by services, which puts it in the hosted/support row (§1, row 3), not in the
donation or licence-gate rows.

What it sells, from its pricing page today [15]: Sync at **$4 per user per month billed
annually** ($5 monthly), Publish at **$8 per site per month billed annually** ($10 monthly),
a **Catalyst** licence at $25, and a Commercial licence at $50. Sync is secured with
"AES‑256 end-to-end encryption, preventing us from reading it" [50]. Refunds are "full...
within 7 days of purchase with no questions asked for Obsidian Sync and Publish", while
"Catalyst licenses, Commercial licenses, and Obsidian Credit are non-refundable" [15];
students, faculty and nonprofits get 40% off [15].

The February 2025 change (§3(a)) made the commercial licence optional, with the reasoning
stated plainly: "Why make this change? Simplicity. The Commercial license terms were
confusing and added unnecessary complexity to our pricing" — and, more pointedly, "Nothing
else is changing. No account required, no ads, no tracking, no strings attached. Your data
remains fully in your control... All features are available to you for free without limits"
[16]. The company describes itself as **"100% supported by our users, not investors"** [49],
and Catalyst exists to keep it "free from investor influence that could compromise" that
independence [15].

**Why it works, and what it costs them.** Obsidian sells the one thing a local-first app can
sell without touching trust — a service they run, encrypted so they cannot read it — while
never gating the app and never requiring an account. The price of that position is that the
revenue is not licence revenue at all: it is subscription revenue from services, which means
running servers and support indefinitely. **Take away the servers and Obsidian has no
business.**

### The two ends side by side

|                           | tldraw                                     | Obsidian                                  |
| ------------------------- | ------------------------------------------ | ----------------------------------------- |
| What is paid for          | the core use itself (production)           | services adjacent to the core use         |
| Who pays                  | companies shipping a product               | organisations and sync users, voluntarily |
| Enforcement               | client-side key + a ban on tampering       | none; the licence is explicitly optional  |
| If you do not pay         | editor stops rendering after five seconds  | nothing — the app stays fully usable      |
| What actually moves money | procurement and compliance, no alternative | convenience, encryption, goodwill         |
| Available to CapyResume   | the code, not the incentive                | **no** — the money is the servers         |

The lesson sits exactly between them. Gate **the core use** and the incentive must come from
somewhere CapyResume does not have; sell **a service** and the money requires a server it has
promised not to build. What remains is the shape already in the plan: a small, honest
artefact purchase, priced like Sublime Text and Tailwind Plus rather than sold like tldraw's
sales pipeline.

## 5. What that leaves, scored against our constraints

| Option                                              | Evidence                                                                        | Revenue expectation                          | Cost                                                 | Verdict                  |
| --------------------------------------------------- | ------------------------------------------------------------------------------- | -------------------------------------------- | ---------------------------------------------------- | ------------------------ |
| **A. Free forever + donations**                     | peers: €33/mo [2]; Krita $2,871/mo [30]                                         | ~€30/mo at our scale                         | none                                                 | truthful, but not income |
| **B. Free core + one-time paid packs, offline key** | Sidekiq [19][20]; Obsidian [15][16]; Sublime [17]; Tailwind Plus [25]; Photopea | low single-digit % of engaged users × $19–29 | mild "open core" criticism [45]                      | **best fit**             |
| **C. Ads + one-time premium**                       | Photopea (~90% of ~$1M from ads, 2021)                                          | the highest of any model here                | kills "no tracking"                                  | excluded by the product  |
| **D. Subscription**                                 | incumbents [6][8][9][10]                                                        | highest ARPU                                 | cancellation backlash; wrong shape for episodic need | excluded                 |
| **E. Relicence (BUSL/FSL/Fair Core)**               | forks within 8–15 days [37][40]; FSL/Fair Source [44][46]                       | protection against a hosted rival            | forks, trust, and no rival to protect against        | excluded                 |
| **F. Hosted tier / support**                        | Supabase, Grafana, Nextcloud, Stirling, draw.io                                 | real money                                   | breaks the no-server promise                         | excluded                 |
| **G. Team/enterprise tier**                         | Stirling $99/mo per 100 users; draw.io $1.95/user/mo                            | needs a team buyer                           | no team surface in a job-seeker tool                 | not now                  |

## 6. Recommendation

1. **Keep Apache-2.0 and keep the free tier complete** — permanently. The free tier being a
   whole product, not a crippled one, is what makes any future "that's just open core"
   criticism survivable, and §3(e) is unambiguous about what relicensing costs.
2. **Sell capability, never permission** (§3(a)). Cover letters, saved versions, bulk
   tailor. Nothing that is free today becomes paid.
3. **One-time price, no subscription** (§3(c)), in the observed band — below Sublime's $99
   one-off [17] and Tailwind Plus's $299 [25], and aimed at a single job hunt rather than a
   monthly habit.
4. **Offline signed key, fail-open, no revocation** (§3(d)). Note that this is off the
   beaten path: the merchant-of-record licence features (Polar, Lemon Squeezy) validate
   server-side by default, and the only vendor with substantive offline-key guidance advises
   against fail-closed checks [21][22][24]. A signed key is also immutable — expiry and
   entitlements cannot be changed after issuance without minting a new one — which is
   exactly why the paid-tier plan caps a leaked key at the packs that existed when it was
   issued rather than pretending it can be revoked [23].
5. **Add a plain sponsor link** as a supplement, not a strategy — the peers show it works at
   small scale, and it costs nothing [2][32][33].
6. **Set expectations from the data, not from hope.** Freemium conversion medians are
   ~2% [11]; the peer project with 39k stars raises €33/month [2]. Treat the paid tier as
   validation and a signal, not as income, until the free tier has real traffic.
7. **Re-open the question only if the constraints change**: a hosted copy (F), or a
   recruiter/team surface (G), are the two developments that would make the excluded models
   available.

## 7. What this research does not establish

- No first-party revenue or conversion data exists for free browser-only résumé builders.
  The conversion benchmarks are mobile-app datasets [11] and a 2009 survey of downloadable
  software; they may not transfer to a desktop-web, no-account tool.
- Incumbent live pricing pages blocked automated fetching; resume.io and Zety figures come
  from Wayback snapshots dated 2026-08-12 and 2026-08-13 and may have moved [6][8].
- Blender's live fund widget prints "$" with no currency code while its accounts are in EUR,
  and its FY2024 report's claim that "more than half of the Foundation income now comes from
  individual donations" is inconsistent with its own income table (individuals 20% versus
  corporate/patron 49%). Recorded as-is, unresolved [27][29].
- Sentry's open-source-to-revenue ratio (~0.27%) is arithmetic on their published inputs,
  not a figure Sentry states.
- Several quotes rest on one intermediary reading the page, not on independent
  corroboration. Where a number carried a decision, it is marked **✓ first-hand**; the rest
  are cited to the page so they can be re-checked.
- Nothing here is tax or legal advice. The merchant-of-record fee comparison (5% + 50¢
  ranges, non-US payout surcharges, international-card fees) sits in the paid-tier plan, not
  in this document.

## Sources

[1] https://rxresu.me
[2] https://opencollective.com/reactive-resume
[3] https://www.open-resume.com
[4] https://jsonresume.org/themes
[5] https://flowcv.com/pricing
[6] https://web.archive.org/web/20260812065300/https://resume.io/pricing
[7] https://help.resume.io/en/articles/3785664-how-does-billing-work
[8] https://web.archive.org/web/20260813152326/https://zety.com/pricing
[9] https://trustpilot.com/review/resume.io?stars=1
[10] https://enhancv.com/pricing
[11] https://www.revenuecat.com/blog/growth/subscription-app-trends-benchmarks-2026
[12] https://tldraw.dev/community/license
[13] https://tldraw.dev/sdk-features/license-key
[14] https://raw.githubusercontent.com/tldraw/tldraw/main/LICENSE.md
[15] https://obsidian.md/pricing
[16] https://obsidian.md/blog/free-for-work
[17] https://www.sublimetext.com/buy
[18] https://forum.sublimetext.com/t/sublime-text-calling-home-to-license-sublimehq-com-on-every-start/33474
[19] https://www.mikeperham.com/2013/10/01/how-to-make-100k-in-oss-by-working-hard
[20] https://www.mikeperham.com/2014/10/01/the-path-to-full-time-open-source
[21] https://polar.sh/docs/features/benefits/license-keys
[22] https://docs.lemonsqueezy.com/guides/tutorials/license-keys
[23] https://keygen.sh/blog/announcing-cryptographic-license-files
[24] https://keygen.sh/docs/validating-licenses
[25] https://tailwindcss.com/plus
[26] https://konghq.com/blog/product-releases/insomnia-8-3
[27] https://fund.blender.org
[28] https://fund.blender.org/funding-policy
[29] https://www.blender.org/foundation
[30] https://fund.krita.org
[31] https://krita.org/en/donations
[32] https://opencollective.com/curl
[33] https://daniel.haxx.se/blog/2025/07/13/how-i-do-it
[34] https://raw.githubusercontent.com/zloirock/core-js/master/docs/2023-02-14-so-whats-next.md
[35] https://opensourcepledge.com/members
[36] https://github.blog/open-source/maintainers/100-million-for-open-source-a-milestone-built-by-the-community
[37] https://web.archive.org/web/20250304013523/https://www.hashicorp.com/en/blog/hashicorp-adopts-business-source-license
[38] https://opentofu.org/manifesto
[39] https://redis.io/blog/redis-adopts-dual-source-available-licensing
[40] https://www.linuxfoundation.org/press/linux-foundation-launches-open-source-valkey-community
[41] https://redis.io/blog/redis-8-ga
[42] https://www.elastic.co/blog/elasticsearch-is-open-source-again
[43] https://grafana.com/blog/2021/04/20/grafana-loki-tempo-relicensing-to-agplv3
[44] https://fair.io/about
[45] https://writing.kemitchell.com/2019/09/25/Open-Core-Stories
[46] https://blog.sentry.io/sentry-is-now-fair-source
[47] https://blog.sentry.io/join-the-pledge
[48] https://tldraw.dev/pricing
[49] https://obsidian.md/about
[50] https://obsidian.md/sync
