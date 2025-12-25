import { describe, it } from 'node:test';
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
global.Element = dom.window.Element;
global.Range = dom.window.Range;
global.Node = dom.window.Node;
global.Text = dom.window.Text;
global.HTMLElement = dom.window.HTMLElement;

const { Editor } = await import('../../src/web/scripts/editor.js');

describe('Editor', () => {
  describe('#content()', () => {
    it('should return empty string for empty editor', () => {
      const container = document.createElement('div');
      document.body.appendChild(container);
      const editor = new Editor(container, '');
      assert.strictEqual(editor.content(), '');
      container.remove();
    });

    it('should return initial content passed to constructor', () => {
      const container = document.createElement('div');
      document.body.appendChild(container);
      const initialContent = '{"type": "string"}';
      const editor = new Editor(container, initialContent);
      assert.strictEqual(editor.content(), initialContent);
      container.remove();
    });

    it('should return multiline content correctly', () => {
      const container = document.createElement('div');
      document.body.appendChild(container);
      const multilineContent = '{\n  "type": "object",\n  "properties": {}\n}';
      const editor = new Editor(container, multilineContent);
      assert.strictEqual(editor.content(), multilineContent);
      container.remove();
    });
  });

  describe('#setContent()', () => {
    it('should update editor content', () => {
      const container = document.createElement('div');
      document.body.appendChild(container);
      const editor = new Editor(container, '');
      const newContent = '{"type": "number"}';
      editor.setContent(newContent);
      assert.strictEqual(editor.content(), newContent);
      container.remove();
    });

    it('should replace existing content', () => {
      const container = document.createElement('div');
      document.body.appendChild(container);
      const initialContent = '{"type": "string"}';
      const editor = new Editor(container, initialContent);
      const newContent = '{"type": "boolean"}';
      editor.setContent(newContent);
      assert.strictEqual(editor.content(), newContent);
      container.remove();
    });

    it('should handle empty string content', () => {
      const container = document.createElement('div');
      document.body.appendChild(container);
      const editor = new Editor(container, '{"type": "string"}');
      editor.setContent('');
      assert.strictEqual(editor.content(), '');
      container.remove();
    });

    it('should handle multiline content', () => {
      const container = document.createElement('div');
      document.body.appendChild(container);
      const editor = new Editor(container, '');
      const multilineContent = '{\n  "type": "array",\n  "items": {\n    "type": "string"\n  }\n}';
      editor.setContent(multilineContent);
      assert.strictEqual(editor.content(), multilineContent);
      container.remove();
    });

    it('should handle special characters in content', () => {
      const container = document.createElement('div');
      document.body.appendChild(container);
      const editor = new Editor(container, '');
      const contentWithSpecialChars = '{"description": "Test with \\"quotes\\" and \\n newlines"}';
      editor.setContent(contentWithSpecialChars);
      assert.strictEqual(editor.content(), contentWithSpecialChars);
      container.remove();
    });
  });
});
