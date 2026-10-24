export class Navigation {
    /**
     * @param {HTMLElement | null} lastFocusedElement 
     * @param {number} lastElementLineCount 
     * @param {HTMLElement | null} lastSnapshotElement 
     * @param {{top:number, left:number}} lastScrollPosition
     * @param {number} lastCursorPosition
     * @param {boolean} editingTitlePage 
     */
    constructor(
        lastFocusedElement = null,
        lastElementLineCount = null,
        lastSnapshotElement = null,
        lastScrollPosition = { top: 0, left: 0 },
        lastCursorPosition = 0,
        editingTitlePage = false
    ) {
        /** @type {HTMLElement | null} */
        this.LastFocusedElement = lastFocusedElement
        /** @type {number} */
        this.LastElementLineCount = lastElementLineCount
        /** @type {HTMLElement | null} */
        this.LastSnapshotElement = lastSnapshotElement
        /** @type {boolean} */
        this.EditingTitlePage = editingTitlePage
        /** @type {{top:number,left:number}} */
        this.LastScrollPosition = lastScrollPosition
        /** @type {number} */
        this.LastCursorPosition = lastCursorPosition
    }
}