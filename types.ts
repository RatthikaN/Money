
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

export interface SmtpSettings {
  host: string;
  port: number;
  username: string;
  password?: string;
  secure: boolean;
  senderName: string;
  senderEmail: string;
  isEnabled: boolean;
}

// Keeping CloudMailSettings alias for backward compatibility in some components if needed
export type CloudMailSettings = SmtpSettings;

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
  taxType?: 'Exclusive' | 'Inclusive';
  taxAmount?: number;
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
  client?: string;
  actualAmount: number;
  paidAmount: number;
  dueAmount: number;
  status: Status;
  items: ExpenseItem[];
  attachments: (string | Attachment)[];
}

export interface IncomingItem {
  id?: string;
  product: string;
  hsnSac?: string;
  quantity: number;
  rate: number;
  amount: number; // qty * rate
  taxRate: number;
  taxType: TaxType;
  taxAmount: number;
  total: number;
}

export interface IncomingPayment {
  id: string;
  date: string;
  client: string;
  category: string;
  project: string;
  paymentType: 'One Time Payment' | 'Recurring';
  taxType?: TaxType;
  taxRate?: number;
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
  taxRate?: number;
  taxType?: TaxType;
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

export interface Budget {
  id: string;
  category: string;
  limit: number;
  period: string; // Format: YYYY-MM
  spent: number;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'Info' | 'Success' | 'Warning' | 'Error';
  status: 'Unread' | 'Read';
  userId: number;
  createdAt: string;
}
