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
]

// Everything in inches
const DEFAULT_PAGE_WIDTH = 8.5
const DEFAULT_PAGE_HEIGHT = 11
const DEFAULT_TOP_MARGIN = 1
const DEFAULT_RIGHT_MARGIN = 1
const DEFAULT_BOTTOM_MARGIN = 1
const DEFAULT_LEFT_MARGIN = 1.5
const PIXELS_PER_INCH = 96

let scriptWrapper = document.getElementById("script-main");
let measuringPage = document.getElementById("measuring-page")
let measuringElement = document.getElementById("measuring-element")

/** @type {ElementSettings} */
let defaultScriptSettings = null
/** @type {ElementSettings} */
let scriptSettings = null
/** @type {Document} */
let originalXML = null

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
 * @property {bool} StartsNewPage
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
    /**
     * @type {ElementSettings}
    */
    let res = {};
    let settings = doc.getElementsByTagName("ElementSettings")
    for (let setting of settings) {
        res[setting.getAttribute("Type").replace(/\s/g, "").toLowerCase()] = LoadElSetting(setting)
    }
    return res;
}

/**
 * @param {Element} el 
 * @returns {HTMLElement}
 */
function EltoHTML(el) {
    let elType = el.getAttribute("Type").replace(/\s/g, "").toLowerCase();
    let elText = "";
    for (let tag of el.children) if (tag.tagName === "Text") {
        elText += tag.textContent;
    }
    if (elType === "parenthetical") elText = elText.replace(/[()]/g, "") // parenthesis in parentheticals are assumed and handled by css
    let newEl = document.createElement(elType)
    newEl.textContent = elText;
    return newEl
    // return `<${elType} class="screenplay-element">${elText}</${elType}>`
}

/**
 * @param {Document} doc
 * @return {HTMLElement[]}
 */
function XMLtoHTML(doc) {
    /** @type {Element[]} */
    let res = []
    contentEls = doc.getElementsByTagName("FinalDraft")[0].getElementsByTagName("Content")[0].children
    // const articleArea = document.getElementById("script-main")

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
 * @returns 
 */
function handleFileInput(event) {
    event.preventDefault()
    const file = event.target.files?.[0]
    if (!file) console.warn("DEBUG:\t handleFileInput -> Something went wrong loading file")
    parseXMLFromFile(file).then(doc => {
        while (scriptWrapper.firstChild) {
            scriptWrapper.removeChild(scriptWrapper.firstChild)
        }
        originalXML = doc;
        scriptSettings = LoadElSettings(doc)
        let screenplayPages = paginateScreenplay(XMLtoHTML(doc));
        for (let page of screenplayPages) {
            scriptWrapper.appendChild(page);
        }
    }).catch(e => console.warn(e))
}

/**
 * @param {KeyboardEvent} event 
 * @param {Element} el
 * @param {Element} currentPage
 */
function handleEnterKey(event, el, currentPage) {
    event.preventDefault()
    const cursorPosition = document.getSelection().anchorOffset
    const newElement = newScriptElement(scriptSettings[el.tagName.toLowerCase()].ReturnKey.toLowerCase(), el.textContent.substring(cursorPosition))
    el.textContent = el.textContent.substring(0, cursorPosition)
    if (el.textContent.length === 0) el.appendChild(document.createElement('br'))
    currentPage.insertBefore(newElement, el.nextSibling)

    setSelection(newElement, 0)
}

/**
 * @param {string} type 
 * @param {string} textContent 
 * @returns {Element}
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
 * @param {Element} el 
 * @param {string} newType 
 * @param {Element} currentPage
 */
function changeElementTo(el, newType, currentPage) {
    const newElement = newScriptElement(newType, el.textContent)
    currentPage.replaceChild(newElement, el)
    setSelection(newElement, 0)
}

/**
 * @param {KeyboardEvent} event 
 * @param {Element} el
 * @param {Element} currentPage
 */
function handlelShortCut(event, el, currentPage) {
    if (event.key.length > 1 || isNaN(parseInt(event.key))) return;
    for (const setting in scriptSettings) {
        if (scriptSettings[setting].Shortcut === event.key) changeElementTo(el, setting, currentPage)
    }
}

/**
 * @param {KeyboardEvent} event 
 * @param {Element} el 
 * @param {Element} currentPage
 */
function handleTab(event, el, currentPage) {
    event.preventDefault();

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
            if (el.textContent.length === 0) changeElementTo(el, setting, currentPage)
            else {
                let newElement = newScriptElement(setting)
                currentPage.insertBefore(newElement, el.nextSibling)
                setSelection(newElement, 0)
            }
        }
    }
}
/**
 * @param {KeyboardEvent} event 
 * @param {Element} el 
 * @param {Element} currentPage
 */
