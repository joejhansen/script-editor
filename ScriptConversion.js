/** @typedef {`${string}-${string}-${string}-${string}-${string}`} UUIDString*/
const ScriptNotesEL = document.getElementsByTagName("scriptnotes")[0]
const ScriptNoteTemplate = ScriptNotesEL.getElementsByTagName("template")[0].content.querySelector("scriptnote")
const ScenePropertiesEl = document.getElementsByTagName("sceneproperties")[0]
const ScenePropertyTemplate = ScenePropertiesEl.getElementsByTagName("template")[0].content.querySelector("sceneproperty")
/** @type {HTMLElement | null} */
let lastNoteOpened = null;
/**
 * @param {Event} e 
 */
export function handleOpenNote(e) {
    e.preventDefault();
    e.stopPropagation()
    /** @type {HTMLElement} */
    const someEl = e.target.parentElement
    if (someEl.querySelector("content").classList.toggle("active")) {
        lastNoteOpened?.classList.toggle("active")
        lastNoteOpened = someEl.querySelector("content");
    } else {
        lastNoteOpened = null;
    }
}
/**
 * For some reason, FDX uses ISO 8601 dates but without any punctuation or the last character "Z"
 * @param {string} str 
 * @returns {string}
 */
function FDXDateToJSDate(str) {
    return `${str.substring(0, 4)}-${str.substring(4, 6)}-${str.substring(6, 11)}:${str.substring(11, 13)}:${str.substring(13)}Z`
}
/**
 * @param {string} str 
 * @returns {string}
 */
function JSDateToFDXDate(str) {
    let res = "";
    try {
        const NewDate = new Date(str)
        res = NewDate.toISOString().replace(/[-:Z.]/g, "")
    } catch (e) {
        console.warn(e)
    }
    return res;
}
/**
 * @param {Element} note 
 * @returns {UUIDString}
*/
function scriptNoteToHTML(note) {

    /**@type {HTMLElement} */
    const NewScriptNote = document.importNode(ScriptNoteTemplate, true)
    // const NewScriptNote = document.createElement("scriptnote")
    for (const Attribute of ["Author", "Color", "DateModified", "DateTime", "Name", "Type"]) {
        let thisAttribute = note.getAttribute(Attribute);
        NewScriptNote.dataset[Attribute] = thisAttribute
        if (Attribute === "DateModified" || Attribute === "DateTime") {
            const NewDate = new Date(FDXDateToJSDate(thisAttribute));
            thisAttribute = `${NewDate.toLocaleDateString()} ${NewDate.toLocaleTimeString()}`
            NewScriptNote.getElementsByClassName(`note-${Attribute[0].toLowerCase()}${Attribute.substring(1)}`)[0].textContent = `${Attribute.substring(0, 4)} ${Attribute.substring(4)}: ${thisAttribute}`
        } else if (thisAttribute){
            NewScriptNote.getElementsByClassName(`note-${Attribute[0].toLowerCase()}${Attribute.substring(1)}`)[0].textContent = `${Attribute}: ${thisAttribute}`
        }
    }
    NewScriptNote.getElementsByClassName("note-content")[0].textContent = `Note: ${note.textContent}`;
    const NewUUID = window.crypto.randomUUID()
    NewScriptNote.style.positionAnchor = "--" + NewUUID
    NewScriptNote.style.top = `anchor(--${NewUUID} top)`
    NewScriptNote.style.right = `anchor(--${NewUUID} right)`
    NewScriptNote.querySelector("img").addEventListener("click", handleOpenNote)
    NewScriptNote.dataset.noteID = NewUUID
    NewScriptNote.id = NewUUID
    ScriptNotesEL.appendChild(NewScriptNote)
    return NewUUID;
}
/**
 * @param {HTMLElement} el 
 * @param {Document} doc
 * @returns {Element}
 */
export function htmlToScriptNote(el, doc) {
    const NewScriptNote = doc.createElement("ScriptNote");
    const NewParagraph = doc.createElement("Paragraph");
    const NewText = doc.createElement("Text")
    for (const Attribute of ["Author", "Color", "DateModified", "DateTime", "Name", "Type"]) {
        NewScriptNote.setAttribute(Attribute, el.dataset[Attribute])
    }
    NewText.textContent = el.textContent.substring(el.textContent.lastIndexOf(":") + 2);
    NewParagraph.appendChild(NewText)
    NewScriptNote.appendChild(NewParagraph)
    return NewScriptNote;
}

/**
 * 
 * @param {Element} note 
 * @returns {UUIDString}
 */
