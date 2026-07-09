import Dexie, { Table } from 'dexie';
import type {
  Property, Customer, Contract, Payment, Invoice,
  DocumentFile, Notification, ActivityLog, SystemSettings,
} from '../models/types';

export class SmartRealEstateDB extends Dexie {
  properties!: Table<Property, string>;
  customers!: Table<Customer, string>;
  contracts!: Table<Contract, string>;
  payments!: Table<Payment, string>;
  invoices!: Table<Invoice, string>;
  documents!: Table<DocumentFile, string>;
  notifications!: Table<Notification, string>;
  activityLogs!: Table<ActivityLog, string>;
  settings!: Table<SystemSettings, string>;

  constructor() {
    super('SmartRealEstateDB');
    this.version(1).stores({
      properties: '++id, name, type, status, price, city',
      customers: '++id, fullName, nationalId, phone, email',
      contracts: '++id, propertyId, customerId, contractType, status, startDate, endDate',
      payments: '++id, contractId, invoiceId, paymentDate, status',
      invoices: '++id, contractId, customerId, propertyId, invoiceNumber, dueDate, status',
      documents: '++id, relatedType, relatedId, uploadedAt',
      notifications: '++id, type, isRead, triggerDate',
      activityLogs: '++id, module, timestamp',
      settings: 'id',
    });
  }
}

export const db = new SmartRealEstateDB();

// Ensure default settings singleton exists.
export async function ensureDefaults(): Promise<SystemSettings> {
  const existing = await db.settings.get('singleton');
  if (existing) return existing;
  const defaults: SystemSettings = {
    id: 'singleton',
    ownerName: '',
    companyName: 'المتخصص الذكي للعقارات',
    phone: '',
    email: '',
    taxNumber: '',
    currency: 'SAR',
    theme: (localStorage.getItem('sre_theme') as 'light' | 'dark') || 'light',
    enableLocalNotifications: true,
  };
  await db.settings.put(defaults);
  return defaults;
}
