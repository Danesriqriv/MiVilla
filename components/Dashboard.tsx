import React, { useState, useMemo } from 'react';
import { User, Resident, Visit } from '../types';
import { Users, DoorOpen, ShieldAlert, Activity, UserCheck, Home, Truck, ChevronDown, ChevronUp, ShieldCheck as ShieldIcon, Calendar, Filter } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface DashboardProps {
  user: User;
  residents: Resident[];
  visits: Visit[];
}

type DashboardSection = 'residents' | 'visits' | 'alerts' | 'status' | null;
type TimeRange = 'day' | 'week' | 'month' | 'year';

const Dashboard: React.FC<DashboardProps> = ({ user, residents, visits }) => {
  const [activeSection, setActiveSection] = useState<DashboardSection>('residents');
  const [timeRange, setTimeRange] = useState<TimeRange>('week');
  
  // Optimized Filtering: Memoize results
  const displayResidents = useMemo(() => 
    user.role === 'B' 
      ? residents.filter(r => r.unit === user.unit) 
      : residents
  , [residents, user.role, user.unit]);

  const displayVisits = useMemo(() => 
    user.role === 'B'
      ? visits.filter(v => displayResidents.some(r => r.id === v.residentId))
      : visits
  , [visits, displayResidents, user.role]);

  const toggleSection = (section: DashboardSection) => {
    setActiveSection(prev => prev === section ? null : section);
  };

  const todayVisitsCount = useMemo(() => 
    displayVisits.filter(v => v.date.startsWith(new Date().toISOString().split('T')[0])).length
  , [displayVisits]);

  // --- Chart Data Calculation ---
  const chartData = useMemo(() => {
    const now = new Date();
    const data: { name: string; visits: number }[] = [];

    if (timeRange === 'day') {
      // Logic: Hourly breakdown (00-23)
      // Note: Current mock data uses YYYY-MM-DD. Real usage would need ISO timestamps for accurate hourly data.
      // We bucket by what we have.
      const hours = Array.from({ length: 24 }, (_, i) => ({ 
        hour: i, 
        label: `${i}:00`,
        count: 0 
      }));

      displayVisits.forEach(v => {
        const vDate = new Date(v.date);
        // Only count if it's today
        if (vDate.toDateString() === now.toDateString()) {
           // If date string has time, use it, else default to 00
           const h = v.date.includes('T') ? vDate.getHours() : 12; // Default to noon if no time for visuals
           if (hours[h]) hours[h].count++;
        }
      });
      return hours.map(h => ({ name: h.label, visits: h.count }));

    } else if (timeRange === 'week') {
      // Logic: Last 7 days
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const dayName = d.toLocaleDateString('es-ES', { weekday: 'short' });
        
        const count = displayVisits.filter(v => v.date.startsWith(dateStr)).length;
        data.push({ name: dayName, visits: count });
      }

    } else if (timeRange === 'month') {
      // Logic: Days of current month
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      for (let i = 1; i <= daysInMonth; i++) {
        // Simple label for every 5th day to avoid crowding, or just the number
        const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        const count = displayVisits.filter(v => v.date.startsWith(dateStr)).length;
        data.push({ name: String(i), visits: count });
      }

    } else if (timeRange === 'year') {
      // Logic: Months of current year
      const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      const year = now.getFullYear();
      
      const counts = new Array(12).fill(0);
      displayVisits.forEach(v => {
        const vDate = new Date(v.date);
        if (vDate.getFullYear() === year) {
          counts[vDate.getMonth()]++;
        }
      });

      counts.forEach((c, idx) => {
        data.push({ name: months[idx], visits: c });
      });
    }

    return data;
  }, [displayVisits, timeRange]);


  const stats = useMemo(() => [
    { 
      key: 'residents' as DashboardSection,
      title: user.role === 'B' ? 'Mi Familia' : 'Total Residentes', 
      value: displayResidents.length, 
      icon: Users, 
      color: 'bg-blue-500',
      ringColor: 'ring-blue-500'
    },
    { 
      key: 'visits' as DashboardSection,
      title: 'Visitas Hoy', 
      value: todayVisitsCount, 
      icon: DoorOpen, 
      color: 'bg-green-500',
      ringColor: 'ring-green-500'
    },
    { 
      key: 'alerts' as DashboardSection,
      title: 'Alertas', 
      value: '0', 
      icon: ShieldAlert, 
      color: 'bg-red-500',
      ringColor: 'ring-red-500'
    },
    { 
      key: 'status' as DashboardSection,
      title: 'Actividad', 
      value: 'Normal', 
      icon: Activity, 
      color: 'bg-purple-500',
      ringColor: 'ring-purple-500'
    },
  ], [user.role, displayResidents.length, todayVisitsCount]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'Resident': return <UserCheck size={14} />;
      case 'Family': return <Users size={14} />;
      case 'Delivery': return <Truck size={14} />;
      case 'Visitor': return <Home size={14} />;
      default: return <UserCheck size={14} />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'Resident': return 'Residente';
      case 'Family': return 'Familiar';
      case 'Delivery': return 'Delivery';
      case 'Visitor': return 'Visita';
      default: return type;
    }
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards as Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          const isActive = activeSection === stat.key;
          return (
            <button
              key={stat.key}
              onClick={() => toggleSection(stat.key)}
              className={`
                relative bg-white p-6 rounded-xl shadow-sm border transition-all duration-200 text-left w-full
                flex items-center justify-between group outline-none
                ${isActive ? `ring-2 ${stat.ringColor} border-transparent transform scale-[1.02]` : 'border-gray-100 hover:border-gray-300 hover:shadow-md'}
              `}
            >
              <div>
                <p className="text-gray-500 text-sm font-medium group-hover:text-gray-700 transition-colors">{stat.title}</p>
                <h3 className="text-2xl font-bold text-gray-800 mt-1">{stat.value}</h3>
              </div>
              <div className={`${stat.color} p-3 rounded-lg text-white shadow-sm shadow-blue-500/20`}>
                <Icon size={24} />
              </div>
              
              {/* Toggle Indicator */}
              <div className="absolute bottom-2 right-1/2 translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                 {isActive ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
              </div>
            </button>
          );
        })}
      </div>

      {/* Dynamic Content Section */}
      <div className="transition-all duration-300 ease-in-out min-h-[400px]">
        
        {/* SECTION: RESIDENTS */}
        {activeSection === 'residents' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-blue-50/30">
              <div className="flex items-center gap-2">
                <Users className="text-blue-500" size={20} />
                <h3 className="text-lg font-bold text-gray-800">
                  {user.role === 'B' ? 'Mi Grupo Familiar' : 'Directorio de Residentes'}
                </h3>
              </div>
              <span className="text-xs text-blue-700 bg-blue-100 px-3 py-1 rounded-full font-medium">
                {displayResidents.length} Registros
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                  <tr>
                    <th className="px-5 py-3 font-medium">Nombre</th>
                    <th className="px-5 py-3 font-medium">Unidad</th>
                    <th className="px-5 py-3 font-medium">Tipo</th>
                    <th className="px-5 py-3 font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {displayResidents.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50/50">
                      <td className="px-5 py-3 text-sm font-medium text-gray-800 flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold border border-blue-200">
                          {r.name.charAt(0)}
                        </div>
                        {r.name}
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-600">{r.unit}</td>
                      <td className="px-5 py-3">
                         <span className={`text-xs px-2.5 py-1 rounded-full border inline-flex items-center gap-1 bg-opacity-50 border-transparent 
                           ${r.type === 'Resident' ? 'bg-blue-100 text-blue-700' : ''}
                           ${r.type === 'Family' ? 'bg-purple-100 text-purple-700' : ''}
                           ${r.type === 'Visitor' ? 'bg-green-100 text-green-700' : ''}
                           ${r.type === 'Delivery' ? 'bg-orange-100 text-orange-700' : ''}
                         `}>
                            {getTypeIcon(r.type)}
                            {getTypeLabel(r.type)}
                         </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full border border-green-100 font-medium">
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {displayResidents.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-5 py-12 text-center text-gray-400 text-sm">
                        No hay personas registradas.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SECTION: VISITS */}
        {activeSection === 'visits' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-green-50/30">
              <div className="flex items-center gap-2">
                <DoorOpen className="text-green-600" size={20} />
                <h3 className="text-lg font-bold text-gray-800">Bitácora de Accesos</h3>
              </div>
              <button className="text-xs text-green-700 hover:text-green-900 font-medium">Ver Historial Completo</button>
            </div>
            <div className="p-0">
              {displayVisits.map(visit => {
                const targetResident = residents.find(r => r.id === visit.residentId);
                return (
                  <div key={visit.id} className="flex items-center justify-between p-4 border-b border-gray-50 hover:bg-gray-50/50 transition-colors last:border-0">
                    <div className="flex items-center gap-4">
                      <div className="bg-green-100 p-2.5 rounded-full text-green-600">
                         <DoorOpen size={18} />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800 text-sm">{visit.visitorName}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Visita a: <span className="font-medium text-gray-700">{targetResident?.name || 'Desconocido'}</span> 
                          <span className="mx-1">•</span> Unit {targetResident?.unit}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                       <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${
                        visit.status === 'Completed' ? 'bg-green-50 text-green-700 border-green-200' : 
                        visit.status === 'Approved' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                      }`}>
                        {visit.status === 'Completed' ? 'Completado' : visit.status === 'Approved' ? 'Aprobado' : 'Pendiente'}
                      </span>
                      <p className="text-[10px] text-gray-400 mt-1">{visit.date}</p>
                    </div>
                  </div>
                );
              })}
              {displayVisits.length === 0 && (
                <div className="text-center py-12 text-gray-400 text-sm">
                  <Activity size={32} className="mx-auto mb-2 opacity-20" />
                  No hay actividad de visitas hoy.
                </div>
              )}
            </div>
          </div>
        )}

        {/* SECTION: ALERTS (Placeholder) */}
        {activeSection === 'alerts' && (
           <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center animate-in fade-in slide-in-from-top-4 duration-300">
              <div className="w-16 h-16 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShieldIcon size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-800">Sin Alertas Activas</h3>
              <p className="text-gray-500 mt-2 max-w-md mx-auto">
                No se han reportado incidentes de seguridad ni anomalías en el sistema durante las últimas 24 horas.
              </p>
           </div>
        )}

        {/* SECTION: STATUS (Chart) */}
        {activeSection === 'status' && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="flex flex-col md:flex-row items-center justify-between mb-6 gap-4">
               <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                 <Activity className="text-purple-500" />
                 Estadísticas de Acceso
               </h3>
               
               {/* Timeframe Selector for Role X and A */}
               {(user.role === 'X' || user.role === 'A') && (
                 <div className="flex bg-gray-100 p-1 rounded-lg">
                   {(['day', 'week', 'month', 'year'] as TimeRange[]).map((range) => (
                     <button
                       key={range}
                       onClick={() => setTimeRange(range)}
                       className={`
                         px-4 py-1.5 text-xs font-medium rounded-md transition-all capitalize
                         ${timeRange === range 
                           ? 'bg-white text-blue-600 shadow-sm' 
                           : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'}
                       `}
                     >
                       {range === 'day' ? 'Día' : range === 'week' ? 'Semana' : range === 'month' ? 'Mes' : 'Año'}
                     </button>
                   ))}
                 </div>
               )}
            </div>
            
            {user.role === 'B' ? (
               <div className="h-64 flex flex-col items-center justify-center bg-gray-50 rounded-lg text-gray-400 text-sm border border-dashed border-gray-200">
                 <Activity size={32} className="mb-2 opacity-30" />
                 <p>Monitor de actividad simplificado para residentes.</p>
               </div>
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fill: '#6B7280', fontSize: 11}} 
                      dy={10} 
                      interval={timeRange === 'month' ? 2 : 0} // Skip labels on busy month view
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fill: '#6B7280', fontSize: 11}} 
                    />
                    <Tooltip 
                      cursor={{fill: '#F3F4F6'}}
                      contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                    />
                    <Bar 
                      dataKey="visits" 
                      name="Accesos"
                      fill="#8B5CF6" 
                      radius={[4, 4, 0, 0]} 
                      barSize={timeRange === 'month' ? 8 : 40} 
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {!activeSection && (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50">
             <p>Selecciona una tarjeta arriba para ver más detalles.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;