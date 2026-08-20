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
 * @property {boolean} StartsNewPage
 * @property {string} PaginateAs
 * @property {string} ReturnKey
 * @property {string} Shortcut
 * @property {boolean} CanHide
 * @property {number} Level
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

export const DEFAULT_PAGE_WIDTH_INCHES = 8.5
export const DEFAULT_PAGE_HEIGHT_INCHES = 11
export const DEFAULT_TOP_MARGIN_INCHES = 1
export const DEFAULT_RIGHT_MARGIN_INCHES = 1
export const DEFAULT_BOTTOM_MARGIN_INCHES = 1
export const DEFAULT_LEFT_MARGIN_INCHES = 1.5
export const DEFAULT_FONT_SIZE_POINTS = 12;
export const DEFAULT_FONT_SIZE_PIXELS = 16;
export const PIXELS_PER_INCH = 96
export const POINTS_PER_INCH = 72;
export const VALID_FDX_TYPES = [
    "Scene Heading",
    "Action",
    "Character",
    "Dialogue",
    "Parenthetical",
    "Transition",
    "Shot",
    "Sequence",
    "New Act",
    "End of Act",
    "Cast List",
    "Summary",
    "General",
    "Outline 1",
    "Outline 2",
    "Outline 3",
    "Note",
];
export const ALL_CAPS_ELEMENTS = ["SCENEHEADING", "CHARACTER", "SHOT", "TRANSITION", "NEWACT", "ENDOFACT"]
export const HTML_TAG_NAMES = [
    "sceneheading",
    "action",
    "character",
    "dialogue",
    "parenthetical",
    "transition",
    "shot",
    "sequence",
    "newact",
    "endofact",
    "castlist",
    "summary",
    "general",
    "outline1",
    "outline2",
    "outline3",
    "note",
    "continued",
    "titletext"
]
export const EXTENSION_REGEX = /\(([\w\.\-'])*\)?$/i
export const DEFAULT_EXTENSIONS = new Set([
    "(V.O.)",
    "(O.S.)",
    "(O.C.)",
    "(CONT'D)",
    "(SUBTITLE)",
    "(TEXT)",
    "(pre-lap)",
]);
export const SCENE_INTRO_REGEX = /^(\w{1,3}|i\/{1,2})(?!.)/i
export const DEFAULT_SCENE_INTROS = new Set(["INT.", "EXT.", "I/E."]);
export const TIME_OF_DAY_REGEX = /-\s(?:\w* *)+$/i
export const DEFAULT_TIMES_OF_DAY = new Set([
    "DAY",
    "NIGHT",
    "AFTERNOON",
    "MORNING",
    "EVENING",
    "LATER",
    "MOMENTS LATER",
    "CONTINUOUS",
    "THE NEXT DAY",
    "MAGIC HOUR",
    "DAWN",
    "DUSK",
    "SAME",
    "SAME TIME",
]);
export const DEFAULT_TRANSITIONS = new Set([
    "CUT TO:",
    "FADE IN:",
    "FADE OUT.",
    "FADE TO:",
    "DISSOLVE TO:",
    "BACK TO:",
    "MATCH CUT TO:",
    "JUMP CUT TO:",
    "FADE TO BLACK.",
    "SMASH CUT TO:",
    "CUT TO BLACK.",
    "TIME CUT:",
]);
export const AUTOCOMPLETE_TAGS = ["sceneheading", "character", "transition"]

/**
 * @param {Document} doc 
 * @returns {ElementSettings}
 */
export function LoadElSettings(doc) {
    /** @type {ElementSettings} */
    let res = {};
    let settings = doc.getElementsByTagName("ElementSettings")
    for (let setting of settings) {
        res[setting.getAttribute("Type").replace(/\s/g, "").toLowerCase()] = LoadElSetting(setting)
    }
    return res;
}
/**
 * @param {Element} el
 * @returns {ElementSetting} 
 */
function LoadElSetting(el) {
    let FontSpec = el.getElementsByTagName("FontSpec")[0]
    let ParagraphSpec = el.getElementsByTagName("ParagraphSpec")[0]
    let Behavior = el.getElementsByTagName("Behavior")[0]
    let Outline = el.getElementsByTagName("Outline")[0]
    return {
        Type: el.getAttribute("Type") || "Unknown",

        AdornmentStyle: parseInt(FontSpec.getAttribute("AdornmentStyle")) || 0,
        Background: FontSpec.getAttribute("Background") || "#FFFFFFFFFFFF",
        Color: FontSpec.getAttribute("Color") || "#000000000000",
        Font: FontSpec.getAttribute("Font") || "Courier New",
        RevisionID: parseInt(FontSpec.getAttribute("RevisionID")) || 0,
        Size: parseInt(FontSpec.getAttribute("Size")) || 12,
        Style: FontSpec.getAttribute("Style") || "",

        Alignment: ParagraphSpec.getAttribute("Alignment") || "Left",
        FirstIndent: parseFloat(ParagraphSpec.getAttribute("FirstIndent")) || "0",
        Leading: ParagraphSpec.getAttribute("Leading") || "Regular",
        LeftIndent: parseFloat(ParagraphSpec.getAttribute("LeftIndent")) || 1.5,
        RightIndent: parseFloat(ParagraphSpec.getAttribute("RightIndent")) || 7.5,
        SpaceBefore: parseInt(ParagraphSpec.getAttribute("SpaceBefore")) || 0,
        Spacing: parseInt(ParagraphSpec.getAttribute("Spacing")),
        StartsNewPage: ParagraphSpec.getAttribute("StartsNewPage") === "Yes" ? true : false,

        PaginateAs: Behavior.getAttribute("PaginateAs") || "Unknown",
        ReturnKey: Behavior.getAttribute("ReturnKey") || "Unknown",
        Shortcut: Behavior.getAttribute("Shortcut") || NaN,

        CanHide: Outline ? Outline.getAttribute("CanHide") === "Yes" ? true : false : false,
        Level: Outline ? parseInt(Outline.getAttribute("Level")) || 1 : 1
    };
}