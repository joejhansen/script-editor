import { handleTextStyling, STYLE_CLASSES } from "./InlineStyling.js"
import { saveCurrentScreenplay, tryGetLastScreenplay } from "./LocalStorage.js"
import { scalePage } from "./PageScaler.js"
import { paginateScreenplay } from "./Pagination.js"
import { getCharacterInfo, handleOpenNote, loadBlankXMLDoc, loadDefaultSettings, loadTitlePage, parseXMLFromFile, XMLtoHTML } from "./ScriptConversion.js"
import { DEFAULT_PAGE_HEIGHT_INCHES, EXTENSION_REGEX, getChildElementIndex, LoadElSettings, LoadPageSettings, PIXELS_PER_INCH } from "./ScriptSettings.js"
import { UndoStack } from "./UndoStack.js"
import { ALIGNMENT_SHORTCUT_KEYS, ALIGNMENT_SHORTCUT_TO_RULE, ARROW_KEYS, changeElementTo, DELETE_INPUT_TYPES, emptyElement, ensureLineHasContent, getCursorPosition, getScriptElementAndCurrentPage, handleAutocomplete, newBlankScript, newScriptElement, pruneEmptyInlineNodes, reformatScreenplay, removeUndoIDs, restoreScrollPosition, setCursorPosition, switchLastFocusedElement } from "./UX.js"

/**
* @param {Event} e 
* @param {State} state
*/
export function handleOnLoad(e, state, scriptWrapper, scenePropertiesEl, scriptNotesEl, fileNameInput) { // globals
    scalePage()
    document.getElementsByClassName("option-menu")[0].showPopover()

    let [ok, lastScript, lastSettings, lastXMLDoc, lastFileName, lastCharacterSet, lastScrollPosition, lastCursorPosition, lastTitlePage, lastScriptNotes, lastSceneProperties, lastPageSettings] = tryGetLastScreenplay()
    if (ok) {
        scriptWrapper.innerHTML = lastScript ? lastScript : `<div class="page"><sceneheading><br></sceneheading></div>`
        state.Script.ScriptInnerHTML = lastScript ? lastScript : `<div class="page"><sceneheading><br></sceneheading></div>`
        scenePropertiesEl.innerHTML = lastSceneProperties;
        state.Script.ScenePropertiesInnerHTML = lastSceneProperties ? lastSceneProperties : "";
        scriptNotesEl.innerHTML = lastScriptNotes
        state.Script.ScriptNotesInnerHTML = lastScriptNotes ? lastScriptNotes : "";
        state.Script.TitlePageOuterHTML = lastTitlePage;
        if (lastSettings) {
            state.Settings.ScriptSettings = lastSettings;
        } else loadDefaultSettings(state.Settings);

        if (lastXMLDoc) {
            state.Script.OriginalXML = lastXMLDoc
        }
        else loadBlankXMLDoc(state.Script);

        if (lastPageSettings) {
            state.Settings.PageSettings = lastPageSettings
        }
        else state.Settings.PageSettings = LoadPageSettings(state.Script.OriginalXML)


        fileNameInput.value = lastFileName ? lastFileName : "New Script"
        state.Script.FileName = lastFileName ? lastFileName : "New Script";

        state.Script.CharacterSet = lastCharacterSet ? lastCharacterSet : new Set();

        const maybeLastFocused = document.getElementsByClassName("lastFocused")[0];
        if (maybeLastFocused) switchLastFocusedElement(maybeLastFocused, state.Navigation)
        else switchLastFocusedElement(scriptWrapper.firstChild.firstChild, state.Navigation)

        if (lastScrollPosition) {
            state.Navigation.LastScrollPosition = lastScrollPosition;
            restoreScrollPosition(lastScrollPosition, scriptWrapper)
        }

        if (lastCursorPosition) {
            state.Navigation.LastCursorPosition = lastCursorPosition;
            setCursorPosition(state.Navigation.LastFocusedElement, state.lastCursorPosition, state.Navigation);
        }
        else setCursorPosition(state.Navigation.LastFocusedElement, 0, state.Navigation)
        removeUndoIDs(scriptWrapper)
    } else {
        newBlankScript(state);
    }
    for (const Note of [...document.getElementsByTagName("scriptnote"), ...document.getElementsByTagName("sceneproperty")]) {
        Note.querySelector("img").addEventListener("click", handleOpenNote)
        Note.querySelector("content").classList.remove("active")
    }
}

