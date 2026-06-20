
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
 * @property {number} Shortcut
 */

/**
 * @typedef {Object} ElementSettings
 * @property {ElementSetting} General
 * @property {ElementSetting} SceneHeading
 * @property {ElementSetting} Action
 * @property {ElementSetting} Character
 * @property {ElementSetting} Parenthetical
 * @property {ElementSetting} Dialogue
 * @property {ElementSetting} Transition
 * @property {ElementSetting} Shot
 * @property {ElementSetting} CastList
 * @property {ElementSetting} NewAct
 * @property {ElementSetting} EndOfAct
 */

/**
 * 
 * @param {Element} el
 * @returns {ElementSetting} 
 */
function GrabElSetting(el) {
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
        StartsNewPage: ParagraphSpec.getAttribute("StartsNewPage") == "Yes" ? true : false,

        PaginateAs: Behavior.getAttribute("PaginateAs"),
        ReturnKey: Behavior.getAttribute("ReturnKey"),
        Shortcut: parseInt(Behavior.getAttribute("Shortcut")),
    };
}

/**
 * 
 * @param {Document} doc 
 * @returns {ElementSettings}
 */
function GrabElSettings(doc) {
    /**
     * @type {ElementSettings}
     */
    let res = {};
    let settings = doc.getElementsByTagName("ElementSettings")
    for (let setting of settings) {
        switch (setting.getAttribute("Type")) {
            case "General":
                res.General = GrabElSetting(setting);
                break;
            case "Scene Heading":
                res.SceneHeading = GrabElSetting(setting);
                break;
            case "Action":
                res.Action = GrabElSetting(setting);
                break;
            case "Character":
                res.Character = GrabElSetting(setting);
                break;
            case "Parenthetical":
                res.Parenthetical = GrabElSetting(setting);
                break;
            case "Dialogue":
                res.Dialogue = GrabElSetting(setting);
                break;
            case "Transition":
                res.Transition = GrabElSetting(setting);
                break;
            case "Shot":
                res.Shot = GrabElSetting(setting);
                break;
            case "Cast List":
                res.CastList = GrabElSetting(setting);
                break;
            case "New Act":
                res.NewAct = GrabElSetting(setting);
                break;
            case "End of Act":
                res.EndOfAct = GrabElSetting(setting);
                break;
            default:
                break;
        }
    }
    return res;
}

/**
 * 
 * @param {Element} el 
 * @returns {string}
 */
function EltoHTML(el) {
    let elType = el.getAttribute("Type").replace(/\s/g, "")
    let elText = "";
    for (let tag of el.children) {
        if (tag.tagName == "Text") elText += tag.textContent;
    }
    return `<${elType}>${elText}</${elType}>`
}
/**
 * 
 * @param {Document} doc
 * @returns {HTMLCollection} 
 */
function XMLtoHTML(doc) {
    const scriptContent = doc.getElementsByTagName("FinalDraft")[0].getElementsByTagName("Content")[0].children
    console.log(scriptContent)
    const articleArea = document.getElementById("script-main")
    for (let el of scriptContent) {
        articleArea.innerHTML += EltoHTML(el)
    }
}



/**
 * 
 * @param {File} file 
 * @returns {Promise<Document>}
 */
async function parseXMLFromFile(file) {
    const xmlString = await file.text();
    return parseXMLString(xmlString);
}
/**
 * 
 * @param {string} xmlString 
 * @returns {Document}
 */
function parseXMLString(xmlString) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlString, 'text/xml');

    const errorNode = doc.querySelector('parsererror');
    if (errorNode) {
        throw new Error(`XML parsing error: ${errorNode.textContent}`);
    }

    return doc;
}

/**
 * 
 * @param {Event} event 
 * @returns 
 */
function handleFileInput(event) {
    event.preventDefault()
    const file = event.target.files?.[0];
    if (!file) console.log("Something went wrong");
    parseXMLFromFile(file).then(doc => { XMLtoHTML(doc); scriptSettings = GrabElSettings(doc); console.log(scriptSettings) }).catch(e => console.log(e))
}
/**
 * 
 * @param {KeyboardEvent} event 
 */
function handleEnterKey(event) {
    console.log("TODO: Change element on enter key")
}
/**
 * 
 * @param {KeyboardEvent} event 
 */
function handlelControlNum(event) {
    console.log("TODO: Shortcut new element")
    switch (event.key) {
        case "1":
            break;
        case "2":
            break;
        case "3":
            break;
        case "4":
            break;
        case "5":
            break;
        case "6":
            break;
        case "7":
            break;
        case "8":
            break;
        case "9":
            break;
        default:
            break;
    }
}
/**
 * 
 * @param {KeyboardEvent} event 
 */
function handleKeyDown(event) {
    event.stopPropagation();
    const thisNode = document.getSelection().anchorNode;
    const child = thisNode.nodeType === Node.TEXT_NODE ? thisNode.parentElement : thisNode;
    if (event.key === "Enter") {
        handleEnterKey(event)
    } else if (event.ctrlKey && event.shiftKey && event.key !== "Control" && event.key !== "Shift") {
        handlelControlNum(event)
    }
}
function handleFocusIn(event) {
    event.preventDefault();
    activeChild = event.target;
}
let scriptWrapper = document.getElementById("script-main");
document.getElementById("script-upload").onchange = handleFileInput
scriptWrapper.addEventListener("keydown", handleKeyDown)
let scriptSettings = null
// scriptWrapper.addEventListener("focusin", handleFocusIn)