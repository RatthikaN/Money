import React, { useEffect, useState } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { ArrowUpRight, ArrowDownRight, DollarSign, Wallet, CreditCard, PieChart as PieIcon, Globe, TrendingUp, TrendingDown, Users, Activity, Sparkles, AlertCircle, RefreshCw, ServerOff } from 'lucide-react';
import { api, useCurrency } from '../services/api';
import { DashboardMetrics, User, ClientProfitability } from '../types';
import { aiService } from '../services/aiService';
import * as ReactRouterDOM from 'react-router-dom';
const { Link } = ReactRouterDOM as any;

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const MetricCard = ({ title, value, type, icon: Icon }: { title: string; value: string; type: 'neutral' | 'success' | 'danger' | 'info'; icon: any }) => {
  const colorClass = 
    type === 'success' ? 'text-green-600' : 
    type === 'danger' ? 'text-red-600' : 
    type === 'info' ? 'text-indigo-600' :
    'text-blue-600';
    
  const bgClass = 
    type === 'success' ? 'bg-green-50' : 
    type === 'danger' ? 'bg-red-50' : 
    type === 'info' ? 'bg-indigo-50' :
    'bg-blue-50';

  return (
    <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-start justify-between hover:shadow-md transition-all duration-300 group">
      <div className="overflow-hidden mr-2">
        <p className="text-xs font-semibold text-gray-400 mb-1 uppercase tracking-wider">{title}</p>
        <h3 className="text-xl md:text-2xl font-bold text-gray-800 truncate">{value}</h3>
      </div>
      <div className={`p-2.5 rounded-xl ${bgClass} ${colorClass} shrink-0 group-hover:scale-110 transition-transform duration-300`}>
        <Icon size={20} />
      </div>
    </div>
  );
};

const EmptyChartState = ({ icon: Icon, message }: { icon: any, message: string }) => (
    <div className="h-full w-full flex flex-col items-center justify-center text-gray-400 bg-gray-50/50 rounded-lg border-2 border-dashed border-gray-100">
        <div className="p-3 bg-white rounded-full shadow-sm mb-2">
            <Icon size={24} className="opacity-50" />
        </div>
        <p className="text-sm font-medium">{message}</p>
    </div>
);

