import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
  pretendToBeVisual: true
});

global.window = dom.window;
global.document = dom.window.document;
Object.defineProperty(global, 'navigator', {
  value: dom.window.navigator,
  writable: true,
  configurable: true
});
global.MutationObserver = dom.window.MutationObserver;
global.getComputedStyle = dom.window.getComputedStyle;
global.requestAnimationFrame = (callback) => setTimeout(callback, 0);
global.cancelAnimationFrame = (id) => clearTimeout(id);
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const { Editor } = await import('../../src/web/scripts/editor.js');

describe('Editor', () => {
  let parent;
  let editor;

  beforeEach(() => {
    parent = document.createElement('div');
    document.body.appendChild(parent);
  });

  afterEach(() => {
    if (parent && parent.parentNode) {
      parent.parentNode.removeChild(parent);
    }
    parent = null;
    editor = null;
  });

  describe('content()', () => {
    it('should return empty string when initialized with no content', () => {
      editor = new Editor(parent);
      assert.strictEqual(editor.content(), '');
    });

    it('should return initial content when initialized with content', () => {
      const initialContent = '{"type": "string"}';
      editor = new Editor(parent, initialContent);
      assert.strictEqual(editor.content(), initialContent);
    });

    it('should return multiline content correctly', () => {
      const multilineContent = '{\n  "type": "object",\n  "properties": {}\n}';
      editor = new Editor(parent, multilineContent);
      assert.strictEqual(editor.content(), multilineContent);
    });
  });

  describe('setContent()', () => {
    it('should set content on an empty editor', () => {
      editor = new Editor(parent);
      const newContent = '{"type": "number"}';
      editor.setContent(newContent);
      assert.strictEqual(editor.content(), newContent);
    });

    it('should replace existing content', () => {
      const initialContent = '{"type": "string"}';
      editor = new Editor(parent, initialContent);
      const newContent = '{"type": "boolean"}';
      editor.setContent(newContent);
      assert.strictEqual(editor.content(), newContent);
    });

    it('should handle empty string content', () => {
      const initialContent = '{"type": "string"}';
      editor = new Editor(parent, initialContent);
      editor.setContent('');
      assert.strictEqual(editor.content(), '');
    });

    it('should handle multiline content', () => {
      editor = new Editor(parent);
      const multilineContent = '{\n  "type": "array",\n  "items": {\n    "type": "string"\n  }\n}';
      editor.setContent(multilineContent);
      assert.strictEqual(editor.content(), multilineContent);
    });

    it('should handle multiple consecutive setContent calls', () => {
      editor = new Editor(parent);
      editor.setContent('first');
      editor.setContent('second');
      editor.setContent('third');
      assert.strictEqual(editor.content(), 'third');
    });
  });
});
