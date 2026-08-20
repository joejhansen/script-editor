import { CHANNEL_NAME as BUDGET_CHANNEL } from "./windows/budget/budget.js";
import { saveCurrentScreenplay, tryGetLastScreenplay } from "./LocalStorage.js";
import {
    LoadElSettings, ALL_CAPS_ELEMENTS, AUTOCOMPLETE_TAGS, DEFAULT_EXTENSIONS,
    DEFAULT_LEFT_MARGIN_INCHES, DEFAULT_PAGE_HEIGHT_INCHES, DEFAULT_PAGE_WIDTH_INCHES, DEFAULT_RIGHT_MARGIN_INCHES, DEFAULT_SCENE_INTROS,
    DEFAULT_TIMES_OF_DAY, DEFAULT_TRANSITIONS, EXTENSION_REGEX, HTML_TAG_NAMES, PIXELS_PER_INCH,
    POINTS_PER_INCH, SCENE_INTRO_REGEX, TIME_OF_DAY_REGEX, VALID_FDX_TYPES,
    DEFAULT_FONT_SIZE_PIXELS,
    DEFAULT_FONT_SIZE_POINTS,
} from "./ScriptSettings.js";
import { UndoStack } from "./UndoStack.js";
import { XMLtoHTML, parseXMLFromFile, parseXMLString } from "./ScriptConversion.js";
import { saveScrollPosition, restoreScrollPosition, getCursorPosition } from "./UX.js";
import { paginateScreenplay } from "./Pagination.js";
import { handleTextStyling, STYLE_CLASSES } from "./InlineStyling.js";

const { PDFDocument, StandardFonts, rgb } = PDFLib
const { fontkit } = window.fontkit

const DELETE_INPUT_TYPES = ["deleteContentForward", "deleteContentBackward", "deleteWordForward", "deleteWordBackward", "deleteByCut"]
const ARROW_KEYS = ["ArrowDown", "ArrowUp", "ArrowRight", "ArrowLeft"]

/** Left, Center, and Right respectively */
const ALIGNMENT_SHORTCUT_KEYS = ["l", "e", "r"]
const ALIGNMENT_SHORTCUT_TO_RULE = ["left", "center", "right"]

const ScriptWrapper = document.getElementById("script-main");
const FileNameInput = document.getElementById("file-name")
const TitlePageButton = document.getElementById("title-page-toggle")
const CurrentPageTracker = document.getElementById("current-page")

/** @type {import("./ScriptSettings.js").ElementSettings | null} */
let defaultScriptSettings = null
/** @type {import("./ScriptSettings.js").ElementSettings | null} */
let scriptSettings = null
/** @type {Document | null} */
let blankScriptXML = null
/** @type {Document | null} */
let originalXML = null
/** @type {HTMLElement | null} */
let lastFocusedElement = null;
let lastElementLineCount = 1;
/** @type {HTMLElement | null} */
let lastSnapshotElement = null

/** @type {Set<string>} */
let characterSet = new Set();
let lastCharacterUsed = "";
let secondLastCharacterUsed = "";
let titlePageOuterHTML = "";
let editingTitlePage = false;
let scriptInnerHTML = "";

let undoStack = new UndoStack();

/**
 * @param {HTMLElement} el 
 * @returns {number}
 */
function getElementMaxWidth(el) {
    const elStyles = window.getComputedStyle(el)
    return (DEFAULT_PAGE_WIDTH_INCHES - DEFAULT_RIGHT_MARGIN_INCHES - DEFAULT_LEFT_MARGIN_INCHES) * PIXELS_PER_INCH - parseInt(elStyles.paddingLeft.substring(0, elStyles.paddingLeft.lastIndexOf('p'))) - parseInt(elStyles.paddingRight.substring(0, elStyles.paddingRight.lastIndexOf('p')))
}

/** @typedef {{textAlign:string, firstIndent:number, leading:string, leftIndent:number, rightindent:number, spaceBefore:number, spacing:number, startsNewPage:boolean}} TitleTextStyles */
/**
 * 
 * @param {HTMLElement} el 
 * @param {TitleTextStyles} styles 
 */
function assignTitleTextStyles(el, styles) {
    el.style.textAlign = styles.textAlign === "Full" ? "Left" : styles.textAlign;
    el.style.textIndent = styles.firstIndent.toString() + "in";
    el.style.paddingLeft = (1 - styles.leftIndent).toString() + "in";
    el.style.paddingRight = (1 + styles.rightindent - 8.5).toString() + "in";
    el.style.paddingTop = styles.spaceBefore.toString() + "in"
    el.style.lineHeight = styles.spacing.toString() + "rem"
    el.style.right = el.style.textAlign === "center" ? ".25in" : "0"
}

/**
 * @param {Element} para 
 * @returns {TitleTextStyles}
 */
function getTitleParagraphStyles(para) {
    return {
        textAlign: para.getAttribute("Alignment"),
        firstIndent: parseInt(para.getAttribute("FirstIndent")),
        leading: para.getAttribute("Leading"),
        leftIndent: parseInt(para.getAttribute("LeftIndent")),
        rightindent: parseInt(para.getAttribute("RightIndent")),
        spaceBefore: parseInt(para.getAttribute("SpaceBefore")),
        spacing: parseInt(para.getAttribute("Spacing")),
        startsNewPage: para.getAttribute("StartsNewPage") === "Yes" ? true : false,
    }
}

/**
 * 
 * @param {Document} doc 
 * @returns {HTMLElement[]}
 */
function loadTitlePage(doc) {
    const titleContent = doc.getElementsByTagName("TitlePage")[0].getElementsByTagName("Content")[0]
    let titleTexts = [];
    for (const titlePara of titleContent.children) {
        const paraStyle = getTitleParagraphStyles(titlePara)
        const newTitleText = document.createElement("titleText")
        assignTitleTextStyles(newTitleText, paraStyle)
        if (!titlePara.childElementCount) {
            newTitleText.appendChild(document.createElement("br"))
        } else {
            for (const textEl of titlePara.children) {
                if (textEl.textContent) {
                    newTitleText.textContent += textEl.textContent
                } else if (!newTitleText.textContent) {
                    newTitleText.appendChild(document.createElement("br"))
                }
            }
        }
        titleTexts.push(newTitleText)
    }
    const [titlePages, _, __] = paginateScreenplay(titleTexts)
    return titlePages
}

/**
 * @param {Event} event 
 */
