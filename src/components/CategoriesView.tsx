import React from 'react';
import { Sliders, Plus, Edit2, Trash2, Layers, CheckCircle2 } from 'lucide-react';
import { Category, QualityRecord } from '../types';

interface CategoriesViewProps {
  categories: Category[];
  records: QualityRecord[];
  onNewCategory: () => void;
  onEditCategory: (category: Category) => void;
  onDeleteCategory: (id: string) => void;
}

export const CategoriesView: React.FC<CategoriesViewProps> = ({
  categories,
  records,
  onNewCategory,
  onEditCategory,
  onDeleteCategory
}) => {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-extrabold text-slate-900">
            Produtos & Especificações de Qualidade
          </h2>
          <p className="text-xs text-slate-500">
            Configure cada produto da Amboni Alimentos e defina as tolerâncias técnicas (mínimo, máximo e alvo) para controle automático.
          </p>
        </div>

        <button
          onClick={onNewCategory}
          className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nova Categoria / Produto
        </button>
      </div>

      {/* Grid of Categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {categories.map((cat) => {
          const catRecords = records.filter((r) => r.categoryId === cat.id);
          const approvedCount = catRecords.filter((r) => !r.status || r.status === 'approved').length;

          return (
            <div
              key={cat.id}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-emerald-300 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900">{cat.name}</h3>
                    {cat.description && (
                      <p className="text-xs text-slate-500 mt-0.5">{cat.description}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onEditCategory(cat)}
                      className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                      title="Editar categoria e indicadores"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDeleteCategory(cat.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Excluir categoria"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Indicators & Specs */}
                <div className="mt-3">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Parâmetros Monitorados ({cat.fields?.length || 0})
                  </span>
                  <div className="space-y-1.5">
                    {cat.fields?.map((field) => {
                      const spec = cat.specs?.find((s) => s.name === field);
                      return (
                        <div
                          key={field}
                          className="flex items-center justify-between px-2.5 py-1.5 bg-slate-50 border border-slate-200/80 rounded-lg text-xs"
                        >
                          <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            {field}
                          </span>
                          <span className="text-[11px] text-slate-500 font-medium">
                            {spec && (spec.min !== undefined || spec.max !== undefined) ? (
                              <>
                                Faixa: <b>{spec.min ?? '—'}</b> a <b>{spec.max ?? '—'}</b>
                                {spec.unit ? ` ${spec.unit}` : ''}
                                {spec.target !== undefined && (
                                  <span className="ml-2 text-emerald-700 font-bold">
                                    (Alvo: {spec.target})
                                  </span>
                                )}
                              </>
                            ) : (
                              <span className="text-slate-400">Padrão livre</span>
                            )}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Stats Footer */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-slate-400" />
                  {catRecords.length} lançamentos no histórico
                </span>
                <span className="text-emerald-700 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {approvedCount} aprovados
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
