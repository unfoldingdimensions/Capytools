/**
 * Minimal ambient types for css-tree 3.2.1, which ships none (plan §7b.7
 * allows a local .d.ts). Only the surface the Extract parser uses: parse
 * with positions and custom-property values, plus a plain-object AST that
 * the parser walks by hand — no List/lexer/generator API is typed here.
 */
declare module "css-tree" {
  export interface CssNode {
    type: string;
    /** Function/Identifier/Atrule name. */
    name?: string;
    /** Declaration property, including custom properties ("--brand"). */
    property?: string;
    /** Declaration value node or raw string; a Hash node's hex digits. */
    value?: CssNode | string;
    /** Sub-nodes; a css-tree List at runtime, forEach is all we need. */
    children?: { forEach(cb: (node: CssNode) => void): void };
    /** Present when parse() ran with positions: true. */
    loc?: { start: { offset: number }; end: { offset: number } } | null;
    [key: string]: unknown;
  }

  export interface ParseOptions {
    context?: string;
    positions?: boolean;
    parseValue?: boolean;
    parseCustomProperty?: boolean;
  }

  export function parse(source: string, options?: ParseOptions): CssNode;
}
