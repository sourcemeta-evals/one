import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

// Set up a minimal DOM environment before importing CodeMirror modules.
// CodeMirror accesses browser globals at module load time.
const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", {
  pretendToBeVisual: true
});

// Expose jsdom globals so CodeMirror modules resolve them at load time
global.window = dom.window;
global.document = dom.window.document;
Object.defineProperty(global, "navigator", {
  value: dom.window.navigator, writable: true, configurable: true
});
global.MutationObserver = dom.window.MutationObserver;
global.Range = dom.window.Range;
global.CSSStyleSheet = dom.window.CSSStyleSheet;
global.StyleSheet = dom.window.StyleSheet;
global.ShadowRoot = dom.window.ShadowRoot;
global.getComputedStyle = dom.window.getComputedStyle;
global.requestAnimationFrame = dom.window.requestAnimationFrame;
global.cancelAnimationFrame = dom.window.cancelAnimationFrame;
global.CharacterData = dom.window.CharacterData;
global.DOMParser = dom.window.DOMParser;

// Stub Range.prototype methods that CodeMirror relies on
if (!dom.window.Range.prototype.getBoundingClientRect) {
  dom.window.Range.prototype.getBoundingClientRect = () => ({
    bottom: 0, height: 0, left: 0, right: 0, top: 0, width: 0
  });
}

if (!dom.window.Range.prototype.getClientRects) {
  dom.window.Range.prototype.getClientRects = () => [];
}

const { Editor } = await import("../../src/web/scripts/editor.js");

describe("Editor", () => {
  let parent;
  let editor;

  beforeEach(() => {
    parent = dom.window.document.createElement("div");
    dom.window.document.body.appendChild(parent);
    editor = new Editor(parent);
  });

  describe("#content", () => {
    it("should return an empty string for a new editor with no initial content", () => {
      assert.equal(editor.content(), "");
    });

    it("should return the initial content when constructed with a string", () => {
      const container = dom.window.document.createElement("div");
      dom.window.document.body.appendChild(container);
      const editorWithContent = new Editor(container, "hello world");
      assert.equal(editorWithContent.content(), "hello world");
    });
  });

  describe("#setContent", () => {
    it("should replace the editor content with the given string", () => {
      editor.setContent("new content");
      assert.equal(editor.content(), "new content");
    });

    it("should replace existing content", () => {
      editor.setContent("first");
      editor.setContent("second");
      assert.equal(editor.content(), "second");
    });

    it("should handle empty string", () => {
      editor.setContent("something");
      editor.setContent("");
      assert.equal(editor.content(), "");
    });

    it("should handle multiline content", () => {
      const multiline = "line 1\nline 2\nline 3";
      editor.setContent(multiline);
      assert.equal(editor.content(), multiline);
    });

    it("should handle content with special characters", () => {
      const special = '{"key": "value", "arr": [1, 2, 3]}';
      editor.setContent(special);
      assert.equal(editor.content(), special);
    });
  });
});
