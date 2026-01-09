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

    // 3. CSS des presets globaux
    if (data.presets) {
        for (const preset of Object.values(data.presets)) {
            if (preset.globalEnabled && preset.css) {
                combinedCSS += `/* Preset: ${preset.name} */\n${preset.css}\n\n`;
                if (preset.visualEdits) {
                    for (const [selector, props] of Object.entries(preset.visualEdits)) {
                        combinedCSS += `${selector} { `;
                        for (const [p, v] of Object.entries(props)) combinedCSS += `${p}: ${v} !important; `;
                        combinedCSS += `}\n`;
                    }
                }
                combinedCSS += '\n';
            }
        }
    }

    // 4. Site-Specific CSS
    const siteConfig = data.sites?.[hostname];
    if (siteConfig && siteConfig.enabled !== false) {
        // CSS des groupes de variantes
        if (siteConfig.variantGroupId && data.variantGroups) {
            const variantGroup = data.variantGroups[siteConfig.variantGroupId];
            if (variantGroup && variantGroup.enabled) {
                combinedCSS += `/* Variante: ${variantGroup.name} */\n${variantGroup.css}\n\n`;
                for (const [selector, props] of Object.entries(variantGroup.visualEdits)) {
                    combinedCSS += `${selector} { `;
                    for (const [p, v] of Object.entries(props)) combinedCSS += `${p}: ${v} !important; `;
                    combinedCSS += `}\n`;
                }
                combinedCSS += '\n';
            }
        }

        // CSS des presets pour ce site
        if (data.presets && hostname) {
            for (const preset of Object.values(data.presets)) {
                if (preset.enabledSites?.includes(hostname) && preset.css) {
                    combinedCSS += `/* Preset: ${preset.name} */\n${preset.css}\n\n`;
                    if (preset.visualEdits) {
                        for (const [selector, props] of Object.entries(preset.visualEdits)) {
                            combinedCSS += `${selector} { `;
                            for (const [p, v] of Object.entries(props)) combinedCSS += `${p}: ${v} !important; `;
                            combinedCSS += `}\n`;
                        }
                    }
                    combinedCSS += '\n';
                }
            }
        }

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
 * Perform injection into a specific tab via messaging (Reactive) and direct CSS injection for iframes
 */
async function injectToTab(tabId: number, url: string) {
    try {
        const hostname = new URL(url).hostname;
        const data = await chrome.storage.local.get(['globalEnabled', 'globalCSS', 'globalVisualEdits', 'sites', 'variantGroups', 'presets']) as StorageSchema;

        const css = generateCombinedCSS(data, hostname);

        if (!css || css.trim() === '') return;

        // Fonction pour injecter le CSS dans toutes les frames (y compris les iframes)
        const injectCSS = () => {
            chrome.scripting.insertCSS({
                target: {
                    tabId: tabId,
                    allFrames: true  // Injecter dans toutes les frames, y compris les iframes
                },
                css: css
            }).catch((err) => {
                console.log("Impossible d'injecter le CSS:", err);
            });
        };

        // Injection immédiate dans toutes les frames
        injectCSS();

        // Réinjection après 1500ms pour les iframes tardives
        setTimeout(() => injectCSS(), 1500);

        // Réinjection après 3000ms pour les iframes très tardives
        setTimeout(() => injectCSS(), 3000);

        // Envoyer aussi le message au content script pour la réactivité (mise à jour en temps réel)
        chrome.tabs.sendMessage(tabId, { type: 'APPLY_CSS', payload: { css } }, (response) => {
            // Suppress error when content script is not ready (page refreshing)
            if (chrome.runtime.lastError) {
                void chrome.runtime.lastError;
                return;
            }
            // Le message peut échouer si le content script n'est pas encore chargé, c'est normal
            // L'injection directe avec allFrames garantit que le CSS est appliqué
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
            // Répondre après l'injection
            sendResponse({ status: 'refreshed' });
        });
        return true; // Réponse asynchrone
    } else if (message.type === 'INJECT_CSS_ALL_FRAMES') {
        // Injection directe du CSS dans toutes les frames (y compris les iframes)
        // comme dans inject-style
        const { css, tabId } = message.payload;
        if (css && tabId) {
            const injectCSS = () => {
                chrome.scripting.insertCSS({
                    target: {
                        tabId: tabId,
                        allFrames: true  // Injecter dans toutes les frames, y compris les iframes
                    },
                    css: css
                }).catch((err) => {
                    console.log("Impossible d'injecter le CSS:", err);
                });
            };

            // Injection immédiate
            injectCSS();

            // Réinjection après 1500ms pour les iframes tardives
            setTimeout(() => injectCSS(), 1500);

            // Réinjection après 3000ms pour les iframes très tardives
            setTimeout(() => injectCSS(), 3000);

            // Répondre immédiatement
            sendResponse({ status: 'injected' });
        } else {
            sendResponse({ status: 'error', message: 'Missing css or tabId' });
        }
        return false; // Réponse synchrone
    }
    return false; // Pas de réponse pour les autres messages
});

export { }
