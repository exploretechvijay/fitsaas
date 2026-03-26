import { useState, useEffect, useCallback, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import {
  Users2,
  Plus,
  Search,
  Edit2,
  Trash2,
  UserPlus,
  Mail,
  Phone,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { staffApi, membersApi } from '../api/endpoints';
import Card from '../components/ui/Card';
import DataTable from '../components/ui/DataTable';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import EmptyState from '../components/ui/EmptyState';
import LoadingSpinner from '../components/ui/LoadingSpinner';

const ROLE_OPTIONS = ['Trainer', 'Front Desk', 'Manager'];
const SPECIALIZATIONS = [
  'Strength Training',
  'Cardio',
  'Yoga',
  'CrossFit',
  'Nutrition',
  'Physiotherapy',
  'Personal Training',
  'Group Fitness',
];

export default function Staff() {
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Assign members
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignTrainer, setAssignTrainer] = useState(null);
  const [members, setMembers] = useState([]);
  const [trainerMembers, setTrainerMembers] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [assigning, setAssigning] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm();

  const fetchStaff = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 15 };
      if (search) params.search = search;
      const res = await staffApi.list(params);
      const result = res.data.data;
      setStaffList(result.items || []);
      setTotalPages(result.pagination?.totalPages || 1);
    } catch {
      toast.error('Failed to load staff');
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  const openAddModal = () => {
    setEditingStaff(null);
    reset({
      full_name: '',
      email: '',
      phone: '',
      role: 'Trainer',
      specialization: '',
    });
    setModalOpen(true);
  };

  const openEditModal = (staff) => {
    setEditingStaff(staff);
    reset({
      full_name: staff.full_name || '',
      email: staff.email || '',
      phone: staff.phone || '',
      role: staff.role || 'Trainer',
      specialization: staff.specialization || '',
    });
    setModalOpen(true);
  };

  const onSubmit = async (values) => {
    setSaving(true);
    try {
      if (editingStaff) {
        await staffApi.update(editingStaff.staff_id || editingStaff._id, values);
        toast.success('Staff updated');
      } else {
        await staffApi.create(values);
        toast.success('Staff member added');
      }
      setModalOpen(false);
      fetchStaff();
    } catch {
      // handled
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await staffApi.delete(deleteTarget.staff_id || deleteTarget._id);
      toast.success('Staff member deleted');
      setDeleteTarget(null);
      fetchStaff();
    } catch {
      // handled
    } finally {
      setDeleting(false);
    }
  };

  // Assign members
  const openAssignModal = async (trainer) => {
    setAssignTrainer(trainer);
    setSelectedMembers([]);
    setMemberSearch('');
    setAssignModalOpen(true);
    try {
      const [membersRes, trainerMembersRes] = await Promise.all([
        membersApi.list({ limit: 100 }),
        staffApi.getTrainerMembers(trainer.staff_id || trainer._id),
      ]);
      const membersResult = membersRes.data.data;
      setMembers(membersResult.items || []);
      const tmResult = trainerMembersRes.data.data || [];
      setTrainerMembers(tmResult);
      setSelectedMembers(tmResult.map((m) => m.member_id || m._id));
    } catch {
      toast.error('Failed to load data');
    }
  };

  const toggleMember = (memberId) => {
    setSelectedMembers((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId]
    );
  };

  const handleAssign = async () => {
    if (!assignTrainer) return;
    setAssigning(true);
    try {
      await staffApi.assignMembers(assignTrainer.staff_id || assignTrainer._id, selectedMembers);
      toast.success('Members assigned');
      setAssignModalOpen(false);
    } catch {
      // handled
    } finally {
      setAssigning(false);
    }
  };

  const roleColor = (role) => {
    const map = {
      Trainer: 'indigo',
      'Front Desk': 'blue',
      Manager: 'purple',
    };
    return map[role] || 'gray';
  };

  const columns = useMemo(
    () => [
      {
        header: 'Staff Member',
        accessor: 'full_name',
        render: (val, row) => (
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-sm font-semibold flex-shrink-0">
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
        accessor: 'phone',
        render: (val) => (
          <span className="flex items-center gap-1.5 text-sm">
            <Phone className="h-3.5 w-3.5 text-gray-400" />
            {val || '-'}
          </span>
        ),
      },
      {
        header: 'Role',
        accessor: 'role',
        render: (val) => (
          <Badge color={roleColor(val)} size="sm">
            {val || 'N/A'}
          </Badge>
        ),
      },
      {
        header: 'Specialization',
        accessor: 'specialization',
        render: (val) => val || '-',
      },
      {
        header: 'Actions',
        accessor: 'staff_id',
        key: 'actions',
        render: (val, row) => (
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            {row.role === 'Trainer' && (
              <button
                onClick={() => openAssignModal(row)}
                className="p-1.5 rounded-md text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer"
                title="Assign Members"
              >
                <UserPlus className="h-4 w-4" />
              </button>
            )}
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
          <h1 className="text-2xl font-bold text-gray-900">Staff</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage trainers and staff members
          </p>
        </div>
        <Button icon={Plus} onClick={openAddModal}>
          Add Staff
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search staff..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none"
        />
      </div>

      {/* Table */}
      <Card padding={false}>
        <DataTable
          columns={columns}
          data={staffList}
          loading={loading}
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          emptyTitle="No staff members"
          emptyDescription="Add your first staff member."
          emptyIcon={Users2}
        />
      </Card>

      {/* Add/Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingStaff ? 'Edit Staff' : 'Add Staff Member'}
        description={editingStaff ? 'Update staff details' : 'Add a new team member'}
        footer={
          <Modal.Footer
            onCancel={() => setModalOpen(false)}
            onConfirm={handleSubmit(onSubmit)}
            confirmText={editingStaff ? 'Update' : 'Add'}
            loading={saving}
          />
        }
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="John Doe"
              className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none"
              {...register('full_name', { required: 'Name is required' })}
            />
            {errors.full_name && <p className="mt-1 text-xs text-red-500">{errors.full_name.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              placeholder="staff@gym.com"
              className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none"
              {...register('email', {
                required: 'Email is required',
                pattern: {
                  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message: 'Enter a valid email',
                },
              })}
            />
            {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input
              type="tel"
              placeholder="9876543210"
              className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none"
              {...register('phone')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select
              className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none cursor-pointer"
              {...register('role')}
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Specialization
            </label>
            <select
              className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none cursor-pointer"
              {...register('specialization')}
            >
              <option value="">None</option>
              {SPECIALIZATIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </form>
      </Modal>

      {/* Assign Members Modal */}
      <Modal
        open={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        title="Assign Members"
        description={`Manage member assignments for ${assignTrainer?.full_name}`}
        footer={
          <Modal.Footer
            onCancel={() => setAssignModalOpen(false)}
            onConfirm={handleAssign}
            confirmText="Save Assignments"
            loading={assigning}
          />
        }
      >
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search members..."
              value={memberSearch}
              onChange={(e) => setMemberSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 text-sm placeholder-gray-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none"
            />
          </div>
          <p className="text-xs text-gray-500">
            {selectedMembers.length} member{selectedMembers.length !== 1 ? 's' : ''} selected
          </p>
          <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
            {members
              .filter(
                (m) =>
                  !memberSearch ||
                  m.full_name?.toLowerCase().includes(memberSearch.toLowerCase())
              )
              .map((m) => {
                const mId = m.member_id || m._id;
                return (
                <label
                  key={mId}
                  className={`flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer ${
                    selectedMembers.includes(mId) ? 'bg-primary-50' : ''
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedMembers.includes(mId)}
                    onChange={() => toggleMember(mId)}
                    className="h-4 w-4 rounded border-gray-300 text-primary-500 focus:ring-primary-500 cursor-pointer"
                  />
                  <div className="h-7 w-7 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                    {(m.full_name || '?')[0].toUpperCase()}
                  </div>
                  <span className="text-sm text-gray-700 truncate">{m.full_name}</span>
                </label>
                );
              })}
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Staff Member"
        description={`Are you sure you want to delete "${deleteTarget?.full_name}"?`}
        confirmText="Delete"
        loading={deleting}
      />
    </div>
  );
}
