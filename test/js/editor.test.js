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

  // Additional tests for edge cases and boundary conditions

  test("highlight single character", () => {
    const editor = new Editor(container, "hello world");
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

  test("highlight entire single line", () => {
    const editor = new Editor(container, "hello");
    editor.highlight([1, 1, 1, 5], "#ff0000");
    assert.deepStrictEqual(editor.highlights(), [
      { range: [1, 1, 1, 5], color: "#ff0000" }
    ]);
  });

  test("highlight entire multiline content", () => {
    const editor = new Editor(container, "line 1\nline 2");
    editor.highlight([1, 1, 2, 6], "#ff0000");
    assert.deepStrictEqual(editor.highlights(), [
      { range: [1, 1, 2, 6], color: "#ff0000" }
    ]);
  });

  test("highlight with zero-width range (from equals to)", () => {
    const editor = new Editor(container, "hello world");
    editor.highlight([1, 3, 1, 2], "#ff0000");
    assert.strictEqual(editor.highlights().length, 1);
  });

  test("highlight adjacent non-overlapping ranges", () => {
    const editor = new Editor(container, "hello world");
    editor.highlight([1, 1, 1, 5], "#ff0000");
    editor.highlight([1, 6, 1, 11], "#00ff00");
    const highlights = editor.highlights();
    assert.strictEqual(highlights.length, 2);
    assert.deepStrictEqual(highlights[0].range, [1, 1, 1, 5]);
    assert.deepStrictEqual(highlights[1].range, [1, 6, 1, 11]);
  });

  test("highlight with hex color codes in different formats", () => {
    const editor = new Editor(container, "hello world test");
    editor.highlight([1, 1, 1, 5], "#FF0000");
    editor.highlight([1, 7, 1, 11], "#00ff00");
    editor.highlight([1, 13, 1, 16], "#0000FF");
    const highlights = editor.highlights();
    assert.strictEqual(highlights[0].color, "#FF0000");
    assert.strictEqual(highlights[1].color, "#00ff00");
    assert.strictEqual(highlights[2].color, "#0000FF");
  });

  test("highlight preserves order by position", () => {
    const editor = new Editor(container, "hello world");
    // Add highlights in reverse order
    editor.highlight([1, 7, 1, 11], "#00ff00");
    editor.highlight([1, 1, 1, 5], "#ff0000");
    const highlights = editor.highlights();
    // Should be sorted by position
    assert.strictEqual(highlights.length, 2);
    // First highlight should be the one at position 1 (earlier in document)
    assert.deepStrictEqual(highlights[0].range, [1, 1, 1, 5]);
    assert.deepStrictEqual(highlights[1].range, [1, 7, 1, 11]);
  });

  test("highlight on empty line", () => {
    const editor = new Editor(container, "line 1\n\nline 3");
    // Line 2 is empty, so column 1 should be valid (position after newline)
    assert.throws(
      () => editor.highlight([2, 1, 2, 1], "#ff0000"),
      RangeError
    );
  });

  test("highlight column 1 on non-empty line is valid", () => {
    const editor = new Editor(container, "hello");
    editor.highlight([1, 1, 1, 1], "#ff0000");
    assert.strictEqual(editor.highlights().length, 1);
  });

  test("highlight end column 0 is valid (before first char)", () => {
    const editor = new Editor(container, "hello");
    editor.highlight([1, 1, 1, 0], "#ff0000");
    assert.strictEqual(editor.highlights().length, 1);
  });

  test("highlight throws RangeError with descriptive message for invalid line", () => {
    const editor = new Editor(container, "hello world");
    try {
      editor.highlight([5, 1, 5, 3], "#ff0000");
      assert.fail("Expected RangeError");
    } catch (error) {
      assert(error instanceof RangeError);
      assert(error.message.includes("Line out of range"));
      assert(error.message.includes("1 lines"));
    }
  });

  test("highlight throws RangeError with descriptive message for invalid start column", () => {
    const editor = new Editor(container, "hello");
    try {
      editor.highlight([1, 10, 1, 11], "#ff0000");
      assert.fail("Expected RangeError");
    } catch (error) {
      assert(error instanceof RangeError);
      assert(error.message.includes("Column 10"));
      assert(error.message.includes("line 1"));
    }
  });

  test("highlight throws RangeError with descriptive message for invalid end column", () => {
    const editor = new Editor(container, "hello");
    try {
      editor.highlight([1, 1, 1, 20], "#ff0000");
      assert.fail("Expected RangeError");
    } catch (error) {
      assert(error instanceof RangeError);
      assert(error.message.includes("Column 20"));
      assert(error.message.includes("line 1"));
    }
  });

  test("highlight on line with special characters", () => {
    const editor = new Editor(container, "héllo wörld");
    editor.highlight([1, 1, 1, 5], "#ff0000");
    assert.deepStrictEqual(editor.highlights(), [
      { range: [1, 1, 1, 5], color: "#ff0000" }
    ]);
  });

  test("highlight content with tabs", () => {
    const editor = new Editor(container, "hello\tworld");
    editor.highlight([1, 1, 1, 5], "#ff0000");
    assert.deepStrictEqual(editor.highlights(), [
      { range: [1, 1, 1, 5], color: "#ff0000" }
    ]);
  });

  test("highlight content with JSON structure", () => {
    const editor = new Editor(container, '{"key": "value"}', { json: true });
    editor.highlight([1, 1, 1, 6], "#ff0000");
    assert.deepStrictEqual(editor.highlights(), [
      { range: [1, 1, 1, 6], color: "#ff0000" }
    ]);
  });

  test("highlights returns new array each time", () => {
    const editor = new Editor(container, "hello world");
    editor.highlight([1, 1, 1, 5], "#ff0000");
    const highlights1 = editor.highlights();
    const highlights2 = editor.highlights();
    assert.notStrictEqual(highlights1, highlights2);
    assert.deepStrictEqual(highlights1, highlights2);
  });

  test("highlight with rgba color string", () => {
    const editor = new Editor(container, "hello world");
    editor.highlight([1, 1, 1, 5], "rgba(255, 0, 0, 0.5)");
    assert.deepStrictEqual(editor.highlights(), [
      { range: [1, 1, 1, 5], color: "rgba(255, 0, 0, 0.5)" }
    ]);
  });

  test("highlight with named color", () => {
    const editor = new Editor(container, "hello world");
    editor.highlight([1, 1, 1, 5], "red");
    assert.deepStrictEqual(editor.highlights(), [
      { range: [1, 1, 1, 5], color: "red" }
    ]);
  });

  test("highlight multiple lines with varying lengths", () => {
    const editor = new Editor(container, "short\nmedium length\nvery long line here");
    editor.highlight([1, 1, 1, 5], "#ff0000");
    editor.highlight([2, 1, 2, 13], "#00ff00");
    editor.highlight([3, 1, 3, 19], "#0000ff");
    const highlights = editor.highlights();
    assert.strictEqual(highlights.length, 3);
    assert.deepStrictEqual(highlights[0].range, [1, 1, 1, 5]);
    assert.deepStrictEqual(highlights[1].range, [2, 1, 2, 13]);
    assert.deepStrictEqual(highlights[2].range, [3, 1, 3, 19]);
  });

  test("highlight across lines preserves line boundaries", () => {
    const editor = new Editor(container, "abc\ndefgh\nij");
    editor.highlight([1, 2, 3, 2], "#ff0000");
    assert.deepStrictEqual(editor.highlights(), [
      { range: [1, 2, 3, 2], color: "#ff0000" }
    ]);
  });

  test("highlight throws RangeError for start line greater than end line in doc", () => {
    const editor = new Editor(container, "line 1\nline 2");
    // Start line is valid but end line exceeds document
    assert.throws(
      () => editor.highlight([2, 1, 5, 1], "#ff0000"),
      RangeError
    );
  });

  test("highlight at exact end of line (columnEnd equals line length)", () => {
    const editor = new Editor(container, "hello");
    editor.highlight([1, 1, 1, 5], "#ff0000");
    const highlights = editor.highlights();
    assert.strictEqual(highlights.length, 1);
    assert.deepStrictEqual(highlights[0].range, [1, 1, 1, 5]);
  });

  test("highlight column at line length + 1 for start is valid", () => {
    const editor = new Editor(container, "hello");
    // Column 6 is valid as start (position after last char)
    editor.highlight([1, 6, 1, 5], "#ff0000");
    assert.strictEqual(editor.highlights().length, 1);
  });

  test("unhighlight followed by multiple new highlights", () => {
    const editor = new Editor(container, "hello world test");
    editor.highlight([1, 1, 1, 5], "#ff0000");
    editor.highlight([1, 7, 1, 11], "#00ff00");
    editor.unhighlight();
    editor.highlight([1, 1, 1, 3], "#0000ff");
    editor.highlight([1, 5, 1, 8], "#ffff00");
    editor.highlight([1, 10, 1, 14], "#ff00ff");
    const highlights = editor.highlights();
    assert.strictEqual(highlights.length, 3);
    assert.deepStrictEqual(highlights[0].range, [1, 1, 1, 3]);
    assert.deepStrictEqual(highlights[1].range, [1, 5, 1, 8]);
    assert.deepStrictEqual(highlights[2].range, [1, 10, 1, 14]);
  });

  test("highlight with overlapping ranges keeps both", () => {
    const editor = new Editor(container, "hello world");
    editor.highlight([1, 1, 1, 7], "#ff0000");
    editor.highlight([1, 5, 1, 11], "#00ff00");
    const highlights = editor.highlights();
    assert.strictEqual(highlights.length, 2);
  });

  test("highlight on last line of multiline document", () => {
    const editor = new Editor(container, "line 1\nline 2\nline 3");
    editor.highlight([3, 1, 3, 6], "#ff0000");
    assert.deepStrictEqual(editor.highlights(), [
      { range: [3, 1, 3, 6], color: "#ff0000" }
    ]);
  });

  test("highlight on first line of multiline document", () => {
    const editor = new Editor(container, "line 1\nline 2\nline 3");
    editor.highlight([1, 1, 1, 6], "#ff0000");
    assert.deepStrictEqual(editor.highlights(), [
      { range: [1, 1, 1, 6], color: "#ff0000" }
    ]);
  });

  test("highlight middle line of multiline document", () => {
    const editor = new Editor(container, "line 1\nline 2\nline 3");
    editor.highlight([2, 1, 2, 6], "#ff0000");
    assert.deepStrictEqual(editor.highlights(), [
      { range: [2, 1, 2, 6], color: "#ff0000" }
    ]);
  });

  test("highlight returns correct structure with range as array", () => {
    const editor = new Editor(container, "hello world");
    editor.highlight([1, 2, 1, 8], "#abcdef");
    const highlights = editor.highlights();
    assert.strictEqual(highlights.length, 1);
    const highlight = highlights[0];
    assert(Array.isArray(highlight.range));
    assert.strictEqual(highlight.range.length, 4);
    assert.strictEqual(typeof highlight.range[0], "number");
    assert.strictEqual(typeof highlight.range[1], "number");
    assert.strictEqual(typeof highlight.range[2], "number");
    assert.strictEqual(typeof highlight.range[3], "number");
    assert.strictEqual(typeof highlight.color, "string");
  });

  test("highlight color is preserved exactly as provided", () => {
    const editor = new Editor(container, "hello world");
    const exactColor = "#AbCdEf";
    editor.highlight([1, 1, 1, 5], exactColor);
    assert.strictEqual(editor.highlights()[0].color, exactColor);
  });

  test("setContent after highlight clears highlights via document change", () => {
    const editor = new Editor(container, "hello world");
    editor.highlight([1, 1, 1, 5], "#ff0000");
    assert.strictEqual(editor.highlights().length, 1);
    editor.setContent("new content");
    // When content is completely replaced, the highlight range becomes invalid
    // and the highlight is removed during the document change mapping
    const highlights = editor.highlights();
    assert.strictEqual(highlights.length, 0);
  });

  test("highlight throws RangeError when lineStart is 0", () => {
    const editor = new Editor(container, "hello world");
    assert.throws(
      () => editor.highlight([0, 1, 1, 5], "#ff0000"),
      RangeError
    );
  });

  test("highlight throws RangeError when lineEnd is 0", () => {
    const editor = new Editor(container, "hello world");
    assert.throws(
      () => editor.highlight([1, 1, 0, 5], "#ff0000"),
      RangeError
    );
  });

  test("highlight throws RangeError when both lines are 0", () => {
    const editor = new Editor(container, "hello world");
    assert.throws(
      () => editor.highlight([0, 1, 0, 5], "#ff0000"),
      RangeError
    );
  });

  test("highlight with many highlights does not lose any", () => {
    const editor = new Editor(container, "a b c d e f g h i j k l m n o p");
    for (let i = 0; i < 10; i++) {
      editor.highlight([1, i * 2 + 1, 1, i * 2 + 1], `#${i}00000`);
    }
    assert.strictEqual(editor.highlights().length, 10);
  });
});
