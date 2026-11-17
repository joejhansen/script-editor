import { handleToggleNote } from "./ScriptConversion.js";

export class NoteMenu {
    static ImageURLNote = "img/material-icons/ink_pen_64dp_E3E3E3_FILL0_wght100_GRAD0_opsz48.svg";

    /**
     * @param {string} [noteType="Note"] 
     * @param {Object.<string,Object.<string,string>>} data 
     * @param {HTMLTableElement | null} [table=null] 
     */
    constructor(noteType = "Note", data = {}, table = null) {
        /**@type {string} */
        this.NoteType = noteType;
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
    makeNoteTableRow() {
        // <tr data-note-id="note-2">
        //      <td><span class="note-chip" data-type="suggestion">Suggestion</span></td>
        //      <td><button class="notes-row__open" data-action="open-note">Tighten the opening paragraph.</button></td>
        //      <td>2</td>
        //      <td>Jordan Lee</td>
        //      <td><span class="note-status" data-status="open">Open</span></td>
        //      <td>Nov 10</td>
        // </tr>
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
     * @param {string} id 
     * @returns {HTMLElement | null}
     */
    makeNoteTooltip(id) {
        if (!this.Data[id]) return null;
        return NoteMenu.makeNoteTooltipStatic(id, this.Data[id])
    }
    /**
     * @param {string} id
     * @param {string} noteType 
     * @param {Object.<string,string>} noteObj 
     * @returns {HTMLElement}
     */
    static makeNoteTooltipStatic(id, noteType, noteObj) {
        /** @type {Node} */
        const NewNotePopover = document.importNode(document.getElementById("template-note-popover").content, true)
        NewNotePopover.id = id;
        // NewNotePopover.
        // NewNotePopover.style
        // const newPopover = document.createElement("div")
        // newPopover.classList.add("note")
        // newPopover.id = id
        NewNotePopover.getElementById("note-popover-title").textContent = noteType
        // <tr>
        //     <th scope="row"></th>
        //     <td data-bind=""></td>
        // </tr>
        const NoteFields = NewNotePopover.querySelector("table")
        for (const note in noteObj) {
            if (note === "Content") {
                NewNotePopover.getElementById("note-body").textContent = noteObj[note]
                continue
            }
            const newRow = document.createElement("tr")
            const newHeading = document.createElement("th")
            newHeading.getAttribute("scope", "row")
            newHeading.textContent = note;
            const newData = document.createElement("td")
            newData.dataset.bind = note
            newData.textContent = noteObj[note]
            newRow.appendChild(newHeading)
            newRow.appendChild(newData)
            // newData.textContent = noteObj[note]
            // const newNote = document.createElement("div")
            // newNote.dataset[note] = noteObj[note]
            // newNote.textContent = `${note}: ${noteObj[note]}`
            NoteFields.appendChild(newRow)
        }
        return NewNotePopover;
    }
    /**
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
    /**
     * @param {Object.<string,Object.<string,string>>} data 
     * @returns {NoteMenu}
     */
    static fromSave(noteType, data) {
        return new NoteMenu(noteType, data)
    }
}

export class Notes {
    static KeysToStrings = {
        SceneProps: "Scene Property",
        ScriptNotes: "Script Note",
        Comments: "Comment",
        Beats: "Beat",
        StructurePoints: "Structure",
        Bookmarks: "Bookmark",
        Sfx: "SFX",
        Vfx: "VFX",
        Props: "Prop",
    }
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
        sceneProps = new NoteMenu("Scene Properties"),
        scriptNotes = new NoteMenu("Script Note"),
        comments = new NoteMenu("Comment"),
        beats = new NoteMenu("Beat"),
        structurePoints = new NoteMenu("Structure Point"),
        bookmarks = new NoteMenu("Bookmark"),
        sfx = new NoteMenu("SFX"),
        vfx = new NoteMenu("VFX"),
        props = new NoteMenu("Prop"),
        characters = new NoteMenu("Characters")
    ) {
        /** @type {NoteMenu} */ this.Comments = comments;
        /** @type {NoteMenu} */ this.Bookmarks = bookmarks;
        /** @type {NoteMenu} */ this.SceneProps = sceneProps;
        /** @type {NoteMenu} */ this.ScriptNotes = scriptNotes;
        /** @type {NoteMenu} */ this.Beats = beats;
        /** @type {NoteMenu} */ this.StructurePoints = structurePoints;
        /** @type {NoteMenu} */ this.Characters = characters;
        /** @type {NoteMenu} */ this.Sfx = sfx;
        /** @type {NoteMenu} */ this.Vfx = vfx;
        /** @type {NoteMenu} */ this.Props = props;
    }
    loadNotes(scenePropertiesEl, scriptNoteEl) {
        const ScriptNoteTemplate = scriptNoteEl.getElementsByTagName("template")[0].content.querySelector("scriptnote")
        const ScenePropertyTemplate = scenePropertiesEl.getElementsByTagName("template")[0].content.querySelector("sceneproperty")
        for (const note in this.SceneProps.Data) {
            /**@type {HTMLElement} */
            const NewSceneProperty = document.importNode(ScenePropertyTemplate, true)
            NewSceneProperty.style.positionAnchor = "--" + note
            NewSceneProperty.style.top = `anchor(--${note} top)`
            NewSceneProperty.style.right = `anchor(--${note} right)`
            NewSceneProperty.dataset.noteID = note
            NewSceneProperty.id = note
            scenePropertiesEl.appendChild(NewSceneProperty)
        }
        for (const note in this.ScriptNotes.Data) {
            /**@type {HTMLElement} */
            const NewScriptNote = document.importNode(ScriptNoteTemplate, true)
            NewScriptNote.style.positionAnchor = "--" + note
            NewScriptNote.style.top = `anchor(--${note} top)`
            NewScriptNote.style.right = `anchor(--${note} right)`
            NewScriptNote.dataset.noteID = note
            NewScriptNote.id = note
            scriptNoteEl.appendChild(NewScriptNote)
        }
        // for (const note in this.scriptno)
        // console.log(scenePropertiesEl, scriptNoteEl)
    }
    /**
     * @param {string} id
     * @returns {[string, Object.<string,string]} 
     */
    getNote(id) {
        for (const noteMenu of Object.keys(this)) {
            if (this[noteMenu].Data[id]) return [this[noteMenu].NoteType, this[noteMenu].Data[id]]
        }
        console.warn(`Note ID ${id} not found.`)
        return {};
    }
    /**
     * @param {string} id 
     * @returns {HTMLElement | null}
     */
    getNoteTooltip(id) {
        const [thisNoteType, thisNote] = this.getNote(id)
        return NoteMenu.makeNoteTooltipStatic(id, thisNoteType, thisNote)
    }
    /**
     * @param {Object.<string,Object.<string,Object.<string,string>>>} data 
     * @returns {Notes}
     */
    static fromSave(data) {
        let newNotes = new Notes();
        for (const noteMenu of Object.keys(newNotes)) {
            if (data[noteMenu]) newNotes[noteMenu] = NoteMenu.fromSave(Notes.KeysToStrings[noteMenu], data[noteMenu].Data)
        }
        return newNotes
    }
}
