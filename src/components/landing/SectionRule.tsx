/**
 * The roman-numeral hairline that opens every editorial section. The export
 * also carried a "00N / 008" pagination counter; editorial-lite drops it, so
 * the empty third cell keeps the meta group sitting where it did.
 */

export function SectionRule({
  roman,
  meta,
}: {
  roman: string;
  meta: readonly string[];
}) {
  return (
    <div className="lp-sec-rule">
      <span className="lp-roman">{roman}</span>
      <span className="lp-meta-grp">
        {meta.map((m) => (
          <span key={m}>{m}</span>
        ))}
      </span>
      <span aria-hidden="true" />
    </div>
  );
}
