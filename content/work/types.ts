/**
 * The case-study template. CLAUDE.md §6.3.
 *
 * Fixed shape, so the reader learns it once and can then skim all three the
 * same way. The compiler enforces it: a case study missing `whatIdChangeNow`
 * does not build, which is deliberate — that section is the one that separates
 * a senior account of a project from a brochure.
 */

export interface DiagramNode {
  readonly id: string;
  readonly label: string;
  readonly sublabel?: string;
  /** Percentage coordinates within the diagram viewBox. */
  readonly x: number;
  readonly y: number;
  readonly kind: "client" | "service" | "store" | "external" | "ledger";
}

export interface DiagramEdge {
  readonly from: string;
  readonly to: string;
  readonly label?: string;
  /** Curve the path upward (negative) or downward (positive). */
  readonly bow?: number;
}

export interface DiagramStep {
  readonly title: string;
  readonly body: string;
  /** Nodes and edges lit at this step. */
  readonly nodes: readonly string[];
  readonly edges: readonly string[];
}

export interface Architecture {
  readonly caption: string;
  readonly nodes: readonly DiagramNode[];
  readonly edges: readonly DiagramEdge[];
  readonly steps: readonly DiagramStep[];
}

export interface OutcomeFigure {
  /** Id in content/metrics.ts, so provenance stays in one place. */
  readonly metricId?: string;
  readonly label: string;
  readonly value: string;
  readonly source: string;
}

export interface CaseStudy {
  readonly slug: string;
  readonly title: string;
  readonly company: string;
  readonly period: string;
  readonly role: string;
  /** One line. Used on the landing card. */
  readonly problem: string;
  /** Exactly what it says: two sentences. */
  readonly context: readonly [string, string];
  readonly constraint: {
    readonly heading: string;
    readonly body: readonly string[];
  };
  readonly architecture: Architecture;
  readonly decision: {
    readonly heading: string;
    readonly chose: string;
    readonly rejected: string;
    readonly why: readonly string[];
  };
  readonly outcome: readonly OutcomeFigure[];
  readonly stack: readonly string[];
  /** Mandatory. CLAUDE.md §6.3. */
  readonly whatIdChangeNow: readonly string[];
  /** The single hard number on the landing card. */
  readonly headlineFigure: { readonly value: string; readonly label: string };
}
