
export type Status = 'Pending' | 'Paid' | 'Overdue' | 'Partial';
export type PaymentMode = 'Cash' | 'Bank' | 'UPI';
export type Role = 'Admin' | 'Manager' | 'Accountant' | 'Auditor' | 'Client';
export type TaxType = 'Inclusive' | 'Exclusive';

export interface Attachment {
  name: string;
  data: string; // Base64 string
  type: string; // MIME type
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: 'Active' | 'Inactive';
  createdAt?: string;
  phoneNumber?: string;
  companyName?: string;
  gstNumber?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
}

export interface CloudMailSettings {
  apiKey: string;
  senderName: string;
  senderEmail: string;
  isEnabled: boolean;
}

export interface GeneralSettings {
  companyName: string;
  email: string;
  currency: string;
  timezone: string;
  dateFormat: string;
  phoneNumber?: string;
  address?: string;
  taxId?: string;
}

export interface CustomLink {
  id: string;
  label: string;
  url: string;
}

export interface SocialSettings {
  website: string;
  facebook: string;
  twitter: string;
  linkedin: string;
  instagram: string;
  customLinks: CustomLink[];
}

export interface PersonalSettings {
  name: string;
  email: string;
  twoFactorEnabled: boolean;
}

export interface ExpenseItem {
  product: string;
  amount: number;
  tax: number;
  subtotal: number;
  paid: number;
  due: number;
}

export interface Expense {
  id: string;
  date: string;
  name: string;
  shop: string;
  category: string;
  product?: string;
  actualAmount: number;
  paidAmount: number;
  dueAmount: number;
  status: Status;
  items: ExpenseItem[];
  attachments: (string | Attachment)[];
}

export interface IncomingItem {
  product: string;
  amount: number;
  taxRate: number;
  taxType: TaxType;
  total: number;
}

export interface IncomingPayment {
  id: string;
  date: string;
  client: string;
  category: string;
  project?: string;
  paymentType: 'One Time Payment' | 'Recurring';
  actualAmount: number;
  paidAmount: number;
  dueAmount: number;
  status: Status;
  mode: PaymentMode;
  transactionNo?: string;
  items: IncomingItem[];
  attachments: (string | Attachment)[];
}

export interface RecurringItem {
  id: string;
  name: string;
  type: 'Expense' | 'Income';
  frequency: 'Daily' | 'Weekly' | 'Monthly' | 'Yearly';
  amount: number;
  taxRate: number;
  taxType: TaxType;
  nextRunDate: string;
  status: 'Active' | 'Inactive';
}

export interface ClientProfitability {
  client: string;
  income: number;
  expense: number;
  profit: number;
  status: 'Profit' | 'Loss';
  hasProjected: boolean;
}

export interface DashboardMetrics {
  totalIncoming: number;
  totalReceived: number;
  totalDue: number;
  totalExpenses: number;
  totalExpensesPaid: number;
  totalExpensesDue: number;
  netCashFlow: number;
  totalOnline: number;
  chartData: { name: string; income: number; expense: number }[];
  clientReport: ClientProfitability[];
  recentUsers: User[];
}

// Fix: Exporting Budget interface to resolve missing member error in Budget.tsx
export interface Budget {
  id: string;
  category: string;
  limit: number;
  period: string; // Format: YYYY-MM
  spent: number;
}
