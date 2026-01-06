// Injector Pro - Background Script
import { StorageSchema } from '../types';

// Set side panel behavior
chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error(error));

/**
 * Generate the combined CSS for a specific hostname
 */
function generateCombinedCSS(data: StorageSchema, hostname: string): string {
    let combinedCSS = '';

    if (data.globalEnabled === false) return '';

    // 1. Global CSS
    if (data.globalCSS) combinedCSS += `/* Global CSS */\n${data.globalCSS}\n\n`;

    // 2. Global Visual Edits
    if (data.globalVisualEdits) {
        let gvCSS = '';
        for (const [selector, properties] of Object.entries(data.globalVisualEdits)) {
            gvCSS += `${selector} { `;
            for (const [prop, value] of Object.entries(properties)) {
                gvCSS += `${prop}: ${value} !important; `;
            }
            gvCSS += `} `;
        }
        if (gvCSS) combinedCSS += `/* Global Visual Edits */\n${gvCSS}\n\n`;
    }

    // 3. Site-Specific CSS
    const siteConfig = data.sites?.[hostname];
    if (siteConfig && siteConfig.enabled !== false) {
        if (siteConfig.css) combinedCSS += `/* Site CSS (${hostname}) */\n${siteConfig.css}\n\n`;

        if (siteConfig.visualEdits) {
            let visualCSS = '';
            for (const [selector, properties] of Object.entries(siteConfig.visualEdits)) {
                visualCSS += `${selector} { `;
                for (const [prop, value] of Object.entries(properties)) {
                    visualCSS += `${prop}: ${value} !important; `;
                }
                visualCSS += `} `;
            }
            if (visualCSS) combinedCSS += `/* Site Visual Edits */\n${visualCSS}\n\n`;
        }
    }

    return combinedCSS;
}

/**
 * Perform injection into a specific tab via messaging (Reactive)
 */
async function injectToTab(tabId: number, url: string) {
    try {
        const hostname = new URL(url).hostname;
        const data = await chrome.storage.local.get(['globalEnabled', 'globalCSS', 'globalVisualEdits', 'sites']) as StorageSchema;

        const css = generateCombinedCSS(data, hostname);

        // We attempt to send the message. If the content script is not yet loaded, 
        // we use scripting.insertCSS as a fallback for the first load (to avoid FOUC)
        // but the content script will take over for reactivity.
        chrome.tabs.sendMessage(tabId, { type: 'APPLY_CSS', payload: { css } }, (response) => {
            if (chrome.runtime.lastError) {
                // Fallback: Use scripting.insertCSS for initial load if message fails
                chrome.scripting.insertCSS({
                    target: { tabId, allFrames: true },
                    css: css
                }).catch(() => { });
            }
        });
    } catch (error) {
        console.error('Injection error:', error);
    }
}

// Listen for tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url && /^https?:/.test(tab.url)) {
        injectToTab(tabId, tab.url);
    }
});

// Listen for messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'REFRESH_INJECTION') {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]?.id && tabs[0].url) {
                injectToTab(tabs[0].id, tabs[0].url);
            }
        });
    }
});

export { }
