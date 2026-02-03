import React, { useState, useEffect } from 'react';
import { Plus, Search, Eye, Edit2, Trash2, X, Upload, Paperclip, FileText, Sparkles, Loader2, Key, AlertTriangle } from 'lucide-react';
import { Modal } from '../components/Modal';
import { api, useCurrency, compressImage } from '../services/api';
import { Expense, ExpenseItem, Attachment } from '../types';
import { aiService } from '../services/aiService';

const sanitizeAmount = (val: any): number => {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  const cleaned = String(val).replace(/[^0-9.]/g, '');
  return parseFloat(cleaned) || 0;
};

const normalizeDate = (dateStr: string | null): string => {
  if (!dateStr) return new Date().toISOString().split('T')[0];
  try {
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
    const ddmmyyyy = dateStr.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
    if (ddmmyyyy) {
      const [_, d, m, y] = ddmmyyyy;
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  } catch (e) {
    console.error("Date normalization failed for:", dateStr);
  }
  return new Date().toISOString().split('T')[0];
};

export const Expenses: React.FC = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const currency = useCurrency();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isViewMode, setIsViewMode] = useState(false);
  const [formData, setFormData] = useState<Partial<Expense>>({});
  const [items, setItems] = useState<ExpenseItem[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

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
    setFormData({ date: new Date().toISOString().split('T')[0], status: 'Pending' });
    setItems([{ product: '', amount: 0, tax: 0, subtotal: 0, paid: 0, due: 0 }]); 
    setAttachments([]);
    setIsModalOpen(true);
  };

  const handleEdit = (expense: Expense) => {
    setEditingId(expense.id);
    setIsViewMode(false);
    setFormData({ ...expense });
    setItems(expense.items && expense.items.length > 0 ? expense.items : [{ product: '', amount: 0, tax: 0, subtotal: 0, paid: 0, due: 0 }]);
    setAttachments(expense.attachments ? expense.attachments.map(att => typeof att === 'string' ? { name: att, data: '', type: 'file' } : att) : []);
    setIsModalOpen(true);
  };

  const handleView = (expense: Expense) => {
    setEditingId(expense.id);
    setIsViewMode(true);
    setFormData({ ...expense });
    setItems(expense.items && expense.items.length > 0 ? expense.items : []);
    setAttachments(expense.attachments ? expense.attachments.map(att => typeof att === 'string' ? { name: att, data: '', type: 'file' } : att) : []);
    setIsModalOpen(true);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault(); e.stopPropagation();
    if (window.confirm("Delete this expense?")) { await api.expenses.delete(id); loadExpenses(); }
  };

  const handleItemChange = (index: number, field: keyof ExpenseItem, value: any) => {
    const newItems = [...items];
    const item = { ...newItems[index] };
    (item as any)[field] = value;
    const amount = sanitizeAmount(item.amount);
    const tax = sanitizeAmount(item.tax);
    const paid = sanitizeAmount(item.paid);
    const taxAmount = (amount * tax) / 100;
    item.subtotal = amount + taxAmount;
    item.due = item.subtotal - paid;
    newItems[index] = item;
    setItems(newItems);
    calculateGlobalTotals(newItems);
  };

  const calculateGlobalTotals = (currentItems: ExpenseItem[]) => {
    const totalActual = currentItems.reduce((sum, item) => sum + (item.subtotal || 0), 0);
    const totalPaid = currentItems.reduce((sum, item) => sum + (item.paid || 0), 0);
    setFormData(prev => ({ ...prev, actualAmount: totalActual, paidAmount: totalPaid, dueAmount: totalActual - totalPaid }));
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files) as File[];
      const newAttachments: Attachment[] = [];
      let candidateForAnalysis: Attachment | null = null;
      setIsAnalyzing(true);
      try {
        for (const file of filesArray) {
          if (file.size > 20 * 1024 * 1024) {
            alert(`File ${file.name} is too large. Max size per file is 20MB.`);
            continue;
          }
          const base64Data = await compressImage(file);
          const attachment: Attachment = { name: file.name, data: base64Data, type: file.type };
          newAttachments.push(attachment);
          if (!candidateForAnalysis && (file.type.startsWith('image/') || file.type === 'application/pdf')) {
            candidateForAnalysis = attachment;
          }
        }
        
        const combined = [...attachments, ...newAttachments];
        const totalSize = combined.reduce((sum, a) => sum + a.data.length, 0);
        if (totalSize > 80 * 1024 * 1024) {
           alert("Total attachment size is too large. Please remove some files.");
           setIsAnalyzing(false);
           return;
        }

        setAttachments(combined);
        if (candidateForAnalysis) {
          const rawBase64Data = candidateForAnalysis.data.split(',')[1];
          const extracted = await aiService.extractInvoiceDetails(rawBase64Data, candidateForAnalysis.type);
          if (extracted) {
            const normalizedDate = normalizeDate(extracted.date);
            const shopName = extracted.shop || 'Vendor';
            const expenseName = extracted.shop ? `${extracted.shop} Purchase` : 'AI Extracted Expense';
            let aiItems: ExpenseItem[] = [];
            if (extracted.items && extracted.items.length > 0) {
              aiItems = extracted.items.map((i: any) => ({
                product: i.product || 'Item',
                amount: sanitizeAmount(i.amount),
                tax: 0,
                subtotal: sanitizeAmount(i.amount),
                paid: 0,
                due: sanitizeAmount(i.amount)
              }));
            } else if (extracted.totalAmount) {
              aiItems = [{
                product: 'Grand Total (Extracted)',
                amount: sanitizeAmount(extracted.totalAmount),
                tax: 0,
                subtotal: sanitizeAmount(extracted.totalAmount),
                paid: 0,
                due: sanitizeAmount(extracted.totalAmount)
              }];
            }
            const finalItems = aiItems.length > 0 ? aiItems : [{ product: '', amount: 0, tax: 0, subtotal: 0, paid: 0, due: 0 }];
            setItems(finalItems);
            const totalActual = finalItems.reduce((sum, item) => sum + (item.subtotal || 0), 0);
            setFormData(prev => ({
              ...prev,
              shop: shopName,
              date: normalizedDate,
              name: expenseName,
              actualAmount: totalActual,
              paidAmount: 0,
              dueAmount: totalActual,
              status: 'Pending'
            }));
          }
        }
      } catch (err: any) {
        console.error("Extraction error:", err);
      } finally {
        setIsAnalyzing(false);
        if (e.target) e.target.value = ''; 
      }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isViewMode) return;
    const totalActual = items.reduce((sum, item) => sum + (item.subtotal || 0), 0);
    const totalPaid = items.reduce((sum, item) => sum + (item.paid || 0), 0);
    const payload = { ...formData, actualAmount: totalActual, paidAmount: totalPaid, dueAmount: totalActual - totalPaid, items, attachments };
    if (payload.name) {
      try {
        if (editingId) { await api.expenses.update(editingId, payload); }
        else { await api.expenses.create(payload as any); }
        setIsModalOpen(false); loadExpenses();
      } catch (e: any) { alert(e.message); }
    }
  };

  const filteredExpenses = expenses.filter(exp => 
    (statusFilter === 'All' || exp.status === statusFilter) &&
    (exp.name.toLowerCase().includes(searchTerm.toLowerCase()) || exp.shop.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6 relative min-h-[calc(100vh-100px)]">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Expenses</h1>
        <div className="flex gap-2 w-full sm:w-auto">
          <button onClick={handleAddNew} className="flex-1 sm:flex-none flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors font-bold shadow-lg shadow-blue-100">
            <Plus size={20} />
            <span>Add Expense</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
          <p className="text-xs text-gray-500 uppercase tracking-wider font-bold">Total Actual</p>
          <p className="text-lg md:text-xl font-bold text-gray-800 truncate">{currency}{filteredExpenses.reduce((sum, e) => sum + Number(e.actualAmount || 0), 0).toLocaleString()}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
          <p className="text-xs text-gray-500 uppercase tracking-wider font-bold">Total Paid</p>
          <p className="text-lg md:text-xl font-bold text-green-600 truncate">{currency}{filteredExpenses.reduce((sum, e) => sum + Number(e.paidAmount || 0), 0).toLocaleString()}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
          <p className="text-xs text-gray-500 uppercase tracking-wider font-bold">Total Due</p>
          <p className="text-lg md:text-xl font-bold text-red-600 truncate">{currency}{filteredExpenses.reduce((sum, e) => sum + Number(e.dueAmount || 0), 0).toLocaleString()}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
          <p className="text-xs text-gray-500 uppercase tracking-wider font-bold">Records</p>
          <p className="text-lg md:text-xl font-bold text-blue-600 truncate">{filteredExpenses.length}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-[10px]">
              <tr>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Shop</th>
                <th className="px-6 py-4 text-right">Actual</th>
                <th className="px-6 py-4 text-right">Paid</th>
                <th className="px-6 py-4 text-right">Due</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredExpenses.map((exp) => (
                <tr key={exp.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500">{exp.date}</td>
                  <td className="px-6 py-4 font-bold text-gray-900 whitespace-nowrap">{exp.name}</td>
                  <td className="px-6 py-4 text-gray-600 whitespace-nowrap">{exp.shop}</td>
                  <td className="px-6 py-4 text-right font-medium whitespace-nowrap">{currency}{Number(exp.actualAmount || 0).toLocaleString()}</td>
                  <td className="px-6 py-4 text-right text-green-600 font-bold whitespace-nowrap">{currency}{Number(exp.paidAmount || 0).toLocaleString()}</td>
                  <td className="px-6 py-4 text-right text-red-600 font-bold whitespace-nowrap">{currency}{Number(exp.dueAmount || 0).toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      exp.status === 'Paid' ? 'bg-green-100 text-green-700' :
                      exp.status === 'Overdue' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                    }`}>{exp.status}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <button onClick={() => handleView(exp)} className="p-1 text-gray-400 hover:text-indigo-600"><Eye size={18} /></button>
                    <button onClick={() => handleEdit(exp)} className="p-1 text-gray-400 hover:text-green-600"><Edit2 size={18} /></button>
                    <button onClick={(e) => handleDelete(e, exp.id)} className="p-1 text-gray-400 hover:text-red-600"><Trash2 size={18} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={isViewMode ? "View Expense" : editingId ? "Modify Expense" : "Record New Expense"}>
        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div>
               <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Expense Name</label>
               <input required disabled={isViewMode} type="text" className="w-full border border-gray-200 rounded-xl p-3 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all disabled:bg-gray-50" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} />
             </div>
             <div>
               <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Vendor/Shop</label>
               <input required disabled={isViewMode} type="text" className="w-full border border-gray-200 rounded-xl p-3 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all disabled:bg-gray-50" value={formData.shop || ''} onChange={e => setFormData({...formData, shop: e.target.value})} />
             </div>
             <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Date</label>
                <input required disabled={isViewMode} type="date" className="w-full border border-gray-200 rounded-xl p-3 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all disabled:bg-gray-50" value={formData.date || ''} onChange={e => setFormData({...formData, date: e.target.value})} />
             </div>
             <div>
               <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Status</label>
               <select disabled={isViewMode} className="w-full border border-gray-200 rounded-xl p-3 bg-white disabled:bg-gray-50 font-bold" value={formData.status || 'Pending'} onChange={e => setFormData({...formData, status: e.target.value as any})}>
                  <option value="Paid">Paid</option>
                  <option value="Pending">Pending</option>
                  <option value="Partial">Partial</option>
                  <option value="Overdue">Overdue</option>
                </select>
             </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Receipts / Attachments</label>
                {isAnalyzing && (
                  <div className="flex items-center gap-2">
                    <Loader2 size={12} className="animate-spin text-indigo-600" />
                    <span className="text-[10px] font-bold text-indigo-600 animate-pulse flex items-center gap-1"><Sparkles size={12} /> AI Extraction...</span>
                  </div>
                )}
            </div>
            {!isViewMode && (
              <label className={`flex items-center gap-2 px-5 py-2.5 border rounded-xl cursor-pointer transition-all w-full md:w-auto justify-center md:inline-flex mb-3 shadow-sm ${isAnalyzing ? 'bg-indigo-100 border-indigo-200 text-indigo-400 pointer-events-none' : 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100'}`}>
                {isAnalyzing ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                <span className="text-sm font-bold">{isAnalyzing ? 'Analyzing Document...' : 'Upload & Extract Details'}</span>
                <input type="file" multiple accept="image/*,application/pdf" className="hidden" onChange={handleFileSelect} disabled={isAnalyzing} />
              </label>
            )}
            <div className="flex flex-wrap gap-2">
              {attachments.map((file, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-gray-100 px-3 py-1.5 rounded-full text-xs font-medium border border-gray-200">
                  {file.type === 'application/pdf' ? <FileText size={12} className="text-red-500" /> : <Paperclip size={12} className="text-gray-400" />}
                  <span className="text-gray-700 max-w-[150px] truncate">{file.name}</span>
                  {!isViewMode && <button type="button" onClick={() => setAttachments(attachments.filter((_, i) => i !== idx))} className="text-gray-400 hover:text-red-500"><X size={12} /></button>}
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-3">
               <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Itemized Bill</h3>
               {!isViewMode && <button type="button" onClick={() => setItems([...items, { product: '', amount: 0, tax: 0, subtotal: 0, paid: 0, due: 0 }])} className="text-xs font-bold text-indigo-600 flex items-center gap-1 hover:bg-indigo-50 px-2 py-1 rounded-lg"><Plus size={14} /> Add Line</button>}
            </div>
            <div className="border border-gray-100 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-400 text-[10px] font-black uppercase">
                  <tr>
                    <th className="px-3 py-2.5">Product</th>
                    <th className="px-3 py-2.5 w-24">Amount</th>
                    <th className="px-3 py-2.5 w-20">Tax %</th>
                    <th className="px-3 py-2.5 w-24">Subtotal</th>
                    <th className="px-3 py-2.5 w-24">Paid</th>
                    {!isViewMode && <th className="px-3 py-2.5 w-10"></th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {items.map((item, index) => (
                    <tr key={index}>
                      <td className="px-3 py-2"><input disabled={isViewMode} type="text" className="w-full bg-transparent border-none focus:ring-0 p-0 text-sm font-medium" placeholder="Item name" value={item.product} onChange={e => handleItemChange(index, 'product', e.target.value)} /></td>
                      <td className="px-3 py-2"><input disabled={isViewMode} type="number" className="w-full bg-transparent border-none focus:ring-0 p-0 text-sm" value={item.amount} onChange={e => handleItemChange(index, 'amount', e.target.value)} /></td>
                      <td className="px-3 py-2"><input disabled={isViewMode} type="number" className="w-full bg-transparent border-none focus:ring-0 p-0 text-sm" value={item.tax} onChange={e => handleItemChange(index, 'tax', e.target.value)} /></td>
                      <td className="px-3 py-2 font-bold text-gray-900">{currency}{item.subtotal?.toFixed(2)}</td>
                      <td className="px-3 py-2"><input disabled={isViewMode} type="number" className="w-full bg-transparent border-none focus:ring-0 p-0 text-sm text-green-600 font-bold" value={item.paid} onChange={e => handleItemChange(index, 'paid', e.target.value)} /></td>
                      {!isViewMode && <td className="px-3 py-2 text-center"><button type="button" onClick={() => setItems(items.filter((_, i) => i !== index))} className="text-gray-300 hover:text-red-500"><Trash2 size={14} /></button></td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end pt-4 gap-3">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 text-gray-500 font-bold hover:bg-gray-100 rounded-xl transition-all">{isViewMode ? 'Dismiss' : 'Cancel'}</button>
            {!isViewMode && <button type="submit" className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all font-bold shadow-lg shadow-indigo-100">{editingId ? 'Update Record' : 'Commit Expense'}</button>}
          </div>
        </form>
      </Modal>
    </div>
  );
};