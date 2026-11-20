import assert from "node:assert/strict";
import { test } from "node:test";
import { measureSchema } from "../src/validators/schemas.js";

test("rejects a weight outside its physical range", () => {
  const { error } = measureSchema.validate({
    timestamp: "2026-10-31T10:00:00Z",
    weight_kg: 500,
  });
  assert.ok(error);
  assert.match(error.details[0].message, /weight_kg/);
});
