/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { RecordsView } from './components/RecordsView';
import { CategoriesView } from './components/CategoriesView';
import { LabHubView } from './components/LabHubView';
import { RecordModal } from './components/RecordModal';
import { CategoryModal } from './components/CategoryModal';
import { WhatsAppModal } from './components/WhatsAppModal';
import { PrintLaudoModal } from './components/PrintLaudoModal';
import { UserPresenceModal } from './components/UserPresenceModal';
import { ExcelExportModal } from './components/ExcelExportModal';
import { ExcelImportModal } from './components/ExcelImportModal';
import { Category, QualityRecord, WhatsAppTemplateType } from './types';
import { apiSync, PresenceUser, SyncStatus } from './services/api';
import { Bell, CheckCircle2, ShieldCheck } from 'lucide-react';

export default function App() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [records, setRecords] = useState<QualityRecord[]>([]);
  const [currentView, setCurrentView] = useState<'dashboard' | 'laboratorio' | 'lancamentos' | 'categorias'>('dashboard');
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('syncing');
  const [activeUsers, setActiveUsers] = useState<PresenceUser[]>([]);
  const [userProfile, setUserProfile] = useState<{ name: string; role: string; unit: string }>({
    name: 'Inspetor Amboni',
    role: 'Controle de Qualidade',
    unit: 'Unidade Matriz'
  });

  // Modals state
  const [recordModalOpen, setRecordModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<QualityRecord | null>(null);

  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const [whatsAppModalOpen, setWhatsAppModalOpen] = useState(false);
  const [whatsAppRecords, setWhatsAppRecords] = useState<QualityRecord[]>([]);
  const [whatsAppInitialTemplate, setWhatsAppInitialTemplate] = useState<WhatsAppTemplateType>('executive');

  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [printRecord, setPrintRecord] = useState<QualityRecord | null>(null);

  const [excelExportModalOpen, setExcelExportModalOpen] = useState(false);
  const [excelImportModalOpen, setExcelImportModalOpen] = useState(false);

  const [userProfileModalOpen, setUserProfileModalOpen] = useState(false);

  // Toast notification
  const [toast, setToast] = useState<{ message: string; type?: 'info' | 'success' | 'warning' } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (message: string, type: 'info' | 'success' | 'warning' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 3500);
  };

  // Load initial data and bind real-time listeners
  useEffect(() => {
    setUserProfile(apiSync.getUserProfile());

    // Sync status & active presence listeners
    const unsubStatus = apiSync.onStatusChange((status, users) => {
      setSyncStatus(status);
      setActiveUsers(users);
    });

    // Load full state
    apiSync.loadState().then((data) => {
      setCategories(data.categories || []);
      setRecords(data.records || []);
    });

    // Real-time events from other users
    const unsubEvents = apiSync.subscribe((event) => {
      if (event.type === 'record_created') {
        const newRec = event.payload as QualityRecord;
        setRecords((prev) => {
          if (prev.some((r) => r.id === newRec.id)) return prev;
          return [newRec, ...prev];
        });
        showToast(`Novo lançamento sincronizado: ${newRec.lotNumber || 'Lote'} (${newRec.inspector || 'Inspetor'})`, 'info');
      } else if (event.type === 'record_updated') {
        const updated = event.payload as QualityRecord;
        setRecords((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      } else if (event.type === 'record_deleted') {
        const { id } = event.payload;
        setRecords((prev) => prev.filter((r) => r.id !== id));
      } else if (event.type === 'category_created') {
        const newCat = event.payload as Category;
        setCategories((prev) => [...prev, newCat]);
      } else if (event.type === 'category_updated') {
        const updated = event.payload as Category;
        setCategories((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      } else if (event.type === 'category_deleted') {
        const { id } = event.payload;
        setCategories((prev) => prev.filter((c) => c.id !== id));
      } else if (event.type === 'state_restored') {
        const restored = event.payload;
        setCategories(restored.categories || []);
        setRecords(restored.records || []);
        showToast('Base de dados restaurada com sucesso!', 'info');
      }
    });

    return () => {
      unsubStatus();
      unsubEvents();
    };
  }, []);

  // Handlers for Record
  const handleSaveRecord = async (recordData: Partial<QualityRecord>, openWhatsAppImmediately?: boolean) => {
    const saved = await apiSync.saveRecord(recordData);
    setRecords((prev) => {
      const idx = prev.findIndex((r) => r.id === saved.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = saved;
        return copy;
      }
      return [saved, ...prev];
    });

    showToast(recordData.id ? 'Lançamento atualizado com sucesso!' : 'Lançamento registrado e sincronizado!');

    if (openWhatsAppImmediately) {
      setWhatsAppRecords([saved]);
      setWhatsAppInitialTemplate(saved.status === 'rejected' ? 'deviation_alert' : 'executive');
      setWhatsAppModalOpen(true);
    }
  };

  const handleDeleteRecord = async (id: string) => {
    if (!confirm('Deseja realmente excluir este lançamento?')) return;
    await apiSync.deleteRecord(id);
    setRecords((prev) => prev.filter((r) => r.id !== id));
    showToast('Lançamento excluído.');
  };

  const handleDeleteBatch = async (ids: string[]) => {
    for (const id of ids) {
      await apiSync.deleteRecord(id);
    }
    setRecords((prev) => prev.filter((r) => !ids.includes(r.id)));
    showToast(`${ids.length} lançamentos excluídos.`);
  };

  // Bulk Excel import handler
  const handleBulkExcelImport = async (recordsToImport: Partial<QualityRecord>[]) => {
    const savedRecords: QualityRecord[] = [];
    for (const r of recordsToImport) {
      const saved = await apiSync.saveRecord(r);
      savedRecords.push(saved);
    }

    setRecords((prev) => {
      const existingIds = new Set(savedRecords.map((s) => s.id));
      const filtered = prev.filter((p) => !existingIds.has(p.id));
      return [...savedRecords, ...filtered];
    });

    showToast(`Sucesso! ${savedRecords.length} lançamentos importados e sincronizados com a equipe.`);
  };

  // Handlers for Category
  const handleSaveCategory = async (catData: Partial<Category>) => {
    const saved = await apiSync.saveCategory(catData);
    setCategories((prev) => {
      const idx = prev.findIndex((c) => c.id === saved.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = saved;
        return copy;
      }
      return [...prev, saved];
    });
    showToast(catData.id ? 'Categoria atualizada.' : 'Categoria criada com sucesso.');
  };

  const handleDeleteCategory = async (id: string) => {
    const count = records.filter((r) => r.categoryId === id).length;
    const msg = count > 0
      ? `Esta categoria possui ${count} lançamento(s). Excluir a categoria não apagará os lançamentos, mas eles ficarão sem especificação. Deseja continuar?`
      : 'Deseja realmente excluir esta categoria?';

    if (!confirm(msg)) return;
    await apiSync.deleteCategory(id);
    setCategories((prev) => prev.filter((c) => c.id !== id));
    showToast('Categoria excluída.');
  };

  // WhatsApp trigger
  const handleOpenWhatsApp = (targetRecords?: QualityRecord[], template?: WhatsAppTemplateType) => {
    const list = targetRecords && targetRecords.length > 0 ? targetRecords : records.slice(0, 8);
    if (!list.length) {
      showToast('Nenhum registro para gerar mensagem.', 'warning');
      return;
    }
    setWhatsAppRecords(list);
    if (template) setWhatsAppInitialTemplate(template);
    setWhatsAppModalOpen(true);
  };

  // Print Certificate trigger
  const handlePrintLaudo = (rec: QualityRecord) => {
    setPrintRecord(rec);
    setPrintModalOpen(true);
  };

  // Pre-fill trigger from Laboratory Calculator
  const handleNewRecordWithPreFill = (prefill: Partial<QualityRecord>) => {
    setEditingRecord({
      id: '',
      date: prefill.date || new Date().toISOString().slice(0, 10),
      time: prefill.time || new Date().toTimeString().slice(0, 5),
      categoryId: prefill.categoryId || categories[0]?.id || '',
      values: prefill.values || {},
      lotNumber: prefill.lotNumber,
      shift: prefill.shift || '1º Turno (06h - 14h)',
      productionLine: prefill.productionLine || 'Laboratório Central',
      sampleOrigin: prefill.sampleOrigin || 'Engenho de Prova',
      inspector: userProfile.name,
      status: prefill.status || 'approved',
      notes: prefill.notes,
      createdAt: new Date().toISOString()
    });
    setRecordModalOpen(true);
  };

  // Backup JSON
  const handleExportBackup = () => {
    const data = {
      app: 'Amboni Alimentos - Controle Qualidade ERP',
      version: 2,
      exportedAt: new Date().toISOString(),
      records,
      categories
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup-amboni-qualidade-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast('Backup JSON exportado.');
  };

  const handleImportBackup = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed.records) || !Array.isArray(parsed.categories)) {
        throw new Error('Formato inválido');
      }

      if (confirm(`Restaurar backup contendo ${parsed.records.length} lançamentos e ${parsed.categories.length} produtos? Substituirá a base atual.`)) {
        await apiSync.restoreBackup(parsed.categories, parsed.records);
        setCategories(parsed.categories);
        setRecords(parsed.records);
        showToast('Backup restaurado e sincronizado com a equipe.');
      }
    } catch {
      showToast('Arquivo de backup inválido.', 'warning');
    }
    e.target.value = '';
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      {/* Top Navigation */}
      <Navbar
        currentView={currentView}
        onNavigate={setCurrentView}
        onNewRecord={() => {
          setEditingRecord(null);
          setRecordModalOpen(true);
        }}
        onOpenWhatsApp={() => handleOpenWhatsApp()}
        onExportExcel={() => setExcelExportModalOpen(true)}
        onImportExcel={() => setExcelImportModalOpen(true)}
        onExportBackup={handleExportBackup}
        onImportBackup={handleImportBackup}
        syncStatus={syncStatus}
        activeUsers={activeUsers}
        userProfile={userProfile}
        onOpenProfile={() => setUserProfileModalOpen(true)}
      />

      {/* Main View Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {currentView === 'dashboard' && (
          <DashboardView
            records={records}
            categories={categories}
            onNewRecord={() => {
              setEditingRecord(null);
              setRecordModalOpen(true);
            }}
            onEditRecord={(rec) => {
              setEditingRecord(rec);
              setRecordModalOpen(true);
            }}
            onDeleteRecord={handleDeleteRecord}
            onOpenWhatsApp={handleOpenWhatsApp}
            onPrintLaudo={handlePrintLaudo}
            onNavigateToRecords={() => setCurrentView('lancamentos')}
            onExportExcel={() => setExcelExportModalOpen(true)}
          />
        )}

        {currentView === 'laboratorio' && (
          <LabHubView
            records={records}
            categories={categories}
            onNewRecordWithPreFill={handleNewRecordWithPreFill}
            onOpenExcelExport={() => setExcelExportModalOpen(true)}
            onOpenExcelImport={() => setExcelImportModalOpen(true)}
          />
        )}

        {currentView === 'lancamentos' && (
          <RecordsView
            records={records}
            categories={categories}
            onNewRecord={() => {
              setEditingRecord(null);
              setRecordModalOpen(true);
            }}
            onEditRecord={(rec) => {
              setEditingRecord(rec);
              setRecordModalOpen(true);
            }}
            onDeleteRecord={handleDeleteRecord}
            onDeleteBatch={handleDeleteBatch}
            onOpenWhatsApp={handleOpenWhatsApp}
            onPrintLaudo={handlePrintLaudo}
            onExportExcel={() => setExcelExportModalOpen(true)}
          />
        )}

        {currentView === 'categorias' && (
          <CategoriesView
            categories={categories}
            records={records}
            onNewCategory={() => {
              setEditingCategory(null);
              setCategoryModalOpen(true);
            }}
            onEditCategory={(cat) => {
              setEditingCategory(cat);
              setCategoryModalOpen(true);
            }}
            onDeleteCategory={handleDeleteCategory}
          />
        )}
      </main>

      {/* Hidden File Input for Backup Import */}
      <input
        type="file"
        ref={fileInputRef}
        accept=".json"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Modals */}
      <RecordModal
        isOpen={recordModalOpen}
        onClose={() => setRecordModalOpen(false)}
        onSave={handleSaveRecord}
        editingRecord={editingRecord}
        categories={categories}
        currentUserName={userProfile.name}
      />

      <CategoryModal
        isOpen={categoryModalOpen}
        onClose={() => setCategoryModalOpen(false)}
        onSave={handleSaveCategory}
        editingCategory={editingCategory}
      />

      <WhatsAppModal
        isOpen={whatsAppModalOpen}
        onClose={() => setWhatsAppModalOpen(false)}
        records={whatsAppRecords}
        categories={categories}
        initialTemplate={whatsAppInitialTemplate}
      />

      <PrintLaudoModal
        isOpen={printModalOpen}
        onClose={() => setPrintModalOpen(false)}
        record={printRecord}
        category={categories.find((c) => c.id === printRecord?.categoryId) || null}
      />

      <ExcelExportModal
        isOpen={excelExportModalOpen}
        onClose={() => setExcelExportModalOpen(false)}
        records={records}
        categories={categories}
      />

      <ExcelImportModal
        isOpen={excelImportModalOpen}
        onClose={() => setExcelImportModalOpen(false)}
        categories={categories}
        onImportSuccess={handleBulkExcelImport}
      />

      <UserPresenceModal
        isOpen={userProfileModalOpen}
        onClose={() => setUserProfileModalOpen(false)}
        currentProfile={userProfile}
        onUpdate={setUserProfile}
      />

      {/* Global Toast Notification */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 animate-bounce-in">
          <div
            className={`px-4 py-3 rounded-xl shadow-2xl text-xs font-bold flex items-center gap-2.5 text-white ${
              toast.type === 'warning'
                ? 'bg-amber-600'
                : toast.type === 'info'
                ? 'bg-slate-900 border border-emerald-500/50'
                : 'bg-emerald-800'
            }`}
          >
            {toast.type === 'info' ? (
              <Bell className="w-4 h-4 text-emerald-400 animate-pulse" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-300" />
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}
