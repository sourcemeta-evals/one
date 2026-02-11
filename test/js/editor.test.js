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
});

describe("Editor highlights", () => {
  const container = document.getElementById("editor");

  beforeEach(() => {
    container.innerHTML = "";
  });

  test("highlights returns empty array by default", () => {
    const editor = new Editor(container, "hello world");
    assert.deepStrictEqual(editor.highlights(), []);
  });

  test("highlight a single word on a single line", () => {
    const editor = new Editor(container, "hello world");
    editor.highlight([ 1, 1, 1, 5 ], "#ff0000");
    const result = editor.highlights();
    assert.strictEqual(result.length, 1);
    assert.deepStrictEqual(result[0].range, [ 1, 1, 1, 5 ]);
    assert.strictEqual(result[0].color, "#ff0000");
  });

  test("highlight returns correct color", () => {
    const editor = new Editor(container, "hello world");
    editor.highlight([ 1, 1, 1, 5 ], "#00ff00");
    const result = editor.highlights();
    assert.strictEqual(result[0].color, "#00ff00");
  });

  test("highlight middle of a line", () => {
    const editor = new Editor(container, "hello world");
    editor.highlight([ 1, 7, 1, 11 ], "#0000ff");
    const result = editor.highlights();
    assert.strictEqual(result.length, 1);
    assert.deepStrictEqual(result[0].range, [ 1, 7, 1, 11 ]);
    assert.strictEqual(result[0].color, "#0000ff");
  });

  test("highlight an entire single line", () => {
    const editor = new Editor(container, "hello world");
    editor.highlight([ 1, 1, 1, 11 ], "#ff0000");
    const result = editor.highlights();
    assert.strictEqual(result.length, 1);
    assert.deepStrictEqual(result[0].range, [ 1, 1, 1, 11 ]);
  });

  test("highlight spanning multiple lines", () => {
    const editor = new Editor(container, "line 1\nline 2\nline 3");
    editor.highlight([ 1, 1, 2, 6 ], "#ff0000");
    const result = editor.highlights();
    assert.strictEqual(result.length, 1);
    assert.deepStrictEqual(result[0].range, [ 1, 1, 2, 6 ]);
    assert.strictEqual(result[0].color, "#ff0000");
  });

  test("highlight spanning all lines", () => {
    const editor = new Editor(container, "line 1\nline 2\nline 3");
    editor.highlight([ 1, 1, 3, 6 ], "#aabbcc");
    const result = editor.highlights();
    assert.strictEqual(result.length, 1);
    assert.deepStrictEqual(result[0].range, [ 1, 1, 3, 6 ]);
  });

  test("multiple non-overlapping highlights", () => {
    const editor = new Editor(container, "hello world foo bar");
    editor.highlight([ 1, 1, 1, 5 ], "#ff0000");
    editor.highlight([ 1, 7, 1, 11 ], "#00ff00");
    const result = editor.highlights();
    assert.strictEqual(result.length, 2);
    assert.deepStrictEqual(result[0].range, [ 1, 1, 1, 5 ]);
    assert.strictEqual(result[0].color, "#ff0000");
    assert.deepStrictEqual(result[1].range, [ 1, 7, 1, 11 ]);
    assert.strictEqual(result[1].color, "#00ff00");
  });

  test("multiple highlights on different lines", () => {
    const editor = new Editor(container, "line 1\nline 2\nline 3");
    editor.highlight([ 1, 1, 1, 6 ], "#ff0000");
    editor.highlight([ 3, 1, 3, 6 ], "#0000ff");
    const result = editor.highlights();
    assert.strictEqual(result.length, 2);
    assert.deepStrictEqual(result[0].range, [ 1, 1, 1, 6 ]);
    assert.strictEqual(result[0].color, "#ff0000");
    assert.deepStrictEqual(result[1].range, [ 3, 1, 3, 6 ]);
    assert.strictEqual(result[1].color, "#0000ff");
  });

  test("unhighlight clears all highlights", () => {
    const editor = new Editor(container, "hello world");
    editor.highlight([ 1, 1, 1, 5 ], "#ff0000");
    assert.strictEqual(editor.highlights().length, 1);
    editor.unhighlight();
    assert.deepStrictEqual(editor.highlights(), []);
  });

  test("unhighlight clears multiple highlights", () => {
    const editor = new Editor(container, "hello world foo bar");
    editor.highlight([ 1, 1, 1, 5 ], "#ff0000");
    editor.highlight([ 1, 7, 1, 11 ], "#00ff00");
    assert.strictEqual(editor.highlights().length, 2);
    editor.unhighlight();
    assert.deepStrictEqual(editor.highlights(), []);
  });

  test("highlight after unhighlight works", () => {
    const editor = new Editor(container, "hello world");
    editor.highlight([ 1, 1, 1, 5 ], "#ff0000");
    editor.unhighlight();
    editor.highlight([ 1, 7, 1, 11 ], "#00ff00");
    const result = editor.highlights();
    assert.strictEqual(result.length, 1);
    assert.deepStrictEqual(result[0].range, [ 1, 7, 1, 11 ]);
    assert.strictEqual(result[0].color, "#00ff00");
  });

  test("highlight a single character", () => {
    const editor = new Editor(container, "hello");
    editor.highlight([ 1, 1, 1, 1 ], "#ff0000");
    const result = editor.highlights();
    assert.strictEqual(result.length, 1);
    assert.deepStrictEqual(result[0].range, [ 1, 1, 1, 1 ]);
  });

  test("highlight last character of a line", () => {
    const editor = new Editor(container, "hello");
    editor.highlight([ 1, 5, 1, 5 ], "#ff0000");
    const result = editor.highlights();
    assert.strictEqual(result.length, 1);
    assert.deepStrictEqual(result[0].range, [ 1, 5, 1, 5 ]);
  });

  test("highlight with columnEnd zero", () => {
    const editor = new Editor(container, "line 1\nline 2");
    editor.highlight([ 1, 1, 2, 0 ], "#ff0000");
    const result = editor.highlights();
    assert.strictEqual(result.length, 1);
    assert.deepStrictEqual(result[0].range, [ 1, 1, 2, 0 ]);
  });

  test("highlight preserves color with hex notation", () => {
    const editor = new Editor(container, "test");
    editor.highlight([ 1, 1, 1, 4 ], "#abcdef");
    const result = editor.highlights();
    assert.strictEqual(result[0].color, "#abcdef");
  });

  test("three highlights accumulate", () => {
    const editor = new Editor(container, "aaa bbb ccc ddd");
    editor.highlight([ 1, 1, 1, 3 ], "#ff0000");
    editor.highlight([ 1, 5, 1, 7 ], "#00ff00");
    editor.highlight([ 1, 9, 1, 11 ], "#0000ff");
    const result = editor.highlights();
    assert.strictEqual(result.length, 3);
    assert.strictEqual(result[0].color, "#ff0000");
    assert.strictEqual(result[1].color, "#00ff00");
    assert.strictEqual(result[2].color, "#0000ff");
  });

  test("highlights returns objects with range and color properties", () => {
    const editor = new Editor(container, "hello");
    editor.highlight([ 1, 1, 1, 5 ], "#ff0000");
    const result = editor.highlights();
    assert.ok(Array.isArray(result));
    assert.ok("range" in result[0]);
    assert.ok("color" in result[0]);
    assert.ok(Array.isArray(result[0].range));
    assert.strictEqual(result[0].range.length, 4);
  });

  test("highlights range contains four numbers", () => {
    const editor = new Editor(container, "hello");
    editor.highlight([ 1, 2, 1, 4 ], "#ff0000");
    const result = editor.highlights();
    for (const value of result[0].range) {
      assert.strictEqual(typeof value, "number");
    }
  });
});

