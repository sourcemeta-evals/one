import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { JSDOM } from "jsdom";

import { Editor } from "../../src/web/scripts/editor.js";

let cleanup = null;
let editor = null;

const createRect = () => ({
  x: 0,
  y: 0,
  top: 0,
  bottom: 0,
  left: 0,
  right: 0,
  width: 0,
  height: 0,
  toJSON() {
    return this;
  }
});

const createClientRects = () => ({
  length: 0,
  item() {
    return null;
  },
  [Symbol.iterator]: function* () {}
});

const setupDom = () => {
  const dom = new JSDOM("<!doctype html><html><body><div id='editor'></div></body></html>", {
    pretendToBeVisual: true
  });
  const { window } = dom;

  const previous = new Map();
  const assignGlobal = (name, value) => {
    previous.set(name, globalThis[name]);
    Object.defineProperty(globalThis, name, {
      value,
      configurable: true,
      writable: true
    });
  };

  assignGlobal("window", window);
  assignGlobal("document", window.document);
  assignGlobal("navigator", window.navigator);
  assignGlobal("HTMLElement", window.HTMLElement);
  assignGlobal("Element", window.Element);
  assignGlobal("Node", window.Node);
  assignGlobal("Range", window.Range);
  assignGlobal("MutationObserver", window.MutationObserver);
  assignGlobal("getComputedStyle", window.getComputedStyle.bind(window));
  assignGlobal("requestAnimationFrame", (callback) => setTimeout(() => callback(Date.now()), 0));
  assignGlobal("cancelAnimationFrame", (id) => clearTimeout(id));

  if (!globalThis.ResizeObserver) {
    assignGlobal("ResizeObserver", class {
      observe() {}
      unobserve() {}
      disconnect() {}
    });
  }

  window.Range.prototype.getClientRects = createClientRects;
  window.Range.prototype.getBoundingClientRect = createRect;
  window.HTMLElement.prototype.getBoundingClientRect = createRect;

  return () => {
    dom.window.close();

    for (const [ name, value ] of previous.entries()) {
      if (typeof value === "undefined") {
        delete globalThis[name];
      } else {
        Object.defineProperty(globalThis, name, {
          value,
          configurable: true,
          writable: true
        });
      }
    }
  };
};

afterEach(async () => {
  if (editor) {
    editor.view.destroy();
    editor = null;
  }

  await new Promise((resolve) => setTimeout(resolve, 0));

  if (cleanup) {
    cleanup();
    cleanup = null;
  }
});

test("Editor#content returns initial contents", () => {
  cleanup = setupDom();
  const parent = document.getElementById("editor");

  editor = new Editor(parent, "{\n  \"hello\": \"world\"\n}");

  assert.equal(editor.content(), "{\n  \"hello\": \"world\"\n}");
});

test("Editor#setContent replaces the document contents", () => {
  cleanup = setupDom();
  const parent = document.getElementById("editor");

  editor = new Editor(parent, "before");
  editor.setContent("after");

  assert.equal(editor.content(), "after");
});
