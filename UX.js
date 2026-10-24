import { paginateScreenplay } from "./Pagination.js";
import { loadBlankXMLDoc, loadDefaultSettings } from "./ScriptConversion.js";
import { AUTOCOMPLETE_TAGS, DEFAULT_EXTENSIONS, DEFAULT_LEFT_MARGIN_INCHES, DEFAULT_PAGE_WIDTH_INCHES, DEFAULT_RIGHT_MARGIN_INCHES, DEFAULT_SCENE_INTROS, DEFAULT_TIMES_OF_DAY, DEFAULT_TRANSITIONS, EXTENSION_REGEX, HTML_TAG_NAMES, PIXELS_PER_INCH, SCENE_INTRO_REGEX, tagToFDXType, TIME_OF_DAY_REGEX, VALID_FDX_TYPES } from "./ScriptSettings.js";
import { UndoStack } from "./UndoStack.js";

export const DELETE_INPUT_TYPES = ["deleteContentForward", "deleteContentBackward", "deleteWordForward", "deleteWordBackward", "deleteByCut"]
export const ARROW_KEYS = ["ArrowDown", "ArrowUp", "ArrowRight", "ArrowLeft"]

/** Left, Center, and Right respectively */
export const ALIGNMENT_SHORTCUT_KEYS = ["l", "e", "r"]
export const ALIGNMENT_SHORTCUT_TO_RULE = ["left", "center", "right"]

/**
 * @param {HTMLElement} element 
 * @returns {number}
 */
