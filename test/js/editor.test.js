import { describe, it, beforeEach } from "node:test";
import assert from "node:assert";
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!DOCTYPE html><html><body><div id=\"editor\"></div></body></html>", {
  pretendToBeVisual: true
});

dom.window.requestAnimationFrame = (callback) => setTimeout(callback, 0);
dom.window.cancelAnimationFrame = (id) => clearTimeout(id);

global.window = dom.window;
global.document = dom.window.document;
Object.defineProperty(global, "navigator", {
  value: dom.window.navigator,
  writable: true,
  configurable: true
});
global.MutationObserver = dom.window.MutationObserver;
global.getComputedStyle = dom.window.getComputedStyle;
global.requestAnimationFrame = dom.window.requestAnimationFrame;
global.cancelAnimationFrame = dom.window.cancelAnimationFrame;

const { Editor } = await import("../../src/web/scripts/editor.js");

describe("Editor", () => {
  let container;
  let editor;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  describe("#content", () => {
    it("should return empty string for empty editor", () => {
      editor = new Editor(container, "");
      assert.strictEqual(editor.content(), "");
    });

    it("should return initial content", () => {
      const initialContent = '{"key": "value"}';
      editor = new Editor(container, initialContent);
      assert.strictEqual(editor.content(), initialContent);
    });

    it("should return multiline content", () => {
      const multilineContent = '{\n  "key": "value"\n}';
      editor = new Editor(container, multilineContent);
      assert.strictEqual(editor.content(), multilineContent);
    });
  });

  describe("#setContent", () => {
    it("should set content on empty editor", () => {
      editor = new Editor(container, "");
      const newContent = '{"new": "content"}';
      editor.setContent(newContent);
      assert.strictEqual(editor.content(), newContent);
    });

    it("should replace existing content", () => {
      editor = new Editor(container, '{"old": "content"}');
      const newContent = '{"new": "content"}';
      editor.setContent(newContent);
      assert.strictEqual(editor.content(), newContent);
    });

    it("should handle empty string", () => {
      editor = new Editor(container, '{"some": "content"}');
      editor.setContent("");
      assert.strictEqual(editor.content(), "");
    });

    it("should handle multiline content", () => {
      editor = new Editor(container, "");
      const multilineContent = '{\n  "key": "value",\n  "another": "item"\n}';
      editor.setContent(multilineContent);
      assert.strictEqual(editor.content(), multilineContent);
    });

    it("should handle multiple setContent calls", () => {
      editor = new Editor(container, "");
      editor.setContent("first");
      editor.setContent("second");
      editor.setContent("third");
      assert.strictEqual(editor.content(), "third");
    });
  });
});
