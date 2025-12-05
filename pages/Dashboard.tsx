import React, { useEffect, useState } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, BarChart, Bar, Legend
} from 'recharts';
import { ArrowUpRight, ArrowDownRight, DollarSign, Wallet, CreditCard, PieChart as PieIcon } from 'lucide-react';
import { api } from '../services/api';
import { DashboardMetrics, IncomingPayment, Expense } from '../types';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const MetricCard = ({ title, value, type, icon: Icon }: { title: string; value: string; type: 'neutral' | 'success' | 'danger'; icon: any }) => {
  const colorClass = type === 'success' ? 'text-green-600' : type === 'danger' ? 'text-red-600' : 'text-blue-600';
  const bgClass = type === 'success' ? 'bg-green-50' : type === 'danger' ? 'bg-red-50' : 'bg-blue-50';

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
  
  // Dynamic Chart Data States
  const [cashFlowData, setCashFlowData] = useState<any[]>([]);
  const [expensePieData, setExpensePieData] = useState<any[]>([]);
  const [clientBarData, setClientBarData] = useState<any[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    // 1. Fetch Metrics
    const stats = await api.dashboard.getStats();
    setMetrics(stats);

    // 2. Fetch Raw Data for Charts
    const [expenses, incoming] = await Promise.all([
      api.expenses.getAll(),
      api.incoming.getAll()
    ]);

    // 3. Process Recent Payments
    // Sort by date desc
    const sortedIncoming = [...incoming].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setRecentPayments(sortedIncoming.slice(0, 5));

    // 4. Process Cash Flow Chart (Group by Month)
    const monthMap = new Map<string, { income: number; expense: number }>();
    
    // Helper to get "Jan 2024" key
    const getMonthKey = (dateStr: string) => {
        const d = new Date(dateStr);
        return d.toLocaleString('default', { month: 'short' }); // e.g., "Jan"
    };

    // Initialize last 6 months to ensure chart has shape even if empty
    for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const key = d.toLocaleString('default', { month: 'short' });
        monthMap.set(key, { income: 0, expense: 0 });
    }

    incoming.forEach(inc => {
        const key = getMonthKey(inc.date);
        if (monthMap.has(key)) {
            const curr = monthMap.get(key)!;
            // Explicit Number cast
            curr.income += Number(inc.actualAmount || 0);
        }
    });

    expenses.forEach(exp => {
        const key = getMonthKey(exp.date);
        if (monthMap.has(key)) {
            const curr = monthMap.get(key)!;
            // Explicit Number cast
            curr.expense += Number(exp.actualAmount || 0);
        }
    });

    const flowData = Array.from(monthMap.entries()).map(([name, val]) => ({
        name,
        income: val.income,
        expense: val.expense
    }));
    setCashFlowData(flowData);

    // 5. Process Expense Pie Chart (By Shop)
    const shopMap = new Map<string, number>();
    expenses.forEach(exp => {
        const shop = exp.shop || 'Unknown';
        const curr = shopMap.get(shop) || 0;
        // Explicit Number cast
        shopMap.set(shop, curr + Number(exp.actualAmount || 0));
    });
    
    // Top 5 shops + Others
    const sortedShops = Array.from(shopMap.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);
    
    const topShops = sortedShops.slice(0, 4);
    const otherSum = sortedShops.slice(4).reduce((sum, item) => sum + item.value, 0);
    if (otherSum > 0) topShops.push({ name: 'Others', value: otherSum });
    
    setExpensePieData(topShops);

    // 6. Process Client Bar Chart (By Client)
    const clientMap = new Map<string, number>();
    incoming.forEach(inc => {
        const client = inc.client || 'Unknown';
        const curr = clientMap.get(client) || 0;
        // Explicit Number cast
        clientMap.set(client, curr + Number(inc.actualAmount || 0));
    });

    const barData = Array.from(clientMap.entries())
        .map(([name, amount]) => ({ name, amount }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5); // Top 5 clients
    
    setClientBarData(barData);
  };

  if (!metrics) return (
    <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-gray-400">Loading your financial data...</div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
        <p className="text-sm text-gray-500">Real-time data from your entries</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        <MetricCard 
          title="Total Incoming" 
          value={`$${Number(metrics.totalIncoming || 0).toLocaleString()}`} 
          type="success" 
          icon={ArrowUpRight} 
        />
        <MetricCard 
          title="Total Received" 
          value={`$${Number(metrics.totalReceived || 0).toLocaleString()}`} 
          type="success" 
          icon={Wallet} 
        />
        <MetricCard 
          title="Total Due" 
          value={`$${Number(metrics.totalDue || 0).toLocaleString()}`} 
          type="danger" 
          icon={CreditCard} 
        />
        <MetricCard 
          title="Total Expenses" 
          value={`$${Number(metrics.totalExpenses || 0).toLocaleString()}`} 
          type="danger" 
          icon={ArrowDownRight} 
        />
        <MetricCard 
          title="Net Cash Flow" 
          value={`$${Number(metrics.netCashFlow || 0).toLocaleString()}`} 
          type={metrics.netCashFlow >= 0 ? 'success' : 'danger'} 
          icon={DollarSign} 
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cash Flow Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-6">Cash Flow (Last 6 Months)</h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={cashFlowData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: number) => [`$${value.toLocaleString()}`, '']}
                />
                <Legend />
                <Line type="monotone" name="Income" dataKey="income" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 8 }} />
                <Line type="monotone" name="Expense" dataKey="expense" stroke="#ef4444" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Expenses Pie Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-6">Expenses by Vendor</h3>
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
                  <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
              </ResponsiveContainer>
            ) : (
                <div className="h-full flex flex-col items-center justify-center text-gray-400">
                    <PieIcon size={48} className="mb-2 opacity-50" />
                    <p>No expense data yet</p>
                </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Payments & Top Clients */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-50 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-800">Recent Incoming Payments</h3>
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
                    <td className="px-6 py-4 text-gray-600">${Number(p.actualAmount || 0).toLocaleString()}</td>
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
                        <td colSpan={4} className="px-6 py-8 text-center text-gray-400">No recent transactions found.</td>
                    </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Clients Bar Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-6">Top Clients by Revenue</h3>
          <div className="h-64 w-full">
            {clientBarData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                <BarChart data={clientBarData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12}} />
                    <YAxis axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: '#f3f4f6' }} formatter={(value: number) => [`$${value.toLocaleString()}`, 'Revenue']} />
                    <Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
                </ResponsiveContainer>
            ) : (
                <div className="h-full flex flex-col items-center justify-center text-gray-400">
                    <Wallet size={48} className="mb-2 opacity-50" />
                    <p>No income data yet</p>
                </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};