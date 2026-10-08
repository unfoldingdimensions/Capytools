import type { CSSProperties } from 'react';
import type { DocBlock } from '@/lib/capyresume/document';
import type { TemplateSpec } from '@/lib/capyresume/templates';

/**
 * The preview paper's style, derived from the spec so the editor cannot drift
 * from what lib/capyresume/pdf.tsx renders.
 */
export function previewPaperStyle(spec: TemplateSpec): CSSProperties {
  return {
    color: spec.accent,
    fontFamily: spec.fontFamily,
    fontSize: `${spec.fontSize}pt`,
    lineHeight: spec.lineHeight,
  };
}

/**
 * One composed block, rendered as HTML for the live preview. Every value below
 * mirrors the matching entry in pdf.tsx's `buildStyles`: what you see in the
 * editor is meant to agree with the exported file, and this component is where
 * that agreement is kept.
 */
export function BlockView({ block, spec }: { block: DocBlock; spec: TemplateSpec }) {
  switch (block.kind) {
    case 'header':
      // pdf.tsx wraps the header in entryBlock.
      return (
        <div style={{ marginBottom: `${spec.entryGap}pt` }}>
          {block.name ? (
            <div
              style={{
                fontSize: `${spec.fontSize + 7}pt`,
                fontWeight: 700,
                marginBottom: '5pt',
              }}
            >
              {block.name}
            </div>
          ) : null}
          {block.contact.map((line, i) => (
            <div
              key={`c${i}`}
              style={{ fontSize: `${spec.fontSize - 0.5}pt`, marginBottom: '1pt' }}
            >
              {line}
            </div>
          ))}
          {block.links.map((line, i) => (
            <div
              key={`l${i}`}
              style={{ fontSize: `${spec.fontSize - 0.5}pt`, marginBottom: '1pt' }}
            >
              {line}
            </div>
          ))}
        </div>
      );
    case 'heading':
      return (
        <div
          style={{
            marginTop: `${spec.entryGap + 6}pt`,
            marginBottom: spec.headingRule ? '6pt' : '5pt',
            fontWeight: 700,
            fontSize: `${spec.fontSize + 1}pt`,
            borderBottom: spec.headingRule ? `0.75pt solid ${spec.accent}` : undefined,
            paddingBottom: spec.headingRule ? '2pt' : undefined,
          }}
        >
          {block.text}
        </div>
      );
    case 'entry':
      return (
        <div style={{ marginBottom: `${spec.entryGap}pt` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <strong>{block.title ?? ''}</strong>
            <span style={{ fontSize: `${spec.fontSize - 0.5}pt` }}>{block.range ?? ''}</span>
          </div>
          {block.meta ? (
            <div style={{ fontSize: `${spec.fontSize - 0.5}pt`, marginBottom: '2pt' }}>
              {block.meta}
            </div>
          ) : null}
        </div>
      );
    case 'paragraph':
      return <p style={{ marginBottom: '3pt' }}>{block.text}</p>;
    case 'bullet':
      // bulletRow / bulletGlyph / bulletText: the glyph column carries the width,
      // so the row itself needs no gap.
      return (
        <div style={{ display: 'flex', marginBottom: '1.5pt' }}>
          <span style={{ width: '12pt' }}>{spec.bulletChar}</span>
          <span style={{ flex: 1 }}>{block.text}</span>
        </div>
      );
    case 'tags':
      return <div style={{ marginBottom: '2pt' }}>{block.text}</div>;
    default:
      return null;
  }
}
