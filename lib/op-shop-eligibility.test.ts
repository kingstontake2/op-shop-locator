import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isLikelyOpShop } from "./op-shop-eligibility";

describe("isLikelyOpShop", () => {
  it("keeps known charity retail brands", () => {
    assert.equal(
      isLikelyOpShop({ name: "Salvation Army Store", types: ["store"] }),
      true,
    );
    assert.equal(
      isLikelyOpShop({ name: "Vinnies Devonport", types: ["store"] }),
      true,
    );
    assert.equal(
      isLikelyOpShop({ name: "Hospice Shop Ponsonby", types: ["store"] }),
      true,
    );
  });

  it("keeps independent names with op-shop signals", () => {
    assert.equal(
      isLikelyOpShop({ name: "Grey Lynn Op Shop", types: ["store"] }),
      true,
    );
    assert.equal(
      isLikelyOpShop({ name: "City Charity Shop", types: ["point_of_interest"] }),
      true,
    );
    assert.equal(
      isLikelyOpShop({ name: "Preloved Boutique", types: ["clothing_store"] }),
      true,
    );
  });

  it("keeps ambiguous independent shops (balanced default)", () => {
    assert.equal(
      isLikelyOpShop({
        name: "Community Reuse Hub",
        types: ["store", "point_of_interest"],
      }),
      true,
    );
  });

  it("rejects charity offices and donation drop-offs", () => {
    assert.equal(
      isLikelyOpShop({
        name: "Salvation Army Territorial Headquarters",
        types: ["point_of_interest"],
      }),
      true, // brand/name keep overrides reject
    );
    assert.equal(
      isLikelyOpShop({
        name: "Local Charity Office",
        types: ["point_of_interest"],
      }),
      false,
    );
    assert.equal(
      isLikelyOpShop({
        name: "Donation Bin — High Street",
        types: ["point_of_interest"],
      }),
      false,
    );
    assert.equal(
      isLikelyOpShop({
        name: "Clothing Drop Off Centre",
        types: ["point_of_interest"],
      }),
      false,
    );
  });

  it("rejects libraries and churches by name or type", () => {
    assert.equal(
      isLikelyOpShop({ name: "Auckland Central Library", types: ["library"] }),
      false,
    );
    assert.equal(
      isLikelyOpShop({
        name: "St Mary's Church",
        types: ["place_of_worship", "church"],
      }),
      false,
    );
    assert.equal(
      isLikelyOpShop({
        name: "Community Place",
        types: ["place_of_worship"],
      }),
      false,
    );
  });

  it("strong keep overrides reject signals for branded retail", () => {
    assert.equal(
      isLikelyOpShop({
        name: "Hospice Op Shop (donation drop-off accepted)",
        types: ["store"],
      }),
      true,
    );
  });
});
