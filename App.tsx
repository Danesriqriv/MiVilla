import React, { useState, useEffect, useCallback } from 'react';
import { User, Resident, Visit } from './types';
import { MOCK_USERS, MOCK_TENANTS } from './constants';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import UserManagement from './components/UserManagement';
import { QRGenerator, QRValidator } from './components/QRTools';
import ChatAssistant from './components/ChatAssistant';
import UserProfile from './components/UserProfile';
import { PanelLeftClose, PanelLeft, Sparkles } from 'lucide-react';
import { useLocalStorage } from './hooks';

// --- Global Mock Database (Initial Data) ---
const INITIAL_RESIDENTS: Resident[] = [
  { id: '1', tenantId: 't1', name: 'Juan Perez', unit: '101', type: 'Resident', status: 'Active', licensePlate: 'GH-45-22' },
  { id: '2', tenantId: 't1', name: 'Maria Lopez', unit: '202', type: 'Resident', status: 'Active' },
  { id: '3', tenantId: 't1', name: 'Hijo de Beto', unit: '101', type: 'Family', status: 'Active' }, // Family of User B
  { id: '4', tenantId: 't1', name: 'Pedro Repartidor', unit: '101', type: 'Delivery', status: 'Active', licensePlate: 'DL-99-00' }, 
];

const INITIAL_VISITS: Visit[] = [
  { id: 'v1', tenantId: 't1', residentId: '1', visitorName: 'Pedro Delivery', date: new Date().toISOString().split('T')[0], status: 'Completed', code: '123' }
];

