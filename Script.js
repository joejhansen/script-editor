export class Script {
    /**
     * @param {string} fileName
     * @param {string} scriptInnerHTML 
     * @param {string} titlePageOuterHTML 
     * @param {Set<string>} characterSet 
     * @param {string} lastCharacterUsed 
     * @param {string} secondLastCharacterUsed 
     * @param {Document | null} originalXML 
     * @param {Document | null} blankScriptXML 
     * @param {string} scriptNotesInnerHTML
     * @param {string} scenePropertiesInnerHTML
     */
    constructor(
        fileName = "",
        scriptInnerHTML = "",
        titlePageOuterHTML = "",
        characterSet = new Set(),
        lastCharacterUsed = "",
        secondLastCharacterUsed = "",
        originalXML = null,
        blankScriptXML = null,
        scriptNotesInnerHTML = "",
        scenePropertiesInnerHTML = "",

    ) {
        /** @type {string} */
        this.FileName = fileName
        /** @type {string} */
        this.ScriptInnerHTML = scriptInnerHTML
        /** @type {string} */
        this.TitlePageOuterHTML = titlePageOuterHTML
        /** @type {Set<string>} */
        this.CharacterSet = characterSet
        /** @type {string} */
        this.LastCharacterUsed = lastCharacterUsed
        /** @type {string} */
        this.SecondLastCharacterUsed = secondLastCharacterUsed
        /** @type {Document | null} */
        this.OriginalXML = originalXML
        /** @type {Document | null} */
        this.BlankScriptXML = blankScriptXML
        /** @type {string} */
        this.ScriptNotesInnerHTML = scriptNotesInnerHTML
        /** @type {string} */
        this.ScenePropertiesInnerHTML = scenePropertiesInnerHTML
    }
}