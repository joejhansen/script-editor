import { LAST_SCRIPT_SETTINGS_KEY } from "./LocalStorage.js";
import { PopoverPanel } from "./PopoverPanel.js";
import { PIXELS_PER_INCH, POINTS_PER_INCH } from "./ScriptSettings.js";
import styles from "./windows/settings/settings.css" with {type: "css" };

/**
 * @typedef {{type: "page", data: Margins} | 
 * {type:"element", 
 * name: "sceneheading"|
 * "action" | 
 * "character"| 
 * "dialogue"| 
 * "parenthetical"| 
 * "transition"| 
 * "shot"| 
 * "sequence"| 
 * "newact"| 
 * "endofact"| 
 * "castlist"| 
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
 * @property {ScriptElementSettings} general 
 * @property {ScriptElementSettings} sceneheading
 * @property {ScriptElementSettings} action
 * @property {ScriptElementSettings} character
 * @property {ScriptElementSettings} parenthetical
 * @property {ScriptElementSettings} dialogue
 * @property {ScriptElementSettings} transition
 * @property {ScriptElementSettings} shot
 * @property {ScriptElementSettings} sequence
 * @property {ScriptElementSettings} newact
 * @property {ScriptElementSettings} endofact
 * @property {ScriptElementSettings} castlist
*/
/**
 * @typedef {Object} StyleSettings
 * @property {boolean} Italic
 * @property {boolean} Bold
 * @property {boolean} Underline
 * @property {boolean} AllCaps
 */
/**
 * @typedef {Object} Margins
 *  @property {number} top
 *  @property {number} right
 *  @property {number} bottom
 *  @property {number} left
 */
/** @typedef {"Left"|"Center"|"Right"} TextAlignment */
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
 * 
 * @param {ScriptElements} menuSettings
 * @param {import("./ScriptSettings.js").ElementSettings} localSettings
 * @returns {import("./ScriptSettings.js").ElementSettings} 
 */
export function ScriptElementsToElementSettings(menuSettings, localSettings) {
    for (const [name, val] of Object.entries(menuSettings)) {
        localSettings[name] = ScriptElementToElementSetting(val)
    }
    return localSetting;
}
/**
 * 
 * @param {ScriptElementSettings} menuSetting 
 * @param {import("./ScriptSettings.js").ElementSetting} localSetting
 * @returns {import("./ScriptSettings.js").ElementSetting}
 */
export function ScriptElementToElementSetting(menuSetting, localSetting) {
    let styleString = "";
    for (const [name, val] of Object.entries(menuSetting.styles)) {
        if (val) {
            if (styleString.length) {
                styleString += `+${name}`
            } else {
                styleString += name;
            }
        }
    }
    localSetting.Style = styleString;
    localSetting.Font = menuSetting.font.name
    localSetting.Size = menuSetting.font.size
    localSetting.FirstIndent = menuSetting.paragraph.indent
    localSetting.Alignment = menuSetting.paragraph.textAlign
    localSetting.LeftIndent = menuSetting.margins.left
    localSetting.RightIndent = menuSetting.margins.right
    localSetting.SpaceBefore = menuSetting.margins.top

    return localSetting;
}





export class SettingsPanel extends PopoverPanel {
    static styles = styles;
    static templateId = 'template-settings';
    settings = this.newSettings();
    ElementSettings = null;
    PageSettings = null;
    ElementSelect = null;
    LastSettings = null;
    CurrentElement = "sceneHeading"

