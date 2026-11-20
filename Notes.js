import { NotesTable } from "./NotesTable.js";
import { handleToggleNote } from "./ScriptConversion.js";

/** @typedef {{Characters: string; Length: string; Page: string; Title: string; Content: string; [key:string]: string}} SceneProperty*/
/** @typedef {{Scenes: string; Content: string;[key:string]:string}} Character */
/** @typedef {{Color: string; Content: string; DateModified: string; DateTime: string; Type: string; [key:string]:string}} ScriptNote */
/** @typedef {{Page:string; Scene:string; Content:string; DateModified:string; DateTime:string; [key:string]:string}} Comment*/
/** @typedef {{Page:string; Scene:string; Content: string; DateModified:string; DateTime:string; [key:string]:string}} Bookmark */
/** @typedef {{Page:string; Scene:string; Content: string; DateModified:string; DateTime:string; [key:string]:string}} Beat */
/** @typedef {{Page:string; Scene:string; Content: string; DateModified:string; DateTime:string; [key:string]:string}} StructurePoint */
/** @typedef {{Page:string; Scene:string; Effect: string; Content:string; DateModified:string; DateTime:string; [key:string]:string}} Sfx */
/** @typedef {{Page:string; Scene:string; Effect: string; Content:string; DateModified:string; DateTime:string; [key:string]:string}} Vfx */
/** @typedef {{Scenes: string; Content: string; DateModified:string; DateTime:string; [key:string]:string}} Prop */

