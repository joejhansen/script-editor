import { forceScale, scalePage } from "./PageScaler.js";
import { paginateScreenplay } from "./Pagination.js";
import { ALL_CAPS_ELEMENTS, DEFAULT_FONT_SIZE_PIXELS, DEFAULT_FONT_SIZE_POINTS, DEFAULT_LEFT_MARGIN_INCHES, DEFAULT_PAGE_HEIGHT_INCHES, DEFAULT_PAGE_WIDTH_INCHES, NOTE_ELEMENTS, PIXELS_PER_INCH, POINTS_PER_INCH, tagToFDXType } from "./ScriptSettings.js";
import { getAllScreenplayElements, getElementMaxWidth } from "./UX.js";

const { PDFDocument, StandardFonts, rgb } = PDFLib
const { fontkit } = window.fontkit

/** @typedef {`${string}-${string}-${string}-${string}-${string}`} UUIDString*/
const ScriptNotesEL = document.getElementsByTagName("scriptnotes")[0]
const ScriptNoteTemplate = ScriptNotesEL.getElementsByTagName("template")[0].content.querySelector("scriptnote")
const ScenePropertiesEl = document.getElementsByTagName("sceneproperties")[0]
const ScenePropertyTemplate = ScenePropertiesEl.getElementsByTagName("template")[0].content.querySelector("sceneproperty")
/** @type {HTMLElement | null} */
let lastNoteOpened = null;
/**
 * @param {Event} e 
 */
export function handleOpenNote(e) {
    e.preventDefault();
    e.stopPropagation()
    /** @type {HTMLElement} */
    const someEl = e.target.parentElement
    if (someEl.querySelector("content").classList.toggle("active")) {
        lastNoteOpened?.classList.toggle("active")
        lastNoteOpened = someEl.querySelector("content");
    } else {
        lastNoteOpened = null;
    }
}
/**
 * For some reason, FDX uses ISO 8601 dates but without any punctuation or the last character "Z"
 * @param {string} str 
 * @returns {string}
 */
function FDXDateToJSDate(str) {
    return `${str.substring(0, 4)}-${str.substring(4, 6)}-${str.substring(6, 11)}:${str.substring(11, 13)}:${str.substring(13)}Z`
}
/**
 * @param {string} str 
 * @returns {string}
 */
function JSDateToFDXDate(str) {
    let res = "";
    try {
        const NewDate = new Date(str)
        res = NewDate.toISOString().replace(/[-:Z.]/g, "")
    } catch (e) {
        console.warn(e)
    }
    return res;
}
/**
 * @param {Element} note 
 * @returns {UUIDString}
*/
function scriptNoteToHTML(note) {

    /**@type {HTMLElement} */
    const NewScriptNote = document.importNode(ScriptNoteTemplate, true)
    // const NewScriptNote = document.createElement("scriptnote")
    for (const Attribute of ["Author", "Color", "DateModified", "DateTime", "Name", "Type"]) {
        let thisAttribute = note.getAttribute(Attribute);
        NewScriptNote.dataset[Attribute] = thisAttribute
        if (Attribute === "DateModified" || Attribute === "DateTime") {
            const NewDate = new Date(FDXDateToJSDate(thisAttribute));
            thisAttribute = `${NewDate.toLocaleDateString()} ${NewDate.toLocaleTimeString()}`
            NewScriptNote.getElementsByClassName(`note-${Attribute[0].toLowerCase()}${Attribute.substring(1)}`)[0].textContent = `${Attribute.substring(0, 4)} ${Attribute.substring(4)}: ${thisAttribute}`
        } else if (thisAttribute){
            NewScriptNote.getElementsByClassName(`note-${Attribute[0].toLowerCase()}${Attribute.substring(1)}`)[0].textContent = `${Attribute}: ${thisAttribute}`
        }
    }
    NewScriptNote.getElementsByClassName("note-content")[0].textContent = `Note: ${note.textContent}`;
    const NewUUID = window.crypto.randomUUID()
    NewScriptNote.style.positionAnchor = "--" + NewUUID
    NewScriptNote.style.top = `anchor(--${NewUUID} top)`
    NewScriptNote.style.right = `anchor(--${NewUUID} right)`
    NewScriptNote.querySelector("img").addEventListener("click", handleOpenNote)
    NewScriptNote.dataset.noteID = NewUUID
    NewScriptNote.id = NewUUID
    ScriptNotesEL.appendChild(NewScriptNote)
    return NewUUID;
}
/**
 * @param {HTMLElement} el 
 * @param {Document} doc
 * @returns {Element}
 */
