import React from 'react';
import { Mail, Phone, MapPin, Download, Printer, X } from 'lucide-react';
import { IncomingPayment, User, GeneralSettings } from '../types';
import { getCurrencySymbol } from '../services/api';

interface InvoiceViewProps {
    payment: IncomingPayment;
    settings: GeneralSettings;
    onClose: () => void;
}

export const InvoiceView: React.FC<InvoiceViewProps> = ({ payment, settings, onClose }) => {
    const currency = getCurrencySymbol();

    const handlePrint = () => {
        window.print();
    };

    const calculateSubtotal = () => {
        return payment.items.reduce((sum, item) => sum + (item.amount || 0), 0);
    };

    const calculateTotalTax = () => {
        return payment.items.reduce((sum, item) => sum + (item.taxAmount || 0), 0);
    };

    // Helper to split tax for Indian GST (CGST/SGST)
    // Assuming 50/50 split if tax exists
    const getGstSplit = () => {
        const totalTax = calculateTotalTax();
        return totalTax / 2;
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 print:p-0 print:bg-white">
            <div className="bg-white w-full max-w-4xl max-h-[95vh] overflow-y-auto rounded-2xl shadow-2xl flex flex-col print:shadow-none print:max-h-full print:rounded-none">

                {/* Header - Actions */}
                <div className="flex items-center justify-between p-4 border-b print:hidden">
                    <h2 className="text-lg font-bold text-gray-800">Invoice Preview</h2>
                    <div className="flex items-center gap-2">
                        <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-bold text-sm shadow-lg shadow-indigo-100">
                            <Printer size={18} />
                            Print Invoice
                        </button>
                        <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100">
                            <X size={24} />
                        </button>
                    </div>
                </div>

                {/* Invoice Content */}
                <div className="p-8 md:p-12 space-y-8 print:p-0" id="invoice-content">
                    {/* Top Branding & Invoice Meta */}
                    <div className="flex flex-col md:flex-row justify-between items-start gap-8">
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-black text-2xl">
                                    {settings.companyName?.charAt(0) || 'B'}
                                </div>
                                <h1 className="text-3xl font-black text-gray-900 tracking-tight uppercase">
                                    {settings.companyName || 'Your Business Name'}
                                </h1>
                            </div>
                            <div className="text-sm text-gray-500 space-y-1 font-medium">
                                <p className="flex items-center gap-2"><MapPin size={14} /> {settings.address || 'Business Address'}</p>
                                <p className="flex items-center gap-2"><Phone size={14} /> {settings.phoneNumber || 'Phone Number'}</p>
                                <p className="flex items-center gap-2"><Mail size={14} /> {settings.email || 'Email Address'}</p>
                            </div>
                        </div>
                        <div className="text-right space-y-1">
                            <h2 className="text-5xl font-black text-gray-900 uppercase tracking-tighter opacity-10">INVOICE</h2>
                            <div className="pt-4 space-y-1 text-sm">
                                <p className="font-bold text-gray-900">Invoice Number: <span className="text-gray-500 font-medium">INV-{payment.id?.slice(0, 8).toUpperCase() || 'NEW'}</span></p>
                                <p className="font-bold text-gray-900">Date: <span className="text-gray-500 font-medium">{payment.date}</span></p>
                                <p className="inline-block mt-2 bg-indigo-900 text-white px-4 py-1 rounded-sm text-xs font-bold font-mono">
                                    GSTIN: {settings.taxId || 'NOT PROVIDED'}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-y py-8 border-gray-100">
                        <div>
                            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">BILL TO</h3>
                            <div className="space-y-1">
                                <p className="text-xl font-black text-gray-900 leading-tight">{payment.client}</p>
                                <p className="text-sm text-gray-500 font-medium">{payment.project || 'Project Collaboration'}</p>
                            </div>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-indigo-900 text-white">
                                <tr>
                                    <th className="px-4 py-3 text-left font-bold uppercase tracking-wider w-12">#</th>
                                    <th className="px-4 py-3 text-left font-bold uppercase tracking-wider">Description of Goods/Services</th>
                                    <th className="px-4 py-3 text-center font-bold uppercase tracking-wider">HSN/SAC</th>
                                    <th className="px-4 py-3 text-center font-bold uppercase tracking-wider">Qty</th>
                                    <th className="px-4 py-3 text-right font-bold uppercase tracking-wider">Rate</th>
                                    <th className="px-4 py-3 text-right font-bold uppercase tracking-wider">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {payment.items?.map((item, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-4 py-4 text-gray-500 font-bold">{idx + 1}</td>
                                        <td className="px-4 py-4">
                                            <p className="font-black text-gray-900">{item.product}</p>
                                            <p className="text-[10px] text-gray-400 font-bold uppercase">{item.taxType} Tax ({item.taxRate}%)</p>
                                        </td>
                                        <td className="px-4 py-4 text-center text-gray-600 font-mono">{item.hsnSac || '1001'}</td>
                                        <td className="px-4 py-4 text-center font-bold text-gray-900">{item.quantity}</td>
                                        <td className="px-4 py-4 text-right text-gray-600">{currency}{item.rate.toLocaleString()}</td>
                                        <td className="px-4 py-4 text-right font-bold text-gray-900">{currency}{item.amount.toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Totals */}
                    <div className="flex justify-end pt-4">
                        <div className="w-full max-w-xs space-y-3">
                            <div className="flex justify-between text-sm items-center">
                                <span className="text-gray-500 font-bold uppercase tracking-wider">Subtotal:</span>
                                <span className="text-gray-900 font-black">{currency}{calculateSubtotal().toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-sm items-center">
                                <span className="text-gray-500 font-bold uppercase tracking-wider">CGST ({(payment.items?.[0]?.taxRate || 0) / 2}%):</span>
                                <span className="text-gray-900 font-black">{currency}{getGstSplit().toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-sm items-center">
                                <span className="text-gray-500 font-bold uppercase tracking-wider">SGST ({(payment.items?.[0]?.taxRate || 0) / 2}%):</span>
                                <span className="text-gray-900 font-black">{currency}{getGstSplit().toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center p-4 bg-indigo-900 text-white rounded-lg shadow-lg">
                                <span className="text-xs font-bold uppercase tracking-widest">Grand Total:</span>
                                <span className="text-2xl font-black">{currency}{payment.actualAmount.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>

                    {/* Footer Info */}
                    <div className="pt-12 grid grid-cols-1 md:grid-cols-2 gap-12 items-end">
                        <div className="space-y-4">
                            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 text-center border-b pb-2">Authorized Signatory</h4>
                                <div className="h-16 flex items-center justify-center italic text-gray-300 font-serif text-2xl opacity-50">
                                    Signature
                                </div>
                            </div>
                            <p className="text-[10px] font-bold text-gray-400 text-center">Thank you for your business!</p>
                        </div>

                        <div className="text-[10px] font-bold text-gray-400 italic text-right leading-relaxed">
                            Note: This is a computer generated invoice and does not require a physical signature unless otherwise specified.
                        </div>
                    </div>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
        @media print {
          body * { visibility: hidden; }
          #invoice-content, #invoice-content * { visibility: visible; }
          #invoice-content { position: absolute; left: 0; top: 0; width: 100%; padding: 0 !important; }
        }
      `}} />
        </div>
    );
};
