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
    this.view.dispatch({
      effects: setHighlights.of(Decoration.none)
    });
  }

  highlight(range, color) {
    if (!Array.isArray(range) || range.length !== 4) {
      throw new RangeError("Expected a highlight range of 4 numbers");
    }

    const [ lineStart, columnStart, lineEnd, columnEnd ] = range;
    if (![ lineStart, columnStart, lineEnd, columnEnd ].every(Number.isInteger)) {
      throw new RangeError("Expected integer highlight coordinates");
    }

    if (lineStart > lineEnd) {
      throw new RangeError("The highlight start line must not exceed the end line");
    }

    const fromLine = this.view.state.doc.line(lineStart);
    const toLine = this.view.state.doc.line(lineEnd);

    if (columnStart < 1 || columnStart > fromLine.length + 1) {
      throw new RangeError("The highlight start column is out of bounds");
    }

    if (columnEnd < 0 || columnEnd > toLine.length) {
      throw new RangeError("The highlight end column is out of bounds");
    }

    const from = fromLine.from + columnStart - 1;
    const to = toLine.from + columnEnd;
    if (from > to) {
      throw new RangeError("The highlight start must not exceed the end");
    }

    const decoration = Decoration.mark({
      color,
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

    this.view.dispatch({
      effects: setHighlights.of(newSet)
    });
  }

  highlights() {
    const highlights = [];
    const doc = this.view.state.doc;

    this.view.state.field(highlightPlugin).between(0, doc.length, (from, to, value) => {
      const fromLine = doc.lineAt(from);
      const toLine = doc.lineAt(to);
      const color = value.spec.color ??
        value.spec.attributes?.style?.match(/background-color:\s*([^;]+);/)?.[1]?.trim();

      highlights.push({
        range: [
          fromLine.number,
          from - fromLine.from + 1,
          toLine.number,
          to - toLine.from
        ],
        color
      });
    });

    return highlights;
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
