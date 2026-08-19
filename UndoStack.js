import { HTML_TAG_NAMES } from "./ScriptSettings.js";
import { saveScrollPosition, restoreScrollPosition } from "./UX.js";
/**
 * @typedef {{
 * anchorBlockId: string, 
 * anchorOffset: number, 
 * focusBlockId: string, 
 * focusOffset: number, 
 * scrollPosition: {
 *      top:number, 
 *      left:number }
 * }} SelectionCapture
 */

/**
 * @typedef {{html: string, selection: SelectionCapture}} Snapshot
 */

export class UndoStack {
    /**
     * @param {number} limit 
     * @param {Snapshot[]} undo 
     * @param {Snapshot[]} redo 
     * @param {boolean} singleDeleteLast
     * @param {boolean} singleAddLast
     * @param {number} lastUid
     */
    constructor(limit = 50, undo = [], redo = [], singleDeleteLast = false, singleAddLast = false, lastUid = 0) {
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
    snapshot(scriptWrapper) {
        return {
            selection: this.captureSelection(scriptWrapper), // save/restore caret position too
            html: scriptWrapper.innerHTML,
        };
    }

    push(editingTitlePage, scriptWrapper) {
        if (editingTitlePage) return;
        this.undo_.push(this.snapshot(scriptWrapper));
        this.redo_.length = 0;
        if (this.undo_.length > this.limit) this.undo_.shift();
    }

    undo(editingTitlePage, scriptWrapper) {
        if (editingTitlePage) return;
        if (!this.undo_.length) return;
        this.redo_.push(this.snapshot(scriptWrapper));
        const state = this.undo_.pop();
        scriptWrapper.innerHTML = state.html;
        restoreSelection(state.selection, scriptWrapper);
    }

    redo(editingTitlePage, scriptWrapper) {
        if (editingTitlePage) return;
        if (!this.redo_.length) return;
        this.undo_.push(this.snapshot(scriptWrapper));
        const state = this.redo_.pop();
        scriptWrapper.innerHTML = state.html;
        restoreSelection(state.selection, scriptWrapper);
    }

    /**
     * @param {HTMLElement} el 
     * @returns {string}
     */
    ensureId(el) { if (!el.id) el.id = `el-${this.uid++}`; return el.id; }

    /**
     * @returns {SelectionCapture | null}
     */
    captureSelection(scriptWrapper) {
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) return null;

        const range = sel.getRangeAt(0);

        const anchorBlock = closestBlock(sel.anchorNode, scriptWrapper);
        const focusBlock = closestBlock(sel.focusNode, scriptWrapper);
        if (!anchorBlock || !focusBlock) return null;
        return {
            anchorBlockId: this.ensureId(anchorBlock),
            anchorOffset: textOffsetWithinBlock(anchorBlock, sel.anchorNode, sel.anchorOffset),
            focusBlockId: this.ensureId(focusBlock),
            focusOffset: textOffsetWithinBlock(focusBlock, sel.focusNode, sel.focusOffset),
            scrollPosition: saveScrollPosition(scriptWrapper)
        };
    }
}
/**
 * @param {Node} node 
 * @param {HTMLElement?} root 
 * @returns {HTMLElement | null}
 */
function closestBlock(node, root) {
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
 * @param {SelectionCapture} saved 
 */
function restoreSelection(saved, scriptWrapper) {
    if (!saved) return;
    const anchorBlock = document.getElementById(saved.anchorBlockId);
    const focusBlock = document.getElementById(saved.focusBlockId);
    if (!anchorBlock || !focusBlock) return;  // blocks gone (shouldn't happen right after undo/redo, but stay defensive)

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
    if (saved.scrollPosition) restoreScrollPosition(saved.scrollPosition, scriptWrapper)
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