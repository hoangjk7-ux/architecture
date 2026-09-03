import { describe, expect, it } from "vitest";
import { assertDemandTransition } from "./governance";

describe("demand workflow policy", () => {
  it("allows requester submission and approver decision", () => {
    expect(() =>
      assertDemandTransition("draft", "submitted", "requester"),
    ).not.toThrow();
    expect(() =>
      assertDemandTransition("ba_review", "approved", "approver"),
    ).not.toThrow();
  });

  it("rejects skipped states and unauthorized roles", () => {
    expect(() => assertDemandTransition("draft", "approved", "cto")).toThrow();
    expect(() =>
      assertDemandTransition("submitted", "ba_review", "requester"),
    ).toThrow();
    expect(() => assertDemandTransition("approved", "draft", "cto")).toThrow();
  });
});
