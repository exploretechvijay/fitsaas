import { useState, useEffect, useCallback, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import {
  Megaphone,
  Plus,
  Trash2,
  Send,
  Clock,
  Users,
  AlertCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { announcementsApi } from '../api/endpoints';
import { formatDateTime, timeAgo } from '../utils/formatters';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import EmptyState from '../components/ui/EmptyState';
import LoadingSpinner from '../components/ui/LoadingSpinner';

const TARGET_OPTIONS = [
  { value: 'all', label: 'All Members' },
  { value: 'active', label: 'Active Members Only' },
  { value: 'expiring', label: 'Expiring Subscriptions' },
  { value: 'expired', label: 'Expired Members' },
  { value: 'staff', label: 'Staff Only' },
];

export default function Announcements() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [sending, setSending] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      title: '',
      message: '',
      targetType: 'all',
      scheduledAt: '',
    },
  });

  const fetchAnnouncements = useCallback(async () => {
    setLoading(true);
    try {
      const res = await announcementsApi.list();
      const result = res.data.data;
      setAnnouncements(result.items || result || []);
    } catch {
      toast.error('Failed to load announcements');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  const onSubmit = async (values) => {
    setSending(true);
    try {
      const payload = {
        title: values.title,
        message: values.message,
        target_type: values.targetType,
      };
      if (values.scheduledAt) {
        payload.scheduled_at = new Date(values.scheduledAt).toISOString();
      }
      await announcementsApi.create(payload);
      toast.success('Announcement sent!');
      reset();
      setShowForm(false);
      fetchAnnouncements();
    } catch {
      // handled
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await announcementsApi.delete(deleteTarget.announcement_id || deleteTarget._id);
      toast.success('Announcement deleted');
      setDeleteTarget(null);
      fetchAnnouncements();
    } catch {
      // handled
    } finally {
      setDeleting(false);
    }
  };

  const targetLabel = (type) => {
    const found = TARGET_OPTIONS.find((t) => t.value === type);
    return found?.label || type;
  };

  const targetColor = (type) => {
    const map = {
      all: 'blue',
      active: 'green',
      expiring: 'yellow',
      expired: 'red',
      staff: 'purple',
    };
    return map[type] || 'gray';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Announcements</h1>
          <p className="text-sm text-gray-500 mt-1">
            Send notifications and announcements to members
          </p>
        </div>
        <Button
          icon={showForm ? null : Plus}
          variant={showForm ? 'secondary' : 'primary'}
          onClick={() => {
            setShowForm(!showForm);
            if (!showForm) {
              reset();
            }
          }}
        >
          {showForm ? 'Cancel' : 'New Announcement'}
        </Button>
      </div>

      {/* Create Form */}
      {showForm && (
        <Card>
          <Card.Header>
            <Card.Title>Create Announcement</Card.Title>
          </Card.Header>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Announcement title"
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none"
                {...register('title', { required: 'Title is required' })}
              />
              {errors.title && (
                <p className="mt-1 text-xs text-red-500">{errors.title.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Message <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={4}
                placeholder="Write your announcement message..."
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none resize-none"
                {...register('message', { required: 'Message is required' })}
              />
              {errors.message && (
                <p className="mt-1 text-xs text-red-500">{errors.message.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Target Audience
                </label>
                <select
                  className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none cursor-pointer"
                  {...register('targetType')}
                >
                  {TARGET_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Schedule (optional)
                </label>
                <input
                  type="datetime-local"
                  className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none cursor-pointer"
                  {...register('scheduledAt')}
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" icon={Send} loading={sending}>
                Send Announcement
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowForm(false);
                  reset();
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Announcements List */}
      {loading ? (
        <LoadingSpinner text="Loading announcements..." />
      ) : announcements.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="No announcements"
          description="Create your first announcement to notify members."
          actionLabel="New Announcement"
          onAction={() => setShowForm(true)}
        />
      ) : (
        <div className="space-y-4">
          {announcements.map((ann) => (
            <Card key={ann.announcement_id || ann._id}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-base font-semibold text-gray-900 truncate">
                      {ann.title}
                    </h3>
                    <Badge color={targetColor(ann.target_type || ann.targetType)} size="sm">
                      {targetLabel(ann.target_type || ann.targetType)}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 whitespace-pre-line mb-3">
                    {ann.message}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {timeAgo(ann.created_at || ann.createdAt)}
                    </span>
                    {(ann.scheduled_at || ann.scheduledAt) && (
                      <span className="flex items-center gap-1">
                        <AlertCircle className="h-3.5 w-3.5" />
                        Scheduled: {formatDateTime(ann.scheduled_at || ann.scheduledAt)}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setDeleteTarget(ann)}
                  className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors flex-shrink-0 cursor-pointer"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Announcement"
        description={`Are you sure you want to delete "${deleteTarget?.title}"?`}
        confirmText="Delete"
        loading={deleting}
      />
    </div>
  );
}
