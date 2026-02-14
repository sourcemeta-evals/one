import { JSDOM } from "jsdom";

const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", {
  pretendToBeVisual: true
});
global.window = dom.window;
global.document = dom.window.document;
Object.defineProperty(global, "navigator", {
  value: dom.window.navigator, configurable: true
});
global.MutationObserver = dom.window.MutationObserver;
global.CharacterData = dom.window.CharacterData;
global.DocumentFragment = dom.window.DocumentFragment;
global.Node = dom.window.Node;
global.getComputedStyle = dom.window.getComputedStyle;

import { describe, it } from "node:test";
import assert from "node:assert/strict";
const { Editor } = await import("../../src/web/scripts/editor.js");

describe("Editor", () => {
  describe("content", () => {
    it("should return the initial content", () => {
      const parent = document.createElement("div");
      const editor = new Editor(parent, "hello world");
      assert.equal(editor.content(), "hello world");
    });

    it("should return empty string when initialized without content", () => {
      const parent = document.createElement("div");
      const editor = new Editor(parent);
      assert.equal(editor.content(), "");
    });
  });

  describe("setContent", () => {
    it("should replace the editor content", () => {
      const parent = document.createElement("div");
      const editor = new Editor(parent, "initial");
      editor.setContent("updated");
      assert.equal(editor.content(), "updated");
    });

    it("should set content when editor starts empty", () => {
      const parent = document.createElement("div");
      const editor = new Editor(parent);
      editor.setContent("new content");
      assert.equal(editor.content(), "new content");
    });

    it("should handle setting content to empty string", () => {
      const parent = document.createElement("div");
      const editor = new Editor(parent, "something");
      editor.setContent("");
      assert.equal(editor.content(), "");
    });

    it("should handle multiline content", () => {
      const parent = document.createElement("div");
      const editor = new Editor(parent);
      const multiline = "line 1\nline 2\nline 3";
      editor.setContent(multiline);
      assert.equal(editor.content(), multiline);
    });

    it("should allow setting content multiple times", () => {
      const parent = document.createElement("div");
      const editor = new Editor(parent, "first");
      editor.setContent("second");
      editor.setContent("third");
      assert.equal(editor.content(), "third");
    });
  });
});
