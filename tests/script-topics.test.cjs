const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const { createClient } = require("@supabase/supabase-js");
const { NextResponse } = require("next/server");

function load(relativePath, imports = {}) {
  const file = path.join(__dirname, "..", relativePath);
  const compiled = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const exports = {};
  vm.runInNewContext(compiled, { exports, require: (name) => imports[name] ?? require(name) });
  return exports;
}

const { getScriptTopic, getScriptTopicValue } = load("src/lib/scriptTopics.ts");

test("an explicitly selected topic survives changes to description and tags", () => {
  const script = { topic: "Games Expect The Unexpected", description: "Topic: Different old topic", tags: ["Games That Troll You"] };
  assert.equal(getScriptTopic(script), "Games Expect The Unexpected");
  assert.equal(getScriptTopic({ ...script, description: "New description", tags: [] }), script.topic);
});

test("an explicit No topic selection cannot be replaced by legacy metadata", () => {
  assert.equal(getScriptTopic({ topic: "", description: "Topic: Old topic", tags: ["Details In Games"] }), "No topic");
});

test("legacy projects retain topic names, with blank lines excluded", () => {
  assert.equal(getScriptTopic({ description: "Summary\nTopic: Games Remember You\r\nHook: Hi" }), "Games Remember You");
  assert.equal(getScriptTopic({ topic: null, tags: ["Gaming", "AFK Secrets"] }), "AFK Secrets");
  assert.equal(getScriptTopicValue({ description: "Topic:\nNarration should not become a topic" }), "");
  assert.equal(getScriptTopic({}), "No topic");
});

function setup({ authenticated = true, failed = false } = {}) {
  const projects = [{ id: 7, title: "My project", content: "My exact narration.", description: "My exact description.", tags: ["Keep"], hashtags: ["#keep"], assets: [{ url: "https://example.test/video" }], topic: "Old topic", status: "Draft" }];
  const requests = [];
  const client = createClient("https://test.supabase.co", "test-key", {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: async (url, options) => {
      const parsed = new URL(url);
      const body = JSON.parse(options.body);
      requests.push({ url: parsed, options, body });
      assert.equal(parsed.pathname, "/rest/v1/scripts");
      if (failed) return new Response(JSON.stringify({ message: "Database failure" }), { status: 500 });
      if (options.method === "PATCH") {
        assert.deepEqual(Object.keys(body), ["topic"]);
        assert.equal(parsed.searchParams.get("select"), "id,topic");
        const project = projects.find((item) => parsed.searchParams.get("id") === `eq.${item.id}`);
        if (!project) return new Response(JSON.stringify({ code: "PGRST116", message: "No row found", details: "The result contains 0 rows" }), { status: 406 });
        project.topic = body.topic;
        return new Response(JSON.stringify({ id: project.id, topic: project.topic }), { status: 200 });
      }
      assert.equal(options.method, "POST");
      assert.equal(body.topic, "");
      const created = { id: 8, ...body };
      projects.push(created);
      return new Response(JSON.stringify(created), { status: 201 });
    } },
  });
  const imports = {
    "next/server": { NextResponse },
    "@/lib/serverSupabase": { requireAdminSession: async () => authenticated, getAdminSupabase: () => client },
  };
  const { PATCH } = load("src/app/api/scripts/[id]/topic/route.ts", imports);
  const { POST } = load("src/app/api/scripts/route.ts", imports);
  const patch = (body, id = "7") => PATCH(new Request("https://gamekb.test/api/scripts/7/topic", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }), { params: Promise.resolve({ id }) });
  return { patch, create: POST, projects, requests };
}

test("quick topic edits preserve narration, description, tags and assets even when extra fields are submitted", async () => {
  const { patch, projects } = setup();
  const before = { ...projects[0] };
  const response = await patch({ topic: "  New topic  ", content: "Do not apply", description: "Do not apply" });
  assert.equal(response.status, 200);
  assert.deepEqual(projects[0], { ...before, topic: "New topic" });
  assert.deepEqual(await response.json(), { id: 7, topic: "New topic" });
});

test("quick edits can clear a topic and report missing projects", async () => {
  const { patch, projects } = setup();
  assert.equal((await patch({ topic: "" })).status, 200);
  assert.equal(projects[0].topic, "");
  assert.equal((await patch({ topic: "New" }, "999")).status, 404);
});

test("invalid IDs and topic bodies cannot send a database mutation", async () => {
  const { patch, requests } = setup();
  for (const [body, id] of [[{}, "7"], [{ topic: null }, "7"], [{ topic: 123 }, "7"], [{ topic: "x".repeat(501) }, "7"], [{ topic: "New" }, "-1"], [{ topic: "New" }, "NaN"]]) {
    assert.equal((await patch(body, id)).status, 400);
  }
  assert.equal(requests.length, 0);
});

test("unauthenticated callers cannot create projects or change topics", async () => {
  const { patch, create, requests } = setup({ authenticated: false });
  assert.equal((await patch({ topic: "New" })).status, 401);
  assert.equal((await create()).status, 401);
  assert.equal(requests.length, 0);
});

test("manual projects start with an editable blank draft and a separate topic field", async () => {
  const { create, projects } = setup();
  const response = await create();
  assert.equal(response.status, 201);
  assert.equal(projects[1].topic, "");
  assert.equal(projects[1].content, "");
  assert.equal(projects[1].status, "Draft");
  assert.deepEqual(projects[1].assets, []);
});

test("database failures do not report success or change project content", async () => {
  const { patch, create, projects } = setup({ failed: true });
  assert.equal((await patch({ topic: "New" })).status, 500);
  assert.equal((await create()).status, 500);
  assert.equal(projects.length, 1);
  assert.equal(projects[0].topic, "Old topic");
});

test("selector keeps a legacy or removed topic visible and offers an explicit unassigned option", () => {
  const React = require("react");
  const { renderToStaticMarkup } = require("react-dom/server");
  const { ProjectTopicSelect } = load("src/components/ProjectTopicSelect.tsx");
  const html = renderToStaticMarkup(React.createElement(ProjectTopicSelect, {
    value: "Legacy topic", topics: [{ id: "new", title: "New topic", hook: "Hook" }], onChange() {}, ariaLabel: "Topic for my project",
  }));
  assert.match(html, /aria-label="Topic for my project"/);
  assert.match(html, /value="Legacy topic" selected=""/);
  assert.match(html, /value="">No topic/);
});
