import { getCursorPosition, saveScrollPosition } from "./UX.js";

export const LAST_SCREENPLAY_KEY = "lastScreenplay";
export const LAST_TITLE_PAGE_KEY = "lastTitlePage"
export const LAST_SCRIPT_SETTINGS_KEY = "lastScriptSettings"
export const LAST_XML_DOC_KEY = "lastXMLDoc"
export const LAST_FILE_NAME_KEY = "lastFileName"
export const LAST_CHARACTER_SET_KEY = "lastCharacterSet"
export const LAST_UNDO_STACK_KEY = "lastUndoStack"
export const LAST_SCROLL_POSITION_KEY = "lastScrollPosition"
export const LAST_CURSOR_POSITION_KEY = "lastCursorPosition"

/**
 * 
 * @param {Event} e 
 * @param {document} originalXML 
 * @param {HTMLElement} scriptWrapper 
 * @param {boolean} editingTitlePage 
 * @param {string} titlePageOuterHTML 
 * @param {string} scriptInnerHTML 
 * @param {import("./ScriptSettings").ElementSettings} scriptSettings 
 * @param {HTMLInputElement} fileNameInput 
 * @param {Set} characterSet 
 * @param {HTMLElement} lastFocusedElement 
 */
export function saveCurrentScreenplay(e, originalXML, scriptWrapper, editingTitlePage, titlePageOuterHTML, scriptInnerHTML, scriptSettings, fileNameInput, characterSet, lastFocusedElement) {
    if (document.visibilityState === "hidden") {
        const xmlString = new XMLSerializer().serializeToString(originalXML);
        if (editingTitlePage) titlePageOuterHTML = scriptWrapper.innerHTML
        else scriptInnerHTML = scriptWrapper.innerHTML
        localStorage.setItem(LAST_SCREENPLAY_KEY, scriptInnerHTML)
        localStorage.setItem(LAST_TITLE_PAGE_KEY, titlePageOuterHTML)
        localStorage.setItem(LAST_SCRIPT_SETTINGS_KEY, JSON.stringify(scriptSettings))
        localStorage.setItem(LAST_XML_DOC_KEY, xmlString)
        localStorage.setItem(LAST_FILE_NAME_KEY, fileNameInput.value)
        localStorage.setItem(LAST_CHARACTER_SET_KEY, JSON.stringify([...characterSet]))
        // localStorage.setItem(LAST_UNDO_STACK_KEY, JSON.stringify(undoStack))
        localStorage.setItem(LAST_SCROLL_POSITION_KEY, JSON.stringify(saveScrollPosition(scriptWrapper)))
        localStorage.setItem(LAST_CURSOR_POSITION_KEY, getCursorPosition(lastFocusedElement))
    }
}
/**
 * Grabs the last screenplay innerHTML, script settings, original xml document, 
 * file name, character set, and undo stack from local storage.
 * @returns {[boolean, string|null, import("./ScriptSettings").ElementSettings | null, Document |null, string | null, Set|null, {top:number, left:number} | null, number|null, string|null]}
 */
export function tryGetLastScreenplay() {
    if (localStorage.getItem(LAST_UNDO_STACK_KEY)) {
        localStorage.removeItem(LAST_UNDO_STACK_KEY)
    }
    const lastScreenplay = localStorage.getItem(LAST_SCREENPLAY_KEY)
    const lastTitlePage = localStorage.getItem(LAST_TITLE_PAGE_KEY)
    const lastScriptSettings = localStorage.getItem(LAST_SCRIPT_SETTINGS_KEY)
    const lastOriginalXML = localStorage.getItem(LAST_XML_DOC_KEY)
    const lastFileName = localStorage.getItem(LAST_FILE_NAME_KEY)
    const lastCharSet = localStorage.getItem(LAST_CHARACTER_SET_KEY)
    const lastScrollPosition = localStorage.getItem(LAST_SCROLL_POSITION_KEY)
    const lastCursorPosition = localStorage.getItem(LAST_CURSOR_POSITION_KEY)

    if (lastScreenplay) {
        const domParser = new DOMParser()
        const lastXMLDoc = domParser.parseFromString(lastOriginalXML, 'text/xml')
        const parseError = lastXMLDoc.querySelector('parseerror')
        if (parseError) {
            console.error("Failed to parse stored xml", parseError.textContent)
            lastXMLDoc === null;
        }
        return [true, lastScreenplay, JSON.parse(lastScriptSettings), lastXMLDoc, lastFileName, new Set(JSON.parse(lastCharSet)), JSON.parse(lastScrollPosition), parseInt(lastCursorPosition), lastTitlePage]
    } else {
        return [false, null, null, null, null, null, null, null, null]
    }
}