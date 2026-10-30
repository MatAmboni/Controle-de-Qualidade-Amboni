import React, { useState } from 'react';
import { UserCheck, X, Check, Building2, User } from 'lucide-react';
import { apiSync } from '../services/api';

interface UserPresenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProfile: { name: string; role: string; unit: string };
  onUpdate: (profile: { name: string; role: string; unit: string }) => void;
}

export const UserPresenceModal: React.FC<UserPresenceModalProps> = ({
  isOpen,
  onClose,
  currentProfile,
  onUpdate
}) => {
  const [name, setName] = useState(currentProfile.name);
  const [role, setRole] = useState(currentProfile.role);
  const [unit, setUnit] = useState(currentProfile.unit);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = {
      name: name.trim() || 'Inspetor',
      role: role.trim() || 'Controle de Qualidade',
      unit: unit.trim() || 'Matriz'
    };
    apiSync.setUserProfile(updated);
    onUpdate(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="bg-emerald-900 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <UserCheck className="w-5 h-5 text-emerald-300" />
            <div>
              <h3 className="text-sm font-bold">Identificação do Operador / Inspetor</h3>
              <p className="text-[11px] text-emerald-200">
                Visível para outros colaboradores sincronizados em tempo real
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-emerald-200 hover:text-white p-1 rounded-md">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          <div>
            <label className="text-slate-700 font-bold block mb-1 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-500" />
              Seu Nome Completo
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Carlos Eduardo Silva"
              className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
            />
          </div>

          <div>
            <label className="text-slate-700 font-bold block mb-1">Cargo / Função</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="Inspetor de Qualidade">Inspetor de Qualidade</option>
              <option value="Analista de Laboratório">Analista de Laboratório</option>
              <option value="Encarregado de Turno">Encarregado de Turno</option>
              <option value="Operador de Linha">Operador de Linha</option>
              <option value="Supervisor de Produção">Supervisor de Produção</option>
              <option value="Gerente Industrial">Gerente Industrial</option>
            </select>
          </div>

          <div>
            <label className="text-slate-700 font-bold block mb-1 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-slate-500" />
              Unidade / Setor Amboni
            </label>
            <input
              type="text"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="Ex: Unidade Matriz - SC"
              className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <Check className="w-4 h-4" /> Salvar Identificação
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
