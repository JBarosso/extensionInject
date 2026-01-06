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

    // Drag and Drop functionality
    let dragMode = false;
    let dragTarget: HTMLElement | null = null;
    let dragSelector: string | null = null;
    let isDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let elementStartX = 0;
    let elementStartY = 0;

    const startDragMode = (selector: string) => {
        dragMode = true;
        dragSelector = selector;
        
        // Trouver l'élément
        try {
            const elements = document.querySelectorAll(selector);
            if (elements.length > 0) {
                dragTarget = elements[0] as HTMLElement;
                
                // S'assurer que l'élément a position fixed ou absolute
                const computedStyle = window.getComputedStyle(dragTarget);
                const currentPosition = computedStyle.position;
                
                if (currentPosition !== 'fixed' && currentPosition !== 'absolute') {
                    dragTarget.style.position = 'fixed';
                }
                
                // Ajouter un style pour indiquer qu'on peut le déplacer
                dragTarget.style.cursor = 'move';
                dragTarget.style.userSelect = 'none';
                dragTarget.style.zIndex = '999999';
                
                // Ajouter un overlay visuel
                dragTarget.style.outline = '2px dashed #4f46e5';
                dragTarget.style.outlineOffset = '2px';
            }
        } catch (e) {
            console.error('Erreur lors de la sélection de l\'élément:', e);
        }
    };

    const stopDragMode = () => {
        dragMode = false;
        if (dragTarget) {
            dragTarget.style.cursor = '';
            dragTarget.style.userSelect = '';
            dragTarget.style.outline = '';
            dragTarget.style.outlineOffset = '';
        }
        dragTarget = null;
        dragSelector = null;
        isDragging = false;
    };

    const handleMouseDown = (e: MouseEvent) => {
        if (!dragMode || !dragTarget) return;
        
        // Vérifier si on clique sur l'élément cible
        let target = e.target as HTMLElement;
        let found = false;
        
        while (target && target !== document.body) {
            if (target === dragTarget) {
                found = true;
                break;
            }
            target = target.parentElement as HTMLElement;
        }
        
        if (!found) return;
        
        e.preventDefault();
        e.stopPropagation();
        
        isDragging = true;
        dragStartX = e.clientX;
        dragStartY = e.clientY;
        
        const rect = dragTarget.getBoundingClientRect();
        elementStartX = rect.left;
        elementStartY = rect.top;
        
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    const handleMouseMove = (e: MouseEvent) => {
        if (!isDragging || !dragTarget) return;
        
        const deltaX = e.clientX - dragStartX;
        const deltaY = e.clientY - dragStartY;
        
        const newX = elementStartX + deltaX;
        const newY = elementStartY + deltaY;
        
        dragTarget.style.left = `${newX}px`;
        dragTarget.style.top = `${newY}px`;
    };

    const handleMouseUp = (e: MouseEvent) => {
        if (!isDragging || !dragTarget || !dragSelector) return;
        
        isDragging = false;
        
        const rect = dragTarget.getBoundingClientRect();
        const top = Math.round(rect.top);
        const left = Math.round(rect.left);
        
        // Envoyer la nouvelle position au sidepanel
        chrome.runtime.sendMessage({
            type: 'ELEMENT_DRAGGED',
            payload: {
                selector: dragSelector,
                top,
                left
            }
        });
        
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
    };

    // Écouter les clics pour démarrer le drag
    document.addEventListener('mousedown', handleMouseDown);

    // Listen for messages from the extension
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.type === 'APPLY_CSS') {
            applyCSS(message.payload.css);
            sendResponse({ status: 'applied' });
        } else if (message.type === 'PING') {
            sendResponse({ type: 'PONG' });
        } else if (message.type === 'START_DRAG') {
            startDragMode(message.payload.selector);
            sendResponse({ status: 'drag_started' });
        } else if (message.type === 'STOP_DRAG') {
            stopDragMode();
            sendResponse({ status: 'drag_stopped' });
        }
    });

    // Signal readiness to background or sidepanel if needed
    // (In V3, the sidepanel can query the tab or the tab can send a message)
})();
