interface ImportMetaEnv {
  readonly RA_USERNAME?: string;
  readonly RA_API_KEY?: string;
  readonly STEAM_ID?: string;
  readonly STEAM_API_KEY?: string;
  readonly MAX_ACHIEVEMENTS?: string;
  readonly RECENT_MINUTES?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
