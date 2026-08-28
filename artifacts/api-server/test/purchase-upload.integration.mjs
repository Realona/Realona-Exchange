import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { once } from "node:events";
import { after, before, describe, test } from "node:test";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const require = createRequire(import.meta.url);
const { Pool } = require("../../../lib/db/node_modules/pg");
const jwt = require("../node_modules/jsonwebtoken");
const { Storage } = require("../node_modules/@google-cloud/storage");

const TEST_PREFIX = `purchase_upload_test_${process.pid}_${Date.now()}`;
const TEST_EMAIL_DOMAIN = "@integration.invalid";
const pngFixture = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

let pool;
let baseUrl;
let apiProcess;
let apiProcessOutput = "";
const seededUserIds = [];
const seededListingIds = [];
const uploadedObjectPaths = [];

function uniqueName(label) {
  return `${TEST_PREFIX}_${label}_${seededUserIds.length}_${seededListingIds.length}`;
}

async function getFreePort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const { port } = server.address();
  await new Promise((resolve) => server.close(resolve));
  return port;
}

async function waitForHealth(url, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${url}/api/healthz`);
      if (response.ok) return;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error(`API did not become ready: ${lastError?.message ?? "timeout"}\n${apiProcessOutput}`);
}

function tokenFor(userId) {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is required to run integration tests");
  return jwt.sign({ userId }, secret, { expiresIn: "1h" });
}

async function apiRequest(route, { token, method = "GET", body } = {}) {
  const headers = {};
  if (token) headers.authorization = `Bearer ${token}`;
  if (body !== undefined) headers["content-type"] = "application/json";

  const response = await fetch(`${baseUrl}/api${route}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let parsed;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = text;
  }
  return { status: response.status, body: parsed };
}

async function seedUser(label, walletBalance = "0", flags = {}) {
  const email = `${uniqueName(label)}${TEST_EMAIL_DOMAIN}`;
  const username = uniqueName(label);
  const result = await pool.query(
    `INSERT INTO users (email, username, password_hash, wallet_balance, is_admin, is_super_admin, is_suspended, is_demo)
     VALUES ($1, $2, $3, $4, $5, $6, false, true)
     RETURNING id`,
    [email, username, "integration-test-password-hash", walletBalance, flags.isAdmin ?? false, flags.isSuperAdmin ?? false],
  );
  const id = result.rows[0].id;
  seededUserIds.push(id);
  return { id, token: tokenFor(id), email, username };
}

async function seedListing(sellerId, price = "100.00", status = "active", pictureUrl = null) {
  const result = await pool.query(
    `INSERT INTO listings (seller_id, game_name, price, description, picture_url, konami_id, konami_password, access_code, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id`,
    [
      sellerId,
      `${TEST_PREFIX} eFootball account`,
      price,
      "Integration test listing",
      pictureUrl,
      `${TEST_PREFIX}_konami_id`,
      "integration-password",
      "integration-access-code",
      status,
    ],
  );
  const id = result.rows[0].id;
  seededListingIds.push(id);
  return id;
}

async function uploadFixture(user) {
  const result = await apiRequest("/storage/uploads/request-url", {
    token: user.token,
    method: "POST",
    body: { name: "integration.png", size: pngFixture.length, contentType: "image/png" },
  });
  assert.equal(result.status, 200, JSON.stringify(result.body));
  const upload = await fetch(result.body.uploadURL, {
    method: "PUT",
    headers: { "content-type": "image/png" },
    body: pngFixture,
  });
  assert.equal(upload.ok, true, `Object upload failed with ${upload.status}`);
  uploadedObjectPaths.push(result.body.objectPath);
  return `/api/storage/objects${result.body.objectPath.replace(/^\/objects/, "")}`;
}