export function htmlToScriptNote(el, doc) {
    const NewScriptNote = doc.createElement("ScriptNote");
    const NewParagraph = doc.createElement("Paragraph");
    const NewText = doc.createElement("Text")
    for (const Attribute of ["Author", "Color", "DateModified", "DateTime", "Name", "Type"]) {
        NewScriptNote.setAttribute(Attribute, el.dataset[Attribute])
    }
    NewText.textContent = el.textContent.substring(el.textContent.lastIndexOf(":") + 2);
    NewParagraph.appendChild(NewText)
    NewScriptNote.appendChild(NewParagraph)
    return NewScriptNote;
}

/**
 * 
 * @param {Element} note 
 * @returns {UUIDString}
 */
function scenePropertiesToHTML(note) {
    const NewSceneProperties = document.importNode(ScenePropertyTemplate, true)
    // length and page number have to updated programatically
    for (const Attribute of ["Length", "Page", "Title"]) {
        const ThisAttribute = note.getAttribute(Attribute);
        NewSceneProperties.dataset[Attribute] = ThisAttribute
        NewSceneProperties.getElementsByClassName(`scene-prop-${Attribute[0].toLowerCase()}${Attribute.substring(1)}`)[0].textContent = `${Attribute}: ${ThisAttribute}`
    }
    const CharacterArcBeats = note.getElementsByTagName("CharacterArcBeat")
    for (const CharArcBeat of CharacterArcBeats) {
        const NewCharArc = document.createElement("characterarcbeat")
        NewCharArc.dataset["Name"] = CharArcBeat.getAttribute("Name")
        NewCharArc.textContent = CharArcBeat.getElementsByTagName("Text")[0]?.textContent;
        NewSceneProperties.querySelector("content").appendChild(NewCharArc)
    }
    const NewUUID = window.crypto.randomUUID()
    NewSceneProperties.style.positionAnchor = "--" + NewUUID
    NewSceneProperties.style.top = `anchor(--${NewUUID} top)`
    NewSceneProperties.style.right = `anchor(--${NewUUID} right)`
    NewSceneProperties.querySelector("img").addEventListener("click", handleOpenNote)
    NewSceneProperties.dataset.noteID = NewUUID
    NewSceneProperties.id = NewUUID
    ScenePropertiesEl.appendChild(NewSceneProperties)
    return NewUUID;
}

/**
 * @param {HTMLElement} el 
 * @param {Document} doc
 * @returns {Element}
 */
export function htmlToSceneProperties(el, doc) {
    const NewSceneProperties = doc.createElement("SceneProperties");
    NewSceneProperties.setAttribute("Length", el.dataset["Length"]);
    NewSceneProperties.setAttribute("Page", el.dataset["Page"]);
    NewSceneProperties.setAttribute("Title", el.dataset["Title"]);
    const NewSceneArcBeats = doc.createElement("SceneArcBeats")
    for (const CharArc of el.querySelectorAll("characterarcbeat")) {
        const NewCharArc = doc.createElement("CharacterArcBeat")
        const NewParagraph = doc.createElement("Paragraph")
        const NewText = doc.createElement("Text")
        NewCharArc.setAttribute("Name", CharArc.dataset["Name"])
        NewText.textContent = CharArc.textContent;
        NewParagraph.appendChild(NewText)
        NewCharArc.appendChild(NewParagraph)
        NewSceneArcBeats.appendChild(NewCharArc)
    }
    NewSceneProperties.appendChild(NewSceneArcBeats)
    return NewSceneProperties
}

