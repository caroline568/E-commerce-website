import test from "node:test";
import assert from "node:assert/strict";
import {
  createSessionToken,
  hashPassword,
  hashSessionToken,
  readSessionCookie,
  verifyPassword,
} from "./security.js";

test("passwords are stored as salted scrypt hashes and verified", async () => {
  const firstHash = await hashPassword("a strong customer password");
  const secondHash = await hashPassword("a strong customer password");

  assert.notEqual(firstHash, secondHash);
  assert.equal(await verifyPassword("a strong customer password", firstHash), true);
  assert.equal(await verifyPassword("incorrect password", firstHash), false);
});

test("session tokens are random and only their hashes are persisted", () => {
  const first = createSessionToken();
  const second = createSessionToken();

  assert.match(first, /^[a-f0-9]{64}$/);
  assert.notEqual(first, second);
  assert.notDeepEqual(hashSessionToken(first), Buffer.from(first, "hex"));
});

test("session cookie parsing matches the exact cookie name", () => {
  assert.equal(
    readSessionCookie("other=value; mavera_session=abc123; next=1", "mavera_session"),
    "abc123",
  );
  assert.equal(
    readSessionCookie("not_mavera_session=abc123", "mavera_session"),
    null,
  );
});
