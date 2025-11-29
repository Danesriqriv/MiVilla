import React, { useState, useMemo } from 'react';
import { User, Resident } from '../types';
import { Plus, Search, Trash2, Edit2, ShieldAlert, Home, UserCheck, Car, Truck, Users as UsersIcon, User as UserIcon, Save, X, History, Clock, Filter, AlertCircle, AlertTriangle } from 'lucide-react';

interface UserManagementProps {
  user: User;
  residents: Resident[];
  setResidents: (value: Resident[] | ((val: Resident[]) => Resident[])) => void;
}

const UserManagement: React.FC<UserManagementProps> = ({ user, residents, setResidents }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL'); // New filter state
  const [formError, setFormError] = useState('');
  
  // For Role B, unit is fixed to their assigned unit. For X, it's manual input.
  const [newResident, setNewResident] = useState({ 
    name: '', 
    unit: user.role === 'B' ? (user.unit || '') : '', 
    type: 'Family' as Resident['type'],
    licensePlate: '',
    expirationDate: ''
  });

  // Editing State (Full Edit - Role X & B)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Resident>>({});

  // Extension State (Time Extension - Role X & B)
  const [extendingId, setExtendingId] = useState<string | null>(null);
  const [extensionDate, setExtensionDate] = useState('');

  // Deletion Modal State
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Optimized Filter logic using useMemo
  const filtered = useMemo(() => {
    return residents.filter(r => {
      // 1. Search Text Match
      const matchesSearch = 
        r.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        r.unit.includes(searchTerm) ||
        (r.licensePlate && r.licensePlate.toLowerCase().includes(searchTerm.toLowerCase()));
      
      // 2. Type/Category Match
      const matchesType = filterType === 'ALL' || r.type === filterType;

      // 3. Role Constraints
      if (user.role === 'B') {
        return r.unit === user.unit && matchesSearch && matchesType; // Strict unit filter for residents
      }
      
      // Role X and A see everyone (filtered by search and type)
      return matchesSearch && matchesType;
    });
  }, [residents, searchTerm, filterType, user.role, user.unit]);

  const handleAdd = () => {
    // Validation
    if (!newResident.name.trim() || !newResident.unit.trim()) {
      setFormError('Nombre y Unidad son obligatorios.');
      return;
    }
    setFormError('');
    
    const resident: Resident = {
      id: Date.now().toString(),
      tenantId: user.tenantId,
      name: newResident.name,
      unit: newResident.unit,
      type: newResident.type,
      status: 'Active',
      licensePlate: newResident.licensePlate.trim() || undefined,
      expirationDate: newResident.expirationDate || undefined
    };
    
    setResidents(prev => [...prev, resident]);
    
    // Reset form, keeping unit if Role B
    setNewResident({ 
      name: '', 
      unit: user.role === 'B' ? (user.unit || '') : '', 
      type: 'Family',
      licensePlate: '',
      expirationDate: ''
    });
  };

  // 1. Initiate Delete (Open Modal)
  const initiateDelete = (e: React.MouseEvent | null, id: string) => {
    // Robust event handling
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    // Role check: Only X and B can delete
    if (user.role !== 'X' && user.role !== 'B') return;
    
    // Permission check for B: Only own unit
    if (user.role === 'B') {
      const target = residents.find(r => r.id === id);
      if (target && target.unit !== user.unit) {
        alert("No tienes permiso para eliminar residentes de otra unidad.");
        return;
      }
    }
    
    setDeletingId(id);
  };

  // 2. Confirm Delete (Execute Action)
  const confirmDelete = () => {
    if (!deletingId) return;

    // Functional update ensuring we filter from the latest state
    setResidents(prev => prev.filter(r => r.id !== deletingId));
    
    // Clean up local UI states if we deleted the item being edited
    if (editingId === deletingId) setEditingId(null);
    if (extendingId === deletingId) setExtendingId(null);
    
    setDeletingId(null);
  };

  // --- Full Edit Logic (Role X & B) ---
  const handleEditClick = (e: React.MouseEvent, resident: Resident) => {
    e.preventDefault();
    e.stopPropagation();

    // Allow X and B
    if (user.role !== 'X' && user.role !== 'B') return;
    
    // Safety for B: Only edit own unit
    if (user.role === 'B' && resident.unit !== user.unit) return;

    setEditingId(resident.id);
    setEditForm({ ...resident });
    setExtendingId(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleSaveEdit = () => {
    if (!editingId || !editForm.name || !editForm.unit) return;

    setResidents(prev => prev.map(r => 
      r.id === editingId ? { ...r, ...editForm } as Resident : r
    ));
    setEditingId(null);
    setEditForm({});
  };

  // --- Extension Logic (Role X & B) ---
  const handleExtendClick = (e: React.MouseEvent, resident: Resident) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (user.role !== 'X' && user.role !== 'B') return;
    setExtendingId(resident.id);
    
    const dateObj = resident.expirationDate ? new Date(resident.expirationDate) : new Date();
    // Adjust to local timezone format (YYYY-MM-DDTHH:mm)
    const localIso = new Date(dateObj.getTime() - (dateObj.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
    
    setExtensionDate(localIso);
    setEditingId(null);
  };

  const handleCancelExtension = () => {
    setExtendingId(null);
    setExtensionDate('');
  };

  const handleSaveExtension = (id: string) => {
    setResidents(prev => prev.map(r => 
      r.id === id ? { ...r, expirationDate: extensionDate || undefined } : r
    ));
    setExtendingId(null);
    setExtensionDate('');
  };


  const getRoleTitle = () => {
    if (user.role === 'B') return 'Mi Hogar';
    if (user.role === 'A') return 'Directorio Global';
    return 'Gestión Global de Residentes';
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'Resident': return <UserCheck size={14} />;
      case 'Family': return <UsersIcon size={14} />;
      case 'Delivery': return <Truck size={14} />;
      case 'Visitor': return <UserIcon size={14} />;
      default: return <UserIcon size={14} />;
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

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Resident': return 'bg-blue-100 text-blue-700';
      case 'Family': return 'bg-purple-100 text-purple-700';
      case 'Delivery': return 'bg-orange-100 text-orange-700';
      case 'Visitor': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleString('es-ES', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-gray-800 flex items-center gap-2">
            {user.role === 'B' ? <Home className="text-blue-600" /> : <Search className="text-blue-600" />}
            {getRoleTitle()}
          </h2>
          <p className="text-sm md:text-base text-gray-500">
            {user.role === 'B' 
              ? `Unidad: ${user.unit} - Gestiona a las personas autorizadas.` 
              : `Tenant: ${user.tenantId} - Búsqueda en todo el condominio.`}
          </p>
        </div>
        
        {/* Add Form: Available for X and B */}
        {(user.role === 'X' || user.role === 'B') && !editingId && !extendingId && (
           <div className={`bg-white p-4 rounded-xl shadow-sm border ${formError ? 'border-red-300 ring-2 ring-red-50' : 'border-gray-200'} transition-all`}>
             <div className="flex justify-between items-center mb-3">
               <h3 className="text-sm font-semibold text-gray-700">Agregar Nueva Persona</h3>
               {formError && (
                 <span className="text-xs text-red-600 flex items-center gap-1 font-medium animate-pulse">
                   <AlertCircle size={12} /> {formError}
                 </span>
               )}
             </div>
             <div className="flex flex-col gap-3">
               <div className="flex flex-col md:flex-row items-stretch md:items-end gap-3">
                 <div className="flex-1">
                   <label className="text-xs text-gray-500 mb-1 block">Nombre Completo <span className="text-red-400">*</span></label>
                   <input 
                     placeholder="Ej. Juan Pérez" 
                     className="w-full border p-2 rounded-lg text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                     value={newResident.name}
                     onChange={e => setNewResident({...newResident, name: e.target.value})}
                   />
                 </div>
                 
                 {/* Unit input: Always visible. Locked for B, Editable for X */}
                 <div className="w-full md:w-24">
                   <label className="text-xs text-gray-500 mb-1 block">Unidad <span className="text-red-400">*</span></label>
                   <input 
                     placeholder="101" 
                     className={`w-full border p-2 rounded-lg text-sm outline-none transition-all ${
                       user.role === 'B' 
                         ? 'bg-gray-100 text-gray-500 cursor-not-allowed' 
                         : 'focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                     }`}
                     value={newResident.unit}
                     onChange={e => user.role === 'X' && setNewResident({...newResident, unit: e.target.value})}
                     disabled={user.role === 'B'}
                   />
                 </div>

                 <div className="w-full md:w-40">
                   <label className="text-xs text-gray-500 mb-1 block">Tipo</label>
                   <select 
                     className="w-full border p-2 rounded-lg text-sm outline-none focus:border-blue-500 bg-white"
                     value={newResident.type}
                     onChange={e => setNewResident({...newResident, type: e.target.value as Resident['type']})}
                   >
                     <option value="Resident">Residente</option>
                     <option value="Family">Familiar</option>
                     <option value="Visitor">Visita</option>
                     <option value="Delivery">Delivery</option>
                   </select>
                 </div>

                 <div className="w-full md:w-36">
                    <label className="text-xs text-gray-500 mb-1 block">Patente <span className="text-gray-300">(Opc)</span></label>
                    <div className="relative">
                      <input 
                        placeholder="ABC-123" 
                        className="w-full border p-2 pl-7 rounded-lg text-sm outline-none focus:border-blue-500 uppercase"
                        value={newResident.licensePlate}
                        onChange={e => setNewResident({...newResident, licensePlate: e.target.value.toUpperCase()})}
                      />
                      <Car size={14} className="absolute left-2 top-2.5 text-gray-400" />
                    </div>
                 </div>
               </div>
               
               <div className="flex flex-col md:flex-row items-end gap-3">
                 <div className="w-full md:w-56">
                    <label className="text-xs text-gray-500 mb-1 block">Vencimiento Automático <span className="text-gray-300">(Opc)</span></label>
                    <div className="relative">
                      <input 
                        type="datetime-local"
                        className="w-full border p-2 pl-7 rounded-lg text-sm outline-none focus:border-blue-500"
                        value={newResident.expirationDate}
                        onChange={e => setNewResident({...newResident, expirationDate: e.target.value})}
                      />
                      <Clock size={14} className="absolute left-2 top-2.5 text-gray-400" />
                    </div>
                 </div>

                 <button 
                   onClick={handleAdd}
                   type="button"
                   className="w-full md:w-auto bg-blue-600 text-white py-2 px-6 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 h-[38px] shadow-sm ml-auto font-medium"
                   title="Agregar Persona"
                 >
                   <Plus size={18} />
                   Agregar
                 </button>
               </div>
             </div>
           </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* ENHANCED SEARCH BAR */}
        <div className="p-4 border-b border-gray-200 flex flex-col md:flex-row gap-3">
          <div className="flex-1 flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
            <Search className="text-gray-400" size={20} />
            <input 
              className="flex-1 outline-none text-gray-700 text-sm md:text-base bg-transparent placeholder-gray-400"
              placeholder={user.role === 'B' ? "Buscar en mi familia..." : "Buscar nombre, unidad o patente..."}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          
          {/* Category Filter for Everyone (Especially X and A) */}
          <div className="relative w-full md:w-48">
             <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none">
                <Filter size={16} />
             </div>
             <select 
               value={filterType}
               onChange={(e) => setFilterType(e.target.value)}
               className="w-full appearance-none bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-lg py-2.5 pl-10 pr-8 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 cursor-pointer"
             >
               <option value="ALL">Todos</option>
               <option value="Resident">Residentes</option>
               <option value="Family">Familiares</option>
               <option value="Visitor">Visitas</option>
               <option value="Delivery">Delivery</option>
             </select>
          </div>
        </div>
        
        {/* Mobile View: Cards */}
        <div className="md:hidden bg-gray-50 p-4 space-y-4">
          {filtered.map((r) => (
            <div key={r.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
               {editingId === r.id ? (
                 <div className="space-y-3">
                    {/* Full Edit Mode for Mobile */}
                    <div>
                      <label className="text-xs text-gray-400">Nombre</label>
                      <input 
                        className="w-full border p-2 rounded text-sm"
                        value={editForm.name}
                        onChange={e => setEditForm({...editForm, name: e.target.value})}
                      />
                    </div>
                    {/* Only allow Type edit */}
                    <div>
                      <label className="text-xs text-gray-400">Tipo</label>
                      <select 
                         className="w-full border p-2 rounded text-sm bg-white"
                         value={editForm.type}
                         onChange={e => setEditForm({...editForm, type: e.target.value as Resident['type']})}
                       >
                         <option value="Resident">Residente</option>
                         <option value="Family">Familiar</option>
                         <option value="Visitor">Visita</option>
                         <option value="Delivery">Delivery</option>
                       </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-400">Patente</label>
                      <input 
                        className="w-full border p-2 rounded text-sm uppercase"
                        value={editForm.licensePlate || ''}
                        onChange={e => setEditForm({...editForm, licensePlate: e.target.value.toUpperCase()})}
                      />
                    </div>
                    <div className="flex justify-end gap-2 pt-2 items-center">
                       <button 
                         onClick={(e) => initiateDelete(e, r.id)}
                         className="bg-red-50 text-red-600 px-3 py-1.5 rounded text-sm flex items-center gap-1 font-medium shadow-sm mr-auto hover:bg-red-100"
                         title="Eliminar registro"
                         type="button"
                       >
                         <Trash2 size={14} /> Eliminar
                       </button>

                       <button onClick={handleSaveEdit} type="button" className="bg-green-600 text-white px-3 py-1.5 rounded text-sm flex items-center gap-1 font-medium shadow-sm">
                         <Save size={14} /> Guardar
                       </button>
                       <button onClick={handleCancelEdit} type="button" className="bg-white border border-red-200 text-red-500 px-3 py-1.5 rounded text-sm flex items-center gap-1 font-medium shadow-sm">
                         <X size={14} /> Cancelar
                       </button>
                    </div>
                 </div>
               ) : (
                 <>
                   <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-600">
                            {r.name.charAt(0)}
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-800">{r.name}</h4>
                          <span className={`text-xs px-2 py-0.5 rounded-full border inline-flex items-center gap-1 ${getTypeColor(r.type)} border-transparent bg-opacity-50 mt-1`}>
                            {getTypeIcon(r.type)}
                            {getTypeLabel(r.type)}
                          </span>
                        </div>
                      </div>
                      <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 border border-green-200 font-medium">
                          {r.status}
                      </span>
                   </div>
                   
                   <div className="space-y-2 text-sm text-gray-600 mt-3 border-t pt-3 border-gray-100">
                     <div className="flex justify-between">
                       <span className="text-gray-400">Unidad:</span>
                       <span className="font-medium">{r.unit}</span>
                     </div>
                     <div className="flex justify-between items-center">
                       <span className="text-gray-400">Patente:</span>
                       {r.licensePlate ? (
                          <div className="flex items-center gap-1.5 bg-gray-100 px-2 py-0.5 rounded text-xs font-mono border border-gray-200 text-gray-700">
                            <Car size={10} className="text-gray-400" />
                            {r.licensePlate}
                          </div>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                     </div>

                     {/* Expiration Display OR Edit Mode */}
                     {extendingId === r.id ? (
                        <div className="bg-orange-50 p-3 rounded border border-orange-200 animate-in fade-in">
                          <label className="text-xs text-orange-700 font-bold mb-1 block">Nuevo Vencimiento:</label>
                          <input 
                            type="datetime-local"
                            className="w-full border p-1.5 rounded text-sm bg-white mb-2"
                            value={extensionDate}
                            onChange={e => setExtensionDate(e.target.value)}
                          />
                          <div className="flex justify-end gap-2">
                             <button onClick={() => handleSaveExtension(r.id)} type="button" className="bg-green-600 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
                               <Save size={12} />
                             </button>
                             <button onClick={handleCancelExtension} type="button" className="bg-red-500 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
                               <X size={12} />
                             </button>
                          </div>
                        </div>
                     ) : (
                        (r.expirationDate || user.role === 'B') && (
                          <div className="flex justify-between items-center bg-gray-50 p-2 rounded border border-gray-100">
                            <span className="text-gray-500 flex items-center gap-1 text-xs">
                               <Clock size={12} /> Vencimiento:
                            </span>
                            {r.expirationDate ? (
                               <span className="text-red-600 font-mono text-xs font-medium">{formatDate(r.expirationDate)}</span>
                            ) : (
                              <span className="text-gray-400 text-xs italic">Sin límite</span>
                            )}
                          </div>
                        )
                     )}
                   </div>

                   <div className="flex justify-end gap-3 mt-4 pt-2 border-t border-gray-50">
                      {/* Extend Button: X and B */}
                      {(user.role === 'X' || user.role === 'B') && !extendingId && (
                        <button 
                          onClick={(e) => handleExtendClick(e, r)}
                          type="button"
                          className="flex items-center gap-1 text-orange-600 text-sm font-medium hover:bg-orange-50 px-3 py-1.5 rounded transition-colors"
                          title="Aplazar Vencimiento"
                        >
                          <History size={16} /> Aplazar
                        </button>
                      )}

                      {/* Edit Button: X and B */}
                      {(user.role === 'X' || user.role === 'B') && !extendingId && (
                        <button 
                          onClick={(e) => handleEditClick(e, r)}
                          type="button"
                          className="flex items-center gap-1 text-blue-600 text-sm font-medium hover:bg-blue-50 px-3 py-1.5 rounded transition-colors"
                        >
                          <Edit2 size={16} /> Editar
                        </button>
                      )}
                      
                      {/* Delete Button: X and B */}
                      {(user.role === 'X' || user.role === 'B') && !extendingId && (
                        <button 
                          onClick={(e) => initiateDelete(e, r.id)}
                          type="button" 
                          className="flex items-center gap-1 text-red-500 text-sm font-medium hover:bg-red-50 px-3 py-1.5 rounded transition-colors"
                        >
                          <Trash2 size={16} /> Eliminar
                        </button>
                      )}
                   </div>
                 </>
               )}
            </div>
          ))}
        </div>

        {/* Desktop View: Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-gray-500 text-sm uppercase">
              <tr>
                <th className="p-4 font-medium">Nombre</th>
                <th className="p-4 font-medium">Unidad</th>
                <th className="p-4 font-medium">Tipo</th>
                <th className="p-4 font-medium">Info Adicional</th>
                <th className="p-4 font-medium">Estado</th>
                <th className="p-4 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50/50 transition-colors">
                  {/* Row Content - Swaps to inputs if editingId matches */}
                  {editingId === r.id ? (
                    <>
                      {/* ... Editing Columns ... */}
                      <td className="p-4">
                        <input 
                          className="w-full border p-2 rounded text-sm focus:border-blue-500 outline-none"
                          value={editForm.name}
                          onChange={e => setEditForm({...editForm, name: e.target.value})}
                        />
                      </td>
                      <td className="p-4">
                        {/* Unit: Read-only for B */}
                        <input 
                          className={`w-full border p-2 rounded text-sm w-24 outline-none ${user.role === 'B' ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'focus:border-blue-500'}`}
                          value={editForm.unit}
                          onChange={e => setEditForm({...editForm, unit: e.target.value})}
                          disabled={user.role === 'B'}
                        />
                      </td>
                      <td className="p-4">
                         <select 
                           className="w-full border p-2 rounded text-sm bg-white outline-none focus:border-blue-500"
                           value={editForm.type}
                           onChange={e => setEditForm({...editForm, type: e.target.value as Resident['type']})}
                         >
                           <option value="Resident">Residente</option>
                           <option value="Family">Familiar</option>
                           <option value="Visitor">Visita</option>
                           <option value="Delivery">Delivery</option>
                         </select>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col gap-1">
                          <input 
                            className="w-full border p-2 rounded text-sm uppercase focus:border-blue-500 outline-none"
                            value={editForm.licensePlate || ''}
                            onChange={e => setEditForm({...editForm, licensePlate: e.target.value.toUpperCase()})}
                            placeholder="Patente"
                          />
                        </div>
                      </td>
                      <td className="p-4"><span className="text-gray-400 text-sm">Editando...</span></td>
                      <td className="p-4 text-right">
                        <div className="flex justify-end gap-2 items-center">
                          <button onClick={handleSaveEdit} type="button" className="text-green-600 hover:bg-green-50 p-2 rounded transition-colors" title="Guardar">
                            <Save size={18} />
                          </button>
                          <button onClick={handleCancelEdit} type="button" className="text-gray-400 hover:bg-gray-50 p-2 rounded transition-colors" title="Cancelar">
                            <X size={18} />
                          </button>
                          
                          <div className="w-px h-6 bg-gray-200 mx-1"></div>

                          <button 
                            onClick={(e) => initiateDelete(e, r.id)}
                            type="button"
                            className="text-red-500 hover:bg-red-50 p-2 rounded transition-colors"
                            title="Eliminar permanentemente"
                          >
                             <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      {/* Read Only / Extension View */}
                      <td className="p-4 font-medium text-gray-800 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                            {r.name.charAt(0)}
                        </div>
                        {r.name}
                      </td>
                      <td className="p-4 text-gray-600">{r.unit}</td>
                      <td className="p-4">
                        <span className={`text-xs px-2.5 py-1 rounded-full border flex items-center gap-1 w-fit ${getTypeColor(r.type)} border-transparent bg-opacity-50`}>
                          {getTypeIcon(r.type)}
                          {getTypeLabel(r.type)}
                        </span>
                      </td>
                      
                      {/* Info / Extension Column */}
                      <td className="p-4">
                        {extendingId === r.id ? (
                           <div className="flex items-center gap-2 animate-in fade-in">
                             <input 
                                type="datetime-local"
                                className="border p-1.5 rounded text-xs w-40 shadow-sm focus:border-orange-500 outline-none"
                                value={extensionDate}
                                onChange={e => setExtensionDate(e.target.value)}
                                autoFocus
                             />
                             <button onClick={() => handleSaveExtension(r.id)} type="button" className="text-green-600 bg-green-50 p-1.5 rounded hover:bg-green-100">
                               <Save size={14} />
                             </button>
                             <button onClick={handleCancelExtension} type="button" className="text-red-500 bg-red-50 p-1.5 rounded hover:bg-red-100">
                               <X size={14} />
                             </button>
                           </div>
                        ) : (
                          <div className="flex flex-col gap-1.5 items-start">
                             {r.licensePlate ? (
                                <div className="flex items-center gap-1.5 text-gray-700 bg-gray-100 px-2 py-1 rounded text-xs font-mono border border-gray-200">
                                  <Car size={12} className="text-gray-400" />
                                  {r.licensePlate}
                                </div>
                              ) : null}
                              {r.expirationDate ? (
                                <div className="flex items-center gap-1.5 text-red-600 bg-red-50 px-2 py-1 rounded text-xs border border-red-100 font-medium" title="Expiración Automática">
                                  <Clock size={12} />
                                  {formatDate(r.expirationDate)}
                                </div>
                              ) : (
                                (user.role === 'X' || user.role === 'B') && !r.licensePlate && <span className="text-gray-300 text-xs">-</span>
                              )}
                          </div>
                        )}
                      </td>
                      
                      <td className="p-4">
                        <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 border border-green-200 font-medium">
                          {r.status}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex justify-end gap-2">
                          
                          {/* Extend Button: X and B (Only if not already extending) */}
                          {(user.role === 'X' || user.role === 'B') && !extendingId && (
                            <button 
                              onClick={(e) => handleExtendClick(e, r)}
                              type="button"
                              className="text-orange-400 hover:text-orange-600 hover:bg-orange-50 p-1.5 rounded transition-colors"
                              title="Aplazar / Modificar Vencimiento"
                            >
                              <History size={18} />
                            </button>
                          )}

                          {/* Edit Button: X and B */}
                          {(user.role === 'X' || user.role === 'B') && !extendingId && (
                            <button 
                              onClick={(e) => handleEditClick(e, r)}
                              type="button"
                              className="text-gray-400 hover:text-blue-600 hover:bg-blue-50 p-1.5 rounded transition-colors"
                              title="Editar Info"
                            >
                              <Edit2 size={18} />
                            </button>
                          )}
                          
                          {/* Delete Button: X and B */}
                          {(user.role === 'X' || user.role === 'B') && !extendingId ? (
                            <button 
                              onClick={(e) => initiateDelete(e, r.id)}
                              type="button" 
                              className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded transition-colors"
                              title="Eliminar persona"
                            >
                              <Trash2 size={18} />
                            </button>
                          ) : (
                            !extendingId && user.role === 'A' && <span className="text-gray-400 cursor-not-allowed" title="Solo lectura"><ShieldAlert size={18} /></span>
                          )}
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
            <div className="p-12 text-center text-gray-400 flex flex-col items-center">
              <UserCheck size={48} className="mb-4 opacity-20" />
              <p className="font-medium">No se encontraron registros.</p>
              {user.role === 'B' && <p className="text-sm mt-1 text-gray-500">Agrega residentes, familiares o visitas frecuentes usando el formulario arriba.</p>}
            </div>
          )}
      </div>

      {/* CONFIRMATION MODAL */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 animate-in zoom-in-95 duration-200 border border-gray-100">
            <div className="flex flex-col items-center text-center">
              <div className="bg-red-100 p-3 rounded-full text-red-600 mb-4">
                <AlertTriangle size={32} />
              </div>
              <h3 className="text-lg font-bold text-gray-900">¿Eliminar persona?</h3>
              <p className="text-gray-500 text-sm mt-2">
                Esta acción eliminará el registro permanentemente. No podrás deshacer esta acción.
              </p>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setDeletingId(null)}
                className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors shadow-sm"
              >
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;