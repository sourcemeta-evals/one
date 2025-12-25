import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { JSDOM } from 'jsdom';

describe('Editor', () => {
  let dom;
  let document;
  let window;
  let Editor;
  let originalNavigator;

  before(async () => {
    dom = new JSDOM('<!DOCTYPE html><html><body><div id="editor"></div></body></html>', {
      pretendToBeVisual: true
    });

    window = dom.window;
    document = window.document;

    originalNavigator = globalThis.navigator;

    globalThis.window = window;
    globalThis.document = document;
    Object.defineProperty(globalThis, 'navigator', {
      value: window.navigator,
      writable: true,
      configurable: true
    });
    globalThis.getSelection = window.getSelection.bind(window);
    globalThis.Node = window.Node;
    globalThis.Range = window.Range;
    globalThis.Element = window.Element;
    globalThis.HTMLElement = window.HTMLElement;
    globalThis.MutationObserver = window.MutationObserver;
    globalThis.requestAnimationFrame = (callback) => setTimeout(callback, 0);
    globalThis.cancelAnimationFrame = (id) => clearTimeout(id);

    const editorModule = await import('../../src/web/scripts/editor.js');
    Editor = editorModule.Editor;
  });

  after(() => {
    delete globalThis.window;
    delete globalThis.document;
    Object.defineProperty(globalThis, 'navigator', {
      value: originalNavigator,
      writable: true,
      configurable: true
    });
    delete globalThis.getSelection;
    delete globalThis.Node;
    delete globalThis.Range;
    delete globalThis.Element;
    delete globalThis.HTMLElement;
    delete globalThis.MutationObserver;
    delete globalThis.requestAnimationFrame;
    delete globalThis.cancelAnimationFrame;
    dom.window.close();
  });

  describe('#setContent', () => {
    it('should set the editor content', () => {
      const parent = document.getElementById('editor');
      const editor = new Editor(parent, '');

      editor.setContent('{"foo": "bar"}');

      assert.strictEqual(editor.content(), '{"foo": "bar"}');
    });

    it('should replace existing content', () => {
      const parent = document.getElementById('editor');
      parent.innerHTML = '';
      const editor = new Editor(parent, 'initial content');

      editor.setContent('new content');

      assert.strictEqual(editor.content(), 'new content');
    });

    it('should handle empty content', () => {
      const parent = document.getElementById('editor');
      parent.innerHTML = '';
      const editor = new Editor(parent, 'some content');

      editor.setContent('');

      assert.strictEqual(editor.content(), '');
    });
  });

  describe('#content', () => {
    it('should return the initial content', () => {
      const parent = document.getElementById('editor');
      parent.innerHTML = '';
      const editor = new Editor(parent, 'initial content');

      assert.strictEqual(editor.content(), 'initial content');
    });

    it('should return empty string for empty editor', () => {
      const parent = document.getElementById('editor');
      parent.innerHTML = '';
      const editor = new Editor(parent, '');

      assert.strictEqual(editor.content(), '');
    });

    it('should return multiline content', () => {
      const parent = document.getElementById('editor');
      parent.innerHTML = '';
      const multilineContent = '{\n  "type": "string"\n}';
      const editor = new Editor(parent, multilineContent);

      assert.strictEqual(editor.content(), multilineContent);
    });
  });
});
