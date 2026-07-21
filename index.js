const { PDFDocument, StandardFonts, rgb } = PDFLib
const { fontkit } = window.fontkit

/**
 * @typedef {{anchorBlockId: string, anchorOffset: number, focusBlockId: string, focusOffset: number}} SelectionCapture
 */
/**
 * @typedef {{html:string, selection:SelectionCapture}} Snapshot
 */
class UndoStack {
    /**
     * @param {number} limit 
     * @param {Snapshot[]} undo 
     * @param {Snapshot[]} redo 
     * @param {boolean} singleDeleteLast
     * @param {boolean} singleAddLast
     * @param {number} lastUid
     */
    constructor(limit = 100, undo = [], redo = [], singleDeleteLast = false, singleAddLast = false, lastUid = 0) {
        /** @type {Snapshot[]} */
        this.undo_ = undo;
        /** @type {Snapshot[]} */
        this.redo_ = redo;
        /** @type {number} */
        this.limit = limit;
        /** @type {bool} */
        this.singleDeleteLast = singleDeleteLast
        /** @type {bool} */
        this.singleAddLast = singleAddLast
        /** @type {number} */
        this.uid = lastUid
    }

    /**
     * @returns {Snapshot}
     */
    snapshot() {
        return {
            selection: this.captureSelection(), // save/restore caret position too
            html: scriptWrapper.innerHTML,
        };
    }

    push() {
        this.undo_.push(this.snapshot());
        this.redo_.length = 0;
        if (this.undo_.length > this.limit) this.undo_.shift();
    }

    undo() {
        if (!this.undo_.length) return;
        this.redo_.push(this.snapshot());
        const state = this.undo_.pop();
        scriptWrapper.innerHTML = state.html;
        restoreSelection(state.selection);
    }

    redo() {
        if (!this.redo_.length) return;
        this.undo_.push(this.snapshot());
        const state = this.redo_.pop();
        scriptWrapper.innerHTML = state.html;
        restoreSelection(state.selection);
    }

    /**
     * @param {HTMLElement} el 
     * @returns {string}
     */
    ensureId(el) { if (!el.id) el.id = `el-${this.uid++}`; return el.id; }

    /**
     * @returns {SelectionCapture | null}
     */
    captureSelection() {
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) return null;

        const range = sel.getRangeAt(0);

        const anchorBlock = closestBlock(sel.anchorNode);
        const focusBlock = closestBlock(sel.focusNode);
        if (!anchorBlock || !focusBlock) return null;
        return {
            anchorBlockId: this.ensureId(anchorBlock),
            anchorOffset: textOffsetWithinBlock(anchorBlock, sel.anchorNode, sel.anchorOffset),
            focusBlockId: this.ensureId(focusBlock),
            focusOffset: textOffsetWithinBlock(focusBlock, sel.focusNode, sel.focusOffset),
        };
    }
}

/**
 * @param {Node} node 
 * @param {HTMLElement?} root 
 * @returns {HTMLElement | null}
 */
function closestBlock(node, root = scriptWrapper) {
    // Text node -> start from its parent element
    let el = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;

    while (el && el !== root) {
        if (HTML_TAG_NAMES.includes(el.tagName.toLowerCase())) return el;
        el = el.parentElement;
    }
    return null; // node wasn't inside a recognized block (shouldn't normally happen)
}

/**
 * Convert a (node, offset) pair into a character offset relative to block.textContent 
 * @param {HTMLElement} block 
 * @param {Node} node 
 * @param {number} offset 
 * @returns {number}
 */
function textOffsetWithinBlock(block, node, offset) {
    if (node.nodeType !== Node.TEXT_NODE) {
        // Selection anchor landed on an element (e.g. empty block, or offset
        // counts child nodes) — sum text length of preceding children instead.
        let total = 0;
        for (let i = 0; i < offset; i++) {
            total += node.childNodes[i]?.textContent.length ?? 0;
        }
        return total;
    }

    const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
    let total = 0;
    let current = walker.nextNode();
    while (current && current !== node) {
        total += current.textContent.length;
        current = walker.nextNode();
    }
    return total + offset;
}

/**
 * Walk a block's text nodes to find the (node, offset) pair
 * corresponding to a character offset into its overall textContent.
 * @param {HTMLElement} block 
 * @param {number} charOffset 
 * @returns {{node: Node, offset:number}}
 */
function findTextPosition(block, charOffset) {
    const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
    let remaining = charOffset;
    let node = walker.nextNode();
    let last = null;

    while (node) {
        const len = node.textContent.length;
        if (remaining <= len) {
            return { node: node, offset: remaining };
        }
        remaining -= len;
        last = node;
        node = walker.nextNode();
    }

    // charOffset was beyond the block's text (e.g. block is now empty,
    // or offset was clamped by an earlier merge) — fall back to the end.
    if (last) return { node: last, offset: last.textContent.length };

    // Block has no text nodes at all (fully emptied) — insert as a child directly.
    return { node: block, offset: 0 };
}

/**
 * @param {SelectionCapture} saved 
 */