/**
 * @param {Event} event 
 * @param {State} state
 */
export function handleFileInput(event, state, scriptWrapper, fileNameInput) { // globals
    event.preventDefault()
    emptyElement(document.querySelector("scriptnotes"))
    emptyElement(document.querySelector("sceneproperties"))
    /** @type {File} */
    const file = event.target.files?.[0]
    if (!file) console.warn("DEBUG:\t handleFileInput -> Something went wrong loading file")
    parseXMLFromFile(file).then(doc => {
        while (scriptWrapper.firstChild) {
            scriptWrapper.removeChild(scriptWrapper.firstChild)
        }
        state.Script.OriginalXML = doc;
        state.Settings.PageSettings = LoadPageSettings(doc);
        state.Settings.ScriptSettings = LoadElSettings(doc);
        state.Script.CharacterSet = getCharacterInfo(doc);
        state.Script.TitlePageOuterHTML = loadTitlePage(doc).map(e => e.outerHTML).join('')
        const [screenplayPages, _, __] = paginateScreenplay(XMLtoHTML(doc));
        for (const page of screenplayPages) {
            scriptWrapper.appendChild(page);
        }
        fileNameInput.value = file.name.substring(0, file.name.length - 4)
        switchLastFocusedElement(scriptWrapper.firstChild.firstChild, state.Navigation)
        setCursorPosition(state.Navigation.LastFocusedElement, 0, state.Navigation)
        state.Script.ScriptInnerHTML = scriptWrapper.innerHTML
        state.UndoStack = new UndoStack()
        state.Navigation.EditingTitlePage = false;
    }).catch(e => console.warn(e))
}

/**
 * @param {KeyboardEvent} event 
 * @param {State} state
 */
export function handleKeyDown(event, state, scriptWrapper) {
    event.stopPropagation();
    const [child, currentPage] = getScriptElementAndCurrentPage(document.getSelection().anchorNode, state, scriptWrapper)
    if (event.key === "Tab") handleTab(event, child, currentPage, state)
    else if ((event.ctrlKey && event.key !== "Control") || (event.metaKey && event.key !== "MetaKey")) handleShortCut(event, child, currentPage, state, scriptWrapper)
}

/**
 * @param {KeyboardEvent} event
 * @param {State} state 
 */
export function handleKeyUp(event, state, scriptWrapper, CurrentPageTracker) { // globals
    event.stopPropagation();
    const [child, currentPage] = getScriptElementAndCurrentPage(document.getSelection().anchorNode, state, scriptWrapper)
    CurrentPageTracker.value = getChildElementIndex(currentPage, scriptWrapper) + 1
    if (ARROW_KEYS.includes(event.key)) handleArrowKeysUp(event, child, currentPage, state)
}

/**
 * @param {KeyboardEvent} e 
 * @param {HTMLElement} el 
 * @param {HTMLElement} page 
 * @param {State} state
 */
function handleArrowKeysUp(e, el, page, state) { // globals
    if (state.Navigation.LastFocusedElement !== el && state.Navigation.LastFocusedElement.dataset && state.Navigation.LastFocusedElement.dataset.suggestion) {
        state.Navigation.LastFocusedElement.dataset.suggestion = "";
        if (state.Navigation.LastFocusedElement.textContent && state.Navigation.LastFocusedElement === "CHARACTER") handleUnfocusCharacter(state.Navigation.LastFocusedElement, state.Script)
    }
    if (el !== state.Navigation.LastFocusedElement) switchLastFocusedElement(el, state.Navigation)
}