function scenePropertiesToHTML(note) {
    const NewSceneProperties = document.importNode(ScenePropertyTemplate, true)
    // length and page number have to updated programatically
    for (const Attribute of ["Length", "Page", "Title"]) {
        const ThisAttribute = note.getAttribute(Attribute);
        NewSceneProperties.dataset[Attribute] = ThisAttribute
        NewSceneProperties.getElementsByClassName(`scene-prop-${Attribute[0].toLowerCase()}${Attribute.substring(1)}`)[0].textContent = `${Attribute}: ${ThisAttribute}`
    }
    const CharacterArcBeats = note.getElementsByTagName("CharacterArcBeat")
    for (const CharArcBeat of CharacterArcBeats) {
        const NewCharArc = document.createElement("characterarcbeat")
        NewCharArc.dataset["Name"] = CharArcBeat.getAttribute("Name")
        NewCharArc.textContent = CharArcBeat.getElementsByTagName("Text")[0].textContent;
        NewSceneProperties.querySelector("content").appendChild(NewCharArc)
    }
    const NewUUID = window.crypto.randomUUID()
    NewSceneProperties.style.positionAnchor = "--" + NewUUID
    NewSceneProperties.style.top = `anchor(--${NewUUID} top)`
    NewSceneProperties.style.right = `anchor(--${NewUUID} right)`
    NewSceneProperties.querySelector("img").addEventListener("click", handleOpenNote)
    NewSceneProperties.dataset.noteID = NewUUID
    NewSceneProperties.id = NewUUID
    ScenePropertiesEl.appendChild(NewSceneProperties)
    return NewUUID;
}

/**
 * @param {HTMLElement} el 
 * @param {Document} doc
 * @returns {Element}
 */
export function htmlToSceneProperties(el, doc) {
    const NewSceneProperties = doc.createElement("SceneProperties");
    NewSceneProperties.setAttribute("Length", el.dataset["Length"]);
    NewSceneProperties.setAttribute("Page", el.dataset["Page"]);
    NewSceneProperties.setAttribute("Title", el.dataset["Title"]);
    const NewSceneArcBeats = doc.createElement("SceneArcBeats")
    for (const CharArc of el.querySelectorAll("characterarcbeat")) {
        const NewCharArc = doc.createElement("CharacterArcBeat")
        const NewParagraph = doc.createElement("Paragraph")
        const NewText = doc.createElement("Text")
        NewCharArc.setAttribute("Name", CharArc.dataset["Name"])
        NewText.textContent = CharArc.textContent;
        NewParagraph.appendChild(NewText)
        NewCharArc.appendChild(NewParagraph)
        NewSceneArcBeats.appendChild(NewCharArc)
    }
    NewSceneProperties.appendChild(NewSceneArcBeats)
    return NewSceneProperties
}

/**
 * @param {Element} el 
 * @returns {HTMLElement[]}
 */
function EltoHTML(el) {
    let elType = el.getAttribute("Type").replace(/\s/g, "").toLowerCase();
    /** @type {HTMLElement[]} */
    let res = [];
    /** @type {UUIDString} */
    let elInnerHTML = "";
    let newEl = document.createElement(elType)
    for (let tag of el.children) {
        if (tag.tagName === "ScriptNote") {
            const NewUUID = scriptNoteToHTML(tag);
            newEl.dataset.noteID = NewUUID;
            newEl.style.anchorName = "--" + NewUUID
        } else if (tag.tagName === "SceneProperties") {
            const NewUUID = scenePropertiesToHTML(tag);
            newEl.dataset.noteID = NewUUID
            newEl.style.anchorName = "--" + NewUUID
        } else if (tag.tagName === "Text") {
            if (tag.hasAttribute("Style")) {
                const styles = tag.getAttribute("Style").toLowerCase().replace('+', ' ').replace("allcaps", '')
                if (styles) {
                    elInnerHTML += `<span class="${styles}">${tag.textContent}</span>`
                } else {
                    elInnerHTML += tag.textContent;
                }
            } else {
                elInnerHTML += tag.textContent;
            }
        }
    }
    if (elType === "parenthetical") elInnerHTML = elInnerHTML.replace(/[()]/g, "") // parenthesis in parentheticals are assumed and handled by css
    newEl.innerHTML = elInnerHTML;
    res.push(newEl)
    return res
}

/**
 * @param {Document} doc
 * @return {HTMLElement[]}
 */
export function XMLtoHTML(doc) {
    /** @type {Element[]} */
    let res = []
    let contentEls = doc.getElementsByTagName("FinalDraft")[0].getElementsByTagName("Content")[0].children
    for (let el of contentEls) {
        res.push(...EltoHTML(el))
    }
    return res;
}

/**
 * @param {File} file 
 * @returns {Promise<Document>}
 */
export async function parseXMLFromFile(file) {
    const xmlString = await file.text();
    return parseXMLString(xmlString);
}

/**
 * @param {string} xmlString 
 * @returns {Document}
 */
export function parseXMLString(xmlString) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlString, 'text/xml');
    const errorNode = doc.querySelector('parsererror');
    if (errorNode) throw new Error(`XML parsing error: ${errorNode.textContent}`);
    return doc;
}