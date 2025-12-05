
import React, { useState, useRef } from 'react';
import { Download, FileText, Printer, FileSpreadsheet, Loader2 } from 'lucide-react';
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { api, getCurrencySymbol } from '../services/api';
import { Expense, IncomingPayment } from '../types';

export const Reports: React.FC = () => {
  const [reportType, setReportType] = useState('Profit & Loss');
  const [dateRange, setDateRange] = useState('This Month');
  const [reportData, setReportData] = useState<any>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);
  const currency = getCurrencySymbol();

  const fetchRealData = async () => {
    // 1. Fetch ALL real data
    const [expenses, incoming] = await Promise.all([
      api.expenses.getAll(),
      api.incoming.getAll()
    ]);
    
    return { expenses, incoming };
  };

  const filterByDate = (items: any[], dateField: string, range: string) => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return items.filter(item => {
      const itemDate = new Date(item[dateField]);
      const itemMonth = itemDate.getMonth();
      const itemYear = itemDate.getFullYear();

      if (range === 'This Month') return itemMonth === currentMonth && itemYear === currentYear;
      if (range === 'Last Month') {
         const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
         const yearOfLastMonth = currentMonth === 0 ? currentYear - 1 : currentYear;
         return itemMonth === lastMonth && itemYear === yearOfLastMonth;
      }
      if (range === 'This Year') return itemYear === currentYear;
      return true; // All time
    });
  };

  const handleGeneratePreview = async () => {
    setReportData(null); // Reset
    const { expenses, incoming } = await fetchRealData();
    
    // Filter data based on range
    const filteredExpenses = filterByDate(expenses, 'date', dateRange);
    const filteredIncoming = filterByDate(incoming, 'date', dateRange);

    if (reportType === 'Balance Sheet') {
      // Calculate Real Balance Sheet Metrics
      const totalIncomePaid = incoming.reduce((acc, i) => acc + (i.paidAmount || 0), 0);
      const totalExpensesPaid = expenses.reduce((acc, i) => acc + (i.paidAmount || 0), 0);
      
      const cashOnHand = totalIncomePaid - totalExpensesPaid;
      const accountsReceivable = incoming.reduce((acc, i) => acc + ((i.actualAmount || 0) - (i.paidAmount || 0)), 0);
      const accountsPayable = expenses.reduce((acc, i) => acc + ((i.actualAmount || 0) - (i.paidAmount || 0)), 0);
      
      // Simplified Equity: Assets - Liabilities
      const totalAssets = cashOnHand + accountsReceivable;
      const totalLiabilities = accountsPayable;
      const equity = totalAssets - totalLiabilities;

      setReportData({
        type: 'Balance Sheet',
        period: dateRange + ' (Real-time)',
        assets: totalAssets,
        liabilities: totalLiabilities,
        equity: equity,
        breakdown: [
           { category: 'Cash / Bank (Received - Paid)', amount: cashOnHand },
           { category: 'Accounts Receivable (Due Income)', amount: accountsReceivable },
           { category: 'Accounts Payable (Due Expenses)', amount: accountsPayable },
        ]
      });
    } else if (reportType === 'Incoming') {
        // Just list the incoming records
        setReportData({
            type: 'Incoming Report',
            period: dateRange,
            items: filteredIncoming,
            total: filteredIncoming.reduce((sum: number, i: any) => sum + (i.actualAmount || 0), 0)
        });
    } else if (reportType === 'Expenses') {
        // Just list the expense records
        setReportData({
            type: 'Expenses Report',
            period: dateRange,
            items: filteredExpenses,
            total: filteredExpenses.reduce((sum: number, i: any) => sum + (i.actualAmount || 0), 0)
        });
    } else {
      // Profit & Loss (Default)
      const totalIncome = filteredIncoming.reduce((acc, i) => acc + (i.actualAmount || 0), 0);
      const totalExpense = filteredExpenses.reduce((acc, i) => acc + (i.actualAmount || 0), 0);
      
      // Group Income by Client
      const incomeByClient: Record<string, number> = {};
      filteredIncoming.forEach(i => {
          const client = i.client || 'Unknown';
          incomeByClient[client] = (incomeByClient[client] || 0) + (i.actualAmount || 0);
      });

      // Group Expenses by Shop (as category proxy)
      const expensesByShop: Record<string, number> = {};
      filteredExpenses.forEach(e => {
          const shop = e.shop || 'Unknown';
          expensesByShop[shop] = (expensesByShop[shop] || 0) + (e.actualAmount || 0);
      });

      setReportData({
        type: 'Profit & Loss',
        period: dateRange,
        totalIncome: totalIncome,
        totalExpenses: totalExpense,
        netProfit: totalIncome - totalExpense,
        incomeBreakdown: incomeByClient,
        expenseBreakdown: expensesByShop,
        detailedIncome: filteredIncoming,
        detailedExpenses: filteredExpenses
      });
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = async () => {
    if (!reportData) return alert("Please generate a preview first.");
    if (!reportRef.current) return;

    setIsGeneratingPdf(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 100));
      const canvas = await html2canvas(reportRef.current, { scale: 2, logging: false, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${reportData.type.replace(/\s+/g, '_')}_${dateRange.replace(/\s+/g, '_')}.pdf`);
    } catch (error) {
      alert("Failed to generate PDF.");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleExportCSV = () => {
    if (!reportData) return alert("Please generate a preview first.");
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += `Report Type,${reportData.type}\nPeriod,${reportData.period}\n\n`;

    if (reportData.type === 'Balance Sheet') {
      csvContent += "Category,Amount\n";
      reportData.breakdown.forEach((row: any) => csvContent += `${row.category},${row.amount}\n`);
      csvContent += `Total Assets,${reportData.assets}\nTotal Liabilities,${reportData.liabilities}\nTotal Equity,${reportData.equity}\n`;
    } else if (reportData.items) {
      // Expenses or Incoming List
      const headers = Object.keys(reportData.items[0] || {}).join(",");
      csvContent += `${headers}\n`;
      reportData.items.forEach((item: any) => {
        csvContent += Object.values(item).join(",") + "\n";
      });
    } else {
      csvContent += `Total Income,${reportData.totalIncome}\nTotal Expenses,${reportData.totalExpenses}\nNet Profit,${reportData.netProfit}\n`;
      // Detailed rows could be added here for CSV if desired
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Financial Reports</h1>
        <div className="flex space-x-2 w-full sm:w-auto">
           <button onClick={handlePrint} className="flex-1 sm:flex-none flex items-center justify-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-700 hover:bg-gray-50">
             <Printer size={18} /> <span>Print</span>
           </button>
           <button onClick={handleExportCSV} className="flex-1 sm:flex-none flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
             <FileSpreadsheet size={18} /> <span>Excel</span>
           </button>
           <button onClick={handleExportPDF} disabled={isGeneratingPdf} className="flex-1 sm:flex-none flex items-center justify-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-70">
             {isGeneratingPdf ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />} <span>PDF</span>
           </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
             <label className="block text-sm font-medium text-gray-700 mb-1">Report Type</label>
             <select className="w-full border border-gray-300 rounded-lg p-2 bg-white" value={reportType} onChange={(e) => setReportType(e.target.value)}>
               <option>Profit & Loss</option>
               <option>Balance Sheet</option>
               <option>Incoming</option>
               <option>Expenses</option>
             </select>
          </div>
          <div>
             <label className="block text-sm font-medium text-gray-700 mb-1">Period</label>
             <select className="w-full border border-gray-300 rounded-lg p-2 bg-white" value={dateRange} onChange={(e) => setDateRange(e.target.value)}>
               <option>This Month</option>
               <option>Last Month</option>
               <option>This Year</option>
               <option>All Time</option>
             </select>
          </div>
          <div className="flex items-end">
            <button onClick={handleGeneratePreview} className="w-full bg-gray-900 text-white py-2 rounded-lg hover:bg-gray-800 flex items-center justify-center space-x-2">
              <FileText size={18} /> <span>Generate Real-time Preview</span>
            </button>
          </div>
        </div>
      </div>

      {reportData ? (
        <div className="space-y-6">
           <div ref={reportRef} className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 print:p-0">
             <div className="border-b border-gray-100 pb-4 mb-6 flex justify-between items-center">
               <div>
                  <h3 className="text-xl font-bold text-gray-900">{reportData.type}</h3>
                  <p className="text-gray-500">Period: {reportData.period}</p>
               </div>
               {reportData.type === 'Profit & Loss' && (
                 <div className="text-right">
                    <p className="text-sm text-gray-500">Net Profit</p>
                    <p className={`text-2xl font-bold ${reportData.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {currency}{(reportData.netProfit || 0).toLocaleString()}
                    </p>
                 </div>
               )}
             </div>

             {/* Tables depending on type */}
             {reportData.type === 'Incoming' || reportData.type === 'Expenses' ? (
                 <table className="w-full text-sm text-left border-collapse">
                     <thead className="bg-gray-50 text-gray-600 border-b border-gray-200">
                         <tr>
                             <th className="px-4 py-3">Date</th>
                             <th className="px-4 py-3">Name</th>
                             <th className="px-4 py-3 text-right">Amount</th>
                             <th className="px-4 py-3">Status</th>
                         </tr>
                     </thead>
                     <tbody className="divide-y divide-gray-100">
                         {reportData.items.map((item: any) => (
                             <tr key={item.id} className="hover:bg-gray-50">
                                 <td className="px-4 py-3">{item.date}</td>
                                 <td className="px-4 py-3 font-medium">{item.name || item.client}</td>
                                 <td className="px-4 py-3 text-right text-gray-700">{currency}{(item.actualAmount || 0).toLocaleString()}</td>
                                 <td className="px-4 py-3">
                                   <span className={`px-2 py-1 rounded text-xs ${item.status === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                     {item.status}
                                   </span>
                                 </td>
                             </tr>
                         ))}
                         <tr className="bg-gray-50 font-bold">
                             <td colSpan={2} className="px-4 py-3">Total</td>
                             <td className="px-4 py-3 text-right text-gray-900">{currency}{(reportData.total || 0).toLocaleString()}</td>
                             <td></td>
                         </tr>
                     </tbody>
                 </table>
             ) : reportData.type === 'Balance Sheet' ? (
               <div className="space-y-6">
                 <table className="w-full text-sm border-collapse">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="px-4 py-3 text-left">Category</th>
                            <th className="px-4 py-3 text-right">Amount</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                       {reportData.breakdown.map((item: any, idx: number) => (
                          <tr key={idx}>
                            <td className="px-4 py-3 text-gray-600">{item.category}</td>
                            <td className="px-4 py-3 text-right font-medium">{currency}{(item.amount || 0).toLocaleString()}</td>
                          </tr>
                       ))}
                       <tr className="bg-green-50 font-semibold border-t border-green-100">
                           <td className="px-4 py-3 text-green-800">Total Assets</td>
                           <td className="px-4 py-3 text-right text-green-800">{currency}{(reportData.assets || 0).toLocaleString()}</td>
                       </tr>
                       <tr className="font-semibold border-t border-gray-100">
                           <td className="px-4 py-3 text-gray-700">Total Liabilities</td>
                           <td className="px-4 py-3 text-right text-gray-700">{currency}{(reportData.liabilities || 0).toLocaleString()}</td>
                       </tr>
                       <tr className="bg-blue-50 font-bold border-t border-blue-100">
                           <td className="px-4 py-3 text-blue-800">Total Equity</td>
                           <td className="px-4 py-3 text-right text-blue-800">{currency}{(reportData.equity || 0).toLocaleString()}</td>
                       </tr>
                    </tbody>
                 </table>
               </div>
             ) : (
                // Profit & Loss
                <div className="space-y-8">
                   {/* Summary Table */}
                   <table className="w-full text-sm border-collapse border border-gray-200 rounded-lg overflow-hidden">
                      <thead className="bg-gray-50">
                          <tr>
                              <th className="px-4 py-3 text-left text-gray-600">Summary Category</th>
                              <th className="px-4 py-3 text-right text-gray-600">Total</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                         <tr>
                             <td className="px-4 py-3 text-gray-700 font-medium">Total Income</td>
                             <td className="px-4 py-3 text-right font-bold text-green-600">{currency}{(reportData.totalIncome || 0).toLocaleString()}</td>
                         </tr>
                         <tr>
                             <td className="px-4 py-3 text-gray-700 font-medium">Total Expenses</td>
                             <td className="px-4 py-3 text-right font-bold text-red-600">-{currency}{(reportData.totalExpenses || 0).toLocaleString()}</td>
                         </tr>
                         <tr className="bg-gray-50">
                             <td className="px-4 py-3 text-gray-900 font-bold">Net Profit / Loss</td>
                             <td className={`px-4 py-3 text-right font-bold ${reportData.netProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                                 {currency}{(reportData.netProfit || 0).toLocaleString()}
                             </td>
                         </tr>
                      </tbody>
                   </table>

                   {/* Breakdown Section */}
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="border border-gray-200 rounded-lg overflow-hidden">
                          <h4 className="bg-gray-50 px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Income by Client</h4>
                          <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                  <tbody className="divide-y divide-gray-100">
                                      {Object.entries(reportData.incomeBreakdown || {}).length === 0 ? (
                                          <tr><td className="p-4 text-center text-gray-400">No income records</td></tr>
                                      ) : Object.entries(reportData.incomeBreakdown as Record<string, number>).map(([client, amt]) => (
                                          <tr key={client}>
                                              <td className="px-4 py-2 text-gray-600">{client}</td>
                                              <td className="px-4 py-2 text-right font-medium">{currency}{amt.toLocaleString()}</td>
                                          </tr>
                                      ))}
                                  </tbody>
                              </table>
                          </div>
                      </div>

                      <div className="border border-gray-200 rounded-lg overflow-hidden">
                          <h4 className="bg-gray-50 px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Expenses by Vendor</h4>
                          <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                  <tbody className="divide-y divide-gray-100">
                                      {Object.entries(reportData.expenseBreakdown || {}).length === 0 ? (
                                          <tr><td className="p-4 text-center text-gray-400">No expense records</td></tr>
                                      ) : Object.entries(reportData.expenseBreakdown as Record<string, number>).map(([shop, amt]) => (
                                          <tr key={shop}>
                                              <td className="px-4 py-2 text-gray-600">{shop}</td>
                                              <td className="px-4 py-2 text-right font-medium text-red-500">-{currency}{amt.toLocaleString()}</td>
                                          </tr>
                                      ))}
                                  </tbody>
                              </table>
                          </div>
                      </div>
                   </div>

                   {/* Detailed Transaction Lists */}
                   <div className="mt-8">
                     <h4 className="font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">Detailed Income Transactions</h4>
                     <div className="overflow-x-auto border border-gray-200 rounded-lg">
                        <table className="w-full text-sm text-left border-collapse">
                           <thead className="bg-gray-50">
                             <tr>
                               <th className="px-4 py-2 border-b">Date</th>
                               <th className="px-4 py-2 border-b">Client</th>
                               <th className="px-4 py-2 border-b text-right">Amount</th>
                               <th className="px-4 py-2 border-b">Status</th>
                             </tr>
                           </thead>
                           <tbody className="divide-y divide-gray-100">
                             {reportData.detailedIncome?.length === 0 ? (
                               <tr><td colSpan={4} className="p-4 text-center text-gray-500">No incoming transactions found.</td></tr>
                             ) : reportData.detailedIncome?.map((item: any) => (
                               <tr key={item.id} className="hover:bg-gray-50">
                                 <td className="px-4 py-2 text-gray-600">{item.date}</td>
                                 <td className="px-4 py-2 font-medium">{item.client}</td>
                                 <td className="px-4 py-2 text-right text-green-600">{currency}{(item.actualAmount || 0).toLocaleString()}</td>
                                 <td className="px-4 py-2 text-gray-600">{item.status}</td>
                               </tr>
                             ))}
                           </tbody>
                        </table>
                     </div>
                   </div>

                   <div className="mt-8">
                     <h4 className="font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">Detailed Expense Transactions</h4>
                     <div className="overflow-x-auto border border-gray-200 rounded-lg">
                        <table className="w-full text-sm text-left border-collapse">
                           <thead className="bg-gray-50">
                             <tr>
                               <th className="px-4 py-2 border-b">Date</th>
                               <th className="px-4 py-2 border-b">Expense</th>
                               <th className="px-4 py-2 border-b">Shop/Vendor</th>
                               <th className="px-4 py-2 border-b text-right">Amount</th>
                               <th className="px-4 py-2 border-b">Status</th>
                             </tr>
                           </thead>
                           <tbody className="divide-y divide-gray-100">
                             {reportData.detailedExpenses?.length === 0 ? (
                               <tr><td colSpan={5} className="p-4 text-center text-gray-500">No expense transactions found.</td></tr>
                             ) : reportData.detailedExpenses?.map((item: any) => (
                               <tr key={item.id} className="hover:bg-gray-50">
                                 <td className="px-4 py-2 text-gray-600">{item.date}</td>
                                 <td className="px-4 py-2 font-medium">{item.name}</td>
                                 <td className="px-4 py-2 text-gray-600">{item.shop}</td>
                                 <td className="px-4 py-2 text-right text-red-600">-{currency}{(item.actualAmount || 0).toLocaleString()}</td>
                                 <td className="px-4 py-2 text-gray-600">{item.status}</td>
                               </tr>
                             ))}
                           </tbody>
                        </table>
                     </div>
                   </div>
                </div>
             )}
           </div>
        </div>
      ) : (
        <div className="bg-white p-10 rounded-xl border border-gray-100 text-center border-dashed border-2">
          <FileText size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900">Report Preview</h3>
          <p className="text-gray-500 mt-2">Click "Generate Real-time Preview" to see data from your actual records.</p>
        </div>
      )}
    </div>
  );
};
