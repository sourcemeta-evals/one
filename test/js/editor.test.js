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
    test("highlights returns empty array by default", () => {
      const editor = new Editor(container, "hello world");
      assert.deepStrictEqual(editor.highlights(), []);
    });

    test("highlights returns single highlight after highlight call", () => {
      const editor = new Editor(container, "hello world");
      editor.highlight([1, 1, 1, 5], "#ff0000");
      const highlights = editor.highlights();
      assert.strictEqual(highlights.length, 1);
      assert.deepStrictEqual(highlights[0].range, [1, 1, 1, 5]);
      assert.strictEqual(highlights[0].color, "#ff0000");
    });

    test("highlights returns multiple highlights after multiple highlight calls", () => {
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

    test("highlights returns empty array after unhighlight", () => {
      const editor = new Editor(container, "hello world");
      editor.highlight([1, 1, 1, 5], "#ff0000");
      editor.unhighlight();
      assert.deepStrictEqual(editor.highlights(), []);
    });

    test("highlights preserves range array values", () => {
      const editor = new Editor(container, "line 1\nline 2\nline 3");
      editor.highlight([1, 1, 3, 6], "#0000ff");
      const highlights = editor.highlights();
      assert.deepStrictEqual(highlights[0].range, [1, 1, 3, 6]);
    });

    test("highlights preserves color string", () => {
      const editor = new Editor(container, "hello world");
      editor.highlight([1, 1, 1, 5], "#abcdef");
      assert.strictEqual(editor.highlights()[0].color, "#abcdef");
    });

    test("highlights with multiline content", () => {
      const editor = new Editor(container, "line 1\nline 2\nline 3");
      editor.highlight([1, 1, 1, 6], "#ff0000");
      editor.highlight([2, 1, 2, 6], "#00ff00");
      editor.highlight([3, 1, 3, 6], "#0000ff");
      const highlights = editor.highlights();
      assert.strictEqual(highlights.length, 3);
      assert.deepStrictEqual(highlights[0].range, [1, 1, 1, 6]);
      assert.deepStrictEqual(highlights[1].range, [2, 1, 2, 6]);
      assert.deepStrictEqual(highlights[2].range, [3, 1, 3, 6]);
    });

    test("highlights spanning multiple lines", () => {
      const editor = new Editor(container, "line 1\nline 2\nline 3");
      editor.highlight([1, 3, 3, 4], "#ff00ff");
      const highlights = editor.highlights();
      assert.strictEqual(highlights.length, 1);
      assert.deepStrictEqual(highlights[0].range, [1, 3, 3, 4]);
      assert.strictEqual(highlights[0].color, "#ff00ff");
    });

    test("highlights does not mutate original range array", () => {
      const editor = new Editor(container, "hello world");
      const originalRange = [1, 1, 1, 5];
      editor.highlight(originalRange, "#ff0000");
      originalRange[0] = 999;
      const highlights = editor.highlights();
      assert.deepStrictEqual(highlights[0].range, [1, 1, 1, 5]);
    });

    test("highlights with zero columnEnd", () => {
      const editor = new Editor(container, "hello world");
      editor.highlight([1, 1, 1, 0], "#ff0000");
      const highlights = editor.highlights();
      assert.deepStrictEqual(highlights[0].range, [1, 1, 1, 0]);
    });

    test("highlights at end of line", () => {
      const editor = new Editor(container, "hello");
      editor.highlight([1, 1, 1, 5], "#ff0000");
      const highlights = editor.highlights();
      assert.deepStrictEqual(highlights[0].range, [1, 1, 1, 5]);
    });

    test("highlights single character", () => {
      const editor = new Editor(container, "hello world");
      editor.highlight([1, 1, 1, 1], "#ff0000");
      const highlights = editor.highlights();
      assert.deepStrictEqual(highlights[0].range, [1, 1, 1, 1]);
    });

    test("highlights entire single line", () => {
      const editor = new Editor(container, "hello world");
      editor.highlight([1, 1, 1, 11], "#ff0000");
      const highlights = editor.highlights();
      assert.deepStrictEqual(highlights[0].range, [1, 1, 1, 11]);
    });

    test("highlights with various color formats", () => {
      const editor = new Editor(container, "hello world");
      editor.highlight([1, 1, 1, 5], "#RGB");
      assert.strictEqual(editor.highlights()[0].color, "#RGB");
    });

    test("unhighlight clears all highlights", () => {
      const editor = new Editor(container, "line 1\nline 2\nline 3");
      editor.highlight([1, 1, 1, 6], "#ff0000");
      editor.highlight([2, 1, 2, 6], "#00ff00");
      editor.highlight([3, 1, 3, 6], "#0000ff");
      assert.strictEqual(editor.highlights().length, 3);
      editor.unhighlight();
      assert.strictEqual(editor.highlights().length, 0);
    });

    test("can add highlights after unhighlight", () => {
      const editor = new Editor(container, "hello world");
      editor.highlight([1, 1, 1, 5], "#ff0000");
      editor.unhighlight();
      editor.highlight([1, 7, 1, 11], "#00ff00");
      const highlights = editor.highlights();
      assert.strictEqual(highlights.length, 1);
      assert.deepStrictEqual(highlights[0].range, [1, 7, 1, 11]);
      assert.strictEqual(highlights[0].color, "#00ff00");
    });

    test("highlights on empty line", () => {
      const editor = new Editor(container, "line 1\n\nline 3");
      editor.highlight([1, 1, 1, 6], "#ff0000");
      editor.highlight([3, 1, 3, 6], "#0000ff");
      const highlights = editor.highlights();
      assert.strictEqual(highlights.length, 2);
    });

    test("highlights with same range different colors", () => {
      const editor = new Editor(container, "hello world");
      editor.highlight([1, 1, 1, 5], "#ff0000");
      editor.highlight([1, 1, 1, 5], "#00ff00");
      const highlights = editor.highlights();
      assert.strictEqual(highlights.length, 2);
      assert.strictEqual(highlights[0].color, "#ff0000");
      assert.strictEqual(highlights[1].color, "#00ff00");
    });

    test("highlights overlapping ranges", () => {
      const editor = new Editor(container, "hello world");
      editor.highlight([1, 1, 1, 7], "#ff0000");
      editor.highlight([1, 5, 1, 11], "#00ff00");
      const highlights = editor.highlights();
      assert.strictEqual(highlights.length, 2);
    });
  });

  describe("highlight range validation", () => {
    test("throws RangeError for lineStart less than 1", () => {
      const editor = new Editor(container, "hello world");
      assert.throws(
        () => editor.highlight([0, 1, 1, 5], "#ff0000"),
        RangeError
      );
    });

    test("throws RangeError for lineStart greater than total lines", () => {
      const editor = new Editor(container, "hello world");
      assert.throws(
        () => editor.highlight([2, 1, 2, 5], "#ff0000"),
        RangeError
      );
    });

    test("throws RangeError for lineEnd less than 1", () => {
      const editor = new Editor(container, "hello world");
      assert.throws(
        () => editor.highlight([1, 1, 0, 5], "#ff0000"),
        RangeError
      );
    });

    test("throws RangeError for lineEnd greater than total lines", () => {
      const editor = new Editor(container, "hello world");
      assert.throws(
        () => editor.highlight([1, 1, 2, 5], "#ff0000"),
        RangeError
      );
    });

    test("throws RangeError for lineStart greater than lineEnd", () => {
      const editor = new Editor(container, "line 1\nline 2");
      assert.throws(
        () => editor.highlight([2, 1, 1, 5], "#ff0000"),
        RangeError
      );
    });

    test("throws RangeError for columnStart less than 1", () => {
      const editor = new Editor(container, "hello world");
      assert.throws(
        () => editor.highlight([1, 0, 1, 5], "#ff0000"),
        RangeError
      );
    });

    test("throws RangeError for columnStart greater than line length + 1", () => {
      const editor = new Editor(container, "hello");
      assert.throws(
        () => editor.highlight([1, 7, 1, 5], "#ff0000"),
        RangeError
      );
    });

    test("throws RangeError for columnEnd less than 0", () => {
      const editor = new Editor(container, "hello world");
      assert.throws(
        () => editor.highlight([1, 1, 1, -1], "#ff0000"),
        RangeError
      );
    });

    test("throws RangeError for columnEnd greater than line length", () => {
      const editor = new Editor(container, "hello");
      assert.throws(
        () => editor.highlight([1, 1, 1, 6], "#ff0000"),
        RangeError
      );
    });

    test("throws RangeError for columnStart greater than columnEnd + 1 on same line", () => {
      const editor = new Editor(container, "hello world");
      assert.throws(
        () => editor.highlight([1, 5, 1, 2], "#ff0000"),
        RangeError
      );
    });

    test("throws RangeError with descriptive message for lineStart out of bounds", () => {
      const editor = new Editor(container, "hello world");
      assert.throws(
        () => editor.highlight([0, 1, 1, 5], "#ff0000"),
        { message: /lineStart 0 is out of bounds/ }
      );
    });

    test("throws RangeError with descriptive message for lineEnd out of bounds", () => {
      const editor = new Editor(container, "hello world");
      assert.throws(
        () => editor.highlight([1, 1, 5, 5], "#ff0000"),
        { message: /lineEnd 5 is out of bounds/ }
      );
    });

    test("throws RangeError with descriptive message for lineStart > lineEnd", () => {
      const editor = new Editor(container, "line 1\nline 2");
      assert.throws(
        () => editor.highlight([2, 1, 1, 5], "#ff0000"),
        { message: /lineStart 2 cannot be greater than lineEnd 1/ }
      );
    });

    test("throws RangeError with descriptive message for columnStart out of bounds", () => {
      const editor = new Editor(container, "hello");
      assert.throws(
        () => editor.highlight([1, 10, 1, 5], "#ff0000"),
        { message: /columnStart 10 is out of bounds/ }
      );
    });

    test("throws RangeError with descriptive message for columnEnd out of bounds", () => {
      const editor = new Editor(container, "hello");
      assert.throws(
        () => editor.highlight([1, 1, 1, 10], "#ff0000"),
        { message: /columnEnd 10 is out of bounds/ }
      );
    });

    test("throws RangeError with descriptive message for columnStart > columnEnd + 1", () => {
      const editor = new Editor(container, "hello world");
      assert.throws(
        () => editor.highlight([1, 8, 1, 3], "#ff0000"),
        { message: /columnStart 8 cannot be greater than columnEnd \+ 1/ }
      );
    });

    test("valid range at exact boundaries does not throw", () => {
      const editor = new Editor(container, "hello");
      assert.doesNotThrow(() => editor.highlight([1, 1, 1, 5], "#ff0000"));
    });

    test("valid range with columnStart at line length + 1 does not throw", () => {
      const editor = new Editor(container, "hello");
      assert.doesNotThrow(() => editor.highlight([1, 6, 1, 5], "#ff0000"));
    });

    test("valid range with columnEnd at 0 does not throw", () => {
      const editor = new Editor(container, "hello");
      assert.doesNotThrow(() => editor.highlight([1, 1, 1, 0], "#ff0000"));
    });

    test("valid multiline range does not throw", () => {
      const editor = new Editor(container, "line 1\nline 2\nline 3");
      assert.doesNotThrow(() => editor.highlight([1, 1, 3, 6], "#ff0000"));
    });

    test("negative lineStart throws RangeError", () => {
      const editor = new Editor(container, "hello world");
      assert.throws(
        () => editor.highlight([-1, 1, 1, 5], "#ff0000"),
        RangeError
      );
    });

    test("negative lineEnd throws RangeError", () => {
      const editor = new Editor(container, "hello world");
      assert.throws(
        () => editor.highlight([1, 1, -1, 5], "#ff0000"),
        RangeError
      );
    });

    test("very large lineStart throws RangeError", () => {
      const editor = new Editor(container, "hello world");
      assert.throws(
        () => editor.highlight([1000, 1, 1, 5], "#ff0000"),
        RangeError
      );
    });

    test("very large lineEnd throws RangeError", () => {
      const editor = new Editor(container, "hello world");
      assert.throws(
        () => editor.highlight([1, 1, 1000, 5], "#ff0000"),
        RangeError
      );
    });

    test("very large columnStart throws RangeError", () => {
      const editor = new Editor(container, "hello world");
      assert.throws(
        () => editor.highlight([1, 1000, 1, 5], "#ff0000"),
        RangeError
      );
    });

    test("very large columnEnd throws RangeError", () => {
      const editor = new Editor(container, "hello world");
      assert.throws(
        () => editor.highlight([1, 1, 1, 1000], "#ff0000"),
        RangeError
      );
    });

    test("range validation with empty content", () => {
      const editor = new Editor(container, "");
      assert.throws(
        () => editor.highlight([1, 1, 1, 1], "#ff0000"),
        RangeError
      );
    });

    test("range validation on second line", () => {
      const editor = new Editor(container, "line 1\nline 2");
      assert.doesNotThrow(() => editor.highlight([2, 1, 2, 6], "#ff0000"));
    });

    test("range validation columnEnd at exact line length", () => {
      const editor = new Editor(container, "hello");
      assert.doesNotThrow(() => editor.highlight([1, 1, 1, 5], "#ff0000"));
    });

    test("range validation columnEnd one past line length throws", () => {
      const editor = new Editor(container, "hello");
      assert.throws(
        () => editor.highlight([1, 1, 1, 6], "#ff0000"),
        RangeError
      );
    });

    test("range validation with lines of different lengths", () => {
      const editor = new Editor(container, "short\nlonger line here");
      assert.doesNotThrow(() => editor.highlight([1, 1, 1, 5], "#ff0000"));
      assert.doesNotThrow(() => editor.highlight([2, 1, 2, 16], "#00ff00"));
    });

    test("range validation spanning from short to long line", () => {
      const editor = new Editor(container, "short\nlonger line here");
      assert.doesNotThrow(() => editor.highlight([1, 1, 2, 16], "#ff0000"));
    });

    test("range validation spanning from long to short line", () => {
      const editor = new Editor(container, "longer line here\nshort");
      assert.doesNotThrow(() => editor.highlight([1, 1, 2, 5], "#ff0000"));
    });

    test("does not add highlight when RangeError is thrown", () => {
      const editor = new Editor(container, "hello world");
      try {
        editor.highlight([0, 1, 1, 5], "#ff0000");
      } catch (e) {}
      assert.deepStrictEqual(editor.highlights(), []);
    });

    test("previous highlights preserved when RangeError is thrown", () => {
      const editor = new Editor(container, "hello world");
      editor.highlight([1, 1, 1, 5], "#ff0000");
      try {
        editor.highlight([0, 1, 1, 5], "#00ff00");
      } catch (e) {}
      const highlights = editor.highlights();
      assert.strictEqual(highlights.length, 1);
      assert.strictEqual(highlights[0].color, "#ff0000");
    });
  });
});
