import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

// Set up a jsdom environment before importing CodeMirror,
// as it expects standard browser globals to exist
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
global.requestAnimationFrame = dom.window.requestAnimationFrame;
global.cancelAnimationFrame = dom.window.cancelAnimationFrame;
global.CharacterData = dom.window.CharacterData;
global.Text = dom.window.Text;
global.HTMLElement = dom.window.HTMLElement;
global.Range = dom.window.Range;
global.StyleSheet = dom.window.StyleSheet;
global.CSSStyleSheet = dom.window.CSSStyleSheet;
global.ShadowRoot = dom.window.ShadowRoot;

const { Editor } = await import("../../src/web/scripts/editor.js");

describe("Editor", () => {
  let parent;

  beforeEach(() => {
    parent = document.createElement("div");
    document.body.appendChild(parent);
  });

  describe("content()", () => {
    it("should return empty string for an editor created with no content", () => {
      const editor = new Editor(parent);
      assert.equal(editor.content(), "");
    });

    it("should return the initial content passed to the constructor", () => {
      const editor = new Editor(parent, "hello world");
      assert.equal(editor.content(), "hello world");
    });

    it("should return multi-line initial content", () => {
      const editor = new Editor(parent, "line1\nline2\nline3");
      assert.equal(editor.content(), "line1\nline2\nline3");
    });
  });

  describe("setContent()", () => {
    it("should set content on an empty editor", () => {
      const editor = new Editor(parent);
      editor.setContent("new content");
      assert.equal(editor.content(), "new content");
    });

    it("should replace existing content", () => {
      const editor = new Editor(parent, "old content");
      editor.setContent("new content");
      assert.equal(editor.content(), "new content");
    });

    it("should handle setting empty content", () => {
      const editor = new Editor(parent, "some content");
      editor.setContent("");
      assert.equal(editor.content(), "");
    });

    it("should handle multi-line content", () => {
      const editor = new Editor(parent);
      editor.setContent("line1\nline2\nline3");
      assert.equal(editor.content(), "line1\nline2\nline3");
    });

    it("should handle consecutive setContent calls", () => {
      const editor = new Editor(parent);
      editor.setContent("first");
      editor.setContent("second");
      editor.setContent("third");
      assert.equal(editor.content(), "third");
    });
  });
});