    init(root) {
        /** @type {import("./ScriptSettings.js").ElementSettings} */
        this.LastSettings = JSON.parse(localStorage.getItem(LAST_SCRIPT_SETTINGS_KEY))
        // console.log(this.LastSettings)
        // console.log(this.settings)
        // for (let [elName, setting] of Object.entries(this.LastSettings)) {
        //     this.updateSettings(
        //         {
        //             type: "element",
        //             name: elName,
        //             data: this.newScriptElement(
        //                 this.newMarginSettings(setting.SpaceBefore, setting.RightIndent, undefined, setting.LeftIndent)
        //             )
        //         }
        //     )
        // }
        // console.log(this.settings)
        this.ElementSettings = root.getElementById("element-settings")
        this.PageSettings = root.getElementById("page-settings")
        this.ElementSelect = root.getElementById("element-select")
        this.ElementSelect.addEventListener("change", (e) => this.handleChangeElement(e, root))
        root.getElementById("settings-cancel").addEventListener("click", (e) => this.handleClose(e, root))
        root.getElementById("settings-save").addEventListener("click", (e) => this.handleSave(e, root))
        this.renderSettings(root);
    }
    /**
 * @param {SettingsUpdate} payload 
 */
    updateSettings(payload) {
        if (payload.type === "element") {
            this.settings.elements[payload.name] = payload.data
        } else if (payload.type === "page") {
            this.settings.page = payload.data;
        }
    }
    /**
 * 
 * @param {ScriptElementSettings} action 
 * @param {ScriptElementSettings} character 
 * @param {ScriptElementSettings} dialogue 
 * @param {ScriptElementSettings} parenthetical 
 * @param {ScriptElementSettings} transition 
 * @param {ScriptElementSettings} shot 
 * @param {ScriptElementSettings} sequence 
 * @param {ScriptElementSettings} newact 
 * @param {ScriptElementSettings} endofact 
 * @param {ScriptElementSettings} castlist 
 * @param {ScriptElementSettings} general 
 * @returns {ScriptElements}
 */
    newScriptElements(
        sceneheading = this.newScriptElement(this.newMarginSettings(32), this.newStyleSettings(true)),
        action = this.newScriptElement(
            this.newMarginSettings(DEFAULT_FONT_SIZE)
        ),
        character = this.newScriptElement(
            this.newMarginSettings(
                DEFAULT_FONT_SIZE,
                1 * .25,
                undefined,
                1 * 2
            ),
            this.newStyleSettings(true)
        ),
        dialogue = this.newScriptElement(
            this.newMarginSettings(
                undefined,
                1 * 1.5,
                undefined,
                1
            ),
        ),
        parenthetical = this.newScriptElement(
            this.newMarginSettings(
                undefined,
                1 * 2,
                undefined,
                1 * 1.5
            ),
            undefined,
            undefined,
            this.newParagraphSettings(
                1 * -0.1
            )
        ),
        transition = this.newScriptElement(
            this.newMarginSettings(
                DEFAULT_FONT_SIZE
            ),
            this.newStyleSettings(true),
            undefined,
            this.newParagraphSettings(undefined, "Right")

        ),
        shot = this.newScriptElement(
            this.newMarginSettings(DEFAULT_FONT_SIZE * 2),
            this.newStyleSettings(true)
        ),
        sequence = this.newScriptElement(
            this.newMarginSettings(DEFAULT_FONT_SIZE * 2),
            this.newStyleSettings(true, true, false, true),
            undefined,
            this.newParagraphSettings(1 * -0.25)
        ),
        newact = this.newScriptElement(
            this.newMarginSettings(DEFAULT_FONT_SIZE),
            this.newStyleSettings(true, true, false, true),
            undefined,
            this.newParagraphSettings(1 * -0.25)
        ),
        endofact = this.newScriptElement(
            this.newMarginSettings(DEFAULT_FONT_SIZE * 2),
            this.newStyleSettings(true, true, false, true),
            undefined,
            this.newParagraphSettings(1 * -0.25)
        ),
        castlist = this.newScriptElement(),
        general = this.newScriptElement(),
    ) {
        return {
            sceneheading: sceneheading,
            action: action,
            castlist: castlist,
            character: character,
            dialogue: dialogue,
            endofact: endofact,
            general: general,
            newact: newact,
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
    newScriptElement(
        margins = this.newMarginSettings(),
        styles = this.newStyleSettings(),
        font = this.newFontSettings(),
        paragraph = this.newParagraphSettings()
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
    newFontSettings(
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
    newMarginSettings(
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
    newStyleSettings(
        allCaps = false,
        bold = false,
        italics = false,
        underline = false
    ) {
        return {
            AllCaps: allCaps,
            Bold: bold,
            Italic: italics,
            Underline: underline,
        }
    }
    /**
     * @param {number} indent
     * @param {TextAlignment} textAlign
     * @returns {ParagraphSettings}
     */
    newParagraphSettings(
        indent = 0,
        textAlign = "Left"
    ) {
        return {
            indent: indent,
            textAlign: textAlign,
        }
    }
    /** 
 * @returns {ScriptSettings} 
 */
    newSettings(
        elements = this.newScriptElements(),
        page = this.newMarginSettings(
            1,
            1,
            1,
            1.5
        )
    ) {
        return {
            elements: elements,
            page: page
        }
    }
    renderSettings(root) {
        this.renderPageSettings(root)
        this.renderElementSettings(root)
    }
    renderPageSettings(root) {
        for (const [key, val] of Object.entries(this.settings.page)) {
            root.getElementById(`page-${key}Margin`).value = val;
        }
    }
    renderElementSettings(root) {
        const currentElement = this.ElementSelect.value;
        console.log(this.settings.elements[this.ElementSelect.value])
        root.getElementById("element-topMargin").value = this.settings.elements[currentElement].margins.top
        root.getElementById("element-bottomMargin").value = this.settings.elements[currentElement].margins.bottom
        root.getElementById("element-leftMargin").value = this.settings.elements[currentElement].margins.left
        root.getElementById("element-rightMargin").value = this.settings.elements[currentElement].margins.right
        root.getElementById("font").value = this.settings.elements[currentElement].font.name
        root.getElementById("fontSize").value = this.settings.elements[currentElement].font.size
        root.getElementById("indent").value = this.settings.elements[currentElement].paragraph.indent
        root.getElementById("textAlign").value = this.settings.elements[currentElement].paragraph.textAlign
        root.getElementById("bold").checked = this.settings.elements[currentElement].styles.Bold
        root.getElementById("italics").checked = this.settings.elements[currentElement].styles.Italic
        root.getElementById("underline").checked = this.settings.elements[currentElement].styles.Underline
        root.getElementById("allCaps").checked = this.settings.elements[currentElement].styles.AllCaps
    }
    handleChangeElement(event, root) {
        this.settings.elements[this.CurrentElement] = this.grabElementSettings(event, root);
        this.renderElementSettings(root)
        this.CurrentElement = event.target.value;
    }
    /**
 * @param {PointerEvent} event 
 */
    handleSave(event, root) {
        // this.LastSettings = ScriptElementsToElementSettings(this.settings.elements, this.LastSettings)
        // localStorage.setItem(LAST_SCRIPT_SETTINGS_KEY, this.LastSettings)
        document.getElementById("btn-settings").click();
    }

    /**
     * @param {PointerEvent} event 
     */
    handleClose(event, root) {
        document.getElementById("btn-settings").click();
    }
    /**
    * @param {Event} event
    * @returns {ScriptElementSettings}
    */
    grabElementSettings(event, root) {
        // const MarginsSection = root.getElementById("element-margins")
        // const FontsSection = root.getElementById("fonts")
        // const ParagraphSection = root.getElementById("indent-alignment")
        // const StyleSection = root.getElementById("styling")

        return {
            font: this.newFontSettings(
                root.getElementById("font").value,
                parseFloat(root.getElementById("fontSize").value) || 16
            ),
            margins: this.newMarginSettings(
                parseFloat(root.getElementById("element-topMargin").value) || 0,
                parseFloat(root.getElementById("element-rightMargin").value) || 0,
                parseFloat(root.getElementById("element-bottomMargin").value) || 0,
                parseFloat(root.getElementById("element-leftMargin").value) || 0,
            ),
            paragraph: this.newParagraphSettings(
                parseFloat(root.getElementById("indent").value) || 0,
                root.getElementById("textAlign").value,
            ),
            styles: this.newStyleSettings(
                root.getElementById("allCaps").checked,
                root.getElementById("bold").checked,
                root.getElementById("italics").checked,
                root.getElementById("underline").checked,
            )
        }
    }
}

customElements.define('settings-panel', SettingsPanel);