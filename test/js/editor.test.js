import { describe, it, before, after, afterEach } from "node:test";
import assert from "node:assert";
import { JSDOM } from "jsdom";

describe("Editor", () => {
  let dom;
  let Editor;
  let container;
  const editors = [];

  before(async () => {
    dom = new JSDOM("<!DOCTYPE html><html><body><div id=\"editor\"></div></body></html>", {
      pretendToBeVisual: true
    });

    global.window = dom.window;
    global.document = dom.window.document;
    global.MutationObserver = dom.window.MutationObserver;
    global.getComputedStyle = dom.window.getComputedStyle;
    global.requestAnimationFrame = (callback) => setTimeout(callback, 0);
    global.cancelAnimationFrame = (id) => clearTimeout(id);
    global.Range = dom.window.Range;
    global.Node = dom.window.Node;
    global.Element = dom.window.Element;
    global.HTMLElement = dom.window.HTMLElement;

    const editorModule = await import("../../src/web/scripts/editor.js");
    Editor = editorModule.Editor;

    container = document.getElementById("editor");
  });

  afterEach(() => {
    for (const editor of editors) {
      editor.view.destroy();
    }
    editors.length = 0;
  });

  after(() => {
    delete global.window;
    delete global.document;
    delete global.MutationObserver;
    delete global.getComputedStyle;
    delete global.requestAnimationFrame;
    delete global.cancelAnimationFrame;
    delete global.Range;
    delete global.Node;
    delete global.Element;
    delete global.HTMLElement;
  });

  function createEditor(...args) {
    const editor = new Editor(...args);
    editors.push(editor);
    return editor;
  }

  describe("#setContent", () => {
    it("should set the content of the editor", () => {
      const editor = createEditor(container, "initial content");
      editor.setContent("new content");
      assert.strictEqual(editor.content(), "new content");
    });

    it("should replace existing content completely", () => {
      const editor = createEditor(container, "first");
      editor.setContent("second");
      editor.setContent("third");
      assert.strictEqual(editor.content(), "third");
    });

    it("should handle empty string content", () => {
      const editor = createEditor(container, "some content");
      editor.setContent("");
      assert.strictEqual(editor.content(), "");
    });

    it("should handle multiline content", () => {
      const editor = createEditor(container);
      const multiline = "line1\nline2\nline3";
      editor.setContent(multiline);
      assert.strictEqual(editor.content(), multiline);
    });
  });

  describe("#content", () => {
    it("should return the initial content", () => {
      const editor = createEditor(container, "hello world");
      assert.strictEqual(editor.content(), "hello world");
    });

    it("should return empty string for empty editor", () => {
      const editor = createEditor(container, "");
      assert.strictEqual(editor.content(), "");
    });

    it("should return empty string when no initial content provided", () => {
      const editor = createEditor(container);
      assert.strictEqual(editor.content(), "");
    });

    it("should preserve whitespace in content", () => {
      const content = "  indented\n\ttabbed  ";
      const editor = createEditor(container, content);
      assert.strictEqual(editor.content(), content);
    });

    it("should handle JSON content", () => {
      const jsonContent = '{"key": "value", "number": 42}';
      const editor = createEditor(container, jsonContent, { json: true });
      assert.strictEqual(editor.content(), jsonContent);
    });
  });
});
