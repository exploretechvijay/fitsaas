import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import {
  Users,
  Plus,
  Search,
  Edit2,
  Trash2,
  Filter,
  X,
  Phone,
  Mail,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { membersApi, subscriptionsApi } from '../api/endpoints';
import { useApi } from '../hooks/useApi';
import { formatDate, getStatusColor } from '../utils/formatters';
import Card from '../components/ui/Card';
import DataTable from '../components/ui/DataTable';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import EmptyState from '../components/ui/EmptyState';
import LoadingSpinner from '../components/ui/LoadingSpinner';

const STATUS_OPTIONS = ['active', 'inactive', 'expired', 'paused'];
const GENDER_OPTIONS = ['male', 'female', 'other'];

export default function Members() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [members, setMembers] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [genderFilter, setGenderFilter] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm();

  // Fetch members
  const fetchMembers = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 15 };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (genderFilter) params.gender = genderFilter;
      if (planFilter) params.plan = planFilter;
      const res = await membersApi.list(params);
      const result = res.data.data;
      setMembers(result.items || []);
      setTotalPages(result.pagination?.totalPages || 1);
    } catch (err) {
      toast.error('Failed to load members');
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, genderFilter, planFilter]);

  // Fetch plans for the plan filter + form dropdown
  const fetchPlans = useCallback(async () => {
    try {
      const res = await subscriptionsApi.listPlans();
      const plansResult = res.data.data;
      setPlans(Array.isArray(plansResult) ? plansResult : plansResult.items || []);
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  // Open add modal via query param
  useEffect(() => {
    if (searchParams.get('action') === 'add') {
      openAddModal();
    }
  }, [searchParams]);

  const openAddModal = () => {
    setEditingMember(null);
    reset({
      full_name: '',
      email: '',
      phone: '',
      gender: '',
      date_of_birth: '',
      address: '',
      emergency_contact: '',
      notes: '',
    });
    setModalOpen(true);
  };

  const openEditModal = (member) => {
    setEditingMember(member);
    reset({
      full_name: member.full_name || '',
      email: member.email || '',
      phone: member.phone || '',
      gender: member.gender || '',
      date_of_birth: member.date_of_birth?.split('T')[0] || '',
      address: member.address || '',
      emergency_contact: member.emergency_contact || '',
      notes: member.notes || '',
    });
    setModalOpen(true);
  };

  const onSubmit = async (values) => {
    setSaving(true);
    try {
      if (editingMember) {
        await membersApi.update(editingMember.member_id || editingMember._id, values);
        toast.success('Member updated successfully');
      } else {
        await membersApi.create(values);
        toast.success('Member added successfully');
      }
      setModalOpen(false);
      fetchMembers();
    } catch (err) {
      // useApi / axios interceptor handles error toast
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await membersApi.delete(deleteTarget.member_id || deleteTarget._id);
      toast.success('Member deleted');
      setDeleteTarget(null);
      fetchMembers();
    } catch {
      // error toast handled by interceptor
    } finally {
      setDeleting(false);
    }
  };

  const statusBadgeColor = (status) => {
    const map = {
      active: 'green',
      expired: 'red',
      inactive: 'gray',
      paused: 'yellow',
      trial: 'blue',
    };
    return map[status] || 'gray';
  };

  const columns = useMemo(
    () => [
      {
        header: 'Member',
        key: 'full_name',
        render: (val, row) => (
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-sm font-semibold flex-shrink-0">
              {(row.full_name || '?')[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{row.full_name}</p>
              <p className="text-xs text-gray-400 truncate">{row.email}</p>
            </div>
          </div>
        ),
      },
      {
        header: 'Phone',
        key: 'phone',
        render: (val) => (
          <span className="flex items-center gap-1.5 text-sm">
            <Phone className="h-3.5 w-3.5 text-gray-400" />
            {val || '-'}
          </span>
        ),
      },
      {
        header: 'Plan',
        key: 'current_plan',
        render: (val) => (
          <span className="text-sm text-gray-700">{val || <span className="text-gray-400">-</span>}</span>
        ),
      },
      {
        header: 'Start Date',
        key: 'subscription_start',
        render: (val) => <span className="text-sm text-gray-500">{formatDate(val)}</span>,
      },
      {
        header: 'Expiry',
        key: 'subscription_expiry',
        render: (val) => <span className="text-sm text-gray-500">{formatDate(val)}</span>,
      },
      {
        header: 'Status',
        key: 'subscription_status',
        render: (val) => (
          <Badge color={statusBadgeColor(val)} dot size="sm">
            {val || 'N/A'}
          </Badge>
        ),
      },
      {
        header: 'Actions',
        key: 'member_id',
        key: 'actions',
        render: (val, row) => (
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => openEditModal(row)}
              className="p-1.5 rounded-md text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors cursor-pointer"
              title="Edit"
            >
              <Edit2 className="h-4 w-4" />
            </button>
            <button
              onClick={() => setDeleteTarget(row)}
              className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
              title="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ),
      },
    ],
    []
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Members</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your gym members</p>
        </div>
        <Button icon={Plus} onClick={openAddModal}>
          Add Member
        </Button>
      </div>

      {/* Search + Filters */}
      <Card>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, email or phone..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none transition-colors"
            />
          </div>
          <Button
            variant="secondary"
            icon={showFilters ? X : Filter}
            onClick={() => setShowFilters(!showFilters)}
          >
            Filters
          </Button>
        </div>

        {showFilters && (
          <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-gray-100">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none cursor-pointer"
            >
              <option value="">All Status</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>

            <select
              value={genderFilter}
              onChange={(e) => {
                setGenderFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none cursor-pointer"
            >
              <option value="">All Gender</option>
              {GENDER_OPTIONS.map((g) => (
                <option key={g} value={g}>
                  {g.charAt(0).toUpperCase() + g.slice(1)}
                </option>
              ))}
            </select>

            <select
              value={planFilter}
              onChange={(e) => {
                setPlanFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none cursor-pointer"
            >
              <option value="">All Plans</option>
              {plans.map((p) => (
                <option key={p.plan_id || p._id} value={p.plan_id || p._id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </Card>

      {/* Table */}
      <Card padding={false}>
        <DataTable
          columns={columns}
          data={members}
          loading={loading}
          searchable={false}
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          onRowClick={(row) => navigate(`/members/${row.member_id || row._id}`)}
          emptyTitle="No members found"
          emptyDescription="Add your first member to get started."
          emptyIcon={Users}
        />
      </Card>

      {/* Add/Edit Slide-over */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingMember ? 'Edit Member' : 'Add New Member'}
        description={editingMember ? 'Update member information' : 'Fill in the details to add a new member'}
        footer={
          <Modal.Footer
            onCancel={() => setModalOpen(false)}
            onConfirm={handleSubmit(onSubmit)}
            confirmText={editingMember ? 'Update' : 'Add Member'}
            loading={saving}
          />
        }
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="John Doe"
              className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none"
              {...register('full_name', { required: 'Name is required' })}
            />
            {errors.full_name && (
              <p className="mt-1 text-xs text-red-500">{errors.full_name.message}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              placeholder="john@example.com"
              className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none"
              {...register('email', {
                pattern: {
                  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message: 'Enter a valid email',
                },
              })}
            />
            {errors.email && (
              <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>
            )}
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              placeholder="9876543210"
              className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none"
              {...register('phone', { required: 'Phone is required' })}
            />
            {errors.phone && (
              <p className="mt-1 text-xs text-red-500">{errors.phone.message}</p>
            )}
          </div>

          {/* Gender */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
            <select
              className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-700 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none cursor-pointer"
              {...register('gender')}
            >
              <option value="">Select gender</option>
              {GENDER_OPTIONS.map((g) => (
                <option key={g} value={g}>
                  {g.charAt(0).toUpperCase() + g.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Date of Birth */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date of Birth
            </label>
            <input
              type="date"
              className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-700 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none cursor-pointer"
              {...register('date_of_birth')}
            />
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <textarea
              rows={2}
              placeholder="Enter address"
              className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none resize-none"
              {...register('address')}
            />
          </div>

          {/* Emergency Contact */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Emergency Contact
            </label>
            <input
              type="tel"
              placeholder="Emergency phone number"
              className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none"
              {...register('emergency_contact')}
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              rows={3}
              placeholder="Any additional notes..."
              className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none resize-none"
              {...register('notes')}
            />
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Member"
        description={`Are you sure you want to delete "${deleteTarget?.full_name}"? This action cannot be undone.`}
        confirmText="Delete"
        loading={deleting}
      />
    </div>
  );
}
