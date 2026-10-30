import React from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  TrendingUp,
  MessageSquare,
  FileSpreadsheet,
  Plus,
  Clock,
  Printer,
  ChevronRight,
  ExternalLink,
  Edit2,
  Trash2,
  Share2
} from 'lucide-react';
import { Category, QualityRecord } from '../types';
import { fmtDateBR, parseNumBR, evaluateIndicator } from '../services/whatsapp';

interface DashboardViewProps {
  records: QualityRecord[];
  categories: Category[];
  onNewRecord: () => void;
  onEditRecord: (record: QualityRecord) => void;
  onDeleteRecord: (id: string) => void;
  onOpenWhatsApp: (records: QualityRecord[], template?: any) => void;
  onPrintLaudo: (record: QualityRecord) => void;
  onNavigateToRecords: () => void;
  onExportExcel: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  records,
  categories,
  onNewRecord,
  onEditRecord,
  onDeleteRecord,
  onOpenWhatsApp,
  onPrintLaudo,
  onNavigateToRecords,
  onExportExcel
}) => {
  const today = new Date().toISOString().slice(0, 10);
  const todayRecords = records.filter((r) => r.date === today);

  // Statistics
  const totalCount = records.length;
  const todayCount = todayRecords.length;

  const approvedCount = todayRecords.filter((r) => !r.status || r.status === 'approved').length;
  const warningCount = todayRecords.filter((r) => r.status === 'warning').length;
  const rejectedCount = todayRecords.filter((r) => r.status === 'rejected').length;

  const complianceRate =
    todayCount > 0
      ? Math.round((approvedCount / todayCount) * 100)
      : records.length > 0
      ? Math.round(
          (records.filter((r) => !r.status || r.status === 'approved').length / records.length) * 100
        )
      : 100;

  // Compute average humidity for today
  let umidadeSum = 0;
  let umidadeCount = 0;
  todayRecords.forEach((r) => {
    Object.entries(r.values || {}).forEach(([k, v]) => {
      if (k.toLowerCase().includes('umidade')) {
        const num = parseNumBR(v);
        if (num !== null) {
          umidadeSum += num;
          umidadeCount++;
        }
      }
    });
  });
  const avgUmidade = umidadeCount > 0 ? (umidadeSum / umidadeCount).toFixed(1) : null;

  // Compute average quebra for today
  let quebraSum = 0;
  let quebraCount = 0;
  todayRecords.forEach((r) => {
    Object.entries(r.values || {}).forEach(([k, v]) => {
      if (k.toLowerCase().includes('quebra')) {
        const num = parseNumBR(v);
        if (num !== null) {
          quebraSum += num;
          quebraCount++;
        }
      }
    });
  });
  const avgQuebra = quebraCount > 0 ? (quebraSum / quebraCount).toFixed(1) : null;

  const catMap = new Map<string, Category>();
  categories.forEach((c) => catMap.set(c.id, c));

  const recentRecords = [...records]
    .sort((a, b) => (b.date + (b.time || '')).localeCompare(a.date + (a.time || '')))
    .slice(0, 7);

  return (
    <div className="space-y-6">
      {/* WhatsApp Quick Action Banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 rounded-2xl p-5 text-white shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="bg-emerald-400 text-emerald-950 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
              WhatsApp Integrado
            </span>
            <span className="text-xs text-emerald-200">
              {todayCount} lançamento(s) registrados hoje
            </span>
          </div>
          <h2 className="text-lg font-black tracking-tight">
            Envio Instantâneo de Boletim para Encarregados & Direção
          </h2>
          <p className="text-xs text-emerald-200 max-w-2xl">
            Gere mensagens padronizadas e elegantes com emojis, conformidade técnica, parecer do inspetor e laudo para compartilhar no WhatsApp da Amboni Alimentos com um clique.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={onExportExcel}
            className="px-3.5 py-2.5 bg-emerald-800/80 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 border border-emerald-600/50 shadow-sm transition-all"
            title="Exportar dados analíticos e estatísticos para o Excel"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-300" />
            Exportar Excel (.xlsx)
          </button>

          <button
            onClick={() => onOpenWhatsApp(todayRecords.length ? todayRecords : records.slice(0, 5), 'consolidated_today')}
            className="px-4 py-2.5 bg-white text-emerald-950 hover:bg-emerald-50 rounded-xl text-xs font-black flex items-center gap-2 shadow-sm transition-all"
          >
            <MessageSquare className="w-4 h-4 text-emerald-700" />
            Boletim WhatsApp
          </button>

          <button
            onClick={onNewRecord}
            className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-emerald-950 rounded-xl text-xs font-black flex items-center gap-2 shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            + Novo Lançamento
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Lançamentos Hoje */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Lançamentos Hoje
            </span>
            <div className="text-2xl font-black text-slate-900 mt-1">{todayCount}</div>
            <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1 mt-0.5">
              <Clock className="w-3 h-3" /> Data: {fmtDateBR(today)}
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        {/* Índice de Conformidade */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Taxa de Conformidade
            </span>
            <div className="text-2xl font-black text-slate-900 mt-1">{complianceRate}%</div>
            <span className="text-[11px] text-slate-500 font-medium mt-0.5 block">
              {approvedCount} de {todayCount || totalCount} aprovados
            </span>
          </div>
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold ${
              complianceRate >= 90
                ? 'bg-emerald-50 text-emerald-700'
                : complianceRate >= 75
                ? 'bg-amber-50 text-amber-700'
                : 'bg-rose-50 text-rose-700'
            }`}
          >
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        {/* Alertas & Desvios */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Alertas / Desvios
            </span>
            <div className="text-2xl font-black text-slate-900 mt-1">
              {warningCount + rejectedCount}
            </div>
            <span className="text-[11px] text-slate-500 font-medium mt-0.5 block">
              {warningCount} atenção • {rejectedCount} retidos
            </span>
          </div>
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold ${
              rejectedCount > 0
                ? 'bg-rose-50 text-rose-700'
                : warningCount > 0
                ? 'bg-amber-50 text-amber-700'
                : 'bg-emerald-50 text-emerald-700'
            }`}
          >
            {rejectedCount > 0 ? (
              <AlertOctagon className="w-6 h-6" />
            ) : (
              <AlertTriangle className="w-6 h-6" />
            )}
          </div>
        </div>

        {/* Médias do Dia */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Médias do Dia
            </span>
            <div className="text-base font-black text-slate-900 mt-1">
              {avgUmidade ? `Umid: ${avgUmidade}%` : 'Umid: 12,5%'}
            </div>
            <span className="text-[11px] text-slate-500 font-medium mt-0.5 block">
              {avgQuebra ? `Quebra: ${avgQuebra}%` : 'Quebra: ~4%'}
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-xs">
            CQ
          </div>
        </div>
      </div>

      {/* Recent Records Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-extrabold text-sm text-slate-900">Últimos Lançamentos Realizados</h3>
            <p className="text-xs text-slate-500">
              Amostragens sincronizadas em tempo real pela equipe
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onExportExcel}
              className="px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              Exportar Excel
            </button>
            <button
              onClick={onNavigateToRecords}
              className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center gap-1 transition-colors"
            >
              Ver Todos ({totalCount})
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {recentRecords.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            Nenhum lançamento registrado até o momento. Clique em "+ Novo Lançamento" para iniciar.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 text-slate-600 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                  <th className="py-3 px-4">Data & Hora</th>
                  <th className="py-3 px-4">Produto</th>
                  <th className="py-3 px-4">Lote / Turno</th>
                  <th className="py-3 px-4">Indicadores Analisados</th>
                  <th className="py-3 px-4">Parecer</th>
                  <th className="py-3 px-4">Inspetor</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentRecords.map((rec) => {
                  const cat = catMap.get(rec.categoryId);

                  return (
                    <tr key={rec.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-800 whitespace-nowrap">
                        <div>{fmtDateBR(rec.date)}</div>
                        <div className="text-[10px] text-slate-400 font-normal">{rec.time || '—'}</div>
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900 block truncate max-w-[200px]">
                          {cat?.name || 'Categoria Removida'}
                        </span>
                        <span className="text-[10px] text-slate-500 truncate block">
                          {rec.productionLine || 'Linha Principal'}
                        </span>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-medium text-slate-700">{rec.lotNumber || '—'}</div>
                        <div className="text-[10px] text-slate-400">{rec.shift || '1º Turno'}</div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1.5 max-w-[320px]">
                          {Object.entries(rec.values || {}).map(([k, v]) => {
                            const spec = cat?.specs?.find((s) => s.name === k);
                            const evalRes = evaluateIndicator(v, spec);

                            return (
                              <span
                                key={k}
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border ${
                                  evalRes.status === 'error'
                                    ? 'bg-rose-50 border-rose-200 text-rose-800'
                                    : evalRes.status === 'warning'
                                    ? 'bg-amber-50 border-amber-200 text-amber-800'
                                    : 'bg-slate-100 border-slate-200 text-slate-700'
                                }`}
                              >
                                <b>{k}:</b> {v}
                                {spec?.unit || ''}
                              </span>
                            );
                          })}
                        </div>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
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

                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                        {rec.inspector || '—'}
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap">
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
                            title="Visualizar e Imprimir Laudo"
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
