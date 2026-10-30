import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  MessageSquare,
  FileSpreadsheet,
  Trash2,
  Edit2,
  Printer,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Calendar,
  CheckSquare,
  Square,
  Share2
} from 'lucide-react';
import { Category, QualityRecord, RecordStatus } from '../types';
import { fmtDateBR, evaluateIndicator } from '../services/whatsapp';

interface RecordsViewProps {
  records: QualityRecord[];
  categories: Category[];
  onNewRecord: () => void;
  onEditRecord: (record: QualityRecord) => void;
  onDeleteRecord: (id: string) => void;
  onDeleteBatch: (ids: string[]) => void;
  onOpenWhatsApp: (records: QualityRecord[], template?: any) => void;
  onPrintLaudo: (record: QualityRecord) => void;
  onExportExcel: () => void;
}

export const RecordsView: React.FC<RecordsViewProps> = ({
  records,
  categories,
  onNewRecord,
  onEditRecord,
  onDeleteRecord,
  onDeleteBatch,
  onOpenWhatsApp,
  onPrintLaudo,
  onExportExcel
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [periodFilter, setPeriodFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [shiftFilter, setShiftFilter] = useState<string>('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const catMap = useMemo(() => {
    const map = new Map<string, Category>();
    categories.forEach((c) => map.set(c.id, c));
    return map;
  }, [categories]);

  // Filtered records
  const filteredRecords = useMemo(() => {
    return records.filter((rec) => {
      const cat = catMap.get(rec.categoryId);
      const catName = (cat?.name || '').toLowerCase();
      const lot = (rec.lotNumber || '').toLowerCase();
      const inspector = (rec.inspector || '').toLowerCase();
      const line = (rec.productionLine || '').toLowerCase();
      const term = searchTerm.toLowerCase().trim();

      if (term && !catName.includes(term) && !lot.includes(term) && !inspector.includes(term) && !line.includes(term)) {
        return false;
      }
      if (dateFilter && rec.date !== dateFilter) {
        return false;
      }
      if (categoryFilter && rec.categoryId !== categoryFilter) {
        return false;
      }
      if (statusFilter && (rec.status || 'approved') !== statusFilter) {
        return false;
      }
      if (shiftFilter && rec.shift !== shiftFilter) {
        return false;
      }
      if (periodFilter) {
        const now = new Date();
        const d = new Date(rec.date + 'T00:00:00');
        const diffDays = (new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() - d.getTime()) / 86400000;
        if (periodFilter === 'today' && diffDays !== 0) return false;
        if (periodFilter === '7' && (diffDays < 0 || diffDays >= 7)) return false;
        if (periodFilter === '30' && (diffDays < 0 || diffDays >= 30)) return false;
      }
      return true;
    }).sort((a, b) => (b.date + (b.time || '')).localeCompare(a.date + (a.time || '')));
  }, [records, catMap, searchTerm, dateFilter, periodFilter, categoryFilter, statusFilter, shiftFilter]);

  const handleSelectAll = () => {
    if (selectedIds.size === filteredRecords.length && filteredRecords.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredRecords.map((r) => r.id)));
    }
  };

  const handleToggleRow = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleSendSelectedToWhatsApp = () => {
    const selectedList = records.filter((r) => selectedIds.has(r.id));
    if (selectedList.length === 0) {
      alert('Selecione pelo menos um lançamento na tabela usando os checkboxes.');
      return;
    }
    onOpenWhatsApp(selectedList);
  };

  const handleDeleteSelected = () => {
    if (selectedIds.size === 0) return;
    if (confirm(`Tem certeza que deseja excluir os ${selectedIds.size} lançamentos selecionados?`)) {
      onDeleteBatch(Array.from(selectedIds));
      setSelectedIds(new Set());
    }
  };

  return (
    <div className="space-y-4">
      {/* Search & Multi-Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-[280px]">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Pesquisar por produto, lote, linha ou inspetor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
              />
            </div>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="text-xs text-slate-500 hover:text-slate-800"
              >
                Limpar
              </button>
            )}
          </div>

          {/* Quick Stats on Filter */}
          <div className="text-xs text-slate-500 font-medium">
            Exibindo <b className="text-slate-900">{filteredRecords.length}</b> de{' '}
            <b className="text-slate-900">{records.length}</b> lançamentos
          </div>
        </div>

        {/* Second Row of Filters */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2 border-t border-slate-100 text-xs">
          <div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="">Todos os Produtos</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={periodFilter}
              onChange={(e) => setPeriodFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="">Todos os períodos</option>
              <option value="today">Apenas Hoje</option>
              <option value="7">Últimos 7 dias</option>
              <option value="30">Últimos 30 dias</option>
            </select>
          </div>

          <div>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              title="Filtrar por data específica"
            />
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="">Todos os Status</option>
              <option value="approved">Conforme / Aprovado</option>
              <option value="warning">Atenção</option>
              <option value="rejected">Não Conforme / Retido</option>
              <option value="analyzing">Em Análise</option>
            </select>
          </div>

          <div>
            <select
              value={shiftFilter}
              onChange={(e) => setShiftFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="">Todos os Turnos</option>
              <option value="1º Turno (06h - 14h)">1º Turno (06h - 14h)</option>
              <option value="2º Turno (14h - 22h)">2º Turno (14h - 22h)</option>
              <option value="3º Turno (22h - 06h)">3º Turno (22h - 06h)</option>
              <option value="Comercial">Comercial</option>
            </select>
          </div>
        </div>
      </div>

      {/* Batch Selection Action Bar */}
      {selectedIds.size > 0 && (
        <div className="bg-emerald-900 text-white px-4 py-3 rounded-xl flex flex-wrap items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-2 text-xs font-bold">
            <CheckSquare className="w-4 h-4 text-emerald-400" />
            <span>{selectedIds.size} lançamento(s) selecionado(s)</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSendSelectedToWhatsApp}
              className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-emerald-950 rounded-lg text-xs font-black flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Enviar Selecionados para WhatsApp
            </button>

            <button
              onClick={handleDeleteSelected}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Excluir
            </button>

            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-xs text-emerald-200 hover:text-white px-2 py-1"
            >
              Desmarcar
            </button>
          </div>
        </div>
      )}

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {filteredRecords.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            Nenhum lançamento encontrado com os filtros selecionados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                  <th className="py-3 px-3 w-10 text-center">
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      className="text-slate-400 hover:text-slate-700"
                    >
                      {selectedIds.size === filteredRecords.length && filteredRecords.length > 0 ? (
                        <CheckSquare className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th className="py-3 px-3">Data / Hora</th>
                  <th className="py-3 px-3">Produto</th>
                  <th className="py-3 px-3">Lote & Turno</th>
                  <th className="py-3 px-3">Parâmetros & Indicadores</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Inspetor</th>
                  <th className="py-3 px-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRecords.map((rec) => {
                  const cat = catMap.get(rec.categoryId);
                  const isSelected = selectedIds.has(rec.id);

                  return (
                    <tr
                      key={rec.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isSelected ? 'bg-emerald-50/50' : ''
                      }`}
                    >
                      <td className="py-3 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleRow(rec.id)}
                          className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                        />
                      </td>

                      <td className="py-3 px-3 font-semibold text-slate-800 whitespace-nowrap">
                        <div>{fmtDateBR(rec.date)}</div>
                        <div className="text-[10px] text-slate-400 font-normal">{rec.time || '—'}</div>
                      </td>

                      <td className="py-3 px-3">
                        <span className="font-bold text-slate-900 block truncate max-w-[200px]">
                          {cat?.name || 'Categoria Removida'}
                        </span>
                        <span className="text-[10px] text-slate-500 truncate block">
                          {rec.productionLine || 'Linha Principal'}
                        </span>
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="font-medium text-slate-800">{rec.lotNumber || '—'}</div>
                        <div className="text-[10px] text-slate-400">{rec.shift || '1º Turno'}</div>
                      </td>

                      <td className="py-3 px-3">
                        <div className="flex flex-wrap gap-1 max-w-[340px]">
                          {Object.entries(rec.values || {}).map(([k, v]) => {
                            const spec = cat?.specs?.find((s) => s.name === k);
                            const evalRes = evaluateIndicator(v, spec);

                            return (
                              <span
                                key={k}
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border ${
                                  evalRes.status === 'error'
                                    ? 'bg-rose-50 border-rose-200 text-rose-800 font-bold'
                                    : evalRes.status === 'warning'
                                    ? 'bg-amber-50 border-amber-200 text-amber-800'
                                    : 'bg-slate-100 border-slate-200 text-slate-700'
                                }`}
                              >
                                <span>{k}:</span>
                                <b>{v}</b>
                                {spec?.unit || ''}
                              </span>
                            );
                          })}
                        </div>
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap">
                        {rec.status === 'rejected' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                            <AlertOctagon className="w-3 h-3" /> Não Conforme
                          </span>
                        ) : rec.status === 'warning' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            <AlertTriangle className="w-3 h-3" /> Atenção
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" /> Conforme
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                        {rec.inspector || '—'}
                      </td>

                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => onOpenWhatsApp([rec], rec.status === 'rejected' ? 'deviation_alert' : 'executive')}
                            className="p-1.5 text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Gerar e Enviar via WhatsApp"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => onPrintLaudo(rec)}
                            className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Imprimir Laudo"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => onEditRecord(rec)}
                            className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => onDeleteRecord(rec.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Excluir"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
