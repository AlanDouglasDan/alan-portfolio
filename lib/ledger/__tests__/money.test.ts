import { describe, expect, it } from "vitest";
import fc from "fast-check";
import {
  add,
  allocate,
  allocateByWeight,
  compare,
  format,
  minorUnits,
  money,
  mulDiv,
  parseAmount,
  subtract,
  toDecimalString,
  toWords,
} from "../money";

describe("minorUnits", () => {
  it("rejects a decimal, which is the whole point of the brand", () => {
    expect(() => minorUnits(14.5)).toThrow(RangeError);
    expect(() => minorUnits(Number.MAX_SAFE_INTEGER + 2)).toThrow(RangeError);
    expect(() => minorUnits(Number.NaN)).toThrow(RangeError);
  });
});

describe("parseAmount", () => {
  it.each([
    ["14.50", "GBP", 1450],
    ["14.5", "GBP", 1450],
    ["14", "GBP", 1400],
    [".5", "GBP", 50],
    ["0.01", "GBP", 1],
    ["1,250.00", "GBP", 125000],
    ["-3.20", "USD", -320],
    ["500", "JPY", 500],
  ])("parses %s %s to %d minor units", (input, currency, expected) => {
    const parsed = parseAmount(input, currency as "GBP");
    expect(parsed?.amount).toBe(expected);
  });

  it.each([
    ["14.505", "GBP"], // more precision than the currency has
    ["1.5", "JPY"], // JPY has no minor unit
    ["abc", "GBP"],
    ["", "GBP"],
    ["1.2.3", "GBP"],
  ])("rejects %s %s", (input, currency) => {
    expect(parseAmount(input, currency as "GBP")).toBeNull();
  });

  it("round-trips through the decimal string form", () => {
    fc.assert(
      fc.property(fc.integer({ min: -1e12, max: 1e12 }), (amount) => {
        const value = money(amount, "GBP");
        const reparsed = parseAmount(toDecimalString(value), "GBP");
        expect(reparsed).toEqual(value);
      }),
    );
  });
});

describe("arithmetic", () => {
  it("refuses to add two currencies", () => {
    expect(() => add(money(100, "GBP"), money(100, "USD"))).toThrow(TypeError);
  });

  it("is associative and commutative on a single currency", () => {
    const amount = fc.integer({ min: -1e9, max: 1e9 });
    fc.assert(
      fc.property(amount, amount, amount, (a, b, c) => {
        const [x, y, z] = [money(a, "GBP"), money(b, "GBP"), money(c, "GBP")];
        expect(add(add(x, y), z)).toEqual(add(x, add(y, z)));
        expect(add(x, y)).toEqual(add(y, x));
      }),
    );
  });

  it("subtract is the inverse of add", () => {
    const amount = fc.integer({ min: -1e9, max: 1e9 });
    fc.assert(
      fc.property(amount, amount, (a, b) => {
        const [x, y] = [money(a, "GBP"), money(b, "GBP")];
        expect(subtract(add(x, y), y)).toEqual(x);
      }),
    );
  });

  it("orders consistently", () => {
    expect(compare(money(100, "GBP"), money(200, "GBP"))).toBe(-1);
    expect(compare(money(200, "GBP"), money(100, "GBP"))).toBe(1);
    expect(compare(money(100, "GBP"), money(100, "GBP"))).toBe(0);
  });
});

describe("mulDiv", () => {
  it("keeps precision past 2^53 by working in BigInt", () => {
    // 2^53 - 1 is the last exactly-representable integer; the naive
    // `value * numerator / denominator` loses this.
    expect(mulDiv(9_007_199_254_740_991, 3, 3)).toBe(9_007_199_254_740_991);
  });

  it("rounds half away from zero", () => {
    expect(mulDiv(5, 1, 2)).toBe(3);
    expect(mulDiv(-5, 1, 2)).toBe(-3);
    expect(mulDiv(4, 1, 2)).toBe(2);
  });

  it("truncates toward zero when asked to round down", () => {
    expect(mulDiv(5, 1, 2, "down")).toBe(2);
    expect(mulDiv(-5, 1, 2, "down")).toBe(-2);
  });

  it("throws rather than silently returning an unsafe integer", () => {
    expect(() => mulDiv(Number.MAX_SAFE_INTEGER, 1000, 1)).toThrow(RangeError);
  });
});

describe("allocate", () => {
  // The rounding-leak test. A ledger that loses a penny per split loses a
  // material sum over a year, and it never shows up in a unit test that only
  // checks one case.
  it("always sums back to the original", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -1e9, max: 1e9 }),
        fc.integer({ min: 1, max: 50 }),
        (amount, parts) => {
          const shares = allocate(money(amount, "GBP"), parts);
          expect(shares).toHaveLength(parts);
          const total = shares.reduce((sum, share) => sum + share.amount, 0);
          expect(total).toBe(amount);
        },
      ),
    );
  });

  it("splits 10p three ways without losing a penny", () => {
    expect(allocate(money(10, "GBP"), 3).map((share) => share.amount)).toEqual([
      4, 3, 3,
    ]);
  });

  it("weighted allocation also sums back exactly", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1e9 }),
        fc.array(fc.integer({ min: 1, max: 100 }), { minLength: 1, maxLength: 12 }),
        (amount, weights) => {
          const shares = allocateByWeight(money(amount, "GBP"), weights);
          const total = shares.reduce((sum, share) => sum + share.amount, 0);
          expect(total).toBe(amount);
        },
      ),
    );
  });
});

describe("formatting", () => {
  it.each([
    [money(1450, "GBP"), "£14.50"],
    [money(0, "GBP"), "£0.00"],
    [money(-1450, "GBP"), "−£14.50"],
    [money(125_000_00, "NGN"), "₦125,000.00"],
    [money(500, "JPY"), "¥500"],
  ])("formats %o as %s", (value, expected) => {
    expect(format(value)).toBe(expected);
  });

  it("gives a screen reader something usable", () => {
    expect(toWords(money(1450, "GBP"))).toBe("14 pounds and 50 pence");
    expect(toWords(money(100, "GBP"))).toBe("1 pound");
    expect(toWords(money(-250, "USD"))).toBe("negative 2 US dollars and 50 cents");
    expect(toWords(money(500, "JPY"))).toBe("500 yen");
    expect(toWords(money(2_500_000_00, "NGN"))).toBe("2,500,000 naira");
  });
});
