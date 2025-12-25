import { describe, it } from "node:test";
import assert from "node:assert";
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!DOCTYPE html><html><body><div id=\"editor\"></div></body></html>", {
  url: "http://localhost",
  pretendToBeVisual: true
});

global.window = dom.window;
global.document = dom.window.document;
global.getComputedStyle = dom.window.getComputedStyle;
global.requestAnimationFrame = (callback) => setTimeout(callback, 0);
global.cancelAnimationFrame = (id) => clearTimeout(id);
global.MutationObserver = dom.window.MutationObserver;
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

Object.defineProperty(global, "navigator", {
  value: dom.window.navigator,
  writable: true,
  configurable: true
});

const { Editor } = await import("../../src/web/scripts/editor.js");

describe("Editor", () => {
  describe("setContent", () => {
    it("should set the editor content to the provided string", () => {
      const parent = document.getElementById("editor");
      const editor = new Editor(parent, "");

      editor.setContent("Hello, World!");

      assert.strictEqual(editor.content(), "Hello, World!");
    });

    it("should replace existing content with new content", () => {
      const parent = document.getElementById("editor");
      parent.innerHTML = "";
      const editor = new Editor(parent, "Initial content");

      editor.setContent("New content");

      assert.strictEqual(editor.content(), "New content");
    });

    it("should handle empty string content", () => {
      const parent = document.getElementById("editor");
      parent.innerHTML = "";
      const editor = new Editor(parent, "Some content");

      editor.setContent("");

      assert.strictEqual(editor.content(), "");
    });

    it("should handle multiline content", () => {
      const parent = document.getElementById("editor");
      parent.innerHTML = "";
      const editor = new Editor(parent, "");
      const multilineContent = "Line 1\nLine 2\nLine 3";

      editor.setContent(multilineContent);

      assert.strictEqual(editor.content(), multilineContent);
    });

    it("should handle JSON content", () => {
      const parent = document.getElementById("editor");
      parent.innerHTML = "";
      const editor = new Editor(parent, "", { json: true });
      const jsonContent = JSON.stringify({ key: "value", nested: { a: 1 } }, null, 2);

      editor.setContent(jsonContent);

      assert.strictEqual(editor.content(), jsonContent);
    });
  });

  describe("content", () => {
    it("should return the initial content when no changes are made", () => {
      const parent = document.getElementById("editor");
      parent.innerHTML = "";
      const initialContent = "Initial content";
      const editor = new Editor(parent, initialContent);

      assert.strictEqual(editor.content(), initialContent);
    });

    it("should return empty string for empty editor", () => {
      const parent = document.getElementById("editor");
      parent.innerHTML = "";
      const editor = new Editor(parent, "");

      assert.strictEqual(editor.content(), "");
    });

    it("should return the full document content as a string", () => {
      const parent = document.getElementById("editor");
      parent.innerHTML = "";
      const content = "Test content with special chars: <>&\"'";
      const editor = new Editor(parent, content);

      assert.strictEqual(editor.content(), content);
    });

    it("should preserve whitespace in content", () => {
      const parent = document.getElementById("editor");
      parent.innerHTML = "";
      const content = "  indented\n\ttabbed\n  spaces  ";
      const editor = new Editor(parent, content);

      assert.strictEqual(editor.content(), content);
    });

    it("should return updated content after setContent is called", () => {
      const parent = document.getElementById("editor");
      parent.innerHTML = "";
      const editor = new Editor(parent, "Original");

      editor.setContent("Updated");

      assert.strictEqual(editor.content(), "Updated");
    });
  });
});
