
export type Status = 'Pending' | 'Paid' | 'Overdue' | 'Partial';
export type PaymentMode = 'Cash' | 'Bank' | 'UPI';
export type Role = 'Admin' | 'Manager' | 'Accountant' | 'Auditor' | 'Client';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: 'Active' | 'Inactive';
}

export interface Expense {
  id: string;
  date: string;
  name: string;
  shop: string;
  product: string;
  actualAmount: number;
  paidAmount: number;
  dueAmount: number;
  status: Status;
}

export interface IncomingPayment {
  id: string;
  date: string;
  paidDate?: string;
  client: string;
  project: string;
  paymentType: string;
  actualAmount: number;
  paidAmount: number;
  dueAmount: number;
  status: Status;
  mode: PaymentMode;
  transactionNo?: string;
}

export interface RecurringItem {
  id: string;
  name: string;
  type: 'Expense' | 'Income';
  frequency: 'Daily' | 'Weekly' | 'Monthly' | 'Yearly';
  nextRunDate: string;
  status: 'Active' | 'Inactive';
  amount: number;
}

export interface DashboardMetrics {
  totalIncoming: number;
  totalReceived: number;
  totalDue: number;
  totalExpenses: number;
  netCashFlow: number;
  totalOnline: number;
  chartData?: { name: string; income: number; expense: number }[];
}

export interface GeneralSettings {
  companyName: string;
  email: string;
  currency: string;
  timezone: string;
  dateFormat: string;
  phoneNumber?: string;
  address?: string;
}

export interface SmtpSettings {
  host: string;
  port: number;
  username: string;
  fromEmail: string;
  enableSsl: boolean;
}

export interface BusinessSettings {
  businessName: string;
  taxId: string;
  address: string;
}

export interface SocialSettings {
  facebook: string;
  twitter: string;
  linkedin: string;
  instagram: string;
}

export interface PersonalSettings {
  name: string;
  email: string;
  twoFactorEnabled: boolean;
}