// Injector Pro - Element Picker Content Script

(function () {
    let hoveredElement: HTMLElement | null = null;
    const overlay = document.createElement('div');

    // Style the overlay
    Object.assign(overlay.style, {
        position: 'fixed',
        pointerEvents: 'none',
        zIndex: '2147483647',
        background: 'rgba(79, 70, 229, 0.3)',
        border: '2px solid #4f46e5',
        borderRadius: '4px',
        transition: 'all 0.1s ease-out',
        display: 'none'
    });

    const label = document.createElement('div');
    Object.assign(label.style, {
        position: 'absolute',
        background: '#4f46e5',
        color: 'white',
        padding: '2px 6px',
        fontSize: '10px',
        borderRadius: '4px',
        top: '-20px',
        left: '0',
        whiteSpace: 'nowrap',
        fontWeight: 'bold'
    });
    overlay.appendChild(label);

    const startPicking = () => {
        document.body.appendChild(overlay);
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('click', onClick, true);
        document.addEventListener('keydown', onKeyDown);
        document.body.style.cursor = 'crosshair';
    };

    const stopPicking = () => {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('click', onClick, true);
        document.removeEventListener('keydown', onKeyDown);
        document.body.style.cursor = '';
        hoveredElement = null;
        overlay.style.display = 'none';
    };

    const onMouseMove = (e: MouseEvent) => {
        const el = e.target as HTMLElement;
        if (el === hoveredElement || el === overlay) return;

        hoveredElement = el;
        const rect = el.getBoundingClientRect();

        overlay.style.display = 'block';
        overlay.style.top = `${rect.top}px`;
        overlay.style.left = `${rect.left}px`;
        overlay.style.width = `${rect.width}px`;
        overlay.style.height = `${rect.height}px`;

        label.textContent = el.tagName.toLowerCase() +
            (el.id ? `#${el.id}` : '') +
            (el.className ? `.${el.className.split(' ').join('.')}` : '');
    };

    const onClick = (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (hoveredElement) {
            const selector = getBestSelector(hoveredElement);
            chrome.runtime.sendMessage({ type: 'ELEMENT_PICKED', payload: { selector } });
        }
        stopPicking();
    };

    const onKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
            stopPicking();
            chrome.runtime.sendMessage({ type: 'STOP_PICKER' });
        }
    };

    const getBestSelector = (el: HTMLElement): string => {
        if (el.id) return `#${el.id}`;

        let selector = el.tagName.toLowerCase();
        if (el.className) {
            const classes = el.className.split(' ').filter(c => c).join('.');
            if (classes) selector += `.${classes}`;
        }

        return selector;
    };

    // Listen for messages
    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
        if (msg.type === 'START_PICKER') {
            startPicking();
            sendResponse({ status: 'started' });
            return false; // Réponse synchrone
        } else if (msg.type === 'STOP_PICKER') {
            stopPicking();
            sendResponse({ status: 'stopped' });
            return false; // Réponse synchrone
        } else if (msg.type === 'PING') {
            sendResponse({ type: 'PONG' });
            return false; // Réponse synchrone
        }
        return false; // Pas de réponse pour les autres messages
    });
})();
