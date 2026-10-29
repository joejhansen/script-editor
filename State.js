import { Navigation } from "./Navigation.js";
import { Notes } from "./Notes.js";
import { Script } from "./Script.js";
import { Settings } from "./ScriptSettings.js";
import { UndoStack } from "./UndoStack.js";

export class State {
    /**
     * @param {Script} script 
     * @param {Settings} settings 
     * @param {Navigation} navigation 
     * @param {UndoStack} undoStack 
     */
    constructor(
        script = new Script(),
        settings = new Settings(),
        navigation = new Navigation(),
        undoStack = new UndoStack(),
        notes = new Notes(),
    ) {
        this.Script = script;
        this.Settings = settings;
        this.Navigation = navigation;
        this.UndoStack = undoStack;
        this.Notes = notes;
    }
}