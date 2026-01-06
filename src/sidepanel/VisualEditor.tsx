import { useState, useEffect } from 'react';
import { Eye, EyeOff, Minus, Plus, Type, Palette, Move, Square, GripVertical } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface VisualEditorProps {
    selector: string;
    onUpdate: (properties: Record<string, string>) => void;
    currentProperties: Record<string, string>;
    tabId?: number | null;
}

export default function VisualEditor({ selector, onUpdate, currentProperties, tabId }: VisualEditorProps) {
    const [isDragging, setIsDragging] = useState(false);
    const updateProp = (prop: string, value: string) => {
        onUpdate({ ...currentProperties, [prop]: value });
    };

    const removeProp = (prop: string) => {
        const next = { ...currentProperties };
        delete next[prop];
        onUpdate(next);
    };

    const toggleDragMode = () => {
        const next = !isDragging;
        setIsDragging(next);

        if (next && tabId) {
            // Activer le mode drag dans le content script
            chrome.tabs.sendMessage(tabId, {
                type: 'START_DRAG',
                payload: { selector }
            });
        } else if (tabId) {
            // Désactiver le mode drag
            chrome.tabs.sendMessage(tabId, {
                type: 'STOP_DRAG'
            });
        }

        // Activer position fixed si on active le drag
        if (next) {
            const hasPosition = currentProperties['position'] === 'fixed' || currentProperties['position'] === 'absolute';
            if (!hasPosition) {
                updateProp('position', 'fixed');
            }
        }
    };

    // Écouter les mises à jour de position depuis le content script
    useEffect(() => {
        const messageListener = (message: any) => {
            if (message.type === 'ELEMENT_DRAGGED' && message.payload.selector === selector) {
                const { top, left } = message.payload;
                const newProps = {
                    ...currentProperties,
                    top: `${top}px`,
                    left: `${left}px`,
                    position: currentProperties['position'] || 'fixed'
                };
                onUpdate(newProps);
            }
        };

        chrome.runtime.onMessage.addListener(messageListener);
        return () => chrome.runtime.onMessage.removeListener(messageListener);
    }, [selector, currentProperties, onUpdate]);

    return (
        <div className="flex flex-col gap-4 p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Cible</span>
                    <span className="text-xs font-mono text-blue-500 truncate max-w-[150px]">{selector}</span>
                </div>
                <button
                    onClick={() => onUpdate({})}
                    className="text-[10px] text-slate-400 hover:text-red-500 transition-colors"
                >
                    Réinitialiser
                </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
                {/* Visibility */}
                <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                        <Eye size={10} /> Visibilité
                    </label>
                    <button
                        onClick={() => currentProperties['display'] === 'none' ? removeProp('display') : updateProp('display', 'none')}
                        className={cn(
                            "py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2",
                            currentProperties['display'] === 'none'
                                ? "bg-red-500/10 border-red-500/30 text-red-500"
                                : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                        )}
                    >
                        {currentProperties['display'] === 'none' ? <EyeOff size={14} /> : <Eye size={14} />}
                        {currentProperties['display'] === 'none' ? 'Caché' : 'Visible'}
                    </button>
                </div>

                {/* Font Size */}
                <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                        <Type size={10} /> Taille Texte
                    </label>
                    <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 rounded-xl p-1 border border-slate-200 dark:border-slate-700">
                        <button
                            onClick={() => {
                                const current = parseInt(currentProperties['font-size'] || '16px');
                                updateProp('font-size', `${current - 1}px`);
                            }}
                            className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-500"
                        >
                            <Minus size={14} />
                        </button>
                        <span className="flex-1 text-center text-xs font-bold font-mono">
                            {currentProperties['font-size'] || 'Auto'}
                        </span>
                        <button
                            onClick={() => {
                                const current = parseInt(currentProperties['font-size'] || '16px');
                                updateProp('font-size', `${current + 1}px`);
                            }}
                            className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-500"
                        >
                            <Plus size={14} />
                        </button>
                    </div>
                </div>

                {/* Colors */}
                <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                        <Palette size={10} /> Couleur Fond
                    </label>
                    <input
                        type="color"
                        value={currentProperties['background-color'] || '#ffffff'}
                        onChange={(e) => updateProp('background-color', e.target.value)}
                        className="w-full h-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 cursor-pointer overflow-hidden p-0"
                    />
                </div>

                <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                        <Palette size={10} /> Couleur Texte
                    </label>
                    <input
                        type="color"
                        value={currentProperties['color'] || '#000000'}
                        onChange={(e) => updateProp('color', e.target.value)}
                        className="w-full h-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 cursor-pointer overflow-hidden p-0"
                    />
                </div>

                {/* Drag & Drop Mode */}
                <div className="flex flex-col gap-1.5 col-span-2 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1 mb-1">
                        <GripVertical size={10} /> Position Avancée
                    </label>
                    <button
                        onClick={toggleDragMode}
                        className={cn(
                            "py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2",
                            isDragging
                                ? "bg-indigo-600 border-indigo-400 text-white"
                                : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                        )}
                    >
                        <Move size={14} />
                        {isDragging ? 'Mode Drag Actif' : 'Activer Drag & Drop'}
                    </button>
                    {isDragging && (
                        <p className="text-[9px] text-slate-400 text-center">
                            Cliquez et glissez l'élément sur la page pour le repositionner
                        </p>
                    )}
                </div>

                {/* Layout */}
                <div className="flex flex-col gap-1.5 col-span-2 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1 mb-1">
                        <Square size={10} /> Espacement & Taille
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 p-2 rounded-xl border border-slate-200 dark:border-slate-700">
                            <span className="text-[9px] font-bold text-slate-400">Largeur</span>
                            <input
                                type="text"
                                placeholder="auto"
                                value={currentProperties['width'] || ''}
                                onChange={(e) => updateProp('width', e.target.value)}
                                className="bg-transparent border-none outline-none text-xs font-mono w-full"
                            />
                        </div>
                        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 p-2 rounded-xl border border-slate-200 dark:border-slate-700">
                            <span className="text-[9px] font-bold text-slate-400">Rayon</span>
                            <input
                                type="text"
                                placeholder="0px"
                                value={currentProperties['border-radius'] || ''}
                                onChange={(e) => updateProp('border-radius', e.target.value)}
                                className="bg-transparent border-none outline-none text-xs font-mono w-full"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