export function getCursorPosition(element) {
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
 * @param {Navigation} navigation
 */
export function setCursorPosition(element, position, navigation) {
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
        switchLastFocusedElement(element, navigation)
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
 * @param {HTMLElement} scriptWrapper 
 * @returns {{top:number, left:number}}
 */
export function saveScrollPosition(scriptWrapper) {
    return { top: scriptWrapper.scrollTop, left: scriptWrapper.scrollLeft }
}

/**
 * @param {HTMLElement} element 
 * @param {{top:number, left:number}} state 
 */
export function restoreScrollPosition(state, scriptWrapper) {
    scriptWrapper.scrollTop = state.top;
    scriptWrapper.scrollLeft = state.left
}


/**
 * @param {HTMLElement} el 
 */
export function emptyElement(el) {
    while (el.firstChild) el.removeChild(el.firstChild)
}

/**
 * @param {HTMLElement} el 
 * @param {Navigation} navigation
 */
export function switchLastFocusedElement(el, navigation) { // globals
    if (navigation.LastFocusedElement) navigation.LastFocusedElement.classList.remove("lastFocused")
    navigation.LastFocusedElement = el;
    navigation.LastFocusedElement.classList.add("lastFocused")
    handleElementPickerUI(navigation.LastFocusedElement, navigation);
}

/**
 * 
 * @param {HTMLElement} el 
 * @param {Navigation} navigation 
 * @returns 
 */
function handleElementPickerUI(el, navigation) { // globals
    if (navigation.EditingTitlePage) return;
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

export function removeUndoIDs(scriptWrapper) { // globals
    for (let page of scriptWrapper.children) {
        for (let el of page.children) {
            el.removeAttribute("id")
        }
    }
}

/**
 * @param {Node} node
 * @param {State} state
 * @returns {[HTMLElement, HTMLElement]} A child script element and the page it exists within
 */
export function getScriptElementAndCurrentPage(node, state, scriptWrapper, fileNameInput) { // globals
    let scriptEl = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
    if (scriptEl.tagName === "ARTICLE") {
        if (scriptEl.childElementCount <= 1 && !scriptWrapper.firstChild.firstChild) {
            newBlankScript(state, scriptWrapper, fileNameInput, true)
            return [scriptWrapper.firstChild.firstChild, scriptWrapper.firstChild]
        } else {
            return [scriptWrapper.firstChild.firstChild, scriptWrapper.firstChild]
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
 * @param {string} type 
 * @param {string} textContent 
 * @returns {HTMLElement}
 */
export function newScriptElement(type, textContent = "") {
    let newElement = document.createElement(type)
    if (textContent.length === 0) newElement.appendChild(document.createElement('br'))
    else newElement.textContent = textContent
    return newElement
}

/**
 * @param {HTMLElement} el 
 */
export function ensureLineHasContent(el) {
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
export function pruneEmptyInlineNodes(root) {
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
 * @param {HTMLElement} currentElement 
 * @param {HTMLElement} currentPage 
 * @param {State} state
 */
export function reformatScreenplay(currentElement, currentPage, scriptWrapper, state) {
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

    setCursorPosition(currentElement, lastCursorPosition, state.Navigation)
    restoreScrollPosition(lastScrollPosition, scriptWrapper)
}

/**
 * @param {HTMLElement} currentElement 
 * @returns {[HTMLElement[], HTMLElementEventMap, number]}
 */
export function getAllScreenplayElements(currentElement = null, lastCursorPosition = -1) {
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
 * Loads or resets default settings,
 * @param {State} state 
 * @param {boolean} preserveCurrentInfo
 */
export function newBlankScript(state, scriptWrapper, fileNameInput, preserveCurrentInfo = false) { // globals
    if (!preserveCurrentInfo) {
        loadDefaultSettings(state.Settings).catch(e => console.warn(e));
        loadBlankXMLDoc(state.Script).catch(e => console.warn(e))
        state.Script.CharacterSet = new Set();
        state.UndoStack = new UndoStack();
        fileNameInput.value = "New Script";
    }
    emptyElement(scriptWrapper)
    emptyElement(document.querySelector("scriptnotes"))
    emptyElement(document.querySelector("sceneproperties"))
    let newSceneHeading = document.createElement("sceneheading")
    newSceneHeading.appendChild(document.createElement("br"))
    let newPage = document.createElement("div")
    newPage.classList.add("page")
    newPage.appendChild(newSceneHeading)
    scriptWrapper.appendChild(newPage)
    state.Navigation.LastSnapshotElement = newSceneHeading
    switchLastFocusedElement(newSceneHeading, state.Navigation);
    setCursorPosition(state.Navigation.LastFocusedElement, 0, state.Navigation)
    state.Navigation.EditingTitlePage = false;
}

let lastAutocomplete = ""; // I'm not sure we need this, might just add more complexity than is needed
/**
 * Autocomplete for character names, headings, and transitions
 * @param {InputEvent} event 
 * @param {HTMLElement} currentEl 
 * @param {HTMLElement} currentPage 
 * @param {Script} script
 */
export function handleAutocomplete(event, currentEl, currentPage, script) { // globals
    if (!AUTOCOMPLETE_TAGS.includes(currentEl.tagName.toLowerCase())) return
    if (currentEl.dataset.suggestion) currentEl.dataset.suggestion = ""
    if (!currentEl.textContent) {
        if (currentEl.tagName === "CHARACTER") currentEl.dataset.suggestion = script.SecondLastCharacterUsed;
        else if (!currentEl.firstChild) currentEl.appendChild(document.createElement('br'));
        return;
    }

    let res = ""
    switch (currentEl.tagName) {
        case "CHARACTER":
            if (EXTENSION_REGEX.test(currentEl.textContent)) [lastAutocomplete, res] = completeStringFromSet(currentEl.textContent.substring(currentEl.textContent.lastIndexOf('(')).trim(), DEFAULT_EXTENSIONS)
            else[lastAutocomplete, res] = completeStringFromSet(currentEl.textContent, script.CharacterSet)
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
 * @param {HTMLElement} el 
 * @returns {number}
 */
export function getElementMaxWidth(el) {
    const elStyles = window.getComputedStyle(el)
    return (DEFAULT_PAGE_WIDTH_INCHES - DEFAULT_RIGHT_MARGIN_INCHES - DEFAULT_LEFT_MARGIN_INCHES) * PIXELS_PER_INCH - parseInt(elStyles.paddingLeft.substring(0, elStyles.paddingLeft.lastIndexOf('p'))) - parseInt(elStyles.paddingRight.substring(0, elStyles.paddingRight.lastIndexOf('p')))
}

/**
 * @param {HTMLElement} el 
 * @param {string} newType 
 * @param {HTMLElement} currentPage
 * @param {Navigation} navigation
 * @return {HTMLElement}
 */
export function changeElementTo(el, newType, currentPage, navigation) {
    const lastCursorPosition = getCursorPosition(el)
    const newElement = newScriptElement(newType, el.textContent)
    currentPage.replaceChild(newElement, el)

    setCursorPosition(newElement, lastCursorPosition, navigation)
    return newElement
}