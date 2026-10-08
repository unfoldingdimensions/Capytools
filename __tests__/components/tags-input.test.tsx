import { act, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { TagsInput } from '@/components/tool/CapyResume';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/** Mirrors the real wiring: the parent stores only the parsed tags. */
function Harness({ onSaved }: { onSaved: (tags: string[]) => void }) {
  const [tags, setTags] = useState<string[]>(['Python']);
  return (
    <TagsInput
      name="t"
      label="skills"
      tags={tags}
      onTags={(raw) => {
        const parsed = raw
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean);
        setTags(parsed);
        onSaved(parsed);
      }}
    />
  );
}

function type(input: HTMLInputElement, value: string) {
  // React tracks the value through the prototype setter; assigning `input.value`
  // directly would be swallowed as "no change".
  const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.bind(
    input
  );
  act(() => {
    setValue(value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

describe('TagsInput', () => {
  it('keeps a typed comma and space so a second, two-word tag can be typed', () => {
    const host = document.createElement('div');
    document.body.append(host);
    const saved: string[][] = [];
    act(() => createRoot(host).render(<Harness onSaved={(t) => saved.push(t)} />));
    const input = host.querySelector('input')!;

    act(() => input.focus());
    for (const value of [
      'Python,',
      'Python, ',
      'Python, Data',
      'Python, Data ',
      'Python, Data analysis',
    ]) {
      type(input, value);
      // The raw draft survives the re-render; the old controlled value erased it.
      expect(input.value).toBe(value);
    }
    expect(saved.at(-1)).toEqual(['Python', 'Data analysis']);

    act(() => input.blur());
    expect(input.value).toBe('Python, Data analysis');
  });
});