function restoreSelection(saved) {
    if (!saved) return;

    const anchorBlock = document.getElementById(saved.anchorBlockId);
    const focusBlock = document.getElementById(saved.focusBlockId);
    if (!anchorBlock || !focusBlock) { console.log("wtf"); return; } // blocks gone (shouldn't happen right after undo/redo, but stay defensive)

    const anchorPos = findTextPosition(anchorBlock, saved.anchorOffset);
    const focusPos = findTextPosition(focusBlock, saved.focusOffset);

    const sel = window.getSelection();
    sel.removeAllRanges();

    const range = document.createRange();
    range.setStart(anchorPos.node === anchorBlock ? anchorBlock : anchorPos.node,
        anchorPos.node === anchorBlock ? 0 : anchorPos.offset);
    range.collapse(true);
    sel.addRange(range);

    // Extend to focus if it's a real selection, not just a caret
    if (saved.anchorBlockId !== saved.focusBlockId || saved.anchorOffset !== saved.focusOffset) {
        sel.extend(
            focusPos.node === focusBlock ? focusBlock : focusPos.node,
            focusPos.node === focusBlock ? 0 : focusPos.offset
        );
    }
}

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
    "note",
    "continued"
]
const EXTENSION_REGEX = /\(([\w\.\-'])*\)?$/i
const DEFAULT_EXTENSIONS = new Set([
    "(V.O.)",
    "(O.S.)",
    "(O.C.)",
    "(CONT'D)",
    "(SUBTITLE)",
    "(TEXT)",
    "(pre-lap)",
]);
const SCENE_INTRO_REGEX = /^(\w{1,3}|i\/{1,2})(?!.)/i
const DEFAULT_SCENE_INTROS = new Set(["INT.", "EXT.", "I/E"]);
const TIME_OF_DAY_REGEX = /-\s(?:\w* *)+$/i
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
const DELETE_INPUT_TYPES = ["deleteContentForward", "deleteContentBackward", "deleteWordForward", "deleteWordBackward", "deleteByCut"]
const ARROW_KEYS = ["ArrowDown", "ArrowUp", "ArrowRight", "ArrowLeft"]
const LAST_SCREENPLAY_KEY = "lastScreenplay";
const LAST_SCRIPT_SETTINGS_KEY = "lastScriptSettings"
const LAST_XML_DOC_KEY = "lastXMLDoc"
const LAST_FILE_NAME_KEY = "lastFileName"
const LAST_CHARACTER_SET_KEY = "lastCharacterSet"
const LAST_UNDO_STACK_KEY = "lastUndoStack"
const LAST_SCROLL_POSITION_KEY = "lastScrollPosition"
const LAST_CURSOR_POSITION_KEY = "lastCursorPosition"
// const MAX_WIDTH_BY_TAG = {

// }
/**
 * @param {HTMLElement} el 
 * @returns {number}
 */
function getElementMaxWidth(el) {
    const elStyles = window.getComputedStyle(el)
    return (DEFAULT_PAGE_WIDTH - DEFAULT_RIGHT_MARGIN - DEFAULT_LEFT_MARGIN) * PIXELS_PER_INCH - parseInt(elStyles.paddingLeft.substring(0, elStyles.paddingLeft.lastIndexOf('p'))) - parseInt(elStyles.paddingRight.substring(0, elStyles.paddingRight.lastIndexOf('p')))
}

let scriptWrapper = document.getElementById("script-main");
let fileNameInput = document.getElementById("file-name")

/** @type {ElementSettings | null} */
let defaultScriptSettings = null
/** @type {ElementSettings | null} */
let scriptSettings = null
/** @type {Document | null} */
let blankScriptXML = null
/** @type {Document | null} */
let originalXML = null
/** @type {HTMLElement | null} */
let lastFocusedElement = null;
let lastElementLineCount = 1;
let lastSnapshotElement = null

/** @type {Set<string>} */
let characterSet = new Set();
let lastCharacterUsed = "";
let secondLastCharacterUsed = "";

let undoStack = new UndoStack();

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
 * Saves screenplay innerHTML, settings object, original xml doc, file name, character set, and undo stack to local storage.
 * @param {Event} e 
 */
function saveCurrentScreenplay(e) {
    if (document.visibilityState === "hidden") {
        const xmlString = new XMLSerializer().serializeToString(originalXML);
        localStorage.setItem(LAST_SCREENPLAY_KEY, scriptWrapper.innerHTML)
        localStorage.setItem(LAST_SCRIPT_SETTINGS_KEY, JSON.stringify(scriptSettings))
        localStorage.setItem(LAST_XML_DOC_KEY, xmlString)
        localStorage.setItem(LAST_FILE_NAME_KEY, fileNameInput.value)
        localStorage.setItem(LAST_CHARACTER_SET_KEY, JSON.stringify([...characterSet]))
        localStorage.setItem(LAST_UNDO_STACK_KEY, JSON.stringify(undoStack))

    }
}

/**
 * @param {Element} el 
 * @returns {HTMLElement}
 */
function EltoHTML(el) {
    let elType = el.getAttribute("Type").replace(/\s/g, "").toLowerCase();
    let elInnerHTML = "";
    for (let tag of el.children) if (tag.tagName === "Text") {
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
    if (elType === "parenthetical") elInnerHTML = elInnerHTML.replace(/[()]/g, "") // parenthesis in parentheticals are assumed and handled by css
    let newEl = document.createElement(elType)
    newEl.innerHTML = elInnerHTML;
    return newEl
}

/**
 * @param {Document} doc
 * @return {HTMLElement[]}
 */
function XMLtoHTML(doc) {
    /** @type {Element[]} */
    let res = []
    contentEls = doc.getElementsByTagName("FinalDraft")[0].getElementsByTagName("Content")[0].children
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
    /** @type {File} */
    const file = event.target.files?.[0]
    if (!file) console.warn("DEBUG:\t handleFileInput -> Something went wrong loading file")
    parseXMLFromFile(file).then(doc => {
        while (scriptWrapper.firstChild) {
            scriptWrapper.removeChild(scriptWrapper.firstChild)
        }
        originalXML = doc;
        scriptSettings = LoadElSettings(doc)
        characterSet = getCharacterInfo(doc)
        const [screenplayPages, _, __] = paginateScreenplay(XMLtoHTML(doc));
        for (const page of screenplayPages) {
            scriptWrapper.appendChild(page);
        }
        fileNameInput.value = file.name.substring(0, file.name.length - 4)
        switchLastFocusedElement(scriptWrapper.firstChild.firstChild)
        undoStack = new UndoStack()
    }).catch(e => console.warn(e))
}

/**
 * @param {HTMLElement} el 
 */
function ensureLineHasContent(el) {
    // Remove any stray <br> if the element actually has real content
    // (can happen after extractContents/pruning leaves one behind)
    if (el.childElementCount > 1) {
        el.querySelectorAll('br').forEach(br => br.remove())
    }
    // Add exactly one <br> only if there's truly nothing left
    if (!el.childElementCount && !el.textContent) {
        el.appendChild(document.createElement('br'))
    }
}
/**
 * @param {HTMLElement} root 
 */
function pruneEmptyInlineNodes(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT)
    const toCheck = []
    let node
    while ((node = walker.nextNode())) toCheck.push(node)
    // walk bottom-up isn't strictly needed here since these are leaf spans,
    // but reverse order is safer if you ever nest spans
    for (let i = toCheck.length - 1; i >= 0; i--) {
        const n = toCheck[i]
        if (n.textContent === "" && n.tagName !== "BR") {
            n.remove()
        }
    }
}

/**
 * TODO: Fix caret dissapearing on entering a new element on Firefox
 * @param {InputEvent} event 
 * @param {Element} el
 * @param {Element} currentPage
 */
function handleEnterKey(event, el, currentPage) {
    event.preventDefault()
    undoStack.push()
    if (el.dataset.suggestion) { el.dataset.suggestion = ""; }
    if (el.tagName === "CHARACTER") addToCharacterSet(el.textContent)

    const selection = window.getSelection()
    const cursorRange = selection.getRangeAt(0)

    const tailRange = document.createRange()
    tailRange.setStart(cursorRange.startContainer, cursorRange.startOffset)
    if (el.lastChild) {
        tailRange.setEndAfter(el.lastChild)
    } else {
        tailRange.setEnd(el, el.childNodes.length)
    }

    // Detach the live selection from `el` BEFORE mutating its DOM.
    // extractContents() below splits/removes nodes that el's current
    // selection is anchored into; leaving the selection live during that
    // mutation is what leaves Firefox's caret state broken afterward.
    // selection.removeAllRanges()

    const tailFragment = tailRange.extractContents()

    const newElement = newScriptElement(scriptSettings[el.tagName.toLowerCase()].ReturnKey.replace(/\s/g, "").toLowerCase())
    newElement.innerHTML = ""
    newElement.appendChild(tailFragment)

    pruneEmptyInlineNodes(newElement)
    ensureLineHasContent(el)
    ensureLineHasContent(newElement)

    currentPage.insertBefore(newElement, el.nextSibling)
    if (currentPage.scrollHeight > PIXELS_PER_INCH * DEFAULT_PAGE_HEIGHT) reformatScreenplay(el, currentPage)
    setCursorPosition(newElement, 0)
}

/**
 * @param {string} type 
 * @param {string} textContent 
 * @returns {HTMLElement}
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
 */
function handleUndo(event) {
    event.preventDefault();
    undoStack.undo();
}
/**
 * @param {KeyboardEvent} event 
 */
function handleRedo(event) {
    event.preventDefault();
    undoStack.redo()
}

/**
 * @param {KeyboardEvent} event 
 * @param {Element} el
 * @param {Element} currentPage
 */
function handleShortCut(event, el, currentPage) {
    const key = event.key.toLowerCase();
    if (STYLE_CLASSES[key]) { undoStack.push(); handleTextStyling(event, scriptWrapper) }
    else if (key === "z") handleUndo(event);
    else if (key === "y") handleRedo(event);
    else if (!isNaN(parseInt(key))) {
        for (const setting in scriptSettings) {
            if (scriptSettings[setting].Shortcut === key) {
                event.preventDefault();
                undoStack.push()
                changeElementTo(el, setting, currentPage)
                return
            }
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
    undoStack.push()
    if (el.textContent && el.dataset.suggestion) {
        el.textContent += el.dataset.suggestion
        el.dataset.suggestion = ""
        setCursorPosition(el, el.textContent.length)
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
                if (el.tagName === "CHARACTER") addToCharacterSet(el.textContent)
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
    if (!(el === lastSnapshotElement && undoStack.singleDeleteLast && selection.isCollapsed)) {
        undoStack.singleAddLast = false;
        lastSnapshotElement = el;
        undoStack.push();
        if (selection.isCollapsed && (event.inputType === "deleteContentBackward" || event.inputType === "deleteContentForward" || event.inputType === "deleteWordForward" || event.inputType === "deleteWordBackward")) {
            undoStack.singleDeleteLast = true;
        } else {
            undoStack.singleDeleteLast = false;
        }
    }
    // undoStack.push()
    if (isFirstElement && cursorAtStart && nothingSelected && elementIsEmpty && DELETE_INPUT_TYPES.includes(event.inputType)) {
        event.preventDefault()
    } else if (allSelected) {
        event.preventDefault();
        newBlankScript(true);
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
    for (let i = 0; i < parent.childElementCount; i++) {
        if (parent.children[i] === child) return i;
    }
    return -1;
}

/**
 * 
 * @param {HTMLElement} currentElement 
 * @returns {[HTMLElement[], HTMLElementEventMap]}
 */
function getAllScreenplayElements(currentElement = null, lastCursorPosition = -1) {
    let allElements = [];
    const pages = document.getElementsByClassName("page")
    let dialogueContinued = false;
    for (let i = 0; i < pages.length; i++) {
        for (let j = 0; j < pages[i].childElementCount; j++) {
            if (dialogueContinued) { j = 1; dialogueContinued = false; }
            else if (pages[i].children[j].tagName.toLowerCase() === "continued") { // TODO: fix this erasing second element's id for undo/redo purposes
                if (currentElement && (currentElement === allElements[allElements.length - 1] || currentElement === pages[i + 1].children[1])) {
                    if (currentElement === pages[i + 1].children[1]) { lastCursorPosition += allElements[allElements.length - 1].textContent.length + 1 }
                    currentElement = allElements[allElements.length - 1]
                }
                allElements[allElements.length - 1].innerHTML += ` ${pages[i + 1].children[1].innerHTML}` // this doesn't work when there's a parenthetical in between
                dialogueContinued = true;
            } else {
                allElements.push(pages[i].children[j])
            }
        }
    }
    return [allElements, currentElement, lastCursorPosition];
}


/**
 * 
 * @param {HTMLElement} currentElement 
 * @param {HTMLElement} currentPage 
 */
function reformatScreenplay(currentElement, currentPage) {
    const lastScrollPosition = saveScrollPosition(currentElement);
    let lastCursorPosition = getCursorPosition(currentElement)
    // Fixing edge case of when currentElement doesn't exist after reformat, for split dialogue
    const currentPageI = getChildElementIndex(currentPage, scriptWrapper)
    const currentElementI = getChildElementIndex(currentElement, currentPage)
    // console.log(`DEBUG:\tLast cursor position -> ${lastCursorPosition}`)
    // console.log(`DEBUG:\tTextContent length -> ${currentElement.textContent.length}`)
    // console.log(`DEBUG:\tInnerHTML length -> ${currentElement.innerHTML.length}`)
    const [allElements, combinedCurrentElement, combinedLastCursorPosition] = getAllScreenplayElements(currentElement, lastCursorPosition);
    currentElement = combinedCurrentElement
    lastCursorPosition = combinedLastCursorPosition
    emptyElement(scriptWrapper)
    const [newPages, newCurrentElement, newLastCursorPosition] = paginateScreenplay(allElements, currentElement, lastCursorPosition)
    currentElement = newCurrentElement
    lastCursorPosition = newLastCursorPosition
    for (const newPage of newPages) {
        scriptWrapper.appendChild(newPage)
    }

    if (scriptWrapper.contains(currentElement)) {
        setCursorPosition(currentElement, lastCursorPosition)
        restoreScrollPosition(currentElement, lastScrollPosition)
    } else { // edge case where the element doesn't exit anymore, probably because it's been split between pages like for dialogue
        setCursorPosition(scriptWrapper.children[currentPageI].children[currentElementI], lastCursorPosition)
        restoreScrollPosition(scriptWrapper.children[currentPageI].children[currentElementI], lastScrollPosition)
    }
}

/**
 * 
 * @param {Node} node
 * @returns {[HTMLElement, HTMLElement]} 
 */
function getScriptElementAndCurrentPage(node) {
    let scriptEl = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
    if (scriptEl.tagName === "ARTICLE") {
        if (scriptEl.childElementCount <= 1 && !scriptWrapper.firstChild.firstChild) {
            newBlankScript(true)
            return [scriptWrapper.firstChild, scriptWrapper.firstChild.firstChild]
        } else {
            return [scriptWrapper.firstChild, scriptWrapper.firstChild.firstChild]
        }
    }
    else {
        while (!HTML_TAG_NAMES.includes(scriptEl.tagName.toLowerCase())) {
            scriptEl = scriptEl.parentElement
        }
        return [scriptEl, scriptEl.parentElement]
    };
}
/**
 * 
 * @param {HTMLElement} el 
 */
function switchLastFocusedElement(el) {
    if (lastFocusedElement) lastFocusedElement.classList.remove("lastFocused")
    lastFocusedElement = el;
    lastFocusedElement.classList.add("lastFocused")
}
/**
 * @param {KeyboardEvent} e 
 * @param {HTMLElement} el 
 * @param {HTMLElement} page 
 */
function handleArrowKeysUp(e, el, page) {
    if (lastFocusedElement !== el && lastFocusedElement.dataset && lastFocusedElement.dataset.suggestion) lastFocusedElement.dataset.suggestion = "";
    switchLastFocusedElement(el)
}

/**
 * @param {KeyboardEvent} event 
 */
function handleKeyDown(event) {
    event.stopPropagation();
    const [child, currentPage] = getScriptElementAndCurrentPage(document.getSelection().anchorNode)
    if (event.key === "Tab") handleTab(event, child, currentPage)
    else if ((event.ctrlKey && event.key !== "Control") || (event.metaKey && event.key !== "MetaKey")) handleShortCut(event, child, currentPage)
}
/**
 * @param {KeyboardEvent} event 
 */
function handleKeyUp(event) {
    event.stopPropagation();
    const [child, currentPage] = getScriptElementAndCurrentPage(document.getSelection().anchorNode)

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
    // console.log(event.inputType)
    // delete
    if (event.inputType === "insertParagraph") {
        const [child, currentPage] = getScriptElementAndCurrentPage(document.getSelection().anchorNode)
        handleEnterKey(event, child, currentPage)
    } else if (DELETE_INPUT_TYPES.includes(event.inputType)) {
        const [child, currentPage] = getScriptElementAndCurrentPage(document.getSelection().anchorNode)
        handleDeletion(event, child, currentPage)
    } else if (event.inputType === 'insertText' || event.inputType === 'insertFromPaste') {
        const [child, currentPage] = getScriptElementAndCurrentPage(document.getSelection().anchorNode)
        if (!(child === lastSnapshotElement && undoStack.singleAddLast && event.inputType === "insertText")) {
            undoStack.singleDeleteLast = false;
            lastSnapshotElement = child;
            undoStack.push();
            if (event.inputType === "insertText") {
                undoStack.singleAddLast = true;
            } else {
                undoStack.singleAddLast = false;
            }
        }
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

let lastAutocomplete = ""; // I'm not sure we need this, might just add more complexity than is needed
/**
 * Autocomplete for character names, headings, and transitions
 * @param {InputEvent} event 
 * @param {HTMLElement} currentEl 
 * @param {HTMLElement} currentPage 
 */
function handleAutocomplete(event, currentEl, currentPage) {
    if (!AUTOCOMPLETE_TAGS.includes(currentEl.tagName.toLowerCase())) return
    if (currentEl.dataset.suggestion) currentEl.dataset.suggestion = ""
    if (!currentEl.textContent) {
        if (!currentEl.firstChild) currentEl.appendChild(document.createElement('br'));
        return;
    }

    let res = ""
    switch (currentEl.tagName) {
        case "CHARACTER":
            if (EXTENSION_REGEX.test(currentEl.textContent)) [lastAutocomplete, res] = completeStringFromSet(currentEl.textContent.substring(currentEl.textContent.lastIndexOf('(')).trim(), DEFAULT_EXTENSIONS)
            else[lastAutocomplete, res] = completeStringFromSet(currentEl.textContent, characterSet)
            break;
        case "TRANSITION":
            [lastAutocomplete, res] = completeStringFromSet(currentEl.textContent, DEFAULT_TRANSITIONS)
            break;
        case "SCENEHEADING":
            if (SCENE_INTRO_REGEX.test(currentEl.textContent)) [lastAutocomplete, res] = completeStringFromSet(currentEl.textContent, DEFAULT_SCENE_INTROS)
            else if (TIME_OF_DAY_REGEX.test(currentEl.textContent)) [lastAutocomplete, res] = completeStringFromSet(currentEl.textContent.substring(currentEl.textContent.lastIndexOf('-') + 1).trim(), DEFAULT_TIMES_OF_DAY)
            break;
        default:
            break;
    }
    if (res) {
        currentEl.dataset.suggestion = res;
    }
}
/**
 * @param {InputEvent} event 
 */
function handleInput(event) {
    const [child, currentPage] = getScriptElementAndCurrentPage(document.getSelection().anchorNode)
    const range = document.createRange();
    range.selectNodeContents(child)
    let newLineCount = range.getClientRects().length;
    let lastCursorPosition = getCursorPosition(child)

    handleAutocomplete(event, child, currentPage);
    if (scriptWrapper.childElementCount <= 1 && !scriptWrapper.firstChild.firstChild) {// edge case where all elements are empty with <br>
        newBlankScript(true)
    } else {
        if ((lastElementLineCount != newLineCount && lastFocusedElement === child) || !lastFocusedElement) reformatScreenplay(child, currentPage)
        else if (DELETE_INPUT_TYPES.includes(event.inputType) && lastFocusedElement !== child) reformatScreenplay(child, currentPage)
    }

    switchLastFocusedElement(child);
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
 * @param {HTMLElement} el 
 */
function HTMLtoFDX(doc, el) {
    let paraEl = doc.createElement("Paragraph")
    const htmlTag = el.tagName.toLowerCase();
    paraEl.setAttribute("Type", tagToFDXType(htmlTag))
    const newTextEls = [];
    for (let [i, subNode] of el.childNodes.entries()) {
        let textEl = doc.createElement("Text")
        if (subNode.nodeType === 1) { // a span
            textEl.setAttribute("Style", [...subNode.classList].map(str => str.at(0).toUpperCase() + str.substring(1)).join('+'))
            for (let attr of ["AdornmentStyle", "Background", "Color", "Font", "RevisionID", "Size"]) {
                textEl.setAttribute(attr, scriptSettings[htmlTag][attr])
            }
        }
        textEl.textContent = subNode.textContent
        if (htmlTag === "parenthetical") {
            let startingParen = null;
            let endingParen = null;
            if (i === 0) {
                if (subNode.nodeType === 1) {
                    startingParen = doc.createElement("Text")
                    startingParen.textContent = '('
                    newTextEls.push(startingParen)
                } else {
                    textEl.textContent = `(${textEl.textContent}`
                }
            }
            if (i === subNode.childNodes.length - 1) {
                if (subNode.nodeType === 1) {
                    endingParen = doc.createElement("Text")
                    endingParen.textContent = ')'
                    newTextEls.push(endingParen)
                } else {
                    textEl.textContent = `${textEl.textContent})`
                }
            }
            if (startingParen) newTextEls.push(startingParen)
            newTextEls.push(textEl)
            if (endingParen) newTextEls.push(endingParen)
        } else {
            let maybeUserStyle = textEl.getAttribute("Style")
            /** @type {string | null} */
            let maybeSettingStyle = scriptSettings[htmlTag] ? scriptSettings[htmlTag].Style : null
            if (maybeUserStyle && maybeSettingStyle) {
                // FinalDraft handles styling by looking at its own settings EXCEPT when there are user defined styles as well
                if (maybeSettingStyle.includes(maybeUserStyle)) {
                    textEl.setAttribute("Style", maybeSettingStyle)
                } else {
                    textEl.setAttribute("Style", `${maybeUserStyle}+${maybeSettingStyle}`)
                }
            }
            newTextEls.push(textEl)
        }
    }

    for (let newEl of newTextEls) {
        doc.getElementsByTagName("Content")[0].appendChild(doc.createTextNode('      '))
        paraEl.appendChild(newEl)
        doc.getElementsByTagName("Content")[0].appendChild(doc.createTextNode('\n'))
    }
    doc.getElementsByTagName("Content")[0].appendChild(doc.createTextNode('    '))
    doc.getElementsByTagName("Content")[0].appendChild(paraEl)
    doc.getElementsByTagName("Content")[0].appendChild(doc.createTextNode('\n'))
}
/**
 * @param {Document} doc 
 * @param {string} char 
 */
function addCharacterToXML(doc, char) {
    let newCharEl = doc.createElement("Character")
    newCharEl.textContent = char;

    doc.getElementsByTagName("Characters")[0].appendChild(doc.createTextNode('      '))
    doc.getElementsByTagName("Characters")[0].appendChild(newCharEl)
    doc.getElementsByTagName("Characters")[0].appendChild(doc.createTextNode('\n'))
}

/**
 * @param {Event}
 */
function downloadFDX(event) {
    event.preventDefault();
    const button = event.target;
    try {

        const parser = new DOMParser()
        let newContentDoc = parser.parseFromString(`<Content>\n</Content>`, "application/xml")
        const [allElements, _, __] = getAllScreenplayElements();
        for (const el of allElements) {
            HTMLtoFDX(newContentDoc, el)
        }
        newContentDoc.getElementsByTagName("Content")[0].appendChild(newContentDoc.createTextNode('  '))

        let newCharactersEl = parser.parseFromString(`<Characters>\n</Characters>`, "application/xml")
        for (const character of characterSet) {
            addCharacterToXML(newCharactersEl, character)
        }
        newCharactersEl.getElementsByTagName("Characters")[0].appendChild(newCharactersEl.createTextNode('      '))

        let FDRoot = originalXML.getElementsByTagName("FinalDraft")[0];
        FDRoot.replaceChild(newContentDoc.getElementsByTagName("Content")[0], FDRoot.getElementsByTagName("Content")[0])
        FDRoot.getElementsByTagName("SmartType")[0].replaceChild(newCharactersEl.getElementsByTagName("Characters")[0], FDRoot.getElementsByTagName("SmartType")[0].getElementsByTagName("Characters")[0])


        const serializer = new XMLSerializer();
        const newXMLStr = serializer.serializeToString(originalXML)
        const blob = new Blob([newXMLStr], { type: "application/xml" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url;
        a.download = fileNameInput.value ? `${fileNameInput.value}.fdx` : `New Script.fdx`
        a.click()

        URL.revokeObjectURL(url);
    } catch (e) {
        console.error(e)
        alert("Something went wrong downloading to FDX")
    } finally {
        button.disabled = false;
    }

}
/**
 * @param {HTMLElement} el 
 */
function emptyElement(el) {
    while (el.firstChild) el.removeChild(el.firstChild)
}

async function loadBlankXMLDoc() {
    if (blankScriptXML === null) {
        fetch("BlankFD13.fdx")
            .then(res => res.text())
            .then(text => parseXMLString(text))
            .then(doc => { blankScriptXML = doc; originalXML = blankScriptXML; })
            .catch(e => console.warn(e))
    } else {
        originalXML = blankScriptXML
    }
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
            })
            .catch(e => console.warn(e))
    } else {
        scriptSettings = defaultScriptSettings
    }
}

/**
 * Loads or resets default settings, 
 * @param {boolean} preserveCurrentInfo
 */
function newBlankScript(preserveCurrentInfo = false) {
    if (!preserveCurrentInfo) {
        loadDefaultSettings().catch(e => console.warn(e));
        loadBlankXMLDoc().catch(e => console.warn(e))
        characterSet = new Set();
        undoStack = new UndoStack();
        fileNameInput.value = "New Script";
    }
    while (scriptWrapper.firstChild) {
        scriptWrapper.removeChild(scriptWrapper.firstChild)
    }

    let newSceneHeading = document.createElement("sceneheading")
    newSceneHeading.appendChild(document.createElement("br"))
    let newPage = document.createElement("div")
    newPage.classList.add("page")
    newPage.appendChild(newSceneHeading)
    scriptWrapper.appendChild(newPage)
    lastSnapshotElement = newSceneHeading
    switchLastFocusedElement(newSceneHeading);
    setCursorPosition(lastFocusedElement, 0)
}

function replaceXMLContent() { }
/**
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
 * Grabs the last screenplay innerHTML, script settings, original xml document, 
 * file name, character set, and undo stack from local storage.
 * @returns {[boolean, string|null, ElementSettings | null, Document |null, string | null, Set|null, UndoStack|null]}
 */
function tryGetLastScreenplay() {
    const lastScreenplay = localStorage.getItem(LAST_SCREENPLAY_KEY)
    const lastScriptSettings = localStorage.getItem(LAST_SCRIPT_SETTINGS_KEY)
    const lastOriginalXML = localStorage.getItem(LAST_XML_DOC_KEY)
    const lastFileName = localStorage.getItem(LAST_FILE_NAME_KEY)
    const lastCharSet = localStorage.getItem(LAST_CHARACTER_SET_KEY)
    const lastUndoStack = localStorage.getItem(LAST_UNDO_STACK_KEY)
    if (lastScreenplay) {
        const domParser = new DOMParser()
        const lastXMLDoc = domParser.parseFromString(lastOriginalXML, 'text/xml')
        const parseError = lastXMLDoc.querySelector('parseerror')
        if (parseError) {
            console.error("Failed to parse stored xml", parseError.textContent)
            lastXMLDoc === null;
        }
        return [true, lastScreenplay, JSON.parse(lastScriptSettings), lastXMLDoc, lastFileName, new Set(JSON.parse(lastCharSet)), JSON.parse(lastUndoStack)]
    } else {
        return [false, null, null, null, null]
    }
}

/**
 * @param {string} str 
 */
function addToCharacterSet(str) {
    if (!str) return;
    if (EXTENSION_REGEX.test(str)) str = str.substring(0, str.lastIndexOf('(')).trim();
    str = str.charAt(0).toUpperCase() + str.substring(1)
    characterSet.add(str)
}

/**
 * @param {HTMLElement} el 
 * @return {{x:number, y:number}}
 */
function getElementCoords(el) {
    const elStyles = window.getComputedStyle(el)
    return { x: el.offsetLeft + parseInt(elStyles.paddingLeft.substring(0, elStyles.paddingLeft.lastIndexOf('p'))), y: el.offsetTop + parseInt(elStyles.paddingTop.substring(0, elStyles.paddingTop.lastIndexOf('p'))) }
}

/**
 * 
 * @param {string} text 
 * @param {*} font 
 * @param {*} fontSize 
 * @param {*} maxWidth 
 * @returns 
 */
function wrapText(text, font, fontSize, maxWidth) {
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';

    for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const width = font.widthOfTextAtSize(testLine, fontSize);
        if (width > maxWidth && currentLine) {
            lines.push(currentLine);
            currentLine = word;
        } else {
            currentLine = testLine;
        }
    }
    if (currentLine) lines.push(currentLine);
    return lines;
}

const POINTS_PER_INCH = 72;
/**
 * 
 * @param {number} num 
 * @returns {number}
 */
function pxToPt(num) { return num * (POINTS_PER_INCH / PIXELS_PER_INCH) }

/**
 * @param {Event} e 
 */
async function downloadPDF(e) {
    e.preventDefault()
    // const LETTER_PAGE_WIDTH = 612;
    const LetterPageWidth = DEFAULT_PAGE_WIDTH * POINTS_PER_INCH;
    // const LETTER_PAGE_HEIGHT = 792;
    const LetterPageHeight = DEFAULT_PAGE_HEIGHT * POINTS_PER_INCH;
    const button = event.target;
    button.disabled = true; // simple guard against double-click while generating

    try {
        const pdfDoc = await PDFDocument.create();
        pdfDoc.registerFontkit(fontkit); // needed even for standard fonts in some pdf-lib versions; harmless either way

        // --- Load fonts once, up front ---
        const fonts = {
            regular: await pdfDoc.embedFont(StandardFonts.Courier),
            bold: await pdfDoc.embedFont(StandardFonts.CourierBold),
            italic: await pdfDoc.embedFont(StandardFonts.CourierOblique),
            boldItalic: await pdfDoc.embedFont(StandardFonts.CourierBoldOblique),
        };

        // --- Get your paginated document model ---
        // REPLACE with your actual accessor, e.g. documentModel.getPages()
        /** @type {HTMLCollectionOf<HTMLElement>} */
        const allPages = document.getElementsByClassName('page');
        let sceneCount = 1;
        // for (const pageData of allPages) {
        for (let i = 0; i < allPages.length; i++) {
            const pageData = allPages[i];
            const pdfPage = pdfDoc.addPage([LetterPageWidth, LetterPageHeight]);
            if (i > 0) {
                pdfPage.drawText(`${i + 1}.`, {
                    x: LetterPageWidth - POINTS_PER_INCH, //1in from right
                    y: LetterPageHeight - 0.5 * POINTS_PER_INCH, //.5in from top
                    size: 12,
                    font: fonts.regular,
                    color: rgb(0, 0, 0),
                });
            }
            for (const element of pageData.children) {
                const AllCapsElements = ["SCENEHEADING", "CHARACTER", "SHOT", "TRANSITION"]
                const elementStyles = window.getComputedStyle(element);
                const font = resolveFont(fonts, elementStyles);
                const color = rgb(0, 0, 0);
                const elCoords = getElementCoords(element)
                const fontSize = pxToPt(parseInt(elementStyles.fontSize.substring(0, elementStyles.fontSize.lastIndexOf('p'))));
                const textLines = wrapText(AllCapsElements.includes(element.tagName) ? element.textContent.toUpperCase() : element.textContent, font, fontSize, pxToPt(getElementMaxWidth(element)))
                elCoords.x = pxToPt(element.tagName === "TRANSITION" ? (DEFAULT_PAGE_WIDTH + DEFAULT_LEFT_MARGIN) * POINTS_PER_INCH - font.widthOfTextAtSize(element.textContent, fontSize) : elCoords.x)
                elCoords.y = pxToPt(elCoords.y)

                // Flip y: your model is top-left origin, PDF is bottom-left.
                // This assumes element.y is the text's TOP position; drawText wants baseline.
                // Rough baseline correction using font size — tune if text sits high/low vs your DOM render.
                const pdfY = LetterPageHeight - elCoords.y - fontSize;

                if (element.tagName === "SCENEHEADING") {
                    pdfPage.drawText(sceneCount.toString(), { x: .75 * POINTS_PER_INCH, y: pdfY, size: fontSize, font, color })
                    sceneCount++
                }

                for (const [i, line] of textLines.entries()) {
                    let newLine = line;
                    if (element.tagName === "PARENTHETICAL") {
                        if (i === 0) newLine = `(${newLine}`
                        if (i === textLines.length - 1) newLine += ')';
                    }
                    pdfPage.drawText(newLine, {
                        x: elCoords.x,
                        y: pdfY - (i * fontSize),
                        size: fontSize,
                        font,
                        color,
                    });
                }
                // if (element.type === 'text') {
                // } else if (element.type === 'rule') {
                //     // e.g. underline under scene heading, if you have any
                //     pdfPage.drawLine({
                //         start: { x: element.x1, y: PAGE_HEIGHT - element.y1 },
                //         end: { x: element.x2, y: PAGE_HEIGHT - element.y2 },
                //         thickness: element.thickness ?? 1,
                //         color,
                //     });
                // }
                // Add more element.type branches here (images, boxes) as needed.
            }
        }

        const pdfBytes = await pdfDoc.save();
        triggerDownload(pdfBytes, fileNameInput.value + '.pdf');

    } catch (err) {
        console.error('PDF export failed:', err);
        // Surface this to the user somehow — swallowing it silently will be confusing.
        alert('Something went wrong generating the PDF. Please try again.');
    } finally {
        button.disabled = false;
    }
    // alert("PDF Download not supported yet.")
}

document.getElementById("script-upload").addEventListener("change", handleFileInput)
scriptWrapper.addEventListener("keydown", handleKeyDown)
// scriptWrapper.addEventListener("focusout", handleFocusOut)
scriptWrapper.addEventListener("keyup", handleKeyUp)
scriptWrapper.addEventListener("input", handleInput)
scriptWrapper.addEventListener("beforeinput", handleBeforeInput)

document.getElementById("download-fdx").addEventListener("click", downloadFDX)
document.getElementById("download-pdf").addEventListener('click', downloadPDF)
document.getElementById("new-blank").addEventListener("click", (e) => { newBlankScript() })
window.addEventListener("visibilitychange", saveCurrentScreenplay)
window.addEventListener("load", (e) => {
    let [ok, lastScript, lastSettings, lastXMLDoc, lastFileName, lastCharacterSet, lastUndoStack] = tryGetLastScreenplay()
    if (ok) {
        scriptWrapper.innerHTML = lastScript ? lastScript : `<div class="page"><sceneheading><br></sceneheading></div>`

        if (lastSettings) scriptSettings = lastSettings
        else loadDefaultSettings();

        if (lastXMLDoc) originalXML = lastXMLDoc
        else loadBlankXMLDoc();

        fileNameInput.value = lastFileName ? lastFileName : "New Script"

        characterSet = lastCharacterSet ? lastCharacterSet : new Set();

        undoStack = lastUndoStack ? new UndoStack(lastUndoStack.limit, lastUndoStack.undo_, lastUndoStack.redo_, lastUndoStack.singleDeleteLast, lastUndoStack.singleAddLast, lastUndoStack.uid) : new UndoStack()

        const maybeLastFocused = document.getElementsByClassName("lastFocused")[0];
        if (maybeLastFocused) switchLastFocusedElement(maybeLastFocused)
        else switchLastFocusedElement(scriptWrapper.firstChild.firstChild)

        setCursorPosition(lastFocusedElement, 0)
        // TODO: restore scroll position as well
    } else {
        newBlankScript();
    }
})

// Fuck it, let's just ask Claude
/**
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

function setCursorPosition(element, position) {
    element.focus();

    const range = document.createRange();
    const selection = window.getSelection();

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
    } else if (element.textContent.length === 0) {
        range.setStart(element, 0);
        range.collapse(true);
    } else {
        range.selectNodeContents(element);
        range.collapse(false);
    }

    const applySelection = () => {
        selection.removeAllRanges();
        selection.addRange(range);
        switchLastFocusedElement(element)
    };

    // Firefox sometimes computes the selection correctly right after a
    // synchronous DOM mutation (insertBefore/extractContents) but skips
    // painting the caret until a repaint is forced — hence it "reappears"
    // on arrow-key press, which forces Firefox to redraw it. Deferring to
    // the next frame lets layout settle first so the caret actually paints.
    applySelection()
    // requestAnimationFrame(applySelection);
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
    // page.setAttribute("contenteditable", "true")
    page.classList.add(options.pageClassName);
    Object.assign(page.style, {
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
 * @param {HTMLElement} currentElement
 * @param {number} lastCursorPosition
 * @param {PaginationOptions} [options]
 * @returns {[HTMLElement[], HTMLElement, number]} Array of page container elements, populated and
 *   detached (not yet appended anywhere).
 */
function paginateScreenplay(elements, currentElement = null, lastCursorPosition = -1, options = {
    pageClassName: 'page',
    pageHeightIn: DEFAULT_PAGE_HEIGHT - DEFAULT_BOTTOM_MARGIN - DEFAULT_TOP_MARGIN,
    characterTagName: 'character',
    dialogueTagName: 'dialogue',
    moreText: '(MORE)',
    contdText: "(CONT'D)",
    minWordsBeforeSplit: 4,
    minWordsAfterSplit: 4,
    isKeepWithNext: null,
}) {
    const pageHeightPx = options.pageHeightIn * PIXELS_PER_INCH;

    // Pass 1: measure everything in ONE reflow.
    const heights = measureHeights(elements, options, pageHeightPx);

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
                const [split, newCurrentElement, newLastCursorPosition] = attemptSplitDialogue(el, lastCharacterEl, remaining, options, scratch, currentElement, lastCursorPosition);
                if (newCurrentElement) { currentElement = newCurrentElement; lastCursorPosition = newLastCursorPosition; }
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
                    // console.log(el)
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
    return [pageBuckets.map((els, i) => {
        const page = createPage(options);
        const frag = document.createDocumentFragment();
        els.forEach(el => frag.appendChild(el));
        page.appendChild(frag);
        return page;
    }), currentElement, lastCursorPosition];
}

function measureHeights(elements, options, maxPageHeightPx) {
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
    let currentPageHeight = 0;
    const heights = clones.map((c) => { // TODO: refine this so it proparly accounts for there not being top padding on the first element of a page
        let elementHeight = c.getBoundingClientRect().height
        currentPageHeight += elementHeight
        if (currentPageHeight > maxPageHeightPx) {
            const maybePadding = getComputedStyle(c).paddingTop
            elementHeight -= parseInt(maybePadding.substring(0, maybePadding.indexOf('p')))
            // if (c.tagName !== "DIALOGUE") {
            // }
            currentPageHeight = elementHeight
        }
        return elementHeight
    }); // one reflow serves all reads

    document.body.removeChild(sandbox);
    return heights;
}

/**
 * Attempts to split `dialogueEl` so the first part fits in `remainingHeightPx`.
 * Returns null if it can't be split cleanly (too little dialogue left before/after
 * the break, or not even minWordsBeforeSplit fits) — caller should then move the
 * whole character+dialogue pair to the next page instead.
 */
function attemptSplitDialogue(dialogueEl, characterEl, remainingHeightPx, options, scratch, currentElement, lastCursorPosition) {
    let newCurrentElement = false;
    const words = dialogueEl.textContent.trim().split(/\s+/);
    const { minWordsBeforeSplit: minBefore, minWordsAfterSplit: minAfter } = options;

    if (words.length < minBefore + minAfter) return [null, null, null];

    const continuedCue = createContinuedElement(options);
    const continuedHeight = measureOne(continuedCue, scratch);
    const budget = remainingHeightPx - continuedHeight;
    if (budget <= 0) return [null, null, null];

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

    if (best === -1) return [null, null, null]; // even minWordsBeforeSplit overflows the remaining space
    const firstPart = cloneWithText(dialogueEl, words.slice(0, best).join(' '));
    const secondPart = cloneWithText(dialogueEl, words.slice(best).join(' '));
    if (currentElement && currentElement === dialogueEl) {
        newCurrentElement = true;
        if (lastCursorPosition >= firstPart.textContent.length) {
            currentElement = secondPart
            lastCursorPosition -= firstPart.textContent.length + 1
        } else {
            currentElement = firstPart
        }
    }
    const nextPageCharacter = cloneWithText(
        characterEl,
        `${characterEl.textContent.trim()} ${options.contdText}`
    );
    if (newCurrentElement) {
        return [{ firstPart, continuedCue, nextPageCharacter, secondPart }, currentElement, lastCursorPosition];
    } else {
        return [{ firstPart, continuedCue, nextPageCharacter, secondPart }, null, null];
    }
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


/**
 * Rich text formatting toggler for contenteditable elements.
 * Formats are represented as <span class="bold|italics|underline">...</span>,
 * which can nest (e.g. bold inside italics) to support combined styles.
 */

const STYLE_CLASSES = { b: "bold", i: "italic", u: "underline" };

/**
 * @param {KeyboardEvent} event
 * @param {Element} editableRoot - the contenteditable host (e.g. your script-wrapper).
 *   Passed explicitly rather than derived from the selection, because a
 *   selection-derived boundary can accidentally collapse onto the exact
 *   style span you're trying to detect (see hasStyleAncestor below).
 */
function handleTextStyling(event, editableRoot) {
    const key = event.key.toLowerCase();

    event.preventDefault();
    toggleStyle(STYLE_CLASSES[key], editableRoot);
}

function toggleStyle(styleClass, editableRoot) {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    const range = selection.getRangeAt(0);
    if (range.collapsed) {
        toggleCaretStyle(styleClass);
    } else {
        toggleSelectionStyle(range, styleClass, selection, editableRoot);
    }
}

/* ---------------------------------------------------------------------- */
/* Collapsed selection (blinking caret, no text highlighted)              */
/* ---------------------------------------------------------------------- */

// You genuinely can't "style" zero characters. The standard approach
// (used by every real editor) is to track which styles should apply to
// the *next* typed characters, rather than trying to insert an empty
// styled element at the caret (which browsers tend to eat/normalize away).
const pendingStyles = new Set();

function toggleCaretStyle(styleClass) {
    const node = window.getSelection().anchorNode;
    const el = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
    const alreadyActive = !!el.closest(`.${styleClass}`);

    if (alreadyActive) pendingStyles.delete(styleClass);
    else pendingStyles.add(styleClass);
}

// Call this from your `input`/`beforeinput` handler when new text is typed
// at a caret. It wraps the freshly-inserted text node in spans for every
// class currently in pendingStyles.
function applyPendingStylesToNode(textNode) {
    if (!pendingStyles.size) return;
    let current = textNode;
    pendingStyles.forEach((styleClass) => {
        wrapNodeInStyle(current, styleClass);
        current = current; // still the same text node, now nested one level deeper
    });
}

/* ---------------------------------------------------------------------- */
/* Non-collapsed selection (actual highlighted text)                      */
/* ---------------------------------------------------------------------- */

function toggleSelectionStyle(range, styleClass, selection, editableRoot) {
    splitRangeBoundaries(range);
    const textNodes = getTextNodesInRange(range);
    if (!textNodes.length) return;

    // Use the actual editable host as the search boundary, not something
    // derived from range.commonAncestorContainer. If the whole selection sits
    // inside one style span, commonAncestorContainer IS that span, and a
    // boundary equal to it would stop hasStyleAncestor's walk before it ever
    // checks that span — making an already-styled selection look unstyled.
    const boundary = editableRoot;

    // Standard rich-text-editor rule: if the WHOLE selection already has the
    // style, toggling turns it off everywhere; otherwise toggling turns it
    // on everywhere (including the parts that already had it).
    const allStyled = textNodes.every((n) => hasStyleAncestor(n, styleClass, boundary));

    if (allStyled) {
        textNodes.forEach((n) => removeStyleFromNode(n, styleClass, boundary));
    } else {
        textNodes.forEach((n) => {
            if (!hasStyleAncestor(n, styleClass, boundary)) wrapNodeInStyle(n, styleClass);
        });
    }

    mergeAdjacentSpans(boundary, styleClass);
    reselectNodes(selection, textNodes);
}

// Splits the start/end text nodes of the range so the range's boundaries
// fall exactly on node boundaries. Without this, wrapping/unwrapping would
// grab characters outside what the user actually selected.
function splitRangeBoundaries(range) {
    const { startContainer, startOffset, endContainer, endOffset } = range;

    if (endContainer.nodeType === Node.TEXT_NODE && endOffset < endContainer.length) {
        endContainer.splitText(endOffset);
    }
    if (startContainer.nodeType === Node.TEXT_NODE && startOffset > 0) {
        const tail = startContainer.splitText(startOffset);
        if (startContainer === endContainer) {
            range.setEnd(tail, endOffset - startOffset);
        }
        range.setStart(tail, 0);
    }
}

function getTextNodesInRange(range) {
    // If the whole selection lives inside one text node, commonAncestorContainer
    // IS that text node — and a TreeWalker rooted on a text node can't walk into
    // it (text nodes have no children), so it would return nothing. Fall back
    // to the parent element in that case.
    const root =
        range.commonAncestorContainer.nodeType === Node.TEXT_NODE
            ? range.commonAncestorContainer.parentNode
            : range.commonAncestorContainer;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
        acceptNode: (node) =>
            range.intersectsNode(node) && node.textContent.length
                ? NodeFilter.FILTER_ACCEPT
                : NodeFilter.FILTER_REJECT,
    });
    const nodes = [];
    let n;
    while ((n = walker.nextNode())) nodes.push(n);
    return nodes;
}

function hasStyleAncestor(node, styleClass, boundary) {
    let el = node.parentElement;
    while (el && el !== boundary) {
        if (el.classList?.contains(styleClass)) return true;
        el = el.parentElement;
    }
    return false;
}

function wrapNodeInStyle(node, styleClass) {
    const span = document.createElement("span");
    span.className = styleClass;
    node.parentNode.insertBefore(span, node);
    span.appendChild(node);
}

// Removes styleClass from whichever ancestor span carries it, splitting
// that span into up-to-three pieces (before/target/after) so siblings
// outside the selection keep their formatting untouched.
function removeStyleFromNode(node, styleClass, boundary) {
    let el = node.parentElement;
    while (el && el !== boundary) {
        if (el.classList?.contains(styleClass)) {
            unwrapStyleFromChild(el, node, styleClass);
            return;
        }
        el = el.parentElement;
    }
}

function unwrapStyleFromChild(styledEl, targetNode, styleClass) {
    const parent = styledEl.parentNode;

    // find the direct child of styledEl that (contains) targetNode
    let child = targetNode;
    while (child.parentNode !== styledEl) child = child.parentNode;

    const children = Array.from(styledEl.childNodes);
    const idx = children.indexOf(child);
    const before = children.slice(0, idx);
    const after = children.slice(idx + 1);

    if (before.length) {
        const clone = styledEl.cloneNode(false);
        before.forEach((c) => clone.appendChild(c));
        parent.insertBefore(clone, styledEl);
    }

    if (styledEl.classList.length > 1) {
        // element carried other classes too (e.g. bold + something-else) — keep those
        const clone = styledEl.cloneNode(false);
        clone.classList.remove(styleClass);
        clone.appendChild(child);
        parent.insertBefore(clone, styledEl);
    } else {
        parent.insertBefore(child, styledEl);
    }

    if (after.length) {
        const clone = styledEl.cloneNode(false);
        after.forEach((c) => clone.appendChild(c));
        parent.insertBefore(clone, styledEl);
    }

    parent.removeChild(styledEl);
}

// Collapses runs of adjacent identical spans (e.g. two neighboring
// span.bold produced by the operations above) back into one.
//
// NOTE: deliberately does NOT call root.normalize() here. That would merge
// any adjacent plain text node siblings across the whole editable root —
// including nodes still referenced by textNodes[] in toggleSelectionStyle,
// which reselectNodes uses right after this runs. normalize() deletes the
// second of two merged nodes (detaching it) and grows the first node's
// length, either of which corrupts those references before reselection.
function mergeAdjacentSpans(root, styleClass) {
    let spans = root.querySelectorAll(`span.${styleClass}`);
    spans.forEach((span) => {
        let next = span.nextSibling;
        while (
            next &&
            next.nodeType === Node.ELEMENT_NODE &&
            next.classList.contains(styleClass) &&
            next.classList.length === span.classList.length
        ) {
            while (next.firstChild) span.appendChild(next.firstChild);
            const toRemove = next;
            next = next.nextSibling;
            toRemove.remove();
        }
    });
}

function reselectNodes(selection, textNodes) {
    if (!textNodes.length) return;
    const first = textNodes[0];
    const last = textNodes[textNodes.length - 1];
    const range = document.createRange();
    range.setStart(first, 0);
    range.setEnd(last, last.length);
    selection.removeAllRanges();
    selection.addRange(range);
}
/**
 * @param {{regular:any, bold:any, italic:any, boldItalic:any}} fonts 
 * @param {CSSStyleDeclaration} element 
 * @returns 
 */
function resolveFont(fonts, element) {
    const isBold = element.fontWeight === 'bold' || element.fontWeight >= 700;
    const isItalic = element.fontStyle === 'italic';
    if (isBold && isItalic) return fonts.boldItalic;
    if (isBold) return fonts.bold;
    if (isItalic) return fonts.italic;
    return fonts.regular;
}

function hexToRgb(hex) {
    const clean = hex.replace('#', '');
    const r = parseInt(clean.substring(0, 2), 16) / 255;
    const g = parseInt(clean.substring(2, 4), 16) / 255;
    const b = parseInt(clean.substring(4, 6), 16) / 255;
    return rgb(r, g, b);
}

function triggerDownload(bytes, filename) {
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}