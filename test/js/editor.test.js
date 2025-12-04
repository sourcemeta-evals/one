import { describe, it, beforeEach } from "node:test";
import assert from "node:assert";
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!DOCTYPE html><html><body><div id=\"editor\"></div></body></html>", {
  url: "http://localhost",
  pretendToBeVisual: true
});

global.window = dom.window;
global.document = dom.window.document;
Object.defineProperty(global, "navigator", {
  value: dom.window.navigator,
  writable: true,
  configurable: true
});
global.getComputedStyle = dom.window.getComputedStyle;
global.requestAnimationFrame = (callback) => setTimeout(callback, 0);
global.cancelAnimationFrame = (id) => clearTimeout(id);
global.MutationObserver = dom.window.MutationObserver;
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const { Editor } = await import("../../src/web/scripts/editor.js");

describe("Editor", () => {
  let parent;
  let editor;

  beforeEach(() => {
    parent = document.createElement("div");
    document.body.appendChild(parent);
    editor = new Editor(parent, "");
  });

  describe("#content", () => {
    it("should return empty string for empty editor", () => {
      assert.strictEqual(editor.content(), "");
    });

    it("should return initial content when editor is created with content", () => {
      const initialContent = '{"key": "value"}';
      const editorWithContent = new Editor(parent, initialContent);
      assert.strictEqual(editorWithContent.content(), initialContent);
    });
  });

  describe("#setContent", () => {
    it("should set content on empty editor", () => {
      const newContent = '{"foo": "bar"}';
      editor.setContent(newContent);
      assert.strictEqual(editor.content(), newContent);
    });

    it("should replace existing content", () => {
      editor.setContent("initial content");
      editor.setContent("replaced content");
      assert.strictEqual(editor.content(), "replaced content");
    });

    it("should handle multiline content", () => {
      const multilineContent = '{\n  "key": "value",\n  "number": 42\n}';
      editor.setContent(multilineContent);
      assert.strictEqual(editor.content(), multilineContent);
    });

    it("should handle empty string", () => {
      editor.setContent("some content");
      editor.setContent("");
      assert.strictEqual(editor.content(), "");
    });
  });
});
