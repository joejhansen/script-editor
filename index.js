const VALID_FDX_TYPES = [
    "General",
    "Scene Heading",
    "Action",
    "Character",
    "Parenthetical",
    "Dialogue",
    "Transition",
    "Shot",
    "Cast List",
    "New Act",
    "End of Act",
];

const DEFAULT_PAGE_WIDTH = 8.5
const DEFAULT_PAGE_HEIGHT = 11
const DEFAULT_TOP_MARGIN = 1
const DEFAULT_RIGHT_MARGIN = 1
const DEFAULT_BOTTOM_MARGIN = 1.5
const DEFAULT_LEFT_MARGIN = 1

let scriptWrapper = document.getElementById("script-main");
/**
 * @type {ElementSettings}
 */
let scriptSettings = null


/**
 * @typedef {Object} ElementSetting
 * @property {string} Type
 * @property {number} AdornmentStyle
 * @property {string} Background
 * @property {string} Color
 * @property {string} Font
 * @property {number} RevisionID
 * @property {string} Size
 * @property {string} Style
 * @property {string} Alignment
 * @property {number} FirstIndent
 * @property {string} Leading
 * @property {number} LeftIndent
 * @property {number} RightIndent
 * @property {number} SpaceBefore
 * @property {number} Spacing
 * @property {bool} StartsNewPage
 * @property {string} PaginateAs
 * @property {string} ReturnKey
 * @property {string} Shortcut
 */

/**
 * @typedef {Object} ElementSettings
 * @property {ElementSetting} general
 * @property {ElementSetting} sceneheading
 * @property {ElementSetting} action
 * @property {ElementSetting} character
 * @property {ElementSetting} parenthetical
 * @property {ElementSetting} dialogue
 * @property {ElementSetting} transition
 * @property {ElementSetting} shot
 * @property {ElementSetting} castlist
 * @property {ElementSetting} newact
 * @property {ElementSetting} endofact
 */

/**
 * @param {Element} el
 * @returns {ElementSetting} 
 */
function LoadElSetting(el) {
    let FontSpec = el.getElementsByTagName("FontSpec")[0]
    let ParagraphSpec = el.getElementsByTagName("ParagraphSpec")[0]
    let Behavior = el.getElementsByTagName("Behavior")[0]
    return {
        Type: el.getAttribute("Type"),

        AdornmentStyle: parseInt(FontSpec.getAttribute("AdornmentStyle")),
        Background: FontSpec.getAttribute("Background"),
        Color: FontSpec.getAttribute("Color"),
        Font: FontSpec.getAttribute("Font"),
        RevisionID: parseInt(FontSpec.getAttribute("RevisionID")),
        Size: parseInt(FontSpec.getAttribute("Size")),
        Style: FontSpec.getAttribute("Style"),

        Alignment: ParagraphSpec.getAttribute("Alignment"),
        FirstIndent: parseFloat(ParagraphSpec.getAttribute("FirstIndent")),
        Leading: ParagraphSpec.getAttribute("Leading"),
        LeftIndent: parseFloat(ParagraphSpec.getAttribute("LeftIndent")),
        RightIndent: parseFloat(ParagraphSpec.getAttribute("RightIndent")),
        SpaceBefore: parseInt(ParagraphSpec.getAttribute("SpaceBefore")),
        Spacing: parseInt(ParagraphSpec.getAttribute("Spacing")),
        StartsNewPage: ParagraphSpec.getAttribute("StartsNewPage") === "Yes" ? true : false,

        PaginateAs: Behavior.getAttribute("PaginateAs"),
        ReturnKey: Behavior.getAttribute("ReturnKey"),
        Shortcut: Behavior.getAttribute("Shortcut"),
    };
}

/**
 * @param {Document} doc 
 * @returns {ElementSettings}
 */
function LoadElSettings(doc) {
    /**
     * @type {ElementSettings}
     */
    let res = {};
    let settings = doc.getElementsByTagName("ElementSettings")
    for (let setting of settings) res[setting.getAttribute("Type").replace(/\s/g, "").toLowerCase()] = LoadElSetting(setting)
    return res;
}

/**
 * @param {Element} el 
 * @returns {string}
 */
function EltoHTML(el) {
    let elType = el.getAttribute("Type").replace(/\s/g, "").toLowerCase();
    let elText = "";
    for (let tag of el.children) if (tag.tagName === "Text") elText += tag.textContent;
    return `<${elType}>${elText}</${elType}>`
}
/**
 * @param {Document} doc
 */
