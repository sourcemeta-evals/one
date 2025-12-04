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
      assert.deepStrictEqual(editor.highlights(), [
        { range: [1, 1, 1, 5], color: "#ff0000" }
      ]);
    });

    test("highlights returns multiple highlights", () => {
      const editor = new Editor(container, "hello world");
      editor.highlight([1, 1, 1, 5], "#ff0000");
      editor.highlight([1, 7, 1, 11], "#00ff00");
      assert.deepStrictEqual(editor.highlights(), [
        { range: [1, 1, 1, 5], color: "#ff0000" },
        { range: [1, 7, 1, 11], color: "#00ff00" }
      ]);
    });

    test("highlights returns copy of internal array", () => {
      const editor = new Editor(container, "hello world");
      editor.highlight([1, 1, 1, 5], "#ff0000");
      const highlights1 = editor.highlights();
      const highlights2 = editor.highlights();
      assert.notStrictEqual(highlights1, highlights2);
      assert.deepStrictEqual(highlights1, highlights2);
    });

    test("highlights returns copy of range arrays", () => {
      const editor = new Editor(container, "hello world");
      editor.highlight([1, 1, 1, 5], "#ff0000");
      const highlights = editor.highlights();
      highlights[0].range[0] = 999;
      assert.deepStrictEqual(editor.highlights()[0].range, [1, 1, 1, 5]);
    });

    test("highlights cleared after unhighlight", () => {
      const editor = new Editor(container, "hello world");
      editor.highlight([1, 1, 1, 5], "#ff0000");
      editor.highlight([1, 7, 1, 11], "#00ff00");
      editor.unhighlight();
      assert.deepStrictEqual(editor.highlights(), []);
    });

    test("highlights with multiline content", () => {
      const editor = new Editor(container, "line 1\nline 2\nline 3");
      editor.highlight([1, 1, 2, 6], "#ff0000");
      assert.deepStrictEqual(editor.highlights(), [
        { range: [1, 1, 2, 6], color: "#ff0000" }
      ]);
    });

    test("highlights spanning multiple lines", () => {
      const editor = new Editor(container, "line 1\nline 2\nline 3");
      editor.highlight([1, 1, 3, 6], "#0000ff");
      assert.deepStrictEqual(editor.highlights(), [
        { range: [1, 1, 3, 6], color: "#0000ff" }
      ]);
    });

    test("highlights on different lines", () => {
      const editor = new Editor(container, "line 1\nline 2\nline 3");
      editor.highlight([1, 1, 1, 6], "#ff0000");
      editor.highlight([2, 1, 2, 6], "#00ff00");
      editor.highlight([3, 1, 3, 6], "#0000ff");
      assert.deepStrictEqual(editor.highlights(), [
        { range: [1, 1, 1, 6], color: "#ff0000" },
        { range: [2, 1, 2, 6], color: "#00ff00" },
        { range: [3, 1, 3, 6], color: "#0000ff" }
      ]);
    });

    test("highlights with various color formats", () => {
      const editor = new Editor(container, "hello world test");
      editor.highlight([1, 1, 1, 5], "#ff0000");
      editor.highlight([1, 7, 1, 11], "rgb(0, 255, 0)");
      editor.highlight([1, 13, 1, 16], "blue");
      assert.deepStrictEqual(editor.highlights(), [
        { range: [1, 1, 1, 5], color: "#ff0000" },
        { range: [1, 7, 1, 11], color: "rgb(0, 255, 0)" },
        { range: [1, 13, 1, 16], color: "blue" }
      ]);
    });

    test("highlights at start of line", () => {
      const editor = new Editor(container, "hello world");
      editor.highlight([1, 1, 1, 1], "#ff0000");
      assert.deepStrictEqual(editor.highlights(), [
        { range: [1, 1, 1, 1], color: "#ff0000" }
      ]);
    });

    test("highlights at end of line", () => {
      const editor = new Editor(container, "hello");
      editor.highlight([1, 5, 1, 5], "#ff0000");
      assert.deepStrictEqual(editor.highlights(), [
        { range: [1, 5, 1, 5], color: "#ff0000" }
      ]);
    });

    test("highlights entire line", () => {
      const editor = new Editor(container, "hello");
      editor.highlight([1, 1, 1, 5], "#ff0000");
      assert.deepStrictEqual(editor.highlights(), [
        { range: [1, 1, 1, 5], color: "#ff0000" }
      ]);
    });

    test("highlights can be added after unhighlight", () => {
      const editor = new Editor(container, "hello world");
      editor.highlight([1, 1, 1, 5], "#ff0000");
      editor.unhighlight();
      editor.highlight([1, 7, 1, 11], "#00ff00");
      assert.deepStrictEqual(editor.highlights(), [
        { range: [1, 7, 1, 11], color: "#00ff00" }
      ]);
    });

    test("highlights with same color", () => {
      const editor = new Editor(container, "hello world");
      editor.highlight([1, 1, 1, 5], "#ff0000");
      editor.highlight([1, 7, 1, 11], "#ff0000");
      assert.deepStrictEqual(editor.highlights(), [
        { range: [1, 1, 1, 5], color: "#ff0000" },
        { range: [1, 7, 1, 11], color: "#ff0000" }
      ]);
    });

    test("highlights with overlapping ranges", () => {
      const editor = new Editor(container, "hello world");
      editor.highlight([1, 1, 1, 7], "#ff0000");
      editor.highlight([1, 5, 1, 11], "#00ff00");
      assert.deepStrictEqual(editor.highlights(), [
        { range: [1, 1, 1, 7], color: "#ff0000" },
        { range: [1, 5, 1, 11], color: "#00ff00" }
      ]);
    });

    test("highlights empty range on single character", () => {
      const editor = new Editor(container, "hello");
      editor.highlight([1, 3, 1, 3], "#ff0000");
      assert.deepStrictEqual(editor.highlights(), [
        { range: [1, 3, 1, 3], color: "#ff0000" }
      ]);
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

    test("throws RangeError for columnStart greater than columnEnd on same line", () => {
      const editor = new Editor(container, "hello world");
      assert.throws(
        () => editor.highlight([1, 6, 1, 3], "#ff0000"),
        RangeError
      );
    });

    test("allows columnStart greater than columnEnd on different lines", () => {
      const editor = new Editor(container, "hello\nworld");
      assert.doesNotThrow(
        () => editor.highlight([1, 5, 2, 2], "#ff0000")
      );
    });

    test("throws RangeError with descriptive message for lineStart", () => {
      const editor = new Editor(container, "hello world");
      assert.throws(
        () => editor.highlight([0, 1, 1, 5], "#ff0000"),
        { message: /lineStart 0 is out of range/ }
      );
    });

    test("throws RangeError with descriptive message for lineEnd", () => {
      const editor = new Editor(container, "hello world");
      assert.throws(
        () => editor.highlight([1, 1, 5, 5], "#ff0000"),
        { message: /lineEnd 5 is out of range/ }
      );
    });

    test("throws RangeError with descriptive message for columnStart", () => {
      const editor = new Editor(container, "hello");
      assert.throws(
        () => editor.highlight([1, 0, 1, 5], "#ff0000"),
        { message: /columnStart 0 is out of range/ }
      );
    });

    test("throws RangeError with descriptive message for columnEnd", () => {
      const editor = new Editor(container, "hello");
      assert.throws(
        () => editor.highlight([1, 1, 1, 10], "#ff0000"),
        { message: /columnEnd 10 is out of range/ }
      );
    });

    test("valid range at exact boundaries", () => {
      const editor = new Editor(container, "hello");
      assert.doesNotThrow(
        () => editor.highlight([1, 1, 1, 5], "#ff0000")
      );
    });

    test("valid range with columnStart at line length + 1", () => {
      const editor = new Editor(container, "hello");
      assert.doesNotThrow(
        () => editor.highlight([1, 6, 1, 5], "#ff0000")
      );
    });

    test("valid range with columnEnd at 0", () => {
      const editor = new Editor(container, "hello\nworld");
      assert.doesNotThrow(
        () => editor.highlight([1, 1, 2, 0], "#ff0000")
      );
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

    test("throws RangeError for very large lineStart", () => {
      const editor = new Editor(container, "hello world");
      assert.throws(
        () => editor.highlight([1000, 1, 1, 5], "#ff0000"),
        RangeError
      );
    });

    test("throws RangeError for very large lineEnd", () => {
      const editor = new Editor(container, "hello world");
      assert.throws(
        () => editor.highlight([1, 1, 1000, 5], "#ff0000"),
        RangeError
      );
    });

    test("throws RangeError for very large columnStart", () => {
      const editor = new Editor(container, "hello");
      assert.throws(
        () => editor.highlight([1, 100, 1, 5], "#ff0000"),
        RangeError
      );
    });

    test("throws RangeError for very large columnEnd", () => {
      const editor = new Editor(container, "hello");
      assert.throws(
        () => editor.highlight([1, 1, 1, 100], "#ff0000"),
        RangeError
      );
    });

    test("valid highlight on multiline document boundaries", () => {
      const editor = new Editor(container, "line 1\nline 2\nline 3");
      assert.doesNotThrow(
        () => editor.highlight([1, 1, 3, 6], "#ff0000")
      );
    });

    test("throws RangeError when lineEnd exceeds multiline document", () => {
      const editor = new Editor(container, "line 1\nline 2\nline 3");
      assert.throws(
        () => editor.highlight([1, 1, 4, 5], "#ff0000"),
        RangeError
      );
    });

    test("no highlights added when RangeError is thrown", () => {
      const editor = new Editor(container, "hello world");
      try {
        editor.highlight([0, 1, 1, 5], "#ff0000");
      } catch (e) {
        // Expected
      }
      assert.deepStrictEqual(editor.highlights(), []);
    });

    test("previous highlights preserved when RangeError is thrown", () => {
      const editor = new Editor(container, "hello world");
      editor.highlight([1, 1, 1, 5], "#ff0000");
      try {
        editor.highlight([0, 1, 1, 5], "#00ff00");
      } catch (e) {
        // Expected
      }
      assert.deepStrictEqual(editor.highlights(), [
        { range: [1, 1, 1, 5], color: "#ff0000" }
      ]);
    });
  });

  describe("unhighlight", () => {
    test("unhighlight on empty editor does not throw", () => {
      const editor = new Editor(container, "hello world");
      assert.doesNotThrow(() => editor.unhighlight());
    });

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

    test("unhighlight can be called multiple times", () => {
      const editor = new Editor(container, "hello world");
      editor.highlight([1, 1, 1, 5], "#ff0000");
      editor.unhighlight();
      editor.unhighlight();
      assert.deepStrictEqual(editor.highlights(), []);
    });

    test("unhighlight allows new highlights to be added", () => {
      const editor = new Editor(container, "hello world");
      editor.highlight([1, 1, 1, 5], "#ff0000");
      editor.unhighlight();
      editor.highlight([1, 7, 1, 11], "#00ff00");
      assert.deepStrictEqual(editor.highlights(), [
        { range: [1, 7, 1, 11], color: "#00ff00" }
      ]);
    });
  });

  describe("highlight edge cases", () => {
    test("highlight single character", () => {
      const editor = new Editor(container, "hello");
      editor.highlight([1, 1, 1, 1], "#ff0000");
      assert.deepStrictEqual(editor.highlights(), [
        { range: [1, 1, 1, 1], color: "#ff0000" }
      ]);
    });

    test("highlight last character of line", () => {
      const editor = new Editor(container, "hello");
      editor.highlight([1, 5, 1, 5], "#ff0000");
      assert.deepStrictEqual(editor.highlights(), [
        { range: [1, 5, 1, 5], color: "#ff0000" }
      ]);
    });

    test("highlight with empty content throws RangeError", () => {
      const editor = new Editor(container, "");
      assert.throws(
        () => editor.highlight([1, 1, 1, 1], "#ff0000"),
        RangeError
      );
    });

    test("highlight on line with special characters", () => {
      const editor = new Editor(container, "hello\tworld\n");
      editor.highlight([1, 1, 1, 11], "#ff0000");
      assert.deepStrictEqual(editor.highlights(), [
        { range: [1, 1, 1, 11], color: "#ff0000" }
      ]);
    });

    test("highlight on line with unicode characters", () => {
      const editor = new Editor(container, "hello 世界");
      editor.highlight([1, 1, 1, 8], "#ff0000");
      assert.deepStrictEqual(editor.highlights(), [
        { range: [1, 1, 1, 8], color: "#ff0000" }
      ]);
    });

    test("highlight preserves original range array", () => {
      const editor = new Editor(container, "hello world");
      const range = [1, 1, 1, 5];
      editor.highlight(range, "#ff0000");
      range[0] = 999;
      assert.deepStrictEqual(editor.highlights()[0].range, [1, 1, 1, 5]);
    });

    test("highlight with hex color uppercase", () => {
      const editor = new Editor(container, "hello");
      editor.highlight([1, 1, 1, 5], "#FF0000");
      assert.deepStrictEqual(editor.highlights(), [
        { range: [1, 1, 1, 5], color: "#FF0000" }
      ]);
    });

    test("highlight with rgba color", () => {
      const editor = new Editor(container, "hello");
      editor.highlight([1, 1, 1, 5], "rgba(255, 0, 0, 0.5)");
      assert.deepStrictEqual(editor.highlights(), [
        { range: [1, 1, 1, 5], color: "rgba(255, 0, 0, 0.5)" }
      ]);
    });

    test("highlight with hsl color", () => {
      const editor = new Editor(container, "hello");
      editor.highlight([1, 1, 1, 5], "hsl(0, 100%, 50%)");
      assert.deepStrictEqual(editor.highlights(), [
        { range: [1, 1, 1, 5], color: "hsl(0, 100%, 50%)" }
      ]);
    });

    test("multiple highlights on same position", () => {
      const editor = new Editor(container, "hello");
      editor.highlight([1, 1, 1, 5], "#ff0000");
      editor.highlight([1, 1, 1, 5], "#00ff00");
      assert.deepStrictEqual(editor.highlights(), [
        { range: [1, 1, 1, 5], color: "#ff0000" },
        { range: [1, 1, 1, 5], color: "#00ff00" }
      ]);
    });

    test("highlight after setContent", () => {
      const editor = new Editor(container, "hello");
      editor.setContent("world");
      editor.highlight([1, 1, 1, 5], "#ff0000");
      assert.deepStrictEqual(editor.highlights(), [
        { range: [1, 1, 1, 5], color: "#ff0000" }
      ]);
    });

    test("highlights persist after setContent with same length", () => {
      const editor = new Editor(container, "hello");
      editor.highlight([1, 1, 1, 5], "#ff0000");
      editor.setContent("world");
      assert.deepStrictEqual(editor.highlights(), [
        { range: [1, 1, 1, 5], color: "#ff0000" }
      ]);
    });
  });
});