/**
 * @param {InputEvent} event 
 * @param {State} state
 */
export function handleBeforeInput(event, state, scriptWrapper, currentPageTracker) { // globals
    if (event.inputType === "insertParagraph") {
        const [child, currentPage] = getScriptElementAndCurrentPage(document.getSelection().anchorNode, state, scriptWrapper)
        handleEnterKey(event, child, currentPage, state, scriptWrapper, currentPageTracker)
    } else if (DELETE_INPUT_TYPES.includes(event.inputType)) {
        const [child, currentPage] = getScriptElementAndCurrentPage(document.getSelection().anchorNode, state, scriptWrapper)
        handleDeletion(event, child, currentPage, state, scriptWrapper)
    } else if (event.inputType === 'insertText' || event.inputType === 'insertFromPaste') {
        const [child, currentPage] = getScriptElementAndCurrentPage(document.getSelection().anchorNode, state, scriptWrapper)
        if (!(child === state.Navigation.LastSnapshotElement && state.UndoStack.singleAddLast && event.inputType === "insertText")) {
            state.UndoStack.singleDeleteLast = false;
            state.Navigation.LastSnapshotElement = child;
            state.UndoStack.push(state.Navigation.EditingTitlePage, scriptWrapper);
            if (event.inputType === "insertText") {
                state.UndoStack.singleAddLast = true;
            } else {
                state.UndoStack.singleAddLast = false;
            }
        }
    }
}

/**
 * @param {InputEvent} event 
 * @param {State} state
 */
export function handleInput(event, state, scriptWrapper) { // globals
    const [child, currentPage] = getScriptElementAndCurrentPage(document.getSelection().anchorNode, state, scriptWrapper)
    const range = document.createRange();
    range.selectNodeContents(child)
    let newLineCount = range.getClientRects().length;
    let lastCursorPosition = getCursorPosition(child)

    handleAutocomplete(event, child, currentPage, state.Script);
    if (scriptWrapper.childElementCount <= 1 && !scriptWrapper.firstChild.firstChild) {// edge case where all elements are empty with <br>
        newBlankScript(state, true)
    } else {
        if ((state.Navigation.LastElementLineCount != newLineCount && state.Navigation.LastFocusedElement === child) || !state.Navigation.LastFocusedElement) reformatScreenplay(child, currentPage, scriptWrapper, state)
        else if (DELETE_INPUT_TYPES.includes(event.inputType) && state.Navigation.LastFocusedElement !== child) reformatScreenplay(child, currentPage, scriptWrapper, state)
    }

    switchLastFocusedElement(child, state.Navigation);
    state.Navigation.LastElementLineCount = newLineCount

}

/**
 * TODO: Fix caret dissapearing on entering a new element on Firefox
 * @param {InputEvent} event 
 * @param {Element} el
 * @param {Element} currentPage
 * @param {State} state
 */
