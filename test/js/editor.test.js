import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");

// CodeMirror accesses requestAnimationFrame through the parent element's
// ownerDocument.defaultView (i.e. the jsdom window), so we must patch it there
dom.window.requestAnimationFrame = (callback) => setTimeout(callback, 0);
dom.window.cancelAnimationFrame = clearTimeout;

// Set up global DOM environment for CodeMirror
// Some globals like `navigator` are read-only, so we use defineProperty
const domGlobals = {
  window: dom.window,
  document: dom.window.document,
  navigator: dom.window.navigator,
  MutationObserver: dom.window.MutationObserver,
  getComputedStyle: dom.window.getComputedStyle,
  requestAnimationFrame: dom.window.requestAnimationFrame,
  cancelAnimationFrame: dom.window.cancelAnimationFrame,
  CharacterData: dom.window.CharacterData,
  DocumentType: dom.window.DocumentType,
  Element: dom.window.Element,
  NodeFilter: dom.window.NodeFilter,
  Range: dom.window.Range,
  Selection: dom.window.Selection
};

for (const [key, value] of Object.entries(domGlobals)) {
  Object.defineProperty(globalThis, key, {
    value,
    writable: true,
    configurable: true
  });
}

const { Editor } = await import("../../src/web/scripts/editor.js");

describe("Editor", () => {
  describe("#content()", () => {
    it("should return the initial content", () => {
      const parent = document.createElement("div");
      const editor = new Editor(parent, "hello world");
      assert.equal(editor.content(), "hello world");
    });

    it("should return empty string when initialized with no content", () => {
      const parent = document.createElement("div");
      const editor = new Editor(parent);
      assert.equal(editor.content(), "");
    });
  });

  describe("#setContent()", () => {
    it("should replace the content", () => {
      const parent = document.createElement("div");
      const editor = new Editor(parent, "initial");
      editor.setContent("updated");
      assert.equal(editor.content(), "updated");
    });

    it("should set content on an empty editor", () => {
      const parent = document.createElement("div");
      const editor = new Editor(parent);
      editor.setContent("new content");
      assert.equal(editor.content(), "new content");
    });

    it("should handle setting empty content", () => {
      const parent = document.createElement("div");
      const editor = new Editor(parent, "something");
      editor.setContent("");
      assert.equal(editor.content(), "");
    });
  });
});
