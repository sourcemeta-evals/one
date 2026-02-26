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

  test("highlights returns empty array by default", () => {
    const editor = new Editor(container, "hello world");
    assert.deepStrictEqual(editor.highlights(), []);
  });

  test("highlight adds a single highlight", () => {
    const editor = new Editor(container, "hello world");
    editor.highlight([1, 1, 1, 5], "#ff0000");
    assert.deepStrictEqual(editor.highlights(), [
      { range: [1, 1, 1, 5], color: "#ff0000" }
    ]);
  });

  test("highlight can be called multiple times with different colors", () => {
    const editor = new Editor(container, "hello world\nfoo bar");
    editor.highlight([1, 1, 1, 5], "#ff0000");
    editor.highlight([2, 1, 2, 3], "#00ff00");
    assert.deepStrictEqual(editor.highlights(), [
      { range: [1, 1, 1, 5], color: "#ff0000" },
      { range: [2, 1, 2, 3], color: "#00ff00" }
    ]);
  });

  test("highlight preserves previous highlights", () => {
    const editor = new Editor(container, "hello world");
    editor.highlight([1, 1, 1, 3], "#ff0000");
    editor.highlight([1, 5, 1, 7], "#0000ff");
    editor.highlight([1, 9, 1, 11], "#00ff00");
    assert.strictEqual(editor.highlights().length, 3);
    assert.deepStrictEqual(editor.highlights()[0], { range: [1, 1, 1, 3], color: "#ff0000" });
    assert.deepStrictEqual(editor.highlights()[1], { range: [1, 5, 1, 7], color: "#0000ff" });
    assert.deepStrictEqual(editor.highlights()[2], { range: [1, 9, 1, 11], color: "#00ff00" });
  });

  test("highlight can span multiple lines", () => {
    const editor = new Editor(container, "line 1\nline 2\nline 3");
    editor.highlight([1, 1, 3, 6], "#ff0000");
    assert.deepStrictEqual(editor.highlights(), [
      { range: [1, 1, 3, 6], color: "#ff0000" }
    ]);
  });

  test("unhighlight removes all highlights", () => {
    const editor = new Editor(container, "hello world\nfoo bar");
    editor.highlight([1, 1, 1, 5], "#ff0000");
    editor.highlight([2, 1, 2, 3], "#00ff00");
    assert.strictEqual(editor.highlights().length, 2);
    editor.unhighlight();
    assert.deepStrictEqual(editor.highlights(), []);
  });

  test("unhighlight on editor with no highlights does nothing", () => {
    const editor = new Editor(container, "hello world");
    assert.deepStrictEqual(editor.highlights(), []);
    editor.unhighlight();
    assert.deepStrictEqual(editor.highlights(), []);
  });

  test("unhighlight can be called multiple times safely", () => {
    const editor = new Editor(container, "hello world");
    editor.highlight([1, 1, 1, 5], "#ff0000");
    editor.unhighlight();
    editor.unhighlight();
    editor.unhighlight();
    assert.deepStrictEqual(editor.highlights(), []);
  });

  test("highlight after unhighlight starts fresh", () => {
    const editor = new Editor(container, "hello world");
    editor.highlight([1, 1, 1, 5], "#ff0000");
    editor.unhighlight();
    editor.highlight([1, 7, 1, 11], "#0000ff");
    assert.deepStrictEqual(editor.highlights(), [
      { range: [1, 7, 1, 11], color: "#0000ff" }
    ]);
  });

  test("highlight throws RangeError for line number less than 1", () => {
    const editor = new Editor(container, "hello world");
    assert.throws(
      () => editor.highlight([0, 1, 1, 5], "#ff0000"),
      RangeError
    );
  });

  test("highlight throws RangeError for line number exceeding document lines", () => {
    const editor = new Editor(container, "hello world");
    assert.throws(
      () => editor.highlight([1, 1, 2, 5], "#ff0000"),
      RangeError
    );
  });

  test("highlight throws RangeError for end line exceeding document lines", () => {
    const editor = new Editor(container, "line 1\nline 2");
    assert.throws(
      () => editor.highlight([1, 1, 5, 5], "#ff0000"),
      RangeError
    );
  });

  test("highlight throws RangeError for column less than 1", () => {
    const editor = new Editor(container, "hello world");
    assert.throws(
      () => editor.highlight([1, 0, 1, 5], "#ff0000"),
      RangeError
    );
  });

  test("highlight throws RangeError for start column exceeding line length", () => {
    const editor = new Editor(container, "hello");
    assert.throws(
      () => editor.highlight([1, 10, 1, 11], "#ff0000"),
      RangeError
    );
  });

  test("highlight throws RangeError for end column exceeding line length", () => {
    const editor = new Editor(container, "hello");
    assert.throws(
      () => editor.highlight([1, 1, 1, 20], "#ff0000"),
      RangeError
    );
  });

  test("highlight throws RangeError for negative end column", () => {
    const editor = new Editor(container, "hello world");
    assert.throws(
      () => editor.highlight([1, 1, 1, -1], "#ff0000"),
      RangeError
    );
  });

  test("highlight with same color multiple times", () => {
    const editor = new Editor(container, "hello world");
    editor.highlight([1, 1, 1, 3], "#ff0000");
    editor.highlight([1, 5, 1, 7], "#ff0000");
    assert.strictEqual(editor.highlights().length, 2);
    assert.strictEqual(editor.highlights()[0].color, "#ff0000");
    assert.strictEqual(editor.highlights()[1].color, "#ff0000");
  });

  // === Additional extensive tests for edge cases ===

  test("highlight single character at beginning of line", () => {
    const editor = new Editor(container, "hello world");
    editor.highlight([1, 1, 1, 1], "#ff0000");
    assert.deepStrictEqual(editor.highlights(), [
      { range: [1, 1, 1, 1], color: "#ff0000" }
    ]);
  });

  test("highlight single character at end of line", () => {
    const editor = new Editor(container, "hello");
    editor.highlight([1, 5, 1, 5], "#ff0000");
    assert.deepStrictEqual(editor.highlights(), [
      { range: [1, 5, 1, 5], color: "#ff0000" }
    ]);
  });

  test("highlight entire single line", () => {
    const editor = new Editor(container, "hello");
    editor.highlight([1, 1, 1, 5], "#ff0000");
    assert.deepStrictEqual(editor.highlights(), [
      { range: [1, 1, 1, 5], color: "#ff0000" }
    ]);
  });

  test("highlight entire document with multiple lines", () => {
    const editor = new Editor(container, "line 1\nline 2\nline 3");
    editor.highlight([1, 1, 3, 6], "#ff0000");
    assert.deepStrictEqual(editor.highlights(), [
      { range: [1, 1, 3, 6], color: "#ff0000" }
    ]);
  });

  test("highlight adjacent ranges on same line", () => {
    const editor = new Editor(container, "hello world");
    editor.highlight([1, 1, 1, 5], "#ff0000");
    editor.highlight([1, 6, 1, 11], "#00ff00");
    assert.strictEqual(editor.highlights().length, 2);
    assert.deepStrictEqual(editor.highlights()[0], { range: [1, 1, 1, 5], color: "#ff0000" });
    assert.deepStrictEqual(editor.highlights()[1], { range: [1, 6, 1, 11], color: "#00ff00" });
  });

  test("highlight overlapping ranges on same line", () => {
    const editor = new Editor(container, "hello world");
    editor.highlight([1, 1, 1, 7], "#ff0000");
    editor.highlight([1, 5, 1, 11], "#00ff00");
    assert.strictEqual(editor.highlights().length, 2);
  });

  test("highlight at exact line boundary - column 1 on multiline", () => {
    const editor = new Editor(container, "line 1\nline 2");
    editor.highlight([2, 1, 2, 6], "#ff0000");
    assert.deepStrictEqual(editor.highlights(), [
      { range: [2, 1, 2, 6], color: "#ff0000" }
    ]);
  });

  test("highlight at maximum valid column for line", () => {
    const editor = new Editor(container, "hello");
    // Column 6 is valid for start (just past end of 5-char line)
    editor.highlight([1, 6, 1, 5], "#ff0000");
    assert.strictEqual(editor.highlights().length, 1);
  });

  test("highlight with different color formats", () => {
    const editor = new Editor(container, "hello world test");
    editor.highlight([1, 1, 1, 5], "#FF0000");
    editor.highlight([1, 7, 1, 11], "rgb(0,255,0)");
    editor.highlight([1, 13, 1, 16], "rgba(0,0,255,0.5)");
    assert.strictEqual(editor.highlights().length, 3);
    assert.strictEqual(editor.highlights()[0].color, "#FF0000");
    assert.strictEqual(editor.highlights()[1].color, "rgb(0,255,0)");
    assert.strictEqual(editor.highlights()[2].color, "rgba(0,0,255,0.5)");
  });

  test("highlight crossing multiple lines preserves range", () => {
    const editor = new Editor(container, "line 1\nline 2\nline 3\nline 4");
    editor.highlight([2, 3, 4, 4], "#ff0000");
    const highlights = editor.highlights();
    assert.strictEqual(highlights.length, 1);
    assert.deepStrictEqual(highlights[0].range, [2, 3, 4, 4]);
  });

  test("multiple highlights on different lines", () => {
    const editor = new Editor(container, "aaa\nbbb\nccc\nddd");
    editor.highlight([1, 1, 1, 3], "#ff0000");
    editor.highlight([2, 1, 2, 3], "#00ff00");
    editor.highlight([3, 1, 3, 3], "#0000ff");
    editor.highlight([4, 1, 4, 3], "#ffff00");
    assert.strictEqual(editor.highlights().length, 4);
  });

  test("highlight with named color", () => {
    const editor = new Editor(container, "hello world");
    editor.highlight([1, 1, 1, 5], "red");
    assert.deepStrictEqual(editor.highlights(), [
      { range: [1, 1, 1, 5], color: "red" }
    ]);
  });

  test("highlight returns correct order after multiple additions", () => {
    const editor = new Editor(container, "hello world");
    // Add highlights in reverse document order
    editor.highlight([1, 9, 1, 11], "#0000ff");
    editor.highlight([1, 1, 1, 3], "#ff0000");
    editor.highlight([1, 5, 1, 7], "#00ff00");
    // They should be sorted by position
    const highlights = editor.highlights();
    assert.strictEqual(highlights.length, 3);
    // First highlight should be at position 1
    assert.deepStrictEqual(highlights[0].range, [1, 1, 1, 3]);
    // Second at position 5
    assert.deepStrictEqual(highlights[1].range, [1, 5, 1, 7]);
    // Third at position 9
    assert.deepStrictEqual(highlights[2].range, [1, 9, 1, 11]);
  });

  test("highlights returns empty array on empty editor", () => {
    const editor = new Editor(container, "");
    assert.deepStrictEqual(editor.highlights(), []);
  });

  test("highlight throws RangeError on empty editor", () => {
    const editor = new Editor(container, "");
    assert.throws(
      () => editor.highlight([1, 1, 1, 1], "#ff0000"),
      RangeError
    );
  });

  test("highlight throws RangeError with descriptive message for line out of range", () => {
    const editor = new Editor(container, "hello");
    assert.throws(
      () => editor.highlight([5, 1, 5, 1], "#ff0000"),
      (err) => {
        assert(err instanceof RangeError);
        assert(err.message.includes("lines") || err.message.includes("Line"));
        return true;
      }
    );
  });

  test("highlight throws RangeError with descriptive message for column out of range", () => {
    const editor = new Editor(container, "hello");
    assert.throws(
      () => editor.highlight([1, 100, 1, 100], "#ff0000"),
      (err) => {
        assert(err instanceof RangeError);
        assert(err.message.includes("Column") || err.message.includes("column"));
        return true;
      }
    );
  });

  test("highlight throws RangeError for start line 0", () => {
    const editor = new Editor(container, "hello");
    assert.throws(
      () => editor.highlight([0, 1, 1, 5], "#ff0000"),
      RangeError
    );
  });

  test("highlight throws RangeError for end line 0", () => {
    const editor = new Editor(container, "hello");
    assert.throws(
      () => editor.highlight([1, 1, 0, 5], "#ff0000"),
      RangeError
    );
  });

  test("highlight throws RangeError for negative start line", () => {
    const editor = new Editor(container, "hello");
    assert.throws(
      () => editor.highlight([-1, 1, 1, 5], "#ff0000"),
      RangeError
    );
  });

  test("highlight throws RangeError for negative end line", () => {
    const editor = new Editor(container, "hello");
    assert.throws(
      () => editor.highlight([1, 1, -1, 5], "#ff0000"),
      RangeError
    );
  });

  test("highlight throws RangeError for negative start column", () => {
    const editor = new Editor(container, "hello");
    assert.throws(
      () => editor.highlight([1, -1, 1, 5], "#ff0000"),
      RangeError
    );
  });

  test("highlight with very long single line", () => {
    const longLine = "a".repeat(1000);
    const editor = new Editor(container, longLine);
    editor.highlight([1, 1, 1, 1000], "#ff0000");
    assert.deepStrictEqual(editor.highlights(), [
      { range: [1, 1, 1, 1000], color: "#ff0000" }
    ]);
  });

  test("highlight preserves after adding more highlights", () => {
    const editor = new Editor(container, "hello world");
    editor.highlight([1, 1, 1, 5], "#ff0000");
    const first = editor.highlights();
    assert.strictEqual(first.length, 1);
    editor.highlight([1, 7, 1, 11], "#00ff00");
    const second = editor.highlights();
    assert.strictEqual(second.length, 2);
    // First highlight should still be there
    assert.deepStrictEqual(second[0], { range: [1, 1, 1, 5], color: "#ff0000" });
  });

  test("highlights array is a fresh copy each time", () => {
    const editor = new Editor(container, "hello world");
    editor.highlight([1, 1, 1, 5], "#ff0000");
    const first = editor.highlights();
    const second = editor.highlights();
    assert.notStrictEqual(first, second);
    assert.deepStrictEqual(first, second);
  });

  test("highlight on line with only whitespace", () => {
    const editor = new Editor(container, "   ");
    editor.highlight([1, 1, 1, 3], "#ff0000");
    assert.deepStrictEqual(editor.highlights(), [
      { range: [1, 1, 1, 3], color: "#ff0000" }
    ]);
  });

  test("highlight spanning empty line in middle", () => {
    const editor = new Editor(container, "line 1\n\nline 3");
    editor.highlight([1, 1, 3, 6], "#ff0000");
    assert.deepStrictEqual(editor.highlights(), [
      { range: [1, 1, 3, 6], color: "#ff0000" }
    ]);
  });

  test("highlight on empty line throws for non-zero column end", () => {
    const editor = new Editor(container, "line 1\n\nline 3");
    assert.throws(
      () => editor.highlight([2, 1, 2, 1], "#ff0000"),
      RangeError
    );
  });

  test("highlight with hex color variations", () => {
    const editor = new Editor(container, "test content here");
    editor.highlight([1, 1, 1, 4], "#abc");
    editor.highlight([1, 6, 1, 12], "#AABBCC");
    const highlights = editor.highlights();
    assert.strictEqual(highlights[0].color, "#abc");
    assert.strictEqual(highlights[1].color, "#AABBCC");
  });

  test("unhighlight preserves editor content", () => {
    const editor = new Editor(container, "hello world");
    editor.highlight([1, 1, 1, 5], "#ff0000");
    editor.unhighlight();
    assert.strictEqual(editor.content(), "hello world");
  });

  test("highlight does not modify editor content", () => {
    const editor = new Editor(container, "hello world");
    const before = editor.content();
    editor.highlight([1, 1, 1, 5], "#ff0000");
    const after = editor.content();
    assert.strictEqual(before, after);
  });

  test("multiple unhighlight calls do not affect content", () => {
    const editor = new Editor(container, "test content");
    editor.highlight([1, 1, 1, 4], "#ff0000");
    editor.unhighlight();
    editor.unhighlight();
    editor.unhighlight();
    assert.strictEqual(editor.content(), "test content");
  });

  test("highlight at end of line with zero end column is valid", () => {
    const editor = new Editor(container, "hello");
    editor.highlight([1, 1, 1, 0], "#ff0000");
    assert.strictEqual(editor.highlights().length, 1);
  });

  test("highlight with same start and end position", () => {
    const editor = new Editor(container, "hello world");
    editor.highlight([1, 3, 1, 3], "#ff0000");
    const highlights = editor.highlights();
    assert.strictEqual(highlights.length, 1);
    assert.deepStrictEqual(highlights[0].range, [1, 3, 1, 3]);
  });

  test("highlight on last character of last line", () => {
    const editor = new Editor(container, "ab\ncd\nef");
    editor.highlight([3, 2, 3, 2], "#ff0000");
    assert.deepStrictEqual(editor.highlights(), [
      { range: [3, 2, 3, 2], color: "#ff0000" }
    ]);
  });

  test("highlight spanning from first to last character of document", () => {
    const editor = new Editor(container, "ab\ncd\nef");
    editor.highlight([1, 1, 3, 2], "#ff0000");
    assert.deepStrictEqual(editor.highlights(), [
      { range: [1, 1, 3, 2], color: "#ff0000" }
    ]);
  });

  test("interleaved highlight and unhighlight operations", () => {
    const editor = new Editor(container, "hello world");
    editor.highlight([1, 1, 1, 5], "#ff0000");
    assert.strictEqual(editor.highlights().length, 1);
    editor.unhighlight();
    assert.strictEqual(editor.highlights().length, 0);
    editor.highlight([1, 1, 1, 3], "#00ff00");
    editor.highlight([1, 5, 1, 7], "#0000ff");
    assert.strictEqual(editor.highlights().length, 2);
    editor.unhighlight();
    assert.strictEqual(editor.highlights().length, 0);
  });

  test("highlight on unicode content", () => {
    const editor = new Editor(container, "héllo wörld");
    editor.highlight([1, 1, 1, 5], "#ff0000");
    assert.deepStrictEqual(editor.highlights(), [
      { range: [1, 1, 1, 5], color: "#ff0000" }
    ]);
  });

  test("highlight on content with tabs", () => {
    const editor = new Editor(container, "a\tb\tc");
    editor.highlight([1, 1, 1, 5], "#ff0000");
    assert.deepStrictEqual(editor.highlights(), [
      { range: [1, 1, 1, 5], color: "#ff0000" }
    ]);
  });

  test("highlight with transparent color", () => {
    const editor = new Editor(container, "hello world");
    editor.highlight([1, 1, 1, 5], "transparent");
    assert.deepStrictEqual(editor.highlights(), [
      { range: [1, 1, 1, 5], color: "transparent" }
    ]);
  });

  test("many highlights on same line", () => {
    const editor = new Editor(container, "abcdefghijklmnopqrstuvwxyz");
    for (let i = 1; i <= 26; i++) {
      editor.highlight([1, i, 1, i], `#${i.toString(16).padStart(2, '0')}0000`);
    }
    assert.strictEqual(editor.highlights().length, 26);
  });

  test("highlight range object contains correct structure", () => {
    const editor = new Editor(container, "hello world");
    editor.highlight([1, 2, 1, 8], "#ff0000");
    const highlights = editor.highlights();
    assert.strictEqual(highlights.length, 1);
    assert.ok(Array.isArray(highlights[0].range));
    assert.strictEqual(highlights[0].range.length, 4);
    assert.strictEqual(typeof highlights[0].color, "string");
  });

  test("highlight on multiline with varying line lengths", () => {
    const editor = new Editor(container, "short\nmedium length\nvery very long line");
    editor.highlight([1, 1, 1, 5], "#ff0000");
    editor.highlight([2, 1, 2, 13], "#00ff00");
    editor.highlight([3, 1, 3, 19], "#0000ff");
    assert.strictEqual(editor.highlights().length, 3);
  });
});
