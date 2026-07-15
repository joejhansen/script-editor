// Everything in inches
const DEFAULT_PAGE_WIDTH = 8.5
const DEFAULT_PAGE_HEIGHT = 11
const DEFAULT_TOP_MARGIN = 1
const DEFAULT_RIGHT_MARGIN = 1
const DEFAULT_BOTTOM_MARGIN = 1
const DEFAULT_LEFT_MARGIN = 1.5
const PIXELS_PER_INCH = 96
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
    "Sequence",
    "Summary",
    "Outline 1",
    "Outline 2",
    "Outline 3",
    "Note",
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
    "sequence",
    "summary",
    "outline1",
    "outline2",
    "outline3",
    "note"
]
const DEFAULT_EXTENSIONS = new Set([
    "(V.O.)",
    "(O.S.)",
    "(O.C.)",
    "(CONT'D)",
    "(SUBTITLE)",
    "(TEXT)",
    "(pre-lap)",
]);
const DEFAULT_SCENE_INTROS = new Set(["INT.", "EXT.", "I/E"]);
const SCENE_INTRO_REGEX = /^(\w{1,3}|i\/{1,2})(?!.)/i
const DEFAULT_TIMES_OF_DAY = new Set([
    "DAY",
    "NIGHT",
    "AFTERNOON",
    "MORNING",
    "EVENING",
    "LATER",
    "MOMENTS LATER",
    "CONTINUOUS",
    "THE NEXT DAY",
    "MAGIC HOUR",
    "DAWN",
    "DUSK",
    "SAME",
    "SAME TIME",
]);
const TIME_OF_DAY_REGEX = /-\s(?:\w* *)+$/i
const DEFAULT_TRANSITIONS = new Set([
    "CUT TO:",
    "FADE IN:",
    "FADE OUT.",
    "FADE TO:",
    "DISSOLVE TO:",
    "BACK TO:",
    "MATCH CUT TO:",
    "JUMP CUT TO:",
    "FADE TO BLACK.",
    "SMASH CUT TO:",
    "CUT TO BLACK.",
    "TIME CUT:",
]);
const AUTOCOMPLETE_TAGS = ["sceneheading", "character", "transition"]
const DELETE_INPUT_TYPES = ["deleteContentForward", "deleteContentBackward", "deleteWordForward", "deleteWordBackward"]
const ARROW_KEYS = ["ArrowDown", "ArrowUp", "ArrowRight", "ArrowLeft"]
let scriptWrapper = document.getElementById("script-main");

/** @type {ElementSettings | null} */
let defaultScriptSettings = null
/** @type {ElementSettings | null} */
let scriptSettings = null
/** @type {Document | null} */
let originalXML = null
/** @type {HTMLElement | null} */
let lastFocusedElement = null;
let lastElementLineCount = 1;

/** @type {Set<string>} */
let characterSet = new Set();
let lastCharacterUsed = "";
let secondLastCharacterUsed = "";

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
 * @property {boolean} StartsNewPage
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
    /** @type {ElementSettings} */
    let res = {};
    let settings = doc.getElementsByTagName("ElementSettings")
    for (let setting of settings) {
        res[setting.getAttribute("Type").replace(/\s/g, "").toLowerCase()] = LoadElSetting(setting)
    }
    return res;
}

/**
 * @param {Element} el 
 * @returns {HTMLElement}
 */
function EltoHTML(el) {
    let elType = el.getAttribute("Type").replace(/\s/g, "").toLowerCase();
    let elText = "";
    for (let tag of el.children) if (tag.tagName === "Text") {
        elText += tag.textContent;
    }
    if (elType === "parenthetical") elText = elText.replace(/[()]/g, "") // parenthesis in parentheticals are assumed and handled by css
    let newEl = document.createElement(elType)
    newEl.textContent = elText;
    return newEl
    // return `<${elType} class="screenplay-element">${elText}</${elType}>`
}

/**
 * @param {Document} doc
 * @return {HTMLElement[]}
 */
