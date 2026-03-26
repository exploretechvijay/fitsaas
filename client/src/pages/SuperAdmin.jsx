import { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import {
  ShieldCheck,
  Plus,
  Search,
  Edit2,
  Building2,
  Users,
  CreditCard,
  Activity,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { superAdminApi } from '../api/endpoints';
import { formatDate, formatNumber, formatCurrency } from '../utils/formatters';
import Card from '../components/ui/Card';
import DataTable from '../components/ui/DataTable';
import Modal from '../components/ui/Modal';
import StatsCard from '../components/ui/StatsCard';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import ConfirmDialog from '../components/ui/ConfirmDialog';

export default function SuperAdmin() {
  const location = useLocation();
  // Derive current section from URL path
  const currentSection = location.pathname.replace('/super-admin', '').replace('/', '') || 'dashboard';

  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const [gyms, setGyms] = useState([]);
  const [gymsLoading, setGymsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingGym, setEditingGym] = useState(null);
  const [saving, setSaving] = useState(false);

  const [toggleTarget, setToggleTarget] = useState(null);
  const [toggling, setToggling] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm();

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await superAdminApi.getPlatformStats();
      setStats(res.data.data);
    } catch {
      // silent
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const fetchGyms = useCallback(async () => {
    setGymsLoading(true);
    try {
      const params = { page, limit: 15 };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      const res = await superAdminApi.listGyms(params);
      const result = res.data.data;
      // API returns { items: [...], pagination: { totalPages, ... } }
      setGyms(result.items || []);
      setTotalPages(result.pagination?.totalPages || 1);
    } catch {
      toast.error('Failed to load gyms');
    } finally {
      setGymsLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchGyms();
  }, [fetchGyms]);

  const openCreateModal = () => {
    setEditingGym(null);
    reset({ name: '', owner_name: '', email: '', phone: '', address: '' });
    setModalOpen(true);
  };

  const openEditModal = (gym) => {
    setEditingGym(gym);
    reset({
      name: gym.name || '',
      owner_name: gym.owner_name || '',
      email: gym.email || '',
      phone: gym.phone || '',
      address: gym.address || '',
    });
    setModalOpen(true);
  };

  const onSubmit = async (values) => {
    setSaving(true);
    try {
      if (editingGym) {
        await superAdminApi.updateGym(editingGym.gym_id, values);
        toast.success('Gym updated');
      } else {
        const res = await superAdminApi.createGym(values);
        const tempPassword = res.data?.data?.tempPassword;
        toast.success(
          `Gym created!${tempPassword ? ` Admin password: ${tempPassword}` : ''}`,
          { duration: 10000 }
        );
      }
      setModalOpen(false);
      fetchGyms();
      fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Operation failed');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!toggleTarget) return;
    setToggling(true);
    try {
      const newStatus = toggleTarget.status === 'active' ? 'inactive' : 'active';
      await superAdminApi.toggleStatus(toggleTarget.gym_id, newStatus);
      toast.success(`Gym ${newStatus === 'active' ? 'activated' : 'deactivated'}`);
      setToggleTarget(null);
      fetchGyms();
      fetchStats();
    } catch {
      toast.error('Failed to update status');
    } finally {
      setToggling(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        header: 'Gym',
        key: 'name',
        render: (val, row) => (
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary-100 text-primary-700 flex items-center justify-center text-sm font-bold flex-shrink-0">
              {(row.name || '?')[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{row.name}</p>
              <p className="text-xs text-gray-400 truncate">{row.email}</p>
            </div>
          </div>
        ),
      },
      {
        header: 'Owner',
        key: 'owner_name',
        render: (val, row) => (
          <div className="min-w-0">
            <p className="text-sm text-gray-700 truncate">{row.owner_name || '-'}</p>
            <p className="text-xs text-gray-400 truncate">{row.phone || ''}</p>
          </div>
        ),
      },
      {
        header: 'Plan',
        key: 'saas_plans',
        sortable: false,
        render: (val) => (
          <span className="text-sm text-gray-600">{val?.name || 'No plan'}</span>
        ),
      },
      {
        header: 'Created',
        key: 'created_at',
        render: (val) => <span className="text-sm text-gray-500">{formatDate(val)}</span>,
      },
      {
        header: 'Status',
        key: 'status',
        render: (val) => {
          const colorMap = { active: 'green', inactive: 'gray', trial: 'blue' };
          return (
            <Badge color={colorMap[val] || 'gray'} dot size="sm">
              {val || 'N/A'}
            </Badge>
          );
        },
      },
      {
        header: '',
        key: 'actions_col',
        sortable: false,
        render: (_val, row) => (
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => openEditModal(row)}
              className="p-1.5 rounded-md text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors cursor-pointer"
              title="Edit"
            >
              <Edit2 className="h-4 w-4" />
            </button>
            <button
              onClick={() => setToggleTarget(row)}
              className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                row.status === 'active'
                  ? 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                  : 'text-gray-400 hover:text-emerald-600 hover:bg-emerald-50'
              }`}
              title={row.status === 'active' ? 'Deactivate' : 'Activate'}
            >
              {row.status === 'active' ? (
                <ToggleRight className="h-4 w-4" />
              ) : (
                <ToggleLeft className="h-4 w-4" />
              )}
            </button>
          </div>
        ),
      },
    ],
    []
  );

  const renderStatsCards = () => statsLoading ? (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-28 bg-gray-100 rounded-xl animate-pulse" />
      ))}
    </div>
  ) : stats ? (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatsCard label="Total Gyms" value={formatNumber(stats.total_gyms)} icon={Building2} />
      <StatsCard label="Active Gyms" value={formatNumber(stats.active_gyms)} icon={Activity} iconColor="text-emerald-500" iconBg="bg-emerald-50" />
      <StatsCard label="Total Members" value={formatNumber(stats.total_members)} icon={Users} iconColor="text-blue-500" iconBg="bg-blue-50" />
      <StatsCard label="Platform Revenue" value={formatCurrency(stats.total_revenue)} icon={CreditCard} iconColor="text-amber-500" iconBg="bg-amber-50" />
    </div>
  ) : null;

  // Section: SaaS Plans
  if (currentSection === 'plans') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">SaaS Plans</h1>
          <p className="text-sm text-gray-500 mt-1">Manage platform subscription tiers</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {['Starter', 'Growth', 'Pro'].map((plan, i) => (
            <Card key={plan} className="relative overflow-hidden">
              {i === 2 && <div className="absolute top-0 right-0 bg-primary-500 text-white text-xs px-3 py-1 rounded-bl-lg font-medium">Popular</div>}
              <Card.Header>
                <Card.Title>{plan}</Card.Title>
              </Card.Header>
              <div className="space-y-3">
                <p className="text-3xl font-bold text-gray-900">
                  {['$29.99', '$79.99', '$199.99'][i]}<span className="text-sm font-normal text-gray-400">/mo</span>
                </p>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>Up to {[50, 200, 1000][i]} members</li>
                  <li>Up to {[3, 10, 50][i]} staff accounts</li>
                  <li>{[50, 200, 1000][i]} AI credits/month</li>
                  {i >= 1 && <li>Workout & Diet plans</li>}
                  {i >= 2 && <li>Analytics & Reports</li>}
                  {i >= 2 && <li>Priority support</li>}
                </ul>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Section: Platform Stats (detailed)
  if (currentSection === 'stats') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Platform Statistics</h1>
          <p className="text-sm text-gray-500 mt-1">Overview of the entire platform</p>
        </div>
        {renderStatsCards()}
        <Card>
          <Card.Header><Card.Title>Gyms Overview</Card.Title></Card.Header>
          <DataTable
            columns={columns}
            data={gyms}
            loading={gymsLoading}
            searchable={false}
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
            emptyTitle="No gyms yet"
            emptyDescription="No gyms have been onboarded."
            emptyIcon={Building2}
          />
        </Card>
      </div>
    );
  }

  // Section: Gyms management
  if (currentSection === 'gyms') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gym Management</h1>
            <p className="text-sm text-gray-500 mt-1">Onboard and manage gyms</p>
          </div>
          <Button icon={Plus} onClick={openCreateModal}>Create Gym</Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input type="text" placeholder="Search gyms..." value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none" />
          </div>
          <select value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-700 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none cursor-pointer">
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="trial">Trial</option>
          </select>
        </div>

        <DataTable columns={columns} data={gyms} loading={gymsLoading} searchable={false}
          page={page} totalPages={totalPages} onPageChange={setPage}
          emptyTitle="No gyms found" emptyDescription="Create the first gym to get started." emptyIcon={Building2} />

        <Modal open={modalOpen} onClose={() => setModalOpen(false)}
          title={editingGym ? 'Edit Gym' : 'Create New Gym'}
          description={editingGym ? 'Update gym information' : 'Set up a new gym on the platform'}
          footer={<Modal.Footer onCancel={() => setModalOpen(false)} onConfirm={handleSubmit(onSubmit)} confirmText={editingGym ? 'Update' : 'Create Gym'} loading={saving} />}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Gym Name <span className="text-red-500">*</span></label>
              <input type="text" placeholder="e.g. FitZone Premium" className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none" {...register('name', { required: 'Gym name is required' })} />
              {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
            </div>
            <div className="border-t border-gray-100 pt-4">
              <p className="text-sm font-medium text-gray-700 mb-3">Owner Details</p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Owner Name <span className="text-red-500">*</span></label>
                  <input type="text" placeholder="John Doe" className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none" {...register('owner_name', { required: 'Owner name is required' })} />
                  {errors.owner_name && <p className="mt-1 text-xs text-red-500">{errors.owner_name.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email <span className="text-red-500">*</span></label>
                  <input type="email" placeholder="owner@gym.com" className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none" {...register('email', { required: 'Email is required', pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email' } })} />
                  {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone <span className="text-red-500">*</span></label>
                  <input type="tel" placeholder="9876543210" className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none" {...register('phone', { required: 'Phone is required' })} />
                  {errors.phone && <p className="mt-1 text-xs text-red-500">{errors.phone.message}</p>}
                </div>
              </div>
            </div>
            <div className="border-t border-gray-100 pt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <textarea rows={2} placeholder="Gym address" className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none resize-none" {...register('address')} />
            </div>
          </form>
        </Modal>

        <ConfirmDialog open={!!toggleTarget} onClose={() => setToggleTarget(null)} onConfirm={handleToggleStatus}
          title={toggleTarget?.status === 'active' ? 'Deactivate Gym' : 'Activate Gym'}
          description={toggleTarget?.status === 'active' ? `Deactivate "${toggleTarget?.name}"? The gym will lose access.` : `Activate "${toggleTarget?.name}"?`}
          confirmText={toggleTarget?.status === 'active' ? 'Deactivate' : 'Activate'}
          variant={toggleTarget?.status === 'active' ? 'danger' : 'primary'} loading={toggling} />
      </div>
    );
  }

  // Default: Dashboard overview
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary-500 flex items-center justify-center">
            <ShieldCheck className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Platform Overview</h1>
            <p className="text-sm text-gray-500">Welcome to FitSaaS Admin</p>
          </div>
        </div>
        <Button icon={Plus} onClick={openCreateModal}>
          Create Gym
        </Button>
      </div>

      {renderStatsCards()}

      {/* Recent Gyms */}
      <Card>
        <Card.Header><Card.Title>Recent Gyms</Card.Title></Card.Header>
        <DataTable columns={columns} data={gyms} loading={gymsLoading} searchable={false}
          page={page} totalPages={totalPages} onPageChange={setPage}
          emptyTitle="No gyms yet" emptyDescription="Create the first gym to get started." emptyIcon={Building2} />
      </Card>

      {/* Shared modals */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)}
        title={editingGym ? 'Edit Gym' : 'Create New Gym'}
        description={editingGym ? 'Update gym information' : 'Set up a new gym on the platform'}
        footer={<Modal.Footer onCancel={() => setModalOpen(false)} onConfirm={handleSubmit(onSubmit)} confirmText={editingGym ? 'Update' : 'Create Gym'} loading={saving} />}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Gym Name <span className="text-red-500">*</span></label>
            <input type="text" placeholder="e.g. FitZone Premium" className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none" {...register('name', { required: 'Gym name is required' })} />
            {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
          </div>
          <div className="border-t border-gray-100 pt-4">
            <p className="text-sm font-medium text-gray-700 mb-3">Owner Details</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Owner Name <span className="text-red-500">*</span></label>
                <input type="text" placeholder="John Doe" className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none" {...register('owner_name', { required: 'Owner name is required' })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email <span className="text-red-500">*</span></label>
                <input type="email" placeholder="owner@gym.com" className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none" {...register('email', { required: 'Email is required' })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone <span className="text-red-500">*</span></label>
                <input type="tel" placeholder="9876543210" className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none" {...register('phone', { required: 'Phone is required' })} />
              </div>
            </div>
          </div>
          <div className="border-t border-gray-100 pt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <textarea rows={2} placeholder="Gym address" className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none resize-none" {...register('address')} />
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={!!toggleTarget} onClose={() => setToggleTarget(null)} onConfirm={handleToggleStatus}
        title={toggleTarget?.status === 'active' ? 'Deactivate Gym' : 'Activate Gym'}
        description={toggleTarget?.status === 'active' ? `Deactivate "${toggleTarget?.name}"?` : `Activate "${toggleTarget?.name}"?`}
        confirmText={toggleTarget?.status === 'active' ? 'Deactivate' : 'Activate'}
        variant={toggleTarget?.status === 'active' ? 'danger' : 'primary'} loading={toggling} />
    </div>
  );
}
