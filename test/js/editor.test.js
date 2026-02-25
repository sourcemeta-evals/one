import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { JSDOM } from "jsdom";

import { Editor } from "../../src/web/scripts/editor.js";

let dom;
const originalGlobals = new Map();

const saveGlobal = (name, value) => {
  if (!originalGlobals.has(name)) {
    originalGlobals.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
  }

  Object.defineProperty(globalThis, name, {
    configurable: true,
    writable: true,
    value
  });
};

const restoreGlobals = () => {
  for (const [name, descriptor] of originalGlobals.entries()) {
    if (descriptor) {
      Object.defineProperty(globalThis, name, descriptor);
    } else {
      Reflect.deleteProperty(globalThis, name);
    }
  }

  originalGlobals.clear();
};

const patchMissingDomApis = (window) => {
  if (!window.Range.prototype.getClientRects) {
    Object.defineProperty(window.Range.prototype, "getClientRects", {
      configurable: true,
      value() {
        return {
          item() { return null; },
          length: 0,
          [Symbol.iterator]: function* () {}
        };
      }
    });
  }

  if (!window.Range.prototype.getBoundingClientRect) {
    Object.defineProperty(window.Range.prototype, "getBoundingClientRect", {
      configurable: true,
      value() {
        return new window.DOMRect(0, 0, 0, 0);
      }
    });
  }
};

const installJSDOMGlobals = (window) => {
  patchMissingDomApis(window);

  saveGlobal("window", window);
  saveGlobal("document", window.document);
  saveGlobal("navigator", window.navigator);
  saveGlobal("Node", window.Node);
  saveGlobal("Element", window.Element);
  saveGlobal("HTMLElement", window.HTMLElement);
  saveGlobal("MutationObserver", window.MutationObserver);
  saveGlobal("requestAnimationFrame", window.requestAnimationFrame.bind(window));
  saveGlobal("cancelAnimationFrame", window.cancelAnimationFrame.bind(window));
  saveGlobal("getSelection", window.getSelection.bind(window));
  saveGlobal("ResizeObserver", window.ResizeObserver ?? class {
    observe() {}
    unobserve() {}
    disconnect() {}
  });
};

const createEditor = (content = "") => {
  const parent = document.createElement("div");
  document.body.appendChild(parent);
  return new Editor(parent, content);
};

beforeEach(() => {
  dom = new JSDOM("<!doctype html><html><body></body></html>", {
    pretendToBeVisual: true
  });

  installJSDOMGlobals(dom.window);
});

afterEach(() => {
  restoreGlobals();
  dom.window.close();
});

test("Editor#content returns constructor content", () => {
  const editor = createEditor('{"type":"string"}');

  try {
    assert.equal(editor.content(), '{"type":"string"}');
  } finally {
    editor.view.destroy();
  }
});

test("Editor#setContent updates content returned by Editor#content", () => {
  const editor = createEditor('{"type":"string"}');

  try {
    editor.setContent('{"type":"number"}');
    assert.equal(editor.content(), '{"type":"number"}');
  } finally {
    editor.view.destroy();
  }
});
