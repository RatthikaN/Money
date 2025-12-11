import React, { useEffect, useState } from 'react';
import { Plus, RefreshCw, Power, TrendingUp, TrendingDown, Edit2, Trash2 } from 'lucide-react';
import { api, getCurrencySymbol } from '../services/api';
import { RecurringItem, User } from '../types';
import { Modal } from '../components/Modal';

export const Recurring: React.FC = () => {
  const [items, setItems] = useState<RecurringItem[]>([]);
  const [clients, setClients] = useState<User[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<RecurringItem>>({
    status: 'Active',
    frequency: 'Monthly',
    type: 'Expense'
  });
  const currency = getCurrencySymbol();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [data, clientsData] = await Promise.all([
        api.recurring.getAll(),
        api.clients.getAll()
    ]);
    setItems(data);
    setClients(clientsData);
  };

  const handleAddNew = () => {
    setEditingId(null);
    setFormData({
      status: 'Active',
      frequency: 'Monthly',
      type: 'Expense',
      nextRunDate: new Date().toISOString().split('T')[0]
    });
    setIsModalOpen(true);
  };

  const handleEdit = (item: RecurringItem) => {
    setEditingId(item.id);
    setFormData({ ...item });
    setIsModalOpen(true);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this recurring rule?")) {
      await api.recurring.delete(id);
      loadData(); // Force refresh
    }
  };

  const toggleStatus = async (item: RecurringItem) => {
    const newStatus = item.status === 'Active' ? 'Inactive' : 'Active';
    await api.recurring.update(item.id, { status: newStatus });
    loadData();
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
        if (formData.name && formData.amount) {
            if (editingId) {
                await api.recurring.update(editingId, formData);
            } else {
                await api.recurring.create(formData as any);
            }
            setIsModalOpen(false);
            loadData(); // Force refresh to show correct data from DB
        }
    } catch (e) {
        alert('Failed to save recurring item');
    }
  };

  // Explicit Number casting
  const monthlyExpense = items.filter(i => i.type === 'Expense' && i.status === 'Active').reduce((sum, i) => sum + Number(i.amount || 0), 0);
  const monthlyIncome = items.filter(i => i.type === 'Income' && i.status === 'Active').reduce((sum, i) => sum + Number(i.amount || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Recurring Rules</h1>
        <button 
          onClick={handleAddNew}
          className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={20} />
          <span>Add Rule</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
         <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm flex items-center justify-between">
           <div>
             <p className="text-xs text-gray-500 uppercase tracking-wider">Monthly Income</p>
             <p className="text-xl font-bold text-green-600">+{currency}{monthlyIncome.toLocaleString()}</p>
           </div>
           <div className="p-3 bg-green-50 text-green-600 rounded-lg">
             <TrendingUp size={24} />
           </div>
         </div>
         <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm flex items-center justify-between">
           <div>
             <p className="text-xs text-gray-500 uppercase tracking-wider">Monthly Expense</p>
             <p className="text-xl font-bold text-red-600">-{currency}{monthlyExpense.toLocaleString()}</p>
           </div>
           <div className="p-3 bg-red-50 text-red-600 rounded-lg">
             <TrendingDown size={24} />
           </div>
         </div>
         <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm flex items-center justify-between">
           <div>
             <p className="text-xs text-gray-500 uppercase tracking-wider">Net Impact</p>
             <p className={`text-xl font-bold ${monthlyIncome - monthlyExpense >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
               {monthlyIncome - monthlyExpense >= 0 ? '+' : ''}{currency}{(monthlyIncome - monthlyExpense).toLocaleString()}
             </p>
           </div>
           <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
             <RefreshCw size={24} />
           </div>
         </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-500 font-medium">
              <tr>
                <th className="px-6 py-4">Next Run</th>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Frequency</th>
                <th className="px-6 py-4 text-right">Amount</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500">{item.nextRunDate}</td>
                  <td className="px-6 py-4 font-medium text-gray-900">{item.name}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      item.type === 'Income' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {item.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-600">{item.frequency}</td>
                  <td className="px-6 py-4 text-right font-medium">{currency}{Number(item.amount).toLocaleString()}</td>
                  <td className="px-6 py-4">
                     <button 
                       onClick={() => toggleStatus(item)}
                       className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium transition-colors ${
                         item.status === 'Active' 
                           ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' 
                           : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                       }`}
                     >
                       <Power size={12} />
                       <span>{item.status}</span>
                     </button>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end space-x-2">
                      <button onClick={() => handleEdit(item)} className="p-1 text-gray-400 hover:text-blue-600"><Edit2 size={18} /></button>
                      <button onClick={(e) => handleDelete(e, item.id)} className="p-1 text-gray-400 hover:text-red-600"><Trash2 size={18} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-400">No recurring rules set.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? "Edit Rule" : "New Recurring Rule"}>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
               <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
               <select 
                 className="w-full border rounded-lg p-2 bg-white"
                 value={formData.type}
                 onChange={e => setFormData({...formData, type: e.target.value as any})}
               >
                 <option value="Expense">Expense</option>
                 <option value="Income">Income</option>
               </select>
            </div>
             <div>
               <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
               <select 
                 className="w-full border rounded-lg p-2 bg-white"
                 value={formData.frequency}
                 onChange={e => setFormData({...formData, frequency: e.target.value as any})}
               >
                 <option value="Daily">Daily</option>
                 <option value="Weekly">Weekly</option>
                 <option value="Monthly">Monthly</option>
                 <option value="Yearly">Yearly</option>
               </select>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name / Client</label>
            {formData.type === 'Income' && clients.length > 0 ? (
                <div className="space-y-2">
                    <input 
                        type="text" 
                        list="client-list-recurring"
                        className="w-full border rounded-lg p-2" 
                        placeholder="Select client or type name"
                        value={formData.name || ''}
                        onChange={e => setFormData({...formData, name: e.target.value})}
                    />
                    <datalist id="client-list-recurring">
                        {clients.map(c => <option key={c.id} value={c.name} />)}
                    </datalist>
                </div>
            ) : (
                <input 
                  type="text" 
                  className="w-full border rounded-lg p-2" 
                  placeholder="e.g. Netflix Subscription"
                  value={formData.name || ''}
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                />
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
               <label className="block text-sm font-medium text-gray-700 mb-1">Amount ({currency})</label>
               <input 
                 type="number" 
                 required
                 className="w-full border rounded-lg p-2"
                 value={formData.amount || ''}
                 onChange={e => setFormData({...formData, amount: Number(e.target.value)})}
               />
            </div>
            <div>
               <label className="block text-sm font-medium text-gray-700 mb-1">Next Run Date</label>
               <input 
                 type="date" 
                 required
                 className="w-full border rounded-lg p-2"
                 value={formData.nextRunDate || ''}
                 onChange={e => setFormData({...formData, nextRunDate: e.target.value})}
               />
            </div>
          </div>

          <div>
             <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
             <select 
               className="w-full border rounded-lg p-2 bg-white"
               value={formData.status}
               onChange={e => setFormData({...formData, status: e.target.value as any})}
             >
               <option value="Active">Active</option>
               <option value="Inactive">Inactive</option>
             </select>
          </div>

          <div className="flex justify-end pt-4 space-x-3">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
              {editingId ? 'Update Rule' : 'Create Rule'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};