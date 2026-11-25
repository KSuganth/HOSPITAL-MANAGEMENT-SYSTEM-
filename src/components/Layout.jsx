import { useState, useEffect, useRef } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Stethoscope,
  Calendar,
  FileText,
  Receipt,
  CreditCard,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Search,
  Bell,
  UserCircle,
  HeartPulse,
  CalendarDays,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { formatDate, getTodayISO } from '../utils/formatters';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'receptionist', 'doctor'] },
  { to: '/patients', label: 'Patients', icon: Users, roles: ['admin', 'receptionist', 'doctor'] },
  { to: '/doctors', label: 'Doctors', icon: Stethoscope, roles: ['admin', 'receptionist', 'doctor'] },
  { to: '/appointments', label: 'Appointments', icon: Calendar, roles: ['admin', 'receptionist', 'doctor'] },
  { to: '/medical-records', label: 'Medical Records', icon: FileText, roles: ['admin', 'doctor'] },
  { to: '/billing', label: 'Billing', icon: Receipt, roles: ['admin', 'receptionist'] },
  { to: '/payments', label: 'Payments', icon: CreditCard, roles: ['admin', 'receptionist'] },
  { to: '/reports', label: 'Reports', icon: BarChart3, roles: ['admin', 'receptionist'] },
  { to: '/settings', label: 'Settings', icon: Settings, roles: ['admin', 'receptionist', 'doctor'] },
];

const PAGE_TITLES = {
  '/': 'Dashboard',
  '/patients': 'Patient Management',
  '/doctors': 'Doctor Management',
  '/appointments': 'Appointment Management',
  '/medical-records': 'Medical Records',
  '/billing': 'Billing & Invoices',
  '/payments': 'Payment Management',
  '/reports': 'Reports & Analytics',
  '/settings': 'Settings',
};