function XMLtoHTML(doc) {
    const scriptContent = doc.getElementsByTagName("FinalDraft")[0].getElementsByTagName("Content")[0].children
    const articleArea = document.getElementById("script-main")
    for (let el of scriptContent) articleArea.innerHTML += EltoHTML(el)
}

/**
 * @param {File} file 
 * @returns {Promise<Document>}
 */
async function parseXMLFromFile(file) {
    const xmlString = await file.text();
    return parseXMLString(xmlString);
}

/**
 * @param {string} xmlString 
 * @returns {Document}
 */
function parseXMLString(xmlString) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlString, 'text/xml');
    const errorNode = doc.querySelector('parsererror');
    if (errorNode) throw new Error(`XML parsing error: ${errorNode.textContent}`);
    return doc;
}

/**
 * @param {Event} event 
 * @returns 
 */
function handleFileInput(event) {
    event.preventDefault()
    const file = event.target.files?.[0]
    if (!file) console.log("Something went wrong")
    parseXMLFromFile(file).then(doc => {
        scriptSettings = LoadElSettings(doc)
        XMLtoHTML(doc);
    }).catch(e => console.log(e))
}

/**
 * @param {KeyboardEvent} event 
 * @param {Element} el
 */
function handleEnterKey(event, el) {
    event.preventDefault()
    const cursorPosition = document.getSelection().anchorOffset
    const newElement = newScriptElement(scriptSettings[el.tagName.toLowerCase()].ReturnKey.toLowerCase(), el.textContent.substring(cursorPosition))
    el.textContent = el.textContent.substring(0, cursorPosition)
    if (el.textContent.length === 0) el.appendChild(document.createElement('br'))
    scriptWrapper.insertBefore(newElement, el.nextSibling)

    setSelection(newElement, 0)
}

/**
 * @param {string} type 
 * @param {string} textContent 
 * @returns {Element}
 */
function newScriptElement(type, textContent = "") {
    let newElement = document.createElement(type)
    if (textContent.length === 0) newElement.appendChild(document.createElement('br'))
    else newElement.textContent = textContent
    return newElement
}

/**
 * @param {Element} el Element to place cursor within
 * @param {number} pos Position to set curose within element
 */
function setSelection(el, pos) {
    el.focus()
    const range = document.createRange()
    const sel = window.getSelection()
    range.setStart(el, pos)
    range.collapse(true)
    sel.removeAllRanges()
    sel.addRange(range)
}

/**
 * @param {Element} el 
 * @param {string} newType 
 */
function changeElementTo(el, newType) {
    const newElement = newScriptElement(newType, el.textContent)
    scriptWrapper.replaceChild(newElement, el)
    setSelection(newElement, 0)
}

/**
 * @param {KeyboardEvent} event 
 * @param {Element} el
 */
function handlelShortCut(event, el) {
    if (event.key.length > 1 || isNaN(parseInt(event.key))) return;
    for (const setting in scriptSettings) {
        if (scriptSettings[setting].Shortcut === event.key) changeElementTo(el, setting)
    }
}

/**
 * @param {KeyboardEvent} event 
 * @param {Element} el 
 */
function handleTab(event, el) {
    event.preventDefault();

    let newElShortcut = scriptSettings[el.tagName.toLowerCase()].Shortcut;
    if (newElShortcut === ':') newElShortcut = "0";
    else if (newElShortcut === '9') newElShortcut = ":";
    else newElShortcut = (parseInt(newElShortcut) + 1).toString();

    console.log(newElShortcut)
    for (const setting in scriptSettings) {
        if (scriptSettings[setting].Shortcut === newElShortcut) {
            if (el.textContent.length === 0) changeElementTo(el, setting)
            else {
                let newElement = newScriptElement(setting)
                scriptWrapper.insertBefore(newElement, el.nextSibling)
                setSelection(newElement, 0)
            }
        }
    }
}

/**
 * @param {KeyboardEvent} event 
 */
function handleKeyDown(event) {
    event.stopPropagation();
    const thisNode = document.getSelection().anchorNode;
    const child = thisNode.nodeType === Node.TEXT_NODE ? thisNode.parentElement : thisNode;

    if (event.key === "Enter") handleEnterKey(event, child)
    else if (event.key === "Tab") handleTab(event, child)
    else if (event.altKey && event.key !== "Alt") handlelShortCut(event, child)
}

document.getElementById("script-upload").onchange = handleFileInput
scriptWrapper.addEventListener("keydown", handleKeyDown)