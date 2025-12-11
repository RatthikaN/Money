import React, { useState, useEffect } from 'react';
import { Plus, Filter, Search, Eye, Edit2, Trash2, X, Upload, Sparkles, Loader2 } from 'lucide-react';
import { Modal } from '../components/Modal';
import { api, getCurrencySymbol } from '../services/api';
import { Expense } from '../types';
import { AiAssistant } from '../components/AiAssistant';
import { aiService } from '../services/aiService';

export const Expenses: React.FC = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const currency = getCurrencySymbol();
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isViewMode, setIsViewMode] = useState(false);
  const [formData, setFormData] = useState<Partial<Expense>>({});

  // AI Upload State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    loadExpenses();
  }, []);

  const loadExpenses = async () => {
    const data = await api.expenses.getAll();
    setExpenses(data);
  };

  const handleAddNew = () => {
    setEditingId(null);
    setIsViewMode(false);
    setFormData({});
    setPreviewUrl(null);
    setUploadError('');
    setIsModalOpen(true);
  };

  const handleEdit = (expense: Expense) => {
    setEditingId(expense.id);
    setIsViewMode(false);
    setFormData({ ...expense });
    setPreviewUrl(null);
    setUploadError('');
    setIsModalOpen(true);
  };

  const handleView = (expense: Expense) => {
    setEditingId(expense.id);
    setIsViewMode(true);
    setFormData({ ...expense });
    setPreviewUrl(null);
    setUploadError('');
    setIsModalOpen(true);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this expense?")) {
      await api.expenses.delete(id);
      loadExpenses(); // Force Refresh
    }
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
            date: extracted.date || prev.date,
            shop: extracted.client || prev.shop, // Map Client Name to Shop/Vendor
            name: extracted.paymentType || prev.name || 'Expense Entry',
            product: extracted.paymentType || prev.product,
            actualAmount: extracted.amount ? Number(extracted.amount) : prev.actualAmount,
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
    if (isViewMode) return;

    if (formData.name) {
      try {
        if (editingId) {
            await api.expenses.update(editingId, formData);
        } else {
            await api.expenses.create(formData as any);
        }
        setIsModalOpen(false);
        setFormData({});
        loadExpenses(); // Refresh from DB to get correct data
      } catch (e) {
        alert("Failed to save expense.");
      }
    }
  };

  const filteredExpenses = expenses.filter(exp => 
    (statusFilter === 'All' || exp.status === statusFilter) &&
    (exp.name.toLowerCase().includes(searchTerm.toLowerCase()) || exp.shop.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const totalActual = filteredExpenses.reduce((sum, e) => sum + Number(e.actualAmount || 0), 0);
  const totalPaid = filteredExpenses.reduce((sum, e) => sum + Number(e.paidAmount || 0), 0);
  const totalDue = filteredExpenses.reduce((sum, e) => sum + Number(e.dueAmount || 0), 0);

  const modalTitle = isViewMode ? "View Expense" : editingId ? "Edit Expense" : "Add New Expense";

  return (
    <div className="space-y-6 relative min-h-[calc(100vh-100px)]">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Expenses</h1>
        <button 
          onClick={handleAddNew}
          className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={20} />
          <span>Add Expense</span>
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
          <p className="text-xs text-gray-500 uppercase tracking-wider">Total Actual</p>
          <p className="text-xl font-bold text-gray-800">{currency}{totalActual.toLocaleString()}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
          <p className="text-xs text-gray-500 uppercase tracking-wider">Total Paid</p>
          <p className="text-xl font-bold text-green-600">{currency}{totalPaid.toLocaleString()}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
          <p className="text-xs text-gray-500 uppercase tracking-wider">Total Due</p>
          <p className="text-xl font-bold text-red-600">{currency}{totalDue.toLocaleString()}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
          <p className="text-xs text-gray-500 uppercase tracking-wider">Records</p>
          <p className="text-xl font-bold text-blue-600">{filteredExpenses.length}</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
          <input 
            type="text" 
            placeholder="Search by name or shop..." 
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
          <select 
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="All">All Status</option>
            <option value="Paid">Paid</option>
            <option value="Pending">Pending</option>
            <option value="Partial">Partial</option>
            <option value="Overdue">Overdue</option>
          </select>
          <input type="date" className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-500 font-medium">
              <tr>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Shop</th>
                <th className="px-6 py-4">Product</th>
                <th className="px-6 py-4 text-right">Actual</th>
                <th className="px-6 py-4 text-right">Paid</th>
                <th className="px-6 py-4 text-right">Due</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredExpenses.map((exp) => (
                <tr key={exp.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500">{exp.date}</td>
                  <td className="px-6 py-4 font-medium text-gray-900">{exp.name}</td>
                  <td className="px-6 py-4 text-gray-600">{exp.shop}</td>
                  <td className="px-6 py-4 text-gray-600">{exp.product}</td>
                  <td className="px-6 py-4 text-right font-medium">{currency}{Number(exp.actualAmount || 0).toLocaleString()}</td>
                  <td className="px-6 py-4 text-right text-green-600">{currency}{Number(exp.paidAmount || 0).toLocaleString()}</td>
                  <td className="px-6 py-4 text-right text-red-600">{currency}{Number(exp.dueAmount || 0).toLocaleString()}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      exp.status === 'Paid' ? 'bg-green-100 text-green-700' :
                      exp.status === 'Overdue' ? 'bg-red-100 text-red-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {exp.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-center space-x-2">
                      <button type="button" onClick={() => handleView(exp)} className="p-1 text-gray-400 hover:text-blue-600"><Eye size={18} /></button>
                      <button type="button" onClick={() => handleEdit(exp)} className="p-1 text-gray-400 hover:text-green-600"><Edit2 size={18} /></button>
                      <button type="button" onClick={(e) => handleDelete(e, exp.id)} className="p-1 text-gray-400 hover:text-red-600"><Trash2 size={18} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={modalTitle}>
        <form onSubmit={handleSave} className="space-y-4">
          
          {/* AI Auto-fill Section */}
          {!isViewMode && (
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
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input 
                required 
                disabled={isViewMode}
                type="date" 
                className="w-full border rounded-lg p-2 disabled:bg-gray-100" 
                value={formData.date || ''}
                onChange={e => setFormData({...formData, date: e.target.value})} 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select 
                disabled={isViewMode}
                className="w-full border rounded-lg p-2 disabled:bg-gray-100" 
                value={formData.status || 'Pending'}
                onChange={e => setFormData({...formData, status: e.target.value as any})}
              >
                <option value="Paid">Paid</option>
                <option value="Pending">Pending</option>
                <option value="Partial">Partial</option>
                <option value="Overdue">Overdue</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Expense Name</label>
            <input 
              required 
              disabled={isViewMode}
              type="text" 
              placeholder="e.g. Office Supplies" 
              className="w-full border rounded-lg p-2 disabled:bg-gray-100" 
              value={formData.name || ''}
              onChange={e => setFormData({...formData, name: e.target.value})} 
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Shop/Vendor</label>
              <input 
                required 
                disabled={isViewMode}
                type="text" 
                className="w-full border rounded-lg p-2 disabled:bg-gray-100" 
                value={formData.shop || ''}
                onChange={e => setFormData({...formData, shop: e.target.value})} 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Product</label>
              <input 
                type="text" 
                disabled={isViewMode}
                className="w-full border rounded-lg p-2 disabled:bg-gray-100" 
                value={formData.product || ''}
                onChange={e => setFormData({...formData, product: e.target.value})} 
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Actual ({currency})</label>
              <input 
                required 
                disabled={isViewMode}
                type="number" 
                className="w-full border rounded-lg p-2 disabled:bg-gray-100" 
                value={formData.actualAmount || ''}
                onChange={e => setFormData({...formData, actualAmount: Number(e.target.value)})} 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Paid ({currency})</label>
              <input 
                required 
                disabled={isViewMode}
                type="number" 
                className="w-full border rounded-lg p-2 disabled:bg-gray-100" 
                value={formData.paidAmount || ''}
                onChange={e => setFormData({...formData, paidAmount: Number(e.target.value)})} 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Due ({currency})</label>
              <input 
                readOnly 
                type="number" 
                className="w-full border rounded-lg p-2 bg-gray-50 text-gray-500" 
                value={(formData.actualAmount || 0) - (formData.paidAmount || 0)} 
              />
            </div>
          </div>
          <div className="flex justify-end pt-4 space-x-3">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">
              {isViewMode ? 'Close' : 'Cancel'}
            </button>
            {!isViewMode && (
              <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                {editingId ? 'Update Expense' : 'Save Expense'}
              </button>
            )}
          </div>
        </form>
      </Modal>
      <AiAssistant data={filteredExpenses} type="Expenses" />
    </div>
  );
};