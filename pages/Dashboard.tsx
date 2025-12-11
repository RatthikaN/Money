import React, { useEffect, useState } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, BarChart, Bar, Legend
} from 'recharts';
import { ArrowUpRight, ArrowDownRight, DollarSign, Wallet, CreditCard, PieChart as PieIcon, Globe } from 'lucide-react';
import { api, getCurrencySymbol } from '../services/api';
import { DashboardMetrics, IncomingPayment, Expense } from '../types';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const MetricCard = ({ title, value, type, icon: Icon }: { title: string; value: string; type: 'neutral' | 'success' | 'danger' | 'info'; icon: any }) => {
  const colorClass = 
    type === 'success' ? 'text-green-600' : 
    type === 'danger' ? 'text-red-600' : 
    type === 'info' ? 'text-purple-600' :
    'text-blue-600';
    
  const bgClass = 
    type === 'success' ? 'bg-green-50' : 
    type === 'danger' ? 'bg-red-50' : 
    type === 'info' ? 'bg-purple-50' :
    'bg-blue-50';

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-start justify-between hover:shadow-md transition-shadow">
      <div>
        <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
        <h3 className="text-2xl font-bold text-gray-800">{value}</h3>
      </div>
      <div className={`p-3 rounded-lg ${bgClass} ${colorClass}`}>
        <Icon size={24} />
      </div>
    </div>
  );
};

export const Dashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [recentPayments, setRecentPayments] = useState<IncomingPayment[]>([]);
  const currency = getCurrencySymbol();
  
  // Date State for Monthly Filtering
  // Default to current YYYY-MM
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

  // Dynamic Chart Data States
  const [cashFlowData, setCashFlowData] = useState<any[]>([]);
  const [expensePieData, setExpensePieData] = useState<any[]>([]);
  const [clientBarData, setClientBarData] = useState<any[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, [selectedMonth]); // Reload when month changes

  const loadDashboardData = async () => {
    try {
        const [yearStr, monthStr] = selectedMonth.split('-');
        const year = parseInt(yearStr);
        const month = parseInt(monthStr);

        // Fetch Stats filtered by Month
        const stats = await api.dashboard.getStats(month, year);
        setMetrics(stats);

        // Fetch All Records (for pie charts/lists) - then filter locally for simplicity in this view
        const [expenses, incoming] = await Promise.all([
          api.expenses.getAll(),
          api.incoming.getAll()
        ]);

        // Filter Lists based on selected month for consistency
        const isSelectedMonth = (dateStr: string) => dateStr.startsWith(selectedMonth);
        const filteredExpenses = expenses.filter(e => isSelectedMonth(e.date));
        const filteredIncoming = incoming.filter(i => isSelectedMonth(i.date));

        // Recent Payments Table
        const sortedIncoming = [...filteredIncoming].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setRecentPayments(sortedIncoming.slice(0, 5));

        // Chart Data (Backend now returns daily breakdown for the selected month)
        if (stats.chartData) {
            setCashFlowData(stats.chartData);
        }

        // Expense Pie Chart Data (Top Vendors this month)
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

        // Client Bar Chart Data (Top Clients this month)
        const clientMap = new Map<string, number>();
        filteredIncoming.forEach(inc => {
            const client = inc.client || 'Unknown';
            const curr = clientMap.get(client) || 0;
            clientMap.set(client, curr + Number(inc.actualAmount || 0));
        });

        const barData = Array.from(clientMap.entries())
            .map(([name, amount]) => ({ name, amount }))
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 5); 
        
        setClientBarData(barData);

    } catch (error) {
        console.error("Dashboard error", error);
    }
  };

  if (!metrics) return (
    <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-gray-400">Loading your financial data...</div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
           <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
           <p className="text-sm text-gray-500">Overview for <span className="font-semibold text-gray-700">{selectedMonth}</span></p>
        </div>
        
        {/* Month Selector */}
        <div className="flex items-center space-x-2 mt-2 md:mt-0 bg-white p-1 rounded-lg border border-gray-200 shadow-sm">
           <input 
             type="month" 
             className="px-3 py-1.5 rounded text-sm text-gray-700 focus:outline-none"
             value={selectedMonth}
             onChange={(e) => setSelectedMonth(e.target.value)}
           />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <MetricCard 
          title="Total Incoming" 
          value={`${currency}${Number(metrics.totalIncoming || 0).toLocaleString()}`} 
          type="success" 
          icon={ArrowUpRight} 
        />
        <MetricCard 
          title="Total Received" 
          value={`${currency}${Number(metrics.totalReceived || 0).toLocaleString()}`} 
          type="success" 
          icon={Wallet} 
        />
        {/* New Online Transactions Card */}
        <MetricCard 
          title="Online Trans." 
          value={`${currency}${Number(metrics.totalOnline || 0).toLocaleString()}`} 
          type="info" 
          icon={Globe} 
        />
        <MetricCard 
          title="Total Due" 
          value={`${currency}${Number(metrics.totalDue || 0).toLocaleString()}`} 
          type="danger" 
          icon={CreditCard} 
        />
        <MetricCard 
          title="Total Expenses" 
          value={`${currency}${Number(metrics.totalExpenses || 0).toLocaleString()}`} 
          type="danger" 
          icon={ArrowDownRight} 
        />
        <MetricCard 
          title="Net Cash Flow" 
          value={`${currency}${Number(metrics.netCashFlow || 0).toLocaleString()}`} 
          type={metrics.netCashFlow >= 0 ? 'success' : 'danger'} 
          icon={DollarSign} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-6">Daily Cash Flow ({selectedMonth})</h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={cashFlowData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: number) => [`${currency}${value.toLocaleString()}`, '']}
                  labelFormatter={(label) => `Day ${label}`}
                />
                <Legend />
                <Line type="monotone" name="Income" dataKey="income" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 8 }} />
                <Line type="monotone" name="Expense" dataKey="expense" stroke="#ef4444" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-6">Expenses by Vendor ({selectedMonth})</h3>
          <div className="h-80 w-full">
            {expensePieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expensePieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    fill="#8884d8"
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {expensePieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => `${currency}${value.toLocaleString()}`} />
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
              </ResponsiveContainer>
            ) : (
                <div className="h-full flex flex-col items-center justify-center text-gray-400">
                    <PieIcon size={48} className="mb-2 opacity-50" />
                    <p>No expense data for this month</p>
                </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-50 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-800">Recent Incoming Payments ({selectedMonth})</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-500 font-medium">
                <tr>
                  <th className="px-6 py-4">Client</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentPayments.length > 0 ? recentPayments.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">{p.client}</td>
                    <td className="px-6 py-4 text-gray-600">{currency}{Number(p.actualAmount || 0).toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        p.status === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500">{p.date}</td>
                  </tr>
                )) : (
                    <tr>
                        <td colSpan={4} className="px-6 py-8 text-center text-gray-400">No transactions found for this month.</td>
                    </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-6">Top Clients by Revenue ({selectedMonth})</h3>
          <div className="h-64 w-full">
            {clientBarData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                <BarChart data={clientBarData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12}} />
                    <YAxis axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: '#f3f4f6' }} formatter={(value: number) => [`${currency}${value.toLocaleString()}`, 'Revenue']} />
                    <Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
                </ResponsiveContainer>
            ) : (
                <div className="h-full flex flex-col items-center justify-center text-gray-400">
                    <Wallet size={48} className="mb-2 opacity-50" />
                    <p>No income data for this month</p>
                </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};