async function cleanupDatabase() {
  if (!pool) return;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `DELETE FROM notifications
       WHERE user_id = ANY($1::int[])
          OR metadata->>'listingId' = ANY($2::text[])
          OR metadata->>'tradeId' IN (
            SELECT id::text FROM trades WHERE listing_id = ANY($3::int[])
          )
          OR metadata->>'kycId' IN (
            SELECT id::text FROM kyc_submissions WHERE user_id = ANY($1::int[])
          )
          OR (
            type = 'admin_activity'
            AND title = 'New KYC submission'
            AND message LIKE 'purchase_upload_test_% submitted Level %'
          )`,
      [
        seededUserIds,
        (seededListingIds.length ? seededListingIds : [0]).map(String),
        seededListingIds.length ? seededListingIds : [0],
      ],
    );
    await client.query("DELETE FROM wishlist_items WHERE listing_id = ANY($1::int[])", [
      seededListingIds.length ? seededListingIds : [0],
    ]);
    await client.query(
      "DELETE FROM trade_messages WHERE trade_id IN (SELECT id FROM trades WHERE listing_id = ANY($1::int[]))",
      [seededListingIds.length ? seededListingIds : [0]],
    );
    await client.query("DELETE FROM trades WHERE listing_id = ANY($1::int[])", [
      seededListingIds.length ? seededListingIds : [0],
    ]);
    await client.query("DELETE FROM kyc_submissions WHERE user_id = ANY($1::int[])", [seededUserIds]);
    await client.query("DELETE FROM listings WHERE id = ANY($1::int[])", [
      seededListingIds.length ? seededListingIds : [0],
    ]);
    await client.query("DELETE FROM users WHERE id = ANY($1::int[])", [seededUserIds]);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function collectStaleTestFixtures() {
  const users = await pool.query(
    "SELECT id FROM users WHERE email LIKE $1",
    [`purchase_upload_test_%${TEST_EMAIL_DOMAIN}`],
  );
  for (const row of users.rows) {
    if (!seededUserIds.includes(row.id)) seededUserIds.push(row.id);
  }
  if (seededUserIds.length === 0) return;

  const listings = await pool.query("SELECT id FROM listings WHERE seller_id = ANY($1::int[])", [seededUserIds]);
  for (const row of listings.rows) {
    if (!seededListingIds.includes(row.id)) seededListingIds.push(row.id);
  }
}

async function cleanupObjects() {
  const privateDir = process.env.PRIVATE_OBJECT_DIR;
  if (!privateDir || (uploadedObjectPaths.length === 0 && seededUserIds.length === 0)) return;

  const parts = privateDir.replace(/^\/+/, "").split("/");
  const bucketName = parts.shift();
  const prefix = parts.join("/");
  const storage = new Storage({
    credentials: {
      audience: "replit",
      subject_token_type: "access_token",
      token_url: "http://127.0.0.1:1106/token",
      type: "external_account",
      credential_source: {
        url: "http://127.0.0.1:1106/credential",
        format: { type: "json", subject_token_field_name: "access_token" },
      },
      universe_domain: "googleapis.com",
    },
    projectId: "",
  });

  const bucket = storage.bucket(bucketName);
  await Promise.all(
    seededUserIds.map((userId) =>
      bucket.deleteFiles({
        prefix: [prefix, `uploads/${userId}/`].filter(Boolean).join("/"),
        force: true,
      }),
    ),
  );
}

async function createPurchaseFixture() {
  const seller = await seedUser("seller");
  const buyerOne = await seedUser("buyer_one", "250.00");
  const buyerTwo = await seedUser("buyer_two", "250.00");
  const listingId = await seedListing(seller.id, "100.00");
  return { seller, buyerOne, buyerTwo, listingId };
}

