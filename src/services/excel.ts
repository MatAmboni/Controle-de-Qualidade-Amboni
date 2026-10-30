import * as XLSX from 'xlsx';
import { Category, QualityRecord, ExcelExportOptions } from '../types';
import { fmtDateBR, parseNumBR, evaluateIndicator } from './whatsapp';

export function calculateStats(values: number[]) {
  if (!values.length) return null;
  const n = values.length;
  const sum = values.reduce((a, b) => a + b, 0);
  const mean = sum / n;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;

  let variance = 0;
  if (n > 1) {
    const sumSquaredDiffs = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0);
    variance = sumSquaredDiffs / (n - 1);
  }
  const stdDev = Math.sqrt(variance);
  const cv = mean !== 0 ? (stdDev / mean) * 100 : 0;

  return {
    n,
    mean: Number(mean.toFixed(2)),
    min: Number(min.toFixed(2)),
    max: Number(max.toFixed(2)),
    range: Number(range.toFixed(2)),
    stdDev: Number(stdDev.toFixed(3)),
    cv: Number(cv.toFixed(2))
  };
}

export function exportQualityExcel(
  records: QualityRecord[],
  categories: Category[],
  options?: Partial<ExcelExportOptions>
): void {
  const catMap = new Map<string, Category>();
  categories.forEach((c) => catMap.set(c.id, c));

  // Filter records based on options
  let filtered = [...records];

  if (options?.dateRange === 'today') {
    const today = new Date().toISOString().slice(0, 10);
    filtered = filtered.filter((r) => r.date === today);
  } else if (options?.dateRange === '7days') {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);
    const cutoffStr = cutoff.toISOString().slice(0, 10);
    filtered = filtered.filter((r) => r.date >= cutoffStr);
  } else if (options?.dateRange === '30days') {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    const cutoffStr = cutoff.toISOString().slice(0, 10);
    filtered = filtered.filter((r) => r.date >= cutoffStr);
  } else if (options?.dateRange === 'custom' && options.startDate && options.endDate) {
    filtered = filtered.filter((r) => r.date >= options.startDate! && r.date <= options.endDate!);
  }

  if (options?.categoryId && options.categoryId !== 'all') {
    filtered = filtered.filter((r) => r.categoryId === options.categoryId);
  }

  if (options?.status && options.status !== 'all') {
    filtered = filtered.filter((r) => (r.status || 'approved') === options.status);
  }

  // Sort by date & time ascending for proper chronological lab log
  filtered.sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || '')));

  const wb = XLSX.utils.book_new();

  // -------------------------------------------------------------
  // 1. SHEET: Matriz Analítica por Lote (Wide Format)
  // -------------------------------------------------------------
  // Collect all unique indicators present in the categories
  const allIndicatorNames = Array.from(
    new Set(categories.flatMap((c) => c.fields || []))
  );

  const matrixRows: any[] = filtered.map((r, idx) => {
    const c = catMap.get(r.categoryId);
    const row: any = {
      'Item': idx + 1,
      'Data da Coleta': fmtDateBR(r.date),
      'Hora': r.time || '',
      'Produto / Categoria': c?.name || 'Categoria Removida',
      'Lote / Carga': r.lotNumber || '—',
      'Tipo de Análise': r.analysisType ? r.analysisType.toUpperCase() : 'ROTINA',
      'Turno': r.shift || '—',
      'Linha de Produção': r.productionLine || '—',
      'Ponto de Amostragem': r.sampleOrigin || '—'
    };

    // Add each indicator as a dedicated Excel numeric column
    allIndicatorNames.forEach((ind) => {
      const valStr = r.values?.[ind];
      if (valStr !== undefined && valStr !== '') {
        const num = parseNumBR(valStr);
        row[ind] = num !== null ? num : valStr;
      } else {
        row[ind] = '';
      }
    });

    row['Parecer Técnico'] =
      r.status === 'rejected'
        ? 'REPROVADO / RETIDO'
        : r.status === 'warning'
        ? 'ATENÇÃO / RESTRITO'
        : 'CONFORME / LIBERADO';
    row['Contraprova Lab'] = r.counterSampleLocation || 'Não retida';
    row['Inspetor Responsável'] = r.inspector || '—';
    row['Causa Raiz'] = r.rootCause || '—';
    row['Ação Corretiva'] = r.correctiveAction || '—';
    row['Observações do Laboratório'] = r.notes || '';

    return row;
  });

  const wsMatrix = XLSX.utils.json_to_sheet(
    matrixRows.length ? matrixRows : [{ Aviso: 'Nenhum lançamento no período selecionado.' }]
  );

  // Formatting widths for Matrix
  const matrixCols = [
    { wch: 6 },  // Item
    { wch: 13 }, // Data
    { wch: 8 },  // Hora
    { wch: 32 }, // Produto
    { wch: 18 }, // Lote
    { wch: 16 }, // Tipo
    { wch: 16 }, // Turno
    { wch: 22 }, // Linha
    { wch: 18 }  // Origem
  ];
  allIndicatorNames.forEach(() => matrixCols.push({ wch: 14 }));
  matrixCols.push(
    { wch: 22 }, // Parecer
    { wch: 20 }, // Contraprova
    { wch: 22 }, // Inspetor
    { wch: 25 }, // Causa Raiz
    { wch: 25 }, // Ação Corretiva
    { wch: 35 }  // Observações
  );
  wsMatrix['!cols'] = matrixCols;
  XLSX.utils.book_append_sheet(wb, wsMatrix, 'Matriz de Lotes (Lab)');

  // -------------------------------------------------------------
  // 2. SHEET: Estatística Descritiva & CEP
  // -------------------------------------------------------------
  const statsRows: any[] = [];
  categories.forEach((cat) => {
    const catRecords = filtered.filter((r) => r.categoryId === cat.id);
    if (!catRecords.length) return;

    (cat.fields || []).forEach((field) => {
      const spec = cat.specs?.find((s) => s.name === field);
      const numbers: number[] = [];
      let outOfSpecCount = 0;

      catRecords.forEach((r) => {
        const valStr = r.values?.[field];
        const num = parseNumBR(valStr);
        if (num !== null) {
          numbers.push(num);
          const evalRes = evaluateIndicator(valStr, spec);
          if (evalRes.status === 'error') {
            outOfSpecCount++;
          }
        }
      });

      if (numbers.length > 0) {
        const s = calculateStats(numbers)!;
        const conformingCount = s.n - outOfSpecCount;
        const conformityRate = ((conformingCount / s.n) * 100).toFixed(1) + '%';

        // Approximate Cpk calculation if specifications exist
        let cpkStr = '—';
        if (s.stdDev > 0 && (spec?.min !== undefined || spec?.max !== undefined)) {
          let cpl = Infinity;
          let cpu = Infinity;
          if (spec.min !== undefined) cpl = (s.mean - spec.min) / (3 * s.stdDev);
          if (spec.max !== undefined) cpu = (spec.max - s.mean) / (3 * s.stdDev);
          const cpk = Math.min(cpl, cpu);
          if (cpk !== Infinity) cpkStr = cpk.toFixed(2);
        }

        statsRows.push({
          'Produto / Categoria': cat.name,
          'Indicador': field,
          'Unidade': spec?.unit || '',
          'Amostras (N)': s.n,
          'Média Aritmética (X̄)': s.mean,
          'Desvio Padrão (s)': s.stdDev,
          'Coef. Variação (CV%)': `${s.cv}%`,
          'Valor Mínimo': s.min,
          'Valor Máximo': s.max,
          'Amplitude': s.range,
          'Limite Mín (LSI)': spec?.min !== undefined ? spec.min : '—',
          'Limite Máx (LSE)': spec?.max !== undefined ? spec.max : '—',
          'Alvo / Meta': spec?.target !== undefined ? spec.target : '—',
          'Amostras Conformes': conformingCount,
          'Fora de Padrão (Desvios)': outOfSpecCount,
          'Taxa de Conformidade': conformityRate,
          'Índice Cpk Estimado': cpkStr
        });
      }
    });
  });

  const wsStats = XLSX.utils.json_to_sheet(
    statsRows.length ? statsRows : [{ Aviso: 'Dados insuficientes para estatística descritiva.' }]
  );
  wsStats['!cols'] = [
    { wch: 32 }, // Produto
    { wch: 18 }, // Indicador
    { wch: 10 }, // Unidade
    { wch: 14 }, // N
    { wch: 20 }, // Média
    { wch: 16 }, // Desvio Padrão
    { wch: 18 }, // CV%
    { wch: 14 }, // Min
    { wch: 14 }, // Max
    { wch: 12 }, // Amplitude
    { wch: 16 }, // LSI
    { wch: 16 }, // LSE
    { wch: 14 }, // Alvo
    { wch: 18 }, // Conformes
    { wch: 22 }, // Desvios
    { wch: 20 }, // Conformidade %
    { wch: 18 }  // Cpk
  ];
  XLSX.utils.book_append_sheet(wb, wsStats, 'Estatística e CEP');

  // -------------------------------------------------------------
  // 3. SHEET: Relatório de Não Conformidades (RNC & Ações)
  // -------------------------------------------------------------
  const rncRows: any[] = [];
  filtered
    .filter((r) => r.status === 'rejected' || r.status === 'warning')
    .forEach((r, idx) => {
      const c = catMap.get(r.categoryId);
      const defectiveFields: string[] = [];

      Object.entries(r.values || {}).forEach(([k, v]) => {
        const spec = c?.specs?.find((s) => s.name === k);
        const evalRes = evaluateIndicator(v, spec);
        if (evalRes.status !== 'ok') {
          defectiveFields.push(`${k}: ${v}${spec?.unit || ''} (${evalRes.label})`);
        }
      });

      rncRows.push({
        'RNC Nº': `RNC-${r.date.replace(/-/g, '')}-${idx + 1}`,
        'Data': fmtDateBR(r.date),
        'Hora': r.time || '',
        'Produto': c?.name || 'N/A',
        'Lote Afetado': r.lotNumber || '—',
        'Linha': r.productionLine || '—',
        'Turno': r.shift || '—',
        'Parâmetro com Desvio': defectiveFields.join(' | ') || 'Desvio visual / sensorial',
        'Disposição do Lote': r.status === 'rejected' ? 'REPROVADO / BLOQUEADO' : 'LIBERADO COM RESTRIÇÃO',
        'Causa Raiz Apurada': r.rootCause || 'Em investigação pelo laboratório',
        'Ação Corretiva Imediata': r.correctiveAction || r.notes || 'Ajuste de máquina e coleta de contraprova',
        'Inspetor Notificante': r.inspector || '—'
      });
    });

  const wsRnc = XLSX.utils.json_to_sheet(
    rncRows.length
      ? rncRows
      : [{ 'Status RNC': 'Parabéns! Nenhuma não conformidade registrada no período.' }]
  );
  wsRnc['!cols'] = [
    { wch: 16 }, // RNC Nº
    { wch: 12 }, // Data
    { wch: 8 },  // Hora
    { wch: 30 }, // Produto
    { wch: 18 }, // Lote
    { wch: 20 }, // Linha
    { wch: 16 }, // Turno
    { wch: 35 }, // Desvios
    { wch: 24 }, // Disposição
    { wch: 30 }, // Causa
    { wch: 35 }, // Ação
    { wch: 20 }  // Inspetor
  ];
  XLSX.utils.book_append_sheet(wb, wsRnc, 'RNC & Ações Corretivas');

  // -------------------------------------------------------------
  // 4. SHEET: Gestão de Contraprovas de Laboratório
  // -------------------------------------------------------------
  const counterSampleRows: any[] = [];
  filtered
    .filter((r) => r.counterSampleLocation || r.lotNumber)
    .forEach((r) => {
      const c = catMap.get(r.categoryId);
      counterSampleRows.push({
        'Lote / Código': r.lotNumber || r.id,
        'Produto': c?.name || '—',
        'Data da Amostragem': fmtDateBR(r.date),
        'Local de Retenção (Armário/Gaveta)': r.counterSampleLocation || 'Armário Central Lab CQ',
        'Validade da Contraprova': r.counterSampleExpiry || '180 dias após data de coleta',
        'Situação do Lote': r.status === 'rejected' ? 'RETIDO' : 'LIBERADO',
        'Analista Responsável': r.inspector || 'Laboratório Amboni'
      });
    });

  const wsCounter = XLSX.utils.json_to_sheet(
    counterSampleRows.length
      ? counterSampleRows
      : [{ Aviso: 'Nenhuma contraprova arquivada no período.' }]
  );
  wsCounter['!cols'] = [
    { wch: 20 },
    { wch: 32 },
    { wch: 18 },
    { wch: 32 },
    { wch: 25 },
    { wch: 18 },
    { wch: 22 }
  ];
  XLSX.utils.book_append_sheet(wb, wsCounter, 'Contraprovas de Laboratório');

  // -------------------------------------------------------------
  // 5. SHEET: Resumo Executivo Amboni
  // -------------------------------------------------------------
  const summaryRows = categories.map((cat) => {
    const catRecs = filtered.filter((r) => r.categoryId === cat.id);
    const approved = catRecs.filter((r) => !r.status || r.status === 'approved').length;
    const warning = catRecs.filter((r) => r.status === 'warning').length;
    const rejected = catRecs.filter((r) => r.status === 'rejected').length;
    const rate = catRecs.length > 0 ? ((approved / catRecs.length) * 100).toFixed(1) + '%' : '100%';

    return {
      'Produto / Categoria': cat.name,
      'Total de Lotes Analisados': catRecs.length,
      'Lotes Conformes (Aprovados)': approved,
      'Lotes em Alerta (Atenção)': warning,
      'Lotes Rejeitados (Desvios)': rejected,
      'Índice de Conformidade': rate,
      'Indicadores Monitorados': (cat.fields || []).join(' | ')
    };
  });

  const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
  wsSummary['!cols'] = [
    { wch: 35 },
    { wch: 24 },
    { wch: 24 },
    { wch: 22 },
    { wch: 24 },
    { wch: 22 },
    { wch: 55 }
  ];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumo Gerencial');

  // -------------------------------------------------------------
  // 6. SHEET: Matriz de Especificações e Normas MAPA
  // -------------------------------------------------------------
  const toleranceRows: any[] = [];
  categories.forEach((c) => {
    (c.fields || []).forEach((f) => {
      const spec = c.specs?.find((s) => s.name === f);
      toleranceRows.push({
        'Produto': c.name,
        'Indicador Técnico': f,
        'Unidade': spec?.unit || '',
        'Limite Mínimo Permitido': spec?.min !== undefined ? spec.min : 'Sem mínimo',
        'Limite Máximo Permitido': spec?.max !== undefined ? spec.max : 'Sem máximo',
        'Valor Alvo (Target de Produção)': spec?.target !== undefined ? spec.target : '—',
        'Classificação / Referência': 'Padrão Técnico Amboni Alimentos'
      });
    });
  });

  const wsSpecs = XLSX.utils.json_to_sheet(toleranceRows);
  wsSpecs['!cols'] = [
    { wch: 35 },
    { wch: 22 },
    { wch: 10 },
    { wch: 22 },
    { wch: 22 },
    { wch: 26 },
    { wch: 32 }
  ];
  XLSX.utils.book_append_sheet(wb, wsSpecs, 'Especificações Técnicas');

  // Trigger download
  const dateSuffix = new Date().toISOString().slice(0, 10);
  const finalFileName = options?.fileName || `amboni-laudos-laboratorio-${dateSuffix}.xlsx`;
  XLSX.writeFile(wb, finalFileName);
}

