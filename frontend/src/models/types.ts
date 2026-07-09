// Consolidated TypeScript models for المتخصص الذكي للعقارات

export type PropertyType = 'apartment' | 'villa' | 'building' | 'commercial';
export type PropertyStatus = 'vacant' | 'rented' | 'sold' | 'archived';
export type ContractType = 'rent' | 'sale';
export type PaymentFrequency = 'monthly' | 'quarterly' | 'annually' | 'one_time';
export type ContractStatus = 'active' | 'extended' | 'terminated' | 'canceled' | 'draft';
export type PaymentMethod = 'cash' | 'bank_transfer' | 'check' | 'card';
export type PaymentStatus = 'completed' | 'partially_refunded' | 'refunded';
export type InvoiceStatus = 'paid' | 'partial' | 'overdue' | 'unpaid';
export type DocumentRelated = 'property' | 'contract' | 'customer';
export type NotificationType = 'payment_due' | 'contract_expiry' | 'system_alert';
export type ActivityModule = 'properties' | 'customers' | 'contracts' | 'payments' | 'system';
export type ThemeMode = 'light' | 'dark';

export interface Property {
  id?: string;
  name: string;
  type: PropertyType;
  status: PropertyStatus;
  address: string;
  city: string;
  price: number;
  currency: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Customer {
  id?: string;
  fullName: string;
  nationalId: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  notes?: string;
  createdAt: Date;
}

export interface Contract {
  id?: string;
  propertyId: string;
  customerId: string;
  contractType: ContractType;
  startDate: Date;
  endDate: Date;
  totalAmount: number;
  paymentFrequency: PaymentFrequency;
  remainingBalance: number;
  penaltyRate: number;
  status: ContractStatus;
  createdAt: Date;
}

export interface Payment {
  id?: string;
  contractId: string;
  invoiceId: string;
  amountPaid: number;
  paymentDate: Date;
  paymentMethod: PaymentMethod;
  referenceNumber?: string;
  status: PaymentStatus;
}

export interface Invoice {
  id?: string;
  contractId: string;
  customerId: string;
  propertyId: string;
  invoiceNumber: string;
  dueDate: Date;
  amountDue: number;
  amountPaid: number;
  status: InvoiceStatus;
  createdAt: Date;
}

export interface DocumentFile {
  id?: string;
  relatedType: DocumentRelated;
  relatedId: string;
  fileName: string;
  fileType: string;
  fileDataBase64: string;
  uploadedAt: Date;
}

export interface Notification {
  id?: string;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  triggerDate: Date;
}

export interface ActivityLog {
  id?: string;
  action: string;
  module: ActivityModule;
  timestamp: Date;
  details: string;
}

export interface SystemSettings {
  id: string;
  ownerName: string;
  companyName: string;
  phone: string;
  email: string;
  taxNumber?: string;
  currency: string;
  theme: ThemeMode;
  enableLocalNotifications: boolean;
}
