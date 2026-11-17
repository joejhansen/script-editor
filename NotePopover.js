import styles from "./windows/notes/notes.css" with {type: "css" };

class NotePopover extends HTMLElement {
    // <div class="note-popover" role="dialog" aria-labelledby="note-popover-title" data-note-id="note-12">
    static styles = styles;
    static templateId = "template-note-popover"; // subclass sets this, or override templateId
    connectedCallback() {
        if (this.shadowRoot) return;

        const root = this.attachShadow({ mode: 'open' });
        root.adoptedStyleSheets = [this.constructor.styles].filter(Boolean);

        const tpl = this.constructor.template
            ?? document.getElementById(this.constructor.templateId);
        if (!tpl) throw new Error(`No template for <${this.localName}>`);

        root.append(tpl.content.cloneNode(true));
        this.init?.(root);
    }
    /**
     * @param {ShadowRoot} root 
     */
    init(root) {
    }
}
customElements.define('note-popover', NotePopover);
