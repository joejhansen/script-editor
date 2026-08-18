import { TableContents, TableWindow } from "../../tables.js"
export const CHANNEL_NAME = "app-budget"

const GENERAL_HEADINGS = [
    "Item",
    "Rate",
    "Amount",
    "Predicted",
    "Actual"
]

const OVERVIEW_HEADINGS = [
    "Budget Total",
    "Predicted",
    "Actual"
]

const TALENT_HEADINGS = [
    "Name",
    "Role",
    "Agent",
    "Agency",
    "Scenes",
    "Rate",
    "Days",
    "Predicted",
    "Actual"
]

const CREW_HEADINGS = [
    "Name",
    "Department",
    "Title",
    "Rate",
    "Scenes",
    "Rate",
    "Days",
    "Predicted",
    "Actual"
]

const EQUIPMENT_OWNED_HEADINGS = [
    "Item",
    "Department",
    "Owner",
    "Depreciation",
    "Bought Value",
    "Initial Value",
    "Ending Value"
]

const EQUIPMENT_RENTED_HEADINGS = [
    "Item",
    "Company",
    "Rate",
    "Days",
    "Predicted",
    "Actual"
]

const LOCATIONS_HEADINGS = [
    "Name",
    "Scene",
    "Address",
    "Owner",
    "Permit Status",
    "Rate",
    "Days",
    "Predicted",
    "Actual",
]
const BudgetChannel = new BroadcastChannel(CHANNEL_NAME)

/** @type {TableWindow} */
let budgetTables = null;

function addRow() { }

function removeRow() { }

/** @param {KeyboardEvent} event */
function handleTab(event) { }

/** @param {KeyboardEvent} event */
function handleEnter(event) { }

/** @param {KeyboardEvent} event */
function handleKeyDown(event) { }

/**
 * @param {PointerEvent} event 
 */
function handleClick(event) {
    event.stopPropagation();
    console.log(event.target.textContent)
}

/**
 * @this {BroadcastChannel}
 * @param {MessageEvent<import("../../tables.js").TableMessage>} ev
 */
function handleChannelMessage(ev) {
    switch (ev.data.type) {
        case "init":
            budgetTables = ev.data.data;
            break;
        case "ready":
            break;
        case "update":
            budgetTables.tables[ev.data.data.name] = ev.data.data;
            break;
        case "close":
            break;
        default:
            break;
    }
}


document.getElementById("sidebar")?.addEventListener("click", handleClick)

BudgetChannel.onmessage = handleChannelMessage;