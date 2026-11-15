import test from "node:test";
import assert from "node:assert/strict";
import { createSessionRefresh } from "../src/auth/session-refresh.ts";
import { AuthRequestError, refresh } from "../src/auth/auth-api.ts";
import { accountStorageKey, captureUserWriter, readUserValue, setActiveAccount, writeUserValue } from "../src/auth/user-store.ts";

const session = (accountId = "A", refreshToken = "refresh-old") => ({
  accessToken: "synthetic-access", refreshToken, accessTokenExpiresAt: 123,
  account: { accountId, fullName: accountId, email: "test@example.test", displayName: null, roles: ["Customer"] },
});
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
const unlocked = action => action();

test("restoration and timer share a single pending refresh and persist the replacement", async () => {
  let stored = session();
  const next = session("A", "refresh-new");
  const reply = deferred();
  let calls = 0;
  const run = createSessionRefresh({ read: () => stored, write: value => { stored = value; },
    request: () => { calls++; return reply.promise; }, withLock: unlocked });
  const restore = run(stored), timer = run(stored);
  assert.equal(calls, 1);
  reply.resolve(next);
  assert.deepEqual(await Promise.all([restore, timer]), [next, next]);
  assert.equal(stored, next);
});

test("two tabs serialize refresh and the waiting tab reuses the new persisted session", async () => {
  const original = session(), next = session("A", "refresh-new");
  let stored = original, calls = 0, queue = Promise.resolve();
  const withLock = action => {
    const operation = queue.then(action);
    queue = operation.catch(() => {});
    return operation;
  };
  const dependencies = { read: () => stored, write: value => { stored = value; },
    request: async () => { calls++; return next; }, withLock };
  const tabA = createSessionRefresh(dependencies), tabB = createSessionRefresh(dependencies);
  assert.deepEqual(await Promise.all([tabA(original), tabB(original)]), [next, next]);
  assert.equal(calls, 1);
});

for (const replacement of [null, session("B", "refresh-B"), session("A", "new-login-A")]) {
  test(`late refresh cannot overwrite ${replacement ? replacement.refreshToken : "logout"}`, async () => {
    let stored = session();
    const reply = deferred();
    const run = createSessionRefresh({ read: () => stored, write: value => { stored = value; },
      request: () => reply.promise, withLock: unlocked });
    const operation = run(stored);
    stored = replacement;
    reply.resolve(session("A", "late-result"));
    assert.equal(await operation, replacement);
    assert.equal(stored, replacement);
  });
}

test("a failed refresh for an old account cannot log out the new account", async () => {
  let stored = session();
  const reply = deferred();
  const run = createSessionRefresh({ read: () => stored, write: value => { stored = value; },
    request: () => reply.promise, withLock: unlocked });
  const operation = run(stored), replacement = session("B", "refresh-B");
  stored = replacement;
  reply.reject(new AuthRequestError("Expired", 401));
  assert.equal(await operation, replacement);
  assert.equal(stored, replacement);
});

test("a rejected current token clears the persisted session", async () => {
  let stored = session();
  const run = createSessionRefresh({ read: () => stored, write: value => { stored = value; },
    request: async () => { throw new AuthRequestError("Expired", 401); }, withLock: unlocked });
  await assert.rejects(run(stored), { status: 401 });
  assert.equal(stored, null);
});

test("network failure retains the current token for a later retry", async () => {
  const original = session(), next = session("A", "refresh-new");
  let stored = original, calls = 0;
  const run = createSessionRefresh({ read: () => stored, write: value => { stored = value; },
    request: async token => {
      assert.equal(token, original.refreshToken);
      if (++calls === 1) throw new TypeError("Offline");
      return next;
    }, withLock: unlocked });
  await assert.rejects(run(original), /Offline/);
  assert.equal(stored, original);
  assert.equal(await run(original), next);
  assert.equal(calls, 2);
});

test("auth API retains HTTP status so network errors are not mistaken for invalid credentials", async context => {
  context.mock.method(globalThis, "fetch", async () => Response.json({ detail: "Phiên đã hết hạn." }, { status: 401 }));
  await assert.rejects(refresh("synthetic-token"), { status: 401, message: "Phiên đã hết hạn." });
});

test("a delayed license write never crosses accounts or survives logout and login", context => {
  const values = new Map();
  const previous = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: {
    getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value),
  } });
  context.after(() => {
    setActiveAccount(null);
    if (previous) Object.defineProperty(globalThis, "localStorage", previous);
    else delete globalThis.localStorage;
  });
  setActiveAccount("A");
  writeUserValue("addresses", ["address-A"]);
  const writeLicenseA = captureUserWriter("license.preview");
  setActiveAccount("B");
  assert.deepEqual(readUserValue("addresses", []), []);
  assert.equal(writeLicenseA("synthetic-image-A"), false);
  assert.equal(values.has(accountStorageKey("B", "license.preview")), false);
  setActiveAccount("A");
  assert.equal(writeLicenseA("synthetic-image-A"), false);
  assert.deepEqual(readUserValue("addresses", []), ["address-A"]);
  const validWrite = captureUserWriter("license.preview");
  assert.equal(validWrite("synthetic-image-A"), true);
  assert.equal(readUserValue("license.preview", null), "synthetic-image-A");
  const oldWrite = captureUserWriter("license.preview");
  setActiveAccount(null);
  setActiveAccount("A");
  assert.equal(oldWrite("stale-image"), false);
  setActiveAccount(null);
});
