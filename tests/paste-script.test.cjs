const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

function load(relativePath, imports = {}) {
  const file = path.join(__dirname, "..", relativePath);
  const compiled = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(compiled, { exports, require: (name) => imports[name] ?? require(name) });
  return exports;
}

const scriptGuide = load("src/lib/scriptGuide.ts");
const { splitPastedScript, hookIndex, guessAssignments, applyPastedScript } = load("src/lib/pasteScript.ts", { "@/lib/scriptGuide": scriptGuide });

// Arrays made inside the vm come from another realm; compare plain copies.
const plain = (value) => JSON.parse(JSON.stringify(value));
const idea = (id, game, title, clips = 1) => ({ id, title, description: null, detail_type: "x", capture_status: null, game_title: game, game_cover: null, position: id, clips: Array.from({ length: clips }, (_, i) => ({ file_path: `https://y.test/${id}-${i}`, title: null, channel_name: null })) });
const ideas = [idea(1, "Red Dead Redemption 2", "Snow melts on your coat indoors"), idea(2, "GTA V", "Trevor's shirt gets dirty after fights"), idea(3, "The Last of Us Part II", "Ellie's breath fogs in the cold")];

test("paragraphs split on blank lines, or on single lines when there are none", () => {
  assert.deepEqual(plain(splitPastedScript("Hook here.\r\n\r\n  In GTA V, a.  \n\n\nIn RDR2, b.")), ["Hook here.", "In GTA V, a.", "In RDR2, b."]);
  assert.deepEqual(plain(splitPastedScript("Hook.\nIn GTA V, a.\nIn RDR2, b.")), ["Hook.", "In GTA V, a.", "In RDR2, b."]);
  assert.deepEqual(plain(splitPastedScript("   ")), []);
});

test("the first paragraph is the hook unless it starts with In", () => {
  assert.equal(hookIndex(["Games hide crazy details.", "In GTA V, a."]), 0);
  assert.equal(hookIndex(["In GTA V, a.", "In RDR2, b."]), -1);
});

test("rewritten, reordered paragraphs are matched back to their ideas", () => {
  const lines = new Map([[1, "In Red Dead Redemption 2, snow melts on your coat when you walk indoors."], [2, "In GTA V, Trevor's shirt gets dirty after fights."], [3, "In The Last of Us Part II, Ellie's breath fogs in the cold."]]);
  const blocks = ["These details are insane.", "In GTA V, after a brawl Trevor's shirt is covered in dirt.", "In The Last of Us Part II, you can see Ellie's breath fog up when it's cold.", "And in Red Dead Redemption 2, the snow on Arthur's coat slowly melts once he steps inside."];
  assert.deepEqual(plain(guessAssignments(blocks, ideas, lines)), [null, 2, 3, 1]);
});

test("clips follow their idea to its new line; left-out ideas lose their line", () => {
  const assets = [
    { url: "a", name: "a", idea_id: 1, idea_order: 1 },
    { url: "b", name: "b", idea_id: 2, idea_order: 2 },
    { url: "c", name: "c", idea_id: 3, idea_order: 3 },
    { url: "d", name: "d", idea_id: null, idea_order: 2 },
  ];
  const result = applyPastedScript(["Hook.", "In GTA V, x.", "In RDR2, y."], [null, 2, 1], assets, new Map([[1, 1], [2, 2], [3, 3]]));
  assert.equal(result.content, "Hook.\n\nIn GTA V, x.\n\nIn RDR2, y.");
  assert.deepEqual(plain(result.orderedIdeaIds), [2, 1]);
  const order = Object.fromEntries(result.assets.map((a) => [a.url, a.idea_order]));
  assert.deepEqual(order, { a: 2, b: 1, c: null, d: 1 });
});
