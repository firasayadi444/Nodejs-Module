import assert from "node:assert/strict";
import { test } from "node:test";
import bcrypt from "bcryptjs";
import { createApp } from "../src/app.js";
import { createMemoryRepositories } from "../src/repositories/memory/index.js";

const jwt = {
  accessSecret: "auth-test-access-secret-long-enough-for-hmac-sha256",
  refreshSecret: "auth-test-refresh-secret-distinct-and-long-enough",
};

async function withServer(run) {
  const password_hash = await bcrypt.hash("CorrectHorseBattery!", 4);
  const repositories = createMemoryRepositories({
    users: [
      { id: "admin-id", email: "admin@example.test", password_hash, role: "admin" },
      { id: "coord-a", email: "coord@example.test", password_hash, role: "coordinateur", site_id: "SITE-A" },
      { id: "beekeeper-a", email: "keeper@example.test", password_hash, role: "apiculteur", site_id: "SITE-A" },
    ],
    hives: [
      { id: "HIVE-A1", site_id: "SITE-A", owner_id: "beekeeper-a", status: "active" },
      { id: "HIVE-A2", site_id: "SITE-A", owner_id: "other-owner", status: "active" },
      { id: "HIVE-B1", site_id: "SITE-B", owner_id: "other-owner", status: "active" },
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

async function login(baseUrl, email, password = "CorrectHorseBattery!") {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return { response, body: await response.json() };
}

test("limits hive lists and access by role, with 403 for forbidden and 404 for missing hives", async () => {
  await withServer(async (baseUrl) => {
    assert.equal((await fetch(`${baseUrl}/api/hives`)).status, 401);

    const coord = await login(baseUrl, "coord@example.test");
    assert.equal(coord.response.status, 200);
    const coordHeaders = { authorization: `Bearer ${coord.body.access_token}` };
    const coordHives = await fetch(`${baseUrl}/api/hives`, { headers: coordHeaders }).then((r) => r.json());
    assert.deepEqual(coordHives.map((hive) => hive.id), ["HIVE-A1", "HIVE-A2"]);
    const forcedScope = await fetch(`${baseUrl}/api/hives?site_id=SITE-B`, { headers: coordHeaders }).then((r) => r.json());
    assert.deepEqual(forcedScope.map((hive) => hive.id), ["HIVE-A1", "HIVE-A2"]);
    assert.equal((await fetch(`${baseUrl}/api/hives/HIVE-B1`, { headers: coordHeaders })).status, 403);
    assert.equal((await fetch(`${baseUrl}/api/hives/NO-SUCH-HIVE`, { headers: coordHeaders })).status, 404);

    const beekeeper = await login(baseUrl, "keeper@example.test");
    const keeperHeaders = { authorization: `Bearer ${beekeeper.body.access_token}` };
    const keeperHives = await fetch(`${baseUrl}/api/hives`, { headers: keeperHeaders }).then((r) => r.json());
    assert.deepEqual(keeperHives.map((hive) => hive.id), ["HIVE-A1"]);
    assert.equal((await fetch(`${baseUrl}/api/hives/HIVE-A2`, { headers: keeperHeaders })).status, 403);

    const admin = await login(baseUrl, "admin@example.test");
    const allHives = await fetch(`${baseUrl}/api/hives`, {
      headers: { authorization: `Bearer ${admin.body.access_token}` },
    }).then((r) => r.json());
    assert.equal(allHives.length, 3);
    const filtered = await fetch(`${baseUrl}/api/hives?site_id=SITE-B`, {
      headers: { authorization: `Bearer ${admin.body.access_token}` },
    }).then((r) => r.json());
    assert.deepEqual(filtered.map((hive) => hive.id), ["HIVE-B1"]);
  });
});

test("refreshes tokens, permits admin account creation, and locks after five failed logins", async () => {
  await withServer(async (baseUrl) => {
    const admin = await login(baseUrl, "admin@example.test");
    const refreshed = await fetch(`${baseUrl}/api/auth/refresh`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ refresh_token: admin.body.refresh_token }),
    });
    assert.equal(refreshed.status, 200);
    assert.ok((await refreshed.json()).access_token);

    const created = await fetch(`${baseUrl}/api/auth/users`, {
      method: "POST",
      headers: { authorization: `Bearer ${admin.body.access_token}`, "content-type": "application/json" },
      body: JSON.stringify({
        email: "new@example.test",
        password: "A-strong-password-2026",
        role: "apiculteur",
        site_id: "SITE-A",
      }),
    });
    assert.equal(created.status, 201);
    assert.equal((await created.json()).email, "new@example.test");

    for (let i = 0; i < 5; i += 1) {
      const failed = await login(baseUrl, "keeper@example.test", "wrong-password");
      assert.equal(failed.response.status, 401);
    }
    const locked = await login(baseUrl, "keeper@example.test");
    assert.equal(locked.response.status, 401);
    assert.match(locked.body.detail, /bloqué/i);
  });
});
