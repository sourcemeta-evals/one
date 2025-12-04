import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!DOCTYPE html><html><body><div id="editor"></div></body></html>', {
  pretendToBeVisual: true
});

global.window = dom.window;
global.document = dom.window.document;
Object.defineProperty(global, 'navigator', {
  value: dom.window.navigator,
  writable: true,
  configurable: true
});
global.getComputedStyle = dom.window.getComputedStyle;
global.requestAnimationFrame = (callback) => setTimeout(callback, 0);
global.cancelAnimationFrame = (id) => clearTimeout(id);
global.MutationObserver = dom.window.MutationObserver;
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};
global.Range = dom.window.Range;
global.Element = dom.window.Element;
global.HTMLElement = dom.window.HTMLElement;

const { Editor } = await import('../../src/web/scripts/editor.js');

describe('Editor', () => {
  let container;
  let editor;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    if (editor && editor.view) {
      editor.view.destroy();
    }
    container.remove();
  });

  describe('setContent', () => {
    it('should set content on an empty editor', () => {
      editor = new Editor(container, '');
      const newContent = '{"key": "value"}';
      editor.setContent(newContent);
      assert.strictEqual(editor.content(), newContent);
    });

    it('should replace existing content', () => {
      editor = new Editor(container, 'initial content');
      const newContent = 'replaced content';
      editor.setContent(newContent);
      assert.strictEqual(editor.content(), newContent);
    });

    it('should handle multiline content', () => {
      editor = new Editor(container, '');
      const multilineContent = '{\n  "name": "test",\n  "value": 123\n}';
      editor.setContent(multilineContent);
      assert.strictEqual(editor.content(), multilineContent);
    });

    it('should handle empty string', () => {
      editor = new Editor(container, 'some content');
      editor.setContent('');
      assert.strictEqual(editor.content(), '');
    });
  });

  describe('content', () => {
    it('should return initial content', () => {
      const initialContent = 'hello world';
      editor = new Editor(container, initialContent);
      assert.strictEqual(editor.content(), initialContent);
    });

    it('should return empty string for empty editor', () => {
      editor = new Editor(container, '');
      assert.strictEqual(editor.content(), '');
    });

    it('should return content with special characters', () => {
      const specialContent = '{"emoji": "🎉", "unicode": "日本語"}';
      editor = new Editor(container, specialContent);
      assert.strictEqual(editor.content(), specialContent);
    });

    it('should preserve whitespace', () => {
      const whitespaceContent = '  leading\n\ttab\n  trailing  ';
      editor = new Editor(container, whitespaceContent);
      assert.strictEqual(editor.content(), whitespaceContent);
    });
  });
});
