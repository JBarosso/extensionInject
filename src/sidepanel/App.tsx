import { useState, useEffect, useCallback } from 'react'
import { Info, Settings, Zap, Check, X, Code2, FileCode2, Power } from 'lucide-react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export default function App() {
    const [globalEnabled, setGlobalEnabled] = useState(true)
    const [cssEnabled, setCssEnabled] = useState(true)
    const [jsEnabled, setJsEnabled] = useState(true)
    const [customCSS, setCustomCSS] = useState('')
    const [customJS, setCustomJS] = useState('')
    const [showHelp, setShowHelp] = useState(false)
    const [status, setStatus] = useState('')
    const [isInitialized, setIsInitialized] = useState(false)

    // Load state from storage
    useEffect(() => {
        chrome.storage.local.get([
            'globalEnabled',
            'cssEnabled',
            'jsEnabled',
            'customCSS',
            'customJS',
            'darkMode'
        ], (result) => {
            if (result.globalEnabled !== undefined) setGlobalEnabled(result.globalEnabled)
            if (result.cssEnabled !== undefined) setCssEnabled(result.cssEnabled)
            if (result.jsEnabled !== undefined) setJsEnabled(result.jsEnabled)
            setCustomCSS(result.customCSS || '')
            setCustomJS(result.customJS || '')

            if (result.darkMode === undefined || result.darkMode === true) {
                document.documentElement.classList.add('dark')
            } else {
                document.documentElement.classList.remove('dark')
            }
            setIsInitialized(true)
        })
    }, [])

    // Save state on change
    useEffect(() => {
        if (!isInitialized) return
        const timeout = setTimeout(() => {
            chrome.storage.local.set({
                globalEnabled,
                cssEnabled,
                jsEnabled,
                customCSS,
                customJS
            })
        }, 500)
        return () => clearTimeout(timeout)
    }, [globalEnabled, cssEnabled, jsEnabled, customCSS, customJS, isInitialized])

    const showStatus = (msg: string) => {
        setStatus(msg)
        setTimeout(() => setStatus(''), 2500)
    }

    const handleForceInject = async () => {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
        if (!tab?.id || !/^https?:/.test(tab.url || '')) {
            showStatus('Erreur: Site non compatible')
            return
        }

        if (!globalEnabled) {
            showStatus('Désactivé globalement')
            return
        }

        try {
            // CSS Injection (Always CSP-safe)
            if (cssEnabled && customCSS) {
                await chrome.scripting.insertCSS({
                    target: { tabId: tab.id, allFrames: true },
                    css: customCSS
                })
            }

            // JS Injection
            if (jsEnabled && customJS) {
                // @ts-ignore
                if (chrome.userScripts) {
                    showStatus('Injection via UserScripts (Veuillez rafraîchir si besoin)')
                    // The background script handles userScripts registration automatically on save.
                    // For "Force", we can't easily run a userScript string immediately without a reload 
                    // on some restricted sites, but we can try the ISOLATED fallback.
                }

                await chrome.scripting.executeScript({
                    target: { tabId: tab.id, allFrames: true },
                    world: 'ISOLATED', // Use Isolated world to avoid Page CSP
                    func: (code: string) => {
                        try {
                            // On the fly injection attempt
                            const s = document.createElement('script');
                            s.textContent = code;
                            (document.head || document.documentElement).appendChild(s);
                            s.remove();
                        } catch (e) {
                            console.error('Force injection (Isolated) blocked or failed:', e);
                        }
                    },
                    args: [customJS]
                });
                showStatus('Injection forcée tentée !')
            }
        } catch (err) {
            console.error(err)
            showStatus('Échec de l\'injection')
        }
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors duration-300">
            {/* Header */}
            <header className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur-md z-10">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-blue-600/20">I</div>
                    <h1 className="font-bold text-lg tracking-tight">Injector Pro</h1>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowHelp(true)}
                        className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors text-slate-500"
                    >
                        <Info size={20} />
                    </button>

                    <div className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all",
                        globalEnabled
                            ? "bg-blue-500/10 border-blue-500/30 text-blue-600"
                            : "bg-slate-200 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-400"
                    )}>
                        <span className="text-[10px] font-black uppercase tracking-widest">Global</span>
                        <button
                            onClick={() => setGlobalEnabled(!globalEnabled)}
                            className={cn(
                                "w-8 h-4 rounded-full relative transition-colors",
                                globalEnabled ? "bg-blue-500" : "bg-slate-400 dark:bg-slate-600"
                            )}
                        >
                            <div className={cn(
                                "absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all",
                                globalEnabled ? "left-4.5" : "left-0.5"
                            )} />
                        </button>
                    </div>
                </div>
            </header>

            <main className="flex-1 p-4 flex flex-col gap-6 w-full max-w-2xl mx-auto">
                <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-blue-500">
                            <FileCode2 size={18} />
                            <h2 className="font-bold text-sm uppercase tracking-wider">Styles (CSS)</h2>
                        </div>
                        <button
                            onClick={() => setCssEnabled(!cssEnabled)}
                            className={cn(
                                "w-10 h-5 rounded-full relative transition-colors",
                                cssEnabled ? "bg-blue-500" : "bg-slate-300 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                            )}
                        >
                            <div className={cn(
                                "absolute top-1 w-3 h-3 bg-white rounded-full transition-all",
                                cssEnabled ? "left-6" : "left-1"
                            )} />
                        </button>
                    </div>
                    <div className="group relative">
                        <textarea
                            value={customCSS}
                            onChange={(e) => setCustomCSS(e.target.value)}
                            spellCheck={false}
                            className="w-full h-48 p-4 bg-slate-900 text-blue-300 font-mono text-sm rounded-xl border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none transition-all"
                            placeholder="body { background: transparent; }"
                        />
                        <div className="absolute top-2 right-2 px-2 py-1 rounded bg-slate-800 text-[10px] text-slate-500 border border-slate-700 opacity-0 group-hover:opacity-100 transition-all">
                            CSS
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-yellow-500">
                            <Code2 size={18} />
                            <h2 className="font-bold text-sm uppercase tracking-wider">Scripts (JS)</h2>
                        </div>
                        <button
                            onClick={() => setJsEnabled(!jsEnabled)}
                            className={cn(
                                "w-10 h-5 rounded-full relative transition-colors",
                                jsEnabled ? "bg-yellow-500" : "bg-slate-300 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                            )}
                        >
                            <div className={cn(
                                "absolute top-1 w-3 h-3 bg-white rounded-full transition-all",
                                jsEnabled ? "left-6" : "left-1"
                            )} />
                        </button>
                    </div>
                    <div className="group relative">
                        <textarea
                            value={customJS}
                            onChange={(e) => setCustomJS(e.target.value)}
                            spellCheck={false}
                            className="w-full h-48 p-4 bg-slate-900 text-yellow-200 font-mono text-sm rounded-xl border border-slate-800 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 outline-none resize-none transition-all"
                            placeholder="console.log('Injector Pro Active');"
                        />
                        <div className="absolute top-2 right-2 px-2 py-1 rounded bg-slate-800 text-[10px] text-slate-500 border border-slate-700 opacity-0 group-hover:opacity-100 transition-all">
                            JS
                        </div>
                    </div>
                </div>

                <div className="mt-auto flex flex-col gap-4">
                    <button
                        onClick={handleForceInject}
                        className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-xl shadow-blue-600/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                    >
                        <Zap size={18} className="fill-current" />
                        Forcer l'injection
                    </button>
                    <p className="text-center text-[10px] text-slate-500 font-medium italic min-h-[1.5rem] leading-tight">
                        {status}
                    </p>
                </div>
            </main>

            {showHelp && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2rem] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                        <div className="p-8">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-black">Guide</h3>
                                <button onClick={() => setShowHelp(false)} className="text-slate-400 hover:text-slate-600">
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="space-y-6">
                                {[
                                    { id: 1, text: "Collez votre code CSS ou JS dans les éditeurs." },
                                    { id: 2, text: "Les scripts sont injectés automatiquement via l'API UserScripts pour contourner le CSP." },
                                    { id: 3, text: "L'interrupteur Global coupe tout instantanément." },
                                    { id: 4, text: "Si un site bloque l'injection directe, rafraîchissez la page." }
                                ].map(step => (
                                    <div key={step.id} className="flex gap-4">
                                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center font-black text-xs">
                                            {step.id}
                                        </span>
                                        <p className="text-sm text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
                                            {step.text}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 flex justify-end">
                            <button
                                onClick={() => setShowHelp(false)}
                                className="px-6 py-2 bg-slate-900 dark:bg-blue-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-600/20"
                            >
                                Compris !
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