describe("Editor highlight range errors", () => {
  const container = document.getElementById("editor");

  beforeEach(() => {
    container.innerHTML = "";
  });

  test("lineStart below 1 throws RangeError", () => {
    const editor = new Editor(container, "hello");
    assert.throws(() => {
      editor.highlight([ 0, 1, 1, 5 ], "#ff0000");
    }, RangeError);
  });

  test("lineStart negative throws RangeError", () => {
    const editor = new Editor(container, "hello");
    assert.throws(() => {
      editor.highlight([ -1, 1, 1, 5 ], "#ff0000");
    }, RangeError);
  });

  test("lineStart exceeds total lines throws RangeError", () => {
    const editor = new Editor(container, "hello");
    assert.throws(() => {
      editor.highlight([ 2, 1, 2, 1 ], "#ff0000");
    }, RangeError);
  });

  test("lineEnd below 1 throws RangeError", () => {
    const editor = new Editor(container, "hello");
    assert.throws(() => {
      editor.highlight([ 1, 1, 0, 5 ], "#ff0000");
    }, RangeError);
  });

  test("lineEnd negative throws RangeError", () => {
    const editor = new Editor(container, "hello");
    assert.throws(() => {
      editor.highlight([ 1, 1, -1, 5 ], "#ff0000");
    }, RangeError);
  });

  test("lineEnd exceeds total lines throws RangeError", () => {
    const editor = new Editor(container, "hello");
    assert.throws(() => {
      editor.highlight([ 1, 1, 2, 5 ], "#ff0000");
    }, RangeError);
  });

  test("lineStart greater than lineEnd throws RangeError", () => {
    const editor = new Editor(container, "line 1\nline 2");
    assert.throws(() => {
      editor.highlight([ 2, 1, 1, 5 ], "#ff0000");
    }, RangeError);
  });

  test("columnStart below 1 throws RangeError", () => {
    const editor = new Editor(container, "hello");
    assert.throws(() => {
      editor.highlight([ 1, 0, 1, 5 ], "#ff0000");
    }, RangeError);
  });

  test("columnStart negative throws RangeError", () => {
    const editor = new Editor(container, "hello");
    assert.throws(() => {
      editor.highlight([ 1, -1, 1, 5 ], "#ff0000");
    }, RangeError);
  });

  test("columnStart exceeds line length throws RangeError", () => {
    const editor = new Editor(container, "hello");
    assert.throws(() => {
      editor.highlight([ 1, 7, 1, 5 ], "#ff0000");
    }, RangeError);
  });

  test("columnEnd negative throws RangeError", () => {
    const editor = new Editor(container, "hello");
    assert.throws(() => {
      editor.highlight([ 1, 1, 1, -1 ], "#ff0000");
    }, RangeError);
  });

  test("columnEnd exceeds line length throws RangeError", () => {
    const editor = new Editor(container, "hello");
    assert.throws(() => {
      editor.highlight([ 1, 1, 1, 6 ], "#ff0000");
    }, RangeError);
  });

  test("valid range on multiline does not throw", () => {
    const editor = new Editor(container, "line 1\nline 2\nline 3");
    assert.doesNotThrow(() => {
      editor.highlight([ 1, 1, 3, 6 ], "#ff0000");
    });
  });

  test("valid range on single line does not throw", () => {
    const editor = new Editor(container, "hello world");
    assert.doesNotThrow(() => {
      editor.highlight([ 1, 1, 1, 11 ], "#ff0000");
    });
  });

  test("lineStart far exceeding total lines throws RangeError", () => {
    const editor = new Editor(container, "hello");
    assert.throws(() => {
      editor.highlight([ 100, 1, 100, 1 ], "#ff0000");
    }, RangeError);
  });

  test("columnStart at line length plus one is valid", () => {
    const editor = new Editor(container, "hello");
    assert.doesNotThrow(() => {
      editor.highlight([ 1, 6, 1, 5 ], "#ff0000");
    });
  });

  test("columnStart beyond line length plus one throws RangeError", () => {
    const editor = new Editor(container, "hello");
    assert.throws(() => {
      editor.highlight([ 1, 7, 1, 5 ], "#ff0000");
    }, RangeError);
  });

  test("range error does not add any highlight", () => {
    const editor = new Editor(container, "hello");
    try {
      editor.highlight([ 0, 1, 1, 5 ], "#ff0000");
    } catch {
      // Expected
    }
    assert.deepStrictEqual(editor.highlights(), []);
  });

  test("valid highlight after a failed one still works", () => {
    const editor = new Editor(container, "hello");
    try {
      editor.highlight([ 0, 1, 1, 5 ], "#ff0000");
    } catch {
      // Expected
    }
    editor.highlight([ 1, 1, 1, 5 ], "#00ff00");
    const result = editor.highlights();
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].color, "#00ff00");
  });
});
