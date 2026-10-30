import { Category, QualityRecord, WhatsAppConfig } from '../types';

export function fmtDateBR(dateStr?: string): string {
  if (!dateStr) return '—';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

export function parseNumBR(valStr?: string): number | null {
  if (!valStr) return null;
  const sanitized = valStr.toString().trim().replace(',', '.').replace(/[^\d.-]/g, '');
  const n = parseFloat(sanitized);
  return isNaN(n) ? null : n;
}

export function evaluateIndicator(
  valueStr: string | undefined,
  spec: { min?: number; max?: number; target?: number; unit?: string } | undefined
): { status: 'ok' | 'warning' | 'error'; label: string; textDiff?: string } {
  if (!spec || (!spec.min && !spec.max && !spec.target)) {
    return { status: 'ok', label: '✅' };
  }
  const num = parseNumBR(valueStr);
  if (num === null) return { status: 'ok', label: 'ℹ️' };

  const unit = spec.unit || '';
  if (spec.max !== undefined && num > spec.max) {
    return {
      status: 'error',
      label: '🚨 Acima do Máx',
      textDiff: `(Máx: ${spec.max}${unit})`
    };
  }
  if (spec.min !== undefined && num < spec.min) {
    return {
      status: 'error',
      label: '🚨 Abaixo do Mín',
      textDiff: `(Mín: ${spec.min}${unit})`
    };
  }
  // If close to max or min within 10%
  if (spec.max !== undefined && num >= spec.max * 0.95) {
    return {
      status: 'warning',
      label: '⚠️ Próximo ao Limite',
      textDiff: `(Máx: ${spec.max}${unit})`
    };
  }
  return { status: 'ok', label: '✅ Conforme' };
}

export function buildWhatsAppMessage(
  records: QualityRecord[],
  categories: Category[],
  config: WhatsAppConfig
): string {
  if (!records.length) return 'Nenhum registro selecionado.';

  const catMap = new Map<string, Category>();
  categories.forEach((c) => catMap.set(c.id, c));

  switch (config.template) {
    case 'consolidated_today':
      return buildConsolidatedMessage(records, catMap, config);
    case 'deviation_alert':
      return buildDeviationAlertMessage(records, catMap, config);
    case 'shift_report':
      return buildShiftReportMessage(records, catMap, config);
    case 'compact':
      return buildCompactMessage(records, catMap, config);
    case 'executive':
    default:
      return buildExecutiveMessage(records, catMap, config);
  }
}

// 1. Executive / Full Official Amboni Report
function buildExecutiveMessage(
  records: QualityRecord[],
  catMap: Map<string, Category>,
  config: WhatsAppConfig
): string {
  const lines: string[] = [];
  const first = records[0];

  if (config.includeHeaderBanner) {
    lines.push('🌾 *AMBONI ALIMENTOS*');
    lines.push('📋 *BOLETIM DE CONTROLE DE QUALIDADE*');
    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  }

  // Metadata
  const dateStr = fmtDateBR(first.date);
  lines.push(`📅 *Data:* ${dateStr}${config.includeTimestamp && first.time ? `  ⏰ *Hora:* ${first.time}` : ''}`);
  
  if (config.includeInspector && first.inspector) {
    lines.push(`👤 *Responsável:* ${first.inspector}`);
  }
  if (first.shift) {
    lines.push(`⏱️ *Turno:* ${first.shift}`);
  }
  if (first.productionLine) {
    lines.push(`🏭 *Linha / Unidade:* ${first.productionLine}`);
  }
  if (config.includeLot && first.lotNumber) {
    lines.push(`🏷️ *Lote / Carga:* ${first.lotNumber}`);
  }
  if (first.sampleOrigin) {
    lines.push(`📍 *Ponto de Amostragem:* ${first.sampleOrigin}`);
  }

  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Products and Indicators
  records.forEach((rec, idx) => {
    const cat = catMap.get(rec.categoryId);
    const catName = cat?.name || 'Produto';

    if (records.length > 1) {
      lines.push(`\n📦 *[${idx + 1}/${records.length}] ${catName.toUpperCase()}*`);
      if (rec.lotNumber && rec.lotNumber !== first.lotNumber) {
        lines.push(`🏷️ *Lote:* ${rec.lotNumber} | ⏰ ${rec.time || ''}`);
      }
    } else {
      lines.push(`\n📦 *PRODUTO:* ${catName.toUpperCase()}`);
    }

    lines.push('📊 *PARÂMETROS ANALISADOS:*');
    const entries = Object.entries(rec.values || {});

    if (entries.length === 0) {
      lines.push('  _(Nenhum indicador registrado)_');
    } else {
      entries.forEach(([key, val]) => {
        const spec = cat?.specs?.find((s) => s.name === key);
        const evalRes = evaluateIndicator(val, spec);
        let line = `  • *${key}:* ${val}${spec?.unit || ''}`;
        if (config.includeTolerances && spec && (spec.max || spec.min)) {
          line += ` ${evalRes.label} ${evalRes.textDiff || ''}`;
        } else {
          line += ` ${evalRes.label}`;
        }
        lines.push(line);
      });
    }

    // Status / Disposição
    const statusMap = {
      approved: '🟢 *CONFORME / LIBERADO*',
      warning: '🟡 *ATENÇÃO - OBSERVAR TENDÊNCIA*',
      rejected: '🔴 *NÃO CONFORME / LOTE RETIDO*',
      analyzing: '🔵 *EM ANÁLISE / AGUARDANDO LAUDO*'
    };
    const statusText = rec.status ? statusMap[rec.status] : '🟢 *CONFORME*';
    lines.push(`⚖️ *Parecer Técnico:* ${statusText}`);

    if (config.includeNotes && rec.notes) {
      lines.push(`📝 *Observações:* ${rec.notes}`);
    }
  });

  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  lines.push('_Sistema ERP de Qualidade Amboni Alimentos_');
  return lines.join('\n');
}

// 2. Consolidated Daily Summary
function buildConsolidatedMessage(
  records: QualityRecord[],
  catMap: Map<string, Category>,
  config: WhatsAppConfig
): string {
  const lines: string[] = [];
  const todayStr = fmtDateBR(records[0]?.date || new Date().toISOString().slice(0, 10));

  lines.push('🌾 *AMBONI ALIMENTOS*');
  lines.push('📊 *RESUMO CONSOLIDADO DA QUALIDADE*');
  lines.push(`📅 *Data de Referência:* ${todayStr}`);
  lines.push(`📝 *Total de Lançamentos:* ${records.length}`);

  const approved = records.filter((r) => !r.status || r.status === 'approved').length;
  const warnings = records.filter((r) => r.status === 'warning').length;
  const rejected = records.filter((r) => r.status === 'rejected').length;

  lines.push(`📈 *Conformidade Geral:* ✅ ${approved} Aprovados | ⚠️ ${warnings} Alertas | 🚨 ${rejected} Desvios`);
  lines.push('──────────────────────────────');

  // Group by category
  const groups = new Map<string, QualityRecord[]>();
  records.forEach((r) => {
    const list = groups.get(r.categoryId) || [];
    list.push(r);
    groups.set(r.categoryId, list);
  });

  groups.forEach((recs, catId) => {
    const cat = catMap.get(catId);
    lines.push(`\n🏭 *${(cat?.name || 'Produto').toUpperCase()}* (${recs.length} amostras)`);

    // Calculate averages for numeric indicators
    const fieldValues: { [key: string]: number[] } = {};
    recs.forEach((r) => {
      Object.entries(r.values || {}).forEach(([k, v]) => {
        const num = parseNumBR(v);
        if (num !== null) {
          if (!fieldValues[k]) fieldValues[k] = [];
          fieldValues[k].push(num);
        }
      });
    });

    Object.entries(fieldValues).forEach(([field, nums]) => {
      if (nums.length > 0) {
        const avg = nums.reduce((a, b) => a + b, 0) / nums.length;
        const min = Math.min(...nums);
        const max = Math.max(...nums);
        const spec = cat?.specs?.find((s) => s.name === field);
        const unit = spec?.unit || '';
        lines.push(
          `  • *${field}:* Méd ${avg.toFixed(1).replace('.', ',')}${unit} ` +
          `(Mín: ${min.toFixed(1).replace('.', ',')} | Máx: ${max.toFixed(1).replace('.', ',')})`
        );
      }
    });

    // Last registered batch
    const lastRec = recs[recs.length - 1];
    if (lastRec?.time) {
      lines.push(`  ⏰ _Última análise: ${lastRec.time}_`);
    }
  });

  lines.push('\n──────────────────────────────');
  lines.push('_Relatório consolidado gerado automaticamente via ERP Amboni_');
  return lines.join('\n');
}

// 3. Urgent Deviation Alert
function buildDeviationAlertMessage(
  records: QualityRecord[],
  catMap: Map<string, Category>,
  config: WhatsAppConfig
): string {
  const lines: string[] = [];
  const rec = records[0];
  const cat = catMap.get(rec.categoryId);

  lines.push('🚨 *ALERTA URGENTE DE DESVIO - QUALIDADE* 🚨');
  lines.push('🏭 *AMBONI ALIMENTOS - NOTIFICAÇÃO IMEDIATA*');
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  lines.push(`📅 *Data:* ${fmtDateBR(rec.date)} | ⏰ *Hora:* ${rec.time || '—'}`);
  lines.push(`📦 *Produto:* *${cat?.name || 'Produto Não Identificado'}*`);
  if (rec.lotNumber) lines.push(`🏷️ *Lote / Silo:* ${rec.lotNumber}`);
  if (rec.productionLine) lines.push(`🏭 *Linha Afetada:* ${rec.productionLine}`);
  if (rec.inspector) lines.push(`👤 *Inspetor Notificante:* ${rec.inspector}`);
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  lines.push('⚠️ *DESVIO IDENTIFICADO NOS PARÂMETROS:*');
  Object.entries(rec.values || {}).forEach(([k, v]) => {
    const spec = cat?.specs?.find((s) => s.name === k);
    const evalRes = evaluateIndicator(v, spec);
    if (evalRes.status !== 'ok') {
      lines.push(`  ❌ *${k}:* ${v}${spec?.unit || ''} ➔ ${evalRes.label} ${evalRes.textDiff || ''}`);
    } else {
      lines.push(`  • ${k}: ${v}${spec?.unit || ''} (OK)`);
    }
  });

  lines.push('\n🛑 *STATUS:* 🔴 *LOTE RETIDO / BLOQUEADO TEMPORARIAMENTE*');
  if (rec.notes) {
    lines.push(`📝 *Ação Recomendada / Observação:* ${rec.notes}`);
  } else {
    lines.push('📝 *Ação Recomendada:* Favor verificar regulagem das máquinas e reter amostragem para contraprova.');
  }

  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  lines.push('_Por favor confirmar o recebimento e providências cabíveis._');
  return lines.join('\n');
}

// 4. Compact Fast Format
function buildCompactMessage(
  records: QualityRecord[],
  catMap: Map<string, Category>,
  _config: WhatsAppConfig
): string {
  const lines: string[] = [];
  lines.push(`🌾 *Amboni Alimentos CQ* (${fmtDateBR(records[0]?.date)})`);

  records.forEach((rec) => {
    const cat = catMap.get(rec.categoryId);
    const catShort = (cat?.name || 'Prod').replace('Arroz ', '').replace(' - 5kg', '');
    const vals = Object.entries(rec.values || {})
      .map(([k, v]) => `${k.slice(0, 4)}: ${v}`)
      .join(' | ');

    const icon = rec.status === 'rejected' ? '🔴' : rec.status === 'warning' ? '🟡' : '✅';
    lines.push(`• *${catShort}* [${rec.time || ''}]: ${vals} ${icon}`);
  });

  return lines.join('\n');
}

// 5. Shift Report
function buildShiftReportMessage(
  records: QualityRecord[],
  catMap: Map<string, Category>,
  config: WhatsAppConfig
): string {
  const shift = records[0]?.shift || '1º Turno';
  const dateStr = fmtDateBR(records[0]?.date);
  const lines: string[] = [];

  lines.push('🌾 *AMBONI ALIMENTOS*');
  lines.push(`📋 *BOLETIM DE FECHAMENTO DE TURNO - ${shift.toUpperCase()}*`);
  lines.push(`📅 *Data:* ${dateStr} | ⏱️ *Amostragens no Turno:* ${records.length}`);
  lines.push('──────────────────────────────');

  records.forEach((r, i) => {
    const cat = catMap.get(r.categoryId);
    const time = r.time ? `[${r.time}]` : '';
    const vals = Object.entries(r.values || {})
      .map(([k, v]) => `${k}: ${v}`)
      .join(' | ');
    const status = r.status === 'rejected' ? '❌ RETIDO' : r.status === 'warning' ? '⚠️ ATENÇÃO' : '✅ LIBERADO';
    lines.push(`${i + 1}. ${time} *${cat?.name || 'Prod'}* (${vals}) ➔ ${status}`);
  });

  lines.push('──────────────────────────────');
  if (config.includeInspector && records[0]?.inspector) {
    lines.push(`👤 *Responsável pelo Turno:* ${records[0].inspector}`);
  }
  lines.push('_Fechamento operacional registrado com sucesso._');
  return lines.join('\n');
}

export function openWhatsAppLink(text: string, phone?: string): void {
  const encoded = encodeURIComponent(text);
  let cleanPhone = (phone || '').replace(/\D/g, '');
  if (cleanPhone && !cleanPhone.startsWith('55') && cleanPhone.length <= 11) {
    cleanPhone = '55' + cleanPhone;
  }
  const url = cleanPhone
    ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encoded}`
    : `https://api.whatsapp.com/send?text=${encoded}`;

  window.open(url, '_blank');
}
