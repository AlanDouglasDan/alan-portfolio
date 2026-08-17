/**
 * Public surface of the ledger domain module.
 *
 * Pure TypeScript, zero runtime dependencies, no clock and no I/O. Every
 * export below is a function of its arguments, which is why the whole thing is
 * testable with property tests and tree-shakes to nothing when unused.
 */

export * from "./types";
export * from "./money";
export * from "./signature";
export * from "./journal";
export * from "./idempotency";
export * from "./fx";
export * from "./reconcile";
export * from "./ledger";
export * from "./demo";
