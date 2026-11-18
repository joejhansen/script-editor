import { NoteMenu, Notes } from "./Notes.js";
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
        const SortOrder = root.querySelector(".sort-order")
        const SortSelect = root.querySelector("#sort-filter")
        const FilterSelect = root.querySelector("#type-filter")
        SortOrder.addEventListener("click", (e) => NotesTable.handleToggleSortOrder(e, root, SortSelect))
        FilterSelect.addEventListener("change", (e) => NotesTable.handleFilterNotes(root, FilterSelect.value))
        SortSelect.addEventListener("change", (e) => NotesTable.sortNotesBy(root, SortSelect.value, SortOrder.value))
        root.querySelector("#close-note-table-button").addEventListener("click", (e) => this.handleCloseButton(e, root))
    }
    /**
     * @param {Event} e 
     */
    static handleToggleSortOrder(e, root, sortSelect) {
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
        NotesTable.sortNotesBy(root, sortSelect.value, thisNode.parentElement.value)
    }
    /**
     * @param {ShadowRoot} root 
     * @param {string} by 
     * @param {"ascending" | "descending"} order 
     */
    static sortNotesBy(root, by, order) {
        // Page
        // Author
        // Date Created
        // Date Modified
        // Page Number
        // Note Type
        const TBody = root.querySelector("tbody")
        const RowClones = [...TBody.children]
        if (by === "note-type") {
            RowClones.sort((a, b) => {
                if (order === "descending") {
                    return a.dataset.type - b.dataset.type;
                } else {
                    return b.dataset.type - a.dataset.type;
                }
            })
        } else {
            RowClones.sort((a, b) => {
                if (order === "descending") {
                    return a.querySelector(`.${by}`).dataset.value - b.querySelector(`.${by}`).dataset.value
                } else {
                    return b.querySelector(`.${by}`).dataset.value - a.querySelector(`.${by}`).dataset.value
                }
            })
        }
        TBody.replaceChildren(...RowClones)
        // const RowClones = [...TBody.children].sort((a, b) => {
        //     if (order === "ascending") {
        //         return b - a
        //     } else {
        //         return a - b
        //     }
        // })
    }
    static noteOnClick(e) {

    }
    static handleNoteSearch(e) {

    }
    static handleFilterNotes(root, by) {
        /** @type {HTMLElement} */
        const TBody = root.querySelector("tbody")
        root.querySelector("#type-filter").value = by;
        if (by === "all") {
            for (const row of TBody.children) {
                row.classList.remove("hidden")
            }
            return
        }
        const DataTypeString = Notes.KeysToStrings[by].toLowerCase().split(" ").join("-")
        for (const row of TBody.children) {
            if (row.dataset.type === DataTypeString) row.classList.remove("hidden")
            else row.classList.add("hidden")
        }

    }
    handleCloseButton(e, root) {
        e.preventDefault();
        root.querySelector(".notes-ui").hidePopover();
    }
    /**
     * 
     * @param {event} e 
     * @param {ShadowRoot} root 
     * @param {Object.<string,string>} note
     * @param {string} noteID 
     * @param {string} noteType
     * @param {HTMLElement} tbody 
     * @param {NoteMenu} noteMenu 
     * @return {HTMLTableRowElement}
     */
    static makeTableRow(note, noteID, noteType, tbody, noteMenu) {
        const NewRow = document.createElement("tr")
        NewRow.dataset.noteID = noteID
        NewRow.style.anchorName = `--note-table-${noteID}`
        const DataTypeString = Notes.KeysToStrings[noteType]?.toLowerCase().split(" ").join("-") ?? noteType.toLowerCase().split(" ").join("-");
        NewRow.dataset.type = DataTypeString;
        const TypeCol = document.createElement("td")
        const TypeSpan = document.createElement("span")
        TypeSpan.classList.add("note-chip")
        TypeSpan.dataset.type = DataTypeString
        TypeSpan.textContent = Notes.KeysToStrings[noteType] ?? noteType;
        TypeCol.appendChild(TypeSpan)
        NewRow.appendChild(TypeCol)

        const NoteCol = document.createElement("td")
        const NoteContent = document.createElement("div")
        NoteContent.classList.add("notes-row__open")
        NoteContent.dataset.action = "open-note";
        NoteContent.textContent = note?.Content ?? ""
        NoteCol.appendChild(NoteContent)
        NewRow.appendChild(NoteCol)

        const PageCol = document.createElement("td")
        PageCol.classList.add("page")
        PageCol.textContent = note?.Page ?? ""
        PageCol.dataset.value = note?.Page ?? ""
        NewRow.appendChild(PageCol)

        const AuthCol = document.createElement("td")
        AuthCol.classList.add("author")
        AuthCol.textContent = note?.Author ?? ""
        AuthCol.dataset.value = note?.Author ?? ""
        NewRow.appendChild(AuthCol)

        const DateCol = document.createElement("td")
        DateCol.classList.add("date")
        DateCol.dataset.value = "";
        if (note.DateTime) {
            const newDate = new Date(note.DateTime);
            const shortDateString = newDate.toDateString().split(" ");
            DateCol.textContent = `${shortDateString[1]} ${shortDateString[2]}`
            DateCol.dataset.value = newDate.getMilliseconds();
        }

        const close = (someEl) => { lastNoteOpened = null; someEl.remove(); }
        NewRow.addEventListener("click", (e) => {
            // if (lastNoteOpened && tbody.contains(lastNoteOpened)) lastNoteOpened.parentElement.removeChild(lastNoteOpened)
            lastNoteOpened?.remove();
            lastNoteOpened = null;
            const newTooltip = NoteMenu.makeNoteTooltipStatic(NewRow.dataset.noteID, noteType, note, noteMenu, close)
            /** @type {HTMLElement} */
            newTooltip.style.position = "absolute"
            newTooltip.style.positionAnchor = `--note-table-${noteID}`
            newTooltip.style.left = `anchor(--note-table-${noteID} center)`
            newTooltip.style.top = `anchor(--note-table-${noteID} bottom)`
            tbody.appendChild(newTooltip)
            lastNoteOpened = newTooltip
        })

        NewRow.appendChild(DateCol)

        return NewRow
    }
    /**
     * 
     * @param {ShadowRoot} root 
     * @param {Notes} notes 
     */
    static makeNotesTable(root, notes) {
        /** @type {HTMLTableElement} */
        const TBody = root.querySelector("tbody")
        // TBody.innerHTML = ""
        for (const NoteType in notes) {
            for (const NoteID in notes[NoteType].Data) {
                TBody.appendChild(NotesTable.makeTableRow(notes[NoteType].Data[NoteID], NoteID, NoteType, TBody, notes[NoteType]))
            }
        }
    }
    static open(e, root, noteType = "all") {
        /** @type {HTMLElement} */
        const table = root.querySelector(".notes-ui");
        if (root.querySelector("#type-filter").value === noteType && table.matches(":popover-open")) {
            table.hidePopover();
        } else {
            table.showPopover();
            NotesTable.handleFilterNotes(root, noteType)
        }

    }
    /**
     * 
     * @param {ShadowRoot} root 
     * @param {string} id 
     * @param {Object.<string,string>} data 
     * @param {string} noteType 
     * @param {NoteMenu}
     * @param {string | null} field 
     * @returns {boolean}
     */
    static updateNoteRow(root, id, data, noteType, noteMenu, field = null) {
        const TBody = root.querySelector("tbody")
        for (const row of TBody.children) {
            if (row.dataset.noteID === id) {
                row.replaceWith(NotesTable.makeTableRow(data, id, noteType, TBody, noteMenu))
                return true;
            }
        }
        return false;
    }
}
/** @type {HTMLElement | null} */
let lastNoteOpened = null;
customElements.define('notes-table', NotesTable);