function handleBackspaceKey(event, el, currentPage) {
    const selection = document.getSelection();
    const range = selection.getRangeAt(0);

    // for ctrl+a -> delete/backspace
    const allSelected = range.startContainer === scriptWrapper && range.startOffset === 0 &&
        range.endContainer === scriptWrapper && range.endOffset === scriptWrapper.childNodes.length;

    // for if trying to delete from the first position of first element, or if the document is completely blank
    const isFirstElement = el === scriptWrapper.firstElementChild.firstElementChild;
    const cursorAtStart = range.startOffset === 0;
    const nothingSelected = selection.isCollapsed;
    const elementIsEmpty = !el.textContent.trim();

    if ((isFirstElement && cursorAtStart && nothingSelected && elementIsEmpty)) {
        if (event.key === "Backspace" || scriptWrapper.firstElementChild.childElementCount === 1) event.preventDefault()
    } else if (allSelected) {
        event.preventDefault();
        newBlankScript();
    }

}

function handleDeleteKey(event, child, currentPage) {
    console.log("Here!")
}

/**
 * @param {KeyboardEvent} event 
 */
function handleKeyDown(event) {
    event.stopPropagation();
    const thisNode = document.getSelection().anchorNode;
    const child = thisNode.nodeType === Node.TEXT_NODE ? thisNode.parentElement : thisNode;
    const currentPage = child.parentElement;

    if (event.key === "Enter") handleEnterKey(event, child, currentPage)
    else if (event.key === "Backspace" || event.key === "Delete") handleBackspaceKey(event, child, currentPage)
    else if (event.key === "Tab") handleTab(event, child, currentPage)
    else if (event.altKey && event.key !== "Alt") handlelShortCut(event, child, currentPage)
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
 * @param {Element} el 
 */
function HTMLtoFDX(doc, el) {
    let paraEl = doc.createElement("Paragraph")
    const htmlTag = el.tagName.toLowerCase();
    paraEl.setAttribute("Type", tagToFDXType(htmlTag))
    let textEl = doc.createElement("Text")
    if (htmlTag === "parenthetical") textEl.textContent = `(${el.textContent})`;
    else textEl.textContent = el.textContent;
    doc.getElementsByTagName("Content")[0].appendChild(doc.createTextNode('    '))
    doc.getElementsByTagName("Content")[0].appendChild(paraEl)
    doc.getElementsByTagName("Content")[0].appendChild(doc.createTextNode('\n'))
    paraEl.appendChild(textEl)
}

/**
 * @param {Event}
 */
function downloadFDX(event) {
    event.preventDefault();
    const parser = new DOMParser()
    let newContentDoc = parser.parseFromString(`<Content>\n</Content>`, "application/xml")
    // let newContentEl = newContentDoc.getElementsByTagName("Content")[0]
    const pages = document.getElementsByClassName("page")
    for (const page of pages) {
        for (const child of page.children) {
            HTMLtoFDX(newContentDoc, child)
        }
    }
    newContentDoc.getElementsByTagName("Content")[0].appendChild(newContentDoc.createTextNode('  '))
    let FDRoot = originalXML.getElementsByTagName("FinalDraft")[0];
    FDRoot.replaceChild(newContentDoc.getElementsByTagName("Content")[0], FDRoot.getElementsByTagName("Content")[0])
    const serializer = new XMLSerializer();
    const newXMLStr = serializer.serializeToString(originalXML)
    const blob = new Blob([newXMLStr], { type: "application/xml" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url;
    a.download = "script.fdx"
    a.click()

    URL.revokeObjectURL(url);

}
/**
 * @param {Element} el 
 */
function emptyElement(el) {
    while (el.firstChild) el.remove(el.firstChild)
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
                else console.log("DEBUG:\t loadDefaultSettings -> Default settings loaded")
            })
            .catch(e => console.warn(e))
    } else {
        scriptSettings = defaultScriptSettings
    }
}