// -------------------------------------------------------------
// Excel Template Generator for Bulk Lab Import
// -------------------------------------------------------------
export function downloadExcelImportTemplate(categories: Category[]): void {
  const wb = XLSX.utils.book_new();

  // Instructions Sheet
  const instructions = [
    {
      'INSTRUÇÕES PARA PREENCHIMENTO': '1. Preencha cada linha com os dados da amostragem do lote.',
      'EXEMPLO / REGRA': 'Utilize o formato DD/MM/AAAA para a data ou YYYY-MM-DD.'
    },
    {
      'INSTRUÇÕES PARA PREENCHIMENTO': '2. A coluna "Produto" deve conter exatamente o nome de uma categoria cadastrada.',
      'EXEMPLO / REGRA': 'Exemplos cadastrados: ' + categories.map((c) => c.name).join(', ')
    },
    {
      'INSTRUÇÕES PARA PREENCHIMENTO': '3. Preencha os valores dos indicadores com números (ex: 12,5 ou 12.5).',
      'EXEMPLO / REGRA': 'Não adicione símbolos como "%" ou "graus" nos campos numéricos.'
    },
    {
      'INSTRUÇÕES PARA PREENCHIMENTO': '4. A coluna "Parecer" aceita: APROVADO, ATENÇÃO, REPROVADO ou ANALISE.',
      'EXEMPLO / REGRA': 'Se deixar vazio, o ERP avaliará automaticamente conforme as tolerâncias.'
    }
  ];
  const wsInst = XLSX.utils.json_to_sheet(instructions);
  wsInst['!cols'] = [{ wch: 50 }, { wch: 60 }];
  XLSX.utils.book_append_sheet(wb, wsInst, 'Instruções');

  // Samples Sheet
  const sampleRows: any[] = [];
  categories.forEach((cat) => {
    const row: any = {
      'Data': new Date().toISOString().slice(0, 10),
      'Hora': '08:30',
      'Produto': cat.name,
      'Lote': 'LOTE-EXEMPLO-01',
      'Turno': '1º Turno (06h - 14h)',
      'Linha': 'Linha A - Parboilizado',
      'Ponto Coleta': 'Empacotadora 1',
      'Inspetor': 'Laboratório Amboni',
      'Parecer': 'APROVADO',
      'Local Contraprova': 'Armário Lab Gaveta 1',
      'Observações': 'Amostra padrão'
    };

    (cat.fields || []).forEach((f) => {
      const spec = cat.specs?.find((s) => s.name === f);
      row[f] = spec?.target !== undefined ? spec.target : spec?.max ? (spec.max - 0.5).toFixed(1) : '12.0';
    });

    sampleRows.push(row);
  });

  const wsTemplate = XLSX.utils.json_to_sheet(sampleRows);
  const colWidths = [
    { wch: 12 }, { wch: 8 }, { wch: 32 }, { wch: 18 }, { wch: 20 },
    { wch: 22 }, { wch: 18 }, { wch: 20 }, { wch: 14 }, { wch: 25 }, { wch: 25 }
  ];
  categories.flatMap((c) => c.fields).forEach(() => colWidths.push({ wch: 14 }));
  wsTemplate['!cols'] = colWidths;
  XLSX.utils.book_append_sheet(wb, wsTemplate, 'Lançamentos para Importar');

  XLSX.writeFile(wb, 'amboni_modelo_importacao_laboratorio.xlsx');
}

