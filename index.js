import { downloadFDX, downloadPDF } from "./ScriptConversion.js";
import { dragElement, getCursorPosition, newBlankScript } from "./UX.js";
import { scalePage as autoScalePage } from "./PageScaler.js";
import { State } from "./State.js";
import { handleBeforeInput, handleCopy, handleCut, handleElementPicker, handleFileInput, handleInput, handleKeyDown, handleKeyUp, handleMenuButtons, handleOnClick, handleOnLoad, handlePageTracker, handlePaste, handleShowAddNotePopover, handleVisibilityChange, toggleEditTitlePage } from "./EventHandlers.js";
import { NotesTable } from "./NotesTable.js";
import { HeaderMenu } from "./HeaderMenu.js";
/** @type {HeaderMenu} */
const HeaderMenuEl = document.querySelector("header-menu")
/** @type {NotesTable} */
const NotesTableEl = document.querySelector("notes-table")
const ScriptWrapper = document.getElementById("script-main");
const FileNameInput = HeaderMenuEl.shadowRoot?.getElementById("file-name")
const TitlePageButton = HeaderMenuEl.shadowRoot?.getElementById("title-page-toggle")
const CurrentPageTracker = document.getElementById("current-page")
const ScenePropertiesEl = document.getElementsByTagName("sceneproperties")[0]
const ScriptNotesEl = document.getElementsByTagName("scriptnotes")[0]
const WatermarkPopover = document.getElementById("watermark-wrapper")

let state = new State();

window.addEventListener("load", (e) => handleOnLoad(e, state, ScriptWrapper, ScenePropertiesEl, ScriptNotesEl, FileNameInput, NotesTableEl))
window.addEventListener("visibilitychange", (e) => handleVisibilityChange(e, state, ScriptWrapper, FileNameInput))
window.addEventListener("resize", autoScalePage)

for (let optMenuBtn of document.getElementsByClassName("option-menu-button")) {
    optMenuBtn.addEventListener("click", handleMenuButtons)
}

ScriptWrapper.addEventListener("keydown", (e) => handleKeyDown(e, state, ScriptWrapper, FileNameInput))
ScriptWrapper.addEventListener("keyup", (e) => handleKeyUp(e, state, ScriptWrapper, CurrentPageTracker, FileNameInput))
ScriptWrapper.addEventListener("input", (e) => handleInput(e, state, ScriptWrapper, FileNameInput, NotesTableEl))
ScriptWrapper.addEventListener("beforeinput", (e) => handleBeforeInput(e, state, ScriptWrapper, CurrentPageTracker, FileNameInput, NotesTableEl))
ScriptWrapper.addEventListener("click", (e) => handleOnClick(e, state, ScriptWrapper, FileNameInput, CurrentPageTracker))
ScriptWrapper.addEventListener("cut", (e) => handleCut(e, state, ScriptWrapper));
ScriptWrapper.addEventListener("paste", (e) => handlePaste(e, state, ScriptWrapper))
ScriptWrapper.addEventListener("copy", handleCopy)
TitlePageButton.addEventListener("click", (e) => toggleEditTitlePage(e, state, ScriptWrapper, TitlePageButton))
CurrentPageTracker.addEventListener("keydown", (e) => handlePageTracker(e, state, ScriptWrapper))
document.getElementById("script-upload").addEventListener("change", (e) => handleFileInput(e, state, ScriptWrapper, FileNameInput, NotesTableEl))
HeaderMenuEl.shadowRoot?.getElementById("add-note-button").addEventListener("click", (e) => handleShowAddNotePopover(e, state, ScriptWrapper, FileNameInput))
HeaderMenuEl.shadowRoot?.getElementById("download-fdx").addEventListener("click", (e) => downloadFDX(e, state, TitlePageButton, FileNameInput))
HeaderMenuEl.shadowRoot?.getElementById("download-pdf").addEventListener('click', (e) => downloadPDF(e, state.Navigation, TitlePageButton, FileNameInput))
HeaderMenuEl.shadowRoot?.getElementById("new-blank").addEventListener("click", (e) => newBlankScript(state, ScriptWrapper, FileNameInput, NotesTableEl))
HeaderMenuEl.shadowRoot?.getElementById("menu-button-open").addEventListener("click", (e) => document.getElementById("script-upload").click())
HeaderMenuEl.shadowRoot?.getElementById("undo-button").addEventListener("click", (e) => state.UndoStack.undo(state.Navigation.EditingTitlePage, ScriptWrapper))
HeaderMenuEl.shadowRoot?.getElementById("redo-button").addEventListener("click", (e) => state.UndoStack.redo(state.Navigation.EditingTitlePage, ScriptWrapper))
HeaderMenuEl.shadowRoot?.getElementById("element-types").addEventListener("change", (e) => handleElementPicker(e, state, ScriptWrapper, FileNameInput))
HeaderMenuEl.shadowRoot?.getElementById("copy-button").addEventListener("click", handleCopy)
HeaderMenuEl.shadowRoot?.getElementById("cut-button").addEventListener("click", (e) => handleCut(e, ScriptWrapper))
HeaderMenuEl.shadowRoot?.getElementById("paste-button").addEventListener("click", (e) => handlePaste(e, state, ScriptWrapper))

// NotesTable.makeNotesTable(NotesTableEl.shadowRoot, state.Notes)
HeaderMenuEl.shadowRoot?.getElementById("all-notes-button").addEventListener("click", (e) => NotesTableEl.open(e))
HeaderMenuEl.shadowRoot?.getElementById("script-note-table-button").addEventListener("click", (e) => NotesTableEl.open(e, "ScriptNotes"))
HeaderMenuEl.shadowRoot?.getElementById("scenes-table-button").addEventListener("click", (e) => NotesTableEl.open(e, "SceneProps"))
HeaderMenuEl.shadowRoot?.getElementById("comments-table-button").addEventListener("click", (e) => NotesTableEl.open(e, "Comments"))
HeaderMenuEl.shadowRoot?.getElementById("beats-table-button").addEventListener("click", (e) => NotesTableEl.open(e, "Beats"))
HeaderMenuEl.shadowRoot?.getElementById("structure-table-button").addEventListener("click", (e) => NotesTableEl.open(e, "StructurePoints"))
HeaderMenuEl.shadowRoot?.getElementById("bookmarks-table-button").addEventListener("click", (e) => NotesTableEl.open(e, "Bookmarks"))
HeaderMenuEl.shadowRoot?.getElementById("characters-table-button").addEventListener("click", (e) => NotesTableEl.open(e, "Characters"))
HeaderMenuEl.shadowRoot?.getElementById("sfx-table-button").addEventListener("click", (e) => NotesTableEl.open(e, "Sfx"))
HeaderMenuEl.shadowRoot?.getElementById("vfx-table-button").addEventListener("click", (e) => NotesTableEl.open(e, "Vfx"))
HeaderMenuEl.shadowRoot?.getElementById("props-table-button").addEventListener("click", (e) => NotesTableEl.open(e, "Props"))








// NotesTable.shadowRoot?.getElementById("all-notes")
document.getElementById("watermark-save").addEventListener("click", (e) => {
    state.Settings.Watermark = document.getElementById("watermark-input").value
    WatermarkPopover.hidePopover();
})
document.getElementById("watermark-cancel").addEventListener("click", (e) => {
    document.getElementById("watermark-input").value = state.Settings.Watermark
    WatermarkPopover.hidePopover();
})
