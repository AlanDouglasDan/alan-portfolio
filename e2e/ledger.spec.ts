import { expect, test } from "@playwright/test";

/**
 * One end-to-end pass over the ledger demos. CLAUDE.md §10.
 *
 * This is the definition-of-done check made executable: a visitor can post a
 * transaction, double-submit it and see idempotency reject the duplicate,
 * tamper with a row and see the integrity check fail, and run a reconciliation
 * — all without reading instructions.
 */

test.describe("/ledger playground", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/ledger");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "double-entry ledger",
    );
  });

  test("opens with a balanced, verifiable journal", async ({ page }) => {
    await expect(page.getByTestId("entry-count")).toHaveText("4");
    await page.getByRole("button", { name: "Verify integrity" }).click();
    await expect(page.getByText(/Chain intact across/)).toBeVisible();
  });

  test("double-submitting the same transfer posts once", async ({ page }) => {
    await page.getByRole("button", { name: "Double-submit the same transfer" }).click();
    await expect(page.getByText("Submitted twice, posted once")).toBeVisible();
    // Four opening entries plus exactly two from the single accepted transfer.
    await expect(page.getByTestId("entry-count")).toHaveText("6");
  });

  test("an overdraft is refused and writes nothing", async ({ page }) => {
    await page.getByRole("button", { name: "Overdraw an account" }).click();
    await expect(page.getByText("Rejected: insufficient funds")).toBeVisible();
    await expect(page.getByTestId("entry-count")).toHaveText("4");
  });

  test("tampering breaks the chain and names the row", async ({ page }) => {
    await page.getByRole("button", { name: "Tamper with a journal row" }).click();
    await expect(page.getByText(/Chain broken at entry/)).toBeVisible();

    await page.getByRole("button", { name: "Verify integrity" }).click();
    await expect(page.getByText(/Failed at entry/)).toBeVisible();
  });

  test("a cross-currency transfer records the rate it used", async ({ page }) => {
    await page.getByRole("button", { name: "Send Lagos → London" }).click();
    await expect(page.getByText("Lagos → London settled")).toBeVisible();
    await expect(page.getByText("The rate is now part of the record")).toBeVisible();
  });

  test("a failed payout reverses by compensation", async ({ page }) => {
    await page.getByRole("button", { name: "Payout fails at the rail" }).click();
    await expect(page.getByText(/reversed by compensation/)).toBeVisible();

    // The chain must still verify: a compensating entry is a normal posting.
    await page.getByRole("button", { name: "Verify integrity" }).click();
    await expect(page.getByText(/Chain intact across/)).toBeVisible();
  });

  test("reconciliation separates matches from breaks", async ({ page }) => {
    await page.getByRole("button", { name: "Run end-of-day reconciliation" }).click();
    await expect(
      page.getByRole("heading", { name: "End-of-day reconciliation" }),
    ).toBeVisible();
    await expect(page.getByText("not in journal").first()).toBeVisible();
    await expect(page.getByText("drift").first()).toBeVisible();
  });

  test("posting a transfer by hand appends two entries", async ({ page }) => {
    await page.getByRole("button", { name: "Post transfer" }).click();
    await expect(page.getByText(/Posted TRF\/0001/)).toBeVisible();
    await expect(page.getByTestId("entry-count")).toHaveText("6");
  });
});

test.describe("navigation and accessibility scaffolding", () => {
  test("every page has exactly one h1", async ({ page }) => {
    for (const path of ["/", "/ledger", "/work", "/approach", "/about", "/resume"]) {
      await page.goto(path);
      await expect(page.locator("h1")).toHaveCount(1);
    }
  });

  test("the skip link is the first stop for the keyboard", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
  });

  test("the command palette opens on the keyboard and navigates", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("ControlOrMeta+k");
    await expect(page.getByRole("dialog", { name: "Navigate" })).toBeVisible();

    await page.getByRole("combobox").fill("ledger play");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/ledger/);
  });

  test("the landing teaser posts a real entry", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /^Send/ }).click();
    await expect(page.getByText(/Two entries appended/)).toBeVisible();
  });
});
