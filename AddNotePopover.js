import { Notes } from "./Notes";
import { NotesTable } from "./NotesTable";
import { getChildElementIndex } from "./ScriptSettings";
import styles from "./windows/notes/add-note-popover.css" with {type: "css" };

/** @typedef {{Page:string; Scene:string; Color: string; Content: string; DateModified: string; DateTime: string; Type: string; [key:string]:string}} ScriptNote */
/** @typedef {{Page:string; Scene:string; Content: string; DateModified:string; DateTime:string; [key:string]:string}} Comment*/
/** @typedef {{Page:string; Scene:string; Content: string; DateModified:string; DateTime:string; [key:string]:string}} Bookmark */
/** @typedef {{Page:string; Scene:string; Content: string; DateModified:string; DateTime:string; [key:string]:string}} Beat */
/** @typedef {{Page:string; Scene:string; Content: string; DateModified:string; DateTime:string; [key:string]:string}} StructurePoint */
/** @typedef {{Page:string; Scene:string; Effect: string; Content:string; DateModified:string; DateTime:string; [key:string]:string}} Sfx */
/** @typedef {{Page:string; Scene:string; Effect: string; Content:string; DateModified:string; DateTime:string; [key:string]:string}} Vfx */
/** @typedef {{Scenes: string; Content: string; DateModified:string; DateTime:string; Owner:string, Insurance: string, [key:string]:string}} Prop */

export class AddNotePopover extends HTMLElement {
    static styles = styles;
    static templateId = "template-header"; // subclass sets this, or override templateId
    /**@type {Object.<string,Object.<string, boolean>} */
    static TypeFields = {
        ScriptNotes: {
            Color: false,
            DateModified: false,
            DateTime: false,
            Type: false,
        },
        Comments: {
            Page: false,
            DateModified: false,
            DateTime: false,
        },
        Bookmarks: {
            Page: false,
            DateModified: false,
            DateTime: false,
        },
        Beats: {
            Page: false,
            DateModified: false,
            DateTime: false,
        },
        StructurePoints: {
            Page: false,
            DateModified: false,
            DateTime: false,
        },
        Sfx: {
            Page: false,
            Effect: true,
            DateModified: false,
            DateTime: false,
        },
        Vfx: {
            Page: false,
            Effect: true,
            DateModified: false,
            DateTime: false,
        },
        Props: {
            Scenes: false,
            DateModified: false,
            DateTime: false,
            Owner: true,
            Insurance: true,
        },

    }
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
    init(root) {
    }
    /**
     * @param {number} pageNum 
     * @param {string} [noteType="ScriptNotes"]  
     * @returns 
     */
    changeNoteType(pageNum, noteType = "ScriptNotes") {
        if (!TypeFields[noteType]) {
            console.warn(`${noteType} is not a valid note type.`);
            return false;
        }
        const table = this.shadowRoot.querySelector("table")
        table.innerHTML = "";
        for (const field in AddNotePopover.TypeFields[noteType]) {
            const newRow = document.createElement("tr")
            const th = document.createElement("th")
            th.scope = "row"
            th.textContent = field;
            const td = document.createElement("td")
            td.dataset.bind = field
            td.textContent = field === "Page" ? pageNum : "";
            if (AddNotePopover.TypeFields[noteType][field]) {
                td.contentEditable = true;
            }
            newRow.appendChild(th)
            newRow.appendChild(td)
            table.appendChild(newRow)
        }
        return true;
    }
    /**
     * @param {HTMLElement} attachToEl 
     * @param {Notes} notes 
     * @param {string} [noteType="ScriptNotes"] 
     */
    show(attachToEl, notes, noteType = "ScriptNotes") {
        if (!TypeFields[noteType]) {
            console.warn(`${noteType} is not a valid note type.`);
            return false;
        }
        let thisPage = attachToEl;
        while (!thisPage.classList.contains("page")) thisPage = thisPage.parentElement
        this.querySelector("#note-type-select").value = noteType
        this.changeNoteType(getChildElementIndex(thisPage, thisPage.parentElement), noteType)
        this.shadowRoot.querySelector("#add-note-popover").showPopover() // lol color picker you crazy
    }
    hide() {
        this.shadowRoot.querySelector("table").innerHTML = "";
        this.shadowRoot.querySelector("#add-body").value = "";
        this.shadowRoot.querySelector("#add-note-popover").hidePopover();
    }
    /**
     * @param {HTMLElement} attachToEl 
     * @param {Notes} notes 
     * @param {NotesTable} notesTable 
     */
    submit(attachToEl, notes, notesTable) {
        const data = {};
        for (const dataRow of this.shadowRoot.querySelector("table").children) {
            const td = dataRow.querySelector("td")
            data[td.dataset.bind] = td.textContent
        }
        data["Content"] = this.shadowRoot.querySelector("#add-body").value

    }
    cancel() {
        this.hide();
    }


}
customElements.define('add-note-popover', AddNotePopover);