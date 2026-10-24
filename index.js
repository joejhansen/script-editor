import { CHANNEL_NAME as BUDGET_CHANNEL } from "./windows/budget/budget.js";
import { downloadFDX, downloadPDF } from "./ScriptConversion.js";
import { newBlankScript } from "./UX.js";
import { scalePage as autoScalePage } from "./PageScaler.js";
import { State } from "./State.js";
import { handleBeforeInput, handleCopy, handleCut, handleElementPicker, handleFileInput, handleInput, handleKeyDown, handleKeyUp, handleMenuButtons, handleOnClick, handleOnLoad, handlePageTracker, handlePaste, handleVisibilityChange, toggleEditTitlePage } from "./EventHandlers.js";

const ScriptWrapper = document.getElementById("script-main");
const FileNameInput = document.getElementById("file-name")
const TitlePageButton = document.getElementById("title-page-toggle")
const CurrentPageTracker = document.getElementById("current-page")
const ScenePropertiesEl = document.getElementsByTagName("sceneproperties")[0]
const ScriptNotesEl = document.getElementsByTagName("scriptnotes")[0]
const WatermarkPopover = document.getElementById("watermark-wrapper")

let state = new State();

for (let optMenuBtn of document.getElementsByClassName("option-menu-button")) {
    optMenuBtn.addEventListener("click", handleMenuButtons)
}

window.addEventListener("load", (e) => handleOnLoad(e, state, ScriptWrapper, ScenePropertiesEl, ScriptNotesEl, FileNameInput))
window.addEventListener("visibilitychange", (e) => handleVisibilityChange(e, state, ScriptWrapper, FileNameInput, ScriptNotesEl, ScenePropertiesEl))
ScriptWrapper.addEventListener("keydown", (e) => handleKeyDown(e, state, ScriptWrapper))
ScriptWrapper.addEventListener("keyup", (e) => handleKeyUp(e, state, ScriptWrapper, CurrentPageTracker))
ScriptWrapper.addEventListener("input", (e) => handleInput(e, state, ScriptWrapper))
ScriptWrapper.addEventListener("beforeinput", (e) => handleBeforeInput(e, state, ScriptWrapper, CurrentPageTracker))
ScriptWrapper.addEventListener("click", (e) => handleOnClick(e, state, ScriptWrapper, FileNameInput, CurrentPageTracker))
ScriptWrapper.addEventListener("cut", (e) => handleCut(e, state));
ScriptWrapper.addEventListener("paste", (e) => handlePaste(e, state, ScriptWrapper))
ScriptWrapper.addEventListener("copy", handleCopy)
TitlePageButton.addEventListener("click", (e) => toggleEditTitlePage(e, state, ScriptWrapper, TitlePageButton))
CurrentPageTracker.addEventListener("keydown", (e) => handlePageTracker(e, state))
document.getElementById("script-upload").addEventListener("change", (e) => handleFileInput(e, state, ScriptWrapper, FileNameInput))
document.getElementById("download-fdx").addEventListener("click", (e) => downloadFDX(e, state, TitlePageButton, FileNameInput))
document.getElementById("download-pdf").addEventListener('click', (e) => downloadPDF(e, state.Navigation, TitlePageButton, FileNameInput))
document.getElementById("new-blank").addEventListener("click", (e) => newBlankScript(state, ScriptWrapper, FileNameInput))
document.getElementById("menu-button-open").addEventListener("click", (e) => document.getElementById("script-upload").click())
document.getElementById("undo-button").addEventListener("click", (e) => state.UndoStack.undo(state.Navigation.EditingTitlePage, ScriptWrapper))
document.getElementById("redo-button").addEventListener("click", (e) => state.UndoStack.redo(state.Navigation.EditingTitlePage, ScriptWrapper))
document.getElementById("element-types").addEventListener("click", (e) => handleElementPicker(e, state))
document.getElementById("copy-button").addEventListener("click", handleCopy)
document.getElementById("cut-button").addEventListener("click", (e) => handleCut(e, state))
document.getElementById("paste-button").addEventListener("click", (e) => handlePaste(e, state, ScriptWrapper))
document.getElementById("mobile-tab").addEventListener("click", (e) => document.getElementById("header-menu").classList.toggle("active"))

document.getElementById("watermark-save").addEventListener("click", (e) => {
    state.Settings.Watermark = document.getElementById("watermark-input").value
    WatermarkPopover.hidePopover();
})
document.getElementById("watermark-cancel").addEventListener("click", (e) => {
    document.getElementById("watermark-input").value = state.Settings.Watermark
    WatermarkPopover.hidePopover();
})
window.addEventListener("resize", autoScalePage)