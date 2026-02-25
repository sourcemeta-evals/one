import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

describe("Editor", () => {
  let dom;
  let cleanup;
  let Editor;

  before(async () => {
    dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", {
      pretendToBeVisual: true
    });

    // Expose the DOM globals that CodeMirror requires.
    // Use Object.defineProperty to handle read-only properties
    // like "navigator" that already exist on globalThis.
    const globals = [
      "window", "document", "navigator", "MutationObserver",
      "Range", "getComputedStyle", "requestAnimationFrame",
      "cancelAnimationFrame", "CustomEvent", "HTMLElement",
      "Node", "Text", "HTMLDivElement", "CSSStyleDeclaration",
      "DocumentFragment", "Element", "CharacterData"
    ];

    for (const key of globals) {
      if (dom.window[key] !== undefined) {
        const descriptor = Object.getOwnPropertyDescriptor(globalThis, key);
        if (descriptor && !descriptor.configurable) {
          continue;
        }
        Object.defineProperty(globalThis, key, {
          value: dom.window[key],
          writable: true,
          configurable: true
        });
      }
    }

    // Stub Range.prototype methods that jsdom may not implement
    if (typeof globalThis.Range !== "undefined") {
      const proto = globalThis.Range.prototype;
      if (!proto.getBoundingClientRect) {
        proto.getBoundingClientRect = () => ({
          x: 0, y: 0, width: 0, height: 0,
          top: 0, right: 0, bottom: 0, left: 0
        });
      }
      if (!proto.getClientRects) {
        proto.getClientRects = () => [];
      }
    }

    // Stub element methods that CodeMirror may query
    if (typeof globalThis.HTMLElement !== "undefined") {
      const proto = globalThis.HTMLElement.prototype;
      if (!proto.getBoundingClientRect) {
        proto.getBoundingClientRect = () => ({
          x: 0, y: 0, width: 0, height: 0,
          top: 0, right: 0, bottom: 0, left: 0
        });
      }
    }

    cleanup = () => {
      for (const key of globals) {
        const descriptor = Object.getOwnPropertyDescriptor(globalThis, key);
        if (descriptor && descriptor.configurable) {
          delete globalThis[key];
        }
      }
    };

    const mod = await import("../../src/web/scripts/editor.js");
    Editor = mod.Editor;
  });

  after(() => {
    // Close the jsdom window first so that pending requestAnimationFrame
    // callbacks scheduled by CodeMirror are cancelled before we remove
    // the DOM globals they depend on.
    if (dom) dom.window.close();
    if (cleanup) cleanup();
  });

  describe("setContent", () => {
    it("should replace the editor content with the given string", () => {
      const parent = document.createElement("div");
      const editor = new Editor(parent, "initial");
      assert.equal(editor.content(), "initial");
      editor.setContent("replacement");
      assert.equal(editor.content(), "replacement");
    });

    it("should set content on an initially empty editor", () => {
      const parent = document.createElement("div");
      const editor = new Editor(parent);
      assert.equal(editor.content(), "");
      editor.setContent("hello world");
      assert.equal(editor.content(), "hello world");
    });

    it("should handle multi-line content", () => {
      const parent = document.createElement("div");
      const editor = new Editor(parent);
      const multiline = "line one\nline two\nline three";
      editor.setContent(multiline);
      assert.equal(editor.content(), multiline);
    });

    it("should clear content when given an empty string", () => {
      const parent = document.createElement("div");
      const editor = new Editor(parent, "some content");
      editor.setContent("");
      assert.equal(editor.content(), "");
    });

    it("should allow setting content multiple times", () => {
      const parent = document.createElement("div");
      const editor = new Editor(parent, "first");
      editor.setContent("second");
      assert.equal(editor.content(), "second");
      editor.setContent("third");
      assert.equal(editor.content(), "third");
    });
  });

  describe("content", () => {
    it("should return the initial content passed to the constructor", () => {
      const parent = document.createElement("div");
      const editor = new Editor(parent, "constructor text");
      assert.equal(editor.content(), "constructor text");
    });

    it("should return an empty string for a default editor", () => {
      const parent = document.createElement("div");
      const editor = new Editor(parent);
      assert.equal(editor.content(), "");
    });

    it("should return a string", () => {
      const parent = document.createElement("div");
      const editor = new Editor(parent, "check type");
      assert.equal(typeof editor.content(), "string");
    });

    it("should reflect the latest setContent value", () => {
      const parent = document.createElement("div");
      const editor = new Editor(parent, "old");
      editor.setContent("new");
      assert.equal(editor.content(), "new");
    });
  });
});
