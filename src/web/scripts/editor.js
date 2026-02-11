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
    const [ lineStart, columnStart, lineEnd, columnEnd ] = range;
    const totalLines = this.view.state.doc.lines;

    if (lineStart < 1 || lineStart > totalLines) {
      throw new RangeError(`lineStart ${lineStart} is out of range [1, ${totalLines}]`);
    }

    if (lineEnd < 1 || lineEnd > totalLines) {
      throw new RangeError(`lineEnd ${lineEnd} is out of range [1, ${totalLines}]`);
    }

    if (lineEnd < lineStart) {
      throw new RangeError(`lineEnd ${lineEnd} must not be less than lineStart ${lineStart}`);
    }

    const fromLine = this.view.state.doc.line(lineStart);
    const toLine = this.view.state.doc.line(lineEnd);
    const fromLineLength = fromLine.to - fromLine.from;
    const toLineLength = toLine.to - toLine.from;

    if (columnStart < 1 || columnStart > fromLineLength + 1) {
      throw new RangeError(`columnStart ${columnStart} is out of range [1, ${fromLineLength + 1}]`);
    }

    if (columnEnd < 0 || columnEnd > toLineLength) {
      throw new RangeError(`columnEnd ${columnEnd} is out of range [0, ${toLineLength}]`);
    }

    if (lineStart === lineEnd && columnStart - 1 > columnEnd) {
      throw new RangeError(`columnStart ${columnStart} must not exceed columnEnd ${columnEnd} on the same line`);
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

  highlights() {
    const result = [];
    const decorations = this.view.state.field(highlightPlugin);
    const cursor = decorations.iter();
    while (cursor.value) {
      const from = cursor.from;
      const to = cursor.to;
      const fromLine = this.view.state.doc.lineAt(from);
      const toLine = this.view.state.doc.lineAt(to);
      const style = cursor.value.spec.attributes?.style || "";
      const match = style.match(/background-color:\s*([^;]+)/);
      result.push({
        range: [
          fromLine.number,
          from - fromLine.from + 1,
          toLine.number,
          to - toLine.from
        ],
        color: match ? match[1].trim() : ""
      });
      cursor.next();
    }

    return result;
  }

  content() {
    return this.view.state.doc.toString();
  }
};
