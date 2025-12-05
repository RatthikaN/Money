
import React, { useState, useEffect } from 'react';
import { Plus, Search, Eye, Edit2, Trash2 } from 'lucide-react';
import { Modal } from '../components/Modal';
import { api, getCurrencySymbol } from '../services/api';
import { IncomingPayment, RecurringItem, User } from '../types';
import { AiAssistant } from '../components/AiAssistant';

export const Incoming: React.FC = () => {
  const [payments, setPayments] = useState<IncomingPayment[]>([]);
  const [recurringRules, setRecurringRules] = useState<RecurringItem[]>([]);
  const [clients, setClients] = useState<User[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const currency = getCurrencySymbol();

  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isViewMode, setIsViewMode] = useState(false);
  const [formData, setFormData] = useState<Partial<IncomingPayment>>({
    status: 'Pending',
    mode: 'Bank',
    date: new Date().toISOString().split('T')[0],
    paymentType: 'One Time Payment'
  });

  // Helper state to track the selected recurring rule ID explicitly
  const [selectedRecurringId, setSelectedRecurringId] = useState<string>('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [paymentsData, recurringData, clientsData] = await Promise.all([
        api.incoming.getAll(),
        api.recurring.getAll(),
        api.clients.getAll()
      ]);
      
      setPayments(paymentsData || []);
      setClients(clientsData || []);
      
      // Filter for active Income rules
      const activeRules = Array.isArray(recurringData) 
        ? recurringData.filter(r => r.type === 'Income' && r.status === 'Active') 
        : [];
      setRecurringRules(activeRules);
    } catch (e) {
      console.error("Failed to load data", e);
    }
  };

  const handleAddNew = () => {
    setEditingId(null);
    setIsViewMode(false);
    setSelectedRecurringId('');
    setFormData({
      status: 'Pending',
      mode: 'Bank',
      date: new Date().toISOString().split('T')[0],
      paymentType: 'One Time Payment'
    });
    setIsModalOpen(true);
    loadData();
  };

  const handleEdit = (payment: IncomingPayment) => {
    setEditingId(payment.id);
    setIsViewMode(false);
    // If it's recurring, we might want to try and find the matching rule ID, 
    // but usually just showing the name is enough for editing.
    setSelectedRecurringId(''); 
    setFormData({ ...payment });
    setIsModalOpen(true);
  };

  const handleView = (payment: IncomingPayment) => {
    setEditingId(payment.id);
    setIsViewMode(true);
    setFormData({ ...payment });
    setIsModalOpen(true);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this payment record?")) {
      await api.incoming.delete(id);
      loadData();
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isViewMode) return;

    if (formData.client && formData.actualAmount) {
      const clientName = formData.client.trim();
      
      // Auto-create client if "One Time Payment" and new name
      if (formData.paymentType === 'One Time Payment' && clientName) {
         const existingClient = clients.find(c => c.name.toLowerCase() === clientName.toLowerCase());
         if (!existingClient) {
            try {
              await api.clients.create({
                name: clientName,
                email: `${clientName.replace(/\s+/g, '.').toLowerCase()}@example.com`,
                status: 'Active'
              });
            } catch (err) {
              console.error("Failed to auto-create client");
            }
         }
      }

      try {
        if (editingId) {
            await api.incoming.update(editingId, formData);
        } else {
            await api.incoming.create(formData as any);
        }
        setIsModalOpen(false);
        setFormData({ status: 'Pending', mode: 'Bank', date: new Date().toISOString().split('T')[0], paymentType: 'One Time Payment' });
        loadData();
      } catch (e) {
        alert("Failed to save payment.");
      }
    }
  };

  const handleRecurringSelect = (ruleId: string) => {
    setSelectedRecurringId(ruleId);
    
    // Convert ruleId to String to ensure matching works against DB numbers
    const rule = recurringRules.find(r => String(r.id) === String(ruleId));
    
    if (rule) {
      const amount = Number(rule.amount);
      setFormData(prev => ({
        ...prev,
        client: rule.name,
        actualAmount: amount,
        paidAmount: 0,
        dueAmount: amount, // Default due is full amount
        project: 'Recurring Income',
        paymentType: 'Recurring'
      }));
    }
  };

  const filtered = payments.filter(p => 
    p.client.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.project.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const modalTitle = isViewMode ? "View Payment Details" : editingId ? "Edit Payment" : "Record New Income";

  return (
    <div className="space-y-6 relative min-h-[calc(100vh-100px)]">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Incoming Payments</h1>
        <button 
          onClick={handleAddNew}
          className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={20} />
          <span>Record Income</span>
        </button>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
          <input 
            type="text" 
            placeholder="Search client or project..." 
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select className="px-4 py-2 border border-gray-200 rounded-lg bg-white">
          <option>All Modes</option>
          <option>Bank</option>
          <option>Cash</option>
          <option>UPI</option>
        </select>
        <input type="date" className="px-4 py-2 border border-gray-200 rounded-lg" />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-500 font-medium">
              <tr>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Client</th>
                <th className="px-6 py-4">Project</th>
                <th className="px-6 py-4">Payment Type</th>
                <th className="px-6 py-4 text-right">Actual</th>
                <th className="px-6 py-4 text-right">Paid</th>
                <th className="px-6 py-4 text-right">Due</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Mode</th>
                <th className="px-6 py-4">Transaction No</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500">{item.date}</td>
                  <td className="px-6 py-4 font-medium text-gray-900">{item.client}</td>
                  <td className="px-6 py-4 text-gray-600">{item.project}</td>
                  <td className="px-6 py-4 text-gray-600">{item.paymentType || '-'}</td>
                  <td className="px-6 py-4 text-right font-medium">{currency}{Number(item.actualAmount || 0).toLocaleString()}</td>
                  <td className="px-6 py-4 text-right text-green-600">{currency}{Number(item.paidAmount || 0).toLocaleString()}</td>
                  <td className="px-6 py-4 text-right text-red-600">{currency}{Number(item.dueAmount || 0).toLocaleString()}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      item.status === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-600">{item.mode}</td>
                  <td className="px-6 py-4 text-gray-500 font-mono text-xs">{item.transactionNo || '-'}</td>
                  <td className="px-6 py-4">
                    <div className="flex justify-center space-x-2">
                      <button type="button" onClick={() => handleView(item)} className="p-1 text-gray-400 hover:text-blue-600"><Eye size={18} /></button>
                      <button type="button" onClick={() => handleEdit(item)} className="p-1 text-gray-400 hover:text-green-600"><Edit2 size={18} /></button>
                      <button type="button" onClick={(e) => handleDelete(e, item.id)} className="p-1 text-gray-400 hover:text-red-600"><Trash2 size={18} /></button>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div>
               <label className="block text-sm font-medium text-gray-700 mb-1">Payment Type</label>
               <select 
                 disabled={isViewMode}
                 className="w-full border rounded-lg p-2 bg-white disabled:bg-gray-100" 
                 value={formData.paymentType || 'One Time Payment'} 
                 onChange={e => {
                    const newType = e.target.value;
                    setFormData({...formData, paymentType: newType});
                    if (newType === 'One Time Payment') {
                        setSelectedRecurringId('');
                    }
                 }} 
               >
                 <option value="One Time Payment">One Time Payment</option>
                 <option value="Recurring">Recurring</option>
               </select>
             </div>
             <div>
               <label className="block text-sm font-medium text-gray-700 mb-1">Client Name</label>
               {formData.paymentType === 'Recurring' && !isViewMode ? (
                 <select
                   className="w-full border rounded-lg p-2 bg-indigo-50 border-indigo-200 text-indigo-900 focus:ring-2 focus:ring-indigo-500"
                   value={selectedRecurringId}
                   onChange={(e) => handleRecurringSelect(e.target.value)}
                 >
                   <option value="">-- Select Recurring Client --</option>
                   {(!recurringRules || recurringRules.length === 0) && <option disabled>No active recurring income rules found</option>}
                   {recurringRules && recurringRules.map(rule => (
                     <option key={rule.id} value={rule.id}>
                       {rule.name} - {currency}{Number(rule.amount).toLocaleString()} ({rule.frequency})
                     </option>
                   ))}
                 </select>
               ) : (
                 <>
                   <input 
                     required 
                     disabled={isViewMode}
                     type="text" 
                     list="clients-list"
                     placeholder="Select or type new client..."
                     className="w-full border rounded-lg p-2 disabled:bg-gray-100" 
                     value={formData.client || ''} 
                     onChange={e => setFormData({...formData, client: e.target.value})} 
                   />
                   <datalist id="clients-list">
                     {clients.map(client => (
                       <option key={client.id} value={client.name} />
                     ))}
                   </datalist>
                 </>
               )}
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Project</label>
              <input 
                type="text" 
                disabled={isViewMode}
                className="w-full border rounded-lg p-2 disabled:bg-gray-100" 
                value={formData.project || ''} 
                onChange={e => setFormData({...formData, project: e.target.value})} 
              />
            </div>
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
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
               <label className="block text-sm font-medium text-gray-700 mb-1">Paid ({currency})</label>
               <input 
                 type="number" 
                 disabled={isViewMode}
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
                 className="w-full border rounded-lg p-2 bg-gray-50" 
                 value={Number(formData.actualAmount || 0) - Number(formData.paidAmount || 0)} 
               />
            </div>
          </div>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input 
                  type="date" 
                  disabled={isViewMode}
                  className="w-full border rounded-lg p-2 disabled:bg-gray-100" 
                  value={formData.date || ''} 
                  onChange={e => setFormData({...formData, date: e.target.value})} 
                />
             </div>
             <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select 
                  disabled={isViewMode}
                  className="w-full border rounded-lg p-2 bg-white disabled:bg-gray-100" 
                  value={formData.status}
                  onChange={e => setFormData({...formData, status: e.target.value as any})}
                >
                  <option value="Pending">Pending</option>
                  <option value="Paid">Paid</option>
                  <option value="Partial">Partial</option>
                </select>
             </div>
          </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mode</label>
                <select 
                  disabled={isViewMode}
                  className="w-full border rounded-lg p-2 bg-white disabled:bg-gray-100"
                  value={formData.mode}
                  onChange={e => setFormData({...formData, mode: e.target.value as any})}
                >
                  <option value="Bank">Bank Transfer</option>
                  <option value="Cash">Cash</option>
                  <option value="UPI">UPI</option>
                </select>
             </div>
             <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Transaction No.</label>
                <input 
                  type="text" 
                  disabled={isViewMode}
                  className="w-full border rounded-lg p-2 disabled:bg-gray-100" 
                  value={formData.transactionNo || ''}
                  onChange={e => setFormData({...formData, transactionNo: e.target.value})}
                />
             </div>
          </div>

          <div className="flex justify-end pt-4 space-x-3">
              <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">
                {isViewMode ? 'Close' : 'Cancel'}
              </button>
              {!isViewMode && (
                <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2">
                  {editingId ? 'Update Payment' : 'Save Payment'}
                </button>
              )}
          </div>
        </form>
      </Modal>
      <AiAssistant data={filtered} type="Incoming" />
    </div>
  );
};
