import React from 'react';
import { Users, QrCode, ScanLine, ShieldCheck, LogOut, X, Home, Settings, PanelLeft } from 'lucide-react';
import { User } from '../types';

interface SidebarProps {
  user: User;
  isOpen: boolean;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onLogout: () => void;
  onToggle: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ user, isOpen, activeTab, onTabChange, onLogout, onToggle }) => {
  // Dynamic labels based on Role
  const residentsLabel = user.role === 'B' ? 'Mi Familia' : 'Directorio / Búsqueda';
  
  const menuItems = [
    { id: 'dashboard', label: 'Inicio', icon: Home, roles: ['X', 'A', 'B'] },
    { id: 'users', label: residentsLabel, icon: Users, roles: ['X', 'A', 'B'] },
    { id: 'generate-qr', label: 'Generar Invitación', icon: QrCode, roles: ['X', 'B'] }, // Residents and Admins generate
    { id: 'validate-qr', label: 'Portería / Escáner', icon: ScanLine, roles: ['X', 'A'] }, // Security checks
    { id: 'profile', label: user.role === 'X' ? 'Usuarios / Perfil' : 'Mi Perfil', icon: Settings, roles: ['X', 'A', 'B'] },
  ];

  return (
    <aside 
      className={`
        bg-blue-900 text-white flex flex-col transition-all duration-300 ease-in-out
        ${isOpen ? 'w-64 translate-x-0' : 'w-0 -translate-x-full opacity-0 overflow-hidden'}
        fixed md:relative z-20 h-full border-r border-blue-800
      `}
    >
      <div className="p-6 flex items-center gap-3 border-b border-blue-800">
        <button 
          onClick={onToggle}
          className="text-blue-300 hover:text-white transition-colors p-1 rounded hover:bg-blue-800"
          title="Cerrar menú"
        >
          <PanelLeft size={24} />
        </button>
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-8 h-8 text-blue-400" />
          <div>
            <h1 className="font-bold text-xl tracking-tight">MiVilla</h1>
            <p className="text-xs text-blue-300">Tenant: {user.tenantId}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {menuItems.filter(item => item.roles.includes(user.role)).map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`
                w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors
                ${isActive ? 'bg-blue-700 text-white shadow-md' : 'text-blue-100 hover:bg-blue-800 hover:text-white'}
              `}
            >
              <Icon size={20} />
              <span className="font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-blue-800">
        <div className="flex items-center gap-3 mb-4 px-2">
          <img src={user.avatar} alt="User" className="w-8 h-8 rounded-full border border-blue-400 bg-blue-800 object-cover" />
          <div className="overflow-hidden">
            <p className="text-sm font-semibold truncate">{user.name}</p>
            <p className="text-xs text-blue-300">
              {user.role === 'X' && 'Administrador'}
              {user.role === 'A' && 'Portería'}
              {user.role === 'B' && 'Residente'}
            </p>
          </div>
        </div>
        <button 
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600/20 hover:bg-red-600 text-red-100 rounded-lg transition-all text-sm"
        >
          <LogOut size={16} />
          <span>Cerrar Sesión</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;