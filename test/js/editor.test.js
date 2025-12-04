import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import { JSDOM } from "jsdom";

describe("Editor", () => {
  let dom;
  let Editor;
  let originalWindow;
  let originalDocument;

  before(async () => {
    dom = new JSDOM("<!DOCTYPE html><html><body><div id=\"editor\"></div></body></html>", {
      pretendToBeVisual: true
    });

    originalWindow = global.window;
    originalDocument = global.document;

    global.window = dom.window;
    global.document = dom.window.document;
    global.MutationObserver = dom.window.MutationObserver;
    global.getComputedStyle = dom.window.getComputedStyle;
    global.requestAnimationFrame = (callback) => setTimeout(callback, 0);
    global.cancelAnimationFrame = (id) => clearTimeout(id);
    global.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    };

    const editorModule = await import("../../src/web/scripts/editor.js");
    Editor = editorModule.Editor;
  });

  after(() => {
    global.window = originalWindow;
    global.document = originalDocument;
    delete global.MutationObserver;
    delete global.getComputedStyle;
    delete global.requestAnimationFrame;
    delete global.cancelAnimationFrame;
    delete global.ResizeObserver;
  });

  describe("setContent", () => {
    it("should set the editor content", () => {
      const parent = document.createElement("div");
      document.body.appendChild(parent);

      const editor = new Editor(parent, "");
      editor.setContent("hello world");

      assert.strictEqual(editor.content(), "hello world");

      parent.remove();
    });

    it("should replace existing content", () => {
      const parent = document.createElement("div");
      document.body.appendChild(parent);

      const editor = new Editor(parent, "initial content");
      editor.setContent("new content");

      assert.strictEqual(editor.content(), "new content");

      parent.remove();
    });

    it("should handle empty string", () => {
      const parent = document.createElement("div");
      document.body.appendChild(parent);

      const editor = new Editor(parent, "some content");
      editor.setContent("");

      assert.strictEqual(editor.content(), "");

      parent.remove();
    });

    it("should handle multiline content", () => {
      const parent = document.createElement("div");
      document.body.appendChild(parent);

      const editor = new Editor(parent, "");
      const multiline = "line 1\nline 2\nline 3";
      editor.setContent(multiline);

      assert.strictEqual(editor.content(), multiline);

      parent.remove();
    });
  });

  describe("content", () => {
    it("should return the initial content", () => {
      const parent = document.createElement("div");
      document.body.appendChild(parent);

      const editor = new Editor(parent, "initial");

      assert.strictEqual(editor.content(), "initial");

      parent.remove();
    });

    it("should return empty string for empty editor", () => {
      const parent = document.createElement("div");
      document.body.appendChild(parent);

      const editor = new Editor(parent, "");

      assert.strictEqual(editor.content(), "");

      parent.remove();
    });

    it("should return content with special characters", () => {
      const parent = document.createElement("div");
      document.body.appendChild(parent);

      const content = '{"key": "value", "number": 123}';
      const editor = new Editor(parent, content);

      assert.strictEqual(editor.content(), content);

      parent.remove();
    });
  });
});
