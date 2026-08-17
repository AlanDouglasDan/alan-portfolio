"use client";

import { LazyMotion } from "motion/react";
import type { ReactNode } from "react";

/**
 * Loaded after hydration rather than imported at the top of the module, so the
 * feature bundle is a separate chunk the browser fetches once the page is
 * already interactive instead of part of first-load JS on every route.
 */
const loadFeatures = async () => (await import("motion/react")).domAnimation;

/**
 * Motion's feature set, loaded once and deliberately narrow.
 *
 * Importing the full `motion` component pulls every feature — drag, layout
 * projection, 3D — into the first-load bundle whether a page uses them or not.
 * This project animates transform, opacity and pathLength and nothing else
 * (CLAUDE.md §5.6), so `domAnimation` covers it at roughly a third of the
 * weight, and `strict` makes the saving permanent: using `motion.*` instead of
 * `m.*` anywhere in the tree throws rather than quietly reintroducing the full
 * bundle.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={loadFeatures} strict>
      {children}
    </LazyMotion>
  );
}
