import { test, describe, beforeEach } from "node:test";
import assert from "node:assert";
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!DOCTYPE html><html><body><div id=\"editor\"></div></body></html>");

// Additional stubs needed by CodeMirror
global.document = dom.window.document;
global.window = dom.window;
global.MutationObserver = dom.window.MutationObserver;
dom.window.requestAnimationFrame = (callback) => setTimeout(callback, 16);
dom.window.cancelAnimationFrame = (id) => clearTimeout(id);
dom.window.Range.prototype.getClientRects = () => [];
dom.window.Range.prototype.getBoundingClientRect = () =>
  ({ top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0 });

// Dynamic import is required because static imports are hoisted and execute
// before any code runs. The JSDOM globals must be set up before CodeMirror
// loads, as it checks for browser APIs like MutationObserver at import time
const { Editor } = await import("../../src/web/scripts/editor.js");

describe("Editor", () => {
  const container = document.getElementById("editor");

  beforeEach(() => {
    container.innerHTML = "";
  });

  test("content returns empty string by default", () => {
    const editor = new Editor(container);
    assert.strictEqual(editor.content(), "");
  });

  test("content returns initial content", () => {
    const editor = new Editor(container, "hello world");
    assert.strictEqual(editor.content(), "hello world");
  });

  test("content returns multiline content", () => {
    const editor = new Editor(container, "line 1\nline 2\nline 3");
    assert.strictEqual(editor.content(), "line 1\nline 2\nline 3");
  });

  test("setContent replaces empty content", () => {
    const editor = new Editor(container);
    editor.setContent("new content");
    assert.strictEqual(editor.content(), "new content");
  });

  test("setContent replaces existing content", () => {
    const editor = new Editor(container, "initial");
    editor.setContent("replaced");
    assert.strictEqual(editor.content(), "replaced");
  });

  test("setContent with empty string clears content", () => {
    const editor = new Editor(container, "some content");
    editor.setContent("");
    assert.strictEqual(editor.content(), "");
  });

  test("setContent can be called multiple times", () => {
    const editor = new Editor(container, "first");
    editor.setContent("second");
    editor.setContent("third");
    assert.strictEqual(editor.content(), "third");
  });

  test("setContent handles multiline content", () => {
    const editor = new Editor(container);
    editor.setContent("line 1\nline 2\nline 3");
    assert.strictEqual(editor.content(), "line 1\nline 2\nline 3");
  });

  describe("highlights", () => {
    test("highlights returns empty array when no highlights exist", () => {
      const editor = new Editor(container, "hello world");
      assert.deepStrictEqual(editor.highlights(), []);
    });

    test("highlights returns single highlight with correct range and color", () => {
      const editor = new Editor(container, "hello world");
      editor.highlight([1, 1, 1, 5], "#ff0000");
      const highlights = editor.highlights();
      assert.strictEqual(highlights.length, 1);
      assert.deepStrictEqual(highlights[0].range, [1, 1, 1, 5]);
      assert.strictEqual(highlights[0].color, "#ff0000");
    });

    test("highlights returns multiple highlights in order", () => {
      const editor = new Editor(container, "hello world");
      editor.highlight([1, 1, 1, 5], "#ff0000");
      editor.highlight([1, 7, 1, 11], "#00ff00");
      const highlights = editor.highlights();
      assert.strictEqual(highlights.length, 2);
      assert.deepStrictEqual(highlights[0].range, [1, 1, 1, 5]);
      assert.strictEqual(highlights[0].color, "#ff0000");
      assert.deepStrictEqual(highlights[1].range, [1, 7, 1, 11]);
      assert.strictEqual(highlights[1].color, "#00ff00");
    });

    test("highlights returns correct range for multiline highlight", () => {
      const editor = new Editor(container, "line 1\nline 2\nline 3");
      editor.highlight([1, 1, 3, 6], "#0000ff");
      const highlights = editor.highlights();
      assert.strictEqual(highlights.length, 1);
      assert.deepStrictEqual(highlights[0].range, [1, 1, 3, 6]);
      assert.strictEqual(highlights[0].color, "#0000ff");
    });

    test("highlights returns empty array after unhighlight", () => {
      const editor = new Editor(container, "hello world");
      editor.highlight([1, 1, 1, 5], "#ff0000");
      editor.unhighlight();
      assert.deepStrictEqual(editor.highlights(), []);
    });

    test("highlights preserves color format exactly", () => {
      const editor = new Editor(container, "hello world");
      editor.highlight([1, 1, 1, 5], "rgb(255, 0, 0)");
      const highlights = editor.highlights();
      assert.strictEqual(highlights[0].color, "rgb(255, 0, 0)");
    });

    test("highlights works with hex color codes", () => {
      const editor = new Editor(container, "hello world");
      editor.highlight([1, 1, 1, 5], "#abc123");
      const highlights = editor.highlights();
      assert.strictEqual(highlights[0].color, "#abc123");
    });

    test("highlights works with named colors", () => {
      const editor = new Editor(container, "hello world");
      editor.highlight([1, 1, 1, 5], "red");
      const highlights = editor.highlights();
      assert.strictEqual(highlights[0].color, "red");
    });

    test("highlights returns correct range for single character", () => {
      const editor = new Editor(container, "hello");
      editor.highlight([1, 1, 1, 1], "#ff0000");
      const highlights = editor.highlights();
      assert.deepStrictEqual(highlights[0].range, [1, 1, 1, 1]);
    });

    test("highlights returns correct range for entire line", () => {
      const editor = new Editor(container, "hello");
      editor.highlight([1, 1, 1, 5], "#ff0000");
      const highlights = editor.highlights();
      assert.deepStrictEqual(highlights[0].range, [1, 1, 1, 5]);
    });

    test("highlights returns correct range spanning multiple lines", () => {
      const editor = new Editor(container, "abc\ndef\nghi");
      editor.highlight([1, 2, 3, 2], "#ff0000");
      const highlights = editor.highlights();
      assert.deepStrictEqual(highlights[0].range, [1, 2, 3, 2]);
    });

    test("highlights accumulates multiple non-overlapping highlights", () => {
      const editor = new Editor(container, "abcdefghij");
      editor.highlight([1, 1, 1, 3], "#ff0000");
      editor.highlight([1, 5, 1, 7], "#00ff00");
      editor.highlight([1, 9, 1, 10], "#0000ff");
      const highlights = editor.highlights();
      assert.strictEqual(highlights.length, 3);
    });

    test("highlights works after setContent", () => {
      const editor = new Editor(container, "initial");
      editor.setContent("new content here");
      editor.highlight([1, 1, 1, 3], "#ff0000");
      const highlights = editor.highlights();
      assert.strictEqual(highlights.length, 1);
      assert.deepStrictEqual(highlights[0].range, [1, 1, 1, 3]);
    });

    test("highlights on middle line of multiline content", () => {
      const editor = new Editor(container, "line 1\nline 2\nline 3");
      editor.highlight([2, 1, 2, 6], "#ff0000");
      const highlights = editor.highlights();
      assert.strictEqual(highlights.length, 1);
      assert.deepStrictEqual(highlights[0].range, [2, 1, 2, 6]);
    });

    test("highlights on last line of multiline content", () => {
      const editor = new Editor(container, "line 1\nline 2\nline 3");
      editor.highlight([3, 1, 3, 6], "#ff0000");
      const highlights = editor.highlights();
      assert.strictEqual(highlights.length, 1);
      assert.deepStrictEqual(highlights[0].range, [3, 1, 3, 6]);
    });

    test("highlights with columnEnd at 0 for empty selection at line start", () => {
      const editor = new Editor(container, "hello");
      editor.highlight([1, 1, 1, 0], "#ff0000");
      const highlights = editor.highlights();
      assert.deepStrictEqual(highlights[0].range, [1, 1, 1, 0]);
    });
  });

  describe("highlight range validation", () => {
    test("highlight throws RangeError for lineStart less than 1", () => {
      const editor = new Editor(container, "hello world");
      assert.throws(
        () => editor.highlight([0, 1, 1, 5], "#ff0000"),
        RangeError
      );
    });

    test("highlight throws RangeError for lineStart greater than total lines", () => {
      const editor = new Editor(container, "hello world");
      assert.throws(
        () => editor.highlight([2, 1, 2, 5], "#ff0000"),
        RangeError
      );
    });

    test("highlight throws RangeError for lineEnd less than 1", () => {
      const editor = new Editor(container, "hello world");
      assert.throws(
        () => editor.highlight([1, 1, 0, 5], "#ff0000"),
        RangeError
      );
    });

    test("highlight throws RangeError for lineEnd greater than total lines", () => {
      const editor = new Editor(container, "hello world");
      assert.throws(
        () => editor.highlight([1, 1, 2, 5], "#ff0000"),
        RangeError
      );
    });

    test("highlight throws RangeError for negative lineStart", () => {
      const editor = new Editor(container, "hello world");
      assert.throws(
        () => editor.highlight([-1, 1, 1, 5], "#ff0000"),
        RangeError
      );
    });

    test("highlight throws RangeError for negative lineEnd", () => {
      const editor = new Editor(container, "hello world");
      assert.throws(
        () => editor.highlight([1, 1, -1, 5], "#ff0000"),
        RangeError
      );
    });

    test("highlight throws RangeError when lineStart greater than lineEnd", () => {
      const editor = new Editor(container, "line 1\nline 2\nline 3");
      assert.throws(
        () => editor.highlight([3, 1, 1, 5], "#ff0000"),
        RangeError
      );
    });

    test("highlight throws RangeError for columnStart less than 1", () => {
      const editor = new Editor(container, "hello world");
      assert.throws(
        () => editor.highlight([1, 0, 1, 5], "#ff0000"),
        RangeError
      );
    });

    test("highlight throws RangeError for columnStart greater than line length plus 1", () => {
      const editor = new Editor(container, "hello");
      assert.throws(
        () => editor.highlight([1, 7, 1, 5], "#ff0000"),
        RangeError
      );
    });

    test("highlight throws RangeError for negative columnStart", () => {
      const editor = new Editor(container, "hello world");
      assert.throws(
        () => editor.highlight([1, -1, 1, 5], "#ff0000"),
        RangeError
      );
    });

    test("highlight throws RangeError for columnEnd less than 0", () => {
      const editor = new Editor(container, "hello world");
      assert.throws(
        () => editor.highlight([1, 1, 1, -1], "#ff0000"),
        RangeError
      );
    });

    test("highlight throws RangeError for columnEnd greater than line length", () => {
      const editor = new Editor(container, "hello");
      assert.throws(
        () => editor.highlight([1, 1, 1, 6], "#ff0000"),
        RangeError
      );
    });

    test("highlight throws RangeError when columnStart greater than columnEnd on same line", () => {
      const editor = new Editor(container, "hello world");
      assert.throws(
        () => editor.highlight([1, 5, 1, 2], "#ff0000"),
        RangeError
      );
    });

    test("highlight allows columnStart equal to columnEnd plus 1 on same line", () => {
      const editor = new Editor(container, "hello");
      assert.doesNotThrow(
        () => editor.highlight([1, 1, 1, 0], "#ff0000")
      );
    });

    test("highlight throws RangeError with descriptive message for lineStart", () => {
      const editor = new Editor(container, "hello world");
      assert.throws(
        () => editor.highlight([5, 1, 5, 5], "#ff0000"),
        { message: /lineStart 5 is out of bounds/ }
      );
    });

    test("highlight throws RangeError with descriptive message for lineEnd", () => {
      const editor = new Editor(container, "hello world");
      assert.throws(
        () => editor.highlight([1, 1, 5, 5], "#ff0000"),
        { message: /lineEnd 5 is out of bounds/ }
      );
    });

    test("highlight throws RangeError with descriptive message for columnStart", () => {
      const editor = new Editor(container, "hello");
      assert.throws(
        () => editor.highlight([1, 10, 1, 5], "#ff0000"),
        { message: /columnStart 10 is out of bounds/ }
      );
    });

    test("highlight throws RangeError with descriptive message for columnEnd", () => {
      const editor = new Editor(container, "hello");
      assert.throws(
        () => editor.highlight([1, 1, 1, 10], "#ff0000"),
        { message: /columnEnd 10 is out of bounds/ }
      );
    });

    test("highlight validates range on multiline content", () => {
      const editor = new Editor(container, "line 1\nline 2\nline 3");
      assert.throws(
        () => editor.highlight([4, 1, 4, 5], "#ff0000"),
        RangeError
      );
    });

    test("highlight validates columnEnd against correct line length", () => {
      const editor = new Editor(container, "short\nlonger line here");
      assert.throws(
        () => editor.highlight([1, 1, 1, 20], "#ff0000"),
        RangeError
      );
    });

    test("highlight allows valid range at exact line boundaries", () => {
      const editor = new Editor(container, "hello");
      assert.doesNotThrow(
        () => editor.highlight([1, 1, 1, 5], "#ff0000")
      );
    });

    test("highlight allows columnStart at line length plus 1", () => {
      const editor = new Editor(container, "hello");
      assert.doesNotThrow(
        () => editor.highlight([1, 6, 1, 5], "#ff0000")
      );
    });

    test("highlight allows valid multiline range", () => {
      const editor = new Editor(container, "line 1\nline 2\nline 3");
      assert.doesNotThrow(
        () => editor.highlight([1, 1, 3, 6], "#ff0000")
      );
    });

    test("highlight allows columnStart greater than columnEnd across lines", () => {
      const editor = new Editor(container, "line 1\nline 2");
      assert.doesNotThrow(
        () => editor.highlight([1, 5, 2, 2], "#ff0000")
      );
    });

    test("highlight throws RangeError for empty content with any range", () => {
      const editor = new Editor(container, "");
      assert.throws(
        () => editor.highlight([1, 1, 1, 1], "#ff0000"),
        RangeError
      );
    });

    test("highlight validates after setContent changes line count", () => {
      const editor = new Editor(container, "line 1\nline 2\nline 3");
      editor.setContent("single line");
      assert.throws(
        () => editor.highlight([2, 1, 2, 5], "#ff0000"),
        RangeError
      );
    });
  });

  describe("unhighlight", () => {
    test("unhighlight clears single highlight", () => {
      const editor = new Editor(container, "hello world");
      editor.highlight([1, 1, 1, 5], "#ff0000");
      editor.unhighlight();
      assert.deepStrictEqual(editor.highlights(), []);
    });

    test("unhighlight clears multiple highlights", () => {
      const editor = new Editor(container, "hello world");
      editor.highlight([1, 1, 1, 5], "#ff0000");
      editor.highlight([1, 7, 1, 11], "#00ff00");
      editor.unhighlight();
      assert.deepStrictEqual(editor.highlights(), []);
    });

    test("unhighlight on empty highlights does not throw", () => {
      const editor = new Editor(container, "hello world");
      assert.doesNotThrow(() => editor.unhighlight());
    });

    test("unhighlight can be called multiple times", () => {
      const editor = new Editor(container, "hello world");
      editor.highlight([1, 1, 1, 5], "#ff0000");
      editor.unhighlight();
      editor.unhighlight();
      assert.deepStrictEqual(editor.highlights(), []);
    });

    test("highlight works after unhighlight", () => {
      const editor = new Editor(container, "hello world");
      editor.highlight([1, 1, 1, 5], "#ff0000");
      editor.unhighlight();
      editor.highlight([1, 7, 1, 11], "#00ff00");
      const highlights = editor.highlights();
      assert.strictEqual(highlights.length, 1);
      assert.deepStrictEqual(highlights[0].range, [1, 7, 1, 11]);
    });
  });
});
