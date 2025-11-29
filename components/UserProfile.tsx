import React, { useState, useRef, useMemo } from 'react';
import { User, Role } from '../types';
import { User as UserIcon, Camera, Save, Shield, Edit, Upload, Image as ImageIcon, Lock } from 'lucide-react';

interface UserProfileProps {
  currentUser: User;
  systemUsers: User[];
  setSystemUsers: (users: User[]) => void;
}

const UserProfile: React.FC<UserProfileProps> = ({ currentUser, systemUsers, setSystemUsers }) => {
  const [selectedUserId, setSelectedUserId] = useState<string>(currentUser.id);
  const [editForm, setEditForm] = useState<Partial<User>>({});
  const [isEditing, setIsEditing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Filter users: Only show users from the same Tenant
  const tenantUsers = useMemo(() => 
    systemUsers.filter(u => u.tenantId === currentUser.tenantId),
  [systemUsers, currentUser.tenantId]);

  // 2. Determine who is being viewed/edited
  // SECURITY: If Role B, ALWAYS force targetUser to be currentUser to prevent viewing others.
  // For Role X and A, allow selection from the list.
  const targetUser = currentUser.role === 'B' 
    ? currentUser 
    : (tenantUsers.find(u => u.id === selectedUserId) || currentUser);

  const isSelf = targetUser.id === currentUser.id;

  // 3. Visibility Rules (User List)
  // Role X and A can see the list. Role B cannot.
  const showUserList = currentUser.role === 'X' || currentUser.role === 'A';

  // 4. Edit Permission Rules
  // - Admin (X) can edit anyone.
  // - Others (A, B) can only edit themselves.
  const canEdit = currentUser.role === 'X' || isSelf;

  const handleEditClick = () => {
    setEditForm({
      name: targetUser.name,
      avatar: targetUser.avatar,
      role: targetUser.role
    });
    setIsEditing(true);
  };

  const handleSave = () => {
    const updatedUsers = systemUsers.map(u => {
      if (u.id === targetUser.id) {
        return { ...u, ...editForm } as User;
      }
      return u;
    });

    setSystemUsers(updatedUsers);
    setIsEditing(false);
    setEditForm({});
  };

  const handleUserSelect = (userId: string) => {
    // Double check: Role B should not be able to switch users
    if (currentUser.role === 'B') return;
    
    setSelectedUserId(userId);
    setIsEditing(false); // Cancel edit mode when switching users
    setEditForm({});
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditForm({ ...editForm, avatar: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <UserIcon className="text-blue-600" />
            {showUserList ? 'Directorio de Usuarios' : 'Mi Perfil'}
          </h2>
          <p className="text-gray-500">
            {currentUser.role === 'X' 
              ? 'Administra perfiles y permisos.'
              : currentUser.role === 'A' 
                ? 'Visualiza usuarios del dominio y gestiona tu perfil.'
                : 'Gestiona tu información personal.'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: User List (Visible for X and A) */}
        {showUserList && (
          <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-[500px]">
            <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
              <h3 className="font-bold text-gray-700">Usuarios ({tenantUsers.length})</h3>
              <span className="text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded">
                {currentUser.tenantId}
              </span>
            </div>
            <div className="overflow-y-auto flex-1 p-2 space-y-1">
              {tenantUsers.map(user => (
                <button
                  key={user.id}
                  onClick={() => handleUserSelect(user.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left group
                    ${targetUser.id === user.id ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50 border border-transparent'}
                  `}
                >
                  <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full bg-gray-200 object-cover" />
                  <div className="overflow-hidden flex-1">
                    <div className="flex justify-between items-center">
                      <p className={`font-medium truncate text-sm ${targetUser.id === user.id ? 'text-blue-700' : 'text-gray-800'}`}>
                        {user.name}
                      </p>
                      {user.id === currentUser.id && <span className="text-[10px] bg-gray-200 text-gray-600 px-1 rounded">Tú</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border ${
                        user.role === 'X' ? 'bg-purple-50 text-purple-700 border-purple-100' :
                        user.role === 'A' ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-green-50 text-green-700 border-green-100'
                      }`}>
                        {user.role === 'X' ? 'Admin' : user.role === 'A' ? 'Portería' : 'Residente'}
                      </span>
                      {user.unit && <span className="text-[10px] text-gray-400">U:{user.unit}</span>}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Right Column: Profile Detail / Edit Form */}
        <div className={`${showUserList ? 'lg:col-span-2' : 'lg:col-span-3'} bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden`}>
          <div className="p-6 md:p-8">
            {/* Header / Avatar */}
            <div className="flex flex-col items-center mb-8">
              <div className="relative group">
                <img 
                  src={isEditing ? (editForm.avatar || targetUser.avatar) : targetUser.avatar} 
                  alt="Profile" 
                  className="w-32 h-32 rounded-full border-4 border-white shadow-lg object-cover bg-gray-200"
                />
                
                {/* Hidden File Input */}
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleImageUpload} 
                  accept="image/*"
                  className="hidden" 
                />

                {isEditing && (
                  <button 
                    onClick={triggerFileInput}
                    className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    title="Cambiar foto"
                  >
                    <Camera size={24} />
                  </button>
                )}
              </div>
              <h3 className="mt-4 text-xl font-bold text-gray-900">{targetUser.name}</h3>
              <p className="text-gray-500 text-sm">{targetUser.email}</p>
              <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-medium border border-blue-100">
                <Shield size={12} />
                {targetUser.role === 'X' ? 'Administrador' : targetUser.role === 'A' ? 'Seguridad / Portería' : `Residente ${targetUser.unit ? `(U: ${targetUser.unit})` : ''}`}
              </div>
            </div>

            {/* Read-Only Message for Role A viewing others */}
            {!canEdit && (
              <div className="mb-6 p-3 bg-yellow-50 border border-yellow-100 rounded-lg text-yellow-800 text-sm flex items-center gap-2 justify-center">
                <Lock size={16} />
                Solo lectura. No tienes permisos para editar este perfil.
              </div>
            )}

            <div className="space-y-5 max-w-lg mx-auto">
              {/* Name Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo</label>
                {isEditing ? (
                  <input 
                    type="text"
                    value={editForm.name || ''}
                    onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                    className="w-full border p-3 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <div className="p-3 bg-gray-50 rounded-lg text-gray-700 border border-gray-100">{targetUser.name}</div>
                )}
              </div>

              {/* Avatar Upload Field (Visible only in Edit Mode) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Foto de Perfil</label>
                {isEditing ? (
                  <div className="space-y-3">
                    <button 
                      onClick={triggerFileInput}
                      className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-gray-300 rounded-lg p-4 hover:bg-gray-50 hover:border-blue-300 transition-colors text-gray-500 hover:text-blue-600"
                    >
                      <Upload size={20} />
                      <span className="font-medium">Subir imagen desde galería</span>
                    </button>
                    
                    <div className="flex items-center gap-2">
                       <div className="h-px bg-gray-200 flex-1"></div>
                       <span className="text-xs text-gray-400 uppercase">O usar URL</span>
                       <div className="h-px bg-gray-200 flex-1"></div>
                    </div>

                    <div className="flex gap-2">
                      <div className="bg-gray-100 p-3 rounded-l-lg border border-r-0 border-gray-200 text-gray-400">
                        <ImageIcon size={18} />
                      </div>
                      <input 
                        type="text"
                        value={editForm.avatar || ''}
                        onChange={(e) => setEditForm({...editForm, avatar: e.target.value})}
                        className="w-full border p-3 rounded-r-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        placeholder="https://ejemplo.com/foto.jpg"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-gray-50 rounded-lg text-gray-500 border border-gray-100 text-sm truncate flex items-center gap-2">
                    <ImageIcon size={16} />
                    {targetUser.avatar?.startsWith('data:') ? 'Imagen cargada desde dispositivo' : (targetUser.avatar || 'Sin imagen')}
                  </div>
                )}
              </div>

              {/* Role Field - ONLY VISIBLE TO ADMIN (Role X) when editing */}
              {currentUser.role === 'X' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rol de Usuario</label>
                  {isEditing ? (
                     <div className="relative">
                        <select 
                          value={editForm.role}
                          onChange={(e) => setEditForm({...editForm, role: e.target.value as Role})}
                          className="w-full border p-3 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                          disabled={isSelf} // Prevent admin from demoting themselves by accident easily
                        >
                          <option value="X">X - Administrador (Dueño)</option>
                          <option value="A">A - Portería (Seguridad)</option>
                          <option value="B">B - Residente</option>
                        </select>
                        {isSelf && <p className="text-xs text-yellow-600 mt-1">No puedes cambiar tu propio rol.</p>}
                     </div>
                  ) : (
                    <div className="p-3 bg-gray-50 rounded-lg text-gray-700 border border-gray-100 flex items-center justify-between">
                       <span>
                         {targetUser.role === 'X' ? 'Administrador' : targetUser.role === 'A' ? 'Portería' : 'Residente'}
                       </span>
                    </div>
                  )}
                </div>
              )}

              {/* Actions: Only show if user has permission to edit this profile */}
              {canEdit && (
                <div className="pt-4 flex justify-end gap-3">
                  {isEditing ? (
                    <>
                      <button 
                        onClick={() => setIsEditing(false)}
                        className="px-6 py-2 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                      >
                        Cancelar
                      </button>
                      <button 
                        onClick={handleSave}
                        className="px-6 py-2 rounded-lg bg-green-600 text-white font-medium hover:bg-green-700 transition-colors flex items-center gap-2 shadow-sm"
                      >
                        <Save size={18} /> Guardar Cambios
                      </button>
                    </>
                  ) : (
                    <button 
                      onClick={handleEditClick}
                      className="w-full md:w-auto px-6 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 shadow-sm"
                    >
                      <Edit size={18} /> Editar Perfil
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;