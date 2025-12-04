import { EditorView, Decoration, ViewPlugin, ViewUpdate, keymap,
         drawSelection, highlightActiveLine, lineNumbers } from "@codemirror/view";
import { EditorState, StateField, StateEffect, RangeSetBuilder } from "@codemirror/state";
import { defaultHighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { history, historyKeymap } from "@codemirror/commands";
import { indentOnInput } from "@codemirror/language";
import { json } from "@codemirror/lang-json";

const setHighlights = StateEffect.define();
const highlightPlugin = StateField.define({
  create() { return Decoration.none; },
  update(highlights, transaction) {
    for (const effect of transaction.effects) {
      if (effect.is(setHighlights)) {
        return effect.value;
      }
    }

    if (transaction.docChanged) {
      return highlights.map(transaction.changes);
    }

    return highlights;
  },
  provide: (field) => EditorView.decorations.from(field)
});

export class Editor {
  constructor(parent, contents = "", options = {}) {
    // Track highlight metadata (range and color) for introspection
    this._highlights = [];

    const extensions = [
      lineNumbers(),
      drawSelection(),
      history(),
      keymap.of(historyKeymap),
      indentOnInput(),
      syntaxHighlighting(defaultHighlightStyle),
      EditorView.lineWrapping,
      highlightPlugin
    ];

    if (options.readOnly) {
      extensions.push(EditorView.editable.of(false));
      extensions.push(EditorView.theme({ "&": { backgroundColor: "#fcfcfc" } }))
    } else {
      extensions.push(highlightActiveLine());
    }

    if (options.json) {
      extensions.push(json());
    }

    if (options.callback) {
      const changePlugin = ViewPlugin.define(view => ({
        update(update) {
          if (update.docChanged) {
            options.callback(update.state);
          }
        }
      }));

      extensions.push(changePlugin);
    }

    this.view = new EditorView({ parent, doc: contents, extensions });
  }

  unhighlight() {
    this._highlights = [];
    this.view.dispatch({
      effects: setHighlights.of(Decoration.none)
    });
  }

  highlights() {
    return this._highlights.map(h => ({
      range: [...h.range],
      color: h.color
    }));
  }

  highlight(range, color) {
    const [ lineStart, columnStart, lineEnd, columnEnd ] = range;
    const doc = this.view.state.doc;
    const totalLines = doc.lines;

    // Validate line bounds
    if (lineStart < 1 || lineStart > totalLines) {
      throw new RangeError(`lineStart ${lineStart} is out of bounds (1-${totalLines})`);
    }
    if (lineEnd < 1 || lineEnd > totalLines) {
      throw new RangeError(`lineEnd ${lineEnd} is out of bounds (1-${totalLines})`);
    }
    if (lineStart > lineEnd) {
      throw new RangeError(`lineStart ${lineStart} cannot be greater than lineEnd ${lineEnd}`);
    }

    const fromLine = doc.line(lineStart);
    const toLine = doc.line(lineEnd);

    // Validate column bounds
    // columnStart must be >= 1 and <= line length + 1 (to allow cursor at end)
    const fromLineLength = fromLine.to - fromLine.from;
    if (columnStart < 1 || columnStart > fromLineLength + 1) {
      throw new RangeError(`columnStart ${columnStart} is out of bounds for line ${lineStart} (1-${fromLineLength + 1})`);
    }

    const toLineLength = toLine.to - toLine.from;
    if (columnEnd < 1 || columnEnd > toLineLength + 1) {
      throw new RangeError(`columnEnd ${columnEnd} is out of bounds for line ${lineEnd} (1-${toLineLength + 1})`);
    }

    // If same line, columnStart must be <= columnEnd
    if (lineStart === lineEnd && columnStart > columnEnd) {
      throw new RangeError(`columnStart ${columnStart} cannot be greater than columnEnd ${columnEnd} on the same line`);
    }

    const from = fromLine.from + columnStart - 1;
    const to = toLine.from + columnEnd;

    const decoration = Decoration.mark({
      attributes: {
        // Margin/padding to compensate whiteness between lines
        style: `
          background-color: ${color};
          margin: -2px 0 -2px 0;
          padding: 2px 0 2px 0;
        `
      }
    });

    // Make sure to not override existing highlights
    const current = this.view.state.field(highlightPlugin);
    const newSet = current.update({
      add: [ { from, to, value: decoration } ],
      sort: true
    });

    // Track highlight metadata for introspection
    this._highlights.push({
      range: [lineStart, columnStart, lineEnd, columnEnd],
      color
    });

    this.view.dispatch({
      effects: setHighlights.of(newSet)
    });
  }

  scroll(lineNumber) {
    const line = this.view.state.doc.line(lineNumber);
    this.view.dispatch({
      effects: EditorView.scrollIntoView(line.from, {
        y: "center", behavior: "smooth"
      })
    });
  }

  setContent(content) {
    const transaction = this.view.state.update({
      changes: { from: 0, to: this.view.state.doc.length, insert: content }
    });

    this.view.dispatch(transaction);
  }

  content() {
    return this.view.state.doc.toString();
  }
};
