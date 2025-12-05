
import { DashboardMetrics, Expense, IncomingPayment, RecurringItem, User, GeneralSettings, SmtpSettings, BusinessSettings, SocialSettings, PersonalSettings } from '../types';

const API_URL = "http://localhost:5000/api";

// Helper to get JWT Token
const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return token ? { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
};

// Default Settings
const defaultGeneral: GeneralSettings = { companyName: 'MoneyFlow Inc.', email: 'admin@moneyflow.com', currency: 'USD', timezone: 'UTC', dateFormat: 'YYYY-MM-DD' };
const defaultSmtp: SmtpSettings = { host: 'smtp.gmail.com', port: 587, username: 'mailer@moneyflow.com', fromEmail: 'no-reply@moneyflow.com', enableSsl: true };
const defaultBusiness: BusinessSettings = { businessName: 'MoneyFlow Corp', taxId: 'TAX-123456', address: '123 Finance St, New York, NY' };
const defaultSocial: SocialSettings = { facebook: 'https://fb.com/moneyflow', twitter: 'https://x.com/moneyflow', linkedin: '', instagram: '' };
const defaultPersonal: PersonalSettings = { name: 'Demo Admin', email: 'demo@demo.com', twoFactorEnabled: false };

export const getCurrencySymbol = () => {
  // We keep a cached copy in localStorage for UI performance (synchronous access)
  // The actual source of truth is the DB, which updates this cache.
  try {
      const stored = localStorage.getItem('moneyflow_cached_currency');
      const currencyCode = stored || 'USD';
      switch (currencyCode) {
        case 'EUR': return '€';
        case 'GBP': return '£';
        case 'INR': return '₹';
        default: return '$';
      }
  } catch (e) {
      return '$';
  }
};

const fetchSetting = async <T>(section: string, defaultData: T): Promise<T> => {
    try {
        const res = await fetch(`${API_URL}/settings/${section.toLowerCase()}`, { headers: getAuthHeader() });
        if (!res.ok) return defaultData;
        const data = await res.json();
        // If empty object returned (not configured yet), use default
        return Object.keys(data).length > 0 ? data : defaultData;
    } catch (e) {
        console.error(`Failed to fetch ${section} settings`, e);
        return defaultData;
    }
};

