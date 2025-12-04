import { test, describe, beforeEach, afterEach } from "node:test";
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
    container.remove();
  });

  describe("content", () => {
    test("returns empty string for empty editor", () => {
      editor = new Editor(container);
      assert.strictEqual(editor.content(), "");
    });

    test("returns initial content", () => {
      const initialContent = "Hello, World!";
      editor = new Editor(container, initialContent);
      assert.strictEqual(editor.content(), initialContent);
    });

    test("returns multiline content", () => {
      const multilineContent = "Line 1\nLine 2\nLine 3";
      editor = new Editor(container, multilineContent);
      assert.strictEqual(editor.content(), multilineContent);
    });
  });

  describe("setContent", () => {
    test("sets content on empty editor", () => {
      editor = new Editor(container);
      const newContent = "New content";
      editor.setContent(newContent);
      assert.strictEqual(editor.content(), newContent);
    });

    test("replaces existing content", () => {
      editor = new Editor(container, "Initial content");
      const newContent = "Replaced content";
      editor.setContent(newContent);
      assert.strictEqual(editor.content(), newContent);
    });

    test("sets empty content", () => {
      editor = new Editor(container, "Some content");
      editor.setContent("");
      assert.strictEqual(editor.content(), "");
    });

    test("sets multiline content", () => {
      editor = new Editor(container);
      const multilineContent = "Line 1\nLine 2\nLine 3";
      editor.setContent(multilineContent);
      assert.strictEqual(editor.content(), multilineContent);
    });

    test("handles special characters", () => {
      editor = new Editor(container);
      const specialContent = "Special: \t\n\"quotes\" 'apostrophes' <tags>";
      editor.setContent(specialContent);
      assert.strictEqual(editor.content(), specialContent);
    });

    test("handles JSON content", () => {
      editor = new Editor(container, "", { json: true });
      const jsonContent = '{"key": "value", "number": 42}';
      editor.setContent(jsonContent);
      assert.strictEqual(editor.content(), jsonContent);
    });
  });
});
