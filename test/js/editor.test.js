import assert from "node:assert";
import { describe, it, beforeEach } from "node:test";
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", {
  pretendToBeVisual: true
});

dom.window.requestAnimationFrame = (callback) => setTimeout(callback, 0);
dom.window.cancelAnimationFrame = (id) => clearTimeout(id);

global.document = dom.window.document;
global.window = dom.window;
global.MutationObserver = dom.window.MutationObserver;
global.getComputedStyle = dom.window.getComputedStyle;
global.Element = dom.window.Element;
global.HTMLElement = dom.window.HTMLElement;
global.Node = dom.window.Node;
global.Text = dom.window.Text;
global.Range = dom.window.Range;
global.Selection = dom.window.Selection;

const { Editor } = await import("../../src/web/scripts/editor.js");

describe("Editor", () => {
  let container;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  describe("content()", () => {
    it("should return empty string for empty editor", () => {
      const editor = new Editor(container);
      assert.strictEqual(editor.content(), "");
    });

    it("should return initial content passed to constructor", () => {
      const initialContent = '{"key": "value"}';
      const editor = new Editor(container, initialContent);
      assert.strictEqual(editor.content(), initialContent);
    });

    it("should return multiline content correctly", () => {
      const multilineContent = '{\n  "key": "value"\n}';
      const editor = new Editor(container, multilineContent);
      assert.strictEqual(editor.content(), multilineContent);
    });
  });

  describe("setContent()", () => {
    it("should set content on empty editor", () => {
      const editor = new Editor(container);
      const newContent = '{"new": "content"}';
      editor.setContent(newContent);
      assert.strictEqual(editor.content(), newContent);
    });

    it("should replace existing content", () => {
      const initialContent = '{"initial": "content"}';
      const editor = new Editor(container, initialContent);
      const newContent = '{"replaced": "content"}';
      editor.setContent(newContent);
      assert.strictEqual(editor.content(), newContent);
    });

    it("should handle empty string", () => {
      const editor = new Editor(container, '{"some": "content"}');
      editor.setContent("");
      assert.strictEqual(editor.content(), "");
    });

    it("should handle multiline content", () => {
      const editor = new Editor(container);
      const multilineContent = '{\n  "key": "value",\n  "nested": {\n    "deep": true\n  }\n}';
      editor.setContent(multilineContent);
      assert.strictEqual(editor.content(), multilineContent);
    });

    it("should handle multiple consecutive setContent calls", () => {
      const editor = new Editor(container);
      editor.setContent("first");
      editor.setContent("second");
      editor.setContent("third");
      assert.strictEqual(editor.content(), "third");
    });
  });
});