export const Dashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [recentUsers, setRecentUsers] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const currency = useCurrency();
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [cashFlowData, setCashFlowData] = useState<any[]>([]);
  const [expensePieData, setExpensePieData] = useState<any[]>([]);
  const [clientReport, setClientReport] = useState<ClientProfitability[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, [selectedMonth]);

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
        const [yearStr, monthStr] = selectedMonth.split('-');
        const year = parseInt(yearStr);
        const month = parseInt(monthStr);

        const stats = await api.dashboard.getStats(month, year);
        setMetrics(stats);
        
        if (stats.clientReport) setClientReport(stats.clientReport);
        if (stats.recentUsers) setRecentUsers(stats.recentUsers);

        const expenses = await api.expenses.getAll();

        const isSelectedMonth = (dateStr: string) => dateStr.startsWith(selectedMonth);
        const filteredExpenses = expenses.filter(e => isSelectedMonth(e.date));

        if (stats.chartData) setCashFlowData(stats.chartData);

        const shopMap = new Map<string, number>();
        filteredExpenses.forEach(exp => {
            const shop = exp.shop || 'Unknown';
            const curr = shopMap.get(shop) || 0;
            shopMap.set(shop, curr + Number(exp.actualAmount || 0));
        });
        
        const sortedShops = Array.from(shopMap.entries())
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
        
        const topShops = sortedShops.slice(0, 4);
        const otherSum = sortedShops.slice(4).reduce((sum, item) => sum + item.value, 0);
        if (otherSum > 0) topShops.push({ name: 'Others', value: otherSum });
        setExpensePieData(topShops);

    } catch (err: any) {
        if (err.message === "BACKEND_CONNECTION_REFUSED") {
            setError("BACKEND_OFFLINE");
        } else {
            setError(err.message || "An unexpected error occurred");
        }
    } finally {
        setLoading(false);
    }
  };

  if (error === "BACKEND_OFFLINE") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-6">
        <div className="w-24 h-24 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-6">
          <ServerOff size={48} />
        </div>
        <h2 className="text-2xl font-black text-gray-900 mb-2">Backend Unreachable</h2>
        <p className="text-gray-500 max-w-md mb-8">
          The application couldn't connect to the server at <code className="bg-gray-100 px-2 py-1 rounded text-red-600">localhost:5000</code>. 
          Please ensure your Node.js backend is running.
        </p>
        <button 
          onClick={loadDashboardData}
          className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg"
        >
          <RefreshCw size={20} />
          Retry Connection
        </button>
      </div>
    );
  }

  if (loading || !metrics) return (
    <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            <div className="text-gray-400 font-medium">Synchronizing Ledger...</div>
        </div>
    </div>
  );

  const isCashFlowEmpty = !cashFlowData || cashFlowData.every(d => d.income === 0 && d.expense === 0);
  const isPieEmpty = !expensePieData || expensePieData.length === 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
           <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Executive Dashboard</h1>
           <p className="text-sm text-gray-500">Business overview for <span className="font-semibold text-gray-700">{selectedMonth}</span></p>
        </div>
        
        <div className="flex items-center space-x-2 w-full sm:w-auto bg-white p-1 rounded-xl border border-gray-100 shadow-sm">
           <input 
             type="month" 
             className="w-full sm:w-auto px-3 py-1.5 rounded text-sm text-gray-700 focus:outline-none bg-transparent"
             value={selectedMonth}
             onChange={(e) => setSelectedMonth(e.target.value)}
           />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <MetricCard title="Incoming" value={`${currency}${Number(metrics.totalIncoming || 0).toLocaleString()}`} type="success" icon={ArrowUpRight} />
        <MetricCard title="Received" value={`${currency}${Number(metrics.totalReceived || 0).toLocaleString()}`} type="success" icon={Wallet} />
        <MetricCard title="Online" value={`${currency}${Number(metrics.totalOnline || 0).toLocaleString()}`} type="info" icon={Globe} />
        <MetricCard title="Due" value={`${currency}${Number(metrics.totalDue || 0).toLocaleString()}`} type="danger" icon={CreditCard} />
        <MetricCard title="Expenses" value={`${currency}${Number(metrics.totalExpenses || 0).toLocaleString()}`} type="danger" icon={ArrowDownRight} />
        <MetricCard title="Net Cash" value={`${currency}${Number(metrics.netCashFlow || 0).toLocaleString()}`} type={metrics.netCashFlow >= 0 ? 'success' : 'danger'} icon={DollarSign} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                  <Activity size={20} className="text-indigo-500" />
                  Daily Cash Flow
                </h3>
                <div className="h-80 w-full">
                    {!isCashFlowEmpty ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={cashFlowData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#94a3b8'}} />
                            <YAxis axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#94a3b8'}} />
                            <Tooltip 
                                contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                formatter={(value: number) => [`${currency}${value.toLocaleString()}`, '']}
                            />
                            <Legend wrapperStyle={{paddingTop: 10}} />
                            <Line type="monotone" name="Income" dataKey="income" stroke="#10b981" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
                            <Line type="monotone" name="Expense" dataKey="expense" stroke="#ef4444" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    ) : (
                        <EmptyChartState icon={Activity} message="No transaction data this period" />
                    )}
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-gray-800">Client Profitability Report</h3>
                    <Link to="/reports" className="text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full">Detailed Analysis</Link>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50/50 text-gray-400 font-bold uppercase text-[10px] tracking-wider">
                        <tr>
                        <th className="px-6 py-4">Client Name</th>
                        <th className="px-6 py-4 text-right">Incoming</th>
                        <th className="px-6 py-4 text-right">Expenses</th>
                        <th className="px-6 py-4 text-right">Net Profit</th>
                        <th className="px-6 py-4 text-center">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {clientReport.length > 0 ? clientReport.map((row, index) => (
                        <tr key={index} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-6 py-4 font-semibold text-gray-800 whitespace-nowrap">
                                {row.client}
                                {row.hasProjected && <span className="ml-2 px-1.5 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] rounded-full font-bold">FORECAST</span>}
                            </td>
                            <td className="px-6 py-4 text-right text-green-600 font-medium whitespace-nowrap">{currency}${row.income.toLocaleString()}</td>
                            <td className="px-6 py-4 text-right text-red-500 whitespace-nowrap">{currency}${row.expense.toLocaleString()}</td>
                            <td className={`px-6 py-4 text-right font-bold whitespace-nowrap ${row.profit >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>{currency}${row.profit.toLocaleString()}</td>
                            <td className="px-6 py-4 text-center whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${row.status === 'Profit' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {row.status === 'Profit' ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                                {row.status}
                            </span>
                            </td>
                        </tr>
                        )) : (
                        <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-400">No client data found.</td></tr>
                        )}
                    </tbody>
                    </table>
                </div>
            </div>
        </div>

        <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-800">Team Activity</h3>
                    <Link to="/users" className="text-gray-400 hover:text-gray-600"><Users size={20} /></Link>
                </div>
                <div className="space-y-4">
                    {recentUsers.length > 0 ? recentUsers.map(user => (
                        <div key={user.id} className="flex items-center gap-3 pb-3 border-b border-gray-50 last:border-0 last:pb-0">
                            <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm shrink-0 border border-indigo-100">
                                {user.name.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-gray-900 truncate">{user.name}</p>
                                <p className="text-[11px] text-gray-400 font-medium truncate">{user.role}</p>
                            </div>
                        </div>
                    )) : (
                        <p className="text-sm text-gray-400 text-center py-4">No recent users</p>
                    )}
                </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-gray-800 mb-6">Top Vendors</h3>
                <div className="h-64 w-full">
                    {!isPieEmpty ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                        <Pie data={expensePieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} fill="#8884d8" paddingAngle={5} dataKey="value">
                            {expensePieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                        </Pie>
                        <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                        <Legend verticalAlign="bottom" height={36} iconType="circle" />
                        </PieChart>
                    </ResponsiveContainer>
                    ) : (
                        <EmptyChartState icon={PieIcon} message="No expense data" />
                    )}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};