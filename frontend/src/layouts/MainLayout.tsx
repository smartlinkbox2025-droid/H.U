import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Building2, Users, FileText, Wallet, Settings,
  Bell, Sun, Moon, WifiOff, Wifi, Download, RefreshCw,
  BarChart3, HomeIcon,
} from 'lucide-react';
import { ReactNode, useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, ensureDefaults } from '../database/db';
import { AR } from '../constants/arabicTerms';
import { usePWA } from '../hooks/usePWA';
import { Button } from '../components/ui/button';
import { seedDemoData, refreshOverdueInvoices } from '../database/queries';
import { Toaster } from '../components/ui/sonner';

const NAV = [
  { to: '/', label: AR.nav.dashboard, icon: LayoutDashboard, exact: true },
  { to: '/properties', label: AR.nav.properties, icon: Building2 },
  { to: '/customers', label: AR.nav.customers, icon: Users },
  { to: '/contracts', label: AR.nav.contracts, icon: FileText },
  { to: '/payments', label: AR.nav.payments, icon: Wallet },
  { to: '/reports/financial', label: AR.nav.financialReport, icon: BarChart3 },
  { to: '/reports/vacancy', label: AR.nav.vacancyTracker, icon: HomeIcon },
  { to: '/settings', label: AR.nav.settings, icon: Settings },
];

export default function MainLayout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { isOnline, canInstall, promptInstall, needRefresh, applyUpdate } = usePWA();
  const [themeDark, setThemeDark] = useState<boolean>(document.documentElement.classList.contains('dark'));

  const notifCount = useLiveQuery(async () => {
    return await db.notifications.where('isRead').equals(0 as any).count().catch(() => 0);
  }, []) ?? 0;

  useEffect(() => {
    (async () => {
      await ensureDefaults();
      await seedDemoData();
      await refreshOverdueInvoices();
    })();
  }, []);

  const toggleTheme = () => {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('sre_theme', isDark ? 'dark' : 'light');
    setThemeDark(isDark);
    db.settings.update('singleton', { theme: isDark ? 'dark' : 'light' }).catch(() => {});
  };

  return (
    <div className="min-h-screen w-full bg-background text-foreground grain">
      {/* Ambient gradient blobs — subtle depth */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden -z-10">
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-accent/10 blur-3xl" />
        <div className="absolute bottom-0 -left-40 h-96 w-96 rounded-full bg-success/10 blur-3xl" />
      </div>

      <div className="flex min-h-screen">
        {/* Sidebar (desktop) */}
        <aside
          className="hidden lg:flex fixed inset-y-0 right-0 w-72 flex-col p-5 gap-2 z-30"
          data-testid="main-sidebar"
        >
          <div className="glass rounded-3xl p-5 flex-1 flex flex-col">
            <div className="flex items-center gap-3 mb-8">
              <div className="h-11 w-11 rounded-2xl bg-primary text-primary-foreground grid place-items-center font-bold text-lg">
                م
              </div>
              <div>
                <h1 className="text-base font-bold leading-tight">{AR.app.title}</h1>
                <p className="text-xs text-muted-foreground">{AR.app.tagline}</p>
              </div>
            </div>
            <nav className="flex-1 space-y-1">
              {NAV.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.exact}
                    data-testid={`nav-${item.to.replace(/\//g, '-') || 'root'}`}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-2xl px-4 py-3 text-sm transition-all
                       hover:bg-muted/60 ${
                         isActive
                           ? 'bg-primary text-primary-foreground shadow-soft'
                           : 'text-foreground/80'
                       }`
                    }
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    <span className="font-medium">{item.label}</span>
                  </NavLink>
                );
              })}
            </nav>
            <div className="mt-4 pt-4 border-t border-border/60 space-y-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                {isOnline ? (
                  <><Wifi className="h-3.5 w-3.5 text-success" /> {AR.online}</>
                ) : (
                  <><WifiOff className="h-3.5 w-3.5 text-warning" /> {AR.offline}</>
                )}
              </div>
              <div>© {new Date().getFullYear()} — {AR.app.shortTitle}</div>
            </div>
          </div>
        </aside>

        {/* Main area */}
        <main className="flex-1 lg:mr-72 pb-24 lg:pb-8">
          {/* Top bar */}
          <header className="sticky top-0 z-20 backdrop-blur-xl bg-background/70 border-b border-border/50">
            <div className="flex items-center justify-between gap-3 px-4 lg:px-8 py-3">
              <div className="flex items-center gap-2 lg:hidden">
                <div className="h-9 w-9 rounded-xl bg-primary text-primary-foreground grid place-items-center font-bold">م</div>
                <span className="font-bold text-sm">{AR.app.shortTitle}</span>
              </div>
              <div className="hidden lg:block">
                <h2 className="text-lg font-bold">{currentPageTitle(location.pathname)}</h2>
              </div>
              <div className="flex items-center gap-2">
                {canInstall && (
                  <Button
                    onClick={promptInstall}
                    size="sm"
                    variant="outline"
                    className="rounded-full gap-1.5"
                    data-testid="install-app-button"
                  >
                    <Download className="h-4 w-4" />
                    <span className="hidden sm:inline">{AR.actions.installApp}</span>
                  </Button>
                )}
                <Button
                  onClick={toggleTheme}
                  variant="outline"
                  size="icon"
                  className="rounded-full"
                  data-testid="theme-toggle-button"
                  aria-label={AR.common.theme}
                >
                  {themeDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </Button>
                <div className="relative">
                  <Button variant="outline" size="icon" className="rounded-full" data-testid="notifications-button">
                    <Bell className="h-4 w-4" />
                  </Button>
                  {notifCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] grid place-items-center num">
                      {notifCount}
                    </span>
                  )}
                </div>
              </div>
            </div>
            {needRefresh && (
              <div className="bg-accent/10 border-t border-accent/30 px-4 py-2 flex items-center justify-between text-xs">
                <span>{AR.updated}</span>
                <Button size="sm" variant="ghost" onClick={applyUpdate} className="gap-1.5">
                  <RefreshCw className="h-3.5 w-3.5" /> {AR.actions.apply}
                </Button>
              </div>
            )}
          </header>

          {/* Page content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 12 }}
              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
              className="px-4 lg:px-8 pt-6"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Bottom nav (mobile) */}
        <nav
          className="lg:hidden fixed bottom-0 inset-x-0 z-30 border-t border-border/50 bg-background/85 backdrop-blur-xl"
          data-testid="mobile-bottom-nav"
        >
          <div className="grid grid-cols-5">
            {NAV.slice(0, 5).map((item) => {
              const Icon = item.icon;
              const active = location.pathname === item.to || (item.exact && location.pathname === '/');
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.exact}
                  className={`flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] ${
                    active ? 'text-accent' : 'text-muted-foreground'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="font-medium">{item.label}</span>
                </NavLink>
              );
            })}
          </div>
        </nav>
      </div>

      <Toaster position="top-left" richColors closeButton dir="rtl" />
    </div>
  );
}

function currentPageTitle(pathname: string): string {
  const found = NAV.find((n) => (n.exact ? pathname === n.to : pathname === n.to));
  if (found) return found.label;
  if (pathname.startsWith('/reports/financial')) return AR.nav.financialReport;
  if (pathname.startsWith('/reports/vacancy')) return AR.nav.vacancyTracker;
  return AR.app.title;
}