function XMLtoHTML(doc) {
    /** @type {Element[]} */
    let res = []
    contentEls = doc.getElementsByTagName("FinalDraft")[0].getElementsByTagName("Content")[0].children
    // const articleArea = document.getElementById("script-main")

    for (let el of contentEls) {
        res.push(EltoHTML(el))
    }
    return res;
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
 */
function handleFileInput(event) {
    event.preventDefault()
    const file = event.target.files?.[0]
    if (!file) console.warn("DEBUG:\t handleFileInput -> Something went wrong loading file")
    parseXMLFromFile(file).then(doc => {
        while (scriptWrapper.firstChild) {
            scriptWrapper.removeChild(scriptWrapper.firstChild)
        }
        originalXML = doc;
        scriptSettings = LoadElSettings(doc)
        characterSet = getCharacterInfo(doc)
        const screenplayPages = paginateScreenplay(XMLtoHTML(doc));
        for (const page of screenplayPages) {
            scriptWrapper.appendChild(page);
        }
    }).catch(e => console.warn(e))
}

/**
 * @param {InputEvent} event 
 * @param {Element} el
 * @param {Element} currentPage
 */
function handleEnterKey(event, el, currentPage) {
    event.preventDefault()
    const cursorPosition = document.getSelection().anchorOffset
    if (el.firstElementChild) { if (el.firstElementChild.classList.contains("autocomplete")) { el.removeChild(el.firstElementChild) } }
    const newElement = newScriptElement(scriptSettings[el.tagName.toLowerCase()].ReturnKey.replace(/\s/g, "").toLowerCase(), el.textContent.substring(cursorPosition))
    el.textContent = el.textContent.substring(0, cursorPosition)
    if (el.textContent.length === 0) el.appendChild(document.createElement('br'))
    currentPage.insertBefore(newElement, el.nextSibling)
    if (currentPage.scrollHeight > PIXELS_PER_INCH * DEFAULT_PAGE_HEIGHT) reformatScreenplay(el, currentPage)

    setCursorPosition(newElement, 0)
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
 * @param {HTMLElement} el 
 * @param {string} newType 
 * @param {HTMLElement} currentPage
 * @return {HTMLElement}
 */
function changeElementTo(el, newType, currentPage) {
    const lastCursorPosition = getCursorPosition(el)
    const newElement = newScriptElement(newType, el.textContent)
    currentPage.replaceChild(newElement, el)

    setCursorPosition(newElement, lastCursorPosition)
    return newElement
}

/**
 * @param {KeyboardEvent} event 
 * @param {Element} el
 * @param {Element} currentPage
 */
function handlelShortCut(event, el, currentPage) {
    if (event.key.length > 1 || isNaN(parseInt(event.key))) return;
    for (const setting in scriptSettings) {
        if (scriptSettings[setting].Shortcut === event.key) {
            event.preventDefault();
            changeElementTo(el, setting, currentPage)
        }
    }
}

/**
 * @param {KeyboardEvent} event 
 * @param {Element} el 
 * @param {Element} currentPage
 */
function handleTab(event, el, currentPage) {
    event.preventDefault();

    if (el.textContent && el.firstElementChild) {
        // el.textContent+=el.firstElementChild.textContent; // for whatever goddam reason, doing this ALSO removes the span, which will make the subsequence Node.removeChild call fail for having a null arg
        const completeText = el.firstElementChild.textContent
        el.removeChild(el.firstElementChild);
        el.textContent += completeText
        setCursorPosition(el, el.textContent.length)
        // if (el.tagName === "CHARACTER") { console.log("here");secondLastCharacterUsed = lastCharacterUsed; lastCharacterUsed = el.textContent }
        return;
    }
    let newElShortcut = scriptSettings[el.tagName.toLowerCase()].Shortcut;
    if (event.shiftKey) {
        if (newElShortcut === '0') newElShortcut = ":";
        else if (newElShortcut === ':') newElShortcut = "9";
        else newElShortcut = (parseInt(newElShortcut) - 1).toString();
    } else {
        if (newElShortcut === ':') newElShortcut = "0";
        else if (newElShortcut === '9') newElShortcut = ":";
        else newElShortcut = (parseInt(newElShortcut) + 1).toString();
    }

    for (const setting in scriptSettings) {
        if (scriptSettings[setting].Shortcut === newElShortcut) {
            if (!el.textContent) { el = changeElementTo(el, setting, currentPage); handleAutocomplete(event, el, currentPage) }
            else {
                let newElement = newScriptElement(setting)
                currentPage.insertBefore(newElement, el.nextSibling)
                setCursorPosition(newElement, 0)
            }
        }
    }
}

/**
 * @param {InputEvent} event 
 * @param {Element} el 
 * @param {Element} currentPage
 */
function handleDeletion(event, el, currentPage) {
    // console.log("DEBUG:\tHandling deletions")
    // TODO: fix delete page when document is empty
    const selection = document.getSelection();
    const range = selection.getRangeAt(0);

    // for ctrl+a -> delete/backspace
    const allSelected = range.startContainer === scriptWrapper && range.startOffset === 0 &&
        range.endContainer === scriptWrapper && range.endOffset === scriptWrapper.childNodes.length;

    // for if trying to delete from the first position of first element, or if the document is completely blank
    const isFirstElement = el === scriptWrapper.firstElementChild.firstElementChild;
    const cursorAtStart = range.startOffset === 0 || range.startOffset === 1;
    const nothingSelected = selection.isCollapsed;
    const elementIsEmpty = !el.textContent.trim();
    if (isFirstElement && cursorAtStart && nothingSelected && elementIsEmpty && DELETE_INPUT_TYPES.includes(event.inputType)) {
        event.preventDefault()
    } else if (allSelected) {
        event.preventDefault();
        newBlankScript();
    }

}

function handleDeleteKey(event, child, currentPage) {
    console.log("Here!")
}

/**
 * 
 * @param {HTMLElement} child 
 * @param {HTMLElement} parent 
 * @returns {number}
 */
function getChildElementIndex(child, parent) {
    let res = -1;
    for (let i = 0; i < parent.childElementCount; i++) {
        if (parent.children[i] === child) res = i;
    }
    return res;
}

/**
 * 
 * @param {HTMLElement} currentElement 
 * @param {HTMLElement} currentPage 
 */
function reformatScreenplay(currentElement, currentPage) {
    // console.log("DEBUG:\tReformatting")
    const lastScrollPosition = saveScrollPosition(currentElement);
    const lastCursorPosition = getCursorPosition(currentElement)
    // Fixing edge case of when currentElement doesn't exist after reformat, for split dialogue
    const currentPageI = getChildElementIndex(currentPage, scriptWrapper)
    const currentElementI = getChildElementIndex(currentElement, currentPage)
    let allElements = [];
    const pages = document.getElementsByClassName("page")
    let dialogueContinued = false;
    for (let i = 0; i < pages.length; i++) {
        for (let j = 0; j < pages[i].childElementCount; j++) {
            if (dialogueContinued) { j = 1; dialogueContinued = false; }
            else if (pages[i].children[j].tagName.toLowerCase() === "continued") {
                const lastDialogueI = j - 1;
                const nextDialogueI = j + 2;
                allElements[allElements.length - 1].textContent += ` ${pages[i + 1].children[1].textContent}`
                dialogueContinued = true;
            } else {
                allElements.push(pages[i].children[j])
            }
        }
    }
    emptyElement(scriptWrapper)
    const newPages = paginateScreenplay(allElements)
    for (const newPage of newPages) {
        scriptWrapper.appendChild(newPage)
    }
    setCursorPosition(scriptWrapper.children[currentPageI].children[currentElementI], lastCursorPosition)
    restoreScrollPosition(scriptWrapper.children[currentPageI].children[currentElementI], lastScrollPosition)
}
/**
 * @param {KeyboardEvent} e 
 * @param {HTMLElement} el 
 * @param {HTMLElement} page 
 */
function handleArrowKeysUp(e, el, page) {
    if (lastFocusedElement !== el && lastFocusedElement.firstElementChild) lastFocusedElement.removeChild(lastFocusedElement.firstElementChild)
    lastFocusedElement = el;
}

/**
 * @param {KeyboardEvent} event 
 */
function handleKeyDown(event) {
    event.stopPropagation();
    const thisNode = document.getSelection().anchorNode;
    const child = thisNode.nodeType === Node.TEXT_NODE ? thisNode.parentElement : thisNode;
    const currentPage = child.parentElement;
    if (event.key === "Tab") handleTab(event, child, currentPage)
    else if (event.ctrlKey && event.key !== "Control") handlelShortCut(event, child, currentPage)
}
/**
 * @param {KeyboardEvent} event 
 */
function handleKeyUp(event) {
    event.stopPropagation();
    const thisNode = document.getSelection().anchorNode;
    const child = thisNode.nodeType === Node.TEXT_NODE ? thisNode.parentElement : thisNode;
    const currentPage = child.parentElement;
    if (ARROW_KEYS.includes(event.key)) handleArrowKeysUp(event, child, currentPage)
}
/**
 * @param {FocusEvent} event 
 */
function handleFocusOut(event) {
    event.stopPropagation();
    const thisNode = document.getSelection().anchorNode;
    const child = thisNode.nodeType === Node.TEXT_NODE ? thisNode.parentElement : thisNode;
    const currentPage = child.parentElement;

}

/**
 * @param {InputEvent} event 
 */
function handleBeforeInput(event) {
    if (event.inputType === "insertParagraph") {
        const thisNode = document.getSelection().anchorNode;
        const child = thisNode.nodeType === Node.TEXT_NODE ? thisNode.parentElement : thisNode;
        const currentPage = child.parentElement;
        handleEnterKey(event, child, currentPage)

    } else if (DELETE_INPUT_TYPES.includes(event.inputType)) {
        const thisNode = document.getSelection().anchorNode;
        const child = thisNode.nodeType === Node.TEXT_NODE ? thisNode.parentElement : thisNode;
        const currentPage = child.parentElement;
        handleDeletion(event, child, currentPage)
    }
}

/**
 * 
 * @param {string} inputStr 
 * @param {string} option 
 * @returns {boolean}
 */
function substringAtStart(inputStr, option) {
    return inputStr.toLowerCase() === option.substring(0, inputStr.length).toLowerCase()
}

/**
 * @param {string} inputStr 
 * @param {Set<string>} autocompleteSet
 * @returns {[string, string]} Substring that best matches the first matching string to complete the input.
 */
function completeStringFromSet(inputStr, autocompleteSet) {
    if (!inputStr) return "";
    for (const option of autocompleteSet) {
        if (substringAtStart(inputStr, option)) return [option, option.substring(inputStr.length)]
    }
    return "";
}

let lastAutocomplete = "";
/**
 * Autocomplete for character names, headings, and transitions
 * @param {InputEvent} event 
 * @param {HTMLElement} currentEl 
 * @param {HTMLElement} currentPage 
 */
function handleAutocomplete(event, currentEl, currentPage) {

    if (!AUTOCOMPLETE_TAGS.includes(currentEl.tagName.toLowerCase())) return
    const maybeSpan = currentEl.getElementsByClassName("autocomplete")
    if (maybeSpan.length) currentEl.removeChild(maybeSpan[0])

    if (!currentEl.textContent && !currentEl.firstChild) {
        currentEl.appendChild(document.createElement('br'));
        return;
    }

    let newSpan = document.createElement("span")
    newSpan.classList.add("autocomplete")
    // newSpan.setAttribute("userselect")
    let res = ""
    switch (currentEl.tagName) {
        case "CHARACTER": // this is fucking killing me omg
            // console.log("DEBUG:\tIn character autocomplete")
            [lastAutocomplete, res] = completeStringFromSet(currentEl.textContent, characterSet)
            // if (!currentEl.textContent) res = secondLastCharacterUsed ? secondLastCharacterUsed : res;
            // else if (lastAutocomplete && substringAtStart(currentEl.textContent, lastAutocomplete)) res = lastAutocomplete.substring(currentEl.textContent.length)
            // else[lastAutocomplete, res] = completeStringFromSet(currentEl.textContent, characterSet)
            break;
        case "TRANSITION":
            [lastAutocomplete, res] = completeStringFromSet(currentEl.textContent, DEFAULT_TRANSITIONS)
            break;
        case "SCENEHEADING":
            if (SCENE_INTRO_REGEX.test(currentEl.textContent)) { // we assume we're in the int/ext portion
                [lastAutocomplete, res] = completeStringFromSet(currentEl.textContent, DEFAULT_SCENE_INTROS)
            } else if (TIME_OF_DAY_REGEX.test(currentEl.textContent)) {
                [lastAutocomplete, res] = completeStringFromSet(currentEl.textContent.substring(currentEl.textContent.lastIndexOf('-') + 1).trim(), DEFAULT_TIMES_OF_DAY)
            }
            break;
        default:
            break;
    }
    if (res) {
        newSpan.textContent = res;
        currentEl.appendChild(newSpan)
    }
}
/**
 * @param {InputEvent} event 
 */
function handleInput(event) {
    const thisNode = document.getSelection().anchorNode;
    const child = thisNode.nodeType === Node.TEXT_NODE ?
        thisNode.parentElement.tagName === "SPAN" ?
            thisNode.parentElement.parentElement
            : thisNode.parentElement
        : thisNode;
    const currentPage = child.parentElement;
    const range = document.createRange();
    range.selectNodeContents(child)
    let newLineCount = range.getClientRects().length;
    let lastCursorPosition = getCursorPosition(child)

    handleAutocomplete(event, child, currentPage);
    setCursorPosition(child, lastCursorPosition)
    // if (child.tagName === "CHARACTER"){
    //     // if (secondLastCharacterUsed) 
    //     // child.place
    //     // currentPage.placeh
    // }
    if (scriptWrapper.childElementCount === 1 && !scriptWrapper.firstChild.firstChild) newBlankScript() // edge case where all elements are empty with <br>
    else {
        if (lastElementLineCount != newLineCount && lastFocusedElement === child) reformatScreenplay(child, currentPage)
        else if (DELETE_INPUT_TYPES.includes(event.inputType) && lastFocusedElement !== child) reformatScreenplay(child, currentPage)
    }

    // if (lastFocusedElement !== child && lastFocusedElement.tagName)

    lastFocusedElement = child;
    lastElementLineCount = newLineCount

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
    const htmlTag = el.tagName.toLowerCase();
    paraEl.setAttribute("Type", tagToFDXType(htmlTag))
    let textEl = doc.createElement("Text")
    if (htmlTag === "parenthetical") textEl.textContent = `(${el.textContent})`;
    else textEl.textContent = el.textContent;
    doc.getElementsByTagName("Content")[0].appendChild(doc.createTextNode('    '))
    doc.getElementsByTagName("Content")[0].appendChild(paraEl)
    doc.getElementsByTagName("Content")[0].appendChild(doc.createTextNode('\n'))
    paraEl.appendChild(textEl)
}

/**
 * @param {Event}
 */
function downloadFDX(event) {
    event.preventDefault();
    const parser = new DOMParser()
    let newContentDoc = parser.parseFromString(`<Content>\n</Content>`, "application/xml")
    // let newContentEl = newContentDoc.getElementsByTagName("Content")[0]
    const pages = document.getElementsByClassName("page")
    for (const page of pages) {
        for (const child of page.children) {
            HTMLtoFDX(newContentDoc, child)
        }
    }
    newContentDoc.getElementsByTagName("Content")[0].appendChild(newContentDoc.createTextNode('  '))
    let FDRoot = originalXML.getElementsByTagName("FinalDraft")[0];
    FDRoot.replaceChild(newContentDoc.getElementsByTagName("Content")[0], FDRoot.getElementsByTagName("Content")[0])
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
 * @param {Element} el 
 */
function emptyElement(el) {
    while (el.firstChild) el.removeChild(el.firstChild)
}

async function loadDefaultSettings() {
    if (defaultScriptSettings === null) {
        fetch("DefaultSettings.xml")
            .then(res => res.text())
            .then(text => parseXMLString(text))
            .then((doc) => {
                defaultScriptSettings = LoadElSettings(doc);
                scriptSettings = defaultScriptSettings
                if (scriptSettings === null) throw "DEBUG:\t loadDefaultSettings -> Something went wrong loading scriptSettings"
                else console.log("DEBUG:\t loadDefaultSettings -> Default settings loaded")
            })
            .catch(e => console.warn(e))
    } else {
        scriptSettings = defaultScriptSettings
    }
}

function newBlankScript() {
    loadDefaultSettings().then(_ => {
        while (scriptWrapper.firstChild) {
            scriptWrapper.removeChild(scriptWrapper.firstChild)
        }

        let newSceneHeading = document.createElement("sceneheading")
        newSceneHeading.appendChild(document.createElement("br"))
        let newPage = document.createElement("div")
        newPage.setAttribute("contenteditable", "true")
        newPage.classList.add("page")
        newPage.appendChild(newSceneHeading)
        scriptWrapper.appendChild(newPage)
        setCursorPosition(newSceneHeading, 0)
        // lastFocusedElement = newSceneHeading;
    }).catch(e => console.warn(e));
}

function replaceXMLContent() { }
/**
 * 
 * @param {Document} doc 
 * @returns {string[]}
 */
function getCharacterInfo(doc) {

    let res = new Set();
    const charElements = doc.getElementsByTagName("Character")
    for (const char of charElements) {
        res.add(char.textContent)
    }
    return res
}
/**
 * 
 * @param {string} str 
 */
function addToCharacterSet(str) {
    characterSet.add(str)
}

document.getElementById("script-upload").addEventListener("change", handleFileInput)
scriptWrapper.addEventListener("keydown", handleKeyDown)
// scriptWrapper.addEventListener("focusout", handleFocusOut)
scriptWrapper.addEventListener("keyup", handleKeyUp)
scriptWrapper.addEventListener("input", handleInput)
scriptWrapper.addEventListener("beforeinput", handleBeforeInput)

document.getElementById("download-fdx").addEventListener("click", downloadFDX)
document.getElementById("new-blank").addEventListener("click", newBlankScript)
loadDefaultSettings();
newBlankScript();

// Fuck it, let's just ask Claude
/**
 * 
 * @param {HTMLElement} element 
 * @param {ScrollPosition} state 
 */
function restoreScrollPosition(element, state) {
    element.scrollTop = state.element.top;
    element.scrollLeft = state.element.left;

    state.ancestors.forEach(({ node, top, left }) => {
        node.scrollTop = top;
        node.scrollLeft = left;
    });

    window.scrollTo(state.window.x, state.window.y);
}
/**
 * @typedef {object} ScrollElement
 * @property {number} top
 * @property {number} left
 */
/**
 * @typedef {object} Ancestor
 * @property {HTMLElement} node
 * @property {number} top
 * @property {number} left
 */
/** 
 *  @typedef {object} ScrollPosition
 *  @property {ScrollElement} element
 *  @property {Ancestor[]} ancestors
 */

/**
 * @param {HTMLElement} element 
 * @returns {ScrollPosition}
 */
function saveScrollPosition(element) {
    const state = {
        element: {
            top: element.scrollTop,
            left: element.scrollLeft,
        },
        ancestors: [],
    };

    // Walk up and record scroll position of every scrollable ancestor
    let node = element.parentElement;
    while (node) {
        if (node.scrollHeight > node.clientHeight || node.scrollWidth > node.clientWidth) {
            state.ancestors.push({ node, top: node.scrollTop, left: node.scrollLeft });
        }
        node = node.parentElement;
    }

    // Also capture window scroll, in case the document itself scrolls
    state.window = { x: window.scrollX, y: window.scrollY };

    return state;
}

/**
 * @param {HTMLElement} element 
 * @returns {number}
 */
function getCursorPosition(element) {
    const selection = window.getSelection();

    if (selection.rangeCount === 0) return 0;

    const range = selection.getRangeAt(0);

    // Make sure the selection is actually inside our element
    if (!element.contains(range.startContainer)) return 0;

    // Create a range from the start of the element to the start of the selection
    const preCaretRange = document.createRange();
    preCaretRange.selectNodeContents(element);
    preCaretRange.setEnd(range.startContainer, range.startOffset);

    // The length of that range's text content is the global cursor offset
    return preCaretRange.toString().length;
}

/**
 * @param {HTMLElement} element 
 * @param {number} position 
 */
function setCursorPosition(element, position) {
    element.focus();

    const range = document.createRange();
    const selection = window.getSelection();

    // Walk through text nodes to find the one containing the target position
    let currentNode = null;
    let currentOffset = 0;
    let remaining = position;

    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null);

    while (walker.nextNode()) {
        const node = walker.currentNode;
        const length = node.textContent.length;

        if (remaining <= length) {
            currentNode = node;
            currentOffset = remaining;
            break;
        }

        remaining -= length;
    }

    if (currentNode) {
        range.setStart(currentNode, currentOffset);
        range.collapse(true);
    } else {
        // Fallback: position not found (e.g. position exceeds content length)
        // Place cursor at the end of the element
        range.selectNodeContents(element);
        range.collapse(false);
    }

    selection.removeAllRanges();
    selection.addRange(range);
    lastFocusedElement = element
}

/**
 * @callback KeepWithNextPredicate
 * @param {HTMLElement} element
 * @returns {boolean} True if this element should never be the last one on a page.
 */

/**
 * @typedef {Object} PaginationOptions
 * @property {string} [pageClassName='page']
 * @property {number} [pageHeightIn=11]
 * @property {string} [characterTagName='character'] Tag name used for character cues.
 *   Also reused (with different text) to render the generated (MORE) and
 *   (CONT'D) lines, so they automatically pick up your existing CSS.
 * @property {string} [dialogueTagName='dialogue'] Tag name used for dialogue blocks.
 *   Only elements with this tag are eligible for mid-element splitting.
 * @property {string} [moreText='(MORE)']
 * @property {string} [contdText="(CONT'D)"]
 * @property {number} [minWordsBeforeSplit=4] Minimum words that must remain on the
 *   first half of a split. Prevents splitting after just one or two words.
 * @property {number} [minWordsAfterSplit=4] Minimum words required on the
 *   continuation half. Prevents leaving a lone word dangling as a "widow"
 *   at the top of the next page.
 * @property {KeepWithNextPredicate} [isKeepWithNext]
 */

/**
 * @param {PaginationOptions} options 
 * @returns {HTMLElement}
 */
function createPage(options) {
    const page = document.createElement('div');
    page.setAttribute("contenteditable", "true")
    page.classList.add(options.pageClassName);
    Object.assign(page.style, {
        // boxSizing: 'border-box',
        // paddingTop: `${marginTopIn}in`,
        // paddingBottom: `${marginBottomIn}in`,
        // height: 'auto',
        overflow: 'visible',
        minHeight: '0',
    });
    return page;
}

/**
 * @param {HTMLElement} el 
 * @param {HTMLElement[]} pages 
 * @param {HTMLElement} currentPage 
 * @param {HTMLDivElement} sandbox 
 * @param {PaginationOptions} options 
 * @returns {HTMLElement}
 */
function startNewPageWith(el, pages, currentPage, sandbox, options) {
    pages.push(currentPage);
    currentPage = createPage(options);
    sandbox.appendChild(currentPage);
    currentPage.appendChild(el);
    return currentPage
}

/**
 * @param {HTMLElement} page 
 * @param {number} pageHeightPx 
 * @returns {boolean}
 */
const overflowsPage = (page, pageHeightPx) => page.scrollHeight > pageHeightPx;

/**
 * Splits a flat, in-order array of screenplay element nodes into an array of
 * page container elements sized to physical page dimensions.
 *
 * Dialogue splitting: if a <dialogue> element (tag configurable via
 * `dialogueTagName`) would overflow the current page, this function performs
 * a binary search over its word tokens to find the maximum amount of text
 * that fits alongside a trailing "(MORE)" line. The remaining text becomes a
 * new <dialogue> element placed at the top of the next page, preceded by a
 * repeated character cue reading "NAME (CONT'D)". This repeats automatically
 * if the remainder is itself still too long for a single page.
 *
 * Splitting is skipped (falls back to moving the whole element to the next
 * page) if the resulting halves would be too short per minWordsBeforeSplit /
 * minWordsAfterSplit, or if there's no usable room on the current page at all.
 *
 * @param {HTMLElement[]} elements Flat array of screenplay element nodes, in
 *   script order.
 * @param {PaginationOptions} [options]
 * @returns {HTMLElement[]} Array of page container elements, populated and
 *   detached (not yet appended anywhere).
 */
function paginateScreenplay(elements, options = {
    pageClassName: 'page',
    pageHeightIn: 9,
    characterTagName: 'character',
    dialogueTagName: 'dialogue',
    moreText: '(MORE)',
    contdText: "(CONT'D)",
    minWordsBeforeSplit: 4,
    minWordsAfterSplit: 4,
    isKeepWithNext: null,
}) {
    const PX_PER_IN = 96;
    const pageHeightPx = options.pageHeightIn * PX_PER_IN;

    // Pass 1: measure everything in ONE reflow.
    const heights = measureHeights(elements, options);

    const heightMap = new WeakMap();
    elements.forEach((el, i) => heightMap.set(el, heights[i]));

    const scratch = document.createElement('div');
    Object.assign(scratch.style, {
        position: 'absolute',
        left: '-99999px',
        top: '0',
        pointerEvents: 'none',
    });
    document.body.appendChild(scratch);

    // apply the correct font/line-height/width styles so measurements are accurate —
    // easiest is to clone them from your real page container:
    const template = createPage(options);
    scratch.className = template.className;
    Object.assign(scratch.style, {
        width: getComputedStyle(template).width,
        // whatever else affects text wrapping: font, padding, etc.
    });

    // Pass 2: pack using pure arithmetic — zero DOM reads.
    const pageBuckets = [];
    let currentEls = [];
    let currentHeight = 0;
    let lastCharacterEl = null;

    function flushPage() {
        pageBuckets.push(currentEls);
        currentEls = [];
        currentHeight = 0;
    }

    function startNewPage(el, h) {
        flushPage();
        currentEls.push(el);
        currentHeight = h;
    }
    function heightOf(el) { return measureOne(el, scratch); }

    for (let i = 0; i < elements.length; i++) {
        const el = elements[i];
        const tag = el.tagName.toLowerCase();
        const h = heights[i];

        if (tag === options.characterTagName) lastCharacterEl = el;

        if (currentEls.length === 0) {
            currentEls.push(el);
            currentHeight = h;
        } else if (currentHeight + h > pageHeightPx) {
            if (tag === options.dialogueTagName) {
                const remaining = pageHeightPx - currentHeight;
                const orphanCharacter = currentEls[currentEls.length - 1].tagName.toLowerCase() === options.characterTagName;
                const split = attemptSplitDialogue(el, lastCharacterEl, remaining, options, scratch);

                if (split) {
                    currentEls.push(split.firstPart, split.continuedCue);
                    flushPage();
                    currentEls.push(split.nextPageCharacter);
                    currentHeight = heightOf(split.nextPageCharacter, scratch);   // genuinely new element — needs measuring
                    elements.splice(i + 1, 0, split.secondPart);
                    const secondPartHeight = heightOf(split.secondPart, scratch);  // also genuinely new
                    heights.splice(i + 1, 0, secondPartHeight);
                    heightMap.set(split.secondPart, secondPartHeight);             // keep the map in sync
                } else if (orphanCharacter) {
                    const orphan = currentEls.pop();
                    currentHeight -= heightMap.get(orphan);   // known height, no measurement
                    startNewPage(orphan, heightMap.get(orphan));
                    currentEls.push(el);
                    currentHeight += h;
                } else {
                    startNewPage(el, h);
                }
            } else {
                startNewPage(el, h);
            }
        } else {
            currentEls.push(el);
            currentHeight += h;
        }

        if (options.isKeepWithNext && options.isKeepWithNext(el)) {
            const isLast = i === elements.length - 1;
            const nextOverflows = !isLast && (currentHeight + heights[i + 1] > pageHeightPx);
            if (isLast || nextOverflows) {
                currentEls.pop();
                currentHeight -= h;
                startNewPage(el, h);
            }
        }
    }
    pageBuckets.push(currentEls);
    document.body.removeChild(scratch);
    // Pass 3: build real pages, one batched write each — still no reads.
    return pageBuckets.map(els => {
        const page = createPage(options);
        const frag = document.createDocumentFragment();
        els.forEach(el => frag.appendChild(el));
        page.appendChild(frag);
        return page;
    });
}

function measureHeights(elements, options) {
    const sandbox = document.createElement('div');
    Object.assign(sandbox.style, { position: 'absolute', left: '-99999px', top: '0', pointerEvents: 'none' });
    const measurePage = createPage(options);
    Object.assign(measurePage.style, { height: 'auto', overflow: 'visible' });
    sandbox.appendChild(measurePage);
    document.body.appendChild(sandbox);

    const clones = elements.map(el => el.cloneNode(true));
    const frag = document.createDocumentFragment();
    clones.forEach(c => frag.appendChild(c));
    measurePage.appendChild(frag);           // one write

    const heights = clones.map(c => c.getBoundingClientRect().height); // one reflow serves all reads

    document.body.removeChild(sandbox);
    return heights;
}

/**
 * Attempts to split `dialogueEl` so the first part fits in `remainingHeightPx`.
 * Returns null if it can't be split cleanly (too little dialogue left before/after
 * the break, or not even minWordsBeforeSplit fits) — caller should then move the
 * whole character+dialogue pair to the next page instead.
 */
function attemptSplitDialogue(dialogueEl, characterEl, remainingHeightPx, options, scratch) {
    const words = dialogueEl.textContent.trim().split(/\s+/);
    const { minWordsBeforeSplit: minBefore, minWordsAfterSplit: minAfter } = options;

    if (words.length < minBefore + minAfter) return null;

    const continuedCue = createContinuedElement(options);
    const continuedHeight = measureOne(continuedCue, scratch);
    const budget = remainingHeightPx - continuedHeight;
    if (budget <= 0) return null;

    // Binary search the largest word count that still fits `budget`.
    let lo = minBefore;
    let hi = words.length - minAfter;
    let best = -1;

    while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        const candidate = cloneWithText(dialogueEl, words.slice(0, mid).join(' '));
        const h = measureOne(candidate, scratch);
        if (h <= budget) {
            best = mid;
            lo = mid + 1;
        } else {
            hi = mid - 1;
        }
    }

    if (best === -1) return null; // even minWordsBeforeSplit overflows the remaining space

    const firstPart = cloneWithText(dialogueEl, words.slice(0, best).join(' '));
    const secondPart = cloneWithText(dialogueEl, words.slice(best).join(' '));
    const nextPageCharacter = cloneWithText(
        characterEl,
        `${characterEl.textContent.trim()} ${options.contdText}`
    );

    return { firstPart, continuedCue, nextPageCharacter, secondPart };
}

function createContinuedElement(options) {
    const tag = options.continuedTagName || 'continued';
    const el = document.createElement(tag);
    el.textContent = options.moreText;
    return el;
}

/** Shallow clone — keeps tag name, classes, and attributes; swaps only the text. */
function cloneWithText(el, text) {
    const clone = el.cloneNode(false);
    clone.textContent = text;
    return clone;
}

/** One write + one read + one write. Kept isolated so it doesn't disturb pass-1's measurements. */
function measureOne(el, scratch) {
    scratch.appendChild(el.cloneNode(true));
    const h = scratch.lastElementChild.getBoundingClientRect().height;
    scratch.removeChild(scratch.lastElementChild);
    return h;
}