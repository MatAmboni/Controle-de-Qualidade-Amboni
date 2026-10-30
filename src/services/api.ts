import { Category, QualityRecord } from '../types';

const LOCAL_STORAGE_KEY_RECORDS = 'amboni_cq_records_cache_v2';
const LOCAL_STORAGE_KEY_CATEGORIES = 'amboni_cq_categories_cache_v2';
const LOCAL_STORAGE_KEY_USER = 'amboni_cq_user_profile_v2';

export interface PresenceUser {
  name: string;
  role: string;
}

export type SyncStatus = 'connected' | 'syncing' | 'offline';

type SyncListener = (event: {
  type: 'record_created' | 'record_updated' | 'record_deleted' | 'category_created' | 'category_updated' | 'category_deleted' | 'state_restored' | 'presence';
  payload: any;
}) => void;

class ApiSyncService {
  private listeners: Set<SyncListener> = new Set();
  private eventSource: EventSource | null = null;
  private syncStatus: SyncStatus = 'syncing';
  private statusListeners: Set<(status: SyncStatus, activeUsers: PresenceUser[]) => void> = new Set();
  private activeUsers: PresenceUser[] = [];
  private clientId: string | null = null;
  private reconnectTimeout: any = null;

  constructor() {
    this.initSSE();
  }