function newBlankScript() {
    loadDefaultSettings().then(_ => {
        while (scriptWrapper.firstChild) {
            scriptWrapper.removeChild(scriptWrapper.firstChild)
        }

        let newSceneHeading = document.createElement("sceneheading")
        newSceneHeading.appendChild(document.createElement("br"))
        let newPage = document.createElement("div")
        newPage.setAttribute("contenteditable", "true")
        newPage.classList.add("page")
        newPage.appendChild(newSceneHeading)
        scriptWrapper.appendChild(newPage)
        setSelection(newSceneHeading, 0)
    }).catch(e => console.warn(e));
}

document.getElementById("script-upload").addEventListener("change", handleFileInput)
scriptWrapper.addEventListener("keydown", handleKeyDown)
document.getElementById("download-fdx").addEventListener("click", downloadFDX)
document.getElementById("new-blank").addEventListener("click", newBlankScript)
loadDefaultSettings();
setSelection(scriptWrapper.children[0].children[0], 0)

// Fuck it, let's just ask Claude

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
    page.setAttribute("contenteditable", "true")
    page.classList.add(options.pageClassName);
    Object.assign(page.style, {
        // boxSizing: 'border-box',
        // paddingTop: `${marginTopIn}in`,
        // paddingBottom: `${marginBottomIn}in`,
        // height: 'auto',
        overflow: 'visible',
        minHeight: '0',
    });
    return page;
}
/**
     * Attempts to split `el` (already appended as currentPage's last child,
     * currently causing overflow) into a portion that fits on currentPage
     * plus a "(MORE)" line, and a continuation portion that gets requeued
     * onto a fresh page under a repeated "NAME (CONT'D)" cue.
     * @param {HTMLElement} el
     * @param {HTMLElement} currentPage
     * @param {HTMLElement[]} pages
     * @param {HTMLElement[]} queue
     * @param {HTMLDivElement} sandbox
     * @param {string} lastCharacterText
     * @param {number} pageHeightPx
     * @param {PaginationOptions} options
     * @returns {[HTMLElement, boolean]} True if the split was performed.
     */