function handleEnterKey(event, el, currentPage, state, scriptWrapper, currentPageTracker) { // globals
    event.preventDefault()
    state.UndoStack.push(state.Navigation.EditingTitlePage, scriptWrapper)


    const selection = window.getSelection()
    const cursorRange = selection.getRangeAt(0)

    if (cursorRange.startOffset === 0) {
        let newElement = el.cloneNode(0);
        newElement.innerHTML = '<br>';
        currentPage.insertBefore(newElement, el)
        if (currentPage.scrollHeight > PIXELS_PER_INCH * DEFAULT_PAGE_HEIGHT_INCHES) reformatScreenplay(el, currentPage, scriptWrapper, state)
        currentPageTracker.value = getChildElementIndex(newElement.parentElement, scriptWrapper) + 1
        if (el.dataset.suggestion) el.dataset.suggestion = "";
        if (el.textContent && el.tagName === "CHARACTER") handleUnfocusCharacter(el, state.Script)
        else if (el.textContent && ["SHOT", "TRANSITION", "SCENEHEADING"].includes(el.tagName)) el.innerHTML = el.innerHTML.toUpperCase();
        setCursorPosition(el, 0, state.Navigation)
        return;

    }
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
        newElement = newScriptElement(state.Settings.ScriptSettings[el.tagName.toLowerCase()].ReturnKey.replace(/\s/g, "").toLowerCase())
    }
    newElement.innerHTML = ""
    newElement.appendChild(tailFragment)

    pruneEmptyInlineNodes(newElement)
    ensureLineHasContent(el)
    ensureLineHasContent(newElement)

    currentPage.insertBefore(newElement, el.nextSibling)
    if (currentPage.scrollHeight > PIXELS_PER_INCH * DEFAULT_PAGE_HEIGHT_INCHES) reformatScreenplay(el, currentPage, scriptWrapper, state)
    setCursorPosition(newElement, 0, state.Navigation)
    currentPageTracker.value = getChildElementIndex(newElement.parentElement, scriptWrapper) + 1

    if (el.dataset.suggestion) el.dataset.suggestion = "";
    if (el.textContent && el.tagName === "CHARACTER") handleUnfocusCharacter(el, state.Script)
    else if (el.textContent && ["SHOT", "TRANSITION", "SCENEHEADING"].includes(el.tagName)) el.innerHTML = el.innerHTML.toUpperCase();
}

/**
 * @param {InputEvent} event 
 * @param {Element} el 
 * @param {Element} currentPage
 * @param {State} state
 */
function handleDeletion(event, el, currentPage, state, scriptWrapper) { // globals
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
    if (!(el === state.Navigation.LastSnapshotElement && state.UndoStack.singleDeleteLast && selection.isCollapsed)) {
        state.UndoStack.singleAddLast = false;
        state.Navigation.LastSnapshotElement = el;
        state.UndoStack.push(state.Navigation.EditingTitlePage, scriptWrapper);
        if (selection.isCollapsed && (event.inputType === "deleteContentBackward" || event.inputType === "deleteContentForward" || event.inputType === "deleteWordForward" || event.inputType === "deleteWordBackward")) {
            state.UndoStack.singleDeleteLast = true;
        } else {
            state.UndoStack.singleDeleteLast = false;
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
            emptyElement(scriptWrapper)
            newTitlePage.appendChild(newTitleText)
            scriptWrapper.appendChild(newTitlePage)
            switchLastFocusedElement(newTitleText, state.Navigation)
            setCursorPosition(state.Navigation.LastFocusedElement, 0, state.Navigation)
        } else {
            newBlankScript(state, scriptWrapper, FileNameInput, true);
        }
    }
}

/**
 * @param {KeyboardEvent} event 
 * @param {State} state
 */
function handleUndo(event, state, scriptWrapper) { // globals
    event.preventDefault();
    state.UndoStack.undo(state.Navigation.EditingTitlePage, scriptWrapper);
}

/**
 * @param {KeyboardEvent} event 
 * @param {State} state
 */
