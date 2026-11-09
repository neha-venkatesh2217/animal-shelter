import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import express from "express";
import db from "./db.js";

test("login creates a session and logout removes access to the profile", async () => {
  //use an in-memory account without reading or writing real users
  const password = crypto.randomBytes(24).toString("hex");
  const username = 'test <script>alert("x")</script>';
  const salt = crypto.randomBytes(16).toString("hex");
  const passwordHash = crypto.pbkdf2Sync(password, salt, 600000, 64, "sha512").toString("hex");
  const originalQuery = db.query;
  const originalListen = express.application.listen;
  let server;
  let registered = false;
  db.query = async (sql, values) => {
    if (sql === "SELECT id FROM users WHERE username = ? OR email = ?") return [registered ? [{ id: 2 }] : []];
    if (sql.startsWith("INSERT INTO users ")) {
      registered = true;
      return [{ insertId: 2 }];
    }
    assert.equal(sql, "SELECT * FROM users WHERE username = ?");
    return [values[0] === username ? [{ id: 1, username, salt, password_hash: passwordHash }] : []];
  };
  express.application.listen = function () {
    server = originalListen.call(this, 0, "127.0.0.1");
    return server;
  };

  try {
    await import("./index.js");
    if (!server.listening) await new Promise((resolve) => server.once("listening", resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    const request = (path, options = {}) => fetch(base + path, { redirect: "manual", ...options });
    const login = (enteredPassword, cookie) => request("/login", {
      method: "POST",
      headers: cookie ? { Cookie: cookie } : {},
      body: new URLSearchParams({ username, password: enteredPassword })
    });

    const anonymous = await request("/profile");
    assert.equal(anonymous.status, 302);
    assert.equal(anonymous.headers.get("location"), "http://localhost:5173/login.html");
    assert.equal(anonymous.headers.get("set-cookie"), null);
    assert.equal((await login("wrong password")).status, 401);

    const loggedIn = await login(password);
    assert.equal(loggedIn.status, 200);
    assert.equal(loggedIn.headers.get("location"), null);
    const loginResult = await loggedIn.json();
    assert.equal(loginResult.message, `Welcome, ${username}!`);
    const cookieHeader = loggedIn.headers.get("set-cookie");
    assert.match(cookieHeader, /HttpOnly/i);
    assert.match(cookieHeader, /SameSite=Lax/i);
    assert.doesNotMatch(cookieHeader, /Expires=|Max-Age=/i);
    const firstCookie = cookieHeader.split(";")[0];
    const session = await request("/api/session", { headers: { Cookie: firstCookie, Origin: "http://localhost:5173" } });
    assert.equal(session.headers.get("access-control-allow-credentials"), "true");
    assert.deepEqual(await session.json(), { user: { id: 1, username } });
    const profile = await request("/profile", { headers: { Cookie: firstCookie } });
    assert.equal(profile.status, 200);
    assert.equal(profile.headers.get("cache-control"), "no-store");
    const html = await profile.text();
    assert.match(html, /test &lt;script&gt;alert\(&quot;x&quot;\)&lt;\/script&gt;/);
    assert.doesNotMatch(html, /<script>/);
    assert.ok(html.includes('href="/logout"'));

    //logging in again rotates the session id
    const repeatedLogin = await login(password, firstCookie);
    const secondCookie = repeatedLogin.headers.get("set-cookie").split(";")[0];
    assert.notEqual(firstCookie, secondCookie);
    assert.equal((await request("/profile", { headers: { Cookie: firstCookie } })).status, 302);
    assert.equal((await request("/profile", { headers: { Cookie: secondCookie } })).status, 200);

    const logout = await request("/logout", { headers: { Cookie: secondCookie } });
    assert.equal(logout.status, 302);
    assert.match(logout.headers.get("set-cookie"), /shelter\.sid=;/);
    assert.equal((await request("/profile", { headers: { Cookie: secondCookie } })).status, 302);
    assert.deepEqual(await (await request("/api/session", { headers: { Cookie: secondCookie } })).json(), { user: null });
    assert.equal((await request("/account.css")).status, 200);

    //simulate registration without writing a real database record
    const register = () => request("/register", {
      method: "POST",
      body: new URLSearchParams({ username: "new-user", email: "test@example.com", password })
    });
    const registration = await register();
    assert.equal(registration.status, 201);
    assert.equal(registration.headers.get("location"), null);
    assert.match((await registration.json()).message, /successfully registered/);
    const duplicate = await register();
    assert.equal(duplicate.status, 409);
    assert.equal((await duplicate.json()).error, "Username or email already exists.");
  } finally {
    db.query = originalQuery;
    express.application.listen = originalListen;
    if (server) await new Promise((resolve) => server.close(resolve));
    await db.end();
  }
});
