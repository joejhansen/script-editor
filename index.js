import { CHANNEL_NAME as BUDGET_CHANNEL } from "./windows/budget/budget.js";
import { downloadFDX, downloadPDF } from "./ScriptConversion.js";
import { dragElement, newBlankScript } from "./UX.js";
import { scalePage as autoScalePage } from "./PageScaler.js";
import { State } from "./State.js";
import { handleBeforeInput, handleCopy, handleCut, handleElementPicker, handleFileInput, handleInput, handleKeyDown, handleKeyUp, handleMenuButtons, handleOnClick, handleOnLoad, handlePageTracker, handlePaste, handleVisibilityChange, toggleEditTitlePage } from "./EventHandlers.js";
import { NotesTable } from "./NotesTable.js";
const HeaderMenu = document.querySelector("header-menu")
const NotesTableEl = document.querySelector("notes-table")
const ScriptWrapper = document.getElementById("script-main");
const FileNameInput = HeaderMenu.shadowRoot?.getElementById("file-name")
const TitlePageButton = HeaderMenu.shadowRoot?.getElementById("title-page-toggle")
const CurrentPageTracker = document.getElementById("current-page")
const ScenePropertiesEl = document.getElementsByTagName("sceneproperties")[0]
const ScriptNotesEl = document.getElementsByTagName("scriptnotes")[0]
const WatermarkPopover = document.getElementById("watermark-wrapper")

let state = new State();

for (let optMenuBtn of document.getElementsByClassName("option-menu-button")) {
    optMenuBtn.addEventListener("click", handleMenuButtons)
}

window.addEventListener("load", (e) => handleOnLoad(e, state, ScriptWrapper, ScenePropertiesEl, ScriptNotesEl, FileNameInput))
window.addEventListener("visibilitychange", (e) => handleVisibilityChange(e, state, ScriptWrapper, FileNameInput))
window.addEventListener("resize", autoScalePage)
ScriptWrapper.addEventListener("keydown", (e) => handleKeyDown(e, state, ScriptWrapper, FileNameInput))
ScriptWrapper.addEventListener("keyup", (e) => handleKeyUp(e, state, ScriptWrapper, CurrentPageTracker, FileNameInput))
ScriptWrapper.addEventListener("input", (e) => handleInput(e, state, ScriptWrapper, FileNameInput))
ScriptWrapper.addEventListener("beforeinput", (e) => handleBeforeInput(e, state, ScriptWrapper, CurrentPageTracker, FileNameInput))
ScriptWrapper.addEventListener("click", (e) => handleOnClick(e, state, ScriptWrapper, FileNameInput, CurrentPageTracker))
ScriptWrapper.addEventListener("cut", (e) => handleCut(e, state, ScriptWrapper));
ScriptWrapper.addEventListener("paste", (e) => handlePaste(e, state, ScriptWrapper))
ScriptWrapper.addEventListener("copy", handleCopy)
TitlePageButton.addEventListener("click", (e) => toggleEditTitlePage(e, state, ScriptWrapper, TitlePageButton))
CurrentPageTracker.addEventListener("keydown", (e) => handlePageTracker(e, state, ScriptWrapper))
document.getElementById("script-upload").addEventListener("change", (e) => handleFileInput(e, state, ScriptWrapper, FileNameInput))
HeaderMenu.shadowRoot?.getElementById("download-fdx").addEventListener("click", (e) => downloadFDX(e, state, TitlePageButton, FileNameInput))
HeaderMenu.shadowRoot?.getElementById("download-pdf").addEventListener('click', (e) => downloadPDF(e, state.Navigation, TitlePageButton, FileNameInput))
HeaderMenu.shadowRoot?.getElementById("new-blank").addEventListener("click", (e) => newBlankScript(state, ScriptWrapper, FileNameInput))
HeaderMenu.shadowRoot?.getElementById("menu-button-open").addEventListener("click", (e) => document.getElementById("script-upload").click())
HeaderMenu.shadowRoot?.getElementById("undo-button").addEventListener("click", (e) => state.UndoStack.undo(state.Navigation.EditingTitlePage, ScriptWrapper))
HeaderMenu.shadowRoot?.getElementById("redo-button").addEventListener("click", (e) => state.UndoStack.redo(state.Navigation.EditingTitlePage, ScriptWrapper))
HeaderMenu.shadowRoot?.getElementById("element-types").addEventListener("change", (e) => handleElementPicker(e, state, ScriptWrapper, FileNameInput))
HeaderMenu.shadowRoot?.getElementById("copy-button").addEventListener("click", handleCopy)
HeaderMenu.shadowRoot?.getElementById("cut-button").addEventListener("click", (e) => handleCut(e, ScriptWrapper))
HeaderMenu.shadowRoot?.getElementById("paste-button").addEventListener("click", (e) => handlePaste(e, state, ScriptWrapper))
HeaderMenu.shadowRoot?.getElementById("all-notes-button").addEventListener("click", (e) => NotesTable.open(e, NotesTableEl.shadowRoot, state.Notes))

HeaderMenu.shadowRoot?.getElementById("script-note-table-button").addEventListener("click", (e) => NotesTable.open(e, NotesTableEl.shadowRoot, state.Notes, "ScriptNotes"))
HeaderMenu.shadowRoot?.getElementById("scenes-table-button").addEventListener("click", (e) => NotesTable.open(e, NotesTableEl.shadowRoot, state.Notes, "SceneProps"))
HeaderMenu.shadowRoot?.getElementById("comments-table-button").addEventListener("click", (e) => NotesTable.open(e, NotesTableEl.shadowRoot, state.Notes, "Comments"))
HeaderMenu.shadowRoot?.getElementById("beats-table-button").addEventListener("click", (e) => NotesTable.open(e, NotesTableEl.shadowRoot, state.Notes, "Beats"))
HeaderMenu.shadowRoot?.getElementById("structure-table-button").addEventListener("click", (e) => NotesTable.open(e, NotesTableEl.shadowRoot, state.Notes, "StructurePoints"))
HeaderMenu.shadowRoot?.getElementById("bookmarks-table-button").addEventListener("click", (e) => NotesTable.open(e, NotesTableEl.shadowRoot, state.Notes, "Bookmarks"))
HeaderMenu.shadowRoot?.getElementById("characters-table-button").addEventListener("click", (e) => NotesTable.open(e, NotesTableEl.shadowRoot, state.Notes, "Characters"))
HeaderMenu.shadowRoot?.getElementById("sfx-table-button").addEventListener("click", (e) => NotesTable.open(e, NotesTableEl.shadowRoot, state.Notes, "Sfx"))
HeaderMenu.shadowRoot?.getElementById("vfx-table-button").addEventListener("click", (e) => NotesTable.open(e, NotesTableEl.shadowRoot, state.Notes, "Vfx"))
HeaderMenu.shadowRoot?.getElementById("props-table-button").addEventListener("click", (e) => NotesTable.open(e, NotesTableEl.shadowRoot, state.Notes, "Props"))
// document.getElementById("mobile-tab").addEventListener("click", (e) => document.getElementById("header-menu").classList.toggle("active"))










// NotesTable.shadowRoot?.getElementById("all-notes")
document.getElementById("watermark-save").addEventListener("click", (e) => {
    state.Settings.Watermark = document.getElementById("watermark-input").value
    WatermarkPopover.hidePopover();
})
document.getElementById("watermark-cancel").addEventListener("click", (e) => {
    document.getElementById("watermark-input").value = state.Settings.Watermark
    WatermarkPopover.hidePopover();
})