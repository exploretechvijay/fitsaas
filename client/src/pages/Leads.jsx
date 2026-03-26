import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useForm } from 'react-hook-form';
import {
  UserPlus, Phone, PhoneCall, PhoneOff, PhoneMissed, Mail, MessageSquare,
  Upload, Download, Search, Filter, Edit2, Trash2, Eye, Plus, X,
  Calendar, Clock, ArrowRight, UserCheck, AlertCircle, TrendingUp,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { leadsApi } from '../api/endpoints';
import { formatDate, formatDateTime, timeAgo } from '../utils/formatters';
import Card from '../components/ui/Card';
import DataTable from '../components/ui/DataTable';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import StatsCard from '../components/ui/StatsCard';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import EmptyState from '../components/ui/EmptyState';
import LoadingSpinner from '../components/ui/LoadingSpinner';

const STATUS_OPTIONS = [
  { value: 'new', label: 'New', color: 'blue' },
  { value: 'contacted', label: 'Contacted', color: 'purple' },
  { value: 'interested', label: 'Interested', color: 'green' },
  { value: 'follow_up', label: 'Follow Up', color: 'yellow' },
  { value: 'trial', label: 'Trial', color: 'indigo' },
  { value: 'converted', label: 'Converted', color: 'green' },
  { value: 'not_interested', label: 'Not Interested', color: 'gray' },
  { value: 'lost', label: 'Lost', color: 'red' },
];

const SOURCE_OPTIONS = [
  { value: 'walk_in', label: 'Walk-in' },
  { value: 'phone', label: 'Phone Inquiry' },
  { value: 'website', label: 'Website' },
  { value: 'social_media', label: 'Social Media' },
  { value: 'referral', label: 'Referral' },
  { value: 'advertisement', label: 'Advertisement' },
  { value: 'other', label: 'Other' },
];

const DISPOSITION_OPTIONS = [
  'Connected - Interested',
  'Connected - Not Interested',
  'Connected - Call Back Later',
  'Connected - Wrong Number',
  'No Answer',
  'Busy',
  'Switched Off',
  'Not Reachable',
  'Left Voicemail',
  'WhatsApp Sent',
  'SMS Sent',
  'Email Sent',
  'Visited Gym',
  'Trial Scheduled',
  'Joined',
];

const statusColor = (s) => STATUS_OPTIONS.find(o => o.value === s)?.color || 'gray';

export default function Leads() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [stats, setStats] = useState(null);

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Activity / Disposition modal
  const [activityLead, setActivityLead] = useState(null);
  const [activityType, setActivityType] = useState('call');
  const [disposition, setDisposition] = useState('');
  const [activityNotes, setActivityNotes] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [savingActivity, setSavingActivity] = useState(false);

  // View lead detail
  const [viewLead, setViewLead] = useState(null);
  const [activities, setActivities] = useState([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);

  // Bulk upload
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkData, setBulkData] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  // Convert
  const [convertTarget, setConvertTarget] = useState(null);
  const [converting, setConverting] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 15 };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (sourceFilter) params.source = sourceFilter;
      const res = await leadsApi.list(params);
      const result = res.data.data;
      setLeads(result.items || []);
      setTotalPages(result.pagination?.totalPages || 1);
    } catch {
      toast.error('Failed to load leads');
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, sourceFilter]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await leadsApi.getStats();
      setStats(res.data.data);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);
  useEffect(() => { fetchStats(); }, [fetchStats]);

  // CRUD
  const openAdd = () => {
    setEditingLead(null);
    reset({ full_name: '', phone: '', email: '', gender: '', age: '', source: 'walk_in', interest: '', notes: '', follow_up_date: '' });
    setModalOpen(true);
  };

  const openEdit = (lead) => {
    setEditingLead(lead);
    reset({
      full_name: lead.full_name || '',
      phone: lead.phone || '',
      email: lead.email || '',
      gender: lead.gender || '',
      age: lead.age || '',
      source: lead.source || 'walk_in',
      status: lead.status || 'new',
      interest: lead.interest || '',
      notes: lead.notes || '',
      follow_up_date: lead.follow_up_date?.split('T')[0] || '',
    });
    setModalOpen(true);
  };

  const onSave = async (values) => {
    setSaving(true);
    // Clean empty strings to avoid validation errors
    const payload = {};
    Object.entries(values).forEach(([k, v]) => {
      if (v !== '' && v !== null && v !== undefined) payload[k] = k === 'age' ? Number(v) : v;
    });
    try {
      if (editingLead) {
        await leadsApi.update(editingLead.lead_id, payload);
        toast.success('Lead updated');
      } else {
        await leadsApi.create(payload);
        toast.success('Lead added');
      }
      setModalOpen(false);
      fetchLeads();
      fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await leadsApi.delete(deleteTarget.lead_id);
      toast.success('Lead deleted');
      setDeleteTarget(null);
      fetchLeads();
      fetchStats();
    } catch { toast.error('Failed to delete'); }
    finally { setDeleting(false); }
  };

  // Activity / Disposition
  const openDisposition = (lead) => {
    setActivityLead(lead);
    setActivityType('call');
    setDisposition('');
    setActivityNotes('');
    setNewStatus('');
    setFollowUpDate('');
  };

  const saveActivity = async () => {
    if (!activityLead) return;
    setSavingActivity(true);
    try {
      await leadsApi.addActivity(activityLead.lead_id, {
        type: activityType,
        disposition,
        notes: activityNotes,
        new_status: newStatus || undefined,
        follow_up_date: followUpDate || undefined,
      });
      toast.success('Activity logged');
      setActivityLead(null);
      fetchLeads();
      fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to log activity');
    } finally {
      setSavingActivity(false);
    }
  };

  // View detail + activities
  const openView = async (lead) => {
    setViewLead(lead);
    setActivitiesLoading(true);
    try {
      const res = await leadsApi.getActivities(lead.lead_id);
      setActivities(res.data.data || []);
    } catch { setActivities([]); }
    finally { setActivitiesLoading(false); }
  };

  // Bulk upload
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target.result;
      const lines = text.split('\n').filter(l => l.trim());
      if (lines.length < 2) { toast.error('CSV must have header + at least 1 row'); return; }
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const nameIdx = headers.findIndex(h => h.includes('name'));
      const phoneIdx = headers.findIndex(h => h.includes('phone') || h.includes('mobile'));
      const emailIdx = headers.findIndex(h => h.includes('email'));
      const genderIdx = headers.findIndex(h => h.includes('gender'));
      const sourceIdx = headers.findIndex(h => h.includes('source'));

      if (nameIdx === -1 || phoneIdx === -1) {
        toast.error('CSV must have "name" and "phone" columns');
        return;
      }

      const clean = (s) => s.replace(/^["']|["']$/g, '').trim();
      const parsed = lines.slice(1).map(line => {
        const cols = line.split(',').map(c => clean(c));
        return {
          full_name: cols[nameIdx] || '',
          phone: cols[phoneIdx] || '',
          email: emailIdx >= 0 ? clean(cols[emailIdx] || '') : '',
          gender: genderIdx >= 0 ? clean(cols[genderIdx] || '') : '',
          source: sourceIdx >= 0 ? clean(cols[sourceIdx] || '') : 'bulk_upload',
        };
      }).filter(l => l.full_name && l.phone);

      setBulkData(JSON.stringify(parsed));
      toast.success(`${parsed.length} leads parsed from CSV`);
    };
    reader.readAsText(file);
  };

  const handleBulkUpload = async () => {
    setUploading(true);
    try {
      const parsed = JSON.parse(bulkData);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        toast.error('No valid leads to upload');
        return;
      }
      const res = await leadsApi.bulkCreate(parsed);
      toast.success(`${res.data.data.inserted} leads uploaded!`);
      setBulkModalOpen(false);
      setBulkData('');
      fetchLeads();
      fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  // Export
  const exportCSV = () => {
    const headers = ['Name', 'Phone', 'Email', 'Source', 'Status', 'Interest', 'Follow Up', 'Created'];
    const rows = leads.map(l => [
      l.full_name, l.phone, l.email || '', l.source, l.status,
      l.interest || '', l.follow_up_date || '', l.created_at?.substring(0, 10) || '',
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `leads_export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success('Leads exported');
  };

  // Convert to member
  const handleConvert = async () => {
    if (!convertTarget) return;
    setConverting(true);
    try {
      await leadsApi.convert(convertTarget.lead_id);
      toast.success(`${convertTarget.full_name} converted to member!`);
      setConvertTarget(null);
      fetchLeads();
      fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Conversion failed');
    } finally {
      setConverting(false);
    }
  };

  const columns = useMemo(() => [
    {
      header: 'Lead',
      key: 'full_name',
      render: (val, row) => (
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-sm font-semibold flex-shrink-0">
            {(val || '?')[0].toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{val}</p>
            <p className="text-xs text-gray-400 truncate">{row.email || row.phone}</p>
          </div>
        </div>
      ),
    },
    {
      header: 'Phone',
      key: 'phone',
      render: (val) => <span className="text-sm text-gray-600">{val}</span>,
    },
    {
      header: 'Source',
      key: 'source',
      render: (val) => <Badge color="blue" size="sm">{(val || 'walk_in').replace(/_/g, ' ')}</Badge>,
    },
    {
      header: 'Status',
      key: 'status',
      render: (val) => <Badge color={statusColor(val)} dot size="sm">{(val || 'new').replace(/_/g, ' ')}</Badge>,
    },
    {
      header: 'Follow Up',
      key: 'follow_up_date',
      render: (val) => {
        if (!val) return <span className="text-gray-300">-</span>;
        const isOverdue = new Date(val) < new Date();
        return <span className={`text-xs font-medium ${isOverdue ? 'text-red-500' : 'text-gray-600'}`}>{formatDate(val)}</span>;
      },
    },
    {
      header: 'Created',
      key: 'created_at',
      render: (val) => <span className="text-xs text-gray-400">{timeAgo(val)}</span>,
    },
    {
      header: '',
      key: 'actions_col',
      sortable: false,
      render: (_val, row) => (
        <div className="flex items-center gap-0.5" onClick={e => e.stopPropagation()}>
          <button onClick={() => openDisposition(row)} title="Log Call" className="p-1.5 rounded-md text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors cursor-pointer">
            <PhoneCall className="h-4 w-4" />
          </button>
          <button onClick={() => openView(row)} title="View" className="p-1.5 rounded-md text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors cursor-pointer">
            <Eye className="h-4 w-4" />
          </button>
          <button onClick={() => openEdit(row)} title="Edit" className="p-1.5 rounded-md text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors cursor-pointer">
            <Edit2 className="h-4 w-4" />
          </button>
          {row.status !== 'converted' && (
            <button onClick={() => setConvertTarget(row)} title="Convert to Member" className="p-1.5 rounded-md text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer">
              <UserCheck className="h-4 w-4" />
            </button>
          )}
          <button onClick={() => setDeleteTarget(row)} title="Delete" className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ], []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Lead Management</h1>
          <p className="text-sm text-gray-500 mt-1">Track and convert prospective members</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" icon={Upload} onClick={() => setBulkModalOpen(true)}>Bulk Upload</Button>
          <Button variant="secondary" icon={Download} onClick={exportCSV}>Export</Button>
          <Button icon={Plus} onClick={openAdd}>Add Lead</Button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {STATUS_OPTIONS.map(s => (
            <div key={s.value} onClick={() => { setStatusFilter(statusFilter === s.value ? '' : s.value); setPage(1); }}
              className={`p-3 rounded-xl border text-center cursor-pointer transition-colors ${statusFilter === s.value ? 'border-primary-500 bg-primary-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
              <p className="text-lg font-bold text-gray-900">{stats[s.value] || 0}</p>
              <p className="text-[10px] text-gray-500 uppercase">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input type="text" placeholder="Search by name, phone or email..." value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 text-sm placeholder-gray-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none" />
        </div>
        <select value={sourceFilter} onChange={e => { setSourceFilter(e.target.value); setPage(1); }}
          className="rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-700 focus:border-primary-500 focus:outline-none cursor-pointer">
          <option value="">All Sources</option>
          {SOURCE_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        {(statusFilter || sourceFilter) && (
          <Button variant="ghost" size="sm" icon={X} onClick={() => { setStatusFilter(''); setSourceFilter(''); setPage(1); }}>
            Clear
          </Button>
        )}
      </div>

      {/* Leads Table */}
      <DataTable
        columns={columns}
        data={leads}
        loading={loading}
        searchable={false}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        onRowClick={(row) => openView(row)}
        emptyTitle="No leads found"
        emptyDescription="Add your first lead or upload a CSV file."
        emptyIcon={UserPlus}
      />

      {/* Add/Edit Lead Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)}
        title={editingLead ? 'Edit Lead' : 'Add New Lead'}
        description={editingLead ? 'Update lead information' : 'Enter lead details'}
        footer={<Modal.Footer onCancel={() => setModalOpen(false)} onConfirm={handleSubmit(onSave)} confirmText={editingLead ? 'Update' : 'Add Lead'} loading={saving} />}>
        <form onSubmit={handleSubmit(onSave)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name <span className="text-red-500">*</span></label>
              <input type="text" placeholder="Full name" className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none"
                {...register('full_name', { required: 'Name is required' })} />
              {errors.full_name && <p className="mt-1 text-xs text-red-500">{errors.full_name.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone <span className="text-red-500">*</span></label>
              <input type="tel" placeholder="Phone number" className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none"
                {...register('phone', { required: 'Phone is required' })} />
              {errors.phone && <p className="mt-1 text-xs text-red-500">{errors.phone.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" placeholder="Email (optional)" className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none"
                {...register('email')} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
              <select className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-primary-500 focus:outline-none cursor-pointer" {...register('gender')}>
                <option value="">Select</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
              <select className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-primary-500 focus:outline-none cursor-pointer" {...register('source')}>
                {SOURCE_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            {editingLead && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-primary-500 focus:outline-none cursor-pointer" {...register('status')}>
                  {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Interest</label>
              <input type="text" placeholder="e.g. Weight training, Yoga" className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-primary-500 focus:outline-none"
                {...register('interest')} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Follow Up Date</label>
              <input type="date" className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-primary-500 focus:outline-none cursor-pointer"
                {...register('follow_up_date')} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea rows={2} placeholder="Any notes..." className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-primary-500 focus:outline-none resize-none"
              {...register('notes')} />
          </div>
        </form>
      </Modal>

      {/* Disposition / Activity Modal */}
      <Modal open={!!activityLead} onClose={() => setActivityLead(null)}
        title={`Log Activity — ${activityLead?.full_name || ''}`}
        description="Record a call, message or visit"
        footer={<Modal.Footer onCancel={() => setActivityLead(null)} onConfirm={saveActivity} confirmText="Save Activity" loading={savingActivity} />}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Activity Type</label>
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'call', label: 'Call', icon: PhoneCall },
                { value: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
                { value: 'sms', label: 'SMS', icon: Mail },
                { value: 'email', label: 'Email', icon: Mail },
                { value: 'visit', label: 'Visit', icon: UserPlus },
                { value: 'note', label: 'Note', icon: Edit2 },
              ].map(t => (
                <button key={t.value} type="button" onClick={() => setActivityType(t.value)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                    activityType === t.value ? 'bg-primary-500 text-white border-primary-500' : 'bg-white text-gray-600 border-gray-300 hover:border-primary-300'
                  }`}>
                  <t.icon className="h-3.5 w-3.5" />{t.label}
                </button>
              ))}
            </div>
          </div>

          {activityType === 'call' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Call Disposition</label>
              <select value={disposition} onChange={e => setDisposition(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-primary-500 focus:outline-none cursor-pointer">
                <option value="">Select disposition...</option>
                {DISPOSITION_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Update Status (optional)</label>
            <select value={newStatus} onChange={e => setNewStatus(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-primary-500 focus:outline-none cursor-pointer">
              <option value="">No change</option>
              {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Set Follow Up</label>
            <input type="date" value={followUpDate} onChange={e => setFollowUpDate(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-primary-500 focus:outline-none cursor-pointer" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea rows={3} value={activityNotes} onChange={e => setActivityNotes(e.target.value)}
              placeholder="Add notes about this interaction..."
              className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-primary-500 focus:outline-none resize-none" />
          </div>
        </div>
      </Modal>

      {/* View Lead Detail Modal */}
      <Modal open={!!viewLead} onClose={() => setViewLead(null)} title={viewLead?.full_name || 'Lead'} size="lg">
        {viewLead && (
          <div className="space-y-5">
            {/* Lead info */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-gray-400">Phone:</span> <span className="font-medium text-gray-700">{viewLead.phone}</span></div>
              <div><span className="text-gray-400">Email:</span> <span className="font-medium text-gray-700">{viewLead.email || '-'}</span></div>
              <div><span className="text-gray-400">Source:</span> <Badge color="blue" size="sm">{(viewLead.source || '').replace(/_/g, ' ')}</Badge></div>
              <div><span className="text-gray-400">Status:</span> <Badge color={statusColor(viewLead.status)} dot size="sm">{(viewLead.status || '').replace(/_/g, ' ')}</Badge></div>
              <div><span className="text-gray-400">Interest:</span> <span className="text-gray-700">{viewLead.interest || '-'}</span></div>
              <div><span className="text-gray-400">Follow Up:</span> <span className="text-gray-700">{viewLead.follow_up_date ? formatDate(viewLead.follow_up_date) : '-'}</span></div>
              {viewLead.notes && <div className="col-span-2"><span className="text-gray-400">Notes:</span> <span className="text-gray-700">{viewLead.notes}</span></div>}
            </div>

            {/* Quick actions */}
            <div className="flex gap-2">
              <Button size="sm" icon={PhoneCall} onClick={() => { setViewLead(null); openDisposition(viewLead); }}>Log Call</Button>
              <Button size="sm" variant="secondary" icon={Edit2} onClick={() => { setViewLead(null); openEdit(viewLead); }}>Edit</Button>
              {viewLead.status !== 'converted' && (
                <Button size="sm" variant="secondary" icon={UserCheck} onClick={() => { setViewLead(null); setConvertTarget(viewLead); }}>Convert</Button>
              )}
            </div>

            {/* Activity Timeline */}
            <div>
              <h4 className="text-sm font-bold text-gray-900 mb-3">Activity History</h4>
              {activitiesLoading ? (
                <LoadingSpinner size="sm" />
              ) : activities.length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center">No activity recorded yet</p>
              ) : (
                <div className="relative pl-6 border-l-2 border-gray-200 space-y-4">
                  {activities.map((a, idx) => {
                    const icons = { call: PhoneCall, email: Mail, sms: MessageSquare, whatsapp: MessageSquare, visit: UserPlus, note: Edit2, follow_up: Calendar, status_change: ArrowRight, converted: UserCheck };
                    const Icon = icons[a.type] || Clock;
                    return (
                      <div key={a.activity_id || idx} className="relative">
                        <div className="absolute -left-[25px] top-1 h-3 w-3 rounded-full bg-primary-500 ring-2 ring-white" />
                        <div className="flex items-start gap-2">
                          <Icon className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-sm text-gray-700">
                              <span className="font-medium capitalize">{a.type.replace(/_/g, ' ')}</span>
                              {a.disposition && <span className="text-gray-500"> — {a.disposition}</span>}
                            </p>
                            {a.notes && <p className="text-xs text-gray-500 mt-0.5">{a.notes}</p>}
                            <p className="text-[10px] text-gray-400 mt-0.5">
                              {timeAgo(a.created_at)}
                              {a.users?.full_name && ` by ${a.users.full_name}`}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Bulk Upload Modal */}
      <Modal open={bulkModalOpen} onClose={() => setBulkModalOpen(false)} title="Bulk Upload Leads"
        description="Upload a CSV file with lead data"
        footer={<Modal.Footer onCancel={() => setBulkModalOpen(false)} onConfirm={handleBulkUpload} confirmText="Upload Leads" loading={uploading} />}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Upload CSV File</label>
            <p className="text-xs text-gray-400 mb-3">CSV must have columns: <code className="bg-gray-100 px-1 rounded">name</code>, <code className="bg-gray-100 px-1 rounded">phone</code>. Optional: <code className="bg-gray-100 px-1 rounded">email</code>, <code className="bg-gray-100 px-1 rounded">gender</code>, <code className="bg-gray-100 px-1 rounded">source</code></p>
            <input ref={fileRef} type="file" accept=".csv" onChange={handleFileUpload}
              className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 file:cursor-pointer" />
          </div>
          {bulkData && (() => {
            let parsed = [];
            try { parsed = JSON.parse(bulkData); } catch {}
            return (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-700">Preview — {parsed.length} leads</p>
                  <button onClick={() => { setBulkData(''); if (fileRef.current) fileRef.current.value = ''; }}
                    className="text-xs text-red-500 hover:underline cursor-pointer">Clear</button>
                </div>
                <div className="border border-gray-200 rounded-lg overflow-hidden max-h-64 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold text-gray-500">#</th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-500">Name</th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-500">Phone</th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-500">Email</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {parsed.map((lead, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-3 py-1.5 text-gray-400">{idx + 1}</td>
                          <td className="px-3 py-1.5 text-gray-800 font-medium">{lead.full_name}</td>
                          <td className="px-3 py-1.5 text-gray-600">{lead.phone}</td>
                          <td className="px-3 py-1.5 text-gray-600">{lead.email || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}
        </div>
      </Modal>

      {/* Convert Confirmation */}
      <ConfirmDialog open={!!convertTarget} onClose={() => setConvertTarget(null)} onConfirm={handleConvert}
        title="Convert Lead to Member"
        description={`Convert "${convertTarget?.full_name}" to a gym member? This will create a new member record with their details.`}
        confirmText="Convert" variant="primary" loading={converting} />

      {/* Delete Confirmation */}
      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete}
        title="Delete Lead" description={`Delete "${deleteTarget?.full_name}"? This cannot be undone.`}
        confirmText="Delete" variant="danger" loading={deleting} />
    </div>
  );
}
