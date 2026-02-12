
import React, { useState, useEffect } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
const { Link, useLocation, useNavigate } = ReactRouterDOM as any;

import {
  LayoutDashboard,
  Wallet,
  TrendingUp,
  Repeat,
  FileBarChart,
  Users,
  LogOut,
  Menu,
  X,
  Bell,
  UserCircle,
  Settings,
  Briefcase,
  Target
} from 'lucide-react';
import { Role, Notification } from '../types';
import { api } from '../services/api';
import { Trash2, CheckCircle2, AlertCircle, Info, RotateCcw } from 'lucide-react';

const NavItem = ({ to, icon: Icon, label, onClick }: { to: string; icon: any; label: string; onClick?: () => void }) => {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <Link
      to={to}
      onClick={onClick}
      className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-300 ${isActive
          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
          : 'text-gray-500 hover:bg-indigo-50 hover:text-indigo-600'
        }`}
    >
      <Icon size={20} className="shrink-0" />
      <span className="font-semibold truncate text-sm">{label}</span>
    </Link>
  );
};

export const Layout = ({ children }: { children?: React.ReactNode }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [userRole, setUserRole] = useState<Role | string>('');
  const [userName, setUserName] = useState('');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    try {
      const data = await api.notifications.getAll();
      setNotifications(data || []);
    } catch (e) {
      console.error("Failed to fetch notifications", e);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // Polling every 30s
    return () => clearInterval(interval);
  }, []);

  const unreadCount = notifications.filter(n => n.status === 'Unread').length;

  const handleMarkAsRead = async (id: string) => {
    try {
      await api.notifications.markRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, status: 'Read' } : n));
    } catch (e) {
      console.error("Failed to mark as read", e);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.notifications.markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, status: 'Read' })));
    } catch (e) {
      console.error("Failed to mark all as read", e);
    }
  };

  const handleDeleteNotification = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.notifications.delete(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (e) {
      console.error("Failed to delete notification", e);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'Success': return <CheckCircle2 className="text-green-500" size={18} />;
      case 'Warning': return <AlertCircle className="text-yellow-500" size={18} />;
      case 'Error': return <AlertCircle className="text-red-500" size={18} />;
      default: return <Info className="text-blue-500" size={18} />;
    }
  };

  useEffect(() => {
    const role = localStorage.getItem('userRole') || 'Admin';
    const name = localStorage.getItem('userName') || 'User';
    setUserRole(role);
    setUserName(name);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userName');
    navigate('/login');
  };

  const shouldShow = (path: string) => {
    if (userRole === 'Admin') return true;
    switch (userRole) {
      case 'Manager':
        // Fix: Adding budgets and missing recurring routes for Manager role
        return ['/dashboard', '/expenses', '/incoming', '/recurring', '/reports', '/clients', '/budgets'].includes(path);
      case 'Accountant':
        return ['/expenses', '/incoming', '/clients'].includes(path);
      case 'Auditor':
        return ['/expenses', '/incoming', '/reports'].includes(path);
      case 'Client':
        return ['/dashboard', '/incoming'].includes(path);
      default:
        return false;
    }
  };

  return (
    <div className="min-h-screen bg-[#fcfdfe] flex">
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-40 md:hidden" onClick={() => setIsMobileMenuOpen(false)} />
      )}

      <aside className={`fixed md:sticky top-0 h-screen w-72 bg-white border-r border-gray-100 z-50 transform transition-all duration-300 ease-in-out flex flex-col ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="p-8 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-black shadow-xl shadow-indigo-100">M</div>
            <span className="text-xl font-black text-gray-900 tracking-tight">MoneyFlow</span>
          </div>
          <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden text-gray-400 hover:text-gray-900"><X size={24} /></button>
        </div>

        <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
          {shouldShow('/dashboard') && <NavItem to="/dashboard" icon={LayoutDashboard} label="Dashboard" onClick={() => setIsMobileMenuOpen(false)} />}
          {shouldShow('/expenses') && <NavItem to="/expenses" icon={Wallet} label="Expenses" onClick={() => setIsMobileMenuOpen(false)} />}
          {shouldShow('/incoming') && <NavItem to="/incoming" icon={TrendingUp} label="Incoming" onClick={() => setIsMobileMenuOpen(false)} />}
          {shouldShow('/recurring') && <NavItem to="/recurring" icon={Repeat} label="Recurring" onClick={() => setIsMobileMenuOpen(false)} />}
          {/* Fix: Adding Budgets Nav Item */}
          {/* {shouldShow('/budgets') && <NavItem to="/budgets" icon={Target} label="Spending Budgets" onClick={() => setIsMobileMenuOpen(false)} />} */}
          {shouldShow('/reports') && <NavItem to="/reports" icon={FileBarChart} label="Financial Reports" onClick={() => setIsMobileMenuOpen(false)} />}
          {shouldShow('/clients') && <NavItem to="/clients" icon={Briefcase} label="Client Management" onClick={() => setIsMobileMenuOpen(false)} />}
          {shouldShow('/users') && <NavItem to="/users" icon={Users} label="Internal Team" onClick={() => setIsMobileMenuOpen(false)} />}
        </nav>

        <div className="p-4 border-t border-gray-50 space-y-1">
          {shouldShow('/settings') && <NavItem to="/settings" icon={Settings} label="System Settings" onClick={() => setIsMobileMenuOpen(false)} />}
          <button onClick={handleLogout} className="flex items-center space-x-3 px-4 py-3 w-full text-red-500 hover:bg-red-50 rounded-xl transition-all font-semibold text-sm">
            <LogOut size={20} className="shrink-0" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <header className="bg-white/80 backdrop-blur-md border-b border-gray-50 h-20 flex items-center justify-between px-6 md:px-10 sticky top-0 z-40 shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsMobileMenuOpen(true)} className="md:hidden text-gray-400 hover:text-gray-900 p-2 -ml-2 rounded-xl hover:bg-gray-50"><Menu size={24} /></button>
            <h2 className="text-xl font-bold text-gray-900 hidden md:block tracking-tight">Financial Overview</h2>
          </div>

          <div className="flex items-center space-x-5">
            <div className="relative">
              <button
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className={`p-2.5 text-gray-400 hover:text-indigo-600 relative rounded-2xl hover:bg-indigo-50 transition-all ${isNotificationsOpen ? 'bg-indigo-50 text-indigo-600' : ''}`}
              >
                <Bell size={22} />
                {unreadCount > 0 && (
                  <span className="absolute top-2 right-2 w-4 h-4 bg-red-500 text-white text-[10px] flex items-center justify-center rounded-full border-2 border-white font-bold">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {isNotificationsOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setIsNotificationsOpen(false)} />
                  <div className="absolute right-0 mt-3 w-80 md:w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 z-20 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-4 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
                      <h3 className="font-bold text-gray-900">Notifications</h3>
                      <div className="flex items-center gap-2">
                        <button onClick={handleMarkAllRead} className="text-xs text-indigo-600 hover:text-indigo-800 font-bold">Mark all read</button>
                        <button onClick={fetchNotifications} title="Refresh" className="text-gray-400 hover:text-indigo-600"><RotateCcw size={14} /></button>
                      </div>
                    </div>
                    <div className="max-h-[400px] overflow-y-auto divide-y divide-gray-50">
                      {notifications.length === 0 ? (
                        <div className="p-8 text-center text-gray-400">
                          <Bell className="mx-auto mb-2 opacity-20" size={40} />
                          <p className="text-sm font-medium">No notifications yet</p>
                        </div>
                      ) : (
                        notifications.map((n) => (
                          <div
                            key={n.id}
                            onClick={() => handleMarkAsRead(n.id)}
                            className={`p-4 flex gap-3 hover:bg-gray-50 transition-colors cursor-pointer relative group ${n.status === 'Unread' ? 'bg-indigo-50/20' : ''}`}
                          >
                            <div className="mt-1 shrink-0">{getIcon(n.type)}</div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm leading-tight mb-1 ${n.status === 'Unread' ? 'font-black text-gray-900' : 'font-medium text-gray-600'}`}>
                                {n.title}
                              </p>
                              <p className="text-xs text-gray-500 truncate">{n.message}</p>
                              <p className="text-[10px] text-gray-400 mt-2 font-bold uppercase tracking-widest">
                                {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                            <button
                              onClick={(e) => handleDeleteNotification(n.id, e)}
                              className="opacity-0 group-hover:opacity-100 p-1 text-gray-300 hover:text-red-500 transition-all"
                            >
                              <Trash2 size={14} />
                            </button>
                            {n.status === 'Unread' && (
                              <div className="absolute right-4 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-indigo-600 rounded-full group-hover:hidden" />
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
            <div onClick={() => navigate('/settings')} className="flex items-center space-x-3 pl-5 border-l border-gray-100 cursor-pointer group">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-black text-gray-900 group-hover:text-indigo-600 transition-colors leading-none mb-1">{userName}</p>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{userRole}</p>
              </div>
              <div className="h-11 w-11 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm ring-4 ring-white">
                <UserCircle size={28} />
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-6 md:p-10">
          <div className="max-w-7xl mx-auto">{children}</div>
        </div>
      </main>
    </div>
  );
};
