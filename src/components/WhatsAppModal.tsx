import React, { useState } from 'react';
import {
  MessageSquare,
  Copy,
  ExternalLink,
  Check,
  Send,
  Sparkles,
  Phone,
  Settings2,
  X,
  AlertTriangle,
  FileText,
  Clock,
  Layers
} from 'lucide-react';
import { Category, QualityRecord, WhatsAppConfig, WhatsAppTemplateType } from '../types';
import { buildWhatsAppMessage, openWhatsAppLink } from '../services/whatsapp';

interface WhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  records: QualityRecord[];
  categories: Category[];
  initialTemplate?: WhatsAppTemplateType;
}

export const WhatsAppModal: React.FC<WhatsAppModalProps> = ({
  isOpen,
  onClose,
  records,
  categories,
  initialTemplate = 'executive'
}) => {
  const [config, setConfig] = useState<WhatsAppConfig>({
    template: initialTemplate,
    includeInspector: true,
    includeTimestamp: true,
    includeLot: true,
    includeTolerances: true,
    includeNotes: true,
    includeHeaderBanner: true,
    targetPhone: ''
  });

  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const generatedText = buildWhatsAppMessage(records, categories, config);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generatedText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Falha ao copiar:', err);
    }
  };

  const handleSend = () => {
    openWhatsAppLink(generatedText, config.targetPhone);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                Central de Mensagens WhatsApp
                <span className="text-xs bg-emerald-400/20 text-emerald-200 px-2 py-0.5 rounded-full font-medium">
                  {records.length} registro(s) selecionado(s)
                </span>
              </h2>
              <p className="text-xs text-emerald-200">
                Formatação inteligente com padrões técnicos da Amboni Alimentos
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-emerald-200 hover:text-white p-1 rounded-lg hover:bg-emerald-800/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left Column: Template & Configurations */}
          <div className="lg:col-span-6 space-y-4">
            {/* Template Selector */}
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
                Modelo de Mensagem
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setConfig({ ...config, template: 'executive' })}
                  className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                    config.template === 'executive'
                      ? 'border-emerald-600 bg-emerald-50/70 text-emerald-950 ring-2 ring-emerald-500/20'
                      : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <FileText className="w-3.5 h-3.5 text-emerald-600" />
                    Boletim Técnico Oficial
                  </div>
                  <span className="text-[11px] text-slate-500">
                    Detalhado com laudo, lote, inspetor e parecer técnico
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setConfig({ ...config, template: 'consolidated_today' })}
                  className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                    config.template === 'consolidated_today'
                      ? 'border-emerald-600 bg-emerald-50/70 text-emerald-950 ring-2 ring-emerald-500/20'
                      : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <Layers className="w-3.5 h-3.5 text-teal-600" />
                    Resumo Consolidado
                  </div>
                  <span className="text-[11px] text-slate-500">
                    Médias e amplitudes de todos os produtos do dia
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setConfig({ ...config, template: 'deviation_alert' })}
                  className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                    config.template === 'deviation_alert'
                      ? 'border-rose-600 bg-rose-50/70 text-rose-950 ring-2 ring-rose-500/20'
                      : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs text-rose-700">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                    Alerta de Desvio Urgente
                  </div>
                  <span className="text-[11px] text-slate-500">
                    Para notificar retenção de lote e não conformidades
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setConfig({ ...config, template: 'shift_report' })}
                  className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                    config.template === 'shift_report'
                      ? 'border-emerald-600 bg-emerald-50/70 text-emerald-950 ring-2 ring-emerald-500/20'
                      : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    Fechamento de Turno
                  </div>
                  <span className="text-[11px] text-slate-500">
                    Passagem de turno com amostragens realizadas
                  </span>
                </button>
              </div>
            </div>

            {/* Customization Options */}
            <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                <Settings2 className="w-3.5 h-3.5 text-slate-600" />
                Opções de Personalização
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-slate-700">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={config.includeHeaderBanner}
                    onChange={(e) => setConfig({ ...config, includeHeaderBanner: e.target.checked })}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Cabeçalho Amboni</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={config.includeTolerances}
                    onChange={(e) => setConfig({ ...config, includeTolerances: e.target.checked })}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Limites técnicos</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={config.includeInspector}
                    onChange={(e) => setConfig({ ...config, includeInspector: e.target.checked })}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Nome do Inspetor</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={config.includeLot}
                    onChange={(e) => setConfig({ ...config, includeLot: e.target.checked })}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Lote / Carga</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={config.includeNotes}
                    onChange={(e) => setConfig({ ...config, includeNotes: e.target.checked })}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Observações</span>
                </label>
              </div>
            </div>

            {/* Direct Phone Number */}
            <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-2 mb-1.5">
                <Phone className="w-3.5 h-3.5 text-emerald-600" />
                Número Destinatário (Opcional)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ex: 48999999999 ou deixe em branco p/ escolher contato"
                  value={config.targetPhone || ''}
                  onChange={(e) => setConfig({ ...config, targetPhone: e.target.value })}
                  className="flex-1 text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Deixando em branco, você pode escolher qualquer grupo ou conversa no WhatsApp.
              </p>
            </div>
          </div>

          {/* Right Column: WhatsApp Preview Simulation */}
          <div className="lg:col-span-6 flex flex-col">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2 flex items-center justify-between">
              <span>Prévia Visual (WhatsApp)</span>
              <span className="text-[11px] text-emerald-600 font-normal">Como será exibido no chat</span>
            </label>

            {/* WhatsApp Chat Bubble Simulation */}
            <div className="flex-1 bg-[#eae6df] rounded-xl p-3 sm:p-4 border border-slate-300 overflow-y-auto max-h-[380px] shadow-inner font-sans">
              <div className="max-w-[95%] bg-white rounded-lg rounded-tl-none p-3 shadow-xs text-xs text-slate-800 relative space-y-1">
                <div className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1 mb-1">
                  <Sparkles className="w-3 h-3" /> Amboni Alimentos • Qualidade
                </div>
                <pre className="whitespace-pre-wrap font-sans text-slate-800 leading-relaxed break-words text-[12px]">
                  {generatedText}
                </pre>
                <div className="text-right text-[10px] text-slate-400 mt-1">
                  {new Date().toTimeString().slice(0, 5)} ✓✓
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Fechar
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shadow-xs ${
                copied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-300'
              }`}
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copiado para Área de Transferência!' : 'Copiar Texto Formatado'}
            </button>

            <button
              onClick={handleSend}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-sm transition-all"
            >
              <Send className="w-4 h-4" />
              Abrir e Enviar no WhatsApp
              <ExternalLink className="w-3.5 h-3.5 opacity-70" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
