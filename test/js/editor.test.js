import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  pretendToBeVisual: true
});

Object.assign(globalThis, {
  window: dom.window,
  document: dom.window.document,
  HTMLElement: dom.window.HTMLElement,
  Element: dom.window.Element,
  Node: dom.window.Node,
  MutationObserver: dom.window.MutationObserver,
  requestAnimationFrame: dom.window.requestAnimationFrame.bind(dom.window),
  cancelAnimationFrame: dom.window.cancelAnimationFrame.bind(dom.window)
});

Object.defineProperty(globalThis, "navigator", {
  configurable: true,
  value: dom.window.navigator
});

if (!window.matchMedia) {
  window.matchMedia = () => ({
    matches: false,
    media: "",
    onchange: null,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent() { return false; }
  });
}

const { Editor } = await import("../../src/web/scripts/editor.js");

const cleanupEditors = [];

test.afterEach(() => {
  while (cleanupEditors.length > 0) {
    cleanupEditors.pop().view.destroy();
  }

  document.body.replaceChildren();
});

const createEditor = (initial = "") => {
  const parent = document.createElement("div");
  document.body.append(parent);
  const editor = new Editor(parent, initial);
  cleanupEditors.push(editor);
  return editor;
};

test("Editor#content returns the current editor contents", () => {
  const editor = createEditor('{"hello":"world"}');
  assert.equal(editor.content(), '{"hello":"world"}');
});

test("Editor#setContent replaces the full document content", () => {
  const editor = createEditor("first");
  editor.setContent("second\nline");
  assert.equal(editor.content(), "second\nline");
});

test("Editor#setContent supports clearing content", () => {
  const editor = createEditor("non-empty");
  editor.setContent("");
  assert.equal(editor.content(), "");
});
