import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, ensureDefaults } from '../database/db';
import { AR } from '../constants/arabicTerms';
import { AlertTriangle, Settings as SettingsIcon, Save } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import { Separator } from '../components/ui/separator';
import { resetDatabase } from '../database/queries';
import { toast } from 'sonner';
import type { SystemSettings } from '../models/types';
import DataEngine from '../backup/DataEngine';

export default function SettingsPage() {
  const settings = useLiveQuery(() => db.settings.get('singleton'), []);
  const [form, setForm] = useState<SystemSettings | null>(null);

  useEffect(() => {
    if (settings) setForm(settings);
    else ensureDefaults();
  }, [settings]);

  const save = async () => {
    if (!form) return;
    await db.settings.put(form);
    toast.success('تم حفظ الإعدادات');
  };

  const requestNotif = async () => {
    if (!('Notification' in window)) {
      toast.error('المتصفح لا يدعم الإشعارات');
      return;
    }
    const perm = await Notification.requestPermission();
    if (perm === 'granted') {
      new Notification(AR.app.title, { body: 'الإشعارات مفعّلة الآن.', dir: 'rtl', lang: 'ar' });
      toast.success('تم تفعيل الإشعارات');
    } else {
      toast.error('تم رفض إذن الإشعارات');
    }
  };

  const resetAll = async () => {
    if (!confirm(AR.settings.resetWarning + '\nهل تريد المتابعة؟')) return;
    await resetDatabase();
    await ensureDefaults();
    toast.success('تم حذف جميع البيانات');
  };

  if (!form) return <div className="text-muted-foreground py-8 text-center">{AR.common.loading}</div>;

  return (
    <div className="space-y-6" data-testid="settings-page">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <SettingsIcon className="h-6 w-6" /> {AR.nav.settings}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">ضبط بيانات الشركة والنسخ الاحتياطي.</p>
      </div>

      <Card className="glass border-0">
        <CardHeader><CardTitle className="text-base">{AR.settings.profile}</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label={AR.settings.ownerName}>
            <Input value={form.ownerName} onChange={(e) => setForm({ ...form, ownerName: e.target.value })} data-testid="settings-owner-input" />
          </Field>
          <Field label={AR.settings.companyName}>
            <Input value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} data-testid="settings-company-input" />
          </Field>
          <Field label={AR.settings.phone}>
            <Input dir="ltr" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} data-testid="settings-phone-input" />
          </Field>
          <Field label={AR.settings.email}>
            <Input type="email" dir="ltr" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} data-testid="settings-email-input" />
          </Field>
          <Field label={AR.settings.taxNumber}>
            <Input value={form.taxNumber || ''} onChange={(e) => setForm({ ...form, taxNumber: e.target.value })} data-testid="settings-tax-input" />
          </Field>
          <Field label={AR.settings.currency}>
            <Input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} data-testid="settings-currency-input" />
          </Field>
          <div className="md:col-span-2 flex items-center justify-between rounded-2xl bg-muted/50 px-4 py-3">
            <div>
              <div className="text-sm font-medium">{AR.settings.enableNotifications}</div>
              <div className="text-xs text-muted-foreground">إشعارات فورية عند اقتراب الاستحقاقات وانتهاء العقود</div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={form.enableLocalNotifications}
                onCheckedChange={(v) => setForm({ ...form, enableLocalNotifications: v })}
                data-testid="settings-notifications-switch"
              />
              {form.enableLocalNotifications && (
                <Button size="sm" variant="outline" onClick={requestNotif} data-testid="request-notif-permission">
                  اختبار
                </Button>
              )}
            </div>
          </div>
          <div className="md:col-span-2 flex justify-end">
            <Button onClick={save} className="gap-1.5" data-testid="save-settings-button">
              <Save className="h-4 w-4" /> {AR.settings.saveSettings}
            </Button>
          </div>
        </CardContent>
      </Card>

      <DataEngine />

      <Card className="glass border-0 border-l-4 border-l-destructive">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-4 w-4" /> {AR.settings.dangerZone}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">{AR.settings.resetWarning}</p>
          <Separator />
          <Button variant="destructive" onClick={resetAll} data-testid="reset-database-button">
            {AR.settings.resetAll}
          </Button>
        </CardContent>
      </Card>
    </div>
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
