/// <reference types="vite/client" />

type ImportMetaEnv = {
  readonly VITE_SITE_URL?: string;
};

type ImportMeta = {
  readonly env: ImportMetaEnv;
};
