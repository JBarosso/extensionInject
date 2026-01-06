export interface VisualProperty {
    id: string;
    label: string;
    value: string;
    unit?: string;
}

export interface SiteConfig {
    css: string;
    enabled: boolean;
    visualEdits: Record<string, Record<string, string>>; // selector -> { property: value }
    variantGroupId?: string; // ID du groupe de variantes auquel appartient ce site
}

export interface VariantGroup {
    id: string;
    name: string;
    domains: string[]; // Liste des domaines dans ce groupe
    css: string;
    enabled: boolean;
    visualEdits: Record<string, Record<string, string>>;
}

export interface Preset {
    id: string;
    name: string;
    description?: string;
    css: string;
    visualEdits?: Record<string, Record<string, string>>;
    enabledSites?: string[]; // Liste des domaines où le preset est activé
    globalEnabled?: boolean; // Si le preset est activé globalement
}

export interface StorageSchema {
    globalEnabled: boolean;
    globalCSS: string;
    globalVisualEdits: Record<string, Record<string, string>>;
    sites: Record<string, SiteConfig>; // hostname -> Config
    variantGroups: Record<string, VariantGroup>; // groupId -> VariantGroup
    presets: Record<string, Preset>; // presetId -> Preset
    darkMode: boolean;
}

export type ExtensionMessage =
    | { type: 'START_PICKER' }
    | { type: 'STOP_PICKER' }
    | { type: 'ELEMENT_PICKED', payload: { selector: string } }
    | { type: 'GET_DOMAIN_INFO', payload: { domain: string } }
    | { type: 'PING' }
    | { type: 'PONG' }
    | { type: 'REFRESH_INJECTION' }
    | { type: 'START_DRAG', payload: { selector: string } }
    | { type: 'STOP_DRAG' }
    | { type: 'ELEMENT_DRAGGED', payload: { selector: string; top: number; left: number } }
    | { type: 'APPLY_CSS', payload: { css: string } };