// -------------------------------------------------------------
// Smart Excel Parser for Bulk Laboratory Import
// -------------------------------------------------------------
export interface ParsedImportRow {
  date: string;
  time: string;
  categoryName: string;
  categoryId: string;
  lotNumber: string;
  shift: QualityRecord['shift'];
  productionLine: string;
  sampleOrigin: string;
  inspector: string;
  status: QualityRecord['status'];
  values: { [key: string]: string };
  counterSampleLocation?: string;
  notes?: string;
  isValid: boolean;
  errors: string[];
}

export async function parseLabExcelFile(
  file: File,
  categories: Category[]
): Promise<{ rows: ParsedImportRow[]; errors: string[] }> {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { cellDates: true });

  const firstSheetName = workbook.SheetNames.find((name) => !name.toLowerCase().includes('instru')) || workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const rawRows = XLSX.utils.sheet_to_json<any>(worksheet, { defval: '' });

  if (!rawRows || !rawRows.length) {
    return { rows: [], errors: ['A planilha está vazia ou a aba selecionada não contém linhas de dados.'] };
  }

  const catMapByName = new Map<string, Category>();
  categories.forEach((c) => catMapByName.set(c.name.toLowerCase().trim(), c));

  const parsedList: ParsedImportRow[] = [];
  const globalErrors: string[] = [];

  rawRows.forEach((r, idx) => {
    const rowErrors: string[] = [];
    const keys = Object.keys(r);

    // Normalize keys
    const findVal = (terms: string[]) => {
      const match = keys.find((k) => terms.some((t) => k.toLowerCase().trim().includes(t.toLowerCase())));
      return match ? String(r[match]).trim() : '';
    };

    // Extract Date
    let dateStr = findVal(['data', 'date', 'dia']);
    if (!dateStr) {
      dateStr = new Date().toISOString().slice(0, 10);
    } else if (dateStr.includes('/')) {
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        // DD/MM/YYYY -> YYYY-MM-DD
        dateStr = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }

    const timeStr = findVal(['hora', 'time', 'horario']) || new Date().toTimeString().slice(0, 5);

    // Extract Product / Category
    const prodVal = findVal(['produto', 'categoria', 'item', 'descri']);
    let category = catMapByName.get(prodVal.toLowerCase());
    if (!category) {
      // Try partial match
      category = categories.find((c) => c.name.toLowerCase().includes(prodVal.toLowerCase()) || prodVal.toLowerCase().includes(c.name.toLowerCase()));
    }

    if (!category) {
      rowErrors.push(`Produto "${prodVal || 'Vazio'}" não encontrado nas categorias cadastradas.`);
    }

    const lotNumber = findVal(['lote', 'carga', 'batch', 'amostra']) || `IMP-${Date.now().toString(36)}-${idx + 1}`;
    const productionLine = findVal(['linha', 'setor', 'line']) || 'Linha de Produção';
    const sampleOrigin = findVal(['origem', 'ponto', 'coleta']) || 'Laboratório';
    const inspector = findVal(['inspetor', 'analista', 'responsavel']) || 'Importador Excel';
    const notes = findVal(['obs', 'observa', 'coment', 'nota']);
    const counterSampleLocation = findVal(['contraprova', 'retencao', 'armario', 'gaveta']);

    // Status / Parecer
    const statusVal = findVal(['parecer', 'status', 'disposi', 'laudo']).toLowerCase();
    let status: QualityRecord['status'] = 'approved';
    if (statusVal.includes('reprov') || statusVal.includes('rejeit') || statusVal.includes('retid') || statusVal.includes('não')) {
      status = 'rejected';
    } else if (statusVal.includes('aten') || statusVal.includes('restrit') || statusVal.includes('alerta')) {
      status = 'warning';
    } else if (statusVal.includes('anali')) {
      status = 'analyzing';
    }

    // Shift
    const shiftVal = findVal(['turno', 'shift']).toLowerCase();
    let shift: QualityRecord['shift'] = '1º Turno (06h - 14h)';
    if (shiftVal.includes('2') || shiftVal.includes('segundo')) shift = '2º Turno (14h - 22h)';
    else if (shiftVal.includes('3') || shiftVal.includes('terceiro')) shift = '3º Turno (22h - 06h)';
    else if (shiftVal.includes('comercial')) shift = 'Comercial';

    // Parse indicator values
    const values: { [key: string]: string } = {};
    if (category) {
      (category.fields || []).forEach((field) => {
        const matchingKey = keys.find((k) => k.toLowerCase().trim() === field.toLowerCase().trim() || k.toLowerCase().includes(field.toLowerCase()));
        if (matchingKey && r[matchingKey] !== '') {
          values[field] = String(r[matchingKey]).trim().replace('.', ',');
        }
      });
    }

    // Check if at least one indicator exists
    if (Object.keys(values).length === 0 && category) {
      rowErrors.push('Nenhum valor de indicador foi identificado para esta linha.');
    }

    parsedList.push({
      date: dateStr,
      time: timeStr,
      categoryName: category?.name || prodVal || 'Não identificada',
      categoryId: category?.id || '',
      lotNumber,
      shift,
      productionLine,
      sampleOrigin,
      inspector,
      status,
      values,
      counterSampleLocation,
      notes,
      isValid: rowErrors.length === 0,
      errors: rowErrors
    });
  });

  return { rows: parsedList, errors: globalErrors };
}
