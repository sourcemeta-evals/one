import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", {
  pretendToBeVisual: true
});

const globals = [
  "window", "document", "navigator", "MutationObserver",
  "getComputedStyle", "requestAnimationFrame", "cancelAnimationFrame",
  "Range", "Selection", "HTMLElement", "Node", "Text", "Element",
  "DocumentFragment", "CSSStyleDeclaration", "CharacterData",
  "StyleSheet", "CSSStyleSheet"
];

for (const name of globals) {
  Object.defineProperty(globalThis, name, {
    value: dom.window[name],
    writable: true,
    configurable: true
  });
}

const { Editor } = await import("../../src/web/scripts/editor.js");

describe("Editor", () => {

  describe("#content", () => {
    it("should return empty string for an empty editor", () => {
      const parent = document.createElement("div");
      const editor = new Editor(parent);
      assert.equal(editor.content(), "");
    });

    it("should return the initial contents", () => {
      const parent = document.createElement("div");
      const editor = new Editor(parent, "hello world");
      assert.equal(editor.content(), "hello world");
    });

    it("should return multiline initial contents", () => {
      const parent = document.createElement("div");
      const editor = new Editor(parent, "line one\nline two\nline three");
      assert.equal(editor.content(), "line one\nline two\nline three");
    });
  });

  describe("#setContent", () => {
    it("should replace empty content with new content", () => {
      const parent = document.createElement("div");
      const editor = new Editor(parent);
      editor.setContent("new content");
      assert.equal(editor.content(), "new content");
    });

    it("should replace existing content", () => {
      const parent = document.createElement("div");
      const editor = new Editor(parent, "old content");
      editor.setContent("new content");
      assert.equal(editor.content(), "new content");
    });

    it("should handle setting content to empty string", () => {
      const parent = document.createElement("div");
      const editor = new Editor(parent, "some content");
      editor.setContent("");
      assert.equal(editor.content(), "");
    });

    it("should handle multiline content", () => {
      const parent = document.createElement("div");
      const editor = new Editor(parent);
      editor.setContent("line 1\nline 2\nline 3");
      assert.equal(editor.content(), "line 1\nline 2\nline 3");
    });

    it("should handle multiple successive updates", () => {
      const parent = document.createElement("div");
      const editor = new Editor(parent, "first");
      editor.setContent("second");
      editor.setContent("third");
      assert.equal(editor.content(), "third");
    });

    it("should handle JSON content", () => {
      const parent = document.createElement("div");
      const json = JSON.stringify({ foo: "bar", baz: 42 }, null, 2);
      const editor = new Editor(parent);
      editor.setContent(json);
      assert.equal(editor.content(), json);
    });
  });
});
