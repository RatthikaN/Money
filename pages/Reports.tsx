import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Download, FileText, Printer, FileSpreadsheet, Loader2, ArrowUpRight, ArrowDownRight, DollarSign, Activity, Zap } from 'lucide-react';
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { api, getCurrencySymbol } from '../services/api';
import { Expense, IncomingPayment } from '../types';

export const Reports: React.FC = () => {
  const [reportType, setReportType] = useState('Profit & Loss');
  const [dateRange, setDateRange] = useState('This Month');
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState({ income: 0, expenses: 0, profit: 0 });
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);
  const currency = getCurrencySymbol();

  const fetchRealData = async () => {
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
      if (range === 'Date Wise') {
        if (!customStartDate || !customEndDate) return true;
        const start = new Date(customStartDate);
        const end = new Date(customEndDate);
        end.setHours(23, 59, 59, 999);
        return itemDate >= start && itemDate <= end;
      }
      return true;
    });
  };

  const handleGeneratePreview = useCallback(async () => {
    setLoading(true);
    try {
      const { expenses, incoming } = await fetchRealData();

      const filteredExpenses = filterByDate(expenses, 'date', dateRange);
      const filteredIncoming = filterByDate(incoming, 'date', dateRange);

      // Update Summary Bar
      const totalInc = filteredIncoming.reduce((acc, i) => acc + (i.actualAmount || 0), 0);
      const totalExp = filteredExpenses.reduce((acc, i) => acc + (i.actualAmount || 0), 0);
      setSummary({ income: totalInc, expenses: totalExp, profit: totalInc - totalExp });

      if (reportType === 'Balance Sheet') {
        const totalIncomePaid = incoming.reduce((acc, i) => acc + (i.paidAmount || 0), 0);
        const totalExpensesPaid = expenses.reduce((acc, i) => acc + (i.paidAmount || 0), 0);
        const cashOnHand = totalIncomePaid - totalExpensesPaid;
        const accountsReceivable = incoming.reduce((acc, i) => acc + ((i.actualAmount || 0) - (i.paidAmount || 0)), 0);
        const accountsPayable = expenses.reduce((acc, i) => acc + ((i.actualAmount || 0) - (i.paidAmount || 0)), 0);
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
        setReportData({
          type: 'Incoming Report',
          period: dateRange,
          items: filteredIncoming,
          total: totalInc
        });
      } else if (reportType === 'Expenses') {
        setReportData({
          type: 'Expenses Report',
          period: dateRange,
          items: filteredExpenses,
          total: totalExp
        });
      } else {
        const incomeByClient: Record<string, number> = {};
        filteredIncoming.forEach(i => {
          const client = i.client || 'Unknown';
          incomeByClient[client] = (incomeByClient[client] || 0) + (i.actualAmount || 0);
        });

        const expensesByShop: Record<string, number> = {};
        filteredExpenses.forEach(e => {
          const shop = e.shop || 'Unknown';
          expensesByShop[shop] = (expensesByShop[shop] || 0) + (e.actualAmount || 0);
        });

        setReportData({
          type: 'Profit & Loss',
          period: dateRange,
          totalIncome: totalInc,
          totalExpenses: totalExp,
          netProfit: totalInc - totalExp,
          incomeBreakdown: incomeByClient,
          expenseBreakdown: expensesByShop,
          detailedIncome: filteredIncoming,
          detailedExpenses: filteredExpenses
        });
      }
    } catch (err) {
      console.error("Report Generation Error:", err);
    } finally {
      setLoading(false);
    }
  }, [reportType, dateRange, customStartDate, customEndDate]);

  useEffect(() => {
    handleGeneratePreview();
  }, [handleGeneratePreview]);

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
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">Financial Reports</h1>
          {/* <div className="flex items-center gap-1.5 px-2.5 py-1 bg-green-50 text-green-700 rounded-full border border-green-100 animate-pulse">
            <Zap size={12} fill="currentColor" />
            <span className="text-[10px] font-black uppercase tracking-wider">Live Data</span>
          </div> */}
        </div>
        <div className="flex space-x-2 w-full sm:w-auto">
          <button onClick={handlePrint} className="flex-1 sm:flex-none flex items-center justify-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-700 hover:bg-gray-50 transition-colors">
            <Printer size={18} /> <span>Print</span>
          </button>
          <button onClick={handleExportCSV} className="flex-1 sm:flex-none flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
            <FileSpreadsheet size={18} /> <span>Excel</span>
          </button>
          <button onClick={handleExportPDF} disabled={isGeneratingPdf} className="flex-1 sm:flex-none flex items-center justify-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-70 transition-colors">
            {isGeneratingPdf ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />} <span>PDF</span>
          </button>
        </div>
      </div>

      {/* Real-time Summary Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4 overflow-hidden relative group">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl group-hover:scale-110 transition-transform">
            <ArrowUpRight size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Total Income</p>
            <h3 className="text-xl font-black text-gray-900">{currency}{summary.income.toLocaleString()}</h3>
          </div>
          <div className="absolute top-0 right-0 p-2 opacity-5">
            <Activity size={64} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4 overflow-hidden relative group">
          <div className="p-3 bg-red-50 text-red-600 rounded-xl group-hover:scale-110 transition-transform">
            <ArrowDownRight size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Total Expenses</p>
            <h3 className="text-xl font-black text-gray-900">{currency}{summary.expenses.toLocaleString()}</h3>
          </div>
          <div className="absolute top-0 right-0 p-2 opacity-5">
            <Activity size={64} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4 overflow-hidden relative group">
          <div className={`p-3 rounded-xl group-hover:scale-110 transition-transform ${summary.profit >= 0 ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'}`}>
            <DollarSign size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Net Profit</p>
            <h3 className={`text-xl font-black ${summary.profit >= 0 ? 'text-green-700' : 'text-orange-700'}`}>
              {currency}{summary.profit.toLocaleString()}
            </h3>
          </div>
          <div className="absolute top-0 right-0 p-2 opacity-5">
            <Zap size={64} />
          </div>
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
              <option>Date Wise</option>
            </select>
            {dateRange === 'Date Wise' && (
              <div className="flex gap-2 mt-2">
                <input type="date" className="w-full border border-gray-300 rounded-lg p-2 bg-white text-sm" value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)} />
                <input type="date" className="w-full border border-gray-300 rounded-lg p-2 bg-white text-sm" value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)} />
              </div>
            )}
          </div>
          <div className="flex items-end">
            <button
              onClick={handleGeneratePreview}
              disabled={loading}
              className="w-full bg-gray-900 text-white py-2 rounded-lg hover:bg-gray-800 flex items-center justify-center space-x-2 transition-all disabled:opacity-70"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Zap size={18} className="text-yellow-400" />}
              <span>{loading ? 'Synchronizing...' : 'Generate Real-time Preview'}</span>
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