export default function Layout() {
  const { profile, hospital, role, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);

  const [globalQuery, setGlobalQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchOpen, setSearchOpen] = useState(false);

  const searchRef = useRef(null);
  const notifRef = useRef(null);
  const profileRef = useRef(null);

  const pageTitle =
    PAGE_TITLES[location.pathname] ||
    (location.pathname.startsWith('/patients/') ? 'Patient Profile' : 'MediCare HMS');

  const todayDisplay = new Intl.DateTimeFormat('en-IN', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  }).format(new Date());

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) setSearchOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Load lightweight notifications from Supabase
  useEffect(() => {
    if (!supabase) return;
    const loadNotifications = async () => {
      const today = getTodayISO();
      const items = [];

      const { data: appts } = await supabase
        .from('appointments')
        .select('id, appointment_code, appointment_time, status, patients(full_name)')
        .eq('appointment_date', today)
        .in('status', ['Scheduled', 'Confirmed'])
        .order('appointment_time', { ascending: true })
        .limit(5);

      if (appts) {
        appts.forEach((a) => {
          items.push({
            id: `appt-${a.id}`,
            title: `Today's Appointment: ${a.patients?.full_name || 'Patient'}`,
            meta: `${a.appointment_code} at ${a.appointment_time?.slice(0, 5)} (${a.status})`,
            link: '/appointments',
          });
        });
      }

      if (role === 'admin' || role === 'receptionist') {
        const { data: unpaid } = await supabase
          .from('bills')
          .select('id, bill_code, balance, patients(full_name)')
          .gt('balance', 0)
          .order('created_at', { ascending: false })
          .limit(3);

        if (unpaid) {
          unpaid.forEach((b) => {
            items.push({
              id: `bill-${b.id}`,
              title: `Pending Balance: ${b.patients?.full_name || 'Patient'}`,
              meta: `${b.bill_code} • ₹${Number(b.balance).toFixed(2)} due`,
              link: '/payments',
            });
          });
        }
      }

      setNotifications(items);
    };

    loadNotifications();
  }, [location.pathname, role]);

  // Global search across patients, doctors, and appointments
  useEffect(() => {
    if (!supabase || globalQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      const q = globalQuery.trim();
      const [pRes, dRes] = await Promise.all([
        supabase
          .from('patients')
          .select('id, patient_code, full_name, phone')
          .or(`full_name.ilike.%${q}%,patient_code.ilike.%${q}%,phone.ilike.%${q}%`)
          .limit(5),
        supabase
          .from('doctors')
          .select('id, doctor_code, full_name, specialization')
          .or(`full_name.ilike.%${q}%,doctor_code.ilike.%${q}%,specialization.ilike.%${q}%`)
          .limit(5),
      ]);

      const combined = [
        ...(pRes.data || []).map((p) => ({
          type: 'Patient',
          id: p.id,
          label: p.full_name,
          sub: `${p.patient_code} • ${p.phone}`,
          to: `/patients/${p.id}`,
        })),
        ...(dRes.data || []).map((d) => ({
          type: 'Doctor',
          id: d.id,
          label: d.full_name,
          sub: `${d.doctor_code} • ${d.specialization}`,
          to: '/doctors',
        })),
      ];
      setSearchResults(combined);
      setSearchOpen(true);
    }, 250);

    return () => clearTimeout(timer);
  }, [globalQuery]);

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const allowedNav = NAV_ITEMS.filter((item) => item.roles.includes(role));

  return (
    <div className="min-h-screen flex bg-[#F8FAFC] text-[#1E293B]">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 lg:hidden no-print"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-screen bg-white border-r border-slate-200 flex flex-col transition-all duration-200 no-print ${
          collapsed ? 'lg:w-[75px]' : 'lg:w-[250px]'
        } ${mobileOpen ? 'translate-x-0 w-[250px]' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Logo */}
        <div className="h-[70px] flex items-center justify-between px-4 border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-2.5 overflow-hidden">
            {hospital?.logo_url ? (
              <img
                src={hospital.logo_url}
                alt="Logo"
                className="w-9 h-9 rounded-lg object-cover shrink-0 border border-slate-200"
              />
            ) : (
              <div className="w-9 h-9 rounded-lg bg-[#2563EB] flex items-center justify-center text-white shrink-0 shadow-sm">
                <HeartPulse className="w-5 h-5" />
              </div>
            )}
            {(!collapsed || mobileOpen) && (
              <div className="truncate">
                <span className="font-bold text-base text-slate-900 tracking-tight block leading-tight">
                  MediCare
                </span>
                <span className="text-[11px] font-medium text-[#0D9488] block truncate">
                  Hospital System
                </span>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className="hidden lg:flex p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {allowedNav.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-[#2563EB] text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  } ${collapsed ? 'lg:justify-center lg:px-2' : ''}`
                }
                title={collapsed ? item.label : undefined}
              >
                <Icon className="w-5 h-5 shrink-0" />
                {(!collapsed || mobileOpen) && <span className="truncate">{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-slate-200 shrink-0">
          <button
            type="button"
            onClick={handleLogout}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors ${
              collapsed ? 'lg:justify-center lg:px-2' : ''
            }`}
            title={collapsed ? 'Logout' : undefined}
          >
            <LogOut className="w-5 h-5 shrink-0" />
            {(!collapsed || mobileOpen) && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Wrapper */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-200 ${
          collapsed ? 'lg:pl-[75px]' : 'lg:pl-[250px]'
        }`}
      >
        {/* Topbar */}
        <header className="sticky top-0 z-30 h-[70px] bg-white border-b border-slate-200 px-4 lg:px-6 flex items-center justify-between gap-4 no-print">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-lg lg:text-xl font-semibold text-slate-900 truncate">{pageTitle}</h1>
          </div>

          <div className="flex items-center gap-3 lg:gap-4">
            {/* Global Search */}
            <div ref={searchRef} className="relative hidden md:block w-64 lg:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={globalQuery}
                onChange={(e) => setGlobalQuery(e.target.value)}
                onFocus={() => searchResults.length > 0 && setSearchOpen(true)}
                placeholder="Search patients, doctors..."
                className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
              />
              {searchOpen && (
                <div className="absolute left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden z-50">
                  {searchResults.length === 0 ? (
                    <div className="p-3 text-sm text-slate-500 text-center">No matching records</div>
                  ) : (
                    searchResults.map((res) => (
                      <button
                        key={`${res.type}-${res.id}`}
                        type="button"
                        onClick={() => {
                          setSearchOpen(false);
                          setGlobalQuery('');
                          navigate(res.to);
                        }}
                        className="w-full text-left px-4 py-2.5 hover:bg-slate-50 flex items-center justify-between border-b last:border-b-0 border-slate-100"
                      >
                        <div>
                          <p className="text-sm font-medium text-slate-800">{res.label}</p>
                          <p className="text-xs text-slate-500">{res.sub}</p>
                        </div>
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                          {res.type}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Current Date */}
            <div className="hidden xl:flex items-center gap-1.5 text-xs font-medium text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg">
              <CalendarDays className="w-3.5 h-3.5 text-slate-500" />
              <span>{todayDisplay}</span>
            </div>

            {/* Notifications */}
            <div ref={notifRef} className="relative">
              <button
                type="button"
                onClick={() => setNotifOpen((v) => !v)}
                className="relative p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
                aria-label="Notifications"
              >
                <Bell className="w-5 h-5" />
                {notifications.length > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-600" />
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-800">Notifications</span>
                    <span className="text-xs text-slate-500">{notifications.length} active</span>
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                    {notifications.length === 0 ? (
                      <p className="p-4 text-sm text-slate-500 text-center">No new notifications</p>
                    ) : (
                      notifications.map((n) => (
                        <button
                          key={n.id}
                          type="button"
                          onClick={() => {
                            setNotifOpen(false);
                            navigate(n.link);
                          }}
                          className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors"
                        >
                          <p className="text-sm font-medium text-slate-800">{n.title}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{n.meta}</p>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Profile Dropdown */}
            <div ref={profileRef} className="relative">
              <button
                type="button"
                onClick={() => setProfileMenuOpen((v) => !v)}
                className="flex items-center gap-2.5 p-1.5 pr-2 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-blue-100 text-[#2563EB] flex items-center justify-center font-semibold text-sm">
                  {(profile?.full_name || 'U').charAt(0).toUpperCase()}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-medium text-slate-800 leading-tight max-w-[120px] truncate">
                    {profile?.full_name || 'Staff User'}
                  </p>
                  <p className="text-[11px] font-medium text-slate-500 capitalize">{role}</p>
                </div>
              </button>

              {profileMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-100">
                    <p className="text-sm font-semibold text-slate-800 truncate">{profile?.full_name}</p>
                    <p className="text-xs text-slate-500 truncate">{profile?.email}</p>
                    <span className="inline-block mt-1 text-[11px] font-medium px-2 py-0.5 rounded bg-blue-50 text-blue-700 capitalize">
                      Role: {role}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setProfileMenuOpen(false);
                      navigate('/settings');
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    <UserCircle className="w-4 h-4" />
                    Profile & Settings
                  </button>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 border-t border-slate-100"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main Page Content */}
        <main className="flex-1 p-4 lg:p-6 max-w-full overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
