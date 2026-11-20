import assert from "node:assert/strict";
import { test } from "node:test";
import bcrypt from "bcryptjs";
import { createApp } from "../src/app.js";
import { createMemoryRepositories } from "../src/repositories/memory/index.js";

const jwt = {
  accessSecret: "sync-test-access-secret-long-enough-for-hmac-sha256",
  refreshSecret: "sync-test-refresh-secret-distinct-and-long-enough",
};

async function withServer(run) {
  const password_hash = await bcrypt.hash("SyncPassword2026!", 4);
  const repositories = createMemoryRepositories({
    users: [
      { id: "api-a", email: "api@example.test", password_hash, role: "apiculteur", site_id: "SITE-A" },
      { id: "admin-a", email: "admin@example.test", password_hash, role: "admin" },
    ],
    hives: [
      { id: "HIVE-A", site_id: "SITE-A", owner_id: "api-a", status: "active" },
      { id: "HIVE-B", site_id: "SITE-A", owner_id: "someone-else", status: "active" },
    ],
  });
  const server = createApp({ ...repositories, jwt }).listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  try {
    await run(baseUrl);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

async function authenticate(baseUrl, email = "api@example.test") {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password: "SyncPassword2026!" }),
  });
  assert.equal(response.status, 200);
  const body = await response.json();
  return { authorization: `Bearer ${body.access_token}` };
}

test("sync retries are idempotent and stale inspection versions conflict", async () => {
  await withServer(async (baseUrl) => {
    const headers = await authenticate(baseUrl);
    const first = {
      id: "ac950785-8827-40b2-aec8-672af86ba7d9",
      hive_id: "HIVE-A",
      inspected_at: "2026-10-31T10:00:00Z",
      colony_status: "normale",
      queen_present: true,
      observations: "Première visite",
    };
    const sendBatch = (inspections) => fetch(`${baseUrl}/api/inspections/sync`, {
      method: "POST",
      headers: { ...headers, "content-type": "application/json" },
      body: JSON.stringify({ inspections }),
    });

    const initial = await sendBatch([
      first,
      first,
      { ...first, id: "not-a-uuid" },
      { ...first, id: "ac950785-8827-40b2-aec8-672af86ba7da", hive_id: "UNKNOWN-HIVE" },
      { ...first, id: "ac950785-8827-40b2-aec8-672af86ba7db", hive_id: "HIVE-B" },
    ]);
    assert.equal(initial.status, 200);
    const initialResults = (await initial.json()).results;
    assert.deepEqual(initialResults.map((item) => item.status), ["created", "unchanged", "rejected", "rejected", "rejected"]);
    assert.equal(initialResults[0].inspection.version, 1);

    const replay = await sendBatch([first]);
    assert.equal((await replay.json()).results[0].status, "unchanged");

    const update = await sendBatch([{ ...first, version: 1, colony_status: "forte", observations: "Nouvelle observation" }]);
    const updateResult = (await update.json()).results[0];
    assert.equal(updateResult.status, "updated");
    assert.equal(updateResult.inspection.version, 2);

    const stale = await sendBatch([{ ...first, version: 1, colony_status: "faible", observations: "Ancienne modification" }]);
    const staleResult = (await stale.json()).results[0];
    assert.equal(staleResult.status, "conflict");
    assert.equal(staleResult.current_version, 2);

    const current = await fetch(`${baseUrl}/api/hives/HIVE-A/inspections`, { headers }).then((response) => response.json());
    assert.equal(current.length, 1);
    assert.equal(current[0].colony_status, "forte");
    assert.equal(current[0].version, 2);
  });
});

test("sync rejects empty or oversized batches and disallowed roles", async () => {
  await withServer(async (baseUrl) => {
    const apiculteur = await authenticate(baseUrl);
    const send = (token, inspections) => fetch(`${baseUrl}/api/inspections/sync`, {
      method: "POST",
      headers: { ...token, "content-type": "application/json" },
      body: JSON.stringify({ inspections }),
    });
    assert.equal((await send(apiculteur, [])).status, 400);
    assert.equal((await send(apiculteur, Array(501).fill({}))).status, 400);

    const admin = await authenticate(baseUrl, "admin@example.test");
    const forbidden = await send(admin, [{ id: "ac950785-8827-40b2-aec8-672af86ba7d9" }]);
    assert.equal(forbidden.status, 403);
  });
});

test("replaying a measurement with the same hive and timestamp does not duplicate it", async () => {
  await withServer(async (baseUrl) => {
    const headers = await authenticate(baseUrl);
    const measure = {
      timestamp: "2026-10-31T10:00:00Z",
      weight_kg: 42.5,
      temp_internal_c: 34,
    };
    const send = () => fetch(`${baseUrl}/api/hives/HIVE-A/measures`, {
      method: "POST",
      headers: { ...headers, "content-type": "application/json" },
      body: JSON.stringify(measure),
    });
    assert.equal((await send()).status, 201);
    assert.equal((await send()).status, 201);
    const listed = await fetch(`${baseUrl}/api/hives/HIVE-A/measures`, { headers }).then((response) => response.json());
    assert.equal(listed.items.length, 1);
    assert.equal(listed.items[0].weight_kg, 42.5);
  });
});
