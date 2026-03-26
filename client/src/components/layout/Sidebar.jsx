import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  UserPlus,
  CreditCard,
  Dumbbell,
  UtensilsCrossed,
  UserCog,
  Megaphone,
  BarChart3,
  Settings,
  Building2,
  Package,
  Activity,
  PanelLeftClose,
  PanelLeft,
} from 'lucide-react';
import clsx from 'clsx';
import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { gymApi } from '../../api/endpoints';

/* ------------------------------------------------------------------
   Navigation definitions per role
   ------------------------------------------------------------------ */
const gymAdminNav = [
  { label: 'Dashboard', icon: LayoutDashboard, to: '/dashboard' },
  { label: 'Leads', icon: UserPlus, to: '/leads' },
  { label: 'Members', icon: Users, to: '/members' },
  { label: 'Subscriptions', icon: CreditCard, to: '/subscriptions' },
  { label: 'Workouts', icon: Dumbbell, to: '/workouts' },
  { label: 'Diet Plans', icon: UtensilsCrossed, to: '/diet-plans' },
  { label: 'Staff', icon: UserCog, to: '/staff' },
  { label: 'Announcements', icon: Megaphone, to: '/announcements' },
  { label: 'Reports', icon: BarChart3, to: '/reports' },
  { label: 'Settings', icon: Settings, to: '/settings' },
];

const superAdminNav = [
  { label: 'Dashboard', icon: LayoutDashboard, to: '/super-admin' },
  { label: 'Gyms', icon: Building2, to: '/super-admin/gyms' },
  { label: 'SaaS Plans', icon: Package, to: '/super-admin/plans' },
  { label: 'Platform Stats', icon: Activity, to: '/super-admin/stats' },
];

/* ------------------------------------------------------------------
   Sidebar component
   ------------------------------------------------------------------ */
export default function Sidebar({ collapsed, onToggle }) {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin';
  const navItems = isSuperAdmin ? superAdminNav : gymAdminNav;
  const [gymName, setGymName] = useState('');

  useEffect(() => {
    if (!isSuperAdmin && user?.gym_id) {
      gymApi.getProfile().then(res => {
        setGymName(res.data?.data?.name || '');
      }).catch(() => {});
    }
  }, [isSuperAdmin, user?.gym_id]);

  return (
    <aside
      className={clsx(
        'fixed inset-y-0 left-0 z-30 flex flex-col bg-white border-r border-gray-200',
        'transition-[width] duration-200 ease-in-out',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Logo / Gym name */}
      <div
        className={clsx(
          'flex items-center h-16 border-b border-gray-100 flex-shrink-0',
          collapsed ? 'justify-center px-2' : 'px-5 gap-3'
        )}
      >
        <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary-500 flex-shrink-0">
          <Dumbbell className="h-4 w-4 text-white" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-sm font-bold text-gray-900 truncate">
              {gymName || (isSuperAdmin ? 'FitSaaS' : 'FitCenter')}
            </p>
            <p className="text-[10px] text-gray-400 uppercase tracking-wider">
              {isSuperAdmin ? 'Platform' : 'Management'}
            </p>
          </div>
        )}
      </div>

      {/* Navigation links */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 rounded-lg text-sm font-medium transition-colors duration-150',
                collapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2.5',
                isActive
                  ? 'bg-primary-50 text-primary-600'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )
            }
            title={collapsed ? item.label : undefined}
          >
            <item.icon
              className={clsx(
                'h-[18px] w-[18px] flex-shrink-0',
              )}
            />
            {!collapsed && <span className="truncate">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Bottom section: user info + collapse toggle */}
      <div className="flex-shrink-0 border-t border-gray-100">
        {/* User avatar + role */}
        <div
          className={clsx(
            'flex items-center py-3',
            collapsed ? 'justify-center px-2' : 'px-4 gap-3'
          )}
        >
          <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary-100 text-primary-600 text-xs font-bold flex-shrink-0 uppercase">
            {user?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user?.full_name || 'User'}
              </p>
              <p className="text-[11px] text-gray-400 truncate capitalize">
                {user?.role?.replace('_', ' ') || 'Staff'}
              </p>
            </div>
          )}
        </div>

        {/* Collapse toggle */}
        <button
          onClick={onToggle}
          className={clsx(
            'flex items-center w-full py-3 text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer border-t border-gray-50',
            collapsed ? 'justify-center px-2' : 'px-4 gap-3'
          )}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <PanelLeft className="h-[18px] w-[18px]" />
          ) : (
            <>
              <PanelLeftClose className="h-[18px] w-[18px]" />
              <span className="text-xs">Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
