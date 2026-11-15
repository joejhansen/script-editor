import styles from "/windows/header-menu/header-menu.css" with {type: "css" };

class HeaderMenu extends HTMLElement {
    static styles = styles;
    static templateId = "template-header"; // subclass sets this, or override templateId
    connectedCallback() {
        if (this.shadowRoot) return;

        const root = this.attachShadow({ mode: 'open' });
        root.adoptedStyleSheets = [this.constructor.styles].filter(Boolean);

        const tpl = this.constructor.template
            ?? document.getElementById(this.constructor.templateId);
        if (!tpl) throw new Error(`No template for <${this.localName}>`);

        root.append(tpl.content.cloneNode(true));
        this.init?.(root);
    }
    init(root) {
        const I = {
            new: "M6.8,20.7q-0.65,0-1.08-0.43T5.3,19.2V4.8q0-0.65 0.42-1.07T6.8,3.3h7.85L18.7,7.35V19.2q0,0.65-0.42,1.07T17.2,20.7H6.8Zm7.5-13V4H6.8Q6.5,4 6.25,4.25T6,4.8V19.2q0,0.3 0.25,0.55T6.8,20H17.2q0.3,0 0.55-0.25T18,19.2V7.7H14.3ZM6,4V7.7V4V7.7V19.2q0,0.3 0,0.55T6,20q0,0 0-0.25T6,19.2V4.8Q6,4.5 6,4.25T6,4Z",
            open: "M4.65,18.7q-0.58,0-0.96-0.39T3.3,17.35V6.8q0-0.58 0.46-1.04Q4.23,5.3 4.8,5.3H9.48l2,2H19.2q0.42,0 0.75,0.19T20.48,8H11.2l-2-2H4.8Q4.45,6 4.23,6.22T4,6.8V17.2q0,0.28 0.14,0.45q0.14,0.18 0.36,0.3L6.73,10.5H22.68L20.5,17.75q-0.13,0.43-0.49,0.69T19.2,18.7H4.65ZM5.23,18H19.7l2.02-6.8H7.25L5.23,18Zm0,0l2.02-6.8L5.23,18ZM4,8V6.8Q4,6.45 4,6.22T4,6V8Z",
            find: "M3.3,17.65v-0.7h9.43v0.7H3.3Zm0-4.72v-0.7H7.6v0.7H3.3Zm0-4.72V7.5H7.6V8.2H3.3Zm16.9,9.5l-3.9-3.82q-0.53,0.4-1.14,0.63T13.9,14.73q-1.57,0-2.67-1.08q-1.1-1.07-1.1-2.64t1.11-2.64T13.91,7.3t2.67,1.07q1.1,1.07 1.1,2.63q0,0.65-0.23,1.26q-0.22,0.61-0.65,1.11l3.9,3.82l-0.5,0.5Zm-6.3-3.68q1.28,0 2.18-0.88t0.9-2.14t-0.9-2.14T13.9,8T11.72,8.88t-0.9,2.14t0.9,2.14t2.18,0.88Z",
            goto: "M17.35,12.35H5.3v-0.7H17.35L11.5,5.8L12,5.3L18.7,12L12,18.7l-0.5-0.5l5.85-5.85Z",
            addNote: "M8.3,19.2V9.8q0-0.63 0.44-1.06T9.8,8.3h9.4q0.63,0 1.06,0.44T20.7,9.8v6.65L16.45,20.7H9.8q-0.63,0-1.06-0.44T8.3,19.2ZM3.33,6.7Q3.2,6.07 3.56,5.57T4.55,4.95L13.8,3.32q0.63-0.13 1.13,0.24q0.5,0.36 0.63,0.99l0.2,1.25h-0.7L14.83,4.55q-0.05-0.27-0.3-0.44T13.98,4L4.68,5.65Q4.33,5.7 4.15,5.97T4.03,6.6L5.8,16.63v0.43Q5.48,16.9 5.25,16.61q-0.22-0.29-0.3-0.66L3.33,6.7ZM9,9.8v9.4q0,0.35 0.22,0.57T9.8,20H16l4-4V9.8q0-0.35-0.22-0.57T19.2,9H9.8Q9.45,9 9.23,9.23T9,9.8Zm5.5,4.7Zm-0.35,3.35h0.7v-3h3v-0.7h-3v-3h-0.7v3h-3v0.7h3v3Z",
            comments: "M6.65,13.35h10.7v-0.7H6.65v0.7Zm0-3h10.7V9.65H6.65v0.7Zm0-3h10.7V6.65H6.65v0.7ZM20.7,19.5l-2.8-2.8H4.8q-0.65,0-1.08-0.43T3.3,15.2V4.8q0-0.65 0.42-1.07T4.8,3.3H19.2q0.65,0 1.07,0.43T20.7,4.8V19.5ZM4.8,16H18.2L20,17.8V4.8q0-0.3-0.25-0.55T19.2,4H4.8Q4.5,4 4.25,4.25T4,4.8V15.2q0,0.3 0.25,0.55T4.8,16ZM4,16q0,0 0-0.25T4,15.2V4.8Q4,4.5 4,4.25T4,4Q4,4 4,4.25T4,4.8V16Z",
            beats: "M11.65,19.7V7.97h0.7V19.7h-0.7Zm-3.7-2.77v-6.2h0.7v6.2H7.95Zm7.4,0v-6.2h0.7v6.2h-0.7ZM4.25,14.18v-0.7h0.7v0.7H4.25Zm14.8,0v-0.7h0.7v0.7h-0.7ZM3.3,9.6V8.9H3.8q1.13,0 2.12-0.55t1.56-1.5Q8.2,5.65 9.4,4.97T12,4.3t2.6,0.68t1.93,1.88q0.55,0.95 1.52,1.5T20.2,8.9h0.5V9.6H20.2q-1.33,0-2.46-0.64T15.93,7.2Q15.3,6.15 14.26,5.57T12,5Q10.81,5 9.77,5.57T8.1,7.2Q7.4,8.32 6.26,8.96T3.8,9.6H3.3Z",
            structure: "M3.5,17.6L3,17.1l6.6-6.6l4,4l6.95-8l0.5,0.45l-7.4,8.6L9.6,11.5L3.5,17.6Z",
            bookmarks: "M6.3,19.05V5.8q0-0.65 0.42-1.08T7.8,4.3h8.4q0.65,0 1.08,0.43T17.7,5.8V19.05L12,16.6L6.3,19.05ZM7,17.95l5-2.15l5,2.15V5.8q0-0.3-0.25-0.55T16.2,5H7.8Q7.5,5 7.25,5.25T7,5.8V17.95ZM7,5Q7,5 7.25,5T7.8,5h8.4q0.3,0 0.55,0T17,5H12H7Z",
            sfx: "M14.88,16.05h-3.1L9.15,18.68Q8.73,19.1 8.09,19.1T7.03,18.68l-1.7-1.7Q4.9,16.55 4.9,15.91q0-0.64 0.42-1.06l2.63-2.6V9.13l6.93,6.93Zm-1.7-0.7L8.65,10.83v1.7L5.83,15.35Q5.6,15.58 5.6,15.91t0.22,0.56l1.7,1.7Q7.75,18.4 8.09,18.4t0.56-0.22l2.83-2.83h1.7ZM8.43,5.43q2.22-1.05 4.63-0.7T17.18,6.8q1.73,1.72 2.07,4.12t-0.7,4.63L18,15.03q0.9-1.98 0.55-4.09Q18.2,8.82 16.68,7.3q-1.53-1.53-3.64-1.88Q10.93,5.07 8.95,5.97L8.43,5.43Zm2.53,2.52q1.1-0.2 2.15,0.09T14.93,9.1t1.06,1.82q0.29,1.05 0.06,2.13l-0.6-0.6q0.05-0.8-0.2-1.54Q15,10.17 14.43,9.6q-0.57-0.58-1.31-0.84T11.58,8.6L10.95,7.95Zm-1.6,6.7Z",
            vfx: "M11.25,9.3h8.3q-0.65-1.78-2.1-3.16T14.15,4.3l-2.9,5Zm-2,2l4.2-7.2q-0.28-0.05-0.72-0.07T12,4Q10.35,4 8.93,4.63T6.4,6.3l2.85,5Zm-5,2.7H10L5.9,6.85Q5,7.95 4.5,9.24T4,12q0,0.52 0.06,1.01T4.25,14ZM9.9,19.7l2.9-5H4.45q0.65,1.78 2.13,3.16T9.9,19.7ZM12,20q1.65,0 3.08-0.63T17.6,17.7l-2.85-5L10.6,19.85q0.27,0.07 0.69,0.11T12,20Zm6.1-2.85q0.8-1.02 1.35-2.39T20,12q0-0.53-0.06-1.01T19.75,10H14l4.1,7.15ZM12,12Zm0,8.7q-1.8,0-3.39-0.69T5.85,18.15q-1.18-1.17-1.86-2.76T3.3,12T3.99,8.61T5.85,5.85T8.61,3.99T12,3.3t3.39,0.69t2.76,1.86t1.86,2.76T20.7,12t-0.69,3.39t-1.86,2.76q-1.18,1.18-2.76,1.86T12,20.7Z",
            props: "M20.3,14.5q0.2-0.93-0.05-1.81T19.53,11q-0.75,0.57-1.31,1.3t-0.76,1.65q-0.2,0.9 0.06,1.79q0.26,0.89 0.71,1.69q0.8-0.53 1.34-1.28T20.3,14.5ZM5.18,8.35Q5.75,8.92 6.59,9.01T8.08,8.63L7.2,7.75Q6.58,7.13 5.73,7.01T4.15,7.32L5.18,8.35ZM7,3.85L4.33,6.5Q5.2,6.18 6.1,6.38T7.68,7.25L8.55,8.13Q9.05,7.47 9,6.64T8.33,5.2L7,3.85ZM20.2,20.7L8.55,9.1Q7.68,9.75 6.58,9.7T4.68,8.85L2.85,7L7,2.85L8.83,4.7q0.8,0.8 0.86,1.91Q9.75,7.72 9.05,8.6l7.98,7.98q-0.28-0.67-0.35-1.38t0.07-1.43q0.13-0.6 0.4-1.15t0.67-1.01q0.4-0.46 0.88-0.86q0.48-0.4 1.03-0.73q0.73,1.03 1.11,2.2t0.14,2.38q-0.2,1.1-0.86,1.97t-1.59,1.48l2.18,2.18L20.2,20.7ZM7.45,7.5Zm7.63,3.6l-0.5-0.5L20,5.18V4H18.83L13.4,9.42l-0.5-0.5L18.55,3.3H20.7V5.45L15.08,11.1ZM4.23,20.45l-0.7-0.7Q3.3,19.52 3.3,19.23T3.53,18.7l3.1-3.1l-2.2-2.2l0.15-0.15Q5,12.83 5.63,12.83t1.05,0.43L7.63,14.2l1.25-1.25l0.5,0.5L8.13,14.7L9.3,15.88l1.25-1.25l0.5,0.5L9.8,16.38l0.93,0.93q0.42,0.43 0.42,1.05T10.73,19.4l-0.15,0.15l-2.2-2.2l-3.1,3.1q-0.22,0.23-0.53,0.23T4.23,20.45Z",
            scene: "M20.65,21.35V7q0-1.09-0.78-1.87T18,4.35H16.35v1.3q0,0.3-0.2,0.5t-0.5,0.2H11.7q-0.43,0-0.59-0.34T11.1,5.32l1.42-3.1q0.15-0.32 0.36-0.45T13.5,1.65h2.15q0.3,0 0.5,0.2t0.2,0.5v1.3H18q1.4,0 2.38,0.98T21.35,7V21.35h-0.7ZM11.7,5.65h3.95V2.35H13.18L11.7,5.65ZM5,21.35q-1,0-1.67-0.68T2.65,19V16.5q0-0.75 0.52-1.3t1.48-0.55v-2.5q0-0.62 0.44-1.06t1.06-0.44h7.7q0.62,0 1.06,0.44t0.44,1.06v2.5q0.95,0 1.47,0.52t0.53,1.33V19q0,1-0.68,1.67T15,21.35H5Zm0.35-9.2V14.8q0.45,0.23 0.72,0.74T6.35,16.5v1.15h7.3V16.5q0-0.45 0.28-0.96q0.28-0.51 0.72-0.74V12.15q0-0.35-0.22-0.57t-0.57-0.22H6.15q-0.35,0-0.58,0.22T5.35,12.15ZM5,20.65H15q0.74,0 1.2-0.52T16.65,19V16.5q0-0.52-0.32-0.83t-0.84-0.32q-0.52,0-0.83,0.32T14.35,16.5v1.85H5.65V16.5q0-0.52-0.32-0.83T4.49,15.35T3.66,15.67T3.35,16.5V19q0,0.62 0.45,1.13T5,20.65Zm8.65-3H6.35h7.3Zm-8.3-6.3h9.3H5.35Zm0.3,9.3h8.7H5.65Z",
            characters: "M1.3,17.45V16.8q0-0.88 0.95-1.46t2.42-0.59q0.2,0 0.45,0.03t0.55,0.07q-0.2,0.38-0.29,0.76T5.3,16.38v1.07h-4Zm6,0V16.48q0-0.55 0.32-1Q7.95,15.03 8.6,14.7q0.65-0.32 1.5-0.49t1.89-0.16q1.06,0 1.91,0.16q0.85,0.16 1.5,0.49q0.65,0.33 0.97,0.78t0.32,1v0.97H7.3Zm11.4,0V16.38q0-0.43-0.09-0.8t-0.26-0.73q0.32-0.05 0.56-0.07t0.44-0.03q1.48,0 2.41,0.59T22.7,16.8v0.65h-4ZM8,16.75h8V16.48q0-0.78-1.1-1.25T12,14.75T9.1,15.23T8,16.48v0.27ZM4.67,13.83q-0.52,0-0.88-0.37T3.43,12.58q0-0.5 0.37-0.86t0.88-0.36q0.5,0 0.88,0.36q0.38,0.36 0.38,0.87q0,0.49-0.36,0.87t-0.9,0.38Zm14.68,0q-0.5,0-0.88-0.38T18.1,12.58q0-0.51 0.38-0.87t0.88-0.36q0.52,0 0.88,0.36q0.36,0.36 0.36,0.86q0,0.52-0.36,0.88t-0.89,0.37ZM12.01,13.3q-0.81,0-1.38-0.57t-0.57-1.38q0-0.83 0.57-1.39T12,9.4q0.83,0 1.39,0.56t0.56,1.38q0,0.81-0.56,1.38T12.01,13.3Zm0-0.7q0.51,0 0.88-0.38t0.36-0.89q0-0.51-0.36-0.88T12,10.1q-0.5,0-0.88,0.36t-0.38,0.89q0,0.5 0.38,0.88t0.89,0.38ZM12,16.75Zm0-5.4Z",
            download: "M12,15.45l-3.1-3.1l0.5-0.5l2.25,2.25V5.3h0.7v8.8l2.25-2.25l0.5,0.5L12,15.45ZM6.8,18.7q-0.65,0-1.08-0.43T5.3,17.2V14.95H6V17.2q0,0.3 0.25,0.55T6.8,18H17.2q0.3,0 0.55-0.25T18,17.2V14.95h0.7V17.2q0,0.65-0.42,1.07T17.2,18.7H6.8Z",
            location: "M13.06,11.21q0.44-0.44 0.44-1.06T13.06,9.09T12,8.65T10.94,9.09T10.5,10.15t0.44,1.06T12,11.65t1.06-0.44ZM12,19.77q2.75-2.35 4.44-4.96t1.69-4.49q0-2.75-1.74-4.55T12,3.97T7.61,5.77T5.88,10.33q0,1.88 1.69,4.49T12,19.77Zm0,0.95Q8.63,17.7 6.9,15.08T5.18,10.33q0-3 1.96-5.01T12,3.3t4.86,2.01q1.96,2.01 1.96,5.01q0,2.13-1.72,4.75T12,20.73Zm0-10.58Z",
            formatting: "M4.8,16.7q-0.65,0-1.08-0.43T3.3,15.2V8.8q0-0.65 0.42-1.08T4.8,7.3H19.2q0.65,0 1.07,0.42T20.7,8.8v6.4q0,0.65-0.43,1.07T19.2,16.7H4.8Zm0-0.7H19.2q0.3,0 0.55-0.25T20,15.2V8.8q0-0.3-0.25-0.55T19.2,8H16.35v3h-0.7V8h-3.3v3h-0.7V8H8.35v3H7.65V8H4.8Q4.5,8 4.25,8.25T4,8.8v6.4q0,0.3 0.25,0.55T4.8,16Zm2.85-5h0.7H7.65Zm4,0h0.7h-0.7Zm4,0h0.7h-0.7ZM12,12Z",
            list: "M7.85,9.15V8.45H19.7v0.7H7.85Zm0,3.2v-0.7H19.7v0.7H7.85Zm0,3.2v-0.7H19.7v0.7H7.85ZM4.8,9.3q-0.21,0-0.36-0.15T4.3,8.77q0-0.2 0.14-0.34T4.8,8.3T5.16,8.44T5.3,8.77Q5.3,9 5.16,9.15T4.8,9.3Zm0,3.18q-0.21,0-0.36-0.14T4.3,12q0-0.25 0.14-0.39q0.14-0.14 0.36-0.14t0.36,0.14T5.3,12q0,0.2-0.14,0.34T4.8,12.48Zm0,3.22q-0.21,0-0.36-0.15T4.3,15.18q0-0.2 0.14-0.34T4.8,14.7t0.36,0.14T5.3,15.18q0,0.22-0.14,0.37T4.8,15.7Z",
            register: "M9.5,8.2V7.5h8V8.2h-8Zm0,2.7V10.2h8v0.7h-8ZM11.8,20H6q-0.42,0-0.71,0T5,20h6.8Zm0,0.7H6q-0.72,0-1.21-0.49Q4.3,19.73 4.3,19V16.3h3V3.3H19.7v7.55q-0.2,0.03-0.36,0.06T19,11V4H8V16.3h5.15L12.45,17H5v2q0,0.43 0.29,0.71T6,20h5.8v0.7Zm2.5,0V18.75l5.28-5.25q0.13-0.13 0.25-0.16t0.25-0.04t0.26,0.05t0.24,0.15l0.92,0.95q0.1,0.13 0.15,0.25t0.05,0.25T21.65,15.2T21.5,15.45L16.25,20.7H14.3ZM21,14.95L20.08,14L21,14.95ZM15,20h0.95l3.6-3.6l-0.48-0.47l-0.45-0.5L15,19.05V20Zm4.07-4.08l-0.45-0.5l0.93,0.97l-0.48-0.47Z",
            budget: "M11.63,20.35v-2q-1.27-0.13-2.19-0.81q-0.91-0.69-1.36-1.89l0.65-0.3q0.45,1.1 1.21,1.7t2.09,0.6q1.18,0 2.19-0.6t1.01-1.95q0-1.13-0.74-1.81T11.88,12T9.21,10.65t-0.79-2q0-1.32 1.07-2.14t2.13-0.86v-2h0.7v2q0.97,0.07 1.7,0.48q0.72,0.4 1.25,1.22L14.68,7.7q-0.38-0.6-1.03-1T12.03,6.3q-1.17,0-2.04,0.65T9.13,8.65q0,0.95 0.63,1.55t2.63,1.25q1.85,0.6 2.7,1.45t0.85,2.2q0,1.42-1.06,2.3t-2.54,0.95v2h-0.7Z",
            statistics: "M7.93,10.52q-1.09,0-1.86-0.77T5.3,7.9T6.07,6.04T7.93,5.27T9.78,6.04T10.55,7.9T9.78,9.76q-0.77,0.77-1.86,0.77Zm-0-0.7q0.8,0 1.36-0.56T9.85,7.9T9.29,6.54T7.93,5.97T6.56,6.54T6,7.9T6.56,9.26T7.92,9.82ZM16.1,18.7q-1.09,0-1.86-0.77t-0.77-1.86t0.77-1.86t1.86-0.77t1.86,0.77t0.77,1.86t-0.77,1.86T16.1,18.7Zm1.36-1.26q0.56-0.56 0.56-1.36t-0.56-1.36T16.1,14.15t-1.36,0.56t-0.56,1.36q0,0.8 0.56,1.36T16.1,18t1.36-0.56ZM6.03,18.45L5.55,17.98L18,5.52L18.48,6L6.03,18.45Z",
            equipment: "M17.35,14.35v-0.7H20q0.15,0 0.25,0.1T20.35,14t-0.1,0.25T20,14.35H17.35Zm0,4v-0.7H20q0.15,0 0.25,0.1T20.35,18t-0.1,0.25T20,18.35H17.35Zm-2.7,1q-0.82,0-1.41-0.59q-0.59-0.59-0.59-1.41h-2v-2.7h2q0-0.83 0.59-1.41t1.41-0.59h1.7v6.7h-1.7ZM7,16.35q-1.4,0-2.38-0.98T3.65,13t0.97-2.38T7,9.65H8.5q0.88,0 1.51-0.64T10.65,7.5T10.01,5.99T8.5,5.35H5q-0.15,0-0.25-0.1T4.65,5t0.1-0.25T5,4.65H8.5q1.2,0 2.03,0.82T11.35,7.5T10.53,9.52T8.5,10.35H7q-1.09,0-1.87,0.78T4.35,13t0.78,1.87T7,15.65H9.65v0.7H7Z",
            crew: "M12,20.9V20.2h6.2q0.35,0 0.58-0.22T19,19.4V18.7H16.2V13.1H19V11q0-2.9-2.05-4.95T12,4T7.05,6.05T5,11v2.1H7.8v5.6h-2q-0.65,0-1.08-0.43T4.3,17.2V11q0-1.6 0.6-3T6.55,5.55T9,3.9t3-0.6t3,0.6t2.45,1.65T19.1,8t0.6,3v8.4q0,0.65-0.43,1.08T18.2,20.9H12ZM5.8,18H7.1V13.8H5v3.4q0,0.35 0.23,0.57T5.8,18Zm11.1,0H19V13.8H16.9V18ZM5.8,13.8q-0.35,0-0.58,0T5,13.8H7.1H5.8Zm11.1,0H19H16.9Z",
            talent: "M8.85,16.83L12,14.93l3.15,1.93l-0.82-3.6l2.78-2.4l-3.65-0.33L12,7.13L10.55,10.5L6.9,10.83l2.78,2.43L8.85,16.83ZM7.78,18.3L8.9,13.5L5.18,10.27l4.9-0.42L12,5.32l1.93,4.53l4.9,0.42L15.1,13.5l1.13,4.8L12,15.75L7.78,18.3ZM12,12.25Z",
            readme: "M8.65,17.35h6.7v-0.7H8.65v0.7Zm0-4h6.7v-0.7H8.65v0.7ZM6.8,20.7q-0.65,0-1.08-0.43T5.3,19.2V4.8q0-0.65 0.42-1.07T6.8,3.3h7.85L18.7,7.35V19.2q0,0.65-0.42,1.07T17.2,20.7H6.8Zm7.5-13V4H6.8Q6.5,4 6.25,4.25T6,4.8V19.2q0,0.3 0.25,0.55T6.8,20H17.2q0.3,0 0.55-0.25T18,19.2V7.7H14.3ZM6,4V7.7V4V7.7V19.2q0,0.3 0,0.55T6,20q0,0 0-0.25T6,19.2V4.8Q6,4.5 6,4.25T6,4Z",
            gh: "M41.4395 69.3848C28.8066 67.8535 19.9062 58.7617 19.9062 46.9902C19.9062 42.2051 21.6289 37.0371 24.5 33.5918C23.2559 30.4336 23.4473 23.7344 24.8828 20.959C28.7109 20.4805 33.8789 22.4902 36.9414 25.2656C40.5781 24.1172 44.4062 23.543 49.0957 23.543C53.7852 23.543 57.6133 24.1172 61.0586 25.1699C64.0254 22.4902 69.2891 20.4805 73.1172 20.959C74.457 23.543 74.6484 30.2422 73.4043 33.4961C76.4668 37.1328 78.0937 42.0137 78.0937 46.9902C78.0937 58.7617 69.1934 67.6621 56.3691 69.2891C59.623 71.3945 61.8242 75.9883 61.8242 81.252L61.8242 91.2051C61.8242 94.0762 64.2168 95.7031 67.0879 94.5547C84.4102 87.9512 98 70.6289 98 49.1914C98 22.1074 75.9883 6.69539e-07 48.9043 4.309e-07C21.8203 1.92261e-07 -1.9479e-07 22.1074 -4.3343e-07 49.1914C-6.20631e-07 70.4375 13.4941 88.0469 31.6777 94.6504C34.2617 95.6074 36.75 93.8848 36.75 91.3008L36.75 83.6445C35.4102 84.2188 33.6875 84.6016 32.1562 84.6016C25.8398 84.6016 22.1074 81.1563 19.4277 74.7441C18.375 72.1602 17.2266 70.6289 15.0254 70.3418C13.877 70.2461 13.4941 69.7676 13.4941 69.1934C13.4941 68.0449 15.4082 67.1836 17.3223 67.1836C20.0977 67.1836 22.4902 68.9063 24.9785 72.4473C26.8926 75.2227 28.9023 76.4668 31.2949 76.4668C33.6875 76.4668 35.2187 75.6055 37.4199 73.4043C39.0469 71.7773 40.291 70.3418 41.4395 69.3848Z",
            paste: "M5.8,19.7q-0.63,0-1.06-0.44T4.3,18.2V5.8q0-0.63 0.44-1.06T5.8,4.3h4.78q0.1-0.5 0.49-0.85T12,3.1t0.94,0.35T13.43,4.3H18.2q0.63,0 1.06,0.44Q19.7,5.18 19.7,5.8V18.2q0,0.63-0.44,1.06T18.2,19.7H5.8Zm0-0.7H18.2q0.3,0 0.55-0.25T19,18.2V5.8q0-0.3-0.25-0.55T18.2,5H15.7V7H8.3V5H5.8Q5.5,5 5.25,5.25T5,5.8V18.2q0,0.3 0.25,0.55T5.8,19ZM12.54,5.09q0.21-0.21 0.21-0.54T12.54,4.01T12,3.8T11.46,4.01q-0.21,0.21-0.21,0.54q0,0.33 0.21,0.54T12,5.3t0.54-0.21Z",
            cut: "M19.5,20.4L12.1,13L8.75,16.35q0.22,0.38 0.34,0.79T9.2,18q0,1.27-0.91,2.19Q7.38,21.1 6.1,21.1T3.91,20.19T3,18t0.91-2.19T6.1,14.9q0.45,0 0.86,0.11q0.41,0.11 0.79,0.34L11.1,12L7.75,8.65Q7.38,8.88 6.96,8.99T6.1,9.1q-1.28,0-2.19-0.91Q3,7.27 3,6Q3,4.72 3.91,3.81T6.1,2.9T8.29,3.81Q9.2,4.72 9.2,6q0,0.45-0.11,0.86Q8.98,7.27 8.75,7.65L21,19.9v0.5H19.5Zm-5-9.8l-1-1l6-6H21V4.1l-6.5,6.5ZM7.8,7.7Q8.5,7 8.5,6T7.8,4.3T6.1,3.6T4.4,4.3T3.7,6T4.4,7.7T6.1,8.4T7.8,7.7ZM12,11.9q-0.05,0.05-0.05,0.1T12,12.1t0.1,0.05t0.1-0.05T12.25,12T12.2,11.9t-0.1-0.05T12,11.9ZM7.8,19.7Q8.5,19 8.5,18T7.8,16.3T6.1,15.6T4.4,16.3T3.7,18t0.7,1.7t1.7,0.7t1.7-0.7Z",
            copy: "M9.15,16.7q-0.65,0-1.07-0.43T7.65,15.2V4.8q0-0.65 0.43-1.07T9.15,3.3h7.4q0.65,0 1.07,0.43T18.05,4.8V15.2q0,0.65-0.43,1.07T16.55,16.7H9.15Zm0-0.7h7.4q0.3,0 0.55-0.25t0.25-0.55V4.8q0-0.3-0.25-0.55T16.55,4H9.15Q8.85,4 8.6,4.25T8.35,4.8V15.2q0,0.3 0.25,0.55T9.15,16Zm-2.7,3.4q-0.65,0-1.08-0.42T4.95,17.9V6.8h0.7V17.9q0,0.3 0.25,0.55T6.45,18.7h8.1v0.7H6.45ZM8.35,16q0,0 0-0.25t0-0.55V4.8q0-0.3 0-0.55T8.35,4q0,0 0,0.25t0,0.55V15.2q0,0.3 0,0.55t0,0.25Z",
            bold: "M8.2,18.02V5.97H12q1.38,0 2.39,0.88T15.4,9.07q0,0.88-0.49,1.61T13.6,11.77q1,0.25 1.6,1.09t0.6,1.89q0,1.43-1.07,2.35q-1.08,0.92-2.53,0.92h-4Zm0.75-0.7h3.2q1.15,0 2-0.72T15,14.75T14.15,12.9q-0.85-0.72-2-0.72H8.95v5.15Zm0-5.85h3.03q1.05,0 1.84-0.68q0.79-0.67 0.79-1.72T13.81,7.35q-0.79-0.67-1.84-0.67H8.95v4.8Z",
            italic: "M6.03,18.02v-0.7H9.55L13.18,6.68H9.65V5.97h7.8v0.7H13.93L10.3,17.33h3.53v0.7H6.03Z",
            underline: "M5.9,18.73v-0.7H18.1v0.7H5.9Zm2.91-4.11q-1.16-1.16-1.16-3.19V4.07h0.7v7.35q0,1.7 0.98,2.68T12,15.08t2.68-0.97t0.97-2.68V4.07h0.7v7.35q0,2.03-1.16,3.19Q14.03,15.78 12,15.78T8.81,14.61Z",
            strike: "M12.15,19.2q-1.55,0-2.72-0.8T7.65,16.2L8.3,15.93q0.53,1.13 1.47,1.85t2.38,0.73q1.35,0 2.55-0.73t1.2-2.27q0-0.75-0.19-1.23t-0.56-0.92H16q0.28,0.3 0.44,0.85t0.16,1.3q0,1.77-1.34,2.74T12.15,19.2Zm-9.5-7.85v-0.7h18.7v0.7H2.65Zm9.4-6.6q1.25,0 2.13,0.5T15.73,6.8L15.1,7.1q-0.43-0.67-1.19-1.16T12.05,5.45q-1.7,0-2.63,0.98T8.7,8.65H8Q7.78,7.18 8.91,5.96t3.14-1.21Z",
            undo: "M7.53,17.7V17h7.3q1.55,0 2.62-1.09q1.08-1.09 1.08-2.64q0-1.55-1.08-2.63q-1.07-1.07-2.62-1.07H6.65l3.08,3.07l-0.5,0.5L5.3,9.23L9.23,5.3l0.5,0.5L6.65,8.88h8.18q1.83,0 3.11,1.29q1.29,1.29 1.29,3.11T17.94,16.4t-3.11,1.3H7.53Z",
            redo: "M9.18,17.7q-1.83,0-3.11-1.3q-1.29-1.3-1.29-3.13t1.29-3.11T9.18,8.88h8.18L14.28,5.8l0.5-0.5L18.7,9.23l-3.92,3.92l-0.5-0.5l3.08-3.07H9.18q-1.55,0-2.63,1.07q-1.08,1.08-1.08,2.63q0,1.55 1.08,2.64T9.18,17h7.3v0.7H9.18Z",

        };
        const svg = n => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${I[n]}"/></svg>`;
        const svgWithFill = (n, f) => `<svg viewBox="0 0 24 24" aria-hidden="true" fill="${f}"><path d="${I[n]}"/></svg>`
        const FONTS = ['Courier New', 'Georgia', 'Times New Roman', 'Arial', 'Verdana'];
        const ELEMENTS = [
            "Scene Heading",
            "Action",
            "Character",
            "Dialogue",
            "Parenthetical",
            "Transition",
            "Shot",
            "Sequence",
            "New Act",
            "End of Act",
            "Cast List",
            "Summary",
            "General",
            "Outline 1",
            "Outline 2",
            "Outline 3",
            "Note",
        ]
        const SIZES = [['1', '8'], ['2', '10'], ['3', '12'], ['4', '14'], ['5', '18'], ['6', '24'], ['7', '36']];
        const TABS = [
            {
                name: 'File', groups: [
                    {
                        name: 'File', items: [
                            { label: 'New', icon: "new", size: 'lg', fill: "currentColor", id: "new-blank" },
                            { label: 'Open', icon: "open", size: 'lg', id: "menu-button-open" },
                            { input: "Watermark", type: "text" }
                        ]
                    },
                    {
                        name: "Download", items: [
                            { section: "Download As", icon: "download", size: 'lg' },
                            { br: 1 },
                            { label: "PDF", id: "download-pdf" },
                            { label: "FDX", id: "download-fdx" }
                        ]
                    },
                    {
                        name: "Title Page", items: [
                            { label: "Edit Title Page", id: "title-page-toggle" }
                        ]
                    }
                ],
            },
            {
                name: 'Home', groups: [
                    {
                        name: 'Clipboard', items: [
                            { label: 'Paste', icon: 'paste', size: 'lg', id: "paste-button" },
                            { label: 'Cut', icon: 'cut', cmd: 'cut', id: "cut-button" },
                            { label: 'Copy', icon: 'copy', cmd: 'copy', id: "copy-button" }
                        ]
                    },
                    {
                        name: 'Editing', items: [
                            { label: 'Undo', icon: 'undo', cmd: 'undo', id: "undo-button" },
                            { label: 'Redo', icon: 'redo', cmd: 'redo', id: "redo-button" }
                        ]
                    },
                    {
                        name: 'Font', items: [
                            { select: FONTS.map(f => [f, f]), cmd: 'fontName', title: 'Font' },
                            { select: SIZES, cmd: 'fontSize', title: 'Size', def: '3' },
                            { br: 1 },
                            { icon: 'bold', title: 'Bold', cmd: 'bold', state: 'bold' },
                            { icon: 'italic', title: 'Italic', cmd: 'italic', state: 'italic' },
                            { icon: 'underline', title: 'Underline', cmd: 'underline', state: 'underline' },
                            { icon: 'strike', title: 'Strikethrough', cmd: 'strikeThrough', state: 'strikeThrough' }
                        ]
                    },
                    {
                        name: "Elements", items: [
                            { select: ELEMENTS.map(f => [f, f]), title: "Current Element", id: "element-types", label: "Current Element" },
                            { label: "Formatting", icon: "formatting", size: 'lg' },
                        ]
                    },
                ]
            },
            {
                name: 'View', groups: [
                    {
                        name: 'View', items: [
                            { label: 'Find', icon: 'find', size: 'lg' },
                            { label: "Go To", icon: 'goto', size: 'lg' }
                        ]
                    }
                ]
            },
            {
                name: "Notes", groups: [
                    {
                        name: 'General', items: [
                            { label: 'Add', icon: "addNote", size: 'lg' },
                            { label: 'Comments', icon: "comments", size: 'lg' },
                            { label: 'Bookmarks', icon: "bookmarks", size: 'lg' }
                        ]
                    },
                    {
                        name: 'Story', items: [
                            { label: 'Scenes', icon: "scene", size: 'lg' },
                            { label: 'Beats', icon: "beats", size: 'lg' },
                            { label: 'Structure Points', icon: "structure", size: 'lg' },
                            { label: "Characters", icon: "characters", size: 'lg', fill: "currentColor" }
                        ]
                    },
                    {
                        name: "Production", items: [
                            { label: 'SFX', icon: "sfx", size: 'lg' },
                            { label: 'VFX', icon: "vfx", size: 'lg' },
                            { label: 'Props', icon: "props", size: 'lg' }
                        ]
                    }
                ]
            },
            {
                name: "Production", groups: [
                    {
                        name: "Production", items: [
                            { label: "List", icon: "list", size: "lg" },
                            { label: "Statistics", icon: "statistics", size: "lg" },
                            { label: "Budget", icon: "budget", size: "lg" },
                            { label: "Locations", icon: "location", size: "lg" },
                            { label: "Register with WGA", icon: "register", size: "lg" }
                        ]
                    },
                    {
                        name: "Cast and Crew", items: [
                            { label: "Talent", icon: "talent", size: "lg" },
                            { label: "Crew", icon: "crew", size: "lg" },
                            { label: "Equipment", icon: "equipment", size: "lg" }
                        ]
                    }
                ]
            },
            {
                name: "Help", groups: [
                    {
                        name: "Help", items: [
                            { label: "README.md", icon: "readme", size: 'lg' },
                            { label: "GitHub", icon: 'gh', size: 'lg', fill: "currentColor" }
                        ]
                    }
                ]
            }
        ];

        /* ---------- renderer ---------- */
        const tabsEl = root.getElementById('tabs'), ribbon = root.getElementById('ribbon');
        const stateBtns = [];
        function makeBtn(it) {
            const b = document.createElement('button'); b.type = 'button';
            b.className = 'btn' + (it.size === 'lg' ? ' lg' : '') + (it.cls ? ' ' + it.cls : '') + (!it.icon ? ' txt' : '');
            b.id = it.id ?? "";
            b.title = it.title || it.label || '';
            b.innerHTML = (it.icon ? it.fill ? svgWithFill(it.icon, it.fill) : svg(it.icon) : '') + (it.label && (it.size === 'lg' || !it.icon || it.showLabel) ? `<span>${it.label}</span>` : '');
            b.onmousedown = e => e.preventDefault();               /* keep text selection in the page */
            if (it.toggle) { b.setAttribute('aria-pressed', !!it.on); b.onclick = () => { const v = b.getAttribute('aria-pressed') !== 'true'; b.setAttribute('aria-pressed', v); it.fn(v) } }
            // else b.onclick = () => { it.fn ? it.fn() : cmd(it.cmd, it.arg) };
            if (it.state) stateBtns.push([b, it.state]);
            return b;
        }
        function makeSection(it) {
            const s = document.createElement('section');
            s.id = it.id ?? ""
            s.className = 'section' + (it.size === 'lg' ? ' lg' : '') + (it.cls ? ' ' + it.cls : '') + (!it.icon ? ' txt' : '');
            s.title = it.title || it.label || it.section || '';
            s.innerHTML = (it.icon ? it.fill ? svgWithFill(it.icon, it.fill) : svg(it.icon) : '') + (it.section && (it.size === 'lg' || !it.icon || it.showLabel) ? `<span>${it.section}</span>` : '');
            s.onmousedown = e => e.preventDefault();               /* keep text selection in the page */
            if (it.toggle) { s.setAttribute('aria-pressed', !!it.on); s.onclick = () => { const v = s.getAttribute('aria-pressed') !== 'true'; s.setAttribute('aria-pressed', v); it.fn(v) } }
            // else s.onclick = () => { it.fn ? it.fn() : cmd(it.cmd, it.arg) };
            if (it.state) stateBtns.push([s, it.state]);
            return s;
        }
        function makeSelect(it) {
            const s = document.createElement('select'); s.title = it.title; s.setAttribute('aria-label', it.title);
            s.id = it.id ?? ""
            s.innerHTML = it.select.map(([v, l]) => `<option value="${v}">${l}</option>`).join('');
            if (it.def) s.value = it.def;
            if (it.label) {
                const wrapper = document.createElement("div")
                const label = document.createElement("label")
                s.setAttribute("id", it.id ?? it.label)
                label.setAttribute("for", it.id ?? it.label)
                label.textContent = it.label
                wrapper.appendChild(label)
                wrapper.appendChild(s)
                return wrapper
            }
            // s.onchange = () => cmd(it.cmd, s.value);
            return s;
        }
        function makeInput(it) {
            const i = document.createElement('input')
            i.id = it.id ?? ""
            i.setAttribute("type", it.type ? it.type : "text")
            if (it.input.length) {
                const wrapper = document.createElement("div")
                const label = document.createElement("label")
                i.setAttribute("id", it.input)
                label.setAttribute("for", it.input)
                label.textContent = it.input
                wrapper.appendChild(label)
                wrapper.appendChild(i)
                return wrapper
            } else {
                return i
            }
        }
        TABS.forEach((t, i) => {
            const tab = document.createElement('button'); tab.type = 'button'; tab.role = 'tab'; tab.textContent = t.name;
            tab.id = 'tab-' + i; tab.setAttribute('aria-controls', 'panel-' + i); tab.setAttribute('aria-selected', i === 1); tab.tabIndex = i === 1 ? 0 : -1;
            tabsEl.appendChild(tab);
            const panel = document.createElement('div'); panel.className = 'panel' + (i === 1 ? ' on' : ''); panel.id = 'panel-' + i; panel.role = 'tabpanel'; panel.setAttribute('aria-labelledby', tab.id);
            t.groups.forEach(g => {
                const ge = document.createElement('div'); ge.className = 'group'; ge.role = 'group'; ge.setAttribute('aria-label', g.name);
                const items = document.createElement('div'); items.className = 'items';
                let stack = null, row = null;
                g.items.forEach(it => {
                    if (it.size === 'lg') { stack = row = null; items.appendChild(it.section ? makeSection(it) : makeBtn(it)); return }
                    if (!stack) { stack = document.createElement('div'); stack.className = 'stack'; items.appendChild(stack); row = null }
                    if (!row || it.br) { row = document.createElement('div'); row.className = 'row'; stack.appendChild(row) }
                    if (it.br) return;
                    row.appendChild(it.select ? makeSelect(it) : it.section ? makeSection(it) : it.input ? makeInput(it) : makeBtn(it));
                });
                ge.appendChild(items);
                const n = document.createElement('div'); n.className = 'gname'; n.textContent = g.name; ge.appendChild(n);
                panel.appendChild(ge);
            });
            ribbon.appendChild(panel);
        });
        function selectTab(i) {
            [...tabsEl.children].forEach((t, j) => { t.setAttribute('aria-selected', j === i); t.tabIndex = j === i ? 0 : -1 });
            [...ribbon.children].forEach((p, j) => p.classList.toggle('on', j === i));
        }
        tabsEl.addEventListener('click', e => { const i = [...tabsEl.children].indexOf(e.target); if (i > -1) selectTab(i) });
        tabsEl.addEventListener('keydown', e => {
            console.log("here?")
            const n = tabsEl.children.length, cur = [...tabsEl.children].indexOf(document.activeElement);
            if (cur < 0 || !['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
            const next = (cur + (e.key === 'ArrowRight' ? 1 : n - 1)) % n; selectTab(next); tabsEl.children[next].focus();
        });
    }
}

customElements.define('header-menu', HeaderMenu);