before(async () => {
  pool = new Pool({ connectionString: process.env.DATABASE_URL });
  await collectStaleTestFixtures();
  await cleanupDatabase();
  await cleanupObjects();
  seededUserIds.length = 0;
  seededListingIds.length = 0;
  uploadedObjectPaths.length = 0;

  const configuredBaseUrl = process.env.TEST_BASE_URL;
  if (configuredBaseUrl) {
    baseUrl = configuredBaseUrl.replace(/\/$/, "");
  } else {
    const port = await getFreePort();
    baseUrl = `http://127.0.0.1:${port}`;
    const distEntry = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../dist/index.mjs");
    apiProcess = spawn(process.execPath, ["--enable-source-maps", distEntry], {
      env: {
        ...process.env,
        NODE_ENV: "test",
        DISABLE_OUTBOUND_EMAIL: "true",
        PORT: String(port),
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    apiProcess.stdout.on("data", (chunk) => { apiProcessOutput += chunk.toString(); });
    apiProcess.stderr.on("data", (chunk) => { apiProcessOutput += chunk.toString(); });
    await waitForHealth(baseUrl);
  }
});

after(async () => {
  try {
    if (apiProcess) {
      apiProcess.kill("SIGTERM");
      await once(apiProcess, "exit").catch(() => {});
    } else {
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
    await cleanupDatabase();
    await cleanupObjects();
  } finally {
    await pool?.end();
  }
});

describe("purchase atomicity", () => {
  test("parallel buyers produce one funded trade and one wallet deduction", async () => {
    const { buyerOne, buyerTwo, listingId } = await createPurchaseFixture();
    const [first, second] = await Promise.all([
      apiRequest("/trades", { token: buyerOne.token, method: "POST", body: { listingId } }),
      apiRequest("/trades", { token: buyerTwo.token, method: "POST", body: { listingId } }),
    ]);

    const responses = [first, second];
    assert.equal(responses.filter((response) => response.status === 201).length, 1);
    assert.equal(
      responses.filter((response) => response.status === 400 || response.status === 409).length,
      1,
    );
    const listing = await pool.query("SELECT status FROM listings WHERE id = $1", [listingId]);
    const trades = await pool.query("SELECT buyer_id, amount FROM trades WHERE listing_id = $1", [listingId]);
    const wallets = await pool.query("SELECT id, wallet_balance FROM users WHERE id = ANY($1::int[])", [
      [buyerOne.id, buyerTwo.id],
    ]);

    assert.equal(listing.rows[0].status, "sold");
    assert.equal(trades.rowCount, 1);
    assert.equal(Number(trades.rows[0].amount), 100);
    assert.equal(wallets.rowCount, 2);
    const balances = new Map(wallets.rows.map((row) => [row.id, Number(row.wallet_balance)]));
    assert.deepEqual([balances.get(buyerOne.id), balances.get(buyerTwo.id)].sort((a, b) => a - b), [150, 250]);
  });

  test("a concurrent price change cannot charge a stale amount", async () => {
    const seller = await seedUser("price_seller");
    const buyer = await seedUser("price_buyer", "250.00");
    const listingId = await seedListing(seller.id, "100.00");

    const [priceChange, purchase] = await Promise.all([
      apiRequest(`/listings/${listingId}`, { token: seller.token, method: "PATCH", body: { price: 150 } }),
      apiRequest("/trades", { token: buyer.token, method: "POST", body: { listingId } }),
    ]);

    const trades = await pool.query("SELECT amount FROM trades WHERE listing_id = $1", [listingId]);
    const listing = await pool.query("SELECT price, status FROM listings WHERE id = $1", [listingId]);
    assert.equal(purchase.status, 201, JSON.stringify(purchase.body));
    assert.ok([200, 409].includes(priceChange.status), JSON.stringify(priceChange.body));
    assert.equal(trades.rowCount, 1);
    assert.equal(Number(trades.rows[0].amount), Number(listing.rows[0].price));
    assert.ok([100, 150].includes(Number(trades.rows[0].amount)));
    assert.equal(
      Number((await pool.query("SELECT wallet_balance FROM users WHERE id = $1", [buyer.id])).rows[0].wallet_balance),
      250 - Number(trades.rows[0].amount),
    );
  });
});

describe("listing and upload ownership", () => {
  test("reserved and sold listings cannot be reactivated", async () => {
    const seller = await seedUser("status_seller");
    const reservedListingId = await seedListing(seller.id, "100.00", "reserved");
    const soldListingId = await seedListing(seller.id, "100.00", "sold");

    const [reserved, sold] = await Promise.all([
      apiRequest(`/listings/${reservedListingId}`, { token: seller.token, method: "PATCH", body: { status: "active" } }),
      apiRequest(`/listings/${soldListingId}`, { token: seller.token, method: "PATCH", body: { status: "active" } }),
    ]);

    assert.equal(reserved.status, 409);
    assert.equal(sold.status, 409);
    const rows = await pool.query("SELECT id, status FROM listings WHERE id = ANY($1::int[])", [
      [reservedListingId, soldListingId],
    ]);
    assert.deepEqual(new Map(rows.rows.map((row) => [row.id, row.status])), new Map([
      [reservedListingId, "reserved"],
      [soldListingId, "sold"],
    ]));
  });

  test("users cannot attach another user's upload to a listing or KYC submission", async () => {
    const owner = await seedUser("upload_owner");
    const otherUser = await seedUser("upload_other");
    const foreignPath = `/api/storage/objects/uploads/${owner.id}/foreign-object`;

    const listing = await apiRequest("/listings", {
      token: otherUser.token,
      method: "POST",
      body: { gameName: "Foreign upload listing", price: 100, description: "Should fail", pictureUrl: foreignPath },
    });
    const kyc = await apiRequest("/kyc/submit", {
      token: otherUser.token,
      method: "POST",
      body: { documentType: "NIN", documentUrl: foreignPath },
    });

    assert.equal(listing.status, 400);
    assert.equal(kyc.status, 400);
    assert.match(listing.body.error, /uploaded from your account/i);
    assert.match(kyc.body.error, /uploaded from your account/i);
  });
});

describe("object visibility", () => {
  test("listing images are public but KYC images require owner or admin", async () => {
    const owner = await seedUser("visibility_owner");
    const otherUser = await seedUser("visibility_other");
    const admin = await seedUser("visibility_admin", "0", { isAdmin: true });
    const listingImage = await uploadFixture(owner);
    const documentImage = await uploadFixture(owner);
    const selfieImage = await uploadFixture(owner);
    const listingId = await seedListing(owner.id, "100.00", "active", listingImage);

    const kyc = await apiRequest("/kyc/submit", {
      token: owner.token,
      method: "POST",
      body: { documentType: "NIN", documentUrl: documentImage, selfieUrl: selfieImage },
    });
    assert.equal(kyc.status, 201, JSON.stringify(kyc.body));

    const publicListingImage = await fetch(`${baseUrl}${listingImage}`);
    const anonymousKycImage = await fetch(`${baseUrl}${documentImage}`);
    const otherUserKycImage = await fetch(`${baseUrl}${documentImage}`, {
      headers: { authorization: `Bearer ${otherUser.token}` },
    });
    const ownerKycImage = await fetch(`${baseUrl}${documentImage}`, {
      headers: { authorization: `Bearer ${owner.token}` },
    });
    const adminKycImage = await fetch(`${baseUrl}${documentImage}`, {
      headers: { authorization: `Bearer ${admin.token}` },
    });

    assert.equal(publicListingImage.status, 200);
    assert.equal(await publicListingImage.arrayBuffer().then((body) => Buffer.from(body).equals(pngFixture)), true);
    assert.equal(anonymousKycImage.status, 401);
    assert.equal(otherUserKycImage.status, 403);
    assert.equal(ownerKycImage.status, 200);
    assert.equal(adminKycImage.status, 200);

    const listing = await pool.query("SELECT picture_url FROM listings WHERE id = $1", [listingId]);
    assert.equal(listing.rows[0].picture_url, listingImage);
  });
});