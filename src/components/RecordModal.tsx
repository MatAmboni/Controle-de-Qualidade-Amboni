import React, { useState, useEffect } from 'react';
import { X, Check, AlertTriangle, AlertCircle, Clock, Sparkles, Send } from 'lucide-react';
import { Category, QualityRecord, RecordStatus } from '../types';
import { evaluateIndicator } from '../services/whatsapp';

interface RecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (record: Partial<QualityRecord>, openWhatsAppImmediately?: boolean) => Promise<void>;
  editingRecord: QualityRecord | null;
  categories: Category[];
  currentUserName: string;
}

export const RecordModal: React.FC<RecordModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingRecord,
  categories,
  currentUserName
}) => {
  const today = new Date().toISOString().slice(0, 10);
  const currentTime = new Date().toTimeString().slice(0, 5);

  const [categoryId, setCategoryId] = useState<string>('');
  const [date, setDate] = useState<string>(today);
  const [time, setTime] = useState<string>(currentTime);
  const [lotNumber, setLotNumber] = useState<string>('');
  const [shift, setShift] = useState<QualityRecord['shift']>('1º Turno (06h - 14h)');
  const [productionLine, setProductionLine] = useState<string>('Linha A - Parboilizado');
  const [sampleOrigin, setSampleOrigin] = useState<string>('Empacotadora 1');
  const [inspector, setInspector] = useState<string>(currentUserName);
  const [status, setStatus] = useState<RecordStatus>('approved');
  const [notes, setNotes] = useState<string>('');
  const [values, setValues] = useState<{ [key: string]: string }>({});
  const [analysisType, setAnalysisType] = useState<QualityRecord['analysisType']>('rotina');
  const [counterSampleLocation, setCounterSampleLocation] = useState<string>('Armário Lab - Gaveta 01');
  const [rootCause, setRootCause] = useState<string>('');
  const [correctiveAction, setCorrectiveAction] = useState<string>('');
  const [openWhatsApp, setOpenWhatsApp] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    if (editingRecord) {
      setCategoryId(editingRecord.categoryId);
      setDate(editingRecord.date);
      setTime(editingRecord.time);
      setLotNumber(editingRecord.lotNumber || '');
      setShift(editingRecord.shift || '1º Turno (06h - 14h)');
      setProductionLine(editingRecord.productionLine || 'Linha A - Parboilizado');
      setSampleOrigin(editingRecord.sampleOrigin || 'Empacotadora 1');
      setInspector(editingRecord.inspector || currentUserName);
      setStatus(editingRecord.status || 'approved');
      setNotes(editingRecord.notes || '');
      setValues(editingRecord.values || {});
      setAnalysisType(editingRecord.analysisType || 'rotina');
      setCounterSampleLocation(editingRecord.counterSampleLocation || 'Armário Lab - Gaveta 01');
      setRootCause(editingRecord.rootCause || '');
      setCorrectiveAction(editingRecord.correctiveAction || '');
    } else {
      // Default to first category if available
      const firstCat = categories[0]?.id || '';
      setCategoryId(firstCat);
      setDate(today);
      setTime(new Date().toTimeString().slice(0, 5));
      setLotNumber(`LOTE-${new Date().toISOString().slice(5, 10).replace('-', '')}-${Math.floor(100 + Math.random() * 900)}`);
      setShift('1º Turno (06h - 14h)');
      setProductionLine('Linha A - Parboilizado');
      setSampleOrigin('Empacotadora 1');
      setInspector(currentUserName);
      setStatus('approved');
      setNotes('');
      setValues({});
      setAnalysisType('rotina');
      setCounterSampleLocation('Armário Lab - Gaveta 01');
      setRootCause('');
      setCorrectiveAction('');
    }
  }, [editingRecord, categories, isOpen, currentUserName]);

  if (!isOpen) return null;

  const currentCategory = categories.find((c) => c.id === categoryId);

  const handleIndicatorChange = (indicator: string, val: string) => {
    const updatedValues = { ...values, [indicator]: val };
    setValues(updatedValues);

    // Check if any indicator fails spec and auto-suggest status
    let hasError = false;
    let hasWarning = false;

    if (currentCategory?.specs) {
      currentCategory.specs.forEach((spec) => {
        const valueStr = updatedValues[spec.name];
        if (valueStr) {
          const evalRes = evaluateIndicator(valueStr, spec);
          if (evalRes.status === 'error') hasError = true;
          if (evalRes.status === 'warning') hasWarning = true;
        }
      });
    }

    if (hasError) setStatus('rejected');
    else if (hasWarning) setStatus('warning');
    else setStatus('approved');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryId || !date) return;

    setSaving(true);
    try {
      await onSave(
        {
          id: editingRecord ? editingRecord.id : undefined,
          date,
          time,
          categoryId,
          lotNumber: lotNumber.trim() || undefined,
          shift,
          productionLine,
          sampleOrigin,
          inspector: inspector.trim() || currentUserName,
          status,
          notes: notes.trim() || undefined,
          values,
          analysisType,
          counterSampleLocation: counterSampleLocation.trim() || undefined,
          rootCause: rootCause.trim() || undefined,
          correctiveAction: correctiveAction.trim() || undefined
        },
        openWhatsApp
      );
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-emerald-900 text-white px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">
              {editingRecord ? 'Editar Lançamento de Qualidade' : 'Novo Lançamento de Qualidade'}
            </h2>
            <p className="text-xs text-emerald-200">
              Registre os parâmetros técnicos e indicadores laboratoriais da Amboni Alimentos
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-emerald-200 hover:text-white p-1 rounded-lg hover:bg-emerald-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Section: Basic Metadata */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 mb-1 block">
                Produto / Categoria *
              </label>
              <select
                value={categoryId}
                onChange={(e) => {
                  setCategoryId(e.target.value);
                  setValues({});
                }}
                className="w-full text-xs px-3 py-2.5 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                required
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 mb-1 block">Data da Coleta *</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full text-xs px-3 py-2.5 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              >
              </input>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 mb-1 block">Hora da Coleta</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full text-xs px-3 py-2.5 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
              </input>
            </div>
          </div>

          {/* Section: Operational Traceability */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <label className="text-xs font-bold text-slate-700 mb-1 block">Lote / Carga</label>
              <input
                type="text"
                placeholder="Ex: LOTE-8821"
                value={lotNumber}
                onChange={(e) => setLotNumber(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 mb-1 block">Turno</label>
              <select
                value={shift}
                onChange={(e) => setShift(e.target.value as any)}
                className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="1º Turno (06h - 14h)">1º Turno (06h - 14h)</option>
                <option value="2º Turno (14h - 22h)">2º Turno (14h - 22h)</option>
                <option value="3º Turno (22h - 06h)">3º Turno (22h - 06h)</option>
                <option value="Comercial">Comercial</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 mb-1 block">Linha de Produção</label>
              <input
                type="text"
                value={productionLine}
                onChange={(e) => setProductionLine(e.target.value)}
                placeholder="Ex: Linha A - Parboilizado"
                className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 mb-1 block">Inspetor / Resp.</label>
              <input
                type="text"
                value={inspector}
                onChange={(e) => setInspector(e.target.value)}
                placeholder="Nome do inspetor"
                className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              />
            </div>
          </div>

          {/* Section: Technical Indicators Input */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Indicadores de Qualidade ({currentCategory?.name || 'Selecione a categoria'})
              </label>
              <span className="text-[11px] text-slate-500">
                Padrões calibrados com tolerâncias técnicas
              </span>
            </div>

            {(!currentCategory?.fields || currentCategory.fields.length === 0) ? (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 text-center">
                Esta categoria não possui indicadores cadastrados. Vá em <b>Categorias</b> para configurar.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {currentCategory.fields.map((field) => {
                  const spec = currentCategory.specs?.find((s) => s.name === field);
                  const currentVal = values[field] || '';
                  const evalRes = evaluateIndicator(currentVal, spec);

                  return (
                    <div
                      key={field}
                      className={`p-3 rounded-xl border transition-all ${
                        evalRes.status === 'error'
                          ? 'border-rose-300 bg-rose-50/50'
                          : evalRes.status === 'warning'
                          ? 'border-amber-300 bg-amber-50/50'
                          : 'border-slate-200 bg-slate-50 hover:bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-slate-800">{field}</span>
                        {spec?.unit && (
                          <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-sm">
                            {spec.unit}
                          </span>
                        )}
                      </div>

                      {/* Technical limits hint */}
                      {spec && (spec.min !== undefined || spec.max !== undefined) && (
                        <div className="text-[10px] text-slate-500 mb-1 flex items-center justify-between">
                          <span>
                            {spec.min !== undefined ? `Mín: ${spec.min}` : ''}
                            {spec.min !== undefined && spec.max !== undefined ? ' | ' : ''}
                            {spec.max !== undefined ? `Máx: ${spec.max}` : ''}
                          </span>
                          {spec.target !== undefined && (
                            <span className="text-emerald-700 font-medium">Alvo: {spec.target}</span>
                          )}
                        </div>
                      )}

                      <div className="relative">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={currentVal}
                          onChange={(e) => handleIndicatorChange(field, e.target.value)}
                          placeholder="Ex: 12,5"
                          className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold text-slate-800"
                        />
                      </div>

                      {/* Live evaluation badge */}
                      {currentVal && (
                        <div className="mt-1.5 text-[11px] font-medium flex items-center gap-1">
                          {evalRes.status === 'ok' && (
                            <span className="text-emerald-700 flex items-center gap-0.5">
                              <Check className="w-3 h-3" /> Dentro do padrão
                            </span>
                          )}
                          {evalRes.status === 'warning' && (
                            <span className="text-amber-700 flex items-center gap-0.5">
                              <AlertTriangle className="w-3 h-3" /> Próximo do limite
                            </span>
                          )}
                          {evalRes.status === 'error' && (
                            <span className="text-rose-700 flex items-center gap-0.5 font-bold">
                              <AlertCircle className="w-3 h-3" /> Fora do padrão {evalRes.textDiff}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section: Status / Disposition & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 mb-1 block">
                Parecer Técnico / Disposição do Lote
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setStatus('approved')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all ${
                    status === 'approved'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <Check className="w-3.5 h-3.5" /> Conforme / Aprovado
                </button>

                <button
                  type="button"
                  onClick={() => setStatus('warning')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all ${
                    status === 'warning'
                      ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5" /> Atenção / Restrito
                </button>

                <button
                  type="button"
                  onClick={() => setStatus('rejected')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all ${
                    status === 'rejected'
                      ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <AlertCircle className="w-3.5 h-3.5" /> Reprovado / Retido
                </button>

                <button
                  type="button"
                  onClick={() => setStatus('analyzing')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all ${
                    status === 'analyzing'
                      ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" /> Em Análise
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 mb-1 block">
                Observações do Laboratório
              </label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: Regulagem de temperatura realizada; amostra coletada na esteira 02..."
                className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Laboratory Controls & Counter-Sample */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Controle Laboratorial & Rastreabilidade de Contraprova
              </span>
              <span className="text-[10px] text-emerald-800 font-semibold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                Laboratório Amboni
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Finalidade / Tipo de Análise
                </label>
                <select
                  value={analysisType}
                  onChange={(e) => setAnalysisType(e.target.value as any)}
                  className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="rotina">Análise de Rotina (Processo Industrial)</option>
                  <option value="recebimento">Recepção de Carga de Grãos</option>
                  <option value="reteste">Reteste / Reavaliação de Lote</option>
                  <option value="contraprova">Contraprova Oficial de Laboratório</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Localização da Contraprova (Armário / Gaveta)
                </label>
                <input
                  type="text"
                  value={counterSampleLocation}
                  onChange={(e) => setCounterSampleLocation(e.target.value)}
                  placeholder="Ex: Armário Lab - Gaveta B3"
                  className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
                />
              </div>
            </div>

            {/* Non-conformity root cause & corrective action if warning or rejected */}
            {(status === 'warning' || status === 'rejected') && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200">
                <div>
                  <label className="text-[11px] font-bold text-rose-800 block mb-1">
                    Causa Raiz do Desvio (RNC)
                  </label>
                  <input
                    type="text"
                    value={rootCause}
                    onChange={(e) => setRootCause(e.target.value)}
                    placeholder="Ex: Variação na secagem do silo / desgaste do esmeril"
                    className="w-full text-xs px-3 py-2 bg-white border border-rose-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-rose-800 block mb-1">
                    Ação Corretiva Imediata
                  </label>
                  <input
                    type="text"
                    value={correctiveAction}
                    onChange={(e) => setCorrectiveAction(e.target.value)}
                    placeholder="Ex: Regulado fluxo de ar e retido lote para reteste"
                    className="w-full text-xs px-3 py-2 bg-white border border-rose-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Quick WhatsApp Share option */}
          <div className="bg-emerald-50/80 border border-emerald-200 p-3 rounded-xl flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-emerald-950 font-medium">
              <input
                type="checkbox"
                checked={openWhatsApp}
                onChange={(e) => setOpenWhatsApp(e.target.checked)}
                className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
              />
              <span className="flex items-center gap-1.5">
                <Send className="w-3.5 h-3.5 text-emerald-600" />
                Abrir central do WhatsApp após salvar lançamento
              </span>
            </label>
            <span className="text-[11px] text-emerald-700 hidden sm:inline">
              Envio rápido para encarregados
            </span>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 active:scale-98 text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-xs transition-all disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              {saving ? 'Salvando...' : editingRecord ? 'Atualizar Lançamento' : 'Salvar Lançamento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
