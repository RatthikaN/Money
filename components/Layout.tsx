
import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
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
  Briefcase
} from 'lucide-react';
import { Role } from '../types';

const NavItem = ({ to, icon: Icon, label, onClick }: { to: string; icon: any; label: string; onClick?: () => void }) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
        isActive 
          ? 'bg-blue-600 text-white shadow-md shadow-blue-200' 
          : 'text-gray-600 hover:bg-blue-50 hover:text-blue-600'
      }`}
    >
      <Icon size={20} />
      <span className="font-medium">{label}</span>
    </Link>
  );
};

export const Layout = ({ children }: { children?: React.ReactNode }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [userRole, setUserRole] = useState<Role | string>('');
  const [userName, setUserName] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

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

  // Define allowed routes for each role
  const shouldShow = (path: string) => {
    if (userRole === 'Admin') return true;
    
    switch (userRole) {
      case 'Manager':
        return ['/dashboard', '/expenses', '/incoming', '/reports', '/clients'].includes(path);
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
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`fixed md:sticky top-0 h-screen w-64 bg-white border-r border-gray-200 z-30 transform transition-transform duration-200 ease-in-out flex flex-col ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">M</div>
            <span className="text-xl font-bold text-gray-800">MoneyFlow</span>
          </div>
          <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden text-gray-500">
            <X size={24} />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {shouldShow('/dashboard') && <NavItem to="/dashboard" icon={LayoutDashboard} label="Dashboard" onClick={() => setIsMobileMenuOpen(false)} />}
          {shouldShow('/expenses') && <NavItem to="/expenses" icon={Wallet} label="Expenses" onClick={() => setIsMobileMenuOpen(false)} />}
          {shouldShow('/incoming') && <NavItem to="/incoming" icon={TrendingUp} label="Incoming" onClick={() => setIsMobileMenuOpen(false)} />}
          {shouldShow('/recurring') && <NavItem to="/recurring" icon={Repeat} label="Recurring" onClick={() => setIsMobileMenuOpen(false)} />}
          {shouldShow('/reports') && <NavItem to="/reports" icon={FileBarChart} label="Reports" onClick={() => setIsMobileMenuOpen(false)} />}
          {shouldShow('/clients') && <NavItem to="/clients" icon={Briefcase} label="Clients" onClick={() => setIsMobileMenuOpen(false)} />}
          {shouldShow('/users') && <NavItem to="/users" icon={Users} label="Team Members" onClick={() => setIsMobileMenuOpen(false)} />}
          
          <div className="pt-4 mt-4 border-t border-gray-100">
             {shouldShow('/settings') && <NavItem to="/settings" icon={Settings} label="Settings" onClick={() => setIsMobileMenuOpen(false)} />}
          </div>
        </nav>

        <div className="p-4 border-t border-gray-100">
          <button 
            onClick={handleLogout}
            className="flex items-center space-x-3 px-4 py-3 w-full text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut size={20} />
            <span className="font-medium">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-6 sticky top-0 z-10">
          <button 
            onClick={() => setIsMobileMenuOpen(true)}
            className="md:hidden text-gray-600 hover:text-gray-900"
          >
            <Menu size={24} />
          </button>

          <div className="flex items-center justify-end w-full space-x-4">
            <button className="p-2 text-gray-400 hover:text-gray-600 relative">
              <Bell size={20} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
            </button>
            <div className="flex items-center space-x-3 pl-4 border-l border-gray-200">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold text-gray-800">{userName}</p>
                <p className="text-xs text-gray-500">{userRole}</p>
              </div>
              <div className="h-10 w-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-500">
                <UserCircle size={28} />
              </div>
            </div>
          </div>
        </header>

        {/* Page Content Scroller */}
        <div className="flex-1 overflow-auto p-6 scroll-smooth">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};
