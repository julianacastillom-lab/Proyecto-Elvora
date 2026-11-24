import { DEMO_DATA } from '../data/demoData';
import { AppStoreData } from '../types/elvora';

const STORAGE_KEY = 'elvora_smart_store_v1';

export function loadAppData(): AppStoreData {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return structuredClone(DEMO_DATA);
    }
    const parsed = JSON.parse(raw) as Partial<AppStoreData>;
    return {
      inventory: Array.isArray(parsed.inventory) ? parsed.inventory : structuredClone(DEMO_DATA.inventory),
      suppliers: Array.isArray(parsed.suppliers) ? parsed.suppliers : structuredClone(DEMO_DATA.suppliers),
      clients: Array.isArray(parsed.clients) ? parsed.clients : structuredClone(DEMO_DATA.clients),
      orders: Array.isArray(parsed.orders) ? parsed.orders : structuredClone(DEMO_DATA.orders),
      inspections: Array.isArray(parsed.inspections) ? parsed.inspections : structuredClone(DEMO_DATA.inspections),
      simulation: parsed.simulation ? { ...DEMO_DATA.simulation, ...parsed.simulation } : structuredClone(DEMO_DATA.simulation),
    };
  } catch {
    return structuredClone(DEMO_DATA);
  }
}

export function saveAppData(data: AppStoreData): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage quota errors silently
  }
}

export function resetToDemoData(): AppStoreData {
  const fresh = structuredClone(DEMO_DATA);
  saveAppData(fresh);
  return fresh;
}
