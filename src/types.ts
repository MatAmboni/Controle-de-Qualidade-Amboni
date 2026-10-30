export interface IndicatorSpec {
  name: string;
  unit?: string;
  min?: number;
  max?: number;
  target?: number;
}

export interface Category {
  id: string;
  name: string;
  fields: string[]; // backward compatible list of indicator names
  specs?: IndicatorSpec[]; // technical tolerance limits
  description?: string;
}

export type RecordStatus = 'approved' | 'warning' | 'rejected' | 'analyzing';

export interface QualityRecord {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  categoryId: string;
  values: { [indicatorName: string]: string };
  lotNumber?: string;
  shift?: '1º Turno (06h - 14h)' | '2º Turno (14h - 22h)' | '3º Turno (22h - 06h)' | 'Comercial';
  productionLine?: string; // e.g. "Linha A - Parboilizado", "Linha B", "Tombador", "Silos"
  sampleOrigin?: string; // e.g. "Bica Corrida", "Empacotadora 1", "Recepção Caminhão"
  inspector?: string; // Name of person who registered
  status?: RecordStatus;
  notes?: string;
  // Laboratory specific extensions
  analysisType?: 'rotina' | 'recebimento' | 'reteste' | 'contraprova';
  counterSampleLocation?: string; // e.g. "Armário Lab - Gaveta B3"
  counterSampleExpiry?: string; // Date until sample must be kept
  rootCause?: string; // If rejected/warning
  correctiveAction?: string; // Action taken by lab or production
  createdAt: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface ExcelExportOptions {
  dateRange: 'all' | 'today' | '7days' | '30days' | 'custom';
  startDate?: string;
  endDate?: string;
  categoryId?: string; // specific or all
  status?: string; // approved, warning, rejected or all
  includeStatisticalSheet: boolean;
  includeWideMatrix: boolean;
  includeNonConformitySheet: boolean;
  includeCounterSamplesSheet: boolean;
  fileName?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  role: 'inspector' | 'coordinator' | 'manager' | 'operator';
  unit: string;
  phone?: string;
}

export type WhatsAppTemplateType = 'executive' | 'consolidated_today' | 'deviation_alert' | 'compact' | 'shift_report';

export interface WhatsAppConfig {
  template: WhatsAppTemplateType;
  includeInspector: boolean;
  includeTimestamp: boolean;
  includeLot: boolean;
  includeTolerances: boolean;
  includeNotes: boolean;
  includeHeaderBanner: boolean;
  targetPhone?: string;
}

export interface ActiveUserPresence {
  id: string;
  name: string;
  role: string;
  lastActive: number;
}