/** @typedef {{Name:string; Address:string; Owner:string; Manager:string; Insurance:string: Contact:string; Scout:string; [key:string]:string}} Location */
/** @typedef {{Brand:string; Model:string; Serial:string; Owner:string; Insurance:string; [key:string]:string}} Equipment*/
/** @typedef {{Name: string; Role:string; Scenes:string; Pages:string; Agent:string; Manager:string; Rate:string;[key:string]:string}} Talent*/
/** @typedef {{Name:string; Role:string; Department:string; Rate:string; [key:string]:string}} Crew*/

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
    updateNoteIDField(id, field, data) {
        this.Data[id][field] = data
    }
    updateNoteTable(id, data, table) {

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
     * @param {Object.<string,string>} [data={}] 
     * @param {`${string}-${string}-${string}-${string}-${string}`} [id=window.crypto.randomUUID()] 
     */
    newNote(data = {}, id = window.crypto.randomUUID()) {
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
        return NoteMenu.makeNoteTooltipStatic(id, this.Data[id], this)
    }
    /**
     * @param {string} id
     * @param {string} noteType 
     * @param {Object.<string,string>} noteObj 
     * @param {NoteMenu} noteMenu 
     * @param {(el:HTMLElement) => void} close 
     * @returns {Node}
     */
    static makeNoteTooltipStatic(id, noteType, noteObj, noteMenu, close) {
        /** @type {Node} */
        const NewNotePopover = document.importNode(document.getElementById("template-note-popover").content, true).firstElementChild
        NewNotePopover.querySelector("#note-popover-title").textContent = noteType
        const NoteFields = NewNotePopover.querySelector("table")

        for (const note in noteObj) {
            if (note === "Content") {
                NewNotePopover.querySelector("#note-body").textContent = noteObj[note]
                continue
            }
            const newRow = document.createElement("tr")
            const newHeading = document.createElement("th")
            newHeading.getAttribute("scope", "row")
            newHeading.textContent = note;
            const newData = document.createElement("td")
            newData.dataset.bind = note
            newData.textContent = note === "DateModified" || note === "DateTime" ? new Date(noteObj[note]).toLocaleString() : noteObj[note]
            newRow.appendChild(newHeading)
            newRow.appendChild(newData)
            NoteFields.appendChild(newRow)
        }
        // const close = (e) => {
        //     NewNotePopover.removeChild()
        // }
        NewNotePopover.querySelector(".close-note-btn").addEventListener("click", (e) => close(NewNotePopover))
        NewNotePopover.querySelector(".cancel-note-btn").addEventListener("click", (e) => close(NewNotePopover))
        NewNotePopover.querySelector(".save-note-btn").addEventListener("click", (e) => {
            noteMenu.updateNoteIDField(id, "Content", NewNotePopover.querySelector("#note-body").value)
            document.querySelector("notes-table").updateNoteRow( id, noteObj, noteType, noteMenu)
            close(NewNotePopover)
        })
        NewNotePopover.querySelector(".delete-note-btn").addEventListener("click", (e) => {
            noteMenu.deleteNote(id)
            document.querySelector("notes-table").deleteNoteRow(id)
            close(NewNotePopover)
        })
        return NewNotePopover
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
    // addNote()
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
        Characters: "Characters",
        Locations: "Locations",
        Talent: "Talent",
        Crew: "Crew",
        Equipment: "Equipment"
    }
    /**
     * Each type of notes category is a record of UUIDs with a sort-of-standard note attached.
     * @param {NoteMenu} [sceneProps=new NoteMenu("Scene Property")] 
     * @param {NoteMenu} [scriptNotes=new NoteMenu("Script Note")] 
     * @param {NoteMenu} [comments=new NoteMenu("Comment")] 
     * @param {NoteMenu} [beats=new NoteMenu("Beat")] 
     * @param {NoteMenu} [structurePoints=new NoteMenu("Structure Point")] 
     * @param {NoteMenu} [bookmarks=new NoteMenu("Bookmark")] 
     * @param {NoteMenu} [sfx=new NoteMenu("SFX")] 
     * @param {NoteMenu} [vfx=new NoteMenu("VFX")] 
     * @param {NoteMenu} [props=new NoteMenu("Prop")] 
     * @param {NoteMenu} [characters=new NoteMenu("Characters")] 
     * @param {NoteMenu} [locations=new NoteMenu("Locations")] 
     * @param {NoteMenu} [talent=new NoteMenu("Talent")] 
     * @param {NoteMenu} [crew=new NoteMenu("Crew")] 
     * @param {NoteMenu} [equipment=new NoteMenu("Equipment")] 
     */
    constructor(
        sceneProps = new NoteMenu("Scene Property"),
        scriptNotes = new NoteMenu("Script Note"),
        comments = new NoteMenu("Comment"),
        beats = new NoteMenu("Beat"),
        structurePoints = new NoteMenu("Structure Point"),
        bookmarks = new NoteMenu("Bookmark"),
        sfx = new NoteMenu("SFX"),
        vfx = new NoteMenu("VFX"),
        props = new NoteMenu("Prop"),
        characters = new NoteMenu("Characters"),
        locations = new NoteMenu("Locations"),
        talent = new NoteMenu("Talent"),
        crew = new NoteMenu("Crew"),
        equipment = new NoteMenu("Equipment")
    ) {
        /** @type {NoteMenu} */ this.ScriptNotes = scriptNotes;
        /** @type {NoteMenu} */ this.SceneProps = sceneProps;
        /** @type {NoteMenu} */ this.Comments = comments;
        /** @type {NoteMenu} */ this.Bookmarks = bookmarks;
        /** @type {NoteMenu} */ this.Beats = beats;
        /** @type {NoteMenu} */ this.StructurePoints = structurePoints;
        /** @type {NoteMenu} */ this.Characters = characters;
        /** @type {NoteMenu} */ this.Sfx = sfx;
        /** @type {NoteMenu} */ this.Vfx = vfx;
        /** @type {NoteMenu} */ this.Props = props;
        /** @type {NoteMenu} */ this.Locations = locations
        /** @type {NoteMenu} */ this.Talent = talent
        /** @type {NoteMenu} */ this.Crew = crew
        /** @type {NoteMenu} */ this.Equipment = equipment
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
    }
    /**
     * @param {string} id
     * @returns {[string, Object.<string,string>, NoteMenu]} 
     */
    getNote(id) {
        for (const noteMenu of Object.keys(this)) {
            if (this[noteMenu].Data[id]) return [this[noteMenu].NoteType, this[noteMenu].Data[id], this[noteMenu]]
        }
        console.warn(`Note ID ${id} not found.`)
        return {};
    }
    /**
     * @param {string} id 
     * @returns {HTMLElement | null}
     */
    getNoteTooltip(id) {
        const [thisNoteType, thisNote, noteMenu] = this.getNote(id)
        return NoteMenu.makeNoteTooltipStatic(id, thisNoteType, thisNote, noteMenu)
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
    /**
     * @param {string} id 
     * @param {Object.<string,string>} data 
     * @returns {boolean}
     */
    updateNote(id, data) {
        for (const noteMenu of Object.keys(this)) {
            if (this[noteMenu].Data[id]) this[noteMenu].Data[id] = data
            return true;
        }
        return false
    }
    /**
     * @param {HTMLElement} el 
     * @param {Object.<string,string>} data 
     * @param {string} noteType 
     */
    addNote(el, data, noteType) {
        /** @type {NoteMenu} */
        const noteMenu = this[noteType]
        const newUUID = noteMenu.newNote(data)
        el.id = newUUID;
    }
}
