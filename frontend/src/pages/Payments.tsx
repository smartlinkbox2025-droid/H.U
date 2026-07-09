import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../database/db';
import { AR } from '../constants/arabicTerms';
import type { PaymentMethod, InvoiceStatus } from '../models/types';
import { recordPayment } from '../database/queries';
import { fmtDate, fmtMoney, toISODate } from '../utils/dateHelpers';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '../components/ui/table';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '../components/ui/dialog';
import { Wallet, Search } from 'lucide-react';
import { toast } from 'sonner';
import { exportToExcel } from '../utils/excelExporter';

const INV_TONE: Record<InvoiceStatus, string> = {
  paid: 'bg-success/15 text-success border-success/30',
  partial: 'bg-accent/15 text-accent border-accent/30',
  overdue: 'bg-destructive/15 text-destructive border-destructive/30',
  unpaid: 'bg-warning/15 text-warning border-warning/30',
};

export default function Payments() {
  const invoices = useLiveQuery(() => db.invoices.toArray(), []) || [];
  const properties = useLiveQuery(() => db.properties.toArray(), []) || [];
  const customers = useLiveQuery(() => db.customers.toArray(), []) || [];
  const payments = useLiveQuery(() => db.payments.orderBy('paymentDate').reverse().toArray(), []) || [];

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | InvoiceStatus>('all');
  const [tab, setTab] = useState<'invoices' | 'history'>('invoices');
  const [payDialog, setPayDialog] = useState<{ invoiceId: string; contractId: string; balance: number } | null>(null);

  const propName = (id: string) => properties.find((p) => p.id === id)?.name || '—';
  const custName = (id: string) => customers.find((c) => c.id === id)?.fullName || '—';

  const filtered = useMemo(() => {
    return invoices
      .filter((i) => {
        if (statusFilter !== 'all' && i.status !== statusFilter) return false;
        if (search) {
          const s = search.toLowerCase();
          const cust = custName(i.customerId).toLowerCase();
          const prop = propName(i.propertyId).toLowerCase();
          if (!i.invoiceNumber.toLowerCase().includes(s) && !cust.includes(s) && !prop.includes(s)) return false;
        }
        return true;
      })
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }, [invoices, statusFilter, search, properties, customers]);

  const exportExcel = () => {
    exportToExcel({
      filename: `الفواتير_${new Date().toISOString().slice(0, 10)}`,
      sheetName: 'الفواتير',
      headers: [AR.invoice.number, AR.contract.customer, AR.contract.property, AR.invoice.dueDate, AR.invoice.amountDue, AR.invoice.amountPaid, AR.invoice.balance, AR.invoice.status],
      rows: filtered.map((i) => [
        i.invoiceNumber,
        custName(i.customerId),
        propName(i.propertyId),
        i.dueDate,
        i.amountDue,
        i.amountPaid,
        i.amountDue - i.amountPaid,
        AR.invoice.statuses[i.status],
      ]),
      columnWidths: [16, 24, 24, 14, 14, 14, 14, 14],
    });
    toast.success('تم تصدير ملف إكسل');
  };

  return (
    <div className="space-y-4" data-testid="payments-page">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Wallet className="h-6 w-6" /> {AR.nav.payments}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">فواتير ومدفوعات — تتبع الاستحقاقات والسداد.</p>
        </div>
        <Button variant="outline" onClick={exportExcel} data-testid="export-excel-button">{AR.actions.exportExcel}</Button>
      </div>

      <div className="flex gap-2">
        <Button variant={tab === 'invoices' ? 'default' : 'outline'} onClick={() => setTab('invoices')} data-testid="tab-invoices">الفواتير</Button>
        <Button variant={tab === 'history' ? 'default' : 'outline'} onClick={() => setTab('history')} data-testid="tab-history">سجل المدفوعات</Button>
      </div>

      {tab === 'invoices' && (
        <>
          <Card className="glass border-0 p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  data-testid="payments-search-input"
                  className="pr-9"
                  placeholder="ابحث برقم الفاتورة أو العميل أو العقار…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
                <SelectTrigger data-testid="invoice-status-filter"><SelectValue placeholder={AR.invoice.status} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{AR.actions.all}</SelectItem>
                  {(Object.keys(AR.invoice.statuses) as InvoiceStatus[]).map((k) => (
                    <SelectItem key={k} value={k}>{AR.invoice.statuses[k]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </Card>

          <Card className="glass border-0 overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{AR.invoice.number}</TableHead>
                    <TableHead>{AR.contract.customer}</TableHead>
                    <TableHead>{AR.contract.property}</TableHead>
                    <TableHead>{AR.invoice.dueDate}</TableHead>
                    <TableHead>{AR.invoice.amountDue}</TableHead>
                    <TableHead>{AR.invoice.balance}</TableHead>
                    <TableHead>{AR.invoice.status}</TableHead>
                    <TableHead className="text-left">{AR.payment.recordPayment}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-10 text-muted-foreground">{AR.common.empty}</TableCell></TableRow>
                  ) : filtered.map((i) => {
                    const balance = i.amountDue - i.amountPaid;
                    return (
                      <TableRow key={i.id} data-testid={`invoice-row-${i.id}`}>
                        <TableCell className="num font-semibold">{i.invoiceNumber}</TableCell>
                        <TableCell>{custName(i.customerId)}</TableCell>
                        <TableCell>{propName(i.propertyId)}</TableCell>
                        <TableCell className="text-xs">{fmtDate(i.dueDate)}</TableCell>
                        <TableCell className="num">{fmtMoney(i.amountDue)}</TableCell>
                        <TableCell className="num">{fmtMoney(balance)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={INV_TONE[i.status]}>
                            {AR.invoice.statuses[i.status]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {balance > 0 && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setPayDialog({ invoiceId: i.id!, contractId: i.contractId, balance })}
                              data-testid={`pay-invoice-${i.id}`}
                            >
                              {AR.payment.recordPayment}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </Card>
        </>
      )}

      {tab === 'history' && (
        <Card className="glass border-0 overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{AR.payment.paymentDate}</TableHead>
                  <TableHead>{AR.payment.invoice}</TableHead>
                  <TableHead>{AR.payment.amountPaid}</TableHead>
                  <TableHead>{AR.payment.paymentMethod}</TableHead>
                  <TableHead>{AR.payment.referenceNumber}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground">{AR.common.empty}</TableCell></TableRow>
                ) : payments.map((p) => {
                  const inv = invoices.find((i) => i.id === p.invoiceId);
                  return (
                    <TableRow key={p.id} data-testid={`payment-row-${p.id}`}>
                      <TableCell>{fmtDate(p.paymentDate)}</TableCell>
                      <TableCell className="num">{inv?.invoiceNumber || '—'}</TableCell>
                      <TableCell className="num">{fmtMoney(p.amountPaid)}</TableCell>
                      <TableCell>{AR.payment.methods[p.paymentMethod]}</TableCell>
                      <TableCell className="num text-xs">{p.referenceNumber || '—'}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {payDialog && (
        <PaymentDialog
          {...payDialog}
          onClose={() => setPayDialog(null)}
        />
      )}
    </div>
  );
}

function PaymentDialog({
  invoiceId, contractId, balance, onClose,
}: {
  invoiceId: string;
  contractId: string;
  balance: number;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    amountPaid: balance,
    paymentDate: toISODate(new Date()),
    paymentMethod: 'cash' as PaymentMethod,
    referenceNumber: '',
  });

  const submit = async () => {
    if (!form.amountPaid || form.amountPaid <= 0) {
      toast.error('يرجى إدخال مبلغ صالح');
      return;
    }
    if (form.amountPaid > balance) {
      toast.error(`المبلغ يتجاوز الرصيد المتبقي (${fmtMoney(balance)})`);
      return;
    }
    try {
      await recordPayment({
        contractId, invoiceId,
        amountPaid: Number(form.amountPaid),
        paymentDate: new Date(form.paymentDate),
        paymentMethod: form.paymentMethod,
        referenceNumber: form.referenceNumber || undefined,
        status: 'completed',
      });
      toast.success('تم تسجيل السداد');
      onClose();
    } catch (e: any) {
      toast.error(e.message || AR.common.error);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md" data-testid="payment-dialog">
        <DialogHeader>
          <DialogTitle>{AR.payment.addNew}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="rounded-2xl bg-muted/60 px-4 py-3">
            <div className="text-xs text-muted-foreground">{AR.invoice.balance}</div>
            <div className="font-bold text-lg num">{fmtMoney(balance)}</div>
          </div>
          <Field label={AR.payment.amountPaid}>
            <Input
              type="number"
              value={form.amountPaid}
              onChange={(e) => setForm({ ...form, amountPaid: parseFloat(e.target.value) })}
              data-testid="payment-amount-input"
            />
          </Field>
          <Field label={AR.payment.paymentDate}>
            <Input
              type="date"
              value={form.paymentDate}
              onChange={(e) => setForm({ ...form, paymentDate: e.target.value })}
              data-testid="payment-date-input"
            />
          </Field>
          <Field label={AR.payment.paymentMethod}>
            <Select value={form.paymentMethod} onValueChange={(v) => setForm({ ...form, paymentMethod: v as PaymentMethod })}>
              <SelectTrigger data-testid="payment-method-select"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(AR.payment.methods) as PaymentMethod[]).map((k) => (
                  <SelectItem key={k} value={k}>{AR.payment.methods[k]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label={AR.payment.referenceNumber}>
            <Input
              value={form.referenceNumber}
              onChange={(e) => setForm({ ...form, referenceNumber: e.target.value })}
              data-testid="payment-reference-input"
            />
          </Field>
        </div>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={onClose}>{AR.actions.cancel}</Button>
          <Button onClick={submit} data-testid="payment-save-button">{AR.actions.confirm}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
