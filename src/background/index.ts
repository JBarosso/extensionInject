// Injector Pro - Background Script

// Set side panel behavior
chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error(error));

/**
 * Synchronize User Scripts with storage
 * This allows JS injection that bypasses host CSP.
 */
async function syncUserScripts() {
    const data = await chrome.storage.local.get(['jsEnabled', 'customJS', 'globalEnabled']);

    // @ts-ignore
    if (!chrome.userScripts) {
        console.warn('userScripts API not available. Update Chrome to 120+ or ensure permission is set.');
        return;
    }

    try {
        // @ts-ignore
        const scripts = await chrome.userScripts.getScripts({ ids: ['custom-js'] });

        if (!data.globalEnabled || !data.jsEnabled || !data.customJS) {
            if (scripts.length > 0) {
                // @ts-ignore
                await chrome.userScripts.unregister({ ids: ['custom-js'] });
            }
            return;
        }

        const scriptConfig = {
            id: 'custom-js',
            matches: ['<all_urls>'],
            js: [{ code: data.customJS }],
            runAt: 'document_idle'
        };

        if (scripts.length > 0) {
            // @ts-ignore
            await chrome.userScripts.update([scriptConfig]);
        } else {
            // @ts-ignore
            await chrome.userScripts.register([scriptConfig]);
        }
    } catch (err) {
        console.error('Failed to sync user scripts:', err);
    }
}

// Initial sync
syncUserScripts();

// Listen for storage changes to update user scripts in real-time
chrome.storage.onChanged.addListener((changes) => {
    if (changes.customJS || changes.jsEnabled || changes.globalEnabled) {
        syncUserScripts();
    }
});

/**
 * Perform injection into a specific tab (CSS and Fallback JS)
 */
async function injectToTab(tabId: number) {
    try {
        const data = await chrome.storage.local.get([
            'globalEnabled',
            'cssEnabled',
            'jsEnabled',
            'customCSS',
            'customJS'
        ]);

        if (!data.globalEnabled) return;

        // Inject CSS (Always CSP-safe)
        if (data.cssEnabled && data.customCSS) {
            await chrome.scripting.insertCSS({
                target: { tabId, allFrames: true },
                css: data.customCSS
            });
        }

        // JS Fallback for older Chrome versions without userScripts
        // @ts-ignore
        if (!chrome.userScripts && data.jsEnabled && data.customJS) {
            await chrome.scripting.executeScript({
                target: { tabId, allFrames: true },
                func: (code: string) => {
                    try {
                        const script = document.createElement('script');
                        script.textContent = code;
                        (document.head || document.documentElement).appendChild(script);
                        script.remove();
                    } catch (e) {
                        console.error('Injector Pro Fallback Error:', e);
                    }
                },
                args: [data.customJS]
            });
        }
    } catch (error) {
        console.error('Injection error:', error);
    }
}

// Listen for tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url && /^https?:/.test(tab.url)) {
        injectToTab(tabId);
    }
});

export { }