function handleRedo(event, state, scriptWrapper) { // globals
    event.preventDefault();
    state.UndoStack.redo(state.Navigation.EditingTitlePage, scriptWrapper)
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
export function handleCopy(event) {
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
 * @param {ClipboardEvent} event
 * @param {State} state
 */
export function handlePaste(event, state, scriptWrapper) { // globals
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
                            state.UndoStack.push(state.Navigation.EditingTitlePage, scriptWrapper)
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

/**
 * 
 * @param {*} event 
 * @param {*} state 
 * @returns 
 */
export function handleCut(event, state) { // globals
    const selection = document.getSelection();
    if (selection.isCollapsed) return;
    event.preventDefault();
    state.UndoStack.push(state.Navigation.EditingTitlePage, ScriptWrapper)
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
 * @param {State} state
 */
function handleShortCut(event, el, currentPage, state, scriptWrapper) { // globals
    const key = event.key.toLowerCase();
    if (STYLE_CLASSES[key]) { state.UndoStack.push(state.Navigation.EditingTitlePage, scriptWrapper); handleTextStyling(event, scriptWrapper) }
    else if (key === "o") { event.preventDefault(); document.getElementById("script-upload").click() }
    else if (key === "p") { event.preventDefault(); document.getElementById("download-pdf").click() }
    else if (key === "s") { event.preventDefault(); document.getElementById("download-fdx").click() }
    else if (key === "z") handleUndo(event, state, scriptWrapper);
    else if (key === "y") handleRedo(event, state, scriptWrapper);
    else if (state.Navigation.EditingTitlePage && ALIGNMENT_SHORTCUT_KEYS.includes(key)) handleTitleAlignment(event, el, currentPage)
    else if (!isNaN(parseInt(key))) {
        for (const setting in state.Settings.ScriptSettings) {
            if (state.Settings.ScriptSettings[setting].Shortcut === key) {
                event.preventDefault();
                state.UndoStack.push(state.Navigation.EditingTitlePage, scriptWrapper)
                changeElementTo(el, setting, currentPage, state.Navigation)
                return
            }
        }
    }
}

/**
 * @param {KeyboardEvent} event 
 * @param {Element} el 
 * @param {Element} currentPage
 * @param {State} state
 */
function handleTab(event, el, currentPage, state) { // globals
    event.preventDefault();
    state.UndoStack.push(state.Navigation.EditingTitlePage, ScriptWrapper)
    if (el.dataset.suggestion) {
        el.textContent += el.dataset.suggestion
        el.dataset.suggestion = ""
        if (el.tagName === "CHARACTER") handleUnfocusCharacter(el, state.Script)
        else el.textContent = el.textContent.toUpperCase()
        setCursorPosition(el, el.textContent.length, state.Navigation)
        return;
    }

    if (el.tagName === "TITLETEXT") {
        let newTitleText = el.cloneNode(true)
        newTitleText.textContent = "";
        newTitleText.appendChild(document.createElement('br'))
        currentPage.insertBefore(newTitleText, el.nextSibling)
        setCursorPosition(newTitleText, 0, state.Navigation)
        return
    }

    let newElShortcut = state.Settings.ScriptSettings[el.tagName.toLowerCase()].Shortcut;
    if (event.shiftKey) {
        if (newElShortcut === '0') newElShortcut = ":";
        else if (newElShortcut === ':') newElShortcut = "9";
        else newElShortcut = (parseInt(newElShortcut) - 1).toString();
    } else {
        if (newElShortcut === ':') newElShortcut = "0";
        else if (newElShortcut === '9') newElShortcut = ":";
        else newElShortcut = (parseInt(newElShortcut) + 1).toString();
    }

    for (const setting in state.Settings.ScriptSettings) {
        if (state.Settings.ScriptSettings[setting].Shortcut === newElShortcut) {
            if (!el.textContent) { el = changeElementTo(el, setting, currentPage, state.Navigation); handleAutocomplete(event, el, currentPage, state.Script) }
            else {
                let newElement = newScriptElement(setting)
                currentPage.insertBefore(newElement, el.nextSibling)
                setCursorPosition(newElement, 0, state.Navigation)
            }
        }
    }
}

/** 
 * @param {HTMLElement} el
 * @param {Script} script
 * */
function handleUnfocusCharacter(el, script) {
    setLastCharactersUsed(el.textContent, script);
    addToCharacterSet(el.textContent, script);
    el.textContent = el.textContent.at(0).toUpperCase() + el.textContent.substring(1)
}
/** 
 * @param {string} str 
 * @param {Script} script
 * */
function setLastCharactersUsed(str, script) { // globals
    if (str === script.LastCharacterUsed) return;
    script.SecondLastCharacterUsed = script.LastCharacterUsed;
    script.LastCharacterUsed = str;
}

/**
 * @param {Event} e
 * @param {State} state 
 */
export function handleOnClick(e, state, scriptWrapper, fileNameInput, currentPageTracker) {
    const [el, currentPage] = getScriptElementAndCurrentPage(document.getSelection().anchorNode, state, scriptWrapper, fileNameInput)
    currentPageTracker.value = getChildElementIndex(currentPage, scriptWrapper) + 1
    switchLastFocusedElement(el, state.Navigation)
}

/**
 * 
 * @param {Event} e 
 * @param {State} state
 */
export function toggleEditTitlePage(e, state, scriptWrapper, titlePageButton) { // globals
    e.preventDefault();
    if (state.Navigation.EditingTitlePage) {
        state.Script.TitlePageOuterHTML = scriptWrapper.innerHTML
        scriptWrapper.innerHTML = state.Script.ScriptInnerHTML;
        titlePageButton.textContent = "Edit Title Page"
    } else {
        state.Script.ScriptInnerHTML = scriptWrapper.innerHTML
        scriptWrapper.innerHTML = state.Script.TitlePageOuterHTML
        titlePageButton.textContent = "Edit Script"
    }
    state.Navigation.EditingTitlePage = !state.Navigation.EditingTitlePage;
}

/**
 * 
 * @param {KeyboardEvent} e 
 * @param {Navigation} navigation
 */
export function handlePageTracker(e, navigation) {
    if (e.key !== "Enter") return;
    if (isNaN(parseInt(e.target.value))) return
    e.preventDefault();
    if (e.target.value <= 0) e.target.value = 1;
    else if (e.target.value > ScriptWrapper.childElementCount) e.target.value = ScriptWrapper.childElementCount;
    setCursorPosition(ScriptWrapper.children[e.target.value - 1].firstChild, 0, navigation)
    restoreScrollPosition({ top: (e.target.value - 1) * (DEFAULT_PAGE_HEIGHT_INCHES * PIXELS_PER_INCH + DEFAULT_FONT_SIZE_PIXELS) + 1, left: 0 }, ScriptWrapper)
}

/**
 * 
 * @param {Event} e 
 * @param {State} state
 */
export function handleElementPicker(e, state) {
    if (state.Navigation.EditingTitlePage) return
    const [el, currentPage] = getScriptElementAndCurrentPage(state.Navigation.LastFocusedElement, state)
    changeElementTo(el, e.target.textContent.replace(/\s/g, "").toLowerCase(), currentPage, state.Navigation)
    document.getElementById("element-types").togglePopover();
}
/**
 * @param {Event} e 
 * @param {State} state
 */
export function handleVisibilityChange(e, state, scriptWrapper, fileNameInput, scriptNotesEl, scenePropertiesEl) {
    saveCurrentScreenplay(
        e,
        state.Script.OriginalXML,
        scriptWrapper,
        state.Navigation.EditingTitlePage,
        state.Script.TitlePageOuterHTML,
        state.Script.ScriptInnerHTML,
        state.Settings.ScriptSettings,
        fileNameInput,
        state.Script.CharacterSet,
        state.Navigation.LastFocusedElement,
        scriptNotesEl,
        scenePropertiesEl,
        state.Settings.PageSettings
    )
}

export function handleMenuButtons(e) {
    for (let optMenu of document.getElementsByClassName("option-menu")) {
        optMenu.hidePopover()
    }
}

/**
 * @param {string} str 
 * @param {Script} script
 */
function addToCharacterSet(str, script) { // globals
    if (!str) return;
    if (EXTENSION_REGEX.test(str)) str = str.substring(0, str.lastIndexOf('(')).trim();
    str = str.charAt(0).toUpperCase() + str.substring(1)
    script.CharacterSet.add(str)
}