const App: React.FC = () => {
  // --- Data State (Optimized with Custom Hook) ---
  const [residents, setResidents] = useLocalStorage<Resident[]>('condoguard_residents', INITIAL_RESIDENTS);
  const [visits, setVisits] = useLocalStorage<Visit[]>('condoguard_visits', INITIAL_VISITS);
  const [systemUsers, setSystemUsers] = useLocalStorage<User[]>('condoguard_users', MOCK_USERS);

  // --- Auth State ---
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // --- App State ---
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');

  // --- Sync Current User ---
  // If the currently logged-in user is updated (e.g., name change in profile), update the session state
  useEffect(() => {
    if (currentUser) {
      const updatedUser = systemUsers.find(u => u.id === currentUser.id);
      if (updatedUser && (updatedUser.name !== currentUser.name || updatedUser.avatar !== currentUser.avatar || updatedUser.role !== currentUser.role)) {
        setCurrentUser(updatedUser);
      }
    }
  }, [systemUsers, currentUser]);
  
  // --- Automatic Cleanup Effect (Check Expiration) ---
  // Runs immediately on mount (for "offline" expiry) and then every 10s
  useEffect(() => {
    const checkExpiration = () => {
      setResidents(currentResidents => {
        const now = new Date();
        let hasChanges = false;
        
        const validResidents = currentResidents.filter(r => {
          if (!r.expirationDate) return true; // Keep if no expiration date
          const expDate = new Date(r.expirationDate);
          const isExpired = expDate <= now;
          if (isExpired) {
             hasChanges = true;
          }
          return !isExpired; // Keep if expiration is in the future
        });

        // Only update state if something actually changed to avoid re-renders
        if (hasChanges) {
          console.log('Sistema: Se han eliminado registros vencidos automáticamente.');
          return validResidents;
        }
        return currentResidents;
      });
    };

    // Run once on mount to clear expired while offline
    checkExpiration();

    // Run interval
    const intervalId = setInterval(checkExpiration, 10000); 

    return () => clearInterval(intervalId);
  }, [setResidents]);

  // Memoized tenant data to avoid recalculation on every render
  const tenantResidents = React.useMemo(() => 
    currentUser ? residents.filter(r => r.tenantId === currentUser.tenantId) : [],
    [residents, currentUser]
  );

  const tenantVisits = React.useMemo(() => 
    currentUser ? visits.filter(v => v.tenantId === currentUser.tenantId) : [],
    [visits, currentUser]
  );

  const handleLogin = (userId: string) => {
    // Look in the persisted systemUsers list instead of the constant MOCK_USERS
    const user = systemUsers.find(u => u.id === userId);
    if (user) {
      setCurrentUser(user);
      setIsSidebarOpen(true);
      setIsChatOpen(true);
      setActiveTab('dashboard');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 space-y-6 animate-in fade-in duration-500">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-blue-900">MiVilla</h1>
            <p className="text-gray-500 mt-2">Selecciona un perfil para simular el acceso</p>
          </div>
          <div className="space-y-3">
            {systemUsers.map(u => (
              <button 
                key={u.id}
                onClick={() => handleLogin(u.id)}
                className="w-full flex items-center gap-4 p-4 border border-gray-200 rounded-xl hover:bg-blue-50 hover:border-blue-300 transition-all group text-left transform active:scale-98 duration-200"
              >
                <img src={u.avatar} alt={u.name} className="w-10 h-10 rounded-full bg-gray-200 shadow-sm object-cover" />
                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <h3 className="font-semibold text-gray-800 group-hover:text-blue-700">{u.name}</h3>
                    {u.unit && <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">U: {u.unit}</span>}
                  </div>
                  <p className="text-xs text-gray-500">
                    {u.role === 'X' && 'Admin'}
                    {u.role === 'A' && 'Portería'}
                    {u.role === 'B' && 'Residente'} 
                    {' '}| Tenant: {MOCK_TENANTS.find(t => t.id === u.tenantId)?.name}
                  </p>
                </div>
              </button>
            ))}
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg text-xs text-yellow-700 border border-yellow-100">
            <p className="font-bold mb-1">Simulación de Base de Datos:</p>
            Los datos ahora se guardan en el navegador (LocalStorage). Si eliminas a un residente, permanecerá eliminado aunque recargues la página.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden font-sans text-gray-900">
      
      {/* Sidebar */}
      <Sidebar 
        user={currentUser} 
        isOpen={isSidebarOpen} 
        activeTab={activeTab} 
        onTabChange={setActiveTab}
        onLogout={handleLogout}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full relative transition-all duration-300">
        
        {/* Header / Topbar */}
        <header className="bg-white h-16 border-b border-gray-200 flex items-center justify-between px-4 lg:px-6 shadow-sm z-10 shrink-0">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-100"
              title={isSidebarOpen ? "Cerrar menú lateral" : "Abrir menú lateral"}
            >
              {isSidebarOpen ? <PanelLeftClose size={24} /> : <PanelLeft size={24} />}
            </button>
            <h2 className="text-xl font-bold text-gray-800 hidden sm:block">
              {activeTab === 'dashboard' && 'Inicio'}
              {activeTab === 'users' && (currentUser.role === 'B' ? 'Mi Familia' : 'Residentes')}
              {activeTab === 'generate-qr' && 'Generar Invitación'}
              {activeTab === 'validate-qr' && 'Portería'}
              {activeTab === 'profile' && (currentUser.role === 'X' ? 'Gestión de Usuarios' : 'Mi Perfil')}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-sm text-gray-500 hidden md:block text-right">
              <span className="font-medium text-blue-600 block">{currentUser.name}</span>
              <span className="text-xs">
                 {currentUser.role === 'A' ? 'Portería' : currentUser.role === 'B' ? `Residente ${currentUser.unit}` : 'Admin'}
              </span>
            </div>
            {!isChatOpen && (
              <button 
                onClick={() => setIsChatOpen(true)}
                className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors flex items-center gap-2 focus:ring-2 focus:ring-indigo-100"
                title="Abrir Asistente IA"
              >
                <Sparkles size={20} />
                <span className="text-sm font-medium hidden sm:inline">Asistente</span>
              </button>
            )}
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
          
          {/* Main View */}
          <div className="flex-1 overflow-y-auto p-4 lg:p-8 scroll-smooth">
            <div className="max-w-7xl mx-auto h-full">
              {activeTab === 'dashboard' && <Dashboard user={currentUser} residents={tenantResidents} visits={tenantVisits} />}
              {activeTab === 'users' && <UserManagement user={currentUser} residents={residents} setResidents={setResidents} />}
              {activeTab === 'generate-qr' && <QRGenerator user={currentUser} residents={tenantResidents} />}
              {activeTab === 'validate-qr' && <QRValidator user={currentUser} />}
              {activeTab === 'profile' && <UserProfile currentUser={currentUser} systemUsers={systemUsers} setSystemUsers={setSystemUsers} />}
            </div>
          </div>

          {/* AI Chat Sidebar */}
          {isChatOpen && (
            <div className="w-full lg:w-80 border-l border-gray-200 bg-white shadow-xl lg:shadow-none flex flex-col h-1/3 lg:h-full z-10 transition-all duration-300">
              <ChatAssistant 
                user={currentUser} 
                mockResidents={tenantResidents} 
                onClose={() => setIsChatOpen(false)} 
              />
            </div>
          )}

        </div>
      </main>
    </div>
  );
};

export default App;