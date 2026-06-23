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
const HTML_TAG_NAMES = [
    "general",
    "sceneheading",
    "action",
    "character",
    "parenthetical",
    "dialogue",
    "transition",
    "shot",
    "castlist",
    "newact",
    "endofact",
]

// Everything in inches
const DEFAULT_PAGE_WIDTH = 8.5
const DEFAULT_PAGE_HEIGHT = 11
const DEFAULT_TOP_MARGIN = 1
const DEFAULT_RIGHT_MARGIN = 1
const DEFAULT_BOTTOM_MARGIN = 1.5
const DEFAULT_LEFT_MARGIN = 1
const PIXELS_PER_INCH = 96

let scriptWrapper = document.getElementById("script-main");
let measuringPage = document.getElementById("measuring-page")
let measuringElement = document.getElementById("measuring-element")
/**
 * @type {ElementSettings}
 */
let scriptSettings = null
/**
 * @type {Document}
 */
let originalXML = null

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
    for (let setting of settings) {
        res[setting.getAttribute("Type").replace(/\s/g, "").toLowerCase()] = LoadElSetting(setting)
    }
    return res;
}

/**
 * @param {Element} el 
 * @returns {string}
 */
function EltoHTML(el) {
    let elType = el.getAttribute("Type").replace(/\s/g, "").toLowerCase();
    let elText = "";
    for (let tag of el.children) if (tag.tagName === "Text") {
        elText += tag.textContent;
    }
    if (elType === "parenthetical") elText = elText.replace(/[()]/g, "") // parenthesis in parentheticals are assumed and handled by css
    return `<${elType} class="screenplay-element">${elText}</${elType}>`
}

/**
 * @param {Document} doc
 */
function XMLtoHTML(doc) {
    contentEls = doc.getElementsByTagName("FinalDraft")[0].getElementsByTagName("Content")[0].children
    const articleArea = document.getElementById("script-main")
    for (let el of contentEls) {
        articleArea.innerHTML += EltoHTML(el)
    }
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
        while (scriptWrapper.firstChild) {
            scriptWrapper.removeChild(scriptWrapper.firstChild)
        }
        originalXML = doc;
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

/**
 * @param {string} tagStr 
 * @returns {string}
 */
function tagToFDXType(tagStr) {
    return VALID_FDX_TYPES.at(HTML_TAG_NAMES.indexOf(tagStr))
}

/**
 * @param {Document} doc
 * @param {Element} el 
 */
function HTMLtoFDX(doc, el) {
    let paraEl = doc.createElement("Paragraph")
    let htmlTag = el.tagName.toLowerCase();
    paraEl.setAttribute("Type", tagToFDXType(htmlTag))
    console.log(doc)
    let textEl = doc.createElement("Text")
    if (htmlTag === "parenthetical") textEl.textContent = `(${el.textContent})`;
    else textEl.textContent = el.textContent;
    doc.getElementsByTagName("Content")[0].appendChild(paraEl)
    paraEl.appendChild(textEl)
}

/**
 * @param {Event}
 */
function downloadFDX(event) {
    event.preventDefault();
    const parser = new DOMParser()
    let newContentEl = parser.parseFromString(`<Content></Content>`, "application/xml")
    for (let child of scriptWrapper.children) {
        HTMLtoFDX(newContentEl, child)
    }
    let FDRoot = originalXML.getElementsByTagName("FinalDraft")[0];
    FDRoot.replaceChild(newContentEl.getElementsByTagName("Content")[0], FDRoot.getElementsByTagName("Content")[0])
    const serializer = new XMLSerializer();
    const newXMLStr = serializer.serializeToString(originalXML)
    const blob = new Blob([newXMLStr], { type: "application/xml" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url;
    a.download = "script.fdx"
    a.click()

    URL.revokeObjectURL(url);

}
/**
 * 
 * @param {Element} el 
 */
function emptyElement(el) {
    while (el.firstChild) el.remove(el.firstChild)
}
/**
 * @param {Element} element 
 * @param {number} firstElementHeight
 * @param {number} maxHeight 
 * @param {bool} firstIsSub
 * @return {Element[]} maxHeight 
 */
function segmentElement(element, firstElementHeight, maxHeight, firstIsSub) {

    let blankElement = element.cloneNode(true)
    blankElement.textContent = "";
    if (firstIsSub) element.classList.add("sub-element")
    measuringElement.appendChild(element)
    while (measuringElement.getBoundingClientRect().height > firstElementHeight) {
        blankElement.textContent = `${measuringElement.textContent.substring(measuringElement.textContent.length - 1)}${blankElement.textContent}`
        measuringElement.textContent = measuringElement.substring(0, measuringElement.textContent.length - 1)
    }
    
}

/**
 * 
 * @param {Element[]} elements 
 * @return {Element[]}
 */
function paginate(elements) {
    /** @type {Element[]} */
    let res = []
    const MaxPageHeight = (DEFAULT_PAGE_HEIGHT - DEFAULT_TOP_MARGIN - DEFAULT_BOTTOM_MARGIN) * PIXELS_PER_INCH;
    emptyElement(measuringPage)
    let i = 0;
    for (let element of elements) {
        measuringPage.appendChild(element)
        let pageRect = measuringPage.getBoundingClientRect();
        if (pageRect.height > MaxPageHeight) {
            measuringPage.removeChild(measuringPage.lastChild)
            let segmentedElements = segmentElement(element, pageRect.height - MaxPageHeight, MaxPageHeight, measuringPage.children.length !== 0)
        }

    }

}

document.getElementById("script-upload").addEventListener("change", handleFileInput)
scriptWrapper.addEventListener("keydown", handleKeyDown)
document.getElementById("download-fdx").addEventListener("click", downloadFDX)