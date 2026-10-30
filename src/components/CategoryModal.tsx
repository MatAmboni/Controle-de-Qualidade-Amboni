import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Check, Sparkles, Sliders } from 'lucide-react';
import { Category, IndicatorSpec } from '../types';

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (cat: Partial<Category>) => Promise<void>;
  editingCategory: Category | null;
}

interface FieldRow {
  name: string;
  unit: string;
  min: string;
  max: string;
  target: string;
}

export const CategoryModal: React.FC<CategoryModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingCategory
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [rows, setRows] = useState<FieldRow[]>([
    { name: 'Umidade', unit: '%', min: '11.5', max: '13.0', target: '12.5' },
    { name: 'Polimento', unit: 'graus', min: '30', max: '40', target: '35' },
    { name: 'Quebra', unit: '%', min: '0', max: '5.0', target: '3.0' }
  ]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editingCategory) {
      setName(editingCategory.name);
      setDescription(editingCategory.description || '');

      const initialRows: FieldRow[] = (editingCategory.fields || []).map((fieldName) => {
        const spec = editingCategory.specs?.find((s) => s.name === fieldName);
        return {
          name: fieldName,
          unit: spec?.unit || '%',
          min: spec?.min !== undefined ? String(spec.min) : '',
          max: spec?.max !== undefined ? String(spec.max) : '',
          target: spec?.target !== undefined ? String(spec.target) : ''
        };
      });

      setRows(
        initialRows.length > 0
          ? initialRows
          : [{ name: '', unit: '%', min: '', max: '', target: '' }]
      );
    } else {
      setName('');
      setDescription('');
      setRows([
        { name: 'Umidade', unit: '%', min: '11.5', max: '13.0', target: '12.5' },
        { name: 'Polimento', unit: 'graus', min: '30', max: '40', target: '35' },
        { name: 'Quebra', unit: '%', min: '0', max: '5.0', target: '3.0' }
      ]);
    }
  }, [editingCategory, isOpen]);

  if (!isOpen) return null;

  const handleAddRow = () => {
    setRows([...rows, { name: '', unit: '%', min: '', max: '', target: '' }]);
  };

  const handleRemoveRow = (idx: number) => {
    setRows(rows.filter((_, i) => i !== idx));
  };

  const handleRowChange = (idx: number, key: keyof FieldRow, val: string) => {
    const next = [...rows];
    next[idx][key] = val;
    setRows(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) return;

    const validRows = rows.filter((r) => r.name.trim().length > 0);
    if (validRows.length === 0) {
      alert('Adicione pelo menos um indicador para este produto.');
      return;
    }

    const fields = validRows.map((r) => r.name.trim());
    const specs: IndicatorSpec[] = validRows.map((r) => ({
      name: r.name.trim(),
      unit: r.unit.trim() || undefined,
      min: r.min !== '' ? parseFloat(r.min.replace(',', '.')) : undefined,
      max: r.max !== '' ? parseFloat(r.max.replace(',', '.')) : undefined,
      target: r.target !== '' ? parseFloat(r.target.replace(',', '.')) : undefined
    }));

    setSaving(true);
    try {
      await onSave({
        id: editingCategory ? editingCategory.id : undefined,
        name: cleanName,
        description: description.trim() || undefined,
        fields,
        specs
      });
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
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-800 flex items-center justify-center text-emerald-300">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">
                {editingCategory ? 'Editar Categoria de Produto' : 'Nova Categoria de Produto'}
              </h2>
              <p className="text-xs text-emerald-200">
                Defina o produto e seus parâmetros e tolerâncias técnicas
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 mb-1 block">
                Nome do Produto / Categoria *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Arroz Tio Alemão Parbo - 5kg"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full text-xs px-3 py-2.5 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold text-slate-800"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 mb-1 block">
                Descrição / Aplicação Industrial
              </label>
              <input
                type="text"
                placeholder="Ex: Linha nobre para empacotamento 5kg"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full text-xs px-3 py-2.5 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Indicators list with tolerance specs */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div>
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                  Indicadores & Tolerâncias Técnicas
                </label>
                <p className="text-[11px] text-slate-500">
                  Os limites mínimo e máximo ativam alertas automáticos e avisos no WhatsApp
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddRow}
                className="px-3 py-1.5 text-xs font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-300 rounded-lg flex items-center gap-1.5 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Adicionar Indicador
              </button>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50">
              <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-slate-100 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <div className="col-span-4">Indicador</div>
                <div className="col-span-2">Unidade</div>
                <div className="col-span-2">Mínimo</div>
                <div className="col-span-2">Máximo</div>
                <div className="col-span-1">Alvo</div>
                <div className="col-span-1 text-right">Ação</div>
              </div>

              <div className="divide-y divide-slate-200 p-2 space-y-2">
                {rows.map((row, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-white p-2 rounded-lg border border-slate-200">
                    <div className="col-span-4">
                      <input
                        type="text"
                        placeholder="Ex: Umidade"
                        value={row.name}
                        onChange={(e) => handleRowChange(idx, 'name', e.target.value)}
                        className="w-full text-xs px-2 py-1.5 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
                        required
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        type="text"
                        placeholder="%, graus"
                        value={row.unit}
                        onChange={(e) => handleRowChange(idx, 'unit', e.target.value)}
                        className="w-full text-xs px-2 py-1.5 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        type="text"
                        inputMode="decimal"
                        placeholder="Ex: 11.5"
                        value={row.min}
                        onChange={(e) => handleRowChange(idx, 'min', e.target.value)}
                        className="w-full text-xs px-2 py-1.5 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        type="text"
                        inputMode="decimal"
                        placeholder="Ex: 13.0"
                        value={row.max}
                        onChange={(e) => handleRowChange(idx, 'max', e.target.value)}
                        className="w-full text-xs px-2 py-1.5 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                    <div className="col-span-1">
                      <input
                        type="text"
                        inputMode="decimal"
                        placeholder="Alvo"
                        value={row.target}
                        onChange={(e) => handleRowChange(idx, 'target', e.target.value)}
                        className="w-full text-xs px-2 py-1.5 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                    <div className="col-span-1 text-right">
                      <button
                        type="button"
                        onClick={() => handleRemoveRow(idx)}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded-md hover:bg-rose-50 transition-colors"
                        title="Remover este indicador"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
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
              className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-xs transition-all disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              {saving ? 'Salvando...' : editingCategory ? 'Atualizar Categoria' : 'Salvar Categoria'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
