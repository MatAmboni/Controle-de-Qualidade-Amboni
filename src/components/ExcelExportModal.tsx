import React, { useState } from 'react';
import {
  FileSpreadsheet,
  X,
  Download,
  Calendar,
  Filter,
  CheckCircle2,
  Sliders,
  Sparkles,
  BarChart3,
  Layers,
  AlertTriangle
} from 'lucide-react';
import { Category, QualityRecord, ExcelExportOptions } from '../types';
import { exportQualityExcel } from '../services/excel';

interface ExcelExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  records: QualityRecord[];
  categories: Category[];
}

export const ExcelExportModal: React.FC<ExcelExportModalProps> = ({
  isOpen,
  onClose,
  records,
  categories
}) => {
  const [dateRange, setDateRange] = useState<ExcelExportOptions['dateRange']>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  if (!isOpen) return null;

  // Filter preview count
  const matchingRecords = records.filter((r) => {
    if (dateRange === 'today') {
      const today = new Date().toISOString().slice(0, 10);
      if (r.date !== today) return false;
    } else if (dateRange === '7days') {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 7);
      if (r.date < cutoff.toISOString().slice(0, 10)) return false;
    } else if (dateRange === '30days') {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 30);
      if (r.date < cutoff.toISOString().slice(0, 10)) return false;
    } else if (dateRange === 'custom' && startDate && endDate) {
      if (r.date < startDate || r.date > endDate) return false;
    }

    if (selectedCategory !== 'all' && r.categoryId !== selectedCategory) {
      return false;
    }
    if (selectedStatus !== 'all' && (r.status || 'approved') !== selectedStatus) {
      return false;
    }
    return true;
  });

  const handleExport = () => {
    exportQualityExcel(records, categories, {
      dateRange,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      categoryId: selectedCategory,
      status: selectedStatus,
      includeStatisticalSheet: true,
      includeWideMatrix: true,
      includeNonConformitySheet: true,
      includeCounterSamplesSheet: true
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-teal-950 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold flex items-center gap-2">
                Exportador Avançado de Laboratório (Excel .xlsx)
              </h2>
              <p className="text-xs text-emerald-200">
                Planilhas analíticas, controle estatístico de processo (CEP) e laudos de lote
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-emerald-200 hover:text-white p-1 rounded-lg hover:bg-emerald-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Sheets Included Overview Banner */}
          <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-4">
            <div className="text-xs font-bold text-emerald-950 flex items-center gap-1.5 mb-2">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              Abas Estruturadas Inclusas no Arquivo Excel:
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-700">
              <div className="flex items-center gap-2 bg-white/80 p-2 rounded-lg border border-emerald-100">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span><b>Matriz de Lotes:</b> Coluna para cada indicador</span>
              </div>
              <div className="flex items-center gap-2 bg-white/80 p-2 rounded-lg border border-emerald-100">
                <span className="w-2 h-2 rounded-full bg-teal-500"></span>
                <span><b>Estatística & CEP:</b> Média, DesvPad, CV%, Cpk</span>
              </div>
              <div className="flex items-center gap-2 bg-white/80 p-2 rounded-lg border border-emerald-100">
                <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                <span><b>RNC & Desvios:</b> Ações corretivas de retidos</span>
              </div>
              <div className="flex items-center gap-2 bg-white/80 p-2 rounded-lg border border-emerald-100">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                <span><b>Contraprovas:</b> Rastreabilidade de armário</span>
              </div>
            </div>
          </div>

          {/* Filter Configuration */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Configurações do Relatório
            </h3>

            {/* Date Range Selection */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                Período de Extração
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setDateRange('all')}
                  className={`p-2.5 rounded-xl border text-center font-bold transition-all ${
                    dateRange === 'all'
                      ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  Histórico Completo
                </button>
                <button
                  type="button"
                  onClick={() => setDateRange('today')}
                  className={`p-2.5 rounded-xl border text-center font-bold transition-all ${
                    dateRange === 'today'
                      ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  Apenas Hoje
                </button>
                <button
                  type="button"
                  onClick={() => setDateRange('7days')}
                  className={`p-2.5 rounded-xl border text-center font-bold transition-all ${
                    dateRange === '7days'
                      ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  Últimos 7 dias
                </button>
                <button
                  type="button"
                  onClick={() => setDateRange('custom')}
                  className={`p-2.5 rounded-xl border text-center font-bold transition-all ${
                    dateRange === 'custom'
                      ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  Personalizado
                </button>
              </div>

              {dateRange === 'custom' && (
                <div className="grid grid-cols-2 gap-3 mt-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                      Data Inicial
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full text-xs px-3 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                      Data Final
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full text-xs px-3 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Product & Status Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Filtrar Produto
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="all">Todos os Produtos Cadastrados</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Filtrar Status / Conformidade
                </label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="all">Todos os Laudos (Conformes & Desvios)</option>
                  <option value="approved">Apenas Conformes / Aprovados</option>
                  <option value="warning">Apenas Atenção / Observação</option>
                  <option value="rejected">Apenas Reprovados / Retidos</option>
                </select>
              </div>
            </div>
          </div>

          {/* Record Count Badge */}
          <div className="flex items-center justify-between p-3.5 bg-slate-100 rounded-xl text-xs font-semibold text-slate-700">
            <span>Total de laudos que serão exportados:</span>
            <span className="px-3 py-1 bg-emerald-700 text-white rounded-lg font-black text-sm">
              {matchingRecords.length} amostras
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleExport}
            disabled={matchingRecords.length === 0}
            className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 active:scale-98 text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-sm transition-all disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            Baixar Planilha Excel Completa (.xlsx)
          </button>
        </div>
      </div>
    </div>
  );
};
