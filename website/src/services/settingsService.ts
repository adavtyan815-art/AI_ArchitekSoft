import { SettingsModel } from '../data/models/SettingsModel';

export interface Settings {
  updateDate: string;
  defaultRealLimitHours: number;
  defaultDisplayLimitHours: number;
}

const DEFAULT_SETTINGS: Settings = {
  updateDate: '18/04/2026',
  defaultRealLimitHours: 8,
  defaultDisplayLimitHours: 4,
};

export class SettingsService {
  private static instance: SettingsService;
  private cache: Settings = { ...DEFAULT_SETTINGS };

  static getInstance(): SettingsService {
    if (!SettingsService.instance) {
      SettingsService.instance = new SettingsService();
    }
    return SettingsService.instance;
  }

  // -----------------------------------------------------------------------
  // Startup: load (or seed) settings document from MongoDB
  // -----------------------------------------------------------------------
  async init(): Promise<void> {
    try {
      const doc = await SettingsModel.findOne({ _key: 'global' }).lean();
      if (doc) {
        this.cache = {
          updateDate: doc.updateDate ?? DEFAULT_SETTINGS.updateDate,
          defaultRealLimitHours: doc.defaultRealLimitHours ?? DEFAULT_SETTINGS.defaultRealLimitHours,
          defaultDisplayLimitHours: doc.defaultDisplayLimitHours ?? DEFAULT_SETTINGS.defaultDisplayLimitHours,
        };
        console.log('[SettingsService] Settings loaded from MongoDB.');
      } else {
        // First run — seed the defaults
        await SettingsModel.create({ _key: 'global', ...DEFAULT_SETTINGS });
        this.cache = { ...DEFAULT_SETTINGS };
        console.log('[SettingsService] No settings found — seeded defaults into MongoDB.');
      }
    } catch (err: any) {
      console.error('[SettingsService] Failed to load settings from MongoDB:', err.message);
      console.warn('[SettingsService] Falling back to in-memory defaults.');
      this.cache = { ...DEFAULT_SETTINGS };
    }
  }

  // Synchronous read — served from cache (0 ms)
  getSettings(): Settings {
    return { ...this.cache };
  }

  // Persists merged changes to both cache and MongoDB
  async save(settings: Partial<Settings>): Promise<void> {
    this.cache = { ...this.cache, ...settings };
    try {
      await SettingsModel.findOneAndUpdate(
        { _key: 'global' },
        { $set: settings },
        { upsert: true }
      );
    } catch (err: any) {
      console.error('[SettingsService] Failed to save settings to MongoDB:', err.message);
      throw err; // Bubble up so the API endpoint can return a 500
    }
  }
}
