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
    test("returns empty array when no highlights exist", () => {
      const editor = new Editor(container, "hello world");
      assert.deepStrictEqual(editor.highlights(), []);
    });

    test("returns single highlight with correct range and color", () => {
      const editor = new Editor(container, "hello world");
      editor.highlight([1, 1, 1, 5], "#ff0000");
      const highlights = editor.highlights();
      assert.strictEqual(highlights.length, 1);
      assert.deepStrictEqual(highlights[0].range, [1, 1, 1, 5]);
      assert.strictEqual(highlights[0].color, "#ff0000");
    });

    test("returns multiple highlights in order", () => {
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

    test("returns highlight spanning multiple lines", () => {
      const editor = new Editor(container, "line 1\nline 2\nline 3");
      editor.highlight([1, 1, 3, 6], "#0000ff");
      const highlights = editor.highlights();
      assert.strictEqual(highlights.length, 1);
      assert.deepStrictEqual(highlights[0].range, [1, 1, 3, 6]);
      assert.strictEqual(highlights[0].color, "#0000ff");
    });

    test("returns empty array after unhighlight", () => {
      const editor = new Editor(container, "hello world");
      editor.highlight([1, 1, 1, 5], "#ff0000");
      editor.unhighlight();
      assert.deepStrictEqual(editor.highlights(), []);
    });

    test("returns highlights with various color formats", () => {
      const editor = new Editor(container, "hello world test");
      editor.highlight([1, 1, 1, 5], "red");
      const highlights = editor.highlights();
      assert.strictEqual(highlights.length, 1);
      assert.strictEqual(highlights[0].color, "red");
    });

    test("returns highlight at end of line", () => {
      const editor = new Editor(container, "hello");
      editor.highlight([1, 1, 1, 5], "#ff0000");
      const highlights = editor.highlights();
      assert.strictEqual(highlights.length, 1);
      assert.deepStrictEqual(highlights[0].range, [1, 1, 1, 5]);
    });

    test("returns highlight for single character", () => {
      const editor = new Editor(container, "hello");
      editor.highlight([1, 1, 1, 1], "#ff0000");
      const highlights = editor.highlights();
      assert.strictEqual(highlights.length, 1);
      assert.deepStrictEqual(highlights[0].range, [1, 1, 1, 1]);
    });

    test("returns highlights after content change preserves mapped positions", () => {
      const editor = new Editor(container, "hello world");
      editor.highlight([1, 7, 1, 11], "#ff0000");
      editor.setContent("hi world");
      const highlights = editor.highlights();
      assert.strictEqual(highlights.length, 1);
    });

    test("returns highlight on second line", () => {
      const editor = new Editor(container, "line 1\nline 2");
      editor.highlight([2, 1, 2, 6], "#ff0000");
      const highlights = editor.highlights();
      assert.strictEqual(highlights.length, 1);
      assert.deepStrictEqual(highlights[0].range, [2, 1, 2, 6]);
    });

    test("returns highlight on last line", () => {
      const editor = new Editor(container, "line 1\nline 2\nline 3");
      editor.highlight([3, 1, 3, 6], "#ff0000");
      const highlights = editor.highlights();
      assert.strictEqual(highlights.length, 1);
      assert.deepStrictEqual(highlights[0].range, [3, 1, 3, 6]);
    });

    test("returns multiple non-overlapping highlights", () => {
      const editor = new Editor(container, "line 1\nline 2\nline 3");
      editor.highlight([1, 1, 1, 6], "#ff0000");
      editor.highlight([2, 1, 2, 6], "#00ff00");
      editor.highlight([3, 1, 3, 6], "#0000ff");
      const highlights = editor.highlights();
      assert.strictEqual(highlights.length, 3);
      assert.strictEqual(highlights[0].color, "#ff0000");
      assert.strictEqual(highlights[1].color, "#00ff00");
      assert.strictEqual(highlights[2].color, "#0000ff");
    });

    test("returns highlight with rgb color format", () => {
      const editor = new Editor(container, "hello world");
      editor.highlight([1, 1, 1, 5], "rgb(255, 0, 0)");
      const highlights = editor.highlights();
      assert.strictEqual(highlights.length, 1);
      assert.strictEqual(highlights[0].color, "rgb(255, 0, 0)");
    });

    test("returns highlight with rgba color format", () => {
      const editor = new Editor(container, "hello world");
      editor.highlight([1, 1, 1, 5], "rgba(255, 0, 0, 0.5)");
      const highlights = editor.highlights();
      assert.strictEqual(highlights.length, 1);
      assert.strictEqual(highlights[0].color, "rgba(255, 0, 0, 0.5)");
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

    test("throws RangeError with descriptive message for lineStart greater than lineEnd", () => {
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

    test("allows valid range at start of single line", () => {
      const editor = new Editor(container, "hello world");
      editor.highlight([1, 1, 1, 5], "#ff0000");
      assert.strictEqual(editor.highlights().length, 1);
    });

    test("allows valid range at end of single line", () => {
      const editor = new Editor(container, "hello world");
      editor.highlight([1, 7, 1, 11], "#ff0000");
      assert.strictEqual(editor.highlights().length, 1);
    });

    test("allows valid range spanning entire line", () => {
      const editor = new Editor(container, "hello");
      editor.highlight([1, 1, 1, 5], "#ff0000");
      assert.strictEqual(editor.highlights().length, 1);
    });

    test("allows valid range on multiple lines", () => {
      const editor = new Editor(container, "line 1\nline 2\nline 3");
      editor.highlight([1, 1, 3, 6], "#ff0000");
      assert.strictEqual(editor.highlights().length, 1);
    });

    test("allows columnStart equal to columnEnd + 1 for zero-width highlight", () => {
      const editor = new Editor(container, "hello world");
      editor.highlight([1, 2, 1, 1], "#ff0000");
      assert.strictEqual(editor.highlights().length, 1);
    });

    test("allows columnEnd of 0 for highlight before first character", () => {
      const editor = new Editor(container, "hello world");
      editor.highlight([1, 1, 1, 0], "#ff0000");
      assert.strictEqual(editor.highlights().length, 1);
    });

    test("throws RangeError for negative lineStart", () => {
      const editor = new Editor(container, "hello world");
      assert.throws(
        () => editor.highlight([-1, 1, 1, 5], "#ff0000"),
        RangeError
      );
    });

    test("throws RangeError for negative lineEnd", () => {
      const editor = new Editor(container, "hello world");
      assert.throws(
        () => editor.highlight([1, 1, -1, 5], "#ff0000"),
        RangeError
      );
    });

    test("allows highlight on empty line", () => {
      const editor = new Editor(container, "line 1\n\nline 3");
      editor.highlight([2, 1, 2, 0], "#ff0000");
      assert.strictEqual(editor.highlights().length, 1);
    });

    test("throws RangeError for columnStart beyond empty line", () => {
      const editor = new Editor(container, "line 1\n\nline 3");
      assert.throws(
        () => editor.highlight([2, 2, 2, 0], "#ff0000"),
        RangeError
      );
    });

    test("throws RangeError for columnEnd beyond empty line", () => {
      const editor = new Editor(container, "line 1\n\nline 3");
      assert.throws(
        () => editor.highlight([2, 1, 2, 1], "#ff0000"),
        RangeError
      );
    });

    test("allows highlight at very end of document", () => {
      const editor = new Editor(container, "hello");
      editor.highlight([1, 5, 1, 5], "#ff0000");
      assert.strictEqual(editor.highlights().length, 1);
    });

    test("allows highlight spanning from first to last line", () => {
      const editor = new Editor(container, "a\nb\nc");
      editor.highlight([1, 1, 3, 1], "#ff0000");
      assert.strictEqual(editor.highlights().length, 1);
    });
  });

  describe("unhighlight", () => {
    test("removes single highlight", () => {
      const editor = new Editor(container, "hello world");
      editor.highlight([1, 1, 1, 5], "#ff0000");
      assert.strictEqual(editor.highlights().length, 1);
      editor.unhighlight();
      assert.strictEqual(editor.highlights().length, 0);
    });

    test("removes all highlights", () => {
      const editor = new Editor(container, "hello world");
      editor.highlight([1, 1, 1, 5], "#ff0000");
      editor.highlight([1, 7, 1, 11], "#00ff00");
      assert.strictEqual(editor.highlights().length, 2);
      editor.unhighlight();
      assert.strictEqual(editor.highlights().length, 0);
    });

    test("can be called when no highlights exist", () => {
      const editor = new Editor(container, "hello world");
      editor.unhighlight();
      assert.strictEqual(editor.highlights().length, 0);
    });

    test("can be called multiple times", () => {
      const editor = new Editor(container, "hello world");
      editor.highlight([1, 1, 1, 5], "#ff0000");
      editor.unhighlight();
      editor.unhighlight();
      assert.strictEqual(editor.highlights().length, 0);
    });

    test("allows new highlights after unhighlight", () => {
      const editor = new Editor(container, "hello world");
      editor.highlight([1, 1, 1, 5], "#ff0000");
      editor.unhighlight();
      editor.highlight([1, 7, 1, 11], "#00ff00");
      const highlights = editor.highlights();
      assert.strictEqual(highlights.length, 1);
      assert.strictEqual(highlights[0].color, "#00ff00");
    });
  });

  describe("highlight edge cases", () => {
    test("handles highlight on single character document", () => {
      const editor = new Editor(container, "a");
      editor.highlight([1, 1, 1, 1], "#ff0000");
      const highlights = editor.highlights();
      assert.strictEqual(highlights.length, 1);
      assert.deepStrictEqual(highlights[0].range, [1, 1, 1, 1]);
    });

    test("handles multiple highlights on same line", () => {
      const editor = new Editor(container, "hello world test");
      editor.highlight([1, 1, 1, 5], "#ff0000");
      editor.highlight([1, 7, 1, 11], "#00ff00");
      editor.highlight([1, 13, 1, 16], "#0000ff");
      const highlights = editor.highlights();
      assert.strictEqual(highlights.length, 3);
    });

    test("handles highlight with special characters in content", () => {
      const editor = new Editor(container, "hello <world> & \"test\"");
      editor.highlight([1, 1, 1, 5], "#ff0000");
      const highlights = editor.highlights();
      assert.strictEqual(highlights.length, 1);
    });

    test("handles highlight with unicode content", () => {
      const editor = new Editor(container, "hello 世界");
      editor.highlight([1, 1, 1, 5], "#ff0000");
      const highlights = editor.highlights();
      assert.strictEqual(highlights.length, 1);
    });

    test("handles highlight with tabs in content", () => {
      const editor = new Editor(container, "hello\tworld");
      editor.highlight([1, 1, 1, 5], "#ff0000");
      const highlights = editor.highlights();
      assert.strictEqual(highlights.length, 1);
    });

    test("handles highlight spanning lines with different lengths", () => {
      const editor = new Editor(container, "short\nvery long line here\nx");
      editor.highlight([1, 1, 3, 1], "#ff0000");
      const highlights = editor.highlights();
      assert.strictEqual(highlights.length, 1);
      assert.deepStrictEqual(highlights[0].range, [1, 1, 3, 1]);
    });

    test("handles many highlights", () => {
      const editor = new Editor(container, "a b c d e f g h i j");
      for (let i = 0; i < 10; i++) {
        editor.highlight([1, i * 2 + 1, 1, i * 2 + 1], "#ff0000");
      }
      const highlights = editor.highlights();
      assert.strictEqual(highlights.length, 10);
    });

    test("handles highlight with hsl color format", () => {
      const editor = new Editor(container, "hello world");
      editor.highlight([1, 1, 1, 5], "hsl(0, 100%, 50%)");
      const highlights = editor.highlights();
      assert.strictEqual(highlights.length, 1);
      assert.strictEqual(highlights[0].color, "hsl(0, 100%, 50%)");
    });

    test("handles highlight with named color", () => {
      const editor = new Editor(container, "hello world");
      editor.highlight([1, 1, 1, 5], "cornflowerblue");
      const highlights = editor.highlights();
      assert.strictEqual(highlights.length, 1);
      assert.strictEqual(highlights[0].color, "cornflowerblue");
    });

    test("preserves highlight order when adding multiple", () => {
      const editor = new Editor(container, "hello world test");
      editor.highlight([1, 13, 1, 16], "#0000ff");
      editor.highlight([1, 1, 1, 5], "#ff0000");
      editor.highlight([1, 7, 1, 11], "#00ff00");
      const highlights = editor.highlights();
      assert.strictEqual(highlights.length, 3);
      assert.strictEqual(highlights[0].color, "#ff0000");
      assert.strictEqual(highlights[1].color, "#00ff00");
      assert.strictEqual(highlights[2].color, "#0000ff");
    });
  });
});
