import assert from "node:assert/strict";
import test from "node:test";
import { JSDOM } from "jsdom";

import { Editor } from "../../src/web/scripts/editor.js";

const GLOBAL_KEYS = [
  "window",
  "document",
  "navigator",
  "Element",
  "HTMLElement",
  "Node",
  "DocumentFragment",
  "MutationObserver",
  "Range",
  "Text",
  "DOMRect",
  "requestAnimationFrame",
  "cancelAnimationFrame",
  "getSelection"
];

const restoreGlobal = (previousValues) => {
  for (const [ key, value ] of previousValues.entries()) {
    if (value === undefined) {
      delete globalThis[key];
    } else {
      Object.defineProperty(globalThis, key, {
        configurable: true,
        writable: true,
        value
      });
    }
  }
};

const installGlobal = (window) => {
  const previousValues = new Map();

  for (const key of GLOBAL_KEYS) {
    previousValues.set(key, globalThis[key]);
    const value = window[key];
    Object.defineProperty(globalThis, key, {
      configurable: true,
      writable: true,
      value: typeof value === "function" ? value.bind(window) : value
    });
  }

  previousValues.set("ResizeObserver", globalThis.ResizeObserver);
  if (!window.ResizeObserver) {
    Object.defineProperty(globalThis, "ResizeObserver", {
      configurable: true,
      writable: true,
      value: class {
        observe() {}
        unobserve() {}
        disconnect() {}
      }
    });
  }

  return previousValues;
};

test("Editor#content returns initial content", () => {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    pretendToBeVisual: true
  });
  const previousValues = installGlobal(dom.window);

  const parent = document.createElement("div");
  document.body.append(parent);
  const editor = new Editor(parent, "{\"name\":\"one\"}");

  assert.equal(editor.content(), "{\"name\":\"one\"}");

  editor.view.destroy();
  dom.window.close();
  restoreGlobal(previousValues);
});

test("Editor#setContent replaces the full editor content", () => {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    pretendToBeVisual: true
  });
  const previousValues = installGlobal(dom.window);

  const parent = document.createElement("div");
  document.body.append(parent);
  const editor = new Editor(parent, "{}");

  editor.setContent("{\n  \"type\": \"string\"\n}");
  assert.equal(editor.content(), "{\n  \"type\": \"string\"\n}");

  editor.view.destroy();
  dom.window.close();
  restoreGlobal(previousValues);
});
