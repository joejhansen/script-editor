import styles from "./windows/notes/notes-table.css" with {type: "css" };

export class NotesTable extends HTMLElement {
    static templateId = "template-notes-table"; // subclass sets this, or override templateId
    static ArrowDown = "./img/material-icons/arrow_downward_24dp_E3E3E3_FILL0_wght100_GRAD0_opsz24.svg"
    static ArrowUp = "./img/material-icons/arrow_upward_24dp_E3E3E3_FILL0_wght100_GRAD0_opsz24.svg"
    static styles = styles;
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
        root.querySelector(".sort-order").addEventListener("click", (e) => this.handleToggleSort(e, root))
        root.querySelector(".notes-filter").addEventListener("change", (e) => this.handleFilterNotes(e, root))
        root.querySelector(".note-icon-btn").addEventListener("click", (e) => this.handleCloseButton(e, root))
    }
    /**
     * @param {Event} e 
     */
    handleToggleSort(e, root) {
        e.preventDefault();
        let thisNode = e.target;
        while (thisNode.tagName !== "IMG") {
            thisNode = thisNode.firstChild;
        }
        if (thisNode.parentElement.value === "descending") {
            thisNode.parentElement.title = "ascending"
            thisNode.parentElement.value = "ascending"
            thisNode.setAttribute("src", NotesTable.ArrowUp)
        } else {
            thisNode.parentElement.title = "descending"
            thisNode.parentElement.value = "descending"
            thisNode.setAttribute("src", NotesTable.ArrowDown)
        }
    }
    /**
     * @param {event} e 
     * @param {string} by 
     * @param {string} order 
     */
    sortNotesBy(e, by, order) {

    }
    noteOnClick(e) {

    }
    handleNoteSearch(e) {

    }
    handleFilterNotes(e, root) {

    }
    handleCloseButton(e, root) {
        e.preventDefault();
        root.querySelector(".notes-ui").hidePopover();
    }
    static open(e, root, notes, noteType = "all") {
        if (!root.querySelector(".notes-ui").togglePopover()) return
        if (noteType === "all"){
            console.log("Showing all notes")
        } else {
            console.log(`Showing notes: ${noteType}`)
        }
    }
}
customElements.define('notes-table', NotesTable);
