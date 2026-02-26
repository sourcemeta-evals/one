import assert from "node:assert/strict";
import test from "node:test";
import { JSDOM } from "jsdom";

const setupDOM = () => {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    pretendToBeVisual: true,
    url: "http://localhost"
  });

  const { window } = dom;

  globalThis.window = window;
  globalThis.document = window.document;
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: window.navigator
  });
  globalThis.Node = window.Node;
  globalThis.Element = window.Element;
  globalThis.HTMLElement = window.HTMLElement;
  globalThis.Text = window.Text;
  globalThis.Event = window.Event;
  globalThis.MutationObserver = window.MutationObserver;
  globalThis.DOMRect = window.DOMRect;
  globalThis.Range = window.Range;
  globalThis.getSelection = window.getSelection.bind(window);
  globalThis.requestAnimationFrame = window.requestAnimationFrame.bind(window);
  globalThis.cancelAnimationFrame = window.cancelAnimationFrame.bind(window);

  if (!window.ResizeObserver) {
    class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    }

    window.ResizeObserver = ResizeObserver;
  }

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

  globalThis.ResizeObserver = window.ResizeObserver;
  globalThis.matchMedia = window.matchMedia.bind(window);

  if (!window.Range.prototype.getClientRects) {
    window.Range.prototype.getClientRects = () => [];
  }

  if (!window.Range.prototype.getBoundingClientRect) {
    window.Range.prototype.getBoundingClientRect = () => new window.DOMRect();
  }

  return dom;
};

let dom;
let Editor;

test.before(async () => {
  dom = setupDOM();
  ({ Editor } = await import("../../src/web/scripts/editor.js"));
});

test.after(() => {
  if (dom) {
    dom.window.close();
  }
});

test("Editor#content returns the initial contents", () => {
  const parent = document.createElement("div");
  document.body.append(parent);

  const editor = new Editor(parent, "{\n  \"hello\": \"world\"\n}");

  assert.equal(editor.content(), "{\n  \"hello\": \"world\"\n}");

  editor.view.destroy();
  parent.remove();
});

test("Editor#setContent replaces the document contents", () => {
  const parent = document.createElement("div");
  document.body.append(parent);

  const editor = new Editor(parent, "before");
  editor.setContent("after\nline two");

  assert.equal(editor.content(), "after\nline two");

  editor.setContent("");
  assert.equal(editor.content(), "");

  editor.view.destroy();
  parent.remove();
});
