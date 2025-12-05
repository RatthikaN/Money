import React, { useEffect, useState } from 'react';
import { Plus, RefreshCw, Power, TrendingUp, TrendingDown, Edit2, Trash2, Upload, Sparkles, Loader2 } from 'lucide-react';
import { api, getCurrencySymbol } from '../services/api';
import { RecurringItem } from '../types';
import { Modal } from '../components/Modal';
import { aiService } from '../services/aiService';

export const Recurring: React.FC = () => {
  const [items, setItems] = useState<RecurringItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<RecurringItem>>({
    status: 'Active',
    frequency: 'Monthly',
    type: 'Expense'
  });
  const currency = getCurrencySymbol();

  // Upload State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const data = await api.recurring.getAll();
    setItems(data);
  };

  const handleAddNew = () => {
    setEditingId(null);
    setFormData({
      status: 'Active',
      frequency: 'Monthly',
      type: 'Expense',
      nextRunDate: new Date().toISOString().split('T')[0]
    });
    setPreviewUrl(null);
    setUploadError('');
    setIsModalOpen(true);
  };

  const handleEdit = (item: RecurringItem) => {
    setEditingId(item.id);
    setFormData({ ...item });
    setPreviewUrl(null);
    setUploadError('');
    setIsModalOpen(true);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this recurring rule?")) {
      await api.recurring.delete(id);
      setItems(prev => prev.filter(i => i.id !== id));
    }
  };

  const toggleStatus = async (item: RecurringItem) => {
    const newStatus = item.status === 'Active' ? 'Inactive' : 'Active';
    await api.recurring.update(item.id, { status: newStatus });
    // Force refresh to ensure consistency
    loadData();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError('');
    setPreviewUrl(null);

    // 1. Size Validation
    const minSize = 10 * 1024; // 10KB
    const maxSize = 4 * 1024 * 1024; // 4MB

    if (file.size < minSize) {
      setUploadError('File is too small. Please upload a clear image (Min 10KB).');
      return;
    }
    if (file.size > maxSize) {
      setUploadError('File is too large. Max size is 4MB.');
      return;
    }

    // 2. Preview
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      setPreviewUrl(base64String);
      
      // 3. AI Processing
      setIsAnalyzing(true);
      try {
        const base64Data = base64String.split(',')[1];
        const extracted = await aiService.extractInvoiceDetails(base64Data, file.type);
        
        if (extracted) {
          setFormData(prev => ({
            ...prev,
            name: extracted.client || extracted.paymentType || prev.name,
            amount: extracted.amount ? Number(extracted.amount) : prev.amount,
            nextRunDate: extracted.date || prev.nextRunDate,
          }));
        }
      } catch (err) {
        setUploadError('Failed to extract data. Please enter manually.');
      } finally {
        setIsAnalyzing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.name && formData.amount) {
      if (editingId) {
        // Update
        await api.recurring.update(editingId, formData);
      } else {
        // Create
        await api.recurring.create(formData as any);
      }
      setIsModalOpen(false);
      loadData(); // Force refresh to show correct data from DB
    }
  };

  // Explicit Number casting
  const monthlyExpense = items.filter(i => i.type === 'Expense' && i.status === 'Active').reduce((sum, i) => sum + Number(i.amount || 0), 0);
  const monthlyIncome = items.filter(i => i.type === 'Income' && i.status === 'Active').reduce((sum, i) => sum + Number(i.amount || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Recurring Transactions</h1>
        <button 
          onClick={handleAddNew}
          className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={20} />
          <span>Add Recurring Rule</span>
        </button>
      </div>

      {/* Stats Dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
          <div className="p-3 bg-red-50 text-red-600 rounded-lg">
             <TrendingDown size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500">Monthly Burn (Active)</p>
            <p className="text-2xl font-bold text-gray-900">{currency}{(monthlyExpense || 0).toLocaleString()}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
          <div className="p-3 bg-green-50 text-green-600 rounded-lg">
             <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500">Fixed Income (Active)</p>
            <p className="text-2xl font-bold text-gray-900">{currency}{(monthlyIncome || 0).toLocaleString()}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-500 font-medium">
              <tr>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Frequency</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Next Run</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{item.name}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      item.type === 'Income' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {item.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-600 flex items-center gap-2">
                    <RefreshCw size={14} /> {item.frequency}
                  </td>
                  <td className="px-6 py-4 font-medium">{currency}{Number(item.amount || 0).toLocaleString()}</td>
                  <td className="px-6 py-4 text-gray-500">{item.nextRunDate}</td>
                  <td className="px-6 py-4">
                     <div className="flex items-center space-x-2">
                       <div className={`w-2 h-2 rounded-full ${item.status === 'Active' ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                       <span className="text-sm text-gray-700">{item.status}</span>
                     </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end space-x-2">
                      <button 
                        type="button"
                        onClick={() => toggleStatus(item)} 
                        className={`p-1 transition-colors ${item.status === 'Active' ? 'text-green-500 hover:text-green-600' : 'text-gray-400 hover:text-gray-600'}`}
                        title={item.status === 'Active' ? 'Deactivate' : 'Activate'}
                      >
                        <Power size={18} />
                      </button>
                      <button 
                        type="button"
                        onClick={() => handleEdit(item)} 
                        className="p-1 text-gray-400 hover:text-blue-600"
                        title="Edit"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button 
                        type="button"
                        onClick={(e) => handleDelete(e, item.id)} 
                        className="p-1 text-gray-400 hover:text-red-600"
                        title="Delete"
                      >
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

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? "Edit Recurring Rule" : "Add Recurring Rule"}>
        <form onSubmit={handleSave} className="space-y-4">
          
          <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4 mb-4">
              <label className="block text-sm font-medium text-indigo-900 mb-2">
                <span className="flex items-center gap-2"><Sparkles size={16} /> Auto-fill with AI</span>
              </label>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <label className="cursor-pointer flex items-center justify-center sm:justify-start space-x-2 bg-white border border-indigo-200 text-indigo-700 px-4 py-2 rounded-lg hover:bg-indigo-100 transition-colors w-full sm:w-auto">
                  <Upload size={16} />
                  <span>Upload Bill/Invoice</span>
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={handleFileUpload}
                  />
                </label>
                <span className="text-xs text-gray-500 text-center sm:text-left">Max 4MB. Min 10KB.</span>
              </div>
              
              {uploadError && <p className="text-xs text-red-600 mt-2">{uploadError}</p>}
              
              {isAnalyzing && (
                <div className="mt-3 flex items-center text-sm text-indigo-700">
                  <Loader2 className="animate-spin mr-2" size={16} />
                  Reading invoice details...
                </div>
              )}

              {previewUrl && !isAnalyzing && (
                <div className="mt-3 relative w-full h-32 bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                   <img src={previewUrl} alt="Preview" className="w-full h-full object-contain" />
                   <div className="absolute bottom-2 right-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded">
                      Details Extracted
                   </div>
                </div>
              )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div>
               <label className="block text-sm font-medium text-gray-700 mb-1">Rule Name</label>
               <input 
                 required 
                 type="text" 
                 placeholder="e.g. Monthly Rent"
                 className="w-full border rounded-lg p-2" 
                 value={formData.name || ''} 
                 onChange={e => setFormData({...formData, name: e.target.value})} 
               />
             </div>
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
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount ({currency})</label>
              <input 
                required 
                type="number" 
                className="w-full border rounded-lg p-2" 
                value={formData.amount || ''} 
                onChange={e => setFormData({...formData, amount: Number(e.target.value)})} 
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Next Run Date</label>
              <input 
                type="date" 
                className="w-full border rounded-lg p-2" 
                value={formData.nextRunDate || ''} 
                onChange={e => setFormData({...formData, nextRunDate: e.target.value})} 
              />
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
          </div>

          <div className="flex justify-end pt-4 space-x-3">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2">
              {isAnalyzing ? <Loader2 className="animate-spin" size={16} /> : null}
              {editingId ? 'Update Rule' : 'Save Rule'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};