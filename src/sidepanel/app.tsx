import { useState, useEffect, useCallback, useMemo, useRef } from 'react'

import { Info, Zap, X, Code2, FileCode2, Globe, MousePointer2, Sparkles, Layout, Monitor, Moon, Sun, AlertTriangle, RefreshCw, Copy, RotateCcw, Trash2, FolderTree, Plus, Edit2, BookOpen, Play, Square, CheckCircle2 } from 'lucide-react'

import { clsx, type ClassValue } from 'clsx'

import { twMerge } from 'tailwind-merge'

import { StorageSchema, SiteConfig, VariantGroup, Preset } from '../types'

import VisualEditor from './VisualEditor'



function cn(...inputs: ClassValue[]) {

    return twMerge(clsx(inputs))

}



export default function App() {

    // --- State ---

    const [currentTab, setCurrentTab] = useState<'global' | 'site' | 'presets'>('site')

    const [viewMode, setViewMode] = useState<'code' | 'visual'>('code')

    const [globalEnabled, setGlobalEnabled] = useState(true)

    const [globalCSS, setGlobalCSS] = useState('')

    const [globalVisualEdits, setGlobalVisualEdits] = useState<Record<string, Record<string, string>>>({})

    const [sites, setSites] = useState<Record<string, SiteConfig>>({})

    const [variantGroups, setVariantGroups] = useState<Record<string, VariantGroup>>({})

    const [presets, setPresets] = useState<Record<string, Preset>>({})

    const [currentDomain, setCurrentDomain] = useState('')

    const [showVariantManager, setShowVariantManager] = useState(false)

    const [editingPreset, setEditingPreset] = useState<string | null>(null)

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
                    // Suppress error message when page is refreshing
                    if (chrome.runtime.lastError) {
                        // Silently handle the error - page is likely reloading
                        void chrome.runtime.lastError;
                        setIsConnected(false);
                        return;
                    }

                    if (!response) {
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

    // Gestion de la touche Escape pour annuler le picker

    useEffect(() => {

        if (!isPicking) return

        const handleEscape = (e: KeyboardEvent) => {

            if (e.key === 'Escape') {

                setIsPicking(false)

                if (tabIdRef.current) {

                    chrome.tabs.sendMessage(tabIdRef.current, { type: 'STOP_PICKER' }, () => {

                        // Ignorer les erreurs silencieusement

                        if (chrome.runtime.lastError) {

                            // Erreur normale si le content script n'est pas chargé

                        }

                    })

                }

                showStatus('Sélection annulée')

            }

        }

        window.addEventListener('keydown', handleEscape)

        return () => window.removeEventListener('keydown', handleEscape)

    }, [isPicking])



    useEffect(() => {

        checkConnection()

        const heartbeat = setInterval(checkConnection, 1500)



        chrome.storage.local.get(['globalEnabled', 'globalCSS', 'globalVisualEdits', 'sites', 'variantGroups', 'presets', 'darkMode'], (result) => {

            if (result.globalEnabled !== undefined) setGlobalEnabled(result.globalEnabled)

            setGlobalCSS(result.globalCSS || '')

            setGlobalVisualEdits(result.globalVisualEdits || {})

            setSites(result.sites || {})

            setVariantGroups(result.variantGroups || {})

            // Initialiser les presets par défaut si aucun preset n'existe
            const existingPresets = result.presets || {}
            if (Object.keys(existingPresets).length === 0) {
                const defaultPresets: Record<string, Preset> = {
                    reading_mode: {
                        id: 'reading_mode',
                        name: 'Mode Lecture',
                        description: 'Améliore la lisibilité en centrant le contenu et en optimisant les espacements',
                        css: `/* Mode Lecture */
body {
    max-width: 800px !important;
    margin: 0 auto !important;
    padding: 2rem !important;
    line-height: 1.8 !important;
    font-size: 18px !important;
}

/* Améliorer les paragraphes */
p {
    margin-bottom: 1.5em !important;
}

/* Masquer les éléments distrayants */
aside, .sidebar, .advertisement, .ads,
[class*="ad"], [id*="ad"], [class*="banner"],
[class*="popup"], [class*="modal"] {
    display: none !important;
}`,
                        visualEdits: {},
                        enabledSites: [],
                        globalEnabled: false
                    },
                    hide_cookies: {
                        id: 'hide_cookies',
                        name: 'Masquer les bandeaux de cookies',
                        description: 'Cache automatiquement les bandeaux de consentement aux cookies',
                        css: `/* Masquer les bandeaux de cookies */
[class*="cookie"], [id*="cookie"], [class*="consent"],
[class*="gdpr"], [id*="gdpr"], [class*="banner"][class*="cookie"],
.cookie-banner, #cookie-banner, .cookie-consent,
#cookie-consent, .cookie-notice, #cookie-notice,
[class*="cookie-banner"], [id*="cookie-banner"],
[class*="cookie-consent"], [id*="cookie-consent"] {
    display: none !important;
    visibility: hidden !important;
    opacity: 0 !important;
    height: 0 !important;
    overflow: hidden !important;
}`,
                        visualEdits: {},
                        enabledSites: [],
                        globalEnabled: false
                    },
                    high_contrast: {
                        id: 'high_contrast',
                        name: 'Augmenter le contraste',
                        description: 'Améliore le contraste des textes et des éléments pour une meilleure lisibilité',
                        css: `/* Augmenter le contraste */
body {
    background: #ffffff !important;
    color: #000000 !important;
}

* {
    background-color: #ffffff !important;
    color: #000000 !important;
    border-color: #000000 !important;
}

a {
    color: #0000ff !important;
    text-decoration: underline !important;
}

a:visited {
    color: #800080 !important;
}

button, .button, [role="button"] {
    background: #000000 !important;
    color: #ffffff !important;
    border: 2px solid #000000 !important;
}

input, textarea, select {
    background: #ffffff !important;
    color: #000000 !important;
    border: 2px solid #000000 !important;
}`,
                        visualEdits: {},
                        enabledSites: [],
                        globalEnabled: false
                    }
                }
                setPresets(defaultPresets)
                // Sauvegarder les presets par défaut
                chrome.storage.local.set({ presets: defaultPresets })
            } else {
                setPresets(existingPresets)
            }



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

                if (isPicking) {

                    showStatus('Sélection annulée')

                }

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

                variantGroups,

                presets,

                darkMode: isDark

            })



            if (tabIdRef.current && isConnected) {

                const combinedCSS = generateFullCSS()

                chrome.tabs.sendMessage(tabIdRef.current, {

                    type: 'APPLY_CSS',

                    payload: { css: combinedCSS }

                })

                // Déclencher aussi une réinjection complète via le background script pour les iframes
                chrome.runtime.sendMessage({ type: 'REFRESH_INJECTION' }, () => {
                    // Ignorer les erreurs silencieusement
                    if (chrome.runtime.lastError) {
                        // Erreur normale si le background script n'est pas disponible
                    }
                })
            }

        }, 150)

        return () => clearTimeout(timeout)

    }, [globalEnabled, globalCSS, globalVisualEdits, sites, variantGroups, presets, isDark, isInitialized, isConnected])



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

        // CSS des presets globaux
        for (const preset of Object.values(presets)) {
            if (preset.globalEnabled && preset.css) {
                css += `/* Preset: ${preset.name} */\n${preset.css}\n\n`
                if (preset.visualEdits) {
                    for (const [selector, props] of Object.entries(preset.visualEdits)) {
                        css += `${selector} { `
                        for (const [p, v] of Object.entries(props)) css += `${p}: ${v} !important; `
                        css += `}\n`
                    }
                }
                css += '\n'
            }
        }

        // CSS des groupes de variantes
        if (currentDomain && currentSiteConfig.variantGroupId) {

            const variantGroup = variantGroups[currentSiteConfig.variantGroupId]

            if (variantGroup && variantGroup.enabled) {

                css += `/* Variante: ${variantGroup.name} */\n${variantGroup.css}\n\n`

                for (const [selector, props] of Object.entries(variantGroup.visualEdits)) {

                    css += `${selector} { `

                    for (const [p, v] of Object.entries(props)) css += `${p}: ${v} !important; `

                    css += `}\n`

                }

                css += '\n'

            }

        }

        if (currentSiteConfig.enabled) {

            // CSS des presets pour ce site
            if (currentDomain) {
                for (const preset of Object.values(presets)) {
                    if (preset.enabledSites?.includes(currentDomain) && preset.css) {
                        css += `/* Preset: ${preset.name} */\n${preset.css}\n\n`
                        if (preset.visualEdits) {
                            for (const [selector, props] of Object.entries(preset.visualEdits)) {
                                css += `${selector} { `
                                for (const [p, v] of Object.entries(props)) css += `${p}: ${v} !important; `
                                css += `}\n`
                            }
                        }
                        css += '\n'
                    }
                }
            }

            css += `/* Local (${currentDomain}) */\n${currentSiteConfig.css}\n\n`

            for (const [selector, props] of Object.entries(currentSiteConfig.visualEdits)) {

                css += `${selector} { `

                for (const [p, v] of Object.entries(props)) css += `${p}: ${v} !important; `

                css += `}\n`

            }

        }

        return css

    }, [globalEnabled, globalCSS, globalVisualEdits, currentSiteConfig, currentDomain, variantGroups, presets])



    const generatedVisualCSSForCurrentTab = useMemo(() => {

        if (currentTab === 'presets') return ''

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

                chrome.tabs.sendMessage(tabIdRef.current, { type: 'START_PICKER' }, () => {

                    // Ignorer les erreurs silencieusement

                    if (chrome.runtime.lastError) {

                        // Erreur normale si le content script n'est pas chargé

                    }

                })

            }

            showStatus('Cliquez sur un élément...')

        } else {

            // Annuler la sélection

            if (tabIdRef.current) {

                chrome.tabs.sendMessage(tabIdRef.current, { type: 'STOP_PICKER' }, () => {

                    // Ignorer les erreurs silencieusement

                    if (chrome.runtime.lastError) {

                        // Erreur normale si le content script n'est pas chargé

                    }

                })

            }

            showStatus('Sélection annulée')

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



    const forceApplyStyle = () => {

        if (!isConnected) {

            showStatus('Veuillez rafraîchir la page')

            return

        }



        if (!tabIdRef.current) {

            showStatus('Aucun onglet actif')

            return

        }



        // Générer le CSS complet

        const combinedCSS = generateFullCSS()



        if (!combinedCSS || combinedCSS.trim() === '') {

            showStatus('Aucun CSS à appliquer')

            return

        }



        // Envoyer le message au content script

        chrome.tabs.sendMessage(tabIdRef.current, {

            type: 'APPLY_CSS',

            payload: { css: combinedCSS }

        }, (response) => {

            if (chrome.runtime.lastError) {

                showStatus('Erreur lors de l\'injection')

            } else {

                showStatus('Styles appliqués avec succès !')

            }

        })



        // Déclencher aussi une réinjection complète via le background script pour les iframes

        chrome.runtime.sendMessage({ type: 'REFRESH_INJECTION' }, () => {

            // Ignorer les erreurs silencieusement

            if (chrome.runtime.lastError) {

                // Erreur normale si le background script n'est pas disponible

            }

        })

    }



    // --- Variant Groups Management ---

    const createVariantGroup = (name: string) => {

        const id = `variant_${Date.now()}`

        const newGroup: VariantGroup = {

            id,

            name,

            domains: [],

            css: '',

            enabled: true,

            visualEdits: {}

        }

        setVariantGroups(prev => ({ ...prev, [id]: newGroup }))

        showStatus(`Groupe "${name}" créé`)

        return id

    }



    const updateVariantGroup = (groupId: string, updates: Partial<VariantGroup>) => {

        setVariantGroups(prev => ({

            ...prev,

            [groupId]: { ...prev[groupId], ...updates }

        }))

    }



    const deleteVariantGroup = (groupId: string) => {

        if (window.confirm('Supprimer ce groupe de variantes ? Les sites seront désassignés.')) {

            // Retirer l'assignation des sites

            const updatedSites = { ...sites }

            for (const domain in updatedSites) {

                if (updatedSites[domain].variantGroupId === groupId) {

                    delete updatedSites[domain].variantGroupId

                }

            }

            setSites(updatedSites)



            // Supprimer le groupe

            const next = { ...variantGroups }

            delete next[groupId]

            setVariantGroups(next)

            showStatus('Groupe supprimé')

        }

    }



    const assignSiteToGroup = (domain: string, groupId: string | null) => {

        if (!domain) return



        // Retirer le domaine de l'ancien groupe si existant

        const oldGroupId = sites[domain]?.variantGroupId

        if (oldGroupId && variantGroups[oldGroupId]) {

            updateVariantGroup(oldGroupId, {

                domains: variantGroups[oldGroupId].domains.filter(d => d !== domain)

            })

        }



        // Ajouter le domaine au nouveau groupe

        if (groupId && variantGroups[groupId]) {

            if (!variantGroups[groupId].domains.includes(domain)) {

                updateVariantGroup(groupId, {

                    domains: [...variantGroups[groupId].domains, domain]

                })

            }

        }



        updateSiteConfig({ variantGroupId: groupId || undefined })

        showStatus(groupId ? 'Site assigné au groupe' : 'Assignation retirée')

    }



    const currentVariantGroup = useMemo(() => {

        if (!currentDomain || !currentSiteConfig.variantGroupId) return null

        return variantGroups[currentSiteConfig.variantGroupId] || null

    }, [currentDomain, currentSiteConfig.variantGroupId, variantGroups])



    // --- Presets Management ---

    const createPreset = (name: string, description: string = '', css: string = '') => {

        const id = `preset_${Date.now()}`

        const newPreset: Preset = {

            id,

            name,

            description,

            css,

            visualEdits: {},

            enabledSites: [],

            globalEnabled: false

        }

        setPresets(prev => ({ ...prev, [id]: newPreset }))

        setEditingPreset(id)

        showStatus(`Preset "${name}" créé`)

        return id

    }



    const updatePreset = (presetId: string, updates: Partial<Preset>) => {

        setPresets(prev => ({

            ...prev,

            [presetId]: { ...prev[presetId], ...updates }

        }))

    }



    const deletePreset = (presetId: string) => {

        if (window.confirm('Supprimer ce preset ?')) {

            const next = { ...presets }

            delete next[presetId]

            setPresets(next)

            showStatus('Preset supprimé')

        }

    }



    const togglePresetGlobal = (presetId: string) => {

        const preset = presets[presetId]

        if (!preset) return

        updatePreset(presetId, { globalEnabled: !preset.globalEnabled })

        showStatus(preset.globalEnabled ? 'Preset désactivé globalement' : 'Preset activé globalement')

    }



    const togglePresetForSite = (presetId: string, domain: string) => {

        const preset = presets[presetId]

        if (!preset || !domain) return

        const enabledSites = preset.enabledSites || []

        const isEnabled = enabledSites.includes(domain)

        const newEnabledSites = isEnabled

            ? enabledSites.filter(d => d !== domain)

            : [...enabledSites, domain]

        updatePreset(presetId, { enabledSites: newEnabledSites })

        showStatus(isEnabled ? 'Preset désactivé pour ce site' : 'Preset activé pour ce site')

    }



    const addPresetToCode = (presetId: string, targetTab: 'global' | 'site' = 'site') => {

        const preset = presets[presetId]

        if (!preset) return

        if (targetTab === 'global') {

            setGlobalCSS(prev => prev + (prev ? '\n\n' : '') + `/* Preset: ${preset.name} */\n${preset.css}`)

        } else {

            updateSiteConfig({

                css: currentSiteConfig.css + (currentSiteConfig.css ? '\n\n' : '') + `/* Preset: ${preset.name} */\n${preset.css}`

            })

        }

        showStatus(`Preset "${preset.name}" ajouté au code`)

    }



    const isPresetEnabledForCurrentSite = (preset: Preset) => {

        if (!currentDomain) return false

        return preset.enabledSites?.includes(currentDomain) || false

    }



    return (

        <div className="h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 grid grid-rows-[auto_1fr_auto] transition-colors duration-300 overflow-hidden">

            {/* Header */}

            <header className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col gap-4 bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur-md z-20">

                <div className="flex items-center justify-between">

                    <div className="flex items-center gap-2">

                        <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-indigo-600/20">I</div>

                        <h1 className="font-bold text-lg tracking-tight">Injector Style</h1>

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
                            currentDomain && currentSiteConfig.enabled ? "bg-green-500/10 border-green-500/30 text-green-600" : "bg-slate-200 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-400",
                            !currentDomain && "opacity-50 cursor-not-allowed"
                        )} onClick={() => currentDomain && updateSiteConfig({ enabled: !currentSiteConfig.enabled })}>
                            <span className="text-[10px] font-black uppercase tracking-widest pointer-events-none">Site</span>
                            <div className={cn("w-8 h-4 rounded-full relative transition-colors pointer-events-none", currentDomain && currentSiteConfig.enabled ? "bg-green-500" : "bg-slate-400 dark:bg-slate-600")}>
                                <div className={cn("absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all duration-200 shadow-sm", currentDomain && currentSiteConfig.enabled ? "translate-x-[18px]" : "translate-x-[2px]")} />
                            </div>
                        </div>

                        <div className={cn(
                            "flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all cursor-pointer",
                            globalEnabled ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-600" : "bg-slate-200 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-400"
                        )} onClick={() => setGlobalEnabled(!globalEnabled)}>
                            <span className="text-[10px] font-black uppercase tracking-widest pointer-events-none">Global</span>
                            <div className={cn("w-8 h-4 rounded-full relative transition-colors pointer-events-none", globalEnabled ? "bg-indigo-500" : "bg-slate-400 dark:bg-slate-600")}>
                                <div className={cn("absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all duration-200 shadow-sm", globalEnabled ? "translate-x-[18px]" : "translate-x-[2px]")} />
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

                        {currentVariantGroup && (

                            <span className="px-2 py-0.5 rounded-md text-[9px] font-bold uppercase bg-purple-500/20 text-purple-500">

                                {currentVariantGroup.name}

                            </span>

                        )}

                        {currentDomain && (

                            <button

                                onClick={() => updateSiteConfig({ enabled: !currentSiteConfig.enabled })}

                                className={cn("px-2 py-0.5 rounded-md text-[9px] font-bold uppercase", currentSiteConfig.enabled ? "bg-green-500/20 text-green-500" : "bg-red-500/20 text-red-500")}

                            >

                                {currentSiteConfig.enabled ? 'Actif' : 'Inactif'}

                            </button>

                        )}

                        <button

                            onClick={() => setShowVariantManager(true)}

                            className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors text-slate-500"

                            title="Gérer les groupes de variantes"

                        >

                            <FolderTree size={14} />

                        </button>

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

                        <button onClick={() => setCurrentTab('presets')} className={cn("flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all", currentTab === 'presets' ? "bg-white dark:bg-slate-800 shadow text-indigo-600" : "text-slate-500 hover:text-indigo-400")}>

                            <BookOpen size={14} /> Presets

                        </button>

                    </div>

                </div>

            </header>



            <main className="p-4 h-full overflow-hidden">

                <div className="h-full grid grid-rows-[auto_auto_1fr] gap-4">

                    {/* Picker Button - Masqué dans l'onglet presets */}
                    {currentTab !== 'presets' && (
                        <button onClick={togglePicker} className={cn("group w-full py-4 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all border-2 border-dashed", isPicking ? "bg-red-600 border-red-400 text-white animate-pulse" : "bg-indigo-50 dark:bg-indigo-900/10 border-indigo-200 dark:border-indigo-900/30 text-indigo-600 hover:border-indigo-400")}>

                            <MousePointer2 size={24} className={cn("transition-transform group-hover:scale-110", isPicking && "animate-bounce")} />

                            <span className="font-bold text-sm">{isPicking ? 'Annuler la sélection' : 'Choisir un élément'}</span>

                            <span className="text-[10px] opacity-60">{isPicking ? 'Appuyez sur Escape ou recliquez pour annuler' : 'Modifier visuellement la page'}</span>

                        </button>
                    )}



                    {/* Presets Tab Content */}
                    {currentTab === 'presets' ? (
                        <div className="flex flex-col gap-4 overflow-y-auto custom-scrollbar pr-1 min-h-0 h-full">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                                    <BookOpen size={16} /> Bibliothèque de Presets
                                </h2>
                                <button
                                    onClick={() => {
                                        const name = window.prompt('Nom du preset:')
                                        if (name) {
                                            createPreset(name, '', '')
                                        }
                                    }}
                                    className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-600 bg-indigo-500/10 px-2.5 py-1 rounded-full border border-indigo-500/20 hover:bg-indigo-500 hover:text-white transition-all"
                                >
                                    <Plus size={10} /> Créer
                                </button>
                            </div>

                            {Object.values(presets).length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full py-12 text-center bg-slate-100 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                                    <BookOpen size={32} className="text-slate-300 mb-2" />
                                    <p className="text-sm text-slate-500 font-medium">Aucun preset</p>
                                    <p className="text-[10px] text-slate-400 mt-1">Créez votre premier preset pour réutiliser du CSS</p>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-3">
                                    {Object.values(presets).map(preset => (
                                        <div key={preset.id} className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                                            <div className="flex items-start justify-between mb-3">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{preset.name}</h3>
                                                        {editingPreset === preset.id && (
                                                            <span className="text-[9px] text-indigo-500 font-bold">Édition</span>
                                                        )}
                                                    </div>
                                                    {preset.description && (
                                                        <p className="text-xs text-slate-500 mb-2">{preset.description}</p>
                                                    )}
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        {preset.globalEnabled && (
                                                            <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-indigo-500/20 text-indigo-500">
                                                                Global
                                                            </span>
                                                        )}
                                                        {preset.enabledSites && preset.enabledSites.length > 0 && (
                                                            <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-purple-500/20 text-purple-500">
                                                                {preset.enabledSites.length} site{preset.enabledSites.length > 1 ? 's' : ''}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={() => setEditingPreset(editingPreset === preset.id ? null : preset.id)}
                                                        className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 transition-colors"
                                                    >
                                                        <Edit2 size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => deletePreset(preset.id)}
                                                        className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-500 transition-colors"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>

                                            {editingPreset === preset.id ? (
                                                <div className="flex flex-col gap-3 mt-3">
                                                    <input
                                                        type="text"
                                                        value={preset.name}
                                                        onChange={(e) => updatePreset(preset.id, { name: e.target.value })}
                                                        className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
                                                        placeholder="Nom du preset"
                                                    />
                                                    <textarea
                                                        value={preset.css}
                                                        onChange={(e) => updatePreset(preset.id, { css: e.target.value })}
                                                        className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-900 text-blue-300 font-mono text-xs min-h-[150px]"
                                                        placeholder="CSS du preset"
                                                    />
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => setEditingPreset(null)}
                                                            className="flex-1 py-2 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold"
                                                        >
                                                            Terminer
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col gap-2 mt-3">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <button
                                                            onClick={() => togglePresetGlobal(preset.id)}
                                                            className={cn(
                                                                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2",
                                                                preset.globalEnabled
                                                                    ? "bg-indigo-600 text-white"
                                                                    : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                                                            )}
                                                        >
                                                            <Globe size={12} />
                                                            {preset.globalEnabled ? 'Désactiver Global' : 'Activer Global'}
                                                        </button>
                                                        {currentDomain && (
                                                            <button
                                                                onClick={() => togglePresetForSite(preset.id, currentDomain)}
                                                                className={cn(
                                                                    "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2",
                                                                    isPresetEnabledForCurrentSite(preset)
                                                                        ? "bg-purple-600 text-white"
                                                                        : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                                                                )}
                                                            >
                                                                <Play size={12} />
                                                                {isPresetEnabledForCurrentSite(preset) ? 'Désactiver Site' : 'Activer Site'}
                                                            </button>
                                                        )}
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                onClick={() => addPresetToCode(preset.id, 'global')}
                                                                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-green-500/10 text-green-500 border border-green-500/20 hover:bg-green-500 hover:text-white transition-all flex items-center gap-2"
                                                            >
                                                                <Copy size={12} />
                                                                Ajouter Global
                                                            </button>
                                                            {currentDomain && (
                                                                <button
                                                                    onClick={() => addPresetToCode(preset.id, 'site')}
                                                                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-green-500/10 text-green-500 border border-green-500/20 hover:bg-green-500 hover:text-white transition-all flex items-center gap-2"
                                                                >
                                                                    <Copy size={12} />
                                                                    Ajouter Site
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {preset.css && (
                                                        <pre className="text-[10px] font-mono text-slate-400 bg-slate-50 dark:bg-slate-800 p-2 rounded-lg mt-2 max-h-[100px] overflow-y-auto">
                                                            {preset.css.substring(0, 200)}{preset.css.length > 200 ? '...' : ''}
                                                        </pre>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <>
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

                                <div className="flex flex-col gap-3 min-h-0 h-full overflow-hidden">

                                    {generatedVisualCSSForCurrentTab && (

                                        <div className="p-3 bg-indigo-500/5 border border-indigo-500/10 rounded-xl shrink-0">

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

                                    <div className="group relative flex-1 min-h-0">

                                        <textarea

                                            value={currentTab === 'global' ? globalCSS : currentSiteConfig.css}

                                            onChange={(e) => currentTab === 'global' ? setGlobalCSS(e.target.value) : updateSiteConfig({ css: e.target.value })}

                                            spellCheck={false}

                                            className="w-full h-full p-4 bg-slate-900 text-blue-300 font-mono text-sm rounded-2xl border border-slate-800 focus:border-indigo-500 outline-none resize-none transition-all custom-scrollbar"

                                            placeholder={`/* Votre CSS personnalisé ici */`}

                                        />

                                    </div>

                                </div>

                            ) : (

                                <div className="flex flex-col gap-4 overflow-y-auto custom-scrollbar pr-1 min-h-0 h-full">

                                    {selectedSelector ? (

                                        <VisualEditor

                                            selector={selectedSelector}

                                            currentProperties={(currentTab === 'global' ? globalVisualEdits[selectedSelector] : currentSiteConfig.visualEdits[selectedSelector]) || {}}

                                            onUpdate={(props) => updateVisualEdit(selectedSelector, props)}

                                            tabId={tabIdRef.current}

                                        />

                                    ) : (

                                        <div className="flex flex-col items-center justify-center h-full py-12 text-center bg-slate-100 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 shrink-0">

                                            <Layout size={32} className="text-slate-300 mb-2" />

                                            <p className="text-sm text-slate-500 font-medium">Prêt à éditer !</p>

                                            <p className="text-[10px] text-slate-400 mt-1">Sélectionnez un élément sur la page</p>

                                        </div>

                                    )}



                                    {/* History */}

                                    {Object.keys(currentTab === 'global' ? globalVisualEdits : currentSiteConfig.visualEdits).length > 0 && (

                                        <div className="flex flex-col gap-2 mt-2 shrink-0">

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

                        </>
                    )}

                </div>

            </main>



            <footer className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/50 backdrop-blur-sm">

                <div className="flex items-center justify-between gap-3">

                    <p className="text-center text-[10px] text-slate-500 font-medium italic min-h-[1.5rem] leading-tight flex items-center justify-center gap-2 flex-1">

                        {status ? (

                            <span className="flex items-center gap-1 text-indigo-500 animate-in fade-in slide-in-from-bottom-1">

                                <Zap size={10} className="fill-current" /> {status}

                            </span>

                        ) : (

                            <span className="opacity-40">Auto-sauvegarde active</span>

                        )}

                    </p>

                    <button

                        onClick={forceApplyStyle}

                        disabled={!isConnected}

                        className={cn(

                            "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap",

                            isConnected

                                ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20"

                                : "bg-slate-300 dark:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed"

                        )}

                        title={isConnected ? "Forcer l'application des styles" : "Veuillez rafraîchir la page"}

                    >

                        <CheckCircle2 size={14} />

                        Apply Style

                    </button>

                </div>

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



            {/* Variant Groups Manager Modal */}

            {showVariantManager && (

                <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">

                    <div className="bg-white dark:bg-slate-900 w-full max-w-2xl max-h-[80vh] rounded-[2rem] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">

                        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">

                            <div className="flex items-center gap-3">

                                <FolderTree size={24} className="text-indigo-600" />

                                <h3 className="text-xl font-black">Groupes de Variantes</h3>

                            </div>

                            <button onClick={() => setShowVariantManager(false)} className="text-slate-400 hover:text-slate-600">

                                <X size={24} />

                            </button>

                        </div>



                        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">

                            <div className="flex flex-col gap-4">

                                {/* Liste des groupes */}

                                {Object.values(variantGroups).length === 0 ? (

                                    <div className="text-center py-12 text-slate-400">

                                        <FolderTree size={48} className="mx-auto mb-4 opacity-50" />

                                        <p className="text-sm">Aucun groupe de variantes</p>

                                        <p className="text-xs mt-1">Créez un groupe pour partager du CSS entre plusieurs sites</p>

                                    </div>

                                ) : (

                                    Object.values(variantGroups).map(group => (

                                        <div key={group.id} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">

                                            <div className="flex items-center justify-between mb-3">

                                                <div className="flex items-center gap-3">

                                                    <input

                                                        type="text"

                                                        value={group.name}

                                                        onChange={(e) => updateVariantGroup(group.id, { name: e.target.value })}

                                                        className="text-sm font-bold bg-transparent border-none outline-none text-slate-900 dark:text-slate-100"

                                                    />

                                                    <button

                                                        onClick={() => updateVariantGroup(group.id, { enabled: !group.enabled })}

                                                        className={cn("px-2 py-0.5 rounded-md text-[9px] font-bold uppercase", group.enabled ? "bg-green-500/20 text-green-500" : "bg-red-500/20 text-red-500")}

                                                    >

                                                        {group.enabled ? 'Actif' : 'Inactif'}

                                                    </button>

                                                </div>

                                                <div className="flex items-center gap-2">

                                                    <button

                                                        onClick={() => deleteVariantGroup(group.id)}

                                                        className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-500 transition-colors"

                                                    >

                                                        <Trash2 size={14} />

                                                    </button>

                                                </div>

                                            </div>



                                            <div className="text-xs text-slate-500 mb-2">

                                                {group.domains.length} site{group.domains.length > 1 ? 's' : ''} dans ce groupe

                                            </div>



                                            {currentDomain && (

                                                <button

                                                    onClick={() => assignSiteToGroup(currentDomain, currentSiteConfig.variantGroupId === group.id ? null : group.id)}

                                                    className={cn("w-full py-2 rounded-lg text-xs font-bold transition-all", currentSiteConfig.variantGroupId === group.id ? "bg-indigo-600 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-indigo-500 hover:text-white")}

                                                >

                                                    {currentSiteConfig.variantGroupId === group.id ? 'Retirer ce site' : 'Assigner ce site'}

                                                </button>

                                            )}

                                        </div>

                                    ))

                                )}



                                {/* Bouton créer groupe */}

                                <button

                                    onClick={() => {

                                        const name = window.prompt('Nom du groupe de variantes:')

                                        if (name) createVariantGroup(name)

                                    }}

                                    className="w-full py-3 rounded-xl border-2 border-dashed border-indigo-300 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all flex items-center justify-center gap-2 font-bold text-sm"

                                >

                                    <Plus size={16} /> Créer un groupe

                                </button>

                            </div>

                        </div>



                        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 flex justify-end border-t border-slate-200 dark:border-slate-800">

                            <button onClick={() => setShowVariantManager(false)} className="px-6 py-2 bg-slate-900 dark:bg-indigo-600 text-white rounded-xl font-bold text-sm">

                                Fermer

                            </button>

                        </div>

                    </div>

                </div>

            )}

        </div>

    )

}