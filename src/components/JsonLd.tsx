/**
 * A JSON-LD block.
 *
 * This is the app's SECOND `dangerouslySetInnerHTML`, after the theme shim —
 * and, like that one, it is unavoidable: a `<script type="application/ld+json">`
 * carries text, not React children, and React would escape the braces if the
 * payload were rendered as a child.
 *
 * What makes it safe is that nothing user-supplied reaches it. Every value
 * comes from the registry at build time. The `<` escape is still there because
 * a single `</script>` appearing inside any string would close the tag early
 * and hand the rest of the document to the parser as markup — the one way a
 * JSON-LD block turns into an injection, and the reason `JSON.stringify` alone
 * is not enough.
 */
export function JsonLd({ data }: { data: object | null }) {
  if (!data) return null;

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
