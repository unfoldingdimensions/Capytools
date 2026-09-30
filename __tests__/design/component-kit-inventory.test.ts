import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

/**
 * The component kit has two halves, and until this test existed nothing said which
 * was which.
 *
 * `components/ui/` holds primitives the app imports today *and* a coherent kit the
 * editor does not use yet - dialogs, toasts, tooltips, the month picker, the score
 * ring. The second half is deliberate, reserved for editor work that has been
 * planned but not built, so deleting it would throw away a designed surface. But
 * "reserved" and "forgotten" look identical in a file listing, and that is how it
 * sat: 14 files, ~916 lines, wired to each other and to nothing else.
 *
 * So the inventory is explicit here and the intent is written in DESIGN.md. This
 * test keeps the two honest:
 *
 * - A file that nothing imports must be *declared* reserved. Dropping a new
 *   component in and walking away fails here, naming the file.
 * - A declared-reserved file that something outside the kit now imports must be
 *   promoted out of the list. Wiring one up without updating the list fails too,
 *   so the list cannot quietly become a lie.
 *
 * It says nothing about *whether* a file should be reserved - that is a design
 * decision. It only forbids leaving the answer unstated.
 *
 * Detection is by **import path**, never by export name. Matching a name is the
 * obvious way to write this and it does not work: every reserved component's own
 * file mentions the name it exports, so a name check reports the whole kit as
 * "used" and both halves of the guard pass while testing nothing.
 */

const UI_DIR = path.join(process.cwd(), 'components', 'ui');
const SOURCE_ROOTS = ['app', 'components', 'lib', 'hooks', '__tests__'];

/**
 * Kit files the app does not import yet, reserved for the editor work described in
 * DESIGN.md. Keyed by path relative to `components/ui/`.
 */
const RESERVED: string[] = [
  'AlertDialog.tsx',
  'empty-state.tsx',
  'floating-label-input.tsx',
  'interactive-card.tsx',
  // Imported only by floating-label-input, which is itself reserved, so it is a
  // dependency of the reserved tree rather than a primitive the app uses.
  'label.tsx',
  'loading-states.tsx',
  'month-picker.tsx',
  'score-progress-ring.tsx',
  'toast.tsx',
  'tooltip.tsx',
];

/** Every `.tsx`/`.ts` file that could import a kit component. */
function sourceFiles(): string[] {
  const out: string[] = [];
  const walk = (dir: string): void => {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(ts|tsx)$/.test(entry.name)) out.push(full);
    }
  };
  for (const root of SOURCE_ROOTS) walk(path.join(process.cwd(), root));
  return out;
}

/** Kit files relative to components/ui, `modal/Modal.tsx` style. */
function kitFiles(): string[] {
  const out: string[] = [];
  const walk = (dir: string, prefix: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) walk(path.join(dir, entry.name), rel);
      else if (/\.tsx$/.test(entry.name)) out.push(rel);
    }
  };
  walk(UI_DIR, '');
  return out;
}

/**
 * Which kit files each source file imports, and which files live outside the kit.
 *
 * The kit's own files importing each other is not adoption. `label.tsx` is pulled
 * in by `floating-label-input.tsx`, and the three modal parts by `AlertDialog` and
 * `ConfirmDialog` - all of them reserved. Counting those as use would mark a file
 * "in use" because another unused file happens to use it, which is exactly the
 * invisibility this test exists to remove. Reachability is computed from the entry
 * points instead, so a chain that dead-ends inside the kit counts for nothing.
 */
function scanSource(): { deps: Map<string, string[]>; externalFiles: string[] } {
  const uiPrefix = path.join(process.cwd(), 'components', 'ui') + path.sep;
  const deps = new Map<string, string[]>();
  const externalFiles: string[] = [];

  for (const file of sourceFiles()) {
    const src = readFileSync(file, 'utf8');
    const specifiers = [...src.matchAll(/(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g)]
      .map((m) => m[1])
      .filter((s): s is string => typeof s === 'string');
    deps.set(file, specifiers);
    if (!file.startsWith(uiPrefix)) externalFiles.push(file);
  }
  return { deps, externalFiles };
}

/** The kit file a module specifier resolves to, if it points into components/ui. */
function resolvesToKitFile(spec: string): string | null {
  const normalised = spec.replace(/^@\//, '');
  const marker = 'components/ui/';
  const at = normalised.indexOf(marker);
  if (at === -1) return null;
  const tail = normalised.slice(at + marker.length);
  if (!tail) return null;
  return tail.endsWith('.tsx') ? tail : `${tail}.tsx`;
}

/** Kit files reachable from app entry points by following imports file to file. */
function reachableFromApp(deps: Map<string, string[]>, externalFiles: string[]): Set<string> {
  const reached = new Set<string>();
  const queue: string[] = [...externalFiles];
  const seen = new Set<string>();

  while (queue.length > 0) {
    const file = queue.pop()!;
    if (seen.has(file)) continue;
    seen.add(file);
    for (const spec of deps.get(file) ?? []) {
      const kitFile = resolvesToKitFile(spec);
      if (!kitFile) continue;
      reached.add(kitFile);
      queue.push(path.join(process.cwd(), 'components', 'ui', kitFile));
    }
  }
  return reached;
}

describe('component kit inventory', () => {
  const files = kitFiles();
  const { deps, externalFiles } = scanSource();
  const reachable = reachableFromApp(deps, externalFiles);
  const specifiers = [...deps.values()].flat();

  it('reads a realistic number of imports, so a silent matcher failure is visible', () => {
    // A guard that matches nothing passes everything. This is the canary: if the
    // import scan breaks, this fails before the assertions below start lying.
    expect(specifiers.length).toBeGreaterThan(100);
    expect(specifiers.some((s) => s.includes('components/ui/button'))).toBe(true);
    // And reachability must find real files, or every file would look reserved.
    expect(reachable.size).toBeGreaterThan(4);
  });

  it('declares every file in components/ui, so a new one cannot arrive unannounced', () => {
    const undeclared = files.filter((rel) => !RESERVED.includes(rel) && !reachable.has(rel));
    expect(undeclared).toEqual([]);
  });

  it('keeps the reserved list to files the app cannot reach', () => {
    const promoted = RESERVED.filter((rel) => reachable.has(rel));
    expect(promoted).toEqual([]);
  });

  it('lists only files that exist, so the inventory cannot drift', () => {
    const missing = RESERVED.filter((rel) => !files.includes(rel));
    expect(missing).toEqual([]);
  });

  it('does not list the same file twice', () => {
    expect(new Set(RESERVED).size).toBe(RESERVED.length);
  });
});
