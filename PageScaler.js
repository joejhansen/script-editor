import { DEFAULT_PAGE_WIDTH_PIXELS } from "./ScriptSettings.js";

export function scalePage(e) {
    const root = document.querySelector(":root");
    root.style.setProperty("--page-scale", getCurrentScale())
}
export function forceScale(scale){
    const root = document.querySelector(":root");
    root.style.setProperty("--page-scale", scale)
}
export function getCurrentScale() {
    return Math.min(1, window.outerWidth / DEFAULT_PAGE_WIDTH_PIXELS)
}