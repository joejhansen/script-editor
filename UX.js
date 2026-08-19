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