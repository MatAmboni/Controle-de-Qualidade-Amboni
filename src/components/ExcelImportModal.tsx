import React, { useState, useRef } from 'react';
import {
  FileSpreadsheet,
  X,
  Upload,
  Download,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  FileCheck,
  RefreshCw,
  Layers,
  ArrowRight
} from 'lucide-react';
import { Category, QualityRecord } from '../types';
import {
  downloadExcelImportTemplate,
  parseLabExcelFile,
  ParsedImportRow
} from '../services/excel';
import { fmtDateBR } from '../services/whatsapp';

interface ExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  onImportSuccess: (records: Partial<QualityRecord>[]) => Promise<void>;
}

export const ExcelImportModal: React.FC<ExcelImportModalProps> = ({
  isOpen,
  onClose,
  categories,
  onImportSuccess
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [parsedRows, setParsedRows] = useState<ParsedImportRow[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setParsing(true);
    setErrors([]);

    try {
      const result = await parseLabExcelFile(selected, categories);
      setParsedRows(result.rows);
      setErrors(result.errors);
    } catch (err: any) {
      setErrors(['Falha ao ler planilha. Verifique se o arquivo não está corrompido ou protegido por senha.']);
    } finally {
      setParsing(false);
    }
  };

  const handleConfirmImport = async () => {
    const validRows = parsedRows.filter((r) => r.isValid);
    if (!validRows.length) return;

    setImporting(true);
    try {
      const recordsToCreate: Partial<QualityRecord>[] = validRows.map((r) => ({
        date: r.date,
        time: r.time,
        categoryId: r.categoryId,
        lotNumber: r.lotNumber,
        shift: r.shift,
        productionLine: r.productionLine,
        sampleOrigin: r.sampleOrigin,
        inspector: r.inspector,
        status: r.status,
        values: r.values,
        counterSampleLocation: r.counterSampleLocation,
        notes: r.notes
      }));

      await onImportSuccess(recordsToCreate);
      onClose();
    } catch (e) {
      console.error(e);
      alert('Erro durante a importação para o banco de dados.');
    } finally {
      setImporting(false);
    }
  };

  const validCount = parsedRows.filter((r) => r.isValid).length;
  const invalidCount = parsedRows.length - validCount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-teal-950 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold flex items-center gap-2">
                Importação em Massa de Planilhas Laboratoriais
              </h2>
              <p className="text-xs text-emerald-200">
                Importe lotes de medidores de umidade, ensaios de prova e planilhas Excel (.xlsx, .csv)
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

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Top Download Template Action */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs">
            <div className="space-y-0.5">
              <div className="font-bold text-emerald-950 flex items-center gap-1.5">
                <FileCheck className="w-4 h-4 text-emerald-600" />
                Precisa do modelo padrão Amboni para preenchimento?
              </div>
              <p className="text-[11px] text-emerald-800">
                Baixe o modelo com cabeçalhos prontos para os produtos cadastrados no ERP.
              </p>
            </div>
            <button
              type="button"
              onClick={() => downloadExcelImportTemplate(categories)}
              className="px-3.5 py-2 bg-white hover:bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-lg font-bold flex items-center gap-2 transition-colors shadow-2xs"
            >
              <Download className="w-3.5 h-3.5" />
              Baixar Modelo Excel (.xlsx)
            </button>
          </div>

          {/* Upload Dropzone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
              file
                ? 'border-emerald-500 bg-emerald-50/30'
                : 'border-slate-300 hover:border-emerald-500 bg-slate-50/50 hover:bg-slate-50'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={handleFileSelected}
            />

            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-2">
              {parsing ? (
                <RefreshCw className="w-6 h-6 animate-spin" />
              ) : (
                <FileSpreadsheet className="w-6 h-6" />
              )}
            </div>

            <div className="text-xs font-bold text-slate-800">
              {file ? file.name : 'Clique para selecionar a planilha de análises laboratoriais'}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Formatos aceitos: Microsoft Excel (.xlsx, .xls) ou Valores Separados por Vírgula (.csv)
            </p>
          </div>

          {/* Errors Notice */}
          {errors.length > 0 && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 space-y-1">
              {errors.map((err, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{err}</span>
                </div>
              ))}
            </div>
          )}

          {/* Preview Table if rows parsed */}
          {parsedRows.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <div className="font-bold text-slate-800 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-600" />
                  Pré-visualização dos Lançamentos Reconhecidos ({parsedRows.length})
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md font-semibold text-[11px]">
                    {validCount} válidos
                  </span>
                  {invalidCount > 0 && (
                    <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded-md font-semibold text-[11px]">
                      {invalidCount} com pendências
                    </span>
                  )}
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-600 font-bold uppercase tracking-wider text-[10px] sticky top-0">
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Data</th>
                      <th className="py-2.5 px-3">Produto</th>
                      <th className="py-2.5 px-3">Lote</th>
                      <th className="py-2.5 px-3">Indicadores Reconhecidos</th>
                      <th className="py-2.5 px-3">Parecer</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {parsedRows.map((r, idx) => (
                      <tr key={idx} className={r.isValid ? 'hover:bg-slate-50' : 'bg-rose-50/40'}>
                        <td className="py-2 px-3">
                          {r.isValid ? (
                            <span title="Linha válida e pronta para importar">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            </span>
                          ) : (
                            <span title={r.errors.join(' | ')}>
                              <AlertTriangle className="w-4 h-4 text-rose-600" />
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 whitespace-nowrap">{fmtDateBR(r.date)}</td>
                        <td className="py-2 px-3 font-semibold text-slate-800">{r.categoryName}</td>
                        <td className="py-2 px-3 font-medium text-slate-700">{r.lotNumber}</td>
                        <td className="py-2 px-3">
                          <div className="flex flex-wrap gap-1 text-[10px]">
                            {Object.entries(r.values).map(([k, v]) => (
                              <span key={k} className="bg-slate-100 px-1.5 py-0.5 rounded-sm border border-slate-200">
                                <b>{k}:</b> {v}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-2 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              r.status === 'rejected'
                                ? 'bg-rose-100 text-rose-800'
                                : r.status === 'warning'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {r.status?.toUpperCase() || 'APROVADO'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
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
            onClick={handleConfirmImport}
            disabled={validCount === 0 || importing}
            className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 active:scale-98 text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-sm transition-all disabled:opacity-50"
          >
            {importing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Importando e Sincronizando...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Importar {validCount} Lote(s) para o ERP
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
