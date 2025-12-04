import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!DOCTYPE html><html><body><div id="editor"></div></body></html>', {
  pretendToBeVisual: true
});

globalThis.window = dom.window;
globalThis.document = dom.window.document;
Object.defineProperty(globalThis, 'navigator', {
  value: dom.window.navigator,
  writable: true,
  configurable: true
});
globalThis.getComputedStyle = dom.window.getComputedStyle;
globalThis.requestAnimationFrame = (callback) => setTimeout(callback, 0);
globalThis.cancelAnimationFrame = (id) => clearTimeout(id);
globalThis.MutationObserver = dom.window.MutationObserver;
globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const { Editor } = await import('../../src/web/scripts/editor.js');

describe('Editor', () => {
  after(() => {
    dom.window.close();
  });

  describe('setContent', () => {
    it('should set the editor content', () => {
      const parent = document.getElementById('editor');
      const editor = new Editor(parent, '');

      editor.setContent('{"foo": "bar"}');

      assert.strictEqual(editor.content(), '{"foo": "bar"}');
    });

    it('should replace existing content', () => {
      const parent = document.getElementById('editor');
      const editor = new Editor(parent, 'initial content');

      editor.setContent('new content');

      assert.strictEqual(editor.content(), 'new content');
    });

    it('should handle empty content', () => {
      const parent = document.getElementById('editor');
      const editor = new Editor(parent, 'some content');

      editor.setContent('');

      assert.strictEqual(editor.content(), '');
    });

    it('should handle multiline content', () => {
      const parent = document.getElementById('editor');
      const editor = new Editor(parent, '');
      const multilineContent = '{\n  "key": "value",\n  "number": 42\n}';

      editor.setContent(multilineContent);

      assert.strictEqual(editor.content(), multilineContent);
    });
  });

  describe('content', () => {
    it('should return initial content', () => {
      const parent = document.getElementById('editor');
      const initialContent = '{"initial": true}';
      const editor = new Editor(parent, initialContent);

      assert.strictEqual(editor.content(), initialContent);
    });

    it('should return empty string for empty editor', () => {
      const parent = document.getElementById('editor');
      const editor = new Editor(parent, '');

      assert.strictEqual(editor.content(), '');
    });

    it('should return content after multiple setContent calls', () => {
      const parent = document.getElementById('editor');
      const editor = new Editor(parent, 'first');

      editor.setContent('second');
      editor.setContent('third');

      assert.strictEqual(editor.content(), 'third');
    });
  });
});
