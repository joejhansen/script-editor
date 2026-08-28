import { LAST_SCRIPT_SETTINGS_KEY } from "../../LocalStorage.js";
import { PIXELS_PER_INCH, POINTS_PER_INCH } from "../../ScriptSettings.js";

/**
 * @typedef {{type: "page", data: Margins} | 
 * {type:"element", 
 * name: "action" | 
 * "character"| 
 * "dialogue"| 
 * "parenthetical"| 
 * "transition"| 
 * "shot"| 
 * "sequence"| 
 * "newAct"| 
 * "endofAct"| 
 * "castList"| 
 * "general"
 * , 
 * data: ScriptElementSettings}} SettingsUpdate 
 */

/** 
 * @typedef {Object} ScriptSettings 
 * @property {Margins} page
 * @property {ScriptElements} elements
 */
/** 
/**
 * @typedef {Object} ScriptElements
 * @property {ScriptElementSettings} action
 * @property {ScriptElementSettings} character
 * @property {ScriptElementSettings} dialogue
 * @property {ScriptElementSettings} parenthetical
 * @property {ScriptElementSettings} transition
 * @property {ScriptElementSettings} shot
 * @property {ScriptElementSettings} sequence
 * @property {ScriptElementSettings} newAct
 * @property {ScriptElementSettings} endofAct
 * @property {ScriptElementSettings} castList
 * @property {ScriptElementSettings} general 
*/
/**
 * @typedef {Object} StyleSettings
 * @property {boolean} italics
 * @property {boolean} bold
 * @property {boolean} underline
 * @property {boolean} allCaps
 */
/**
 * @typedef {Object} Margins
 *  @property {number} top
 *  @property {number} right
 *  @property {number} bottom
 *  @property {number} left
 */
/** @typedef {"left"|"center"|"right"} TextAlignment */
/**
 * @typedef {Object} ParagraphSettings
 * @property {number} indent
 * @property {TextAlignment} textAlign
 */
/** 
 * @typedef {Object} FontSettings
 * @property {string} name
 * @property {number} size
 */
/**
 * @typedef {Object} ScriptElementSettings
 * @property {Margins} margins
 * @property {StyleSettings} styles
 * @property {FontSettings} font
 * @property {ParagraphSettings} paragraph
 */

const DEFAULT_FONT_SIZE = 16;


/** 
 * @returns {ScriptSettings} 
 */
function newSettingsWindow(
    elements = newScriptElements(),
    page = newMarginSettings(
        PIXELS_PER_INCH,
        PIXELS_PER_INCH,
        PIXELS_PER_INCH,
        PIXELS_PER_INCH * 1.5
    )
) {
    return {
        elements: elements,
        page: page
    }
}

/**
 * @returns {ScriptElements}
 */
/**
 * 
 * @param {ScriptElementSettings} action 
 * @param {ScriptElementSettings} character 
 * @param {ScriptElementSettings} dialogue 
 * @param {ScriptElementSettings} parenthetical 
 * @param {ScriptElementSettings} transition 
 * @param {ScriptElementSettings} shot 
 * @param {ScriptElementSettings} sequence 
 * @param {ScriptElementSettings} newAct 
 * @param {ScriptElementSettings} endofAct 
 * @param {ScriptElementSettings} castList 
 * @param {ScriptElementSettings} general 
 * @returns {ScriptElements}
 */
function newScriptElements(
    action = newScriptElement(
        newMarginSettings(DEFAULT_FONT_SIZE)
    ),
    character = newScriptElement(
        newMarginSettings(
            DEFAULT_FONT_SIZE,
            PIXELS_PER_INCH * .25,
            undefined,
            PIXELS_PER_INCH * 2
        ),
        newStyleSettings(true)
    ),
    dialogue = newScriptElement(
        newMarginSettings(
            undefined,
            PIXELS_PER_INCH * 1.5,
            undefined,
            PIXELS_PER_INCH
        ),
    ),
    parenthetical = newScriptElement(
        newMarginSettings(
            undefined,
            PIXELS_PER_INCH * 2,
            undefined,
            PIXELS_PER_INCH * 1.5
        ),
        undefined,
        undefined,
        newParagraphSettings(
            PIXELS_PER_INCH * -0.1
        )
    ),
    transition = newScriptElement(
        newMarginSettings(
            DEFAULT_FONT_SIZE
        ),
        newStyleSettings(true),
        undefined,
        newParagraphSettings(undefined, "right")

    ),
    shot = newScriptElement(
        newMarginSettings(DEFAULT_FONT_SIZE * 2),
        newStyleSettings(true)
    ),
    sequence = newScriptElement(
        newMarginSettings(DEFAULT_FONT_SIZE * 2),
        newStyleSettings(true, true, false, true),
        undefined,
        newParagraphSettings(PIXELS_PER_INCH * -0.25)
    ),
    newAct = newScriptElement(
        newMarginSettings(DEFAULT_FONT_SIZE),
        newStyleSettings(true, true, false, true),
        undefined,
        newParagraphSettings(PIXELS_PER_INCH * -0.25)
    ),
    endofAct = newScriptElement(
        newMarginSettings(DEFAULT_FONT_SIZE * 2),
        newStyleSettings(true, true, false, true),
        undefined,
        newParagraphSettings(PIXELS_PER_INCH * -0.25)
    ),
    castList = newScriptElement(),
    general = newScriptElement(),
) {
    return {
        action: action,
        castList: castList,
        character: character,
        dialogue: dialogue,
        endofAct: endofAct,
        general: general,
        newAct: newAct,
        parenthetical: parenthetical,
        sequence: sequence,
        shot: shot,
        transition: transition,
    }
}
/**
 * @param {Margins} margins
 * @param {StyleSettings} styles
 * @param {FontSettings} font
 * @param {ParagraphSettings} paragraph
 * @returns {ScriptElementSettings}
 */
