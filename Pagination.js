import { DEFAULT_PAGE_HEIGHT_INCHES, DEFAULT_BOTTOM_MARGIN_INCHES, DEFAULT_TOP_MARGIN_INCHES, PIXELS_PER_INCH } from "./ScriptSettings.js";

export function paginateScreenplay(elements, currentElement = null, lastCursorPosition = -1, options = {
    pageClassName: 'page',
    pageHeightIn: DEFAULT_PAGE_HEIGHT_INCHES - DEFAULT_BOTTOM_MARGIN_INCHES - DEFAULT_TOP_MARGIN_INCHES,
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
        } else if (el.tagName === "NEWACT") {
            startNewPage(el, h)
        } else if (currentHeight + h > pageHeightPx) {
            if (tag === options.dialogueTagName) {
                const remaining = pageHeightPx - currentHeight;
                const orphanCharacter = currentEls[currentEls.length - 1].tagName.toLowerCase() === options.characterTagName;
                const [split, newCurrentElement, newLastCursorPosition] = attemptSplitDialogue(el, lastCharacterEl, remaining, options, scratch, currentElement, lastCursorPosition);
                if (newCurrentElement) { currentElement = newCurrentElement; lastCursorPosition = newLastCursorPosition; }
                if (split) {
                    currentEls.push(split.firstPart);
                    flushPage();
                    // currentEls.push(split.nextPageCharacter);
                    // currentHeight = heightOf(split.nextPageCharacter, scratch);   // genuinely new element — needs measuring
                    elements.splice(i + 1, 0, split.secondPart);
                    // elements.push(split.secondPart)
                    const secondPartHeight = heightOf(split.secondPart, scratch);  // also genuinely new
                    heights.splice(i + 1, 0, secondPartHeight);
                    // heights.push(secondPartHeight)
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
    return [pageBuckets.map((els, i) => {
        const page = createPage(options);
        const frag = document.createDocumentFragment();
        els.forEach(el => frag.appendChild(el));
        page.appendChild(frag);
        return page;
    }), currentElement, lastCursorPosition];
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
    const heights = clones.map((c) => { 
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
    firstPart.dataset.more = "(MORE)"
    firstPart.dataset.contd = ""
    const secondPart = cloneWithText(dialogueEl, words.slice(best).join(' '));
    secondPart.dataset.more = ""
    secondPart.dataset.contd = `${characterEl.textContent.trim().toUpperCase()} (CONT'D)`
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
/**
 * 
 * @param {HTMLElement} el 
 * @param {string} text 
 * @returns {HTMLElement}
 */
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