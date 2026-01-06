// Injector Pro - Style Injector Content Script

(function () {
    const STYLE_ID = 'injector-pro-managed-styles';
    let styleTag = document.getElementById(STYLE_ID) as HTMLStyleElement;

    if (!styleTag) {
        styleTag = document.createElement('style');
        styleTag.id = STYLE_ID;
        document.documentElement.appendChild(styleTag);
    }

    const applyCSS = (css: string) => {
        if (styleTag) {
            styleTag.textContent = css;
        }
    };

    // Listen for messages from the extension
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.type === 'APPLY_CSS') {
            applyCSS(message.payload.css);
            sendResponse({ status: 'applied' });
        } else if (message.type === 'PING') {
            sendResponse({ type: 'PONG' });
        }
    });

    // Signal readiness to background or sidepanel if needed
    // (In V3, the sidepanel can query the tab or the tab can send a message)
})();
