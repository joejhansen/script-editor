export class NoteMenu {
    /**
     * @param {Object.<string,Object.<string,string>>} data 
     */
    constructor(data = {}, table = null) {
        /** @type {Object.<string,Object.<string,string>>} */
        this.Data = data;
        /** @type {HTMLTableElement} */
        this.Table = table;
        this.LastCategory = "";
    }
    /**
     * @returns {HTMLTableElement}
     */
    createTable() {
        /** @type {Object.<string, number>} */
        let catCols = {};
        const notes = Object.values(this.Data)
        const table = document.createElement("table")
        for (const note of notes) {
            let colI = 0;
            for (const cat of Object.keys(note)) {
                if (!catCols[cat]) { catCols[cat] = colI; colI++ }
            }
        }
        const sortedCatCols = Object.entries(catCols).sort((a, b) => a[1] - b[1])
        const headRow = document.createElement("tr")
        for (let colTup of sortedCatCols) {
            const catCol = document.createElement("th")
            catCol.setAttribute("contenteditable", "true")
            catCol.textContent = colTup[0]
            catCol.addEventListener("focusin", this.handleHeaderFocusIn)
            catCol.addEventListener("focusout", this.handleCellFocusOut)
            headRow.appendChild(catCol)
        }
        table.appendChild(headRow)
        for (const id in notes) {
            const noteRow = document.createElement("tr")
            noteRow.dataset.id = id;
            for (let i = 0; i < sortedCatCols.length; i++) {
                const td = document.createElement("td")
                td.setAttribute("contenteditable", "true")
                td.addEventListener("focusout", this.handleCellFocusOut)
                if (notes[id][sortedCatCols]) td.textContent = notes[id][sortedCatCols]
                noteRow.appendChild(td)
            }
            table.appendChild(noteRow)
        }
        return table;
    }
    /**
     * @param {string} id 
     * @param {string} cat 
     * @param {string} data 
     */
    updateNoteContent(id, cat, data) {
        this.Data[id][cat] = data;
    }
    /**
     * @param {string} oldKey 
     * @param {string} newKey 
     * @returns 
     */
    updateNoteCat(oldKey, newKey) {
        if (oldKey === newKey) return;
        for (const note of Object.entries(data)) {
            if (!note[oldKey]) continue;
            note[newKey] = note[oldKey]
            delete note[oldKey]
        }
    }
    /**
     * @param {string} id 
     * @param {Object.<string,string>} data 
     */
    updateNote(id, data) {
        this.Data[id] = data;
    }
    /**
     * @param {Record.<string,string>} data 
     */
    newNote(id = window.crypto.randomUUID(), data = {}) {
        this.Data[id] = data;
        return id;
    }
    /**
     * @param {string} uuid 
     */
    deleteNote(uuid) {
        delete this.Data[uuid];
    }
    addRow() {
        const newRow = document.createElement("tr")
        const newUUID = this.newNote();
        newRow.dataset.id = newUUID;
        for (let i = 0; i < this.Table.children[0].childElementCount; i++) {
            const td = document.createElement("td")
            td.setAttribute("contenteditable", "true")
            td.addEventListener("focusout", this.handleCellFocusOut)
            newRow.appendChild(td)
        }
        this.Table.appendChild(newRow)
    }
    /**
     * @param {string} rowID 
     */
    deleteRow(rowID) {
        for (const row of this.Table.children) {
            if (row.dataset.id === rowID) { this.Table.removeChild(row); break; }
        }
        this.deleteNote(rowID)
    }
    /**
     * @param {string} name 
     */
    addCol(name) {
        const newTH = document.createElement("th")
        newTH.textContent = name;
        newTH.setAttribute("contenteditable", "true")
        this.Table.children[0].appendChild(newTH)
        for (let i = 1; i < this.Table.children.length; i++) {
            const newCell = document.createElement("td")
            newCell.setAttribute("contenteditable", "true")
            this.Table.children[i].append(newCell)
        }
    }
    /**
     * @param {string} name 
     */
    deleteCol(name) {
        let colI = -1;
        for (const head of this.Table.children[0]) {
            if (head.textContent === name) colI = head.cellIndex;
        }
        if (colI === -1) return;
        for (const row of this.Table.children) {
            row.removeChild(row.children[colI])
        }
    }
    /**
     * @param {HTMLElement} popover 
     */
    renderTable(popover) {
        while (popover.firstChild) popover.removeChild(popover).firstChild;
        if (this.Table === null) this.Table = this.createTable();
        popover.appendChild(this.Table)
    }
    /**
     * @param {FocusEvent} e 
     */
    handleHeaderFocusIn(e) {
        e.stopPropagation()
        const cell = e.target
        if (cell.tagName === "TH") {
            this.LastCategory = e.target.textContent;
        }
    }
    /**
     * @param {FocusEvent} e 
     */
    handleCellFocusOut(e) {
        e.stopPropagation()
        /** @type {HTMLTableCellElement} */
        const cell = e.target;
        if (cell.tagName === "TD") {
            this.updateNoteContent(cell.parentElement.dataset.id, this.Table.children[cell.cellIndex].textContent, cell.textContent)
        } else if (cell.tagName === "TH") {
            this.updateNoteCat(this.LastCategory, e.target.textContent)
        }
    }
    /**
     * 
     * @param {string} id 
     * @returns {HTMLElement | null}
     */
    makeNoteTooltip(id) {
        if (!this.Data[id]) return null;
        const newPopover = document.createElement("div")
        newPopover.style.positionAnchor = "--" + id;
        newPopover.style.top = `anchor(--${id} top)`
        newPopover.style.right = `anchor(--${id} right)`
        newPopover.id = id
        const thisNote = this.Data[id];
        for (const note in thisNote) {
            newPopover.dataset[note] = thisNote[note]
            newPopover.textContent = `${note}: ${thisNote[note]}`
        }
        return newPopover;
    }
    /**
     * 
     * @param {string} id 
     * @param {HTMLElement} wrapper 
     * @returns {boolean}
     */
    renderNoteTooltip(id, wrapper) {
        const newTooltip = this.makeNoteTooltip(id)
        if (!newTooltip) return false;
        const maybeLast = wrapper.querySelector("#" + id)
        if (maybeLast) wrapper.removeChild(maybeLast);
        wrapper.appendChild(newTooltip);
        return true;
    }

}

export class Notes {
    /**
     * Each type of notes category is a record of UUIDs with a sort-of-standard note attached.
     * @param {NoteMenu} sceneProps 
     * @param {NoteMenu} scriptNotes 
     * @param {NoteMenu} comments 
     * @param {NoteMenu} beats 
     * @param {NoteMenu} structurePoints 
     * @param {NoteMenu} bookmarks 
     * @param {NoteMenu} sfx 
     * @param {NoteMenu} vfx 
     * @param {NoteMenu} props 
     */
    constructor(
        sceneProps = new NoteMenu(),
        scriptNotes = new NoteMenu(),
        comments = new NoteMenu(),
        beats = new NoteMenu(),
        structurePoints = new NoteMenu(),
        bookmarks = new NoteMenu(),
        sfx = new NoteMenu(),
        vfx = new NoteMenu(),
        props = new NoteMenu()
    ) {
        this.SceneProps = sceneProps;
        this.ScriptNotes = scriptNotes;
        this.Comments = comments;
        this.Beats = beats;
        this.StructurePoints = structurePoints;
        this.Bookmarks = bookmarks;
        this.Sfx = sfx;
        this.Vfx = vfx;
        this.Props = props;
    }
}