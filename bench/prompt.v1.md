Build a single self-contained HTML file: a living simulation of a capybara hot spring (onsen) on an autumn evening. It runs on its own — there is no game and no win state — and a person watching for one minute should be able to understand every capybara's life.

**Output format**

- One file, delivered as one ```html fenced code block. Nothing else in your reply.
- Everything inline: HTML, CSS and JS in that one file. No external requests of any kind — no CDN, no libraries, no web fonts, no images, no `fetch`. Assume the file is opened from disk with no network available.
- Runs in current Chrome with no build step and no console errors.

**Stage**

- Fixed logical stage of 960×600, scaled to fit the viewport and centred, with the leftover space letterboxed. No scrollbars at any window size.
- A side-on cutaway: sky and mountain backdrop; a stone-rimmed pool of hot water filling roughly the lower-left two thirds; a walkable bank of rock and grass around it; and at least three solid obstacles on that bank — boulders, a stone lantern, a fence post — that nothing may pass through.
- The water is a real region, not a painted rectangle: a capybara in it sits lower, is distorted below the waterline, and pushes ripples as it moves.

**Residents**

- Ten capybaras, drawn procedurally in code. No sprites, no emoji, no image data. Seen side-on they must read unmistakably as capybaras: blunt barrel body, square muzzle, small rounded ears, short legs, no visible tail. Vary size, coat tone, and give each one a piece of individuality — a yuzu balanced on the head, a scar, a darker muzzle.
- Each is animated: a walk cycle whose stride matches its actual ground speed (no sliding feet), blinking, ear flicks, and a slow breathing bob while soaking.

**Simulation**

- Every capybara has three needs that decay continuously and can be inspected: **warmth**, **hunger**, **company**.
- Every capybara runs a real state machine with at least `idle`, `walking`, `queueing`, `soaking`, `eating`, `socialising`, `sleeping`. It chooses its next state from its most urgent need — never at random.
- **The pool has exactly four soaking spots.** When all four are taken, later arrivals queue on the bank in a visible orderly line and take a spot as one frees. No two capybaras may ever hold the same spot, and none may soak without holding one.
- Capybaras path around obstacles and around each other. They never clip through anything, never overlap, never jitter in place, and never get permanently stuck.
- A feeding trough sits on the bank; hungry capybaras travel to it and eat there.
- Socialising requires two capybaras to be near each other and facing each other.
- A full day passes in sixty real seconds: sky, water colour and lighting move through dusk → night → dawn, stars come out, and the stone lantern lights at night. Most capybaras sleep on the bank at night — night behaviour must visibly differ from day behaviour.
- **Once per day, at dusk, a scheduled event: a crate of yuzu tips into the pool.** The fruit floats, bobs and drifts on the water, capybaras converge on it, and warmth rises faster for anyone soaking among yuzu.

**Interaction** — exactly these three, nothing more

- Click a capybara: an inspector panel shows its name, current state, current target, and its three needs as live bars. Click elsewhere to dismiss.
- Click the water: drop one yuzu at that point.
- A speed control: 1× / 4× / pause.

**Determinism and performance**

- Seeded PRNG. Read the seed from `?seed=` in the URL, defaulting to `capybara`. No `Math.random()` and no wall-clock time anywhere in simulation logic — the same seed must produce the same run every time. Show the seed in a corner.
- Hold 60fps with all ten capybaras active, and run five minutes without slowing down or leaking memory.
- Use a fixed simulation timestep decoupled from rendering, so 4× speed and a dropped frame don't change the outcome.

**Craft**

- Calm, warm, hand-made feel. Autumn palette, steam drifting off the water, soft ambient particles. No neon, no default blue, no browser-default UI widgets.
- All type uses a system font stack. HUD text small and out of the way.

Do not ask questions, do not explain your work, do not stop early. Ship the whole file.
