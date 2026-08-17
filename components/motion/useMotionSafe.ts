"use client";

import { useReducedMotion } from "motion/react";

/**
 * The single gate for every animation in the project.
 *
 * CLAUDE.md §5.5 makes `prefers-reduced-motion` non-negotiable and asks for one
 * hook so it cannot be forgotten. Nothing else in the codebase should call
 * `useReducedMotion` directly — components ask this hook what they are allowed
 * to do, and it answers in the project's own terms.
 */

export const SPRING = {
  type: "spring",
  stiffness: 260,
  damping: 30,
  mass: 0.9,
} as const;

/** Value transfer moves a touch slower than UI chrome. CLAUDE.md §5.2. */
export const MONEY_SPRING = {
  type: "spring",
  stiffness: 150,
  damping: 26,
  mass: 1.2,
} as const;

export interface MotionSafe {
  /** False when the user has asked for reduced motion. */
  readonly enabled: boolean;
  /** Springs collapse to an instant transition. */
  readonly spring: typeof SPRING | { duration: number };
  readonly moneySpring: typeof MONEY_SPRING | { duration: number };
  /** Reduced motion means opacity only: no transform, ever. */
  transform<T extends Record<string, unknown>>(properties: T): T | Record<string, never>;
  /** Stagger, in seconds. Zero when reduced. */
  readonly stagger: number;
}

const INSTANT = { duration: 0 } as const;

export function useMotionSafe(): MotionSafe {
  const reduced = useReducedMotion();
  const enabled = !reduced;

  return {
    enabled,
    spring: enabled ? SPRING : INSTANT,
    moneySpring: enabled ? MONEY_SPRING : INSTANT,
    transform: (properties) => (enabled ? properties : {}),
    stagger: enabled ? 0.06 : 0,
  };
}