/**
 * @param {Element} el 
 * @returns {HTMLElement[]}
 */
function EltoHTML(el) {
    let elType = el.getAttribute("Type").replace(/\s/g, "").toLowerCase();
    /** @type {HTMLElement[]} */
    let res = [];
    /** @type {UUIDString} */
    let elInnerHTML = "";
    let newEl = document.createElement(elType)
    for (let tag of el.children) {
        if (tag.tagName === "ScriptNote") {
            const NewUUID = scriptNoteToHTML(tag);
            newEl.dataset.noteID = NewUUID;
            newEl.style.anchorName = "--" + NewUUID
        } else if (tag.tagName === "SceneProperties") {
            const NewUUID = scenePropertiesToHTML(tag);
            newEl.dataset.noteID = NewUUID
            newEl.style.anchorName = "--" + NewUUID
        } else if (tag.tagName === "Text") {
            if (tag.hasAttribute("Style")) {
                const styles = tag.getAttribute("Style").toLowerCase().replace('+', ' ').replace("allcaps", '')
                if (styles) {
                    elInnerHTML += `<span class="${styles}">${tag.textContent}</span>`
                } else {
                    elInnerHTML += tag.textContent;
                }
            } else {
                elInnerHTML += tag.textContent;
            }
        }
    }
    if (elType === "parenthetical") elInnerHTML = elInnerHTML.replace(/[()]/g, "") // parenthesis in parentheticals are assumed and handled by css
    newEl.innerHTML = elInnerHTML;
    res.push(newEl)
    return res
}

/**
 * @param {Document} doc
 * @return {HTMLElement[]}
 */
export function XMLtoHTML(doc) {
    /** @type {Element[]} */
    let res = []
    let contentEls = doc.getElementsByTagName("FinalDraft")[0].getElementsByTagName("Content")[0].children
    for (let el of contentEls) {
        res.push(...EltoHTML(el))
    }
    return res;
}

/**
 * @param {File} file 
 * @returns {Promise<Document>}
 */
export async function parseXMLFromFile(file) {
    const xmlString = await file.text();
    return parseXMLString(xmlString);
}

/**
 * @param {string} xmlString 
 * @returns {Document}
 */
export function parseXMLString(xmlString) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlString, 'text/xml');
    const errorNode = doc.querySelector('parsererror');
    if (errorNode) throw new Error(`XML parsing error: ${errorNode.textContent}`);
    return doc;
}

/**
 * 
 * @param {Script} script 
 */
export async function loadBlankXMLDoc(script) { // globals
    if (script.BlankScriptXML === null) {
        fetch("BlankFD13.fdx")
            .then(res => res.text())
            .then(text => parseXMLString(text))
            .then(doc => {
                // blankScriptXML = doc;
                script.BlankScriptXML = doc;
                // originalXML = blankScriptXML;
                script.OriginalXML = script.BlankScriptXML
                // titlePageOuterHTML = loadTitlePage(originalXML).map(e => e.outerHTML).join('')
                script.TitlePageOuterHTML = loadTitlePage(script.OriginalXML).map(e => e.outerHTML).join('')
            })
            .catch(e => console.warn(e))
    } else {
        // originalXML = blankScriptXML
        script.OriginalXML = script.BlankScriptXML
        // titlePageOuterHTML = loadTitlePage(originalXML).map(e => e.outerHTML).join('')
        script.TitlePageOuterHTML = loadTitlePage(script.OriginalXML).map(e => e.outerHTML).join('')
    }
}

/**
 * 
 * @param {Settings} settings 
 */
