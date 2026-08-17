/**
 * Tamper-evidence for the journal.
 *
 * Each entry hashes its own canonical content together with the hash of the
 * entry before it, so the journal is a hash chain: altering any byte of any
 * entry invalidates that entry and every entry after it. `verify()` in
 * journal.ts walks the chain and reports the first sequence number that fails.
 *
 * Two deliberate choices worth naming, because this file will be read:
 *
 * 1. SHA-256 is implemented here rather than imported. The domain module is
 *    required to be pure and dependency-free (CLAUDE.md §8) and to run
 *    synchronously in the browser, which rules out both `node:crypto` and the
 *    async `crypto.subtle`. The implementation below is FIPS 180-4 and is
 *    tested against the standard vectors in __tests__/signature.test.ts.
 *
 * 2. This is a *checksum chain*, not a signature. It proves the journal has not
 *    been edited in place; it does not prove authorship, because a client-side
 *    demo has nowhere to hide a key. In production the chain head is signed
 *    with an HMAC or KMS key held outside the application process, and that is
 *    the only part of this file that would change.
 */

const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1,
  0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
  0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
  0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
  0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
  0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
  0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
  0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
  0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

const INITIAL_STATE = new Uint32Array([
  0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c,
  0x1f83d9ab, 0x5be0cd19,
]);

function rotr(value: number, bits: number): number {
  return ((value >>> bits) | (value << (32 - bits))) >>> 0;
}

/** SHA-256 of a UTF-8 string, returned as lowercase hex. */
export function sha256(message: string): string {
  const input = new TextEncoder().encode(message);

  // Pad to a multiple of 64 bytes: 0x80, then zeroes, then a 64-bit big-endian
  // bit length.
  const bitLength = input.length * 8;
  const paddedLength = (((input.length + 8) >> 6) + 1) << 6;
  const padded = new Uint8Array(paddedLength);
  padded.set(input);
  padded[input.length] = 0x80;

  const view = new DataView(padded.buffer);
  // Bit lengths above 2^32 are unreachable for journal-sized inputs, but the
  // high word is written correctly regardless.
  view.setUint32(paddedLength - 8, Math.floor(bitLength / 0x100000000), false);
  view.setUint32(paddedLength - 4, bitLength >>> 0, false);

  const state = new Uint32Array(INITIAL_STATE);
  const w = new Uint32Array(64);

  for (let offset = 0; offset < paddedLength; offset += 64) {
    for (let i = 0; i < 16; i += 1) {
      w[i] = view.getUint32(offset + i * 4, false);
    }
    for (let i = 16; i < 64; i += 1) {
      const w15 = w[i - 15] as number;
      const w2 = w[i - 2] as number;
      const s0 = (rotr(w15, 7) ^ rotr(w15, 18) ^ (w15 >>> 3)) >>> 0;
      const s1 = (rotr(w2, 17) ^ rotr(w2, 19) ^ (w2 >>> 10)) >>> 0;
      w[i] =
        (((w[i - 16] as number) + s0 + (w[i - 7] as number) + s1) >>> 0) >>> 0;
    }

    let a = state[0] as number;
    let b = state[1] as number;
    let c = state[2] as number;
    let d = state[3] as number;
    let e = state[4] as number;
    let f = state[5] as number;
    let g = state[6] as number;
    let h = state[7] as number;

    for (let i = 0; i < 64; i += 1) {
      const s1 = (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) >>> 0;
      const ch = ((e & f) ^ (~e & g)) >>> 0;
      const temp1 =
        (h + s1 + ch + (K[i] as number) + (w[i] as number)) >>> 0;
      const s0 = (rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) >>> 0;
      const maj = ((a & b) ^ (a & c) ^ (b & c)) >>> 0;
      const temp2 = (s0 + maj) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    state[0] = ((state[0] as number) + a) >>> 0;
    state[1] = ((state[1] as number) + b) >>> 0;
    state[2] = ((state[2] as number) + c) >>> 0;
    state[3] = ((state[3] as number) + d) >>> 0;
    state[4] = ((state[4] as number) + e) >>> 0;
    state[5] = ((state[5] as number) + f) >>> 0;
    state[6] = ((state[6] as number) + g) >>> 0;
    state[7] = ((state[7] as number) + h) >>> 0;
  }

  let hex = "";
  for (let i = 0; i < 8; i += 1) {
    hex += (state[i] as number).toString(16).padStart(8, "0");
  }
  return hex;
}

/**
 * Length-prefixed field encoding.
 *
 * A plain delimiter is not safe here: joining `["ab", "c"]` and `["a", "bc"]`
 * on "|" both produce distinguishable strings, but joining `["a|b"]` and
 * `["a", "b"]` does not. Prefixing each field with its length makes the
 * encoding injective, so two different entries cannot canonicalise to the same
 * string and therefore cannot collide by construction rather than by luck.
 */
export function canonicalise(fields: readonly string[]): string {
  return fields.map((field) => `${field.length}:${field}`).join("");
}

/** The hash of the entry that precedes the first one. */
export const GENESIS_HASH = "0".repeat(64);

/** Convenience for display: `a1b2c3d4…`. */
export function truncateHash(hash: string, length = 8): string {
  return `${hash.slice(0, length)}…`;
}