  public subscribe(listener: SyncListener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public onStatusChange(callback: (status: SyncStatus, activeUsers: PresenceUser[]) => void) {
    this.statusListeners.add(callback);
    callback(this.syncStatus, this.activeUsers);
    return () => {
      this.statusListeners.delete(callback);
    };
  }

  private notifyStatus(status: SyncStatus) {
    this.syncStatus = status;
    this.statusListeners.forEach((cb) => cb(this.syncStatus, this.activeUsers));
  }

  public getUserProfile(): { name: string; role: string; unit: string } {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY_USER);
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      name: 'Inspetor Amboni',
      role: 'Controle de Qualidade',
      unit: 'Unidade Matriz'
    };
  }

  public setUserProfile(profile: { name: string; role: string; unit: string }) {
    localStorage.setItem(LOCAL_STORAGE_KEY_USER, JSON.stringify(profile));
    this.updatePresence();
  }

  public updatePresence() {
    const user = this.getUserProfile();
    if (this.clientId) {
      fetch('/api/presence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: this.clientId,
          name: user.name,
          role: `${user.role} (${user.unit})`
        })
      }).catch(() => {});
    }
  }

  public initSSE() {
    if (typeof window === 'undefined') return;
    if (this.eventSource) {
      this.eventSource.close();
    }

    const user = this.getUserProfile();
    const url = `/api/sync/events?user=${encodeURIComponent(user.name)}&role=${encodeURIComponent(user.role)}`;

    try {
      this.eventSource = new EventSource(url);

      this.eventSource.addEventListener('handshake', (e) => {
        try {
          const data = JSON.parse(e.data);
          this.clientId = data.clientId;
          this.notifyStatus('connected');
          this.updatePresence();
        } catch {}
      });

      this.eventSource.addEventListener('presence', (e) => {
        try {
          const data = JSON.parse(e.data);
          this.activeUsers = data.users || [];
          this.statusListeners.forEach((cb) => cb(this.syncStatus, this.activeUsers));
        } catch {}
      });

      const handleRemoteEvent = (type: any) => (e: MessageEvent) => {
        try {
          const payload = JSON.parse(e.data);
          this.listeners.forEach((l) => l({ type, payload }));
        } catch {}
      };

      this.eventSource.addEventListener('record_created', handleRemoteEvent('record_created'));
      this.eventSource.addEventListener('record_updated', handleRemoteEvent('record_updated'));
      this.eventSource.addEventListener('record_deleted', handleRemoteEvent('record_deleted'));
      this.eventSource.addEventListener('category_created', handleRemoteEvent('category_created'));
      this.eventSource.addEventListener('category_updated', handleRemoteEvent('category_updated'));
      this.eventSource.addEventListener('category_deleted', handleRemoteEvent('category_deleted'));
      this.eventSource.addEventListener('state_restored', handleRemoteEvent('state_restored'));

      this.eventSource.onopen = () => {
        this.notifyStatus('connected');
      };

      this.eventSource.onerror = () => {
        this.notifyStatus('offline');
        if (this.eventSource) {
          this.eventSource.close();
          this.eventSource = null;
        }
        // Retry connection in 4 seconds
        clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = setTimeout(() => {
          this.initSSE();
        }, 4000);
      };
    } catch {
      this.notifyStatus('offline');
    }
  }

  // Fetch full state from backend or local fallback
  public async loadState(): Promise<{ categories: Category[]; records: QualityRecord[] }> {
    this.notifyStatus('syncing');
    try {
      const res = await fetch('/api/state');
      if (!res.ok) throw new Error('Falha ao conectar à API');
      const data = await res.json();

      // Save to local cache
      localStorage.setItem(LOCAL_STORAGE_KEY_CATEGORIES, JSON.stringify(data.categories));
      localStorage.setItem(LOCAL_STORAGE_KEY_RECORDS, JSON.stringify(data.records));
      this.notifyStatus('connected');
      return data;
    } catch (err) {
      console.warn('Usando armazenamento local offline:', err);
      this.notifyStatus('offline');
      return this.getLocalFallback();
    }
  }

  private getLocalFallback(): { categories: Category[]; records: QualityRecord[] } {
    try {
      const cats = localStorage.getItem(LOCAL_STORAGE_KEY_CATEGORIES);
      const recs = localStorage.getItem(LOCAL_STORAGE_KEY_RECORDS);
      return {
        categories: cats ? JSON.parse(cats) : [],
        records: recs ? JSON.parse(recs) : []
      };
    } catch {
      return { categories: [], records: [] };
    }
  }

  // Save Record
  public async saveRecord(record: Partial<QualityRecord>): Promise<QualityRecord> {
    try {
      const res = await fetch('/api/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record)
      });
      if (!res.ok) throw new Error('Erro ao salvar no servidor');
      const data = await res.json();
      return data.record;
    } catch (e) {
      // Fallback: update local cache
      const rec: QualityRecord = {
        id: record.id || `rec-${Date.now()}`,
        date: record.date || new Date().toISOString().slice(0, 10),
        time: record.time || new Date().toTimeString().slice(0, 5),
        categoryId: record.categoryId || '',
        values: record.values || {},
        lotNumber: record.lotNumber,
        shift: record.shift,
        productionLine: record.productionLine,
        sampleOrigin: record.sampleOrigin,
        inspector: record.inspector,
        status: record.status || 'approved',
        notes: record.notes,
        createdAt: record.createdAt || new Date().toISOString()
      };
      const local = this.getLocalFallback();
      const existing = local.records.findIndex((r) => r.id === rec.id);
      if (existing >= 0) local.records[existing] = rec;
      else local.records.unshift(rec);
      localStorage.setItem(LOCAL_STORAGE_KEY_RECORDS, JSON.stringify(local.records));
      return rec;
    }
  }

  // Delete Record
  public async deleteRecord(id: string): Promise<boolean> {
    try {
      await fetch(`/api/records/${id}`, { method: 'DELETE' });
    } catch (e) {
      const local = this.getLocalFallback();
      local.records = local.records.filter((r) => r.id !== id);
      localStorage.setItem(LOCAL_STORAGE_KEY_RECORDS, JSON.stringify(local.records));
    }
    return true;
  }

  // Save Category
  public async saveCategory(cat: Partial<Category>): Promise<Category> {
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cat)
      });
      if (!res.ok) throw new Error('Erro ao salvar categoria');
      const data = await res.json();
      return data.category;
    } catch (e) {
      const category: Category = {
        id: cat.id || `cat-${Date.now()}`,
        name: cat.name || '',
        fields: cat.fields || [],
        specs: cat.specs || [],
        description: cat.description
      };
      const local = this.getLocalFallback();
      const existing = local.categories.findIndex((c) => c.id === category.id);
      if (existing >= 0) local.categories[existing] = category;
      else local.categories.push(category);
      localStorage.setItem(LOCAL_STORAGE_KEY_CATEGORIES, JSON.stringify(local.categories));
      return category;
    }
  }

  // Delete Category
  public async deleteCategory(id: string): Promise<boolean> {
    try {
      await fetch(`/api/categories/${id}`, { method: 'DELETE' });
    } catch (e) {
      const local = this.getLocalFallback();
      local.categories = local.categories.filter((c) => c.id !== id);
      localStorage.setItem(LOCAL_STORAGE_KEY_CATEGORIES, JSON.stringify(local.categories));
    }
    return true;
  }

  // Restore whole DB
  public async restoreBackup(categories: Category[], records: QualityRecord[]): Promise<void> {
    try {
      await fetch('/api/backup/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categories, records })
      });
    } catch (e) {
      localStorage.setItem(LOCAL_STORAGE_KEY_CATEGORIES, JSON.stringify(categories));
      localStorage.setItem(LOCAL_STORAGE_KEY_RECORDS, JSON.stringify(records));
    }
  }
}

export const apiSync = new ApiSyncService();
