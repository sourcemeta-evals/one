import { describe, it, beforeEach } from "node:test";
import assert from "node:assert";
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", {
  pretendToBeVisual: true
});

globalThis.window = dom.window;
globalThis.document = dom.window.document;
Object.defineProperty(globalThis, "navigator", {
  value: dom.window.navigator,
  writable: true,
  configurable: true
});
globalThis.getComputedStyle = dom.window.getComputedStyle;
globalThis.requestAnimationFrame = (callback) => setTimeout(callback, 0);
globalThis.cancelAnimationFrame = (id) => clearTimeout(id);
globalThis.MutationObserver = dom.window.MutationObserver;
globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};
globalThis.Element = dom.window.Element;
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.Range = dom.window.Range;
globalThis.Node = dom.window.Node;
globalThis.Text = dom.window.Text;
globalThis.DocumentFragment = dom.window.DocumentFragment;

const { Editor } = await import("../../src/web/scripts/editor.js");

describe("Editor", () => {
  let container;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  describe("content", () => {
    it("should return empty string for empty editor", () => {
      const editor = new Editor(container);
      assert.strictEqual(editor.content(), "");
    });

    it("should return initial content", () => {
      const editor = new Editor(container, "hello world");
      assert.strictEqual(editor.content(), "hello world");
    });

    it("should return multiline content", () => {
      const content = "line 1\nline 2\nline 3";
      const editor = new Editor(container, content);
      assert.strictEqual(editor.content(), content);
    });
  });

  describe("setContent", () => {
    it("should set content on empty editor", () => {
      const editor = new Editor(container);
      editor.setContent("new content");
      assert.strictEqual(editor.content(), "new content");
    });

    it("should replace existing content", () => {
      const editor = new Editor(container, "old content");
      editor.setContent("new content");
      assert.strictEqual(editor.content(), "new content");
    });

    it("should handle empty string", () => {
      const editor = new Editor(container, "some content");
      editor.setContent("");
      assert.strictEqual(editor.content(), "");
    });

    it("should handle multiline content", () => {
      const editor = new Editor(container);
      const multiline = "first\nsecond\nthird";
      editor.setContent(multiline);
      assert.strictEqual(editor.content(), multiline);
    });

    it("should handle JSON content", () => {
      const editor = new Editor(container, "", { json: true });
      const jsonContent = '{"key": "value"}';
      editor.setContent(jsonContent);
      assert.strictEqual(editor.content(), jsonContent);
    });
  });
});