function attemptSplitDialogue(el, currentPage, pages, queue, sandbox, lastCharacterText, pageHeightPx, options) {
    const originalText = el.textContent;
    // Split on whitespace but keep the whitespace tokens so rejoining
    // reproduces the original spacing exactly.
    const tokens = originalText.split(/(\s+)/);

    const moreEl = document.createElement(options.characterTagName);
    moreEl.textContent = options.moreText;
    moreEl.dataset.generated = 'more';
    currentPage.appendChild(moreEl);

    const fits = (n) => {
        el.textContent = tokens.slice(0, n).join('');
        return [currentPage, !overflowsPage(currentPage, pageHeightPx)];
    };

    if (!fits(0)) {
        // Even empty dialogue + "(MORE)" doesn't fit — no room to split here.
        currentPage.removeChild(moreEl);
        el.textContent = originalText;
        return [currentPage, false];
    }

    let lo = 0;
    let hi = tokens.length;
    while (lo < hi) {
        const mid = Math.ceil((lo + hi) / 2);
        if (fits(mid)) lo = mid; else hi = mid - 1;
    }

    const firstText = tokens.slice(0, lo).join('').trim();
    const remainderText = tokens.slice(lo).join('').trim();
    const firstWordCount = firstText ? firstText.split(/\s+/).length : 0;
    const remainderWordCount = remainderText ? remainderText.split(/\s+/).length : 0;

    if (
        !firstText ||
        !remainderText ||
        firstWordCount < options.minWordsBeforeSplit ||
        remainderWordCount < options.minWordsAfterSplit
    ) {
        currentPage.removeChild(moreEl);
        el.textContent = originalText;
        return [currentPage, false];
    }

    el.textContent = firstText;

    const contdEl = document.createElement(options.characterTagName);
    contdEl.textContent = lastCharacterText ? `${lastCharacterText} ${options.contdText}` : options.contdText;
    contdEl.dataset.generated = 'contd';

    const continuation = document.createElement(options.dialogueTagName);
    continuation.className = el.className; // carry over any authored styling hooks
    continuation.textContent = remainderText;

    pages.push(currentPage);
    currentPage = createPage(options);
    sandbox.appendChild(currentPage);
    currentPage.appendChild(contdEl);

    queue.unshift(continuation);
    return [currentPage, true];
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
 * @returns 
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
 * @param {PaginationOptions} [options]
 * @returns {HTMLElement[]} Array of page container elements, populated and
 *   detached (not yet appended anywhere).
 */
function paginateScreenplay(elements, options = {
    pageClassName: 'page',
    pageHeightIn: 11,
    characterTagName: 'character',
    dialogueTagName: 'dialogue',
    moreText: '(MORE)',
    contdText: "(CONT'D)",
    minWordsBeforeSplit: 4,
    minWordsAfterSplit: 4,
    isKeepWithNext: null,
}) {

    const PX_PER_IN = 96;
    const pageHeightPx = options.pageHeightIn * PX_PER_IN;

    const sandbox = document.createElement('div');
    Object.assign(sandbox.style, {
        position: 'absolute',
        left: '-99999px',
        top: '0',
        // visibility: 'hidden',
        pointerEvents: 'none',
    });
    document.body.appendChild(sandbox);



    /**@type {HTMLElement[]} */
    const pages = [];
    let currentPage = createPage(options);
    sandbox.appendChild(currentPage);

    // A queue (not a plain for-loop) lets us push continuation pieces of a
    // split dialogue back in to be processed like any other element —
    // including being split again if they're still too long.
    const queue = elements.slice();
    let lastCharacterText = '';



    while (queue.length) {
        const el = queue.shift();
        const tag = el.tagName.toLowerCase();

        if (tag === options.characterTagName) {
            lastCharacterText = el.textContent.trim();
        }

        currentPage.appendChild(el);
        if (overflowsPage(currentPage, pageHeightPx)) {
            console.log("DEBUG:\tSplitting Page")
            if (tag === options.dialogueTagName) {
                let ok = false;
                [currentPage, ok] = attemptSplitDialogue(el, currentPage, pages, queue, sandbox, lastCharacterText, pageHeightPx, options)
                if (ok) {
                    console.log("DEBUG:\tSplitting Dialogue")
                    continue; // continuation requeued; new page already has its CONT'D cue
                }
                if (currentPage.children.length === 1) {
                    console.warn('DEBUG:\t paginateScreenplay -> dialogue taller than one page and unsplittable; allowing overflow.', el);
                } else {
                    currentPage.removeChild(el);
                    currentPage = startNewPageWith(el, pages, currentPage, sandbox, options);
                }
            } else if (currentPage.children.length === 1) {
                console.warn('DEBUG:\tpaginateScreenplay -> element taller than one page; allowing overflow.', el);
            } else {
                currentPage.removeChild(el);
                currentPage = startNewPageWith(el, pages, currentPage, sandbox, options);
            }
        }

        if (options.isKeepWithNext && currentPage.lastElementChild === el && isKeepWithNext(el)) {
            const isLastOverall = queue.length === 0;
            let nextWouldOverflow = false;
            if (!isLastOverall) {
                const next = queue[0];
                currentPage.appendChild(next);
                nextWouldOverflow = overflowsPage(currentPage, pageHeightPx);
                currentPage.removeChild(next);
            }
            if (isLastOverall || nextWouldOverflow) {
                currentPage.removeChild(el);
                currentPage = startNewPageWith(el, pages, currentPage, sandbox, options);
            }
        }
    }

    pages.push(currentPage);
    // pages.forEach((page) => sandbox.removeChild(page));
    document.body.removeChild(sandbox);

    return pages;
}