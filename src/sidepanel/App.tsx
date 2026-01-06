import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Info, Zap, X, Code2, FileCode2, Globe, MousePointer2, Sparkles, Layout, Monitor, Moon, Sun, AlertTriangle, RefreshCw, Copy, RotateCcw, Trash2 } from 'lucide-react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { StorageSchema, SiteConfig } from '../types'
import VisualEditor from './VisualEditor'

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export default function App() {
    // --- State ---
    const [currentTab, setCurrentTab] = useState<'global' | 'site'>('site')
    const [viewMode, setViewMode] = useState<'code' | 'visual'>('code')
    const [globalEnabled, setGlobalEnabled] = useState(true)
    const [globalCSS, setGlobalCSS] = useState('')
    const [globalVisualEdits, setGlobalVisualEdits] = useState<Record<string, Record<string, string>>>({})
    const [sites, setSites] = useState<Record<string, SiteConfig>>({})
    const [currentDomain, setCurrentDomain] = useState('')
    const [status, setStatus] = useState('')
    const [isInitialized, setIsInitialized] = useState(false)
    const [showHelp, setShowHelp] = useState(false)
    const [isPicking, setIsPicking] = useState(false)
    const [selectedSelector, setSelectedSelector] = useState<string | null>(null)
    const [isDark, setIsDark] = useState(true)
    const [isConnected, setIsConnected] = useState(true)

    const tabIdRef = useRef<number | null>(null)

    // --- Helpers ---
    const checkConnection = useCallback(() => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const tab = tabs[0]
            if (tab?.id && tab.url && /^https?:/.test(tab.url)) {
                tabIdRef.current = tab.id
                chrome.tabs.sendMessage(tab.id, { type: 'PING' }, (response) => {
                    if (chrome.runtime.lastError || !response) {
                        setIsConnected(false)
                    } else {
                        setIsConnected(true)
                    }
                })

                try {
                    const url = new URL(tab.url)
                    if (url.hostname !== currentDomain) {
                        setCurrentDomain(url.hostname)
                    }
                } catch (e) {
                    setCurrentDomain('')
                }
            } else {
                tabIdRef.current = null
                setIsConnected(false)
                setCurrentDomain('')
            }
        })
    }, [currentDomain])

    // --- Initialization ---
    useEffect(() => {
        checkConnection()
        const heartbeat = setInterval(checkConnection, 1500)

        chrome.storage.local.get(['globalEnabled', 'globalCSS', 'globalVisualEdits', 'sites', 'darkMode'], (result) => {
            if (result.globalEnabled !== undefined) setGlobalEnabled(result.globalEnabled)
            setGlobalCSS(result.globalCSS || '')
            setGlobalVisualEdits(result.globalVisualEdits || {})
            setSites(result.sites || {})

            const darkPref = result.darkMode === undefined ? true : result.darkMode
            setIsDark(darkPref)
            if (darkPref) {
                document.documentElement.classList.add('dark')
            } else {
                document.documentElement.classList.remove('dark')
            }
            setIsInitialized(true)
        })

        const messageListener = (message: any) => {
            if (message.type === 'ELEMENT_PICKED') {
                setSelectedSelector(message.payload.selector)
                setViewMode('visual')
                setIsPicking(false)
                showStatus('Élément sélectionné !')
            } else if (message.type === 'STOP_PICKER') {
                setIsPicking(false)
            }
        }
        chrome.runtime.onMessage.addListener(messageListener)
        return () => {
            clearInterval(heartbeat)
            chrome.runtime.onMessage.removeListener(messageListener)
        }
    }, [checkConnection])

    // --- Persistence & Injection ---
    useEffect(() => {
        if (!isInitialized) return

        const timeout = setTimeout(() => {
            chrome.storage.local.set({
                globalEnabled,
                globalCSS,
                globalVisualEdits,
                sites,
                darkMode: isDark
            })

            if (tabIdRef.current && isConnected) {
                const combinedCSS = generateFullCSS()
                chrome.tabs.sendMessage(tabIdRef.current, {
                    type: 'APPLY_CSS',
                    payload: { css: combinedCSS }
                })
            }
        }, 150)
        return () => clearTimeout(timeout)
    }, [globalEnabled, globalCSS, globalVisualEdits, sites, isDark, isInitialized, isConnected])

    // --- Computed ---
    const currentSiteConfig = useMemo(() => {
        return sites[currentDomain] || { css: '', enabled: true, visualEdits: {} }
    }, [sites, currentDomain])

    const generateFullCSS = useCallback(() => {
        if (!globalEnabled) return ''
        let css = ''
        css += `/* Global */\n${globalCSS}\n\n`
        for (const [selector, props] of Object.entries(globalVisualEdits)) {
            css += `${selector} { `
            for (const [p, v] of Object.entries(props)) css += `${p}: ${v} !important; `
            css += `}\n`
        }
        css += '\n'
        if (currentSiteConfig.enabled) {
            css += `/* Local (${currentDomain}) */\n${currentSiteConfig.css}\n\n`
            for (const [selector, props] of Object.entries(currentSiteConfig.visualEdits)) {
                css += `${selector} { `
                for (const [p, v] of Object.entries(props)) css += `${p}: ${v} !important; `
                css += `}\n`
            }
        }
        return css
    }, [globalEnabled, globalCSS, globalVisualEdits, currentSiteConfig, currentDomain])

    const generatedVisualCSSForCurrentTab = useMemo(() => {
        const edits = currentTab === 'global' ? globalVisualEdits : currentSiteConfig.visualEdits
        let css = ''
        for (const [selector, props] of Object.entries(edits)) {
            css += `${selector} {\n`
            for (const [p, v] of Object.entries(props)) {
                css += `  ${p}: ${v} !important;\n`
            }
            css += `}\n\n`
        }
        return css
    }, [currentTab, globalVisualEdits, currentSiteConfig.visualEdits])

    const hasContentToReset = useMemo(() => {
        if (currentTab === 'global') {
            return globalCSS.trim() !== '' || Object.keys(globalVisualEdits).length > 0;
        } else {
            return currentSiteConfig.css.trim() !== '' || Object.keys(currentSiteConfig.visualEdits).length > 0;
        }
    }, [currentTab, globalCSS, globalVisualEdits, currentSiteConfig])

    // --- Handlers ---
    const showStatus = (msg: string) => {
        setStatus(msg)
        setTimeout(() => setStatus(''), 2500)
    }

    const toggleTheme = () => {
        const next = !isDark
        setIsDark(next)
        if (next) document.documentElement.classList.add('dark')
        else document.documentElement.classList.remove('dark')
    }

    const togglePicker = () => {
        if (!isConnected) {
            showStatus('Veuillez rafraîchir la page')
            return
        }
        const next = !isPicking
        setIsPicking(next)
        if (next) {
            if (tabIdRef.current) {
                chrome.tabs.sendMessage(tabIdRef.current, { type: 'START_PICKER' })
            }
            showStatus('Cliquez sur un élément...')
        }
    }

    const updateSiteConfig = (updates: Partial<SiteConfig>) => {
        if (!currentDomain) return
        setSites(prev => ({
            ...prev,
            [currentDomain]: { ...currentSiteConfig, ...updates }
        }))
    }

    const updateVisualEdit = (selector: string, properties: Record<string, string>) => {
        if (currentTab === 'global') {
            const next = { ...globalVisualEdits, [selector]: properties }
            if (Object.keys(properties).length === 0) delete next[selector]
            setGlobalVisualEdits(next)
        } else {
            const next = { ...currentSiteConfig.visualEdits, [selector]: properties }
            if (Object.keys(properties).length === 0) delete next[selector]
            updateSiteConfig({ visualEdits: next })
        }
    }

    const convertVisualToCode = () => {
        if (currentTab === 'global') {
            setGlobalCSS(prev => prev + (prev ? '\n' : '') + generatedVisualCSSForCurrentTab)
            setGlobalVisualEdits({})
        } else {
            updateSiteConfig({
                css: currentSiteConfig.css + (currentSiteConfig.css ? '\n' : '') + generatedVisualCSSForCurrentTab,
                visualEdits: {}
            })
        }
        setSelectedSelector(null)
        setViewMode('code')
        showStatus('Converti en code !')
    }

    const handleReset = () => {
        const confirmMsg = currentTab === 'global'
            ? "Effacer TOUT le CSS global (code + visuel) ?"
            : `Effacer tout le CSS de ${currentDomain} (code + visuel) ?`

        if (window.confirm(confirmMsg)) {
            if (currentTab === 'global') {
                setGlobalCSS('')
                setGlobalVisualEdits({})
                setSelectedSelector(null)
                showStatus('Global réinitialisé')
            } else {
                updateSiteConfig({
                    css: '',
                    visualEdits: {}
                })
                setSelectedSelector(null)
                showStatus(`${currentDomain} réinitialisé`)
            }
        }
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors duration-300">
            {/* Header */}
            <header className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col gap-4 sticky top-0 bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur-md z-20">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-indigo-600/20">I</div>
                        <h1 className="font-bold text-lg tracking-tight">Injector Pro</h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors text-slate-500">
                            {isDark ? <Sun size={20} /> : <Moon size={20} />}
                        </button>
                        <button onClick={() => setShowHelp(true)} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors text-slate-500">
                            <Info size={20} />
                        </button>
                        <div className={cn(
                            "flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all cursor-pointer",
                            globalEnabled ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-600" : "bg-slate-200 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-400"
                        )} onClick={() => setGlobalEnabled(!globalEnabled)}>
                            <span className="text-[10px] font-black uppercase tracking-widest pointer-events-none">Global</span>
                            <div className={cn("w-8 h-4 rounded-full relative transition-colors pointer-events-none", globalEnabled ? "bg-indigo-500" : "bg-slate-400 dark:bg-slate-600")}>
                                <div className={cn("absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all shadow-sm", globalEnabled ? "translate-x-4.5" : "translate-x-0.5")} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Connection Status & Domain */}
                <div className="flex flex-col gap-2">
                    {!isConnected && (
                        <div className="flex items-center gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-600 dark:text-amber-500 text-[10px] font-bold animate-pulse">
                            <AlertTriangle size={14} />
                            <span>Veuillez rafraîchir la page pour activer l'injection.</span>
                            <button onClick={() => { if (tabIdRef.current) chrome.tabs.reload(tabIdRef.current); }} className="ml-auto hover:bg-amber-500/20 p-1 rounded-lg">
                                <RefreshCw size={12} />
                            </button>
                        </div>
                    )}
                    <div className="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                        <Globe size={14} className="text-slate-400" />
                        <span className="text-xs font-medium text-slate-600 dark:text-slate-400 truncate flex-1">
                            {currentDomain || 'Aucun site détecté'}
                        </span>
                        {currentDomain && (
                            <button
                                onClick={() => updateSiteConfig({ enabled: !currentSiteConfig.enabled })}
                                className={cn("px-2 py-0.5 rounded-md text-[9px] font-bold uppercase", currentSiteConfig.enabled ? "bg-green-500/20 text-green-500" : "bg-red-500/20 text-red-500")}
                            >
                                {currentSiteConfig.enabled ? 'Actif' : 'Inactif'}
                            </button>
                        )}
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex p-1 bg-slate-100 dark:bg-slate-900 rounded-xl shadow-inner relative justify-between">
                    <div className="flex-1 flex p-0">
                        <button onClick={() => setCurrentTab('site')} className={cn("flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all", currentTab === 'site' ? "bg-white dark:bg-slate-800 shadow text-indigo-600" : "text-slate-500 hover:text-indigo-400")}>
                            <Monitor size={14} /> Ce site
                        </button>
                        <button onClick={() => setCurrentTab('global')} className={cn("flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all", currentTab === 'global' ? "bg-white dark:bg-slate-800 shadow text-indigo-600" : "text-slate-500 hover:text-indigo-400")}>
                            <Globe size={14} /> Global
                        </button>
                    </div>
                </div>
            </header>

            <main className="flex-1 p-4 flex flex-col gap-6 overflow-y-auto custom-scrollbar">
                <div className="flex flex-col gap-4">
                    {/* Picker Button */}
                    <button onClick={togglePicker} className={cn("group w-full py-4 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all border-2 border-dashed", isPicking ? "bg-indigo-600 border-indigo-400 text-white animate-pulse" : "bg-indigo-50 dark:bg-indigo-900/10 border-indigo-200 dark:border-indigo-900/30 text-indigo-600 hover:border-indigo-400")}>
                        <MousePointer2 size={24} className={cn("transition-transform group-hover:scale-110", isPicking && "animate-bounce")} />
                        <span className="font-bold text-sm">{isPicking ? 'Visez un élément...' : 'Choisir un élément'}</span>
                        <span className="text-[10px] opacity-60">Modifier visuellement la page</span>
                    </button>

                    {/* Mode Switcher */}
                    <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-2 text-slate-500">
                            {viewMode === 'code' ? <Code2 size={16} /> : <Sparkles size={16} />}
                            <h2 className="text-xs font-bold uppercase tracking-widest">{viewMode === 'code' ? 'Code CSS' : 'Editeur Visuel'}</h2>
                        </div>
                        <div className="flex items-center gap-3">
                            {hasContentToReset && (
                                <button
                                    onClick={handleReset}
                                    className="flex items-center gap-1.5 text-[10px] font-bold text-red-500 bg-red-500/10 px-2.5 py-1 rounded-full border border-red-500/20 hover:bg-red-500 hover:text-white transition-all"
                                >
                                    <RotateCcw size={10} /> Reset
                                </button>
                            )}
                            <button onClick={() => setViewMode(viewMode === 'code' ? 'visual' : 'code')} className="text-[10px] font-bold text-indigo-600 hover:underline">
                                {viewMode === 'code' ? 'Visuel' : 'Code'}
                            </button>
                        </div>
                    </div>

                    {viewMode === 'code' ? (
                        <div className="flex flex-col gap-3">
                            {generatedVisualCSSForCurrentTab && (
                                <div className="p-3 bg-indigo-500/5 border border-indigo-500/10 rounded-xl">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest flex items-center gap-2">
                                            <Sparkles size={12} /> Code Visuel Généré
                                        </span>
                                        <button onClick={convertVisualToCode} className="flex items-center gap-1 px-2 py-1 bg-indigo-600 text-white rounded text-[9px] font-bold hover:bg-indigo-700 transition-colors">
                                            <Copy size={10} /> Fusionner
                                        </button>
                                    </div>
                                    <pre className="text-[10px] font-mono text-indigo-400/80 leading-tight">
                                        {generatedVisualCSSForCurrentTab}
                                    </pre>
                                </div>
                            )}
                            <div className="group relative">
                                <textarea
                                    value={currentTab === 'global' ? globalCSS : currentSiteConfig.css}
                                    onChange={(e) => currentTab === 'global' ? setGlobalCSS(e.target.value) : updateSiteConfig({ css: e.target.value })}
                                    spellCheck={false}
                                    className="w-full h-80 p-4 bg-slate-900 text-blue-300 font-mono text-sm rounded-2xl border border-slate-800 focus:border-indigo-500 outline-none resize-none transition-all"
                                    placeholder={`/* Votre CSS personnalisé ici */`}
                                />
                                {hasContentToReset && (
                                    <div className="absolute bottom-4 right-4 animate-in fade-in zoom-in duration-300">
                                        <button
                                            onClick={handleReset}
                                            className="p-2 bg-red-500/80 text-white rounded-lg hover:bg-red-600 transition-all shadow-lg flex items-center gap-2 text-[10px] font-bold px-3"
                                            title="Tout effacer"
                                        >
                                            <Trash2 size={14} /> Reset
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-4">
                            {selectedSelector ? (
                                <VisualEditor
                                    selector={selectedSelector}
                                    currentProperties={(currentTab === 'global' ? globalVisualEdits[selectedSelector] : currentSiteConfig.visualEdits[selectedSelector]) || {}}
                                    onUpdate={(props) => updateVisualEdit(selectedSelector, props)}
                                />
                            ) : (
                                <div className="flex flex-col items-center justify-center py-12 text-center bg-slate-100 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                                    <Layout size={32} className="text-slate-300 mb-2" />
                                    <p className="text-sm text-slate-500 font-medium">Prêt à éditer !</p>
                                    <p className="text-[10px] text-slate-400 mt-1">Sélectionnez un élément sur la page</p>
                                </div>
                            )}

                            {/* History */}
                            {Object.keys(currentTab === 'global' ? globalVisualEdits : currentSiteConfig.visualEdits).length > 0 && (
                                <div className="flex flex-col gap-2 mt-2">
                                    <div className="flex items-center justify-between px-1">
                                        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sélecteurs actifs</h3>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {Object.keys(currentTab === 'global' ? globalVisualEdits : currentSiteConfig.visualEdits).map(sel => (
                                            <button key={sel} onClick={() => setSelectedSelector(sel)} className={cn("px-3 py-1.5 rounded-full text-[10px] font-mono border transition-all", selectedSelector === sel ? "bg-indigo-600 border-indigo-400 text-white shadow-md shadow-indigo-600/20" : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 hover:border-indigo-400")}>
                                                {sel}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>

            <footer className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/50 backdrop-blur-sm">
                <p className="text-center text-[10px] text-slate-500 font-medium italic min-h-[1.5rem] leading-tight flex items-center justify-center gap-2">
                    {status ? (
                        <span className="flex items-center gap-1 text-indigo-500 animate-in fade-in slide-in-from-bottom-1">
                            <Zap size={10} className="fill-current" /> {status}
                        </span>
                    ) : (
                        <span className="opacity-40">Auto-sauvegarde active</span>
                    )}
                </p>
            </footer>

            {/* Help Modal */}
            {showHelp && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2rem] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                        <div className="p-8">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-black">Pro Tips</h3>
                                <button onClick={() => setShowHelp(false)} className="text-slate-400 hover:text-slate-600">
                                    <X size={24} />
                                </button>
                            </div>
                            <div className="space-y-6">
                                {[
                                    { id: 1, text: "Connectivity : Le bouton rafraîchir agit directement sur le site." },
                                    { id: 2, text: "Sync : Le mode visuel génère du CSS fusionnable." },
                                    { id: 3, text: "Reset : Le bouton Reset n'apparaît que si vous avez des styles enregistrés." },
                                    { id: 4, text: "Theme : L'extension possède son propre mode sombre indépendant." }
                                ].map(step => (
                                    <div key={step.id} className="flex gap-4">
                                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black text-xs">
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
                            <button onClick={() => setShowHelp(false)} className="px-6 py-2 bg-slate-900 dark:bg-indigo-600 text-white rounded-xl font-bold text-sm">
                                OK
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
