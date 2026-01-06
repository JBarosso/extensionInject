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
}

export interface StorageSchema {
    globalEnabled: boolean;
    globalCSS: string;
    globalVisualEdits: Record<string, Record<string, string>>;
    sites: Record<string, SiteConfig>; // hostname -> Config
    darkMode: boolean;
}

export type ExtensionMessage =
    | { type: 'START_PICKER' }
    | { type: 'STOP_PICKER' }
    | { type: 'ELEMENT_PICKED', payload: { selector: string } }
    | { type: 'GET_DOMAIN_INFO', payload: { domain: string } }
    | { type: 'PING' }
    | { type: 'PONG' }
    | { type: 'REFRESH_INJECTION' };
