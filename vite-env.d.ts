/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_API_KEY?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}

interface AIStudio {
    hasSelectedApiKey(): Promise<boolean>;
    openSelectKey(): Promise<void>;
    getApiKey?(): Promise<string>;
}

declare global {
    interface Window {
        aistudio?: AIStudio;
    }
}

export { };
