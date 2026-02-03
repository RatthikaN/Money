
import { useState, useEffect } from 'react';
import { DashboardMetrics, Expense, IncomingPayment, RecurringItem, User, GeneralSettings, CloudMailSettings, SocialSettings, PersonalSettings, Budget } from '../types';

const API_URL = "http://localhost:5000/api";

const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return token ? { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
};

const handleResponse = async (res: Response) => {
  if (res.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userName');
    window.location.href = '/#/login';
    throw new Error('Session expired. Please login again.');
  }
  
  const data = await res.json();

  if (!res.ok) {
    let errorMessage = data.message || `Request failed (${res.status})`;
    if (data.details) {
        errorMessage += `: ${data.details}`;
    }
    throw new Error(errorMessage);
  }
  return data;
};

export const currencySymbols: Record<string, string> = {
  USD: '$', EUR: '€', GBP: '£', INR: '₹', JPY: '¥', AUD: 'A$', CAD: 'C$', SGD: 'S$', CHF: 'Fr', CNY: '¥', 
  HKD: 'HK$', NZD: 'NZ$', SEK: 'kr', KRW: '₩', NOK: 'kr', MXN: '$', ZAR: 'R', TRY: '₺', 
  BRL: 'R$', TWD: 'NT$', DKK: 'kr', PLN: 'zł', THB: '฿', IDR: 'Rp', HUF: 'Ft', CZK: 'Kč', ILS: '₪', 
  CLP: '$', PHP: '₱', AED: 'د.إ', SAR: '﷼', MYR: 'RM', RON: 'lei', RUB: 'ر.ب', KWD: 'KD', BHD: 'BD',
  QAR: '﷼', OMR: '﷼', JOD: 'JD', LBP: 'ل.ل', EGP: 'E£', VND: '₫', NGN: '₦', PKR: '₨'
};

export const timezones = [
  "UTC", "Pacific/Midway", "Pacific/Honolulu", "America/Anchorage", "America/Los_Angeles", "America/Phoenix", 
  "America/Denver", "America/Chicago", "America/New_York", "America/Caracas", "America/Sao_Paulo", 
  "America/St_Johns", "Atlantic/Azores", "Europe/London", "Europe/Paris", "Europe/Zurich", "Europe/Berlin", 
  "Europe/Istanbul", "Europe/Moscow", "Africa/Cairo", "Africa/Johannesburg", "Asia/Dubai", "Asia/Karachi", 
  "Asia/Kolkata", "Asia/Dhaka", "Asia/Bangkok", "Asia/Singapore", "Asia/Hong_Kong", "Asia/Tokyo", 
  "Asia/Seoul", "Australia/Perth", "Australia/Adelaide", "Australia/Sydney", "Australia/Brisbane", "Pacific/Auckland", "Pacific/Fiji"
];

const defaultGeneral: GeneralSettings = { companyName: 'MoneyFlow Inc.', email: 'admin@moneyflow.com', currency: 'USD', timezone: 'UTC', dateFormat: 'YYYY-MM-DD', taxId: '' };
const defaultCloudMail: CloudMailSettings = { apiKey: '', senderName: 'MoneyFlow Admin', senderEmail: '', isEnabled: false };
const defaultSocial: SocialSettings = { website: '', facebook: '', twitter: '', linkedin: '', instagram: '', customLinks: [] };
const defaultPersonal: PersonalSettings = { name: 'Demo Admin', email: 'demo@demo.com', twoFactorEnabled: false };

export const getCurrencySymbol = () => {
  const generalStr = localStorage.getItem('generalSettings');
  const general = generalStr ? JSON.parse(generalStr) : {};
  const code = general.currency || 'USD';
  return currencySymbols[code] || '$';
};

