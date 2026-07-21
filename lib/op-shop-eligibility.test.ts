import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isLikelyOpShop, REJECT_PLACE_IDS } from "./op-shop-eligibility";

const id = "test-place-id";

describe("isLikelyOpShop", () => {
  it("keeps known charity retail brands", () => {
    assert.equal(
      isLikelyOpShop({
        id,
        name: "Salvation Army Store",
        types: ["store"],
      }),
      true,
    );
    assert.equal(
      isLikelyOpShop({ id, name: "Vinnies Devonport", types: ["store"] }),
      true,
    );
    assert.equal(
      isLikelyOpShop({
        id,
        name: "Hospice Shop Ponsonby",
        types: ["store"],
      }),
      true,
    );
  });

  it("keeps independent names with op-shop signals", () => {
    assert.equal(
      isLikelyOpShop({ id, name: "Grey Lynn Op Shop", types: ["store"] }),
      true,
    );
    assert.equal(
      isLikelyOpShop({
        id,
        name: "City Charity Shop",
        types: ["point_of_interest"],
      }),
      true,
    );
    assert.equal(
      isLikelyOpShop({
        id,
        name: "Preloved Boutique",
        types: ["clothing_store"],
      }),
      true,
    );
  });

  it("keeps ambiguous independent shops (balanced default)", () => {
    assert.equal(
      isLikelyOpShop({
        id,
        name: "Community Reuse Hub",
        types: ["store", "point_of_interest"],
      }),
      true,
    );
  });

  it("rejects charity offices and donation drop-offs", () => {
    assert.equal(
      isLikelyOpShop({
        id,
        name: "Salvation Army Territorial Headquarters",
        types: ["point_of_interest"],
      }),
      true, // brand/name keep overrides reject
    );
    assert.equal(
      isLikelyOpShop({
        id,
        name: "Local Charity Office",
        types: ["point_of_interest"],
      }),
      false,
    );
    assert.equal(
      isLikelyOpShop({
        id,
        name: "Donation Bin — High Street",
        types: ["point_of_interest"],
      }),
      false,
    );
    assert.equal(
      isLikelyOpShop({
        id,
        name: "Clothing Drop Off Centre",
        types: ["point_of_interest"],
      }),
      false,
    );
  });

  it("rejects libraries and churches by name or type", () => {
    assert.equal(
      isLikelyOpShop({
        id,
        name: "Auckland Central Library",
        types: ["library"],
      }),
      false,
    );
    assert.equal(
      isLikelyOpShop({
        id,
        name: "St Mary's Church",
        types: ["place_of_worship", "church"],
      }),
      false,
    );
    assert.equal(
      isLikelyOpShop({
        id,
        name: "Community Place",
        types: ["place_of_worship"],
      }),
      false,
    );
  });

  it("strong keep overrides reject signals for branded retail", () => {
    assert.equal(
      isLikelyOpShop({
        id,
        name: "Hospice Op Shop (donation drop-off accepted)",
        types: ["store"],
      }),
      true,
    );
  });

  it("place-id deny drops even a keep-brand name", () => {
    const deniedId = "ChIJ_test_denied_place";
    REJECT_PLACE_IDS.add(deniedId);
    try {
      assert.equal(
        isLikelyOpShop({
          id: deniedId,
          name: "Salvation Army Store",
          types: ["store"],
        }),
        false,
      );
    } finally {
      REJECT_PLACE_IDS.delete(deniedId);
    }
  });

  it("rejects reject-brand names without a strong keep signal", () => {
    assert.equal(
      isLikelyOpShop({
        id,
        name: "Opportunity International Auckland",
        types: ["point_of_interest"],
      }),
      false,
    );
  });

  it("strong keep wins over reject-brand when both could apply", () => {
    assert.equal(
      isLikelyOpShop({
        id,
        name: "Opportunity International Op Shop",
        types: ["store"],
      }),
      true,
    );
  });
});
