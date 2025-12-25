import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert";
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", {
  pretendToBeVisual: true
});

global.window = dom.window;
global.document = dom.window.document;
Object.defineProperty(global, "navigator", {
  value: dom.window.navigator,
  writable: true,
  configurable: true
});
global.MutationObserver = dom.window.MutationObserver;
global.getComputedStyle = dom.window.getComputedStyle;
global.requestAnimationFrame = (callback) => setTimeout(callback, 0);
global.cancelAnimationFrame = (id) => clearTimeout(id);

const { Editor } = await import("../../src/web/scripts/editor.js");

describe("Editor", () => {
  let container;
  let editor;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    if (editor && editor.view) {
      editor.view.destroy();
    }
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
    editor = null;
    container = null;
  });

  describe("content()", () => {
    it("returns empty string for editor initialized without content", () => {
      editor = new Editor(container);
      assert.strictEqual(editor.content(), "");
    });

    it("returns initial content when editor is initialized with content", () => {
      const initialContent = '{"type": "string"}';
      editor = new Editor(container, initialContent);
      assert.strictEqual(editor.content(), initialContent);
    });

    it("returns multiline content correctly", () => {
      const multilineContent = '{\n  "type": "object",\n  "properties": {}\n}';
      editor = new Editor(container, multilineContent);
      assert.strictEqual(editor.content(), multilineContent);
    });
  });

  describe("setContent()", () => {
    it("sets content on an empty editor", () => {
      editor = new Editor(container);
      const newContent = '{"type": "number"}';
      editor.setContent(newContent);
      assert.strictEqual(editor.content(), newContent);
    });

    it("replaces existing content", () => {
      const initialContent = '{"type": "string"}';
      editor = new Editor(container, initialContent);
      const newContent = '{"type": "boolean"}';
      editor.setContent(newContent);
      assert.strictEqual(editor.content(), newContent);
    });

    it("can set content to empty string", () => {
      const initialContent = '{"type": "string"}';
      editor = new Editor(container, initialContent);
      editor.setContent("");
      assert.strictEqual(editor.content(), "");
    });

    it("handles multiline content", () => {
      editor = new Editor(container);
      const multilineContent = '{\n  "type": "object",\n  "required": ["id"]\n}';
      editor.setContent(multilineContent);
      assert.strictEqual(editor.content(), multilineContent);
    });

    it("can be called multiple times", () => {
      editor = new Editor(container);
      editor.setContent("first");
      assert.strictEqual(editor.content(), "first");
      editor.setContent("second");
      assert.strictEqual(editor.content(), "second");
      editor.setContent("third");
      assert.strictEqual(editor.content(), "third");
    });
  });
});
