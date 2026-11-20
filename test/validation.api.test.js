import assert from "node:assert/strict";
import { test } from "node:test";
import jwt from "jsonwebtoken";
import { createApp } from "../src/app.js";
import { createMemoryRepositories } from "../src/repositories/memory/index.js";

const jwtConfig = {
  accessSecret: "test-access-secret-that-is-long-enough-for-hmac-256",
  refreshSecret: "test-refresh-secret-that-is-distinct-and-long-enough",
};
const accessToken = jwt.sign({ sub: "test-admin", role: "admin" }, jwtConfig.accessSecret, {
  issuer: "queenbee-api",
  audience: "queenbee-client",
});
const authHeaders = { authorization: `Bearer ${accessToken}` };

async function withServer(run, repositories = createMemoryRepositories()) {
  const server = createApp({ ...repositories, jwt: jwtConfig }).listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  const address = server.address();
  try {
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

test("returns all measure validation errors in a problem response", async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/hives/SN-CASA-001/measures`, {
      method: "POST",
      headers: { ...authHeaders, "content-type": "application/json" },
      body: JSON.stringify({ timestamp: "invalid", weight_kg: 500, humidity_pct: 120 }),
    });
    const problem = await response.json();

    assert.equal(response.status, 400);
    assert.match(response.headers.get("content-type"), /application\/problem\+json/);
    assert.match(problem.detail, /date/i);
    assert.match(problem.detail, /weight_kg/i);
    assert.match(problem.detail, /humidity_pct/i);
  });
});

test("rejects invalid pagination and unknown query fields", async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/hives/SN-CASA-001/measures?limit=501&offset=-1`, { headers: authHeaders });
    const problem = await response.json();

    assert.equal(response.status, 400);
    assert.match(problem.detail, /limit/i);
    assert.match(problem.detail, /offset/i);

    const unknown = await fetch(`${baseUrl}/api/hives?unexpected=1`, { headers: authHeaders });
    assert.equal(unknown.status, 400);
  });
});

test("rejects forbidden inspection fields and maps duplicate IDs to 409", async () => {
  await withServer(async (baseUrl) => {
    const payload = {
      id: "7a1d2d8b-209d-4f93-8af3-38e9e4c339da",
      inspected_at: "2020-10-31T10:00:00Z",
      colony_status: "normale",
    };
    const forbidden = await fetch(`${baseUrl}/api/hives/SN-CASA-001/inspections`, {
      method: "POST",
      headers: { ...authHeaders, "content-type": "application/json" },
      body: JSON.stringify({ ...payload, author_id: "forged-user" }),
    });
    assert.equal(forbidden.status, 400);
    assert.match((await forbidden.json()).detail, /author_id/);

    const request = () => fetch(`${baseUrl}/api/hives/SN-CASA-001/inspections`, {
      method: "POST",
      headers: { ...authHeaders, "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    assert.equal((await request()).status, 201);
    const duplicate = await request();
    assert.equal(duplicate.status, 409);
    assert.match((await duplicate.json()).detail, /existe déjà/i);
  });
});

test("does not expose database messages or stack traces", async () => {
  const repositories = createMemoryRepositories();
  repositories.hivesRepository.findAll = async () => {
    const error = new Error("SELECT secret FROM users at database.js:12");
    error.code = "XX000";
    throw error;
  };

  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/hives`, { headers: authHeaders });
    const body = await response.text();
    assert.equal(response.status, 500);
    assert.doesNotMatch(body, /SELECT|database\.js|stack/i);
    assert.match(body, /Erreur interne/);
  }, repositories);
});
