import { DEFAULT_PAGE_WIDTH_PIXELS } from "./ScriptSettings.js";

export function scalePage(e) {
    const root = document.querySelector(":root");
    root.style.setProperty("--page-scale", Math.min(1, window.outerWidth / DEFAULT_PAGE_WIDTH_PIXELS))
}