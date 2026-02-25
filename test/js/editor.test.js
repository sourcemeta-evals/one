import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

// Set up a jsdom environment before importing Editor,
// as CodeMirror expects global DOM APIs to be available.
const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");

// CodeMirror resolves requestAnimationFrame via the parent element's
// ownerDocument.defaultView, so the polyfill must live on the jsdom window.
dom.window.requestAnimationFrame =
  (callback) => dom.window.setTimeout(callback, 0);
dom.window.cancelAnimationFrame =
  (id) => dom.window.clearTimeout(id);

const domGlobals = [
  "window", "document", "MutationObserver", "getComputedStyle",
  "CSSStyleSheet", "StyleSheet", "DocumentFragment",
  "Element", "Text", "Range", "HTMLElement", "navigator"
];

for (const name of domGlobals) {
  Object.defineProperty(globalThis, name, {
    value: dom.window[name],
    writable: true,
    configurable: true
  });
}

globalThis.requestAnimationFrame = dom.window.requestAnimationFrame;

// Range.prototype needs getClientRects and getBoundingClientRect
// for CodeMirror to work under jsdom
if (!Range.prototype.getClientRects) {
  Range.prototype.getClientRects = () => [];
}
if (!Range.prototype.getBoundingClientRect) {
  Range.prototype.getBoundingClientRect = () =>
    ({ top: 0, left: 0, bottom: 0, right: 0, width: 0, height: 0 });
}

const { Editor } = await import("../../src/web/scripts/editor.js");

describe("Editor", () => {
  let parent;
  let editor;

  beforeEach(() => {
    parent = document.createElement("div");
    document.body.appendChild(parent);
    editor = new Editor(parent, "");
  });

  afterEach(() => {
    parent.remove();
  });

  describe("#content", () => {
    it("should return empty string for an editor initialized with no content", () => {
      assert.equal(editor.content(), "");
    });

    it("should return the initial content when constructed with a value", () => {
      const container = document.createElement("div");
      document.body.appendChild(container);
      const instance = new Editor(container, "hello world");
      assert.equal(instance.content(), "hello world");
      container.remove();
    });

    it("should return multiline initial content", () => {
      const container = document.createElement("div");
      document.body.appendChild(container);
      const instance = new Editor(container, "line1\nline2\nline3");
      assert.equal(instance.content(), "line1\nline2\nline3");
      container.remove();
    });
  });

  describe("#setContent", () => {
    it("should replace empty content with new content", () => {
      editor.setContent("new content");
      assert.equal(editor.content(), "new content");
    });

    it("should replace existing content with new content", () => {
      editor.setContent("first");
      assert.equal(editor.content(), "first");
      editor.setContent("second");
      assert.equal(editor.content(), "second");
    });

    it("should handle setting content to an empty string", () => {
      editor.setContent("something");
      assert.equal(editor.content(), "something");
      editor.setContent("");
      assert.equal(editor.content(), "");
    });

    it("should handle multiline content", () => {
      const multiline = '{\n  "key": "value"\n}';
      editor.setContent(multiline);
      assert.equal(editor.content(), multiline);
    });

    it("should handle unicode content", () => {
      editor.setContent("hello \u00e9\u00e8\u00ea \u4e16\u754c");
      assert.equal(editor.content(), "hello \u00e9\u00e8\u00ea \u4e16\u754c");
    });
  });
});
