export class PopoverPanel extends HTMLElement {
    static styles = null;
    static templateId = null; // subclass sets this, or override templateId
    connectedCallback() {
        if (this.shadowRoot) return;

        const root = this.attachShadow({ mode: 'open' });
        root.adoptedStyleSheets = [PopoverPanel.baseStyles, this.constructor.styles].filter(Boolean);

        const tpl = this.constructor.template
            ?? document.getElementById(this.constructor.templateId);
        if (!tpl) throw new Error(`No template for <${this.localName}>`);

        root.append(tpl.content.cloneNode(true));

        this.setAttribute('popover', this.getAttribute('popover') ?? 'auto');
        this.addEventListener('toggle', (e) => {
            e.newState === 'open' ? this.onOpen?.() : this.onClose?.();
        });
        this.init?.(root);
    }
}