/**
 * @param {Element} el 
 * @returns {HTMLElement}
 */
function scriptNoteToHTML(el) {
    const NewScriptNote = document.createElement("scriptnote")
    NewScriptNote.setAttribute("Color", el.getAttribute("Color"));
    NewScriptNote.setAttribute("DateModified", el.getAttribute("DateModified"));
    NewScriptNote.setAttribute("DateTime", el.getAttribute("DateTime"));
    NewScriptNote.setAttribute("Name", el.getAttribute("Name"));
    NewScriptNote.setAttribute("Type", el.getAttribute("Type"));
    NewScriptNote.textContent = el.textContent;
    return NewScriptNote;
}
/**
 * 
 * @param {Element} el 
 * @returns {HTMLElement}
 */
function scenePropertiesToHTML(el) {
    const NewSceneProperties = document.createElement("SceneProperties")
    // length and page number have to updated programatically
    NewSceneProperties.setAttribute("Length", el.getAttribute("Length"));
    NewSceneProperties.setAttribute("Page", el.getAttribute("Page"));
    NewSceneProperties.setAttribute("Title", el.getAttribute("Title"));
    const CharacterArcBeats = el.getElementsByTagName("CharacterArcBeat")
    for (const CharArcBeat of CharacterArcBeats) {
        const NewCharArch = document.createElement("characterarcbeat")
        NewCharArch.setAttribute("Name", CharArcBeat.getAttribute("Name"))
        NewCharArch.textContent = CharArcBeat.getElementsByTagName("Text")[0].textContent;
        NewSceneProperties.appendChild(NewCharArch)
    }
    return NewSceneProperties;
}

/**
 * @param {Element} el 
 * @returns {HTMLElement[]}
 */
function EltoHTML(el) {
    let elType = el.getAttribute("Type").replace(/\s/g, "").toLowerCase();
    /** @type {HTMLElement[]} */
    let res = [];
    let elInnerHTML = "";
    for (let tag of el.children) {
        if (tag.tagName === "ScriptNote") {
            res.push(scriptNoteToHTML(tag))
        } else if (tag.tagName === "SceneProperties") {
            res.push(scenePropertiesToHTML(tag))
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
    let newEl = document.createElement(elType)
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
        res.push(EltoHTML(el))
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