function newScriptElement(
    margins = newMarginSettings(),
    styles = newStyleSettings(),
    font = newFontSettings(),
    paragraph = newParagraphSettings()
) {
    return {
        font: font,
        margins: margins,
        styles: styles,
        paragraph: paragraph
    }
}
/**
 * @param {string} name
 * @param {number} size
 * @returns {FontSettings}
 */
function newFontSettings(
    name = "Courier New",
    size = 16
) {
    return {
        name: name,
        size: size,
    }
}
/**
 * @param {number} top
 * @param {number} right
 * @param {number} bottom
 * @param {number} left
 * @returns {Margins}
 */
function newMarginSettings(
    top = 0,
    right = 0,
    bottom = 0,
    left = 0
) {
    return {
        top: top,
        right: right,
        bottom: bottom,
        left: left,
    }
}
/**
 * @param {boolean} allCaps
 * @param {boolean} bold
 * @param {boolean} italics
 * @param {boolean} underline
 * @returns {StyleSettings}
 */
function newStyleSettings(
    allCaps = false,
    bold = false,
    italics = false,
    underline = false
) {
    return {
        allCaps: allCaps,
        bold: bold,
        italics: italics,
        underline: underline,
    }
}
/**
 * @param {number} indent
 * @param {TextAlignment} textAlign
 * @returns {ParagraphSettings}
 */
function newParagraphSettings(
    indent = 0,
    textAlign = "left"
) {
    return {
        indent: indent,
        textAlign: textAlign,
    }
}

let settings = newSettingsWindow();

/**
 * @param {SettingsUpdate} payload 
 */
function updateSettings(payload) {
    if (payload.type === "element") {
        settings.elements[payload.name] = payload.data
    } else if (payload.type === "page") {
        settings.page = payload.data;
    }
}
/**
 * @param {PointerEvent} event 
 */
function handleSaveSettings(event) { }

/**
 * @param {PointerEvent} event 
 */
function handleCloseSettings(event) {

}

/**
 * 
 * @param {Event} event
 * @returns {ScriptElementSettings}
 */
function grabElementSettings(event) {
    const MarginsSection = ElementSettings.getElementById("element-margins")
    const FontsSection = ElementSettings.getElementById("fonts")
    const ParagraphSection = ElementSettings.getElementById("indent-alignment")
    const StyleSection = ElementSettings.getElementById("styling")

    return {
        font: newFontSettings(
            FontsSection.getElementById("font").value,
            parseFloat(FontsSection.getElementById("fontSize").value) || 16
        ),
        margins: newMarginSettings(
            parseFloat(MarginsSection.getElementById("element-topMargin").value) || 0,
            parseFloat(MarginsSection.getElementById("element-rightMargin").value) || 0,
            parseFloat(MarginsSection.getElementById("element-bottomMargin").value) || 0,
            parseFloat(MarginsSection.getElementById("element-leftMargin").value) || 0,
        ),
        paragraph: newParagraphSettings(
            parseFloat(ParagraphSection.getElementById("indent").value) || 0,
            ParagraphSection.getElementById("textAlign").value,
        ),
        styles: newStyleSettings(
            FontsSection.getElementById("allCaps").checked,
            FontsSection.getElementById("bold").checked,
            FontsSection.getElementById("italics").checked,
            FontsSection.getElementById("underline").checked,
        )
    }
}

function handleChangeElement(event) {
    console.log("here")
}
const ElementSettings = document.getElementById("element-settings")
const PageSettings = document.getElementById("page-settings")
const ElementSelect = document.getElementById("element-select")
ElementSelect.addEventListener("change", handleChangeElement)
function init() {
    /** @type {import("../../ScriptSettings.js").ElementSettings} */
    let lastSettings = JSON.parse(localStorage.getItem(LAST_SCRIPT_SETTINGS_KEY))
    for (let [elName, setting] of Object.entries(lastSettings)) {
        if (lastSettings[elName]) {
            updateSettings(
                {
                    type: "element",
                    name: elName,
                    data: newScriptElement(
                        newMarginSettings(setting.SpaceBefore, setting.RightIndent,)
                    )
                }
            )
        }
    }
}