const saveSetting = async (section: string, data: any) => {
    const res = await fetch(`${API_URL}/settings/${section.toLowerCase()}`, {
        method: 'POST',
        headers: getAuthHeader(),
        body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to save settings');
    return res.json();
};

export const api = {
  auth: {
    login: async (email: string, password: string) => {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Login failed');
      }
      return res.json();
    },
  },
  dashboard: {
    getStats: async (): Promise<DashboardMetrics> => {
      const res = await fetch(`${API_URL}/dashboard/stats`, { headers: getAuthHeader() });
      if (!res.ok) throw new Error('Failed to fetch stats');
      const data = await res.json();
      return {
        totalIncoming: Number(data.totalIncoming || 0),
        totalReceived: Number(data.totalReceived || 0),
        totalDue: Number(data.totalIncomingDue || 0),
        totalExpenses: Number(data.totalExpenses || 0),
        netCashFlow: Number(data.netCashFlow || 0),
      };
    }
  },
  expenses: {
    getAll: async () => {
      const res = await fetch(`${API_URL}/expenses`, { headers: getAuthHeader() });
      if (!res.ok) return [];
      return res.json();
    },
    create: async (data: Omit<Expense, 'id'>) => {
      const res = await fetch(`${API_URL}/expenses`, {
        method: 'POST',
        headers: getAuthHeader(),
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create expense');
      return res.json();
    },
    update: async (id: string, data: Partial<Expense>) => {
      const res = await fetch(`${API_URL}/expenses/${id}`, {
        method: 'PUT',
        headers: getAuthHeader(),
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update expense');
      return res.json();
    },
    delete: async (id: string) => {
      const res = await fetch(`${API_URL}/expenses/${id}`, {
        method: 'DELETE',
        headers: getAuthHeader(),
      });
      if (!res.ok) throw new Error('Failed to delete expense');
      return true;
    },
  },
  incoming: {
    getAll: async () => {
      const res = await fetch(`${API_URL}/incoming`, { headers: getAuthHeader() });
      if (!res.ok) return [];
      return res.json();
    },
    create: async (data: Omit<IncomingPayment, 'id'>) => {
      const res = await fetch(`${API_URL}/incoming`, {
        method: 'POST',
        headers: getAuthHeader(),
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create incoming payment');
      return res.json();
    },
    update: async (id: string, data: Partial<IncomingPayment>) => {
      const res = await fetch(`${API_URL}/incoming/${id}`, {
        method: 'PUT',
        headers: getAuthHeader(),
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update incoming payment');
      return res.json();
    },
    delete: async (id: string) => {
      const res = await fetch(`${API_URL}/incoming/${id}`, {
        method: 'DELETE',
        headers: getAuthHeader(),
      });
      if (!res.ok) throw new Error('Failed to delete incoming payment');
      return true;
    },
  },
  recurring: {
    getAll: async () => {
      const res = await fetch(`${API_URL}/recurring`, { headers: getAuthHeader() });
      if (!res.ok) return [];
      return res.json();
    },
    create: async (data: Omit<RecurringItem, 'id'>) => {
      const res = await fetch(`${API_URL}/recurring`, {
        method: 'POST',
        headers: getAuthHeader(),
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create recurring item');
      return res.json();
    },
    update: async (id: string, data: Partial<RecurringItem>) => {
      const res = await fetch(`${API_URL}/recurring/${id}`, {
        method: 'PUT',
        headers: getAuthHeader(),
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update recurring item');
      return res.json();
    },
    delete: async (id: string) => {
      const res = await fetch(`${API_URL}/recurring/${id}`, {
        method: 'DELETE',
        headers: getAuthHeader(),
      });
      if (!res.ok) throw new Error('Failed to delete recurring item');
      return true;
    },
  },
  users: {
    getAll: async () => {
      const res = await fetch(`${API_URL}/users`, { headers: getAuthHeader() });
      if (!res.ok) return [];
      return res.json();
    },
    create: async (data: Omit<User, 'id'>) => {
      const res = await fetch(`${API_URL}/users`, {
        method: 'POST',
        headers: getAuthHeader(),
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create user');
      return res.json();
    },
    update: async (id: string, data: Partial<User>) => {
      const res = await fetch(`${API_URL}/users/${id}`, {
        method: 'PUT',
        headers: getAuthHeader(),
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update user');
      return res.json();
    },
    delete: async (id: string) => {
      const res = await fetch(`${API_URL}/users/${id}`, {
        method: 'DELETE',
        headers: getAuthHeader(),
      });
      if (!res.ok) throw new Error('Failed to delete user');
      return true;
    },
  },
  clients: {
    getAll: async () => {
      const res = await fetch(`${API_URL}/users`, { headers: getAuthHeader() });
      if (!res.ok) return [];
      const users: User[] = await res.json();
      return users.filter(u => u.role === 'Client');
    },
    create: async (data: Omit<User, 'id' | 'role'>) => {
      const res = await fetch(`${API_URL}/users`, {
        method: 'POST',
        headers: getAuthHeader(),
        body: JSON.stringify({ ...data, role: 'Client', password: 'clientDefault123' }),
      });
      if (!res.ok) throw new Error('Failed to create client');
      return res.json();
    },
    update: async (id: string, data: Partial<User>) => {
      const res = await fetch(`${API_URL}/users/${id}`, {
        method: 'PUT',
        headers: getAuthHeader(),
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update client');
      return res.json();
    },
    delete: async (id: string) => {
      const res = await fetch(`${API_URL}/users/${id}`, {
        method: 'DELETE',
        headers: getAuthHeader(),
      });
      if (!res.ok) throw new Error('Failed to delete client');
      return true;
    }
  },
  settings: {
    getGeneral: async (): Promise<GeneralSettings> => fetchSetting('general', defaultGeneral),
    getSmtp: async (): Promise<SmtpSettings> => fetchSetting('smtp', defaultSmtp),
    getBusiness: async (): Promise<BusinessSettings> => fetchSetting('business', defaultBusiness),
    getSocial: async (): Promise<SocialSettings> => fetchSetting('social', defaultSocial),
    getPersonal: async (): Promise<PersonalSettings> => fetchSetting('personal', defaultPersonal),
    update: async (section: string, data: any) => {
      await saveSetting(section, data);
      
      // If general settings, cache currency for UI
      if (section === 'General' && data.currency) {
         localStorage.setItem('moneyflow_cached_currency', data.currency);
      }
      
      // If personal name changed, update local storage for header
      if (section === 'Personal' && data.name) {
         localStorage.setItem('userName', data.name);
      }
      return true;
    },
    toggle2FA: async (enable: boolean) => {
      // First get current
      const personal = await fetchSetting('personal', defaultPersonal);
      personal.twoFactorEnabled = enable;
      await saveSetting('personal', personal);
      return true;
    }
  }
};