export const useCurrency = () => {
  const [symbol, setSymbol] = useState(getCurrencySymbol());
  useEffect(() => {
    const handleStorageChange = () => setSymbol(getCurrencySymbol());
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);
  return symbol;
};

export const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (!file.type.startsWith('image/')) {
        return resolve(dataUrl);
      }
      const img = new Image();
      img.src = dataUrl;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1200; 
        const MAX_HEIGHT = 1200;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.7)); 
      };
      img.onerror = () => resolve(dataUrl); 
    };
    reader.onerror = reject;
  });
};

const fetchSetting = async <T>(section: string, defaultData: T): Promise<T> => {
    try {
        const res = await fetch(`${API_URL}/settings/${section.toLowerCase()}`, { headers: getAuthHeader() });
        if (!res.ok) return defaultData;
        const data = await res.json();
        if (section.toLowerCase() === 'general') {
          localStorage.setItem('generalSettings', JSON.stringify(data));
        }
        return Object.keys(data).length > 0 ? { ...defaultData, ...data } : defaultData;
    } catch (e) {
        return defaultData;
    }
};

export const api = {
  auth: {
    login: async (email: string, password: string) => {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      return handleResponse(res);
    },
    register: async (data: any) => {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    }
  },
  settings: {
    getGeneral: async (): Promise<GeneralSettings> => fetchSetting('general', defaultGeneral),
    getCloudMail: async (): Promise<CloudMailSettings> => fetchSetting('cloudmail', defaultCloudMail),
    getSocial: async (): Promise<SocialSettings> => fetchSetting('social', defaultSocial),
    getPersonal: async (): Promise<PersonalSettings> => fetchSetting('personal', defaultPersonal),
    update: async (section: string, data: any) => {
      const res = await fetch(`${API_URL}/settings/${section.toLowerCase()}`, {
        method: 'POST',
        headers: getAuthHeader(),
        body: JSON.stringify(data)
      });
      const result = await handleResponse(res);
      if (section.toLowerCase() === 'general') {
        localStorage.setItem('generalSettings', JSON.stringify(data));
        window.dispatchEvent(new Event('storage'));
      }
      return result;
    },
    send2FAOtp: async () => {
      const res = await fetch(`${API_URL}/settings/2fa/send`, { method: 'POST', headers: getAuthHeader() });
      return handleResponse(res);
    },
    verify2FAOtp: async (code: string) => {
      const res = await fetch(`${API_URL}/settings/2fa/verify`, { method: 'POST', headers: getAuthHeader(), body: JSON.stringify({ code }) });
      return handleResponse(res);
    },
    testCloudMail: async (data: any) => {
      const res = await fetch(`${API_URL}/settings/cloudmail/test`, { method: 'POST', headers: getAuthHeader(), body: JSON.stringify(data) });
      return handleResponse(res);
    }
  },
  dashboard: { 
    getStats: async (month?: number, year?: number): Promise<DashboardMetrics> => {
      try {
        const queryParams = new URLSearchParams();
        if (month) queryParams.append('month', month.toString());
        if (year) queryParams.append('year', year.toString());
        const res = await fetch(`${API_URL}/dashboard/stats?${queryParams.toString()}`, { headers: getAuthHeader() });
        return await handleResponse(res);
      } catch (error) {
        if (error instanceof TypeError && error.message === "Failed to fetch") {
          throw new Error("BACKEND_CONNECTION_REFUSED");
        }
        throw error;
      }
    } 
  },
  expenses: { 
    getAll: async (): Promise<Expense[]> => handleResponse(await fetch(`${API_URL}/expenses`, { headers: getAuthHeader() })),
    create: async (data: Partial<Expense>) => handleResponse(await fetch(`${API_URL}/expenses`, { method: 'POST', headers: getAuthHeader(), body: JSON.stringify(data) })),
    update: async (id: string, data: Partial<Expense>) => handleResponse(await fetch(`${API_URL}/expenses/${id}`, { method: 'PUT', headers: getAuthHeader(), body: JSON.stringify(data) })),
    delete: async (id: string) => handleResponse(await fetch(`${API_URL}/expenses/${id}`, { method: 'DELETE', headers: getAuthHeader() }))
  },
  incoming: { 
    getAll: async (): Promise<IncomingPayment[]> => handleResponse(await fetch(`${API_URL}/incoming`, { headers: getAuthHeader() })),
    create: async (data: Partial<IncomingPayment>) => handleResponse(await fetch(`${API_URL}/incoming`, { method: 'POST', headers: getAuthHeader(), body: JSON.stringify(data) })),
    update: async (id: string, data: Partial<IncomingPayment>) => handleResponse(await fetch(`${API_URL}/incoming/${id}`, { method: 'PUT', headers: getAuthHeader(), body: JSON.stringify(data) })),
    delete: async (id: string) => handleResponse(await fetch(`${API_URL}/incoming/${id}`, { method: 'DELETE', headers: getAuthHeader() }))
  },
  recurring: { 
    getAll: async (): Promise<RecurringItem[]> => handleResponse(await fetch(`${API_URL}/recurring`, { headers: getAuthHeader() })),
    create: async (data: Partial<RecurringItem>) => handleResponse(await fetch(`${API_URL}/recurring`, { method: 'POST', headers: getAuthHeader(), body: JSON.stringify(data) })),
    update: async (id: string, data: Partial<RecurringItem>) => handleResponse(await fetch(`${API_URL}/recurring/${id}`, { method: 'PUT', headers: getAuthHeader(), body: JSON.stringify(data) })),
    delete: async (id: string) => handleResponse(await fetch(`${API_URL}/recurring/${id}`, { method: 'DELETE', headers: getAuthHeader() }))
  },
  users: { 
    getAll: async (): Promise<User[]> => handleResponse(await fetch(`${API_URL}/users`, { headers: getAuthHeader() })),
    create: async (data: Partial<User>) => handleResponse(await fetch(`${API_URL}/users`, { method: 'POST', headers: getAuthHeader(), body: JSON.stringify(data) })),
    update: async (id: string, data: Partial<User>) => handleResponse(await fetch(`${API_URL}/users/${id}`, { method: 'PUT', headers: getAuthHeader(), body: JSON.stringify(data) })),
    delete: async (id: string) => handleResponse(await fetch(`${API_URL}/users/${id}`, { method: 'DELETE', headers: getAuthHeader() }))
  },
  clients: { 
    getAll: async (): Promise<User[]> => {
      const users = await handleResponse(await fetch(`${API_URL}/users`, { headers: getAuthHeader() }));
      return users.filter((u: User) => u.role === 'Client');
    },
    create: async (data: Partial<User>) => handleResponse(await fetch(`${API_URL}/users`, { method: 'POST', headers: getAuthHeader(), body: JSON.stringify({ ...data, role: 'Client' }) })),
    update: async (id: string, data: Partial<User>) => handleResponse(await fetch(`${API_URL}/users/${id}`, { method: 'PUT', headers: getAuthHeader(), body: JSON.stringify(data) })),
    delete: async (id: string) => handleResponse(await fetch(`${API_URL}/users/${id}`, { method: 'DELETE', headers: getAuthHeader() }))
  },
  // Added budgets API domain to resolve errors in BudgetPage
  budgets: {
    getAll: async (period?: string): Promise<Budget[]> => {
      const queryParams = new URLSearchParams();
      if (period) queryParams.append('period', period);
      const res = await fetch(`${API_URL}/budgets?${queryParams.toString()}`, { headers: getAuthHeader() });
      return handleResponse(res);
    },
    upsert: async (data: Partial<Budget>) => {
      const res = await fetch(`${API_URL}/budgets`, { 
        method: 'POST', 
        headers: getAuthHeader(), 
        body: JSON.stringify(data) 
      });
      return handleResponse(res);
    },
    delete: async (id: string) => {
      const res = await fetch(`${API_URL}/budgets/${id}`, { 
        method: 'DELETE', 
        headers: getAuthHeader() 
      });
      return handleResponse(res);
    }
  }
};
