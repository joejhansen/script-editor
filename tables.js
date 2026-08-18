/**
 * @template T
 * @template Y
 * @typedef {{type:"ready"} | {type:"init", data:T} | {type:"update", data:Y} | {type:"close"}} WindowMessage
 */

/** @typedef {WindowMessage<TableWindow,TableContents>} TableMessage */

export class TableContents {
    /**
     * @param {string} name 
     * @param {(string|number|boolean)[]} contents 
     */
    constructor(name, contents) {
        /** @type {string} */
        this.name = name;
        /** @type {(string|number|boolean)[]} */
        this.contents = contents;
    }
}

export class TableWindow {
    /**
     * @param {string} name 
     * @param {Object.<string, TableContents>} tables 
     */
    constructor(name, tables) {
        /** @type {string} */
        this.name = name;
        /** @type {Object.<string,TableContents>} */
        this.tables = tables;
    }
}