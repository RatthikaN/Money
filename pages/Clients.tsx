
import React, { useEffect, useState } from 'react';
import { Briefcase, UserPlus, Edit2, Trash2 } from 'lucide-react';
import { api } from '../services/api';
import { User } from '../types';
import { Modal } from '../components/Modal';

export const Clients: React.FC = () => {
  const [clients, setClients] = useState<User[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<User>>({
    role: 'Client',
    status: 'Active'
  });

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    const data = await api.clients.getAll();
    setClients(data);
  };

  const handleAddNew = () => {
    setEditingId(null);
    setFormData({ role: 'Client', status: 'Active' });
    setIsModalOpen(true);
  };

  const handleEdit = (user: User) => {
    setEditingId(user.id);
    setFormData({ ...user });
    setIsModalOpen(true);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this client?")) {
      await api.clients.delete(id);
      setClients(prev => prev.filter(c => c.id !== id));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.name && formData.email) {
      if (editingId) {
        // Update
        const updated = await api.clients.update(editingId, formData);
        setClients(clients.map(c => c.id === editingId ? { ...c, ...updated } as User : c));
      } else {
        // Create
        const newClient = await api.clients.create(formData as any);
        setClients([...clients, newClient]);
      }
      setIsModalOpen(false);
      setFormData({ role: 'Client', status: 'Active' }); 
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Client Management</h1>
        <button 
          onClick={handleAddNew}
          className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <UserPlus size={20} />
          <span>Add New Client</span>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-gray-500 font-medium">
            <tr>
              <th className="px-6 py-4">Client Name</th>
              <th className="px-6 py-4">Contact Email</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {clients.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-gray-400">
                   No clients found. Add one to get started.
                </td>
              </tr>
            ) : clients.map((client) => (
              <tr key={client.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-medium text-gray-900 flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center font-bold text-xs">
                    {client.name.charAt(0)}
                  </div>
                  <span>{client.name}</span>
                </td>
                <td className="px-6 py-4 text-gray-600">{client.email}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    client.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {client.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end space-x-2">
                    <button type="button" onClick={() => handleEdit(client)} className="p-1 text-gray-400 hover:text-green-600">
                      <Edit2 size={18} />
                    </button>
                    <button type="button" onClick={(e) => handleDelete(e, client.id)} className="p-1 text-gray-400 hover:text-red-600">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? "Edit Client" : "Add New Client"}>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Client / Company Name</label>
            <input 
              required 
              type="text" 
              className="w-full border border-gray-300 rounded-lg p-2" 
              value={formData.name || ''}
              onChange={e => setFormData({...formData, name: e.target.value})} 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contact Email</label>
            <input 
              required 
              type="email" 
              className="w-full border border-gray-300 rounded-lg p-2" 
              value={formData.email || ''}
              onChange={e => setFormData({...formData, email: e.target.value})} 
            />
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
          
          <div className="flex justify-end pt-4 space-x-3">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
              {editingId ? 'Update Client' : 'Add Client'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