function handleFileInput(event) { // globals
    event.preventDefault()
    /** @type {File} */
    const file = event.target.files?.[0]
    if (!file) console.warn("DEBUG:\t handleFileInput -> Something went wrong loading file")
    parseXMLFromFile(file).then(doc => {
        while (ScriptWrapper.firstChild) {
            ScriptWrapper.removeChild(ScriptWrapper.firstChild)
        }
        originalXML = doc;
        scriptSettings = LoadElSettings(doc)
        characterSet = getCharacterInfo(doc)
        titlePageOuterHTML = loadTitlePage(doc).map(e => e.outerHTML).join('')
        const [screenplayPages, _, __] = paginateScreenplay(XMLtoHTML(doc));
        for (const page of screenplayPages) {
            ScriptWrapper.appendChild(page);
        }
        FileNameInput.value = file.name.substring(0, file.name.length - 4)
        switchLastFocusedElement(ScriptWrapper.firstChild.firstChild)
        setCursorPosition(lastFocusedElement, 0)
        scriptInnerHTML = ScriptWrapper.innerHTML
        undoStack = new UndoStack()
        editingTitlePage = false;
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

/** @param {HTMLElement} el*/
function handleUnfocusCharacter(el) {
    setLastCharactersUsed(el.textContent);
    addToCharacterSet(el.textContent);
    el.textContent = el.textContent.at(0).toUpperCase() + el.textContent.substring(1)
}

/** @param {string} str */
function setLastCharactersUsed(str) { // globals
    if (str === lastCharacterUsed) return;
    secondLastCharacterUsed = lastCharacterUsed;
    lastCharacterUsed = str;
}

/**
 * TODO: Fix caret dissapearing on entering a new element on Firefox
 * @param {InputEvent} event 
 * @param {Element} el
 * @param {Element} currentPage
 */
function handleEnterKey(event, el, currentPage) { // globals
    event.preventDefault()
    undoStack.push(editingTitlePage, ScriptWrapper)


    const selection = window.getSelection()
    const cursorRange = selection.getRangeAt(0)

    const tailRange = document.createRange()
    tailRange.setStart(cursorRange.startContainer, cursorRange.startOffset)

    if (el.lastChild) tailRange.setEndAfter(el.lastChild)
    else tailRange.setEnd(el, el.childNodes.length)

    // Detach the live selection from `el` BEFORE mutating its DOM.
    // extractContents() below splits/removes nodes that el's current
    // selection is anchored into; leaving the selection live during that
    // mutation is what leaves Firefox's caret state broken afterward.
    // selection.removeAllRanges()

    const tailFragment = tailRange.extractContents()
    /** @type {HTMLElement} */
    let newElement = null;
    if (el.tagName === "TITLETEXT") {
        newElement = el.cloneNode(true)
        newElement.textContent = "";
    } else {
        newElement = newScriptElement(scriptSettings[el.tagName.toLowerCase()].ReturnKey.replace(/\s/g, "").toLowerCase())
    }
    newElement.innerHTML = ""
    newElement.appendChild(tailFragment)

    pruneEmptyInlineNodes(newElement)
    ensureLineHasContent(el)
    ensureLineHasContent(newElement)

    currentPage.insertBefore(newElement, el.nextSibling)
    if (currentPage.scrollHeight > PIXELS_PER_INCH * DEFAULT_PAGE_HEIGHT_INCHES) reformatScreenplay(el, currentPage, ScriptWrapper)
    setCursorPosition(newElement, 0)
    CurrentPageTracker.value = getChildElementIndex(newElement.parentElement, ScriptWrapper) + 1

    if (el.dataset.suggestion) el.dataset.suggestion = "";
    if (el.textContent && el.tagName === "CHARACTER") handleUnfocusCharacter(el)
    else if (el.textContent && ["SHOT", "TRANSITION", "SCENEHEADING"].includes(el.tagName)) el.textContent = el.textContent.toUpperCase();

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

// /**
//  * @param {Element} el Element to place cursor within
//  * @param {number} pos Position to set curose within element
//  */
// function setSelection(el, pos) {
//     el.focus()
//     const range = document.createRange()
//     const sel = window.getSelection()
//     range.setStart(el, pos)
//     range.collapse(true)
//     sel.removeAllRanges()
//     sel.addRange(range)
// }

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
function handleUndo(event) { // globals
    event.preventDefault();
    undoStack.undo(editingTitlePage, ScriptWrapper);
}

/**
 * @param {KeyboardEvent} event 
 */
function handleRedo(event) { // globals
    event.preventDefault();
    undoStack.redo(editingTitlePage, ScriptWrapper)
}

/**
 * 
 * @param {KeyboardEvent} e 
 * @param {HTMLElement} el 
 * @param {HTMLElement} page 
 */
function handleTitleAlignment(e, el, page) {
    e.preventDefault()
    el.style.textAlign = ALIGNMENT_SHORTCUT_TO_RULE.at(ALIGNMENT_SHORTCUT_KEYS.indexOf(e.key.toLowerCase()))
    if (el.style.textAlign === "center") el.style.right = ".25in"
    else el.style.right = "0"
}

// /**
//  * @param {Node[]} nodes 
//  * @param {Node[]}
//  */
// function mergeSiblingTextNodes(nodes) {
//     if (!nodes.length) return [];
//     let res = [nodes.shift()];
//     for (const node of nodes) {
//         if (node.parentElement === res[res.length - 1].parentElement) {
//             node.parentElement.removeChild(node)
//             res[res.length - 1].textContent += `${node.textContent}`
//         } else {
//             res.push(node)
//         }
//     }
//     return res;
// }

/**
 * @type {ClipboardEvent}
 */
function handleCopy(event) {
    const selection = document.getSelection();
    if (selection.isCollapsed) return;
    event.preventDefault();
    const clonedContents = selection.getRangeAt(0).cloneContents();
    let elList = Array.from(clonedContents.children).map(v => v.outerHTML);
    if (elList.length) {
        navigator.clipboard.write([new ClipboardItem({ ["text/plain"]: JSON.stringify(elList) })]).catch(e => console.error(e));
    } else {
        navigator.clipboard.write([new ClipboardItem({ ["text/plain"]: clonedContents.textContent })])
    }
}

/**
 * @type {ClipboardEvent}
 */
function handlePaste(event) { // globals
    event.preventDefault();
    const parser = new DOMParser()
    /** @type {HTMLElement[]} */
    let elementsToPaste = []
    navigator.clipboard.read().then((e) => {
        for (const clipped of e) {
            clipped.getType("text/plain")
                .then((v) => {
                    v.text()
                        .then((t) => {
                            const selection = document.getSelection();
                            undoStack.push(editingTitlePage, ScriptWrapper)
                            try {
                                elementsToPaste = JSON.parse(t)
                                    .map(v => parser.parseFromString(v, "text/html").getElementsByTagName("body")[0].children[0])
                                elementsToPaste.reverse();
                                for (let newEl of elementsToPaste) {
                                    selection.anchorNode.parentElement.insertAdjacentElement("afterend", newEl)
                                }
                            } catch (_) {
                                const nextPos = selection.anchorOffset + t.length
                                selection.anchorNode.textContent = selection.anchorNode.textContent.substring(0, selection.anchorOffset) + t + selection.anchorNode.textContent.substring(selection.anchorOffset)
                                selection.setPosition(selection.anchorNode, nextPos)
                            }
                        })
                        .catch(e => console.error(e))
                })
                .catch(e => console.error(e)) // holy shit
        }
    })

}

function handleCut(event) { // globals
    const selection = document.getSelection();
    if (selection.isCollapsed) return;
    event.preventDefault();
    undoStack.push(editingTitlePage, ScriptWrapper)
    const range = selection.getRangeAt(0);
    const previousPos = range.startOffset
    const startContainer = range.startContainer;
    const clonedContents = range.extractContents();
    let elList = Array.from(clonedContents.children).map(v => v.outerHTML);
    if (elList.length) {
        navigator.clipboard.write([new ClipboardItem({ ["text/plain"]: JSON.stringify(elList) })]).catch(e => console.error(e));
    } else {
        navigator.clipboard.write([new ClipboardItem({ ["text/plain"]: clonedContents.textContent })]).catch(e => console.error(e));
    }
    selection.setPosition(startContainer, previousPos)
}

/**
 * @param {KeyboardEvent} event 
 * @param {Element} el
 * @param {Element} currentPage
 */
function handleShortCut(event, el, currentPage) { // globals
    const key = event.key.toLowerCase();
    if (STYLE_CLASSES[key]) { undoStack.push(editingTitlePage, ScriptWrapper); handleTextStyling(event, ScriptWrapper) }
    else if (key === "o") { event.preventDefault(); document.getElementById("script-upload").click() }
    else if (key === "p") { event.preventDefault(); document.getElementById("download-pdf").click() }
    else if (key === "s") { event.preventDefault(); document.getElementById("download-fdx").click() }
    else if (key === "z") handleUndo(event);
    else if (key === "y") handleRedo(event);
    else if (editingTitlePage && ALIGNMENT_SHORTCUT_KEYS.includes(key)) handleTitleAlignment(event, el, currentPage)
    else if (!isNaN(parseInt(key))) {
        for (const setting in scriptSettings) {
            if (scriptSettings[setting].Shortcut === key) {
                event.preventDefault();
                undoStack.push(editingTitlePage, ScriptWrapper)
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
function handleTab(event, el, currentPage) { // globals
    event.preventDefault();
    undoStack.push(editingTitlePage, ScriptWrapper)
    if (el.dataset.suggestion) {
        el.textContent += el.dataset.suggestion
        el.dataset.suggestion = ""
        if (el.tagName === "CHARACTER") handleUnfocusCharacter(el)
        else el.textContent = el.textContent.toUpperCase()
        setCursorPosition(el, el.textContent.length)
        return;
    }

    if (el.tagName === "TITLETEXT") {
        let newTitleText = el.cloneNode(true)
        newTitleText.textContent = "";
        newTitleText.appendChild(document.createElement('br'))
        currentPage.insertBefore(newTitleText, el.nextSibling)
        setCursorPosition(newTitleText, 0)
        return
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
function handleDeletion(event, el, currentPage) { // globals
    const selection = document.getSelection();
    const range = selection.getRangeAt(0);

    // for ctrl+a -> delete/backspace
    const allSelected = range.startContainer === ScriptWrapper && range.startOffset === 0 &&
        range.endContainer === ScriptWrapper && range.endOffset === ScriptWrapper.childNodes.length;

    // for if trying to delete from the first position of first element, or if the document is completely blank
    const isFirstElement = el === ScriptWrapper.firstElementChild.firstElementChild;
    const cursorAtStart = range.startOffset === 0 || range.startOffset === 1;
    const nothingSelected = selection.isCollapsed;
    const elementIsEmpty = !el.textContent.trim();
    if (!(el === lastSnapshotElement && undoStack.singleDeleteLast && selection.isCollapsed)) {
        undoStack.singleAddLast = false;
        lastSnapshotElement = el;
        undoStack.push(editingTitlePage, ScriptWrapper);
        if (selection.isCollapsed && (event.inputType === "deleteContentBackward" || event.inputType === "deleteContentForward" || event.inputType === "deleteWordForward" || event.inputType === "deleteWordBackward")) {
            undoStack.singleDeleteLast = true;
        } else {
            undoStack.singleDeleteLast = false;
        }
    }

    if (isFirstElement && cursorAtStart && nothingSelected && elementIsEmpty && DELETE_INPUT_TYPES.includes(event.inputType)) {
        event.preventDefault()
    } else if (allSelected) {
        event.preventDefault();
        if (el.tagName === "TITLETEXT") {
            let newTitleText = currentPage.firstChild.cloneNode(true)
            newTitleText.textContent = ""
            newTitleText.appendChild(document.createElement("br"))
            let newTitlePage = document.createElement("div")
            newTitlePage.classList.add("page")
            emptyElement(ScriptWrapper)
            newTitlePage.appendChild(newTitleText)
            ScriptWrapper.appendChild(newTitlePage)
            switchLastFocusedElement(newTitleText)
            setCursorPosition(lastFocusedElement, 0)
        } else {
            newBlankScript(true);
        }
    }
}

/**
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
 * @param {HTMLElement} currentElement 
 * @returns {[HTMLElement[], HTMLElementEventMap, number]}
 */
function getAllScreenplayElements(currentElement = null, lastCursorPosition = -1) {
    let allElements = [];
    const pages = document.getElementsByClassName("page")
    let dialogueContinued = false;
    for (let i = 0; i < pages.length; i++) {
        for (let j = 0; j < pages[i].childElementCount; j++) {
            if (dialogueContinued) { dialogueContinued = false; continue; }
            else if (pages[i].children[j].dataset.more && pages[i + 1].children[0].tagName === "DIALOGUE") { // TODO: fix this erasing second element's id for undo/redo purposes
                pages[i].children[j].dataset.more = "";
                allElements.push(pages[i].children[j])
                if (currentElement && (currentElement === allElements[allElements.length - 1] || currentElement === pages[i + 1].children[0])) {
                    if (currentElement === pages[i + 1].children[0]) { lastCursorPosition += allElements[allElements.length - 1].textContent.length + 1 }
                    currentElement = allElements[allElements.length - 1]
                }
                allElements[allElements.length - 1].innerHTML += ` ${pages[i + 1].children[0].innerHTML}` // this doesn't work when there's a parenthetical in between
                dialogueContinued = true;
            } else {
                allElements.push(pages[i].children[j])
            }
        }
    }
    return [allElements, currentElement, lastCursorPosition];
}

/**
 * @param {HTMLElement} currentElement 
 * @param {HTMLElement} currentPage 
 */
function reformatScreenplay(currentElement, currentPage, scriptWrapper) {
    const lastScrollPosition = saveScrollPosition(scriptWrapper);
    let lastCursorPosition = getCursorPosition(currentElement)
    // Fixing edge case of when currentElement doesn't exist after reformat, for split dialogue
    // const currentPageI = getChildElementIndex(currentPage, scriptWrapper)
    // const currentElementI = getChildElementIndex(currentElement, currentPage)
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

    setCursorPosition(currentElement, lastCursorPosition)
    restoreScrollPosition(lastScrollPosition, scriptWrapper)
}

/**
 * @param {Node} node
 * @returns {[HTMLElement, HTMLElement]} A child script element and the page it exists within
 */
function getScriptElementAndCurrentPage(node) { // globals
    let scriptEl = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
    if (scriptEl.tagName === "ARTICLE") {
        if (scriptEl.childElementCount <= 1 && !ScriptWrapper.firstChild.firstChild) {
            newBlankScript(true)
            return [ScriptWrapper.firstChild.firstChild, ScriptWrapper.firstChild]
        } else {
            return [ScriptWrapper.firstChild.firstChild, ScriptWrapper.firstChild]
        }
    }
    else {
        while (!HTML_TAG_NAMES.includes(scriptEl.tagName.toLowerCase())) {
            scriptEl = scriptEl.parentElement
        }
        return [scriptEl, scriptEl.parentElement]
    };
}

function handleElementPickerUI(el) { // globals
    if (editingTitlePage) return;
    const changeElTopButton = document.getElementById("element-type-btn")
    if (el.tagName === changeElTopButton.textContent.replace(/\s/g, "").toUpperCase()) return
    const elTypeUl = document.getElementById("element-types").children[0]
    const newButtonToSlot = document.createElement("button")
    const newLi = document.createElement("li")
    newLi.appendChild(newButtonToSlot)
    newButtonToSlot.textContent = changeElTopButton.textContent;
    newButtonToSlot.dataset.order = changeElTopButton.dataset.order;
    changeElTopButton.textContent = tagToFDXType(el.tagName)
    let elToRemove = null;
    for (let elTypeLi of elTypeUl.children) {
        if (VALID_FDX_TYPES.indexOf(elTypeLi.children[0].textContent) > VALID_FDX_TYPES.indexOf(newButtonToSlot.textContent) && !newLi.parentElement) {
            elTypeLi.parentElement.insertBefore(newLi, elTypeLi)
        }
        if (elTypeLi.children[0].textContent === tagToFDXType(el.tagName)) {
            elToRemove = elTypeLi
        }
    }
    if (!newLi.parentElement) {
        elTypeUl.appendChild(newLi)
    }
    elTypeUl.removeChild(elToRemove)
}

/**
 * @param {HTMLElement} el 
 */
function switchLastFocusedElement(el) { // globals
    if (lastFocusedElement) lastFocusedElement.classList.remove("lastFocused")
    lastFocusedElement = el;
    lastFocusedElement.classList.add("lastFocused")
    handleElementPickerUI(el);
}

/**
 * @param {KeyboardEvent} e 
 * @param {HTMLElement} el 
 * @param {HTMLElement} page 
 */
function handleArrowKeysUp(e, el, page) { // globals
    if (lastFocusedElement !== el && lastFocusedElement.dataset && lastFocusedElement.dataset.suggestion) {
        lastFocusedElement.dataset.suggestion = "";
        if (lastFocusedElement.textContent && lastFocusedElement === "CHARACTER") handleUnfocusCharacter(lastFocusedElement)
    }
    if (el !== lastFocusedElement) switchLastFocusedElement(el)
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
function handleKeyUp(event) { // globals
    event.stopPropagation();
    const [child, currentPage] = getScriptElementAndCurrentPage(document.getSelection().anchorNode)
    CurrentPageTracker.value = getChildElementIndex(currentPage, ScriptWrapper) + 1
    if (ARROW_KEYS.includes(event.key)) handleArrowKeysUp(event, child, currentPage)
}

// /**
//  * @param {FocusEvent} event 
//  */
// function handleFocusOut(event) {
//     event.stopPropagation();
//     const thisNode = document.getSelection().anchorNode;
//     const child = thisNode.nodeType === Node.TEXT_NODE ? thisNode.parentElement : thisNode;
//     const currentPage = child.parentElement;

// }

/**
 * @param {InputEvent} event 
 */
function handleBeforeInput(event) { // globals
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
            undoStack.push(editingTitlePage, ScriptWrapper);
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
function handleAutocomplete(event, currentEl, currentPage) { // globals
    if (!AUTOCOMPLETE_TAGS.includes(currentEl.tagName.toLowerCase())) return
    if (currentEl.dataset.suggestion) currentEl.dataset.suggestion = ""
    if (!currentEl.textContent) {
        if (currentEl.tagName === "CHARACTER") currentEl.dataset.suggestion = secondLastCharacterUsed;
        else if (!currentEl.firstChild) currentEl.appendChild(document.createElement('br'));
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
function handleInput(event) { // globals
    const [child, currentPage] = getScriptElementAndCurrentPage(document.getSelection().anchorNode)
    const range = document.createRange();
    range.selectNodeContents(child)
    let newLineCount = range.getClientRects().length;
    let lastCursorPosition = getCursorPosition(child)

    handleAutocomplete(event, child, currentPage);
    if (ScriptWrapper.childElementCount <= 1 && !ScriptWrapper.firstChild.firstChild) {// edge case where all elements are empty with <br>
        newBlankScript(true)
    } else {
        if ((lastElementLineCount != newLineCount && lastFocusedElement === child) || !lastFocusedElement) reformatScreenplay(child, currentPage, ScriptWrapper)
        else if (DELETE_INPUT_TYPES.includes(event.inputType) && lastFocusedElement !== child) reformatScreenplay(child, currentPage, ScriptWrapper)
    }

    switchLastFocusedElement(child);
    lastElementLineCount = newLineCount

}

/**
 * @param {string} tagStr 
 * @returns {string}
 */
function tagToFDXType(tagStr) {
    return VALID_FDX_TYPES.at(HTML_TAG_NAMES.indexOf(tagStr.toLowerCase()))
}

/**
 * @param {Document} doc
 * @param {HTMLElement} el 
 */
function HTMLtoFDX(doc, el) { // globals
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
 * 
 * @param {Document} doc 
 * @param {HTMLCollectionOf<HTMLElement>} textEls 
 */
function addTitlePageToXML(doc, textEls) {
    for (const textEl of textEls) {
        let newPara = doc.createElement("Paragraph")
        const textElStyles = window.getComputedStyle(textEl)
        newPara.setAttribute("Alignment", textElStyles.textAlign.at(0).toUpperCase() + textElStyles.textAlign.substring(1))
        newPara.setAttribute("FirstIndent", parseInt(textElStyles.textIndent.substring(0, textElStyles.textIndent.lastIndexOf('p'))) / PIXELS_PER_INCH)
        newPara.setAttribute("Leading", "Regular")
        newPara.setAttribute("LeftIndent", 1 + parseInt(textElStyles.paddingLeft.substring(0, textElStyles.paddingLeft.lastIndexOf('p'))) / PIXELS_PER_INCH)
        newPara.setAttribute("RightIndent", 7.5 - parseInt(textElStyles.paddingRight.substring(0, textElStyles.paddingRight.lastIndexOf('p'))) / PIXELS_PER_INCH)
        newPara.setAttribute("SpaceBefore", parseInt(textElStyles.paddingTop.substring(0, textElStyles.paddingTop.lastIndexOf('p'))) / PIXELS_PER_INCH)
        newPara.setAttribute("Spacing", parseInt(textElStyles.lineHeight.substring(0, textElStyles.lineHeight.lastIndexOf('p'))) / DEFAULT_FONT_SIZE_PIXELS)
        newPara.setAttribute("StartsNewPage", "No")
        let newTextEl = doc.createElement("Text")
        newTextEl.textContent = textEl.textContent
        newPara.appendChild(newTextEl)
        doc.getElementsByTagName("Content")[0].appendChild(doc.createTextNode('      '))
        doc.getElementsByTagName("Content")[0].appendChild(newPara)
        doc.getElementsByTagName("Content")[0].appendChild(doc.createTextNode('\n'))
    }
    doc.getElementsByTagName("Content")[0].appendChild(doc.createTextNode('    '))
}

/**
 * @param {Event}
 */
function downloadFDX(event) { // globals
    event.preventDefault();
    const button = event.target;
    try {

        const parser = new DOMParser()

        if (!editingTitlePage) TitlePageButton.click();
        let newTitlePageContent = parser.parseFromString(`<Content>\n</Content>`, "application/xml")
        addTitlePageToXML(newTitlePageContent, document.getElementsByTagName("titletext"))
        TitlePageButton.click();

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
        FDRoot.getElementsByTagName("TitlePage")[0].replaceChild(newTitlePageContent.getElementsByTagName("Content")[0], FDRoot.getElementsByTagName("TitlePage")[0].getElementsByTagName("Content")[0])
        FDRoot.replaceChild(newContentDoc.getElementsByTagName("Content")[0], FDRoot.getElementsByTagName("Content")[0])
        FDRoot.getElementsByTagName("SmartType")[0].replaceChild(newCharactersEl.getElementsByTagName("Characters")[0], FDRoot.getElementsByTagName("SmartType")[0].getElementsByTagName("Characters")[0])


        const serializer = new XMLSerializer();
        const newXMLStr = serializer.serializeToString(originalXML)
        const blob = new Blob([newXMLStr], { type: "application/xml" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url;
        a.download = FileNameInput.value ? `${FileNameInput.value}.fdx` : `New Script.fdx`
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

async function loadBlankXMLDoc() { // globals
    if (blankScriptXML === null) {
        fetch("BlankFD13.fdx")
            .then(res => res.text())
            .then(text => parseXMLString(text))
            .then(doc => { blankScriptXML = doc; originalXML = blankScriptXML; titlePageOuterHTML = loadTitlePage(originalXML).map(e => e.outerHTML).join('') })
            .catch(e => console.warn(e))
    } else {
        originalXML = blankScriptXML
        titlePageOuterHTML = loadTitlePage(originalXML).map(e => e.outerHTML).join('')
    }
}

async function loadDefaultSettings() { // globals
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
function newBlankScript(preserveCurrentInfo = false) { // globals
    if (!preserveCurrentInfo) {
        loadDefaultSettings().catch(e => console.warn(e));
        loadBlankXMLDoc().catch(e => console.warn(e))
        characterSet = new Set();
        undoStack = new UndoStack();
        FileNameInput.value = "New Script";
    }
    while (ScriptWrapper.firstChild) {
        ScriptWrapper.removeChild(ScriptWrapper.firstChild)
    }
    let newSceneHeading = document.createElement("sceneheading")
    newSceneHeading.appendChild(document.createElement("br"))
    let newPage = document.createElement("div")
    newPage.classList.add("page")
    newPage.appendChild(newSceneHeading)
    ScriptWrapper.appendChild(newPage)
    lastSnapshotElement = newSceneHeading
    switchLastFocusedElement(newSceneHeading);
    setCursorPosition(lastFocusedElement, 0)
    editingTitlePage = false;
}

/** @typedef {Object.<string,CharacterTrait[]} CharacterTraits*/

/**
 * @typedef {Object} CharacterTrait
 * @property {string} name
 * @property {string} type
 * @property {string} traitID
 * @property {string} valueID
 * @property {string} value
 */
/**
 * @param {Document} doc
 * @returns {CharacterTraits}
 */
function getCharacterTraits(doc) {
    const TraitData = doc.getElementsByTagName("CharacterTraitData")[0]
    const Traits = TraitData.getElementsByTagName("Traits")[0]
    const TraitHolders = TraitData.getElementsByTagName("Holders")[0]
    /** @type {CharacterTraits} */
    let res = {};
    for (const Holder of TraitHolders.children) {
        const HolderName = Holder.getAttribute("Name")
        const HolderIDs = Array.from(Holder.getElementsByTagName("Attribute")).map(el => el.getAttribute("ID"))
        /** @type {CharacterTrait[]} */
        let newTraits = []
        for (const Trait of Traits.children) {
            const MaybeAttribute = Array.from(Trait.getElementsByTagName("Attribute")).find(el => HolderIDs.includes(el.getAttribute("ID")))
            if (MaybeAttribute) {
                newTraits.push({
                    name: Trait.getAttribute("Name"),
                    traitID: Trait.getAttribute("ID"),
                    type: Trait.getAttribute("Type"),
                    value: MaybeAttribute.textContent,
                    valueID: MaybeAttribute.getAttribute("ID")
                })
            }
        }
        res[HolderName] = newTraits;
    }
    return res;
}
/**
 * @param {Document} doc
 * @param {CharacterTraits} traits 
 * @returns {Element}
 */
function characterTraitsToXML(doc, traits) {
    const TraitDataEl = doc.createElement("CharacterTraitData")
    const TraitsEl = doc.createElement("Traits")
    const HoldersEl = doc.createElement("Holders")
    /** @type {Object.<string, Element>} */
    let traitMemo = {};
    for (const [HolderName, Traits] of Object.entries(traits)) {
        const NewHolderEl = doc.createElement("Holder")
        NewHolderEl.setAttribute("Name", HolderName)
        NewHolderEl.appendChild(doc.createElement("Attributes"))
        for (const Trait of Traits) {
            const NewHolderAttributeEl = doc.createElement("Attribute")
            NewHolderAttributeEl.setAttribute("ID", Trait.valueID)
            NewHolderEl.firstChild.appendChild(NewHolderAttributeEl)

            const NewAttributeEl = doc.createElement("Attribute")
            NewAttributeEl.setAttribute("ID", Trait.valueID)
            NewAttributeEl.textContent = Trait.value
            if (!traitMemo[Trait.name]) {
                const NewTrait = doc.createElement("Trait")
                NewTrait.setAttribute("ID", Trait.traitID)
                NewTrait.setAttribute("Name", Trait.name)
                NewTrait.setAttribute("Type", Trait.type)
                NewTrait.appendChild(doc.createElement("Attributes"))
                traitMemo[Trait.name] = NewTrait
            }
            traitMemo[Trait.name].firstChild.appendChild(NewAttributeEl)
        }
        HoldersEl.appendChild(NewHolderEl)
    }
    TraitsEl.append(...Object.values(traitMemo))
    TraitDataEl.appendChild(TraitsEl)
    TraitDataEl.appendChild(HoldersEl)
    return TraitDataEl
}

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
 * @param {string} str 
 */
function addToCharacterSet(str) { // globals
    if (!str) return;
    if (EXTENSION_REGEX.test(str)) str = str.substring(0, str.lastIndexOf('(')).trim();
    str = str.charAt(0).toUpperCase() + str.substring(1)
    characterSet.add(str)
}

/**
 * @param {HTMLElement} el 
 * @return {{x:number, y:number}}
 */
function getElementCoords(el, font) {
    const elStyles = window.getComputedStyle(el)
    let xVal = el.offsetLeft;
    if ((el.tagName === "TITLETEXT" || el.tagName === "ENDOFACT" || el.tagName === "NEWACT") && el.textContent) {
        const width = font.widthOfTextAtSize(el.textContent, DEFAULT_FONT_SIZE_PIXELS);
        if (elStyles.textAlign === "center") {
            xVal = (DEFAULT_PAGE_WIDTH_INCHES * PIXELS_PER_INCH / 2 - width / 2)
        }
        else if (elStyles.textAlign === "right") {
            xVal = (DEFAULT_PAGE_WIDTH_INCHES - 1) * PIXELS_PER_INCH - width
        }
    } else {
        xVal += parseInt(elStyles.paddingLeft.substring(0, elStyles.paddingLeft.lastIndexOf('p')))
    }
    return { x: xVal, y: el.offsetTop + parseInt(elStyles.paddingTop.substring(0, elStyles.paddingTop.lastIndexOf('p'))) }
}

/**
 * @param {string} text 
 * @param {*} font 
 * @param {*} fontSize 
 * @param {*} maxWidth 
 * @returns {[string[],number]}
 */
function wrapText(text, font, fontSize, maxWidth, firstLineX) {
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';
    let currentWidth = 0;
    for (const word of words) {
        let lineWidth = maxWidth;
        if (!lines.length) lineWidth = maxWidth - firstLineX
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        currentWidth = font.widthOfTextAtSize(testLine, fontSize);
        if (currentWidth > lineWidth && currentLine) {
            lines.push(currentLine);
            currentLine = word;
        } else {
            currentLine = testLine;
        }
    }
    if (currentLine) lines.push(currentLine);
    return [lines, currentWidth];
}

/**
 * 
 * @param {number} num 
 * @returns {number}
 */
function pxToPt(num) { return num * (POINTS_PER_INCH / PIXELS_PER_INCH) }

/**
 * 
 * @param {HTMLElement} element 
 * @returns {Node[]}
 */
function getContainedTextNodes(element) {
    let res = [];
    let nodesToGo = [element];
    while (nodesToGo.length) {
        let newNode = nodesToGo.shift();
        if (newNode.nodeType === Node.TEXT_NODE) res.push(newNode)
        else nodesToGo = [...newNode.childNodes, ...nodesToGo]
    }
    return res;
}
const ITALICS_MASK = 0b100;
const BOLD_MASK = 0b010;
const UNDERLINE_MASK = 0b001;
/**
 * @param {Node} textNode 
 * @returns {number}
 */
function getTextNodeStyles(textNode) {
    let res = 0b000;
    let currentParent = textNode.parentElement;
    while (currentParent && currentParent.tagName.toLowerCase() !== "article") {
        let computedStyles = window.getComputedStyle(currentParent)
        if (currentParent.classList.contains("italic")) res = res | ITALICS_MASK
        if (currentParent.classList.contains("bold") || computedStyles.fontWeight === "700") res = res | BOLD_MASK
        if (currentParent.classList.contains("underline") || computedStyles.textDecoration === "underline") res = res | UNDERLINE_MASK
        currentParent = currentParent.parentElement
    }
    return res;
}

/**
 * @param {HTMLElement[]} allPages 
 * @param {*} pdfDoc 
 * @param {number} LetterPageWidth 
 * @param {number} LetterPageHeight 
 * @param {{regular:any,bold:any,italic:any,boldItalic:any}} fonts 
 * @param {number} sceneCount 
 */
function addPagesToDoc(allPages, pdfDoc, LetterPageWidth, LetterPageHeight, fonts, sceneCount) {
    let lastUsedCharacter = "";
    let dialogueContinued = false;
    for (let i = 0; i < allPages.length; i++) {
        const pageData = allPages[i];
        const pdfPage = pdfDoc.addPage([LetterPageWidth, LetterPageHeight]);
        if (i > 0) {
            pdfPage.drawText(`${i + 1}.`, {
                x: LetterPageWidth - POINTS_PER_INCH, //1in from right
                y: LetterPageHeight - 0.5 * POINTS_PER_INCH, //.5in from top
                size: DEFAULT_FONT_SIZE_POINTS,
                font: fonts.regular,
                color: rgb(0, 0, 0),
            });
        }
        for (const element of pageData.children) {
            if (element.tagName === "CHARACTER") lastUsedCharacter = element.textContent
            const elementStyles = window.getComputedStyle(element);
            const initialFont = resolveFont(fonts, elementStyles);
            const fontSize = DEFAULT_FONT_SIZE_POINTS | pxToPt(parseInt(elementStyles.fontSize.substring(0, elementStyles.fontSize.lastIndexOf('p'))));
            const elCoords = getElementCoords(element, initialFont)
            elCoords.x = pxToPt(element.tagName === "TRANSITION"
                ? (DEFAULT_PAGE_WIDTH_INCHES + DEFAULT_LEFT_MARGIN_INCHES) * POINTS_PER_INCH - initialFont.widthOfTextAtSize(element.textContent, fontSize)
                : elCoords.x)
            elCoords.y = pxToPt(elCoords.y)

            let lineX = elCoords.x;
            let lineY = LetterPageHeight - elCoords.y - fontSize;
            let textNodes = getContainedTextNodes(element)
            const color = rgb(0, 0, 0);
            for (const textNode of textNodes) { // so fucking close
                const styleMask = getTextNodeStyles(textNode)
                if (element.tagName === "NEWACT") console.log(styleMask)
                let thisFont = initialFont
                if ((styleMask & ITALICS_MASK) !== 0 && (styleMask & BOLD_MASK) !== 0) { thisFont = fonts.boldItalic; }
                else if ((styleMask & ITALICS_MASK) !== 0) { thisFont = fonts.italic; }
                else if ((styleMask & BOLD_MASK) !== 0) { thisFont = fonts.bold; }
                let thisColor = rgb(0, 0, 0)
                let [nodeLines, nodeLastLineWidth] = wrapText(
                    ALL_CAPS_ELEMENTS.includes(element.tagName)
                        ? textNode.data.toUpperCase()
                        : textNode.data,
                    thisFont,
                    fontSize,
                    pxToPt(getElementMaxWidth(element)),
                    element.tagName === "TRANSITION" ? 0 : lineX - DEFAULT_LEFT_MARGIN_INCHES * POINTS_PER_INCH - pxToPt(elementStyles.paddingLeft ? parseInt(elementStyles.paddingLeft.substring(0, elementStyles.paddingLeft.lastIndexOf("p")
                    )) : 0)
                )
                // const pdfLineY = LetterPageHeight - lineY - fontSize
                for (const [i, nodeLine] of nodeLines.entries()) {
                    if (!nodeLine) continue;
                    let newLine = nodeLine;
                    if (element.tagName === "PARENTHETICAL") {
                        if (i === 0) newLine = `(${newLine}`
                        if (i === nodeLines.length - 1) newLine += ')';
                    }
                    if (i) {
                        lineY -= fontSize
                        lineX = elCoords.x
                        if (element.tagName === "PARENTHETICAL") lineX += thisFont.widthOfTextAtSize(" ", fontSize)
                    } else if (textNode.data.at(0) === " ") { // if it's not truthy, it must be the first line aka i = 0
                        lineX += thisFont.widthOfTextAtSize(" ", fontSize)
                    }
                    pdfPage.drawText(newLine, {
                        x: lineX,
                        y: lineY,
                        size: fontSize,
                        font: thisFont,
                        color,
                    });
                    if ((styleMask & UNDERLINE_MASK) !== 0) {
                        pdfPage.drawLine({
                            start: { x: lineX, y: lineY - 2 },
                            end: {
                                x: lineX + thisFont.widthOfTextAtSize(newLine, fontSize),
                                y: lineY - 2
                            },
                            thickness: 1,
                            color: color,
                        })
                    }
                }
                lineX += nodeLastLineWidth
            }
            const pdfY = LetterPageHeight - elCoords.y - fontSize;

            if (element.tagName === "SCENEHEADING") {
                pdfPage.drawText(sceneCount.toString(), { x: .75 * POINTS_PER_INCH, y: pdfY, size: fontSize, font: initialFont, color })
                pdfPage.drawText(sceneCount.toString(), { x: LetterPageWidth - POINTS_PER_INCH, y: pdfY, size: fontSize, font: initialFont, color })
                sceneCount++
            } else if (element.dataset.more) {
                pdfPage.drawText("(MORE)", { x: 3.5 * POINTS_PER_INCH, y: lineY - fontSize, size: fontSize, font: initialFont, color })
                dialogueContinued = true;
            } else if (dialogueContinued) {
                dialogueContinued = false;
                pdfPage.drawText(`${lastUsedCharacter} (CONT'D)`, { x: 3.5 * POINTS_PER_INCH, y: LetterPageHeight - elCoords.y, size: fontSize, font: initialFont, color })
            }
        }
    }
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
/**
 * @param {Event} e 
 */
async function downloadPDF(e) { // globals
    e.preventDefault()
    const LetterPageWidth = DEFAULT_PAGE_WIDTH_INCHES * POINTS_PER_INCH;
    const LetterPageHeight = DEFAULT_PAGE_HEIGHT_INCHES * POINTS_PER_INCH;
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
        let sceneCount = 1;
        if (!editingTitlePage) {
            TitlePageButton.click()
        }
        addPagesToDoc(document.getElementsByClassName("page"), pdfDoc, LetterPageWidth, LetterPageHeight, fonts, sceneCount)
        TitlePageButton.click()
        addPagesToDoc(document.getElementsByClassName('page'), pdfDoc, LetterPageWidth, LetterPageHeight, fonts, sceneCount)
        const pdfBytes = await pdfDoc.save();
        triggerDownload(pdfBytes, FileNameInput.value + '.pdf');

    } catch (err) {
        console.error('PDF export failed:', err);
        // Surface this to the user somehow — swallowing it silently will be confusing.
        alert('Something went wrong generating the PDF. Please try again.');
    } finally {
        button.disabled = false;
    }
}

/**
 * @param {Event} e 
 */
function handleOnClick(e) {
    const [el, currentPage] = getScriptElementAndCurrentPage(document.getSelection().anchorNode)
    CurrentPageTracker.value = getChildElementIndex(currentPage, ScriptWrapper) + 1
    switchLastFocusedElement(el)
}

// function hexToRgb(hex) {
//     const clean = hex.replace('#', '');
//     const r = parseInt(clean.substring(0, 2), 16) / 255;
//     const g = parseInt(clean.substring(2, 4), 16) / 255;
//     const b = parseInt(clean.substring(4, 6), 16) / 255;
//     return rgb(r, g, b);
// }

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
/**
 * 
 * @param {Event} e 
 */
function toggleEditTitlePage(e) { // globals
    e.preventDefault();
    if (editingTitlePage) {
        titlePageOuterHTML = ScriptWrapper.innerHTML
        ScriptWrapper.innerHTML = scriptInnerHTML;
        TitlePageButton.textContent = "Edit Title Page"
    } else {
        scriptInnerHTML = ScriptWrapper.innerHTML
        ScriptWrapper.innerHTML = titlePageOuterHTML
        TitlePageButton.textContent = "Edit Script"
    }
    editingTitlePage = !editingTitlePage;
}
function removeUndoIDs() { // globals
    for (let page of ScriptWrapper.children) {
        for (let el of page.children) {
            el.removeAttribute("id")
        }
    }
}
/**
 * @param {Event} e 
 */
function handleOnLoad(e) { // globals
    document.getElementsByClassName("option-menu")[0].showPopover()

    let [ok, lastScript, lastSettings, lastXMLDoc, lastFileName, lastCharacterSet, lastScrollPosition, lastCursorPosition, lastTitlePage] = tryGetLastScreenplay()
    if (ok) {
        ScriptWrapper.innerHTML = lastScript ? lastScript : `<div class="page"><sceneheading><br></sceneheading></div>`
        titlePageOuterHTML = lastTitlePage
        if (lastSettings) scriptSettings = lastSettings
        else loadDefaultSettings();

        if (lastXMLDoc) originalXML = lastXMLDoc
        else loadBlankXMLDoc();

        FileNameInput.value = lastFileName ? lastFileName : "New Script"

        characterSet = lastCharacterSet ? lastCharacterSet : new Set();

        const maybeLastFocused = document.getElementsByClassName("lastFocused")[0];
        if (maybeLastFocused) switchLastFocusedElement(maybeLastFocused)
        else switchLastFocusedElement(ScriptWrapper.firstChild.firstChild)

        if (lastScrollPosition) restoreScrollPosition(lastScrollPosition, ScriptWrapper)

        if (lastCursorPosition) setCursorPosition(lastFocusedElement, lastCursorPosition)
        else setCursorPosition(lastFocusedElement, 0)
        removeUndoIDs()
    } else {
        newBlankScript();
    }
}
/**
 * 
 * @param {KeyboardEvent} e 
 */
function handlePageTracker(e) {
    if (e.key !== "Enter") return;
    if (isNaN(parseInt(e.target.value))) return
    e.preventDefault();
    if (e.target.value <= 0) e.target.value = 1;
    else if (e.target.value > ScriptWrapper.childElementCount) e.target.value = ScriptWrapper.childElementCount;
    setCursorPosition(ScriptWrapper.children[e.target.value - 1].firstChild, 0)
    restoreScrollPosition({ top: (e.target.value - 1) * (DEFAULT_PAGE_HEIGHT_INCHES * PIXELS_PER_INCH + DEFAULT_FONT_SIZE_PIXELS) + 1, left: 0 }, ScriptWrapper)
}

/**
 * 
 * @param {Event} e 
 */
function handleElementPicker(e) {
    if (editingTitlePage) return
    const [el, currentPage] = getScriptElementAndCurrentPage(lastFocusedElement)
    changeElementTo(el, e.target.textContent.replace(/\s/g, "").toLowerCase(), currentPage)
}
/**
 * @param {Event} e 
 */
function handleVisibilityChange(e) {
    saveCurrentScreenplay(
        e,
        originalXML,
        ScriptWrapper,
        editingTitlePage,
        titlePageOuterHTML,
        scriptInnerHTML,
        scriptSettings,
        FileNameInput,
        characterSet,
        lastFocusedElement
    )
}

function handleMenuButtons(e) {
    for (let optMenu of document.getElementsByClassName("option-menu")) {
        optMenu.hidePopover()
    }
}

for (let optMenuBtn of document.getElementsByClassName("option-menu-button")) {
    optMenuBtn.addEventListener("click", handleMenuButtons)
}
window.addEventListener("load", handleOnLoad)
document.getElementById("script-upload").addEventListener("change", handleFileInput)
ScriptWrapper.addEventListener("keydown", handleKeyDown)
// scriptWrapper.addEventListener("focusout", handleFocusOut)
ScriptWrapper.addEventListener("keyup", handleKeyUp)
ScriptWrapper.addEventListener("input", handleInput)
ScriptWrapper.addEventListener("beforeinput", handleBeforeInput)
ScriptWrapper.addEventListener("click", handleOnClick)
ScriptWrapper.addEventListener("cut", handleCut);
ScriptWrapper.addEventListener("paste", handlePaste)
ScriptWrapper.addEventListener("copy", handleCopy)

TitlePageButton.addEventListener("click", toggleEditTitlePage)
document.getElementById("download-fdx").addEventListener("click", downloadFDX)
document.getElementById("download-pdf").addEventListener('click', downloadPDF)
document.getElementById("new-blank").addEventListener("click", (e) => { newBlankScript() })
window.addEventListener("visibilitychange", handleVisibilityChange)
document.getElementById("menu-button-open").addEventListener("click", (e) => document.getElementById("script-upload").click())
document.getElementById("undo-button").addEventListener("click", (e) => undoStack.undo(editingTitlePage, ScriptWrapper))
document.getElementById("redo-button").addEventListener("click", (e) => undoStack.redo(editingTitlePage, ScriptWrapper))
document.getElementById("element-types").addEventListener("click", handleElementPicker)
document.getElementById("copy-button").addEventListener("click", handleCopy)
document.getElementById("cut-button").addEventListener("click", handleCut)
document.getElementById("paste-button").addEventListener("click", handlePaste)
CurrentPageTracker.addEventListener("keydown", handlePageTracker)


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
 * @param {number} position 
 */
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