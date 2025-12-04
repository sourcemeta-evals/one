import { JSDOM } from "jsdom";

const dom = new JSDOM("<!DOCTYPE html><html><body><div id=\"editor\"></div></body></html>", {
  pretendToBeVisual: true
});

const window = dom.window;

globalThis.window = window;
globalThis.document = window.document;
globalThis.getComputedStyle = window.getComputedStyle.bind(window);
globalThis.requestAnimationFrame = (callback) => setTimeout(callback, 0);
globalThis.cancelAnimationFrame = (id) => clearTimeout(id);
globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};
globalThis.MutationObserver = window.MutationObserver;
globalThis.Element = window.Element;
globalThis.HTMLElement = window.HTMLElement;
globalThis.Node = window.Node;
globalThis.Text = window.Text;
globalThis.Range = window.Range;
globalThis.DocumentFragment = window.DocumentFragment;
globalThis.DOMParser = window.DOMParser;

Object.defineProperty(globalThis, "navigator", {
  value: window.navigator,
  writable: false,
  configurable: true
});
