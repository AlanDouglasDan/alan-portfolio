"use client";

import { Button } from "@/components/primitives/Button";

/**
 * Save as PDF via the browser's own print pipeline.
 *
 * Deliberately not a checked-in PDF: a static file drifts out of date the first
 * time a line of the resume changes, and a stale PDF in a recruiter's inbox is
 * worse than no PDF. The print stylesheet in globals.css lays the page out for
 * A4.
 */
export function PrintButton() {
  return (
    <Button
      variant="secondary"
      onClick={() => window.print()}
      className="print:hidden"
    >
      Save as PDF
    </Button>
  );
}
