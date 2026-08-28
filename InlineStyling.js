/**
 * Rich text formatting toggler for contenteditable elements.
 * Formats are represented as </span class="bold|italics|underline">...<//span>,
 * which can nest (e.g. bold inside italics) to support combined styles.
 */

export const STYLE_CLASSES = { b: "bold", i: "italic", u: "underline" };

/**
 * @param {KeyboardEvent} event
 * @param {Element} editableRoot - the contenteditable host (e.g. your script-wrapper).
 *   Passed explicitly rather than derived from the selection, because a
 *   selection-derived boundary can accidentally collapse onto the exact
 *   style span you're trying to detect (see hasStyleAncestor below).
 */
export function handleTextStyling(event, editableRoot) {
    const key = event.key.toLowerCase();

    event.preventDefault();
    toggleStyle(STYLE_CLASSES[key], editableRoot);
}
/**
 * 
 * @param {string} styleClass 
 * @param {HTMLElement} editableRoot 
 * @returns 
 */
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

/**
 * @param {string} styleClass 
 */
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
/**
 * @param {Range} range 
 * @param {string} styleClass 
 * @param {Selection} selection 
 * @param {HTMLElement} editableRoot 
 * @returns 
 */
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
/**
 * @param {Range} range 
 */
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

/**
 * @param {Range} range 
 * @returns 
 */
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

/**
 * @param {Node} node 
 * @param {string} styleClass 
 * @param {HTMLElement} boundary 
 * @returns 
 */
function hasStyleAncestor(node, styleClass, boundary) {
    let el = node.parentElement;
    while (el && el !== boundary) {
        if (el.classList?.contains(styleClass) || el.classList?.contains(styleClass.toUpperCase())) return true;
        el = el.parentElement;
    }
    return false;
}

/**
 * @param {Node} node 
 * @param {string} styleClass 
 */
function wrapNodeInStyle(node, styleClass) {
    const span = document.createElement("span");
    span.className = styleClass;
    node.parentNode.insertBefore(span, node);
    span.appendChild(node);
}

// Removes styleClass from whichever ancestor span carries it, splitting
// that span into up-to-three pieces (before/target/after) so siblings
// outside the selection keep their formatting untouched.
/**
 * 
 * @param {Node} node 
 * @param {string} styleClass 
 * @param {HTMLElement} boundary 
 * @returns 
 */
function removeStyleFromNode(node, styleClass, boundary) {
    let el = node.parentElement;
    while (el && el !== boundary) {
        if (el.classList?.contains(styleClass)) {
            unwrapStyleFromChild(el, node, styleClass);
            return;
        } else if (el.classList?.contains(styleClass.toUpperCase())) {
            unwrapStyleFromChild(el, node, styleClass.toUpperCase())
            return;
        }
        el = el.parentElement;
    }
}

/**
 * 
 * @param {Element} styledEl 
 * @param {Node} targetNode 
 * @param {string} styleClass 
 */
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
/**
 * @param {HTMLElement} root 
 * @param {string} styleClass 
 */
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
/**
 * @param {Selection} selection 
 * @param {Node[]} textNodes 
 * @returns 
 */
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


