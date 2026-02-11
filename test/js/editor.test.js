import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
globalThis.document = dom.window.document;
Object.defineProperty(globalThis, "window", { value: dom.window, writable: true });
Object.defineProperty(globalThis, "navigator", { value: dom.window.navigator, writable: true });
globalThis.MutationObserver = dom.window.MutationObserver;
globalThis.StyleSheet = dom.window.StyleSheet;
globalThis.CSSStyleSheet = dom.window.CSSStyleSheet;
globalThis.ShadowRoot = dom.window.ShadowRoot;
globalThis.requestAnimationFrame = (callback) => setTimeout(callback, 0);
globalThis.cancelAnimationFrame = (id) => clearTimeout(id);

if (!dom.window.requestAnimationFrame) {
  dom.window.requestAnimationFrame = globalThis.requestAnimationFrame;
  dom.window.cancelAnimationFrame = globalThis.cancelAnimationFrame;
}

const { Editor } = await import("../../src/web/scripts/editor.js");

describe("Editor", () => {
  let parent;
  let editor;

  beforeEach(() => {
    parent = document.createElement("div");
    document.body.appendChild(parent);
    editor = new Editor(parent);
  });

  describe("content", () => {
    it("should return empty string for a new editor", () => {
      assert.equal(editor.content(), "");
    });

    it("should return the initial content passed to the constructor", () => {
      const container = document.createElement("div");
      document.body.appendChild(container);
      const instance = new Editor(container, "hello world");
      assert.equal(instance.content(), "hello world");
    });
  });

  describe("setContent", () => {
    it("should replace content in an empty editor", () => {
      editor.setContent("new content");
      assert.equal(editor.content(), "new content");
    });

    it("should replace existing content", () => {
      editor.setContent("first");
      assert.equal(editor.content(), "first");
      editor.setContent("second");
      assert.equal(editor.content(), "second");
    });

    it("should handle empty string", () => {
      editor.setContent("something");
      assert.equal(editor.content(), "something");
      editor.setContent("");
      assert.equal(editor.content(), "");
    });

    it("should handle multiline content", () => {
      const multiline = "line1\nline2\nline3";
      editor.setContent(multiline);
      assert.equal(editor.content(), multiline);
    });

    it("should handle JSON content", () => {
      const json = JSON.stringify({ key: "value", num: 42 }, null, 2);
      editor.setContent(json);
      assert.equal(editor.content(), json);
    });
  });
});
