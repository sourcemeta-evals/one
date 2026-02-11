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

describe("Editor highlight", () => {
  const container = document.getElementById("editor");

  beforeEach(() => {
    container.innerHTML = "";
  });

  test("highlights returns empty array by default", () => {
    const editor = new Editor(container, "hello world");
    assert.deepStrictEqual(editor.highlights(), []);
  });

  test("highlight single word on single line", () => {
    const editor = new Editor(container, "hello world");
    editor.highlight([ 1, 1, 1, 5 ], "#ff0000");
    const result = editor.highlights();
    assert.strictEqual(result.length, 1);
    assert.deepStrictEqual(result[0].range, [ 1, 1, 1, 5 ]);
    assert.strictEqual(result[0].color, "#ff0000");
  });

  test("highlight entire single line", () => {
    const editor = new Editor(container, "hello world");
    editor.highlight([ 1, 1, 1, 11 ], "#00ff00");
    const result = editor.highlights();
    assert.strictEqual(result.length, 1);
    assert.deepStrictEqual(result[0].range, [ 1, 1, 1, 11 ]);
    assert.strictEqual(result[0].color, "#00ff00");
  });

  test("highlight span across multiple lines", () => {
    const editor = new Editor(container, "line 1\nline 2\nline 3");
    editor.highlight([ 1, 1, 2, 6 ], "#0000ff");
    const result = editor.highlights();
    assert.strictEqual(result.length, 1);
    assert.deepStrictEqual(result[0].range, [ 1, 1, 2, 6 ]);
    assert.strictEqual(result[0].color, "#0000ff");
  });

  test("highlight span across all lines", () => {
    const editor = new Editor(container, "aaa\nbbb\nccc");
    editor.highlight([ 1, 1, 3, 3 ], "#abcdef");
    const result = editor.highlights();
    assert.strictEqual(result.length, 1);
    assert.deepStrictEqual(result[0].range, [ 1, 1, 3, 3 ]);
    assert.strictEqual(result[0].color, "#abcdef");
  });

  test("highlight middle of a line", () => {
    const editor = new Editor(container, "hello world");
    editor.highlight([ 1, 3, 1, 7 ], "#112233");
    const result = editor.highlights();
    assert.strictEqual(result.length, 1);
    assert.deepStrictEqual(result[0].range, [ 1, 3, 1, 7 ]);
    assert.strictEqual(result[0].color, "#112233");
  });

  test("highlight preserves color string", () => {
    const editor = new Editor(container, "hello world");
    editor.highlight([ 1, 1, 1, 5 ], "#aabbcc");
    const result = editor.highlights();
    assert.strictEqual(result[0].color, "#aabbcc");
  });

  test("multiple highlights accumulate", () => {
    const editor = new Editor(container, "hello world foo");
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
    const editor = new Editor(container, "aaa\nbbb\nccc");
    editor.highlight([ 1, 1, 1, 3 ], "#ff0000");
    editor.highlight([ 3, 1, 3, 3 ], "#0000ff");
    const result = editor.highlights();
    assert.strictEqual(result.length, 2);
    assert.deepStrictEqual(result[0].range, [ 1, 1, 1, 3 ]);
    assert.strictEqual(result[0].color, "#ff0000");
    assert.deepStrictEqual(result[1].range, [ 3, 1, 3, 3 ]);
    assert.strictEqual(result[1].color, "#0000ff");
  });

  test("three highlights accumulate in order", () => {
    const editor = new Editor(container, "aaa bbb ccc");
    editor.highlight([ 1, 1, 1, 3 ], "#ff0000");
    editor.highlight([ 1, 5, 1, 7 ], "#00ff00");
    editor.highlight([ 1, 9, 1, 11 ], "#0000ff");
    const result = editor.highlights();
    assert.strictEqual(result.length, 3);
    assert.deepStrictEqual(result[0].range, [ 1, 1, 1, 3 ]);
    assert.deepStrictEqual(result[1].range, [ 1, 5, 1, 7 ]);
    assert.deepStrictEqual(result[2].range, [ 1, 9, 1, 11 ]);
  });

  test("unhighlight clears all highlights", () => {
    const editor = new Editor(container, "hello world");
    editor.highlight([ 1, 1, 1, 5 ], "#ff0000");
    assert.strictEqual(editor.highlights().length, 1);
    editor.unhighlight();
    assert.deepStrictEqual(editor.highlights(), []);
  });

  test("unhighlight clears multiple highlights", () => {
    const editor = new Editor(container, "hello world foo");
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

  test("highlights returns empty after unhighlight on empty editor", () => {
    const editor = new Editor(container, "text");
    editor.unhighlight();
    assert.deepStrictEqual(editor.highlights(), []);
  });

  test("highlight single character", () => {
    const editor = new Editor(container, "abcdef");
    editor.highlight([ 1, 3, 1, 3 ], "#123456");
    const result = editor.highlights();
    assert.strictEqual(result.length, 1);
    assert.deepStrictEqual(result[0].range, [ 1, 3, 1, 3 ]);
    assert.strictEqual(result[0].color, "#123456");
  });

  test("highlight last character of a line", () => {
    const editor = new Editor(container, "abcdef");
    editor.highlight([ 1, 6, 1, 6 ], "#654321");
    const result = editor.highlights();
    assert.strictEqual(result.length, 1);
    assert.deepStrictEqual(result[0].range, [ 1, 6, 1, 6 ]);
  });

  test("highlight on second line only", () => {
    const editor = new Editor(container, "aaa\nbbb\nccc");
    editor.highlight([ 2, 1, 2, 3 ], "#ff00ff");
    const result = editor.highlights();
    assert.strictEqual(result.length, 1);
    assert.deepStrictEqual(result[0].range, [ 2, 1, 2, 3 ]);
    assert.strictEqual(result[0].color, "#ff00ff");
  });

  test("highlight on last line only", () => {
    const editor = new Editor(container, "aaa\nbbb\nccc");
    editor.highlight([ 3, 1, 3, 3 ], "#00ffff");
    const result = editor.highlights();
    assert.strictEqual(result.length, 1);
    assert.deepStrictEqual(result[0].range, [ 3, 1, 3, 3 ]);
    assert.strictEqual(result[0].color, "#00ffff");
  });

  test("highlight with columnEnd zero on single line", () => {
    const editor = new Editor(container, "hello");
    editor.highlight([ 1, 1, 1, 0 ], "#aaaaaa");
    const result = editor.highlights();
    assert.strictEqual(result.length, 1);
    assert.deepStrictEqual(result[0].range, [ 1, 1, 1, 0 ]);
  });

  test("highlight result object has correct shape", () => {
    const editor = new Editor(container, "hello world");
    editor.highlight([ 1, 1, 1, 5 ], "#ff0000");
    const result = editor.highlights();
    assert.strictEqual(result.length, 1);
    assert.ok(Array.isArray(result[0].range));
    assert.strictEqual(result[0].range.length, 4);
    assert.strictEqual(typeof result[0].color, "string");
  });

  test("highlight preserves content unchanged", () => {
    const editor = new Editor(container, "hello world");
    editor.highlight([ 1, 1, 1, 5 ], "#ff0000");
    assert.strictEqual(editor.content(), "hello world");
  });

  test("unhighlight preserves content unchanged", () => {
    const editor = new Editor(container, "hello world");
    editor.highlight([ 1, 1, 1, 5 ], "#ff0000");
    editor.unhighlight();
    assert.strictEqual(editor.content(), "hello world");
  });
});

describe("Editor highlight range validation", () => {
  const container = document.getElementById("editor");

  beforeEach(() => {
    container.innerHTML = "";
  });

  test("throws RangeError for lineStart less than 1", () => {
    const editor = new Editor(container, "hello");
    assert.throws(() => {
      editor.highlight([ 0, 1, 1, 5 ], "#ff0000");
    }, RangeError);
  });

  test("throws RangeError for lineStart negative", () => {
    const editor = new Editor(container, "hello");
    assert.throws(() => {
      editor.highlight([ -1, 1, 1, 5 ], "#ff0000");
    }, RangeError);
  });

  test("throws RangeError for lineStart beyond document", () => {
    const editor = new Editor(container, "hello");
    assert.throws(() => {
      editor.highlight([ 2, 1, 2, 1 ], "#ff0000");
    }, RangeError);
  });

  test("throws RangeError for lineEnd less than 1", () => {
    const editor = new Editor(container, "hello");
    assert.throws(() => {
      editor.highlight([ 1, 1, 0, 5 ], "#ff0000");
    }, RangeError);
  });

  test("throws RangeError for lineEnd negative", () => {
    const editor = new Editor(container, "hello");
    assert.throws(() => {
      editor.highlight([ 1, 1, -1, 5 ], "#ff0000");
    }, RangeError);
  });

  test("throws RangeError for lineEnd beyond document", () => {
    const editor = new Editor(container, "hello");
    assert.throws(() => {
      editor.highlight([ 1, 1, 2, 5 ], "#ff0000");
    }, RangeError);
  });

  test("throws RangeError for lineStart greater than lineEnd", () => {
    const editor = new Editor(container, "aaa\nbbb\nccc");
    assert.throws(() => {
      editor.highlight([ 3, 1, 1, 3 ], "#ff0000");
    }, RangeError);
  });

  test("throws RangeError for lineStart greater than lineEnd adjacent lines", () => {
    const editor = new Editor(container, "aaa\nbbb");
    assert.throws(() => {
      editor.highlight([ 2, 1, 1, 3 ], "#ff0000");
    }, RangeError);
  });

  test("throws RangeError for columnStart less than 1", () => {
    const editor = new Editor(container, "hello");
    assert.throws(() => {
      editor.highlight([ 1, 0, 1, 5 ], "#ff0000");
    }, RangeError);
  });

  test("throws RangeError for columnStart negative", () => {
    const editor = new Editor(container, "hello");
    assert.throws(() => {
      editor.highlight([ 1, -1, 1, 5 ], "#ff0000");
    }, RangeError);
  });

  test("throws RangeError for columnStart beyond line length", () => {
    const editor = new Editor(container, "hello");
    assert.throws(() => {
      editor.highlight([ 1, 7, 1, 5 ], "#ff0000");
    }, RangeError);
  });

  test("throws RangeError for columnEnd negative", () => {
    const editor = new Editor(container, "hello");
    assert.throws(() => {
      editor.highlight([ 1, 1, 1, -1 ], "#ff0000");
    }, RangeError);
  });

  test("throws RangeError for columnEnd beyond line length", () => {
    const editor = new Editor(container, "hello");
    assert.throws(() => {
      editor.highlight([ 1, 1, 1, 6 ], "#ff0000");
    }, RangeError);
  });

  test("throws RangeError for lineStart zero with multiline content", () => {
    const editor = new Editor(container, "aaa\nbbb\nccc");
    assert.throws(() => {
      editor.highlight([ 0, 1, 2, 3 ], "#ff0000");
    }, RangeError);
  });

  test("throws RangeError for lineEnd far beyond document", () => {
    const editor = new Editor(container, "aaa\nbbb");
    assert.throws(() => {
      editor.highlight([ 1, 1, 100, 1 ], "#ff0000");
    }, RangeError);
  });

  test("throws RangeError for columnStart far beyond line", () => {
    const editor = new Editor(container, "hi");
    assert.throws(() => {
      editor.highlight([ 1, 50, 1, 2 ], "#ff0000");
    }, RangeError);
  });

  test("throws RangeError for columnEnd far beyond line", () => {
    const editor = new Editor(container, "hi");
    assert.throws(() => {
      editor.highlight([ 1, 1, 1, 50 ], "#ff0000");
    }, RangeError);
  });

  test("does not throw for valid range on single line", () => {
    const editor = new Editor(container, "hello");
    assert.doesNotThrow(() => {
      editor.highlight([ 1, 1, 1, 5 ], "#ff0000");
    });
  });

  test("does not throw for valid range on multiple lines", () => {
    const editor = new Editor(container, "aaa\nbbb\nccc");
    assert.doesNotThrow(() => {
      editor.highlight([ 1, 1, 3, 3 ], "#ff0000");
    });
  });

  test("does not throw for same line start and end", () => {
    const editor = new Editor(container, "aaa\nbbb\nccc");
    assert.doesNotThrow(() => {
      editor.highlight([ 2, 1, 2, 3 ], "#ff0000");
    });
  });

  test("does not throw for columnEnd zero", () => {
    const editor = new Editor(container, "hello");
    assert.doesNotThrow(() => {
      editor.highlight([ 1, 1, 1, 0 ], "#ff0000");
    });
  });

  test("does not throw for columnStart at end of line", () => {
    const editor = new Editor(container, "hello");
    assert.doesNotThrow(() => {
      editor.highlight([ 1, 6, 1, 5 ], "#ff0000");
    });
  });

  test("invalid range does not add highlight", () => {
    const editor = new Editor(container, "hello");
    assert.throws(() => {
      editor.highlight([ 0, 1, 1, 5 ], "#ff0000");
    }, RangeError);
    assert.deepStrictEqual(editor.highlights(), []);
  });

  test("valid highlight still works after invalid attempt", () => {
    const editor = new Editor(container, "hello");
    assert.throws(() => {
      editor.highlight([ 0, 1, 1, 5 ], "#ff0000");
    }, RangeError);
    editor.highlight([ 1, 1, 1, 5 ], "#00ff00");
    const result = editor.highlights();
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].color, "#00ff00");
  });

  test("throws RangeError message includes lineStart value", () => {
    const editor = new Editor(container, "hello");
    assert.throws(() => {
      editor.highlight([ 0, 1, 1, 5 ], "#ff0000");
    }, (err) => {
      assert.ok(err instanceof RangeError);
      assert.ok(err.message.includes("0"));
      return true;
    });
  });

  test("throws RangeError message includes lineEnd value", () => {
    const editor = new Editor(container, "hello");
    assert.throws(() => {
      editor.highlight([ 1, 1, 5, 5 ], "#ff0000");
    }, (err) => {
      assert.ok(err instanceof RangeError);
      assert.ok(err.message.includes("5"));
      return true;
    });
  });

  test("throws RangeError message includes columnStart value", () => {
    const editor = new Editor(container, "hello");
    assert.throws(() => {
      editor.highlight([ 1, 0, 1, 5 ], "#ff0000");
    }, (err) => {
      assert.ok(err instanceof RangeError);
      assert.ok(err.message.includes("0"));
      return true;
    });
  });

  test("throws RangeError message includes columnEnd value", () => {
    const editor = new Editor(container, "hello");
    assert.throws(() => {
      editor.highlight([ 1, 1, 1, 50 ], "#ff0000");
    }, (err) => {
      assert.ok(err instanceof RangeError);
      assert.ok(err.message.includes("50"));
      return true;
    });
  });
});
