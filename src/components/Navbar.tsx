import React, { useState } from 'react';
import {
  Wheat,
  LayoutDashboard,
  ClipboardList,
  Sliders,
  Plus,
  MessageSquare,
  FileSpreadsheet,
  Download,
  Upload,
  Users,
  Wifi,
  WifiOff,
  RefreshCw,
  User,
  ChevronDown,
  FlaskConical
} from 'lucide-react';
import { PresenceUser, SyncStatus } from '../services/api';

interface NavbarProps {
  currentView: 'dashboard' | 'laboratorio' | 'lancamentos' | 'categorias';
  onNavigate: (view: 'dashboard' | 'laboratorio' | 'lancamentos' | 'categorias') => void;
  onNewRecord: () => void;
  onOpenWhatsApp: () => void;
  onExportExcel: () => void;
  onImportExcel: () => void;
  onExportBackup: () => void;
  onImportBackup: () => void;
  syncStatus: SyncStatus;
  activeUsers: PresenceUser[];
  userProfile: { name: string; role: string; unit: string };
  onOpenProfile: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onNavigate,
  onNewRecord,
  onOpenWhatsApp,
  onExportExcel,
  onImportExcel,
  onExportBackup,
  onImportBackup,
  syncStatus,
  activeUsers,
  userProfile,
  onOpenProfile
}) => {
  const [showUsersDropdown, setShowUsersDropdown] = useState(false);

  return (
    <header className="bg-[#0f2418] text-white border-b border-emerald-900/60 sticky top-0 z-30 shadow-md">
      {/* Top Banner with Brand and Multi-User Realtime Presence */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-white font-black text-lg">
            <Wheat className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base tracking-tight text-white">AMBONI ALIMENTOS</span>
              <span className="text-[10px] bg-emerald-700/60 border border-emerald-600/40 text-emerald-200 font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-wider">
                ERP CQ
              </span>
            </div>
            <p className="text-[11px] text-emerald-300 font-medium leading-none mt-0.5">
              Controle de Qualidade & Sincronização em Tempo Real
            </p>
          </div>
        </div>

        {/* Center/Right: Real-time Multi-User Sync Status & Active Presence */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Sync Status Badge */}
          <div className="relative">
            <button
              onClick={() => setShowUsersDropdown(!showUsersDropdown)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                syncStatus === 'connected'
                  ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/80'
                  : syncStatus === 'syncing'
                  ? 'bg-amber-950/80 border-amber-500/40 text-amber-300'
                  : 'bg-rose-950/80 border-rose-500/40 text-rose-300'
              }`}
              title="Clique para ver colaboradores conectados em tempo real"
            >
              {syncStatus === 'connected' ? (
                <>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <Wifi className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Tempo Real</span>
                  <span className="bg-emerald-800/80 px-1.5 py-0.2 rounded-full text-[10px] text-white">
                    {activeUsers.length || 1} online
                  </span>
                  <ChevronDown className="w-3 h-3 opacity-60" />
                </>
              ) : syncStatus === 'syncing' ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Sincronizando...</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5" />
                  <span>Modo Offline (Salvo Local)</span>
                </>
              )}
            </button>

            {/* Active Users Dropdown */}
            {showUsersDropdown && (
              <div className="absolute right-0 mt-2 w-64 bg-slate-900 border border-emerald-800 rounded-xl shadow-2xl p-3 z-50 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-emerald-800/80 mb-2">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-emerald-400" />
                    Colaboradores Conectados
                  </span>
                  <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950 px-1.5 py-0.5 rounded-full">
                    {activeUsers.length || 1} ativo(s)
                  </span>
                </div>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  <div className="flex items-center gap-2 p-1.5 rounded-lg bg-emerald-900/40 border border-emerald-700/50">
                    <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                    <div className="flex-1 truncate">
                      <div className="font-bold text-white truncate">{userProfile.name} (Você)</div>
                      <div className="text-[10px] text-emerald-300 truncate">{userProfile.role}</div>
                    </div>
                  </div>
                  {activeUsers
                    .filter((u) => u.name !== userProfile.name)
                    .map((user, idx) => (
                      <div key={idx} className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-800">
                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                        <div className="flex-1 truncate">
                          <div className="font-bold text-slate-200 truncate">{user.name}</div>
                          <div className="text-[10px] text-slate-400 truncate">{user.role}</div>
                        </div>
                      </div>
                    ))}
                </div>
                <p className="text-[10px] text-slate-400 mt-2 pt-2 border-t border-slate-800 text-center">
                  Qualquer novo lançamento é sincronizado instantaneamente com todos.
                </p>
              </div>
            )}
          </div>

          {/* Current User Chip */}
          <button
            onClick={onOpenProfile}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-900/50 hover:bg-emerald-900 border border-emerald-800/80 text-xs text-emerald-100 transition-colors"
            title="Alterar identificação do inspetor"
          >
            <User className="w-3.5 h-3.5 text-emerald-300" />
            <span className="font-semibold max-w-[110px] truncate hidden md:inline">{userProfile.name}</span>
          </button>
        </div>
      </div>

      {/* Main Bar with Navigation Tabs and Quick Actions */}
      <div className="bg-[#142e20] border-t border-emerald-900/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-3">
          {/* Tabs */}
          <nav className="flex items-center gap-1">
            <button
              onClick={() => onNavigate('dashboard')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                currentView === 'dashboard'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-emerald-200 hover:text-white hover:bg-emerald-800/50'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => onNavigate('laboratorio')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all relative ${
                currentView === 'laboratorio'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-emerald-200 hover:text-white hover:bg-emerald-800/50'
              }`}
            >
              <FlaskConical className="w-4 h-4 text-emerald-300" />
              <span>Central de Laboratório & CEP</span>
              <span className="text-[9px] bg-emerald-400 text-emerald-950 font-black px-1.5 py-0.2 rounded-full uppercase">
                CEP
              </span>
            </button>

            <button
              onClick={() => onNavigate('lancamentos')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                currentView === 'lancamentos'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-emerald-200 hover:text-white hover:bg-emerald-800/50'
              }`}
            >
              <ClipboardList className="w-4 h-4" />
              <span>Lançamentos</span>
            </button>

            <button
              onClick={() => onNavigate('categorias')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                currentView === 'categorias'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-emerald-200 hover:text-white hover:bg-emerald-800/50'
              }`}
            >
              <Sliders className="w-4 h-4" />
              <span>Produtos & Tolerâncias</span>
            </button>
          </nav>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={onOpenWhatsApp}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-800/70 hover:bg-emerald-700 text-emerald-100 hover:text-white text-xs font-bold border border-emerald-600/50 transition-colors shadow-xs"
              title="Gerar boletim e enviar para o WhatsApp"
            >
              <MessageSquare className="w-3.5 h-3.5 text-emerald-300" />
              <span>WhatsApp</span>
            </button>

            <button
              onClick={onImportExcel}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-900/60 hover:bg-emerald-800 text-emerald-200 hover:text-white text-xs font-semibold border border-emerald-700/60 transition-colors"
              title="Importar planilhas laboratoriais Excel (.xlsx ou .csv)"
            >
              <Upload className="w-3.5 h-3.5 text-emerald-300" />
              <span className="hidden sm:inline">Importar Excel</span>
            </button>

            <button
              onClick={onExportExcel}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-900/60 hover:bg-emerald-800 text-emerald-200 hover:text-white text-xs font-semibold border border-emerald-700/60 transition-colors"
              title="Exportar planilha Excel completa com abas analíticas, estatísticas e RNC"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-300" />
              <span className="hidden sm:inline">Exportar Excel</span>
            </button>

            <div className="hidden lg:flex items-center gap-1">
              <button
                onClick={onExportBackup}
                className="p-1.5 rounded-lg bg-emerald-900/40 hover:bg-emerald-800 text-emerald-300 hover:text-white transition-colors"
                title="Fazer Backup JSON"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={onImportBackup}
                className="p-1.5 rounded-lg bg-emerald-900/40 hover:bg-emerald-800 text-emerald-300 hover:text-white transition-colors"
                title="Restaurar Backup JSON"
              >
                <Upload className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              onClick={onNewRecord}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-98 text-emerald-950 text-xs font-black transition-all shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Lançamento</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