export async function loadDefaultSettings(settings) { // globals
    if (settings.DefaultScriptSettings === null || settings.DefaultPageSettings === null) {
        fetch("DefaultSettings.xml")
            .then(res => res.text())
            .then(text => parseXMLString(text))
            .then((doc) => {
                // defaultPageSettings = LoadPageSettings(doc, settings);
                settings.DefaultPageSettings = LoadPageSettings(doc);
                // pageSettings = defaultPageSettings;
                settings.PageSettings = settings.DefaultPageSettings;
                // defaultScriptSettings = LoadElSettings(doc);
                settings.DefaultScriptSettings = LoadElSettings(doc);
                // scriptSettings = defaultScriptSettings
                settings.ScriptSettings = settings.DefaultScriptSettings;
                if (settings.ScriptSettings === null) throw "DEBUG:\t loadDefaultSettings -> Something went wrong loading scriptSettings"
            })
            .catch(e => console.warn(e))
    } else {
        // scriptSettings = defaultScriptSettings
        settings.ScriptSettings = settings.DefaultScriptSettings;
        settings.PageSettings = settings.DefaultPageSettings
    }
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
export function getCharacterInfo(doc) {
    let res = new Set();
    const charElements = doc.getElementsByTagName("Character")
    for (const char of charElements) {
        res.add(char.textContent)
    }
    return res
}


/** @typedef {{textAlign:string, firstIndent:number, leading:string, leftIndent:number, rightindent:number, spaceBefore:number, spacing:number, startsNewPage:boolean}} TitleTextStyles */
/**
 * 
 * @param {HTMLElement} el 
 * @param {TitleTextStyles} styles 
 */
function assignTitleTextStyles(el, styles) {
    el.dataset.textIndent = styles.firstIndent;
    el.dataset.paddingLeft = (1 - styles.leftIndent);
    el.dataset.paddingRight = (1 + styles.rightindent - 8.5);
    el.dataset.paddingTop = styles.spaceBefore
    el.dataset.lineHeight = styles.spacing
    el.style.textAlign = styles.textAlign === "Full" ? "Left" : styles.textAlign;
    el.dataset.right = styles.textAlign === "Center" ? 0.25 : 0
    // el.style.textIndent = styles.firstIndent.toString() + "in";
    // el.style.paddingLeft = (1 - styles.leftIndent).toString() + "in";
    // el.style.paddingRight = (1 + styles.rightindent - 8.5).toString() + "in";
    // el.style.paddingTop = styles.spaceBefore.toString() + "in"
    // el.style.lineHeight = styles.spacing.toString() + "rem"
    // el.style.right = el.style.textAlign === "center" ? ".25in" : "0"
}

/**
 * @param {Element} para 
 * @returns {TitleTextStyles}
 */
function getTitleParagraphStyles(para) { // TODO: figure this out with respect to scale
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
export function loadTitlePage(doc) {
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
 * @param {State} state
 */
export function downloadFDX(event, state, titlePageButton, fileNameInput) { // globals
    event.preventDefault();
    const button = event.target;
    try {

        const parser = new DOMParser()

        if (!state.Navigation.EditingTitlePage) titlePageButton.click();
        let newTitlePageContent = parser.parseFromString(`<Content>\n</Content>`, "application/xml")
        addTitlePageToXML(newTitlePageContent, document.getElementsByTagName("titletext"))
        titlePageButton.click();

        let newContentDoc = parser.parseFromString(`<Content>\n</Content>`, "application/xml")
        const [allElements, _, __] = getAllScreenplayElements();
        let scriptNoteAdded = false;
        for (const [i, el] of allElements.entries()) {
            if (el.dataset.noteID) {
                HTMLtoFDX(newContentDoc, el, state.Settings, document.getElementById(el.dataset.noteID))
            } else {
                HTMLtoFDX(newContentDoc, el, state.Settings)
            }
        }
        newContentDoc.getElementsByTagName("Content")[0].appendChild(newContentDoc.createTextNode('  '))

        let newCharactersEl = parser.parseFromString(`<Characters>\n</Characters>`, "application/xml")
        for (const character of state.Script.CharacterSet) {
            addCharacterToXML(newCharactersEl, character)
        }
        newCharactersEl.getElementsByTagName("Characters")[0].appendChild(newCharactersEl.createTextNode('      '))


        let FDRoot = state.Script.OriginalXML.getElementsByTagName("FinalDraft")[0];
        FDRoot.getElementsByTagName("TitlePage")[0].replaceChild(newTitlePageContent.getElementsByTagName("Content")[0], FDRoot.getElementsByTagName("TitlePage")[0].getElementsByTagName("Content")[0])
        FDRoot.replaceChild(newContentDoc.getElementsByTagName("Content")[0], FDRoot.getElementsByTagName("Content")[0])
        FDRoot.getElementsByTagName("SmartType")[0].replaceChild(newCharactersEl.getElementsByTagName("Characters")[0], FDRoot.getElementsByTagName("SmartType")[0].getElementsByTagName("Characters")[0])


        const serializer = new XMLSerializer();
        const newXMLStr = serializer.serializeToString(state.Script.OriginalXML)
        const blob = new Blob([newXMLStr], { type: "application/xml" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url;
        a.download = fileNameInput.value ? `${fileNameInput.value}.fdx` : `New Script.fdx`
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
 * @param {Event} e 
 */
export async function downloadPDF(e, navigation, titlePageButton, fileNameInput) { // globals
    e.preventDefault()
    const LetterPageWidth = DEFAULT_PAGE_WIDTH_INCHES * POINTS_PER_INCH;
    const LetterPageHeight = DEFAULT_PAGE_HEIGHT_INCHES * POINTS_PER_INCH;
    const button = e.target;
    button.disabled = true; // simple guard against double-click while generating
    forceScale(1) // hacky, but it avoids manually calculating inverse scale for each element position which can be imprecise and look different between screen sizes.
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
        if (!navigation.EditingTitlePage) {
            titlePageButton.click()
        }
        addPagesToDoc(document.getElementsByClassName("page"), pdfDoc, LetterPageWidth, LetterPageHeight, fonts, sceneCount)
        titlePageButton.click()
        addPagesToDoc(document.getElementsByClassName('page'), pdfDoc, LetterPageWidth, LetterPageHeight, fonts, sceneCount)
        const pdfBytes = await pdfDoc.save();
        triggerDownload(pdfBytes, fileNameInput.value + '.pdf');

    } catch (err) {
        console.error('PDF export failed:', err);
        // Surface this to the user somehow — swallowing it silently will be confusing.
        alert('Something went wrong generating the PDF. Please try again.');
    } finally {
        scalePage() // scale back to appropriate viewing size
        button.disabled = false;
    }
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
            if (NOTE_ELEMENTS.includes(element.tagName)) continue
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
 * @param {Document} doc
 * @param {HTMLElement} el 
 * @param {Settings} settings
 * @param {HTMLElement | null} scriptNote
 */
function HTMLtoFDX(doc, el, settings, scriptNote = null) { // globals
    /** @type {Element|null} */
    let maybeScriptNote = null;
    if (scriptNote) {
        if (scriptNote.tagName === "SCENEPROPERTY") {
            maybeScriptNote = htmlToSceneProperties(scriptNote, doc)
        } else if (scriptNote.tagName === "SCRIPTNOTE") {
            maybeScriptNote = htmlToScriptNote(scriptNote, doc)
        }
    }
    let paraEl = doc.createElement("Paragraph")
    const htmlTag = el.tagName.toLowerCase();
    paraEl.setAttribute("Type", tagToFDXType(htmlTag))
    const newTextEls = [];
    for (let [i, subNode] of el.childNodes.entries()) {
        let textEl = doc.createElement("Text")
        if (subNode.nodeType === 1) { // a span
            textEl.setAttribute("Style", [...subNode.classList].map(str => str.at(0).toUpperCase() + str.substring(1).toLowerCase()).join('+'))
            for (let attr of ["AdornmentStyle", "Background", "Color", "Font", "RevisionID", "Size"]) {
                textEl.setAttribute(attr, settings.ScriptSettings[htmlTag][attr])
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
            let maybeSettingStyle = settings.ScriptSettings[htmlTag] ? settings.ScriptSettings[htmlTag].Style : null
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
    if (maybeScriptNote) {
        doc.getElementsByTagName("Content")[0].appendChild(doc.createTextNode('      '))
        paraEl.appendChild(maybeScriptNote)
        doc.getElementsByTagName("Content")[0].appendChild(doc.createTextNode('\n'))

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