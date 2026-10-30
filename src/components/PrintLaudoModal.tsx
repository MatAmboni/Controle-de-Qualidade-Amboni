import React from 'react';
import { Printer, X, ShieldCheck, CheckCircle2, AlertTriangle, AlertOctagon } from 'lucide-react';
import { Category, QualityRecord } from '../types';
import { fmtDateBR, evaluateIndicator } from '../services/whatsapp';

interface PrintLaudoModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: QualityRecord | null;
  category: Category | null;
}

export const PrintLaudoModal: React.FC<PrintLaudoModalProps> = ({
  isOpen,
  onClose,
  record,
  category
}) => {
  if (!isOpen || !record) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[95vh]">
        {/* Modal Controls (Hidden in Print) */}
        <div className="no-print bg-slate-800 text-white px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Visualização de Impressão - Laudo Técnico Amboni Alimentos
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" /> Imprimir / Salvar PDF
            </button>
            <button
              onClick={onClose}
              className="text-slate-300 hover:text-white p-1 rounded-md transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Certificate Sheet */}
        <div className="flex-1 overflow-y-auto p-8 bg-white text-slate-900 font-sans" id="laudo-print-area">
          {/* Company Header */}
          <div className="border-b-2 border-emerald-900 pb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-900 text-white flex items-center justify-center font-black text-xl tracking-tighter">
                AA
              </div>
              <div>
                <h1 className="text-xl font-black tracking-tight text-emerald-950 uppercase">
                  Amboni Alimentos Ltda.
                </h1>
                <p className="text-xs text-slate-600 font-medium">
                  Divisão Industrial de Arroz • Laboratório de Controle de Qualidade e Segurança Alimentar
                </p>
                <p className="text-[10px] text-slate-400">
                  Rodovia SC-445 • Indústria Brasileira • CNPJ: 83.214.568/0001-90
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="inline-block px-3 py-1 bg-emerald-100 text-emerald-900 font-black text-xs rounded-md uppercase tracking-wider">
                Laudo de Análise CQ #{record.id.slice(-6).toUpperCase()}
              </span>
              <p className="text-[11px] text-slate-500 mt-1">
                Emitido em: {fmtDateBR(record.date)} às {record.time || '—'}
              </p>
            </div>
          </div>

          {/* Certificate Metadata Grid */}
          <div className="grid grid-cols-3 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 mt-5 text-xs">
            <div>
              <span className="text-slate-500 block text-[11px]">Produto Analisado:</span>
              <span className="font-bold text-slate-900 text-sm">{category?.name || 'N/A'}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">Lote / Carga:</span>
              <span className="font-bold text-slate-900">{record.lotNumber || 'Sem identificação'}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">Turno Operacional:</span>
              <span className="font-bold text-slate-900">{record.shift || '1º Turno'}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">Linha de Produção:</span>
              <span className="font-bold text-slate-900">{record.productionLine || 'Linha Principal'}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">Ponto de Amostragem:</span>
              <span className="font-bold text-slate-900">{record.sampleOrigin || 'Bica Corrida'}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">Inspetor Técnico:</span>
              <span className="font-bold text-slate-900">{record.inspector || 'Carlos Silva'}</span>
            </div>
          </div>

          {/* Technical Results Table */}
          <div className="mt-6">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 mb-2">
              Resultados das Análises Físico-Químicas e Tolerâncias
            </h3>
            <table className="w-full border-collapse border border-slate-300 text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-700 text-left">
                  <th className="border border-slate-300 p-2">Indicador / Parâmetro</th>
                  <th className="border border-slate-300 p-2 text-center">Unidade</th>
                  <th className="border border-slate-300 p-2 text-center">Faixa Permitida (Min - Max)</th>
                  <th className="border border-slate-300 p-2 text-center">Alvo</th>
                  <th className="border border-slate-300 p-2 text-right">Resultado Obtido</th>
                  <th className="border border-slate-300 p-2 text-center">Conformidade</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(record.values || {}).map(([key, val]) => {
                  const spec = category?.specs?.find((s) => s.name === key);
                  const evalRes = evaluateIndicator(val, spec);

                  return (
                    <tr key={key} className="hover:bg-slate-50">
                      <td className="border border-slate-300 p-2 font-bold text-slate-800">{key}</td>
                      <td className="border border-slate-300 p-2 text-center text-slate-600">
                        {spec?.unit || '—'}
                      </td>
                      <td className="border border-slate-300 p-2 text-center text-slate-600">
                        {spec?.min !== undefined || spec?.max !== undefined
                          ? `${spec?.min !== undefined ? spec.min : '—'} a ${spec?.max !== undefined ? spec.max : '—'}`
                          : 'Conforme Padrão MAPA'}
                      </td>
                      <td className="border border-slate-300 p-2 text-center text-slate-600">
                        {spec?.target !== undefined ? spec.target : '—'}
                      </td>
                      <td className="border border-slate-300 p-2 text-right font-black text-slate-900">
                        {val} {spec?.unit || ''}
                      </td>
                      <td className="border border-slate-300 p-2 text-center">
                        {evalRes.status === 'ok' ? (
                          <span className="text-emerald-700 font-bold">CONFORME</span>
                        ) : evalRes.status === 'warning' ? (
                          <span className="text-amber-700 font-bold">ATENÇÃO</span>
                        ) : (
                          <span className="text-rose-700 font-bold">DESVIO</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Disposition Box */}
          <div className="mt-5 p-4 rounded-xl border border-slate-300 bg-slate-50 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-500 uppercase tracking-wider block font-bold">
                Disposição Técnica do Lote
              </span>
              <div className="text-sm font-black text-slate-900 mt-1 flex items-center gap-2">
                {record.status === 'rejected' ? (
                  <>
                    <AlertOctagon className="w-5 h-5 text-rose-600" />
                    <span className="text-rose-700">LOTE REPROVADO / BLOQUEADO TEMPORARIAMENTE</span>
                  </>
                ) : record.status === 'warning' ? (
                  <>
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                    <span className="text-amber-700">LOTE LIBERADO COM RESTRIÇÃO / EM OBSERVAÇÃO</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span className="text-emerald-700">LOTE APROVADO / CONFORME PARA EXPEDIÇÃO</span>
                  </>
                )}
              </div>
              {record.notes && (
                <p className="text-xs text-slate-600 mt-2 italic">
                  <b>Obs:</b> {record.notes}
                </p>
              )}
            </div>
          </div>

          {/* Signatures */}
          <div className="mt-12 pt-8 grid grid-cols-2 gap-10 text-center text-xs text-slate-600">
            <div>
              <div className="border-t border-slate-400 pt-2 font-bold text-slate-800">
                {record.inspector || 'Inspetor de Qualidade Responsável'}
              </div>
              <div className="text-[11px] text-slate-500">Controle de Qualidade Amboni</div>
            </div>
            <div>
              <div className="border-t border-slate-400 pt-2 font-bold text-slate-800">
                Supervisão de Produção e Garantia da Qualidade
              </div>
              <div className="text-[11px] text-slate-500">Amboni Alimentos Ltda.</div>
            </div>
          </div>

          <div className="mt-8 text-center text-[10px] text-slate-400 border-t border-slate-200 pt-3">
            Documento emitido eletronicamente via Amboni Alimentos ERP Controle de Qualidade em {fmtDateBR(record.date)}.
          </div>
        </div>
      </div>
    </div>
  );
};
