import { createRequire } from "node:module";
const require = createRequire(import.meta.url);

const { test, describe } = require("node:test");
const assert = require("node:assert");
const { JSDOM } = require("jsdom");

const dom = new JSDOM("<!DOCTYPE html><html><body><div id=\"editor\"></div></body></html>");

const foo = "bar";

// Additional stubs needed by CodeMirror
global.document = dom.window.document;
global.window = dom.window;
global.MutationObserver = dom.window.MutationObserver;
dom.window.requestAnimationFrame = (callback) => setTimeout(callback, 16);
dom.window.cancelAnimationFrame = (id) => clearTimeout(id);
dom.window.Range.prototype.getClientRects = () => [];
dom.window.Range.prototype.getBoundingClientRect = () =>
  ({ top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0 });

// Dynamic import is required because static imports are hoisted and execute
// before any code runs. The JSDOM globals must be set up before CodeMirror
// loads, as it checks for browser APIs like MutationObserver at import time
import("../../src/web/scripts/editor.js").then(({ Editor }) => {
  describe("Editor", () => {
    const container = document.getElementById("editor");

    test("content returns initial content", () => {
      const editor = new Editor(container, "hello world");
      assert.strictEqual(editor.content(), "hello world");
    });

    test("setContent replaces existing content", () => {
      const editor = new Editor(container, "initial");
      editor.setContent("replaced");
      assert.strictEqual(editor.content(), "replaced");
    });
  });
});
