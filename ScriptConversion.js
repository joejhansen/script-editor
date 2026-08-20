/**
 * @param {Element} el 
 * @returns {HTMLElement}
 */
function EltoHTML(el) {
    let elType = el.getAttribute("Type").replace(/\s/g, "").toLowerCase();
    let elInnerHTML = "";
    for (let tag of el.children) if (tag.tagName === "Text") {
        if (tag.hasAttribute("Style")) {
            const styles = tag.getAttribute("Style").toLowerCase().replace('+', ' ').replace("allcaps", '')
            if (styles) {
                elInnerHTML += `<span class="${styles}">${tag.textContent}</span>`
            } else {
                elInnerHTML += tag.textContent;
            }
        } else {
            elInnerHTML += tag.textContent;
        }
    }
    if (elType === "parenthetical") elInnerHTML = elInnerHTML.replace(/[()]/g, "") // parenthesis in parentheticals are assumed and handled by css
    let newEl = document.createElement(elType)
    newEl.innerHTML = elInnerHTML;
    return newEl
}

/**
 * @param {Document} doc
 * @return {HTMLElement[]}
 */
export function XMLtoHTML(doc) {
    /** @type {Element[]} */
    let res = []
    let contentEls = doc.getElementsByTagName("FinalDraft")[0].getElementsByTagName("Content")[0].children
    for (let el of contentEls) {
        res.push(EltoHTML(el))
    }
    return res;
}

/**
 * @param {File} file 
 * @returns {Promise<Document>}
 */
export async function parseXMLFromFile(file) {
    const xmlString = await file.text();
    return parseXMLString(xmlString);
}

/**
 * @param {string} xmlString 
 * @returns {Document}
 */
export function parseXMLString(xmlString) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlString, 'text/xml');
    const errorNode = doc.querySelector('parsererror');
    if (errorNode) throw new Error(`XML parsing error: ${errorNode.textContent}`);
    return doc;
}