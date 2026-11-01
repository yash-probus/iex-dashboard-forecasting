declare module 'react-quill';

interface ImportMetaEnv {
  readonly VITE_APP_VARIANT?: 'sales' | 'forecasting';
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
