import React, { useState, useMemo } from 'react';
import {
  FlaskConical,
  TrendingUp,
  Calculator,
  ShieldCheck,
  BarChart2,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Scale,
  Clock,
  ArrowRight,
  FileSpreadsheet,
  Plus,
  RefreshCw,
  Info
} from 'lucide-react';
import { Category, QualityRecord } from '../types';
import { calculateStats } from '../services/excel';
import { parseNumBR, fmtDateBR, evaluateIndicator } from '../services/whatsapp';

interface LabHubViewProps {
  records: QualityRecord[];
  categories: Category[];
  onNewRecordWithPreFill?: (prefill: Partial<QualityRecord>) => void;
  onOpenExcelExport: () => void;
  onOpenExcelImport: () => void;
}

export const LabHubView: React.FC<LabHubViewProps> = ({
  records,
  categories,
  onNewRecordWithPreFill,
  onOpenExcelExport,
  onOpenExcelImport
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'cep' | 'calculator' | 'counterSamples'>('cep');

  // CEP state
  const [selectedCatId, setSelectedCatId] = useState<string>(categories[0]?.id || '');
  const selectedCat = categories.find((c) => c.id === selectedCatId) || categories[0];
  const [selectedField, setSelectedField] = useState<string>(selectedCat?.fields?.[0] || 'Umidade');

  // Update selectedField when selectedCat changes
  React.useEffect(() => {
    if (selectedCat && (!selectedField || !selectedCat.fields.includes(selectedField))) {
      setSelectedField(selectedCat.fields[0] || '');
    }
  }, [selectedCat]);

  // Calculator state: Desconto de Umidade
  const [pesoBruto, setPesoBruto] = useState<string>('30000'); // 30 toneladas
  const [umidadeEntrada, setUmidadeEntrada] = useState<string>('15.5');
  const [umidadeBase, setUmidadeBase] = useState<string>('13.0');

  // Calculator state: Teste de Renda Engenho de Prova (100g)
  const [pesoCasca, setPesoCasca] = useState<string>('100');
  const [pesoRendaTotal, setPesoRendaTotal] = useState<string>('72.5');
  const [pesoInteiros, setPesoInteiros] = useState<string>('66.0');
  const [loteCalculado, setLoteCalculado] = useState<string>(`PROVA-LAB-${new Date().toISOString().slice(5, 10).replace('-', '')}`);

  // Compute CEP data points
  const spec = selectedCat?.specs?.find((s) => s.name === selectedField);
  const relevantRecords = useMemo(() => {
    return records
      .filter((r) => r.categoryId === selectedCat?.id && r.values?.[selectedField] !== undefined)
      .sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || '')));
  }, [records, selectedCat, selectedField]);

  const numericPoints = useMemo(() => {
    return relevantRecords
      .map((r) => {
        const valStr = r.values?.[selectedField];
        const num = parseNumBR(valStr);
        return {
          record: r,
          value: num,
          date: r.date,
          time: r.time,
          lot: r.lotNumber || r.id
        };
      })
      .filter((p): p is { record: QualityRecord; value: number; date: string; time: string; lot: string } => p.value !== null);
  }, [relevantRecords, selectedField]);

  const stats = useMemo(() => {
    return calculateStats(numericPoints.map((p) => p.value));
  }, [numericPoints]);

  // Calculations for Grain Intake & Moisture deduction
  const calcUmidadeResult = useMemo(() => {
    const pBruto = parseFloat(pesoBruto.replace(',', '.')) || 0;
    const uEntrada = parseFloat(umidadeEntrada.replace(',', '.')) || 0;
    const uBase = parseFloat(umidadeBase.replace(',', '.')) || 13;

    if (pBruto <= 0 || uEntrada <= uBase) {
      return {
        descontoPercent: 0,
        quebraKg: 0,
        pesoLiquido: pBruto
      };
    }
    // Official MAPA grain moisture loss formula: Desconto% = ((U_entrada - U_base) / (100 - U_base)) * 100
    const descontoPercent = ((uEntrada - uBase) / (100 - uBase)) * 100;
    const quebraKg = (pBruto * descontoPercent) / 100;
    const pesoLiquido = pBruto - quebraKg;

    return {
      descontoPercent: Number(descontoPercent.toFixed(2)),
      quebraKg: Math.round(quebraKg),
      pesoLiquido: Math.round(pesoLiquido)
    };
  }, [pesoBruto, umidadeEntrada, umidadeBase]);

  // Calculations for Rice Yield Test (Engenho de prova 100g)
  const calcRendaResult = useMemo(() => {
    const pTotal = parseFloat(pesoRendaTotal.replace(',', '.')) || 0;
    const pInteiros = parseFloat(pesoInteiros.replace(',', '.')) || 0;
    const pAmostra = parseFloat(pesoCasca.replace(',', '.')) || 100;

    const rendaPercent = pAmostra > 0 ? (pTotal / pAmostra) * 100 : 0;
    const inteirosPercent = pAmostra > 0 ? (pInteiros / pAmostra) * 100 : 0;
    const quebraGramas = Math.max(0, pTotal - pInteiros);
    const quebraPercent = pTotal > 0 ? (quebraGramas / pTotal) * 100 : 0;

    // Classification standard MAPA:
    // Tipo 1: Quebrados max ~7.5% depending on standard
    let classificacao = 'Tipo 1 (Excelente)';
    if (quebraPercent > 15) classificacao = 'Fora de Padrão (Desvio)';
    else if (quebraPercent > 11) classificacao = 'Tipo 3';
    else if (quebraPercent > 7.5) classificacao = 'Tipo 2';

    return {
      rendaPercent: Number(rendaPercent.toFixed(1)),
      inteirosPercent: Number(inteirosPercent.toFixed(1)),
      quebraPercent: Number(quebraPercent.toFixed(1)),
      quebraGramas: Number(quebraGramas.toFixed(1)),
      classificacao
    };
  }, [pesoCasca, pesoRendaTotal, pesoInteiros]);

  const handleLaunchCalculatedRecord = () => {
    if (!onNewRecordWithPreFill) return;
    onNewRecordWithPreFill({
      categoryId: selectedCat?.id,
      lotNumber: loteCalculado,
      sampleOrigin: 'Engenho de Prova (Laboratório)',
      shift: '1º Turno (06h - 14h)',
      productionLine: 'Laboratório Central',
      values: {
        Umidade: umidadeEntrada.replace('.', ','),
        Renda: String(calcRendaResult.rendaPercent).replace('.', ','),
        Quebra: String(calcRendaResult.quebraPercent).replace('.', ','),
        Inteiros: String(calcRendaResult.inteirosPercent).replace('.', ',')
      },
      notes: `Ensaio de prova laboratorial: Renda ${calcRendaResult.rendaPercent}%, Quebra ${calcRendaResult.quebraPercent}%. Classificação provisória: ${calcRendaResult.classificacao}.`
    });
  };

  // SVG Chart Dimensions
  const svgWidth = 760;
  const svgHeight = 260;
  const padding = { top: 30, right: 30, bottom: 40, left: 50 };

  const chartData = useMemo(() => {
    if (!numericPoints.length) return null;
    const vals = numericPoints.map((p) => p.value);
    if (spec?.min !== undefined) vals.push(spec.min);
    if (spec?.max !== undefined) vals.push(spec.max);
    if (spec?.target !== undefined) vals.push(spec.target);

    const minVal = Math.min(...vals) * 0.95;
    const maxVal = Math.max(...vals) * 1.05;
    const valRange = maxVal - minVal || 1;

    const innerW = svgWidth - padding.left - padding.right;
    const innerH = svgHeight - padding.top - padding.bottom;

    const getY = (val: number) => {
      return padding.top + innerH - ((val - minVal) / valRange) * innerH;
    };

    const getX = (idx: number) => {
      if (numericPoints.length <= 1) return padding.left + innerW / 2;
      return padding.left + (idx / (numericPoints.length - 1)) * innerW;
    };

    return {
      minVal,
      maxVal,
      innerW,
      innerH,
      getX,
      getY,
      points: numericPoints.map((p, i) => ({
        ...p,
        x: getX(i),
        y: getY(p.value)
      }))
    };
  }, [numericPoints, spec]);

  return (
    <div className="space-y-5">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 text-white p-5 rounded-2xl shadow-lg border border-emerald-900/60 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300 shadow-inner">
            <FlaskConical className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base tracking-tight text-white">
                CENTRAL DE LABORATÓRIO & CEP
              </span>
              <span className="text-[10px] bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                Amboni Alimentos
              </span>
            </div>
            <p className="text-xs text-emerald-200 mt-0.5">
              Controle Estatístico de Processo, cálculo de quebra técnica e rastreabilidade de contraprovas
            </p>
          </div>
        </div>

        {/* Quick Excel Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenExcelImport}
            className="px-3.5 py-2 bg-emerald-900/60 hover:bg-emerald-800 text-emerald-200 hover:text-white border border-emerald-600/50 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
            title="Importar planilha de ensaios laboratoriais"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-300" />
            Importar Excel
          </button>

          <button
            onClick={onOpenExcelExport}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-emerald-950 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-md"
            title="Exportar laudos analíticos e matriz CEP para Excel"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Exportador Lab Excel
          </button>
        </div>
      </div>

      {/* Subtabs Selector */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveSubTab('cep')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === 'cep'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-200'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          Controle Estatístico de Processo (CEP)
        </button>

        <button
          onClick={() => setActiveSubTab('calculator')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === 'calculator'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Calculator className="w-4 h-4" />
          Calculadora Oficial de Renda & Umidade
        </button>

        <button
          onClick={() => setActiveSubTab('counterSamples')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === 'counterSamples'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-200'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          Gestão de Contraprovas Retidas
        </button>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 1. TAB: CEP & GRÁFICO DE TENDÊNCIA */}
      {/* ------------------------------------------------------------- */}
      {activeSubTab === 'cep' && (
        <div className="space-y-5">
          {/* Filter selectors */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Produto / Categoria
                </label>
                <select
                  value={selectedCatId}
                  onChange={(e) => setSelectedCatId(e.target.value)}
                  className="text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold text-slate-800"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Parâmetro / Indicador
                </label>
                <select
                  value={selectedField}
                  onChange={(e) => setSelectedField(e.target.value)}
                  className="text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold text-slate-800"
                >
                  {(selectedCat?.fields || []).map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Tolerance hints */}
            <div className="flex items-center gap-2 text-xs">
              <span className="px-3 py-1 bg-slate-100 rounded-lg text-slate-700 font-medium">
                Faixa Técnica: <b>{spec?.min ?? '—'}</b> a <b>{spec?.max ?? '—'}</b> {spec?.unit || ''}
              </span>
              {spec?.target !== undefined && (
                <span className="px-3 py-1 bg-emerald-50 text-emerald-800 rounded-lg font-bold border border-emerald-200">
                  Meta (Target): {spec.target} {spec.unit || ''}
                </span>
              )}
            </div>
          </div>

          {/* Statistical KPI Cards */}
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Amostras (N)
                </span>
                <span className="text-xl font-black text-slate-900 mt-1 block">{stats.n}</span>
                <span className="text-[10px] text-slate-500">lotes analisados</span>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Média do Processo (X̄)
                </span>
                <span className="text-xl font-black text-emerald-700 mt-1 block">
                  {stats.mean}
                  <span className="text-xs font-normal text-slate-500 ml-0.5">{spec?.unit || ''}</span>
                </span>
                <span className="text-[10px] text-slate-500">tendência central</span>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Desvio Padrão (s)
                </span>
                <span className="text-xl font-black text-slate-900 mt-1 block">{stats.stdDev}</span>
                <span className="text-[10px] text-slate-500">dispersão das amostras</span>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Coef. Variação (CV%)
                </span>
                <span className="text-xl font-black text-slate-900 mt-1 block">{stats.cv}%</span>
                <span className="text-[10px] text-slate-500">
                  {stats.cv < 5 ? 'Excelente estabilidade' : 'Estabilidade regular'}
                </span>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Mínimo / Máximo
                </span>
                <span className="text-sm font-black text-slate-900 mt-1 block">
                  {stats.min} a {stats.max}
                </span>
                <span className="text-[10px] text-slate-500">Amplitude: {stats.range}</span>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Capabilidade (Cpk)
                </span>
                <span className="text-xl font-black text-emerald-800 mt-1 block">
                  {stats.stdDev > 0 && (spec?.min !== undefined || spec?.max !== undefined)
                    ? Math.min(
                        spec.min !== undefined ? (stats.mean - spec.min) / (3 * stats.stdDev) : Infinity,
                        spec.max !== undefined ? (spec.max - stats.mean) / (3 * stats.stdDev) : Infinity
                      ).toFixed(2)
                    : '—'}
                </span>
                <span className="text-[10px] text-slate-500">Índice de controle</span>
              </div>
            </div>
          )}

          {/* Run Chart Canvas (Custom Responsive SVG) */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  Gráfico de Carta de Controle e Tendência (Run-Chart)
                </h3>
                <p className="text-xs text-slate-500">
                  Acompanhamento cronológico com limites de tolerância técnica (LSE / LSI)
                </p>
              </div>

              {/* Legend */}
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5 text-rose-600 font-semibold text-[11px]">
                  <span className="w-3 h-0.5 bg-rose-500"></span> Limites (LSE / LSI)
                </span>
                <span className="flex items-center gap-1.5 text-emerald-600 font-semibold text-[11px]">
                  <span className="w-3 h-0.5 bg-emerald-500 border-dashed"></span> Alvo
                </span>
                <span className="flex items-center gap-1.5 text-blue-600 font-semibold text-[11px]">
                  <span className="w-3 h-0.5 bg-blue-500"></span> Média (X̄)
                </span>
              </div>
            </div>

            {!chartData || chartData.points.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-slate-400 text-xs">
                <Info className="w-8 h-8 text-slate-300 mb-2" />
                Nenhum dado numérico encontrado para este indicador no produto selecionado.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <svg
                  viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                  className="w-full h-auto max-h-[320px] select-none"
                >
                  {/* Background Grid Lines */}
                  <line
                    x1={padding.left}
                    y1={padding.top}
                    x2={svgWidth - padding.right}
                    y2={padding.top}
                    stroke="#e2e8f0"
                    strokeDasharray="4 4"
                  />
                  <line
                    x1={padding.left}
                    y1={svgHeight - padding.bottom}
                    x2={svgWidth - padding.right}
                    y2={svgHeight - padding.bottom}
                    stroke="#cbd5e1"
                  />

                  {/* LSE (Limite Superior) */}
                  {spec?.max !== undefined && (
                    <g>
                      <line
                        x1={padding.left}
                        y1={chartData.getY(spec.max)}
                        x2={svgWidth - padding.right}
                        y2={chartData.getY(spec.max)}
                        stroke="#e11d48"
                        strokeWidth="1.5"
                        strokeDasharray="5 5"
                      />
                      <text
                        x={svgWidth - padding.right + 4}
                        y={chartData.getY(spec.max) + 4}
                        fill="#e11d48"
                        fontSize="9"
                        fontWeight="bold"
                      >
                        LSE: {spec.max}
                      </text>
                    </g>
                  )}

                  {/* LSI (Limite Inferior) */}
                  {spec?.min !== undefined && (
                    <g>
                      <line
                        x1={padding.left}
                        y1={chartData.getY(spec.min)}
                        x2={svgWidth - padding.right}
                        y2={chartData.getY(spec.min)}
                        stroke="#e11d48"
                        strokeWidth="1.5"
                        strokeDasharray="5 5"
                      />
                      <text
                        x={svgWidth - padding.right + 4}
                        y={chartData.getY(spec.min) + 4}
                        fill="#e11d48"
                        fontSize="9"
                        fontWeight="bold"
                      >
                        LSI: {spec.min}
                      </text>
                    </g>
                  )}

                  {/* Target Line */}
                  {spec?.target !== undefined && (
                    <g>
                      <line
                        x1={padding.left}
                        y1={chartData.getY(spec.target)}
                        x2={svgWidth - padding.right}
                        y2={chartData.getY(spec.target)}
                        stroke="#10b981"
                        strokeWidth="1.5"
                        strokeDasharray="3 3"
                      />
                      <text
                        x={padding.left - 45}
                        y={chartData.getY(spec.target) + 4}
                        fill="#10b981"
                        fontSize="9"
                        fontWeight="bold"
                      >
                        Alvo: {spec.target}
                      </text>
                    </g>
                  )}

                  {/* Process Mean (X̄) Line */}
                  {stats && (
                    <g>
                      <line
                        x1={padding.left}
                        y1={chartData.getY(stats.mean)}
                        x2={svgWidth - padding.right}
                        y2={chartData.getY(stats.mean)}
                        stroke="#2563eb"
                        strokeWidth="1"
                        strokeDasharray="2 2"
                      />
                      <text
                        x={padding.left - 45}
                        y={chartData.getY(stats.mean) + 4}
                        fill="#2563eb"
                        fontSize="9"
                        fontWeight="bold"
                      >
                        X̄: {stats.mean}
                      </text>
                    </g>
                  )}

                  {/* Trend connecting line */}
                  {chartData.points.length > 1 && (
                    <polyline
                      fill="none"
                      stroke="#059669"
                      strokeWidth="2"
                      points={chartData.points.map((p) => `${p.x},${p.y}`).join(' ')}
                    />
                  )}

                  {/* Data Points */}
                  {chartData.points.map((p, i) => {
                    const evalRes = evaluateIndicator(String(p.value), spec);
                    const color =
                      evalRes.status === 'error'
                        ? '#e11d48'
                        : evalRes.status === 'warning'
                        ? '#d97706'
                        : '#059669';

                    return (
                      <g key={i}>
                        <circle
                          cx={p.x}
                          cy={p.y}
                          r="5"
                          fill={color}
                          stroke="#ffffff"
                          strokeWidth="2"
                          className="cursor-pointer hover:r-7 transition-all"
                        >
                          <title>{`Lote: ${p.lot}\nData: ${fmtDateBR(p.date)} ${p.time || ''}\nValor: ${p.value}${spec?.unit || ''}\nStatus: ${evalRes.label}`}</title>
                        </circle>

                        {/* Value label */}
                        <text
                          x={p.x}
                          y={p.y - 8}
                          textAnchor="middle"
                          fill="#334155"
                          fontSize="9"
                          fontWeight="bold"
                        >
                          {p.value}
                        </text>

                        {/* Bottom X-axis date / lot label */}
                        <text
                          x={p.x}
                          y={svgHeight - padding.bottom + 16}
                          textAnchor="middle"
                          fill="#64748b"
                          fontSize="8"
                        >
                          {fmtDateBR(p.date).slice(0, 5)}
                        </text>
                        <text
                          x={p.x}
                          y={svgHeight - padding.bottom + 26}
                          textAnchor="middle"
                          fill="#94a3b8"
                          fontSize="7"
                        >
                          {p.lot.slice(-5)}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 2. TAB: CALCULADORA DE GRÃOS & RENDA (MAPA) */}
      {/* ------------------------------------------------------------- */}
      {activeSubTab === 'calculator' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Card A: Cálculo de Desconto de Umidade na Recepção */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
                <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center font-bold">
                  <Scale className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    Cálculo de Quebra por Umidade (Recepção de Caminhão)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Fórmula oficial MAPA para desconto técnico de peso por secagem
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Peso Bruto da Carga (kg)
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={pesoBruto}
                    onChange={(e) => setPesoBruto(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Umidade Aferida (%)
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={umidadeEntrada}
                    onChange={(e) => setUmidadeEntrada(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-teal-800"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Umidade Base MAPA (%)
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={umidadeBase}
                    onChange={(e) => setUmidadeBase(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                  />
                </div>
              </div>

              {/* Calculation Result */}
              <div className="bg-teal-50/70 border border-teal-200 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600">Desconto Técnico Percentual:</span>
                  <span className="font-black text-teal-900 text-sm">
                    {calcUmidadeResult.descontoPercent}%
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600">Quebra Técnica de Peso (Água):</span>
                  <span className="font-black text-rose-700 text-sm">
                    - {calcUmidadeResult.quebraKg.toLocaleString('pt-BR')} kg
                  </span>
                </div>
                <div className="pt-2 border-t border-teal-200/60 flex items-center justify-between">
                  <span className="font-bold text-xs text-teal-950">
                    Peso Líquido Seco Final:
                  </span>
                  <span className="text-lg font-black text-emerald-800">
                    {calcUmidadeResult.pesoLiquido.toLocaleString('pt-BR')} kg
                  </span>
                </div>
              </div>
            </div>

            <p className="text-[10px] text-slate-400 mt-4">
              Base normativa: Portaria MAPA de Classificação Vegetal e Secagem de Grãos.
            </p>
          </div>

          {/* Card B: Teste de Renda de Engenho de Prova (100g) */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                  <FlaskConical className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    Ensaio de Renda de Benefício (Amostra de 100g)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Classificação laboratorial de arroz em casca despelado no engenho de prova
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Amostra Inicial (g)
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={pesoCasca}
                    onChange={(e) => setPesoCasca(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Renda Total (g)
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={pesoRendaTotal}
                    onChange={(e) => setPesoRendaTotal(e.target.value)}
                    placeholder="Ex: 72.5"
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-emerald-800"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Grãos Inteiros (g)
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={pesoInteiros}
                    onChange={(e) => setPesoInteiros(e.target.value)}
                    placeholder="Ex: 66.0"
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-emerald-800"
                  />
                </div>
              </div>

              {/* Renda Results */}
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4 space-y-2">
                <div className="grid grid-cols-3 gap-2 text-center pb-2 border-b border-emerald-200/60">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Renda Total:</span>
                    <span className="font-black text-emerald-900 text-base">
                      {calcRendaResult.rendaPercent}%
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Grãos Inteiros:</span>
                    <span className="font-black text-emerald-900 text-base">
                      {calcRendaResult.inteirosPercent}%
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Quebra Relativa:</span>
                    <span className="font-black text-amber-900 text-base">
                      {calcRendaResult.quebraPercent}%
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs font-bold text-emerald-950">
                    Classificação Provisória:
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-200 text-emerald-950">
                    {calcRendaResult.classificacao}
                  </span>
                </div>
              </div>

              {/* Launch directly into ERP button */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleLaunchCalculatedRecord}
                  className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
                >
                  <Plus className="w-4 h-4" />
                  Lançar Resultado Direto no ERP (Lote: {loteCalculado})
                </button>
              </div>
            </div>

            <p className="text-[10px] text-slate-400 mt-3">
              Padronizado para triagem rápida em recepção de arroz parboilizado e branco.
            </p>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 3. TAB: GESTÃO DE CONTRAPROVAS RETIDAS */}
      {/* ------------------------------------------------------------- */}
      {activeSubTab === 'counterSamples' && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-black text-slate-900">
                Arquivo de Amostras de Contraprova (Retenção de Arquivo)
              </h3>
              <p className="text-xs text-slate-500">
                Amostras físicas de grãos armazenadas no laboratório para auditorias e reclamações de clientes
              </p>
            </div>
            <button
              onClick={onOpenExcelExport}
              className="px-3 py-1.5 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Exportar Inventário de Contraprovas
            </button>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                  <th className="py-3 px-3">Lote / Carga</th>
                  <th className="py-3 px-3">Produto</th>
                  <th className="py-3 px-3">Data Coleta</th>
                  <th className="py-3 px-3">Localização (Armário/Gaveta)</th>
                  <th className="py-3 px-3">Validade Retenção</th>
                  <th className="py-3 px-3">Situação</th>
                  <th className="py-3 px-3">Inspetor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {records.map((r) => {
                  const cat = categories.find((c) => c.id === r.categoryId);
                  return (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-bold text-slate-800">{r.lotNumber || r.id}</td>
                      <td className="py-2.5 px-3 text-slate-700">{cat?.name || '—'}</td>
                      <td className="py-2.5 px-3 whitespace-nowrap">{fmtDateBR(r.date)}</td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-medium text-[11px]">
                          {r.counterSampleLocation || 'Armário Lab - Gaveta 01'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">
                        {r.counterSampleExpiry || '180 dias após coleta'}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {r.status === 'rejected' ? (
                          <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded-full font-bold text-[10px]">
                            LOTE RETIDO
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-bold text-[10px]">
                            LOTE LIBERADO
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">{r.inspector || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
