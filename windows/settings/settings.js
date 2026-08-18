/** @typedef {[{label:"Italics", data:boolean}, {label:"Bold", data:boolean}, {label:"Underline", data:boolean}, {label:"AllCaps", data: boolean}]} StyleSettings */
/** @typedef {[{label: "Top Margin", data:number}, {label: "Right Margin", data:number}, {label:"Bottom Margin", data:number}, {label:"Left Margin", data:number}, {label:"Font", data:string}, {label:"Font Size", data:number}, {label:"Indent", data:number},{label:"Text Align", data:"Left"|"Center"|"Right"},{label:"Font Style", data:StyleSettings}] FormattingSetting} */
/** @typedef {{label: string, data: string|number|boolean}} SettingsOption */
/** @typedef {{type: "sections", label: string, sections: SettingsSection[]} | {type:"options", label:string, options:SettingsOption[]}| {type:"formatting", label:string, options:FormattingSetting}} SettingsSection */
/** @typedef {{label: string, sections: SettingsSection[]}} SettingsMenu */
/** @typedef {Object.<string, SettingsMenu} SettingsWindow */

/** @returns {SettingsWindow} */
function defaultSettingsWindow() {

}

/** @returns {SettingsMenu} */
function defaultFormattingSection() {
    return {
        label: "Formatting", sections: [
            {
                type: "sections",
                label: "Elements",
                sections: [
                    {
                        type: "formatting",
                        label: "Scene Heading",
                        options: makeFormattingOptions(
                            24,
                            undefined,
                            undefined,
                            undefined,
                            undefined,
                            undefined,
                            undefined,
                            undefined,
                            makeStyleSettings(
                                undefined,
                                undefined,
                                undefined,
                                true
                            )
                        )
                    },
                    {
                        type: "formatting", label: "Shot", options: makeFormattingOptions(
                            24,
                            undefined,
                            undefined,
                            undefined,
                            undefined,
                            undefined,
                            undefined,
                            undefined,
                            makeStyleSettings(
                                undefined,
                                undefined,
                                undefined,
                                true
                            )
                        )
                    },
                    { type: "formatting", label: "Action", options: makeFormattingOptions(12) },
                    {
                        type: "formatting", label: "Transition", options: makeFormattingOptions(
                            12,
                            undefined,
                            undefined,
                            undefined,
                            undefined,
                            undefined,
                            undefined,
                            "Right",
                            undefined
                        )
                    },
                    {
                        type: "formatting", label: "Character", options: makeFormattingOptions(
                            12,
                            18,
                            undefined,
                            288,
                            undefined,
                            undefined,
                            undefined,
                            makeStyleSettings(
                                undefined,
                                undefined,
                                undefined,
                                true
                            )
                        )
                    },
                    { type: "formatting", label: "Dialogue", options: makeFormattingOptions(undefined, 108, undefined, 72, undefined, undefined, -7.2, undefined, undefined) },
                    { type: "formatting", label: "Parenthetical", options: makeFormattingOptions() }
                ]
            }
        ]
    }
}
/**
 * 
 * @param {boolean} italics 
 * @param {boolean} bold 
 * @param {boolean} underline 
 * @param {boolean} allCaps 
 * @returns {StyleSettings}
 */
function makeStyleSettings(italics = false, bold = false, underline = false, allCaps = false) {
    return [
        { label: "Italics", data: italics },
        { label: "Bold", data: bold },
        { label: "Underline", data: underline },
        { label: "AllCaps", allCaps }
    ]
}
/**
 * 
 * @param {number} topMargin 
 * @param {number} rightMargin 
 * @param {number} bottomMargin 
 * @param {number} leftMargin 
 * @param {string} font 
 * @param {number} fontSize 
 * @param {StyleSettings} styles 
 * @returns {FormattingSetting}
 */
function makeFormattingOptions(topMargin = 0, rightMargin = 0, bottomMargin = 0, leftMargin = 0, font = "Courier New", fontSize = 12, indent = 0, textAlign = "Left", styles = makeStyleSettings()) {
    return [
        { label: "Top Margin", data: topMargin },
        { label: "Right Margin", data: rightMargin },
        { label: "Bottom Margin", data: bottomMargin },
        { label: "Left Margin", data: leftMargin },
        { label: "Font", data: font },
        { label: "Font Size", data: fontSize },
        { label: "Indent", data: indent },
        { label: "Text Align", data: textAlign },
        { label: "Font Style", data: styles }
    ]
}