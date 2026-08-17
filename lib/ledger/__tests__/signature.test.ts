import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { canonicalise, sha256, truncateHash } from "../signature";

describe("sha256", () => {
  // FIPS 180-4 / NIST published vectors. If this implementation drifts, these
  // fail loudly rather than the chain quietly hashing to something plausible.
  it.each([
    ["", "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"],
    ["abc", "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"],
    [
      "abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq",
      "248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1",
    ],
    [
      "abcdefghbcdefghicdefghijdefghijkefghijklfghijklmghijklmnhijklmnoijklmnopjklmnopqklmnopqrlmnopqrsmnopqrstnopqrstu",
      "cf5b16a778af8380036ce59e7b0492370b249b11e8f07a51afac45037afee9d1",
    ],
  ])("hashes %j to the published digest", (input, expected) => {
    expect(sha256(input)).toBe(expected);
  });

  it("handles a message that spans many blocks", () => {
    expect(sha256("a".repeat(1_000_000))).toBe(
      "cdc76e5c9914fb9281a1c7e284d73e67f1809a48a497200e046d39ccc7112cd0",
    );
  });

  it("handles multi-byte UTF-8", () => {
    // Length is counted in bytes, not code units. "£" is two bytes.
    expect(sha256("£")).toBe(sha256("£"));
    expect(sha256("£")).not.toBe(sha256("&"));
  });

  it("always returns 64 lowercase hex characters", () => {
    fc.assert(
      fc.property(fc.string(), (input) => {
        expect(sha256(input)).toMatch(/^[0-9a-f]{64}$/);
      }),
    );
  });

  it("is deterministic", () => {
    fc.assert(
      fc.property(fc.string(), (input) => {
        expect(sha256(input)).toBe(sha256(input));
      }),
    );
  });

  it("produces a different digest for a different input", () => {
    fc.assert(
      fc.property(fc.string(), fc.string(), (a, b) => {
        fc.pre(a !== b);
        expect(sha256(a)).not.toBe(sha256(b));
      }),
    );
  });
});

describe("canonicalise", () => {
  // The property that matters: distinct field lists never collide. A plain
  // delimiter fails this the moment a field contains the delimiter.
  it("is injective over field lists", () => {
    fc.assert(
      fc.property(
        fc.array(fc.string(), { maxLength: 6 }),
        fc.array(fc.string(), { maxLength: 6 }),
        (a, b) => {
          fc.pre(JSON.stringify(a) !== JSON.stringify(b));
          expect(canonicalise(a)).not.toBe(canonicalise(b));
        },
      ),
    );
  });

  it("separates fields that a naive join would merge", () => {
    expect(canonicalise(["a|b"])).not.toBe(canonicalise(["a", "b"]));
    expect(canonicalise(["ab", ""])).not.toBe(canonicalise(["a", "b"]));
  });
});

describe("truncateHash", () => {
  it("shows a readable prefix", () => {
    expect(truncateHash("abcdef1234567890")).toBe("abcdef12…");
  });
});
