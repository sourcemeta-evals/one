import { describe, it, before, after, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { JSDOM } from 'jsdom';

describe('Editor', () => {
  let dom;
  let window;
  let document;
  let container;
  let Editor;
  let editor;
  const pendingTimeouts = new Set();

  before(async () => {
    dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
      pretendToBeVisual: true
    });
    window = dom.window;
    document = window.document;

    globalThis.window = window;
    globalThis.document = document;
    globalThis.getComputedStyle = window.getComputedStyle.bind(window);
    globalThis.requestAnimationFrame = (callback) => {
      const id = setTimeout(callback, 0);
      pendingTimeouts.add(id);
      return id;
    };
    globalThis.cancelAnimationFrame = (id) => {
      pendingTimeouts.delete(id);
      clearTimeout(id);
    };
    globalThis.MutationObserver = window.MutationObserver;
    globalThis.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
    globalThis.Element = window.Element;
    globalThis.Node = window.Node;
    globalThis.Range = window.Range;
    globalThis.Selection = window.Selection;
    globalThis.DocumentFragment = window.DocumentFragment;

    const editorModule = await import('../../src/web/scripts/editor.js');
    Editor = editorModule.Editor;
  });

  after(() => {
    for (const id of pendingTimeouts) {
      clearTimeout(id);
    }
    pendingTimeouts.clear();
    delete globalThis.window;
    delete globalThis.document;
    delete globalThis.getComputedStyle;
    delete globalThis.requestAnimationFrame;
    delete globalThis.cancelAnimationFrame;
    delete globalThis.MutationObserver;
    delete globalThis.ResizeObserver;
    delete globalThis.Element;
    delete globalThis.Node;
    delete globalThis.Range;
    delete globalThis.Selection;
    delete globalThis.DocumentFragment;
  });

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    if (editor && editor.view) {
      editor.view.destroy();
    }
    editor = null;
    container.remove();
  });

  describe('#content', () => {
    it('returns empty string for editor initialized without content', () => {
      editor = new Editor(container);
      assert.strictEqual(editor.content(), '');
    });

    it('returns initial content when editor is initialized with content', () => {
      const initialContent = '{"type": "string"}';
      editor = new Editor(container, initialContent);
      assert.strictEqual(editor.content(), initialContent);
    });

    it('returns multiline content correctly', () => {
      const multilineContent = '{\n  "type": "object",\n  "properties": {}\n}';
      editor = new Editor(container, multilineContent);
      assert.strictEqual(editor.content(), multilineContent);
    });
  });

  describe('#setContent', () => {
    it('sets content on an empty editor', () => {
      editor = new Editor(container);
      const newContent = '{"type": "number"}';
      editor.setContent(newContent);
      assert.strictEqual(editor.content(), newContent);
    });

    it('replaces existing content', () => {
      const initialContent = '{"type": "string"}';
      editor = new Editor(container, initialContent);
      const newContent = '{"type": "boolean"}';
      editor.setContent(newContent);
      assert.strictEqual(editor.content(), newContent);
    });

    it('can set content to empty string', () => {
      const initialContent = '{"type": "string"}';
      editor = new Editor(container, initialContent);
      editor.setContent('');
      assert.strictEqual(editor.content(), '');
    });

    it('handles multiline content', () => {
      editor = new Editor(container);
      const multilineContent = '{\n  "type": "array",\n  "items": {\n    "type": "string"\n  }\n}';
      editor.setContent(multilineContent);
      assert.strictEqual(editor.content(), multilineContent);
    });

    it('can be called multiple times', () => {
      editor = new Editor(container);
      editor.setContent('first');
      assert.strictEqual(editor.content(), 'first');
      editor.setContent('second');
      assert.strictEqual(editor.content(), 'second');
      editor.setContent('third');
      assert.strictEqual(editor.content(), 'third');
    });
  });
});
