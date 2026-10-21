const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const { createClient } = require("@supabase/supabase-js");
const { NextResponse } = require("next/server");

const routePath = path.join(__dirname, "../src/app/api/groups/[groupId]/ideas/[ideaId]/route.ts");
const compiled = ts.transpileModule(fs.readFileSync(routePath, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;

function setup({ authenticated = true, failed = false, unavailable = false } = {}) {
  const memberships = [{ group_id: 1, detail_id: 7 }, { group_id: 2, detail_id: 7 }, { group_id: 1, detail_id: 8 }];
  const requests = [];
  // Exercise the installed Supabase query builder against a controlled transport.
  // No requests or mutations reach the user's database.
  const client = createClient("https://test.supabase.co", "test-key", {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: async (url, options) => {
      const parsed = new URL(url);
      requests.push({ url: parsed, options });
      assert.equal(parsed.pathname, "/rest/v1/idea_group_items");
      assert.equal(options.method, "DELETE");
      assert.match(options.headers.get("Prefer"), /return=representation/);
      assert.equal(parsed.searchParams.get("select"), "detail_id");
      const groupId = parsed.searchParams.get("group_id");
      const ideaId = parsed.searchParams.get("detail_id");
      assert.match(groupId, /^eq\.\d+$/);
      assert.match(ideaId, /^eq\.\d+$/);
      if (failed) return new Response(JSON.stringify({ message: "Database error", code: "42501" }), { status: 403 });
      const removed = memberships.filter((item) => groupId === `eq.${item.group_id}` && ideaId === `eq.${item.detail_id}`);
      for (const item of removed) memberships.splice(memberships.indexOf(item), 1);
      return new Response(JSON.stringify(removed.map(({ detail_id }) => ({ detail_id }))), { status: 200, headers: { "Content-Type": "application/json" } });
    } },
  });
  const exports = {};
  vm.runInNewContext(compiled, {
    exports,
    require: (name) => {
      if (name === "next/server") return { NextResponse };
      if (name === "@/lib/serverSupabase") return {
        requireAdminSession: async () => authenticated,
        getAdminSupabase: () => { if (unavailable) throw new Error("Missing server configuration"); return client; },
      };
      throw new Error(`Unexpected import ${name}`);
    },
  });
  const remove = (groupId = "1", ideaId = "7") => exports.DELETE(new Request("https://gamekb.test/api/groups/1/ideas/7", { method: "DELETE" }), { params: Promise.resolve({ groupId, ideaId }) });
  return { remove, memberships, requests };
}

test("removes only the requested membership, preserving the same idea in another group and its neighbors", async () => {
  const { remove, memberships, requests } = setup();
  const response = await remove();
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { success: true, groupId: 1, ideaId: 7 });
  assert.deepEqual(memberships, [{ group_id: 2, detail_id: 7 }, { group_id: 1, detail_id: 8 }]);
  assert.equal(requests.length, 1);
});

test("rejects unauthenticated requests before contacting the database", async () => {
  const { remove, requests } = setup({ authenticated: false });
  assert.equal((await remove()).status, 401);
  assert.equal(requests.length, 0);
});

test("rejects invalid IDs without sending a database query", async () => {
  const { remove, requests } = setup();
  for (const [groupId, ideaId] of [["0", "7"], ["1", "-1"], ["abc", "7"], ["1", "1.5"], ["9007199254740992", "7"]]) {
    assert.equal((await remove(groupId, ideaId)).status, 400);
  }
  assert.equal(requests.length, 0);
});

test("a repeated removal does not report success or affect other memberships", async () => {
  const { remove, memberships } = setup();
  assert.equal((await remove()).status, 200);
  assert.equal((await remove()).status, 404);
  assert.equal(memberships.length, 2);
});

test("database failures preserve memberships and return an error", async () => {
  const { remove, memberships } = setup({ failed: true });
  assert.equal((await remove()).status, 500);
  assert.equal(memberships.length, 3);
});

test("missing server configuration returns an error without leaking configuration details", async () => {
  const { remove, requests } = setup({ unavailable: true });
  const response = await remove();
  assert.equal(response.status, 500);
  assert.equal((await response.json()).error, "Could not remove idea from collection");
  assert.equal(requests.length, 0);
});
