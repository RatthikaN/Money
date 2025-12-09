
import React, { useEffect, useState } from 'react';
import { Shield, UserPlus, Edit2, Trash2 } from 'lucide-react';
import { api } from '../services/api';
import { User, Role } from '../types';
import { Modal } from '../components/Modal';

export const Users: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Extend User type locally to include password for the form
  const [formData, setFormData] = useState<Partial<User> & { password?: string }>({
    role: 'Manager',
    status: 'Active'
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    const data = await api.users.getAll();
    // Filter OUT clients, as they have their own page now
    setUsers(data.filter(u => u.role !== 'Client'));
  };

  const handleAddNew = () => {
    setEditingId(null);
    setFormData({ role: 'Manager', status: 'Active', password: '' });
    setIsModalOpen(true);
  };

  const handleEdit = (user: User) => {
    setEditingId(user.id);
    setFormData({ ...user, password: '' }); // Don't show existing hash
    setIsModalOpen(true);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this team member?")) {
      await api.users.delete(id);
      setUsers(prev => prev.filter(u => u.id !== id));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.name && formData.email && formData.role) {
      if (editingId) {
        // Update
        const updated = await api.users.update(editingId, formData);
        setUsers(users.map(u => u.id === editingId ? { ...u, ...updated } as User : u));
      } else {
        // Create
        const newUser = await api.users.create(formData as any);
        setUsers([...users, newUser]);
      }
      setIsModalOpen(false);
      setFormData({ role: 'Manager', status: 'Active' }); 
    }
  };

  const getRoleBadgeColor = (role: Role) => {
    switch (role) {
      case 'Admin': return 'bg-purple-100 text-purple-700';
      case 'Manager': return 'bg-blue-100 text-blue-700';
      case 'Accountant': return 'bg-indigo-100 text-indigo-700';
      case 'Auditor': return 'bg-orange-100 text-orange-700';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Internal Team Management</h1>
        <button 
          onClick={handleAddNew}
          className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <UserPlus size={20} />
          <span>Add Team Member</span>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-500 font-medium">
              <tr>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                    No internal team members found.
                  </td>
                </tr>
              ) : users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900 flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">
                      {user.name.charAt(0)}
                    </div>
                    <span>{user.name}</span>
                  </td>
                  <td className="px-6 py-4 text-gray-600">{user.email}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center w-fit gap-1 ${getRoleBadgeColor(user.role)}`}>
                      <Shield size={12} />
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      user.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end space-x-2">
                      <button type="button" onClick={() => handleEdit(user)} className="p-1 text-gray-400 hover:text-blue-600">
                        <Edit2 size={18} />
                      </button>
                      <button type="button" onClick={(e) => handleDelete(e, user.id)} className="p-1 text-gray-400 hover:text-red-600">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? "Edit Team Member" : "Add Team Member"}>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input 
              required 
              type="text" 
              className="w-full border border-gray-300 rounded-lg p-2" 
              value={formData.name || ''}
              onChange={e => setFormData({...formData, name: e.target.value})} 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
            <input 
              required 
              type="email" 
              className="w-full border border-gray-300 rounded-lg p-2" 
              value={formData.email || ''}
              onChange={e => setFormData({...formData, email: e.target.value})} 
            />
          </div>

          {/* New Password Field - Only required when creating a new user */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {editingId ? "Reset Password (Optional)" : "Password"}
            </label>
            <input 
              required={!editingId}
              type="password"
              placeholder={editingId ? "Leave blank to keep current" : "Set login password"}
              className="w-full border border-gray-300 rounded-lg p-2" 
              value={formData.password || ''}
              onChange={e => setFormData({...formData, password: e.target.value})} 
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <select 
                className="w-full border border-gray-300 rounded-lg p-2 bg-white" 
                value={formData.role}
                onChange={e => setFormData({...formData, role: e.target.value as any})}
              >
                <option value="Manager">Manager</option>
                <option value="Accountant">Accountant</option>
                <option value="Auditor">Auditor</option>
                <option value="Admin">Admin</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select 
                className="w-full border border-gray-300 rounded-lg p-2 bg-white" 
                value={formData.status}
                onChange={e => setFormData({...formData, status: e.target.value as any})}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>
          
          <div className="flex justify-end pt-4 space-x-3">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              {editingId ? 'Update Member' : 'Add Member'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
