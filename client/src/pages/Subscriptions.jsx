import { useState, useEffect, useCallback, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import {
  CreditCard,
  Plus,
  Edit2,
  Trash2,
  AlertTriangle,
  X,
  DollarSign,
  Search,
  Check,
  Pencil,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { subscriptionsApi, gymApi } from '../api/endpoints';
import { formatDate, formatCurrency } from '../utils/formatters';
import Card from '../components/ui/Card';
import DataTable from '../components/ui/DataTable';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import EmptyState from '../components/ui/EmptyState';
import LoadingSpinner from '../components/ui/LoadingSpinner';

const TABS = ['Plans', 'Payments'];

const MASTER_FEATURES = [
  'Gym access',
  'Locker facility',
  'Group classes',
  'Personal trainer',
  'Diet consultation',
  'Cardio zone',
  'Swimming pool',
  'Steam & Sauna',
  'Parking',
  'Towel service',
  'Supplements discount',
  'Guest pass',
  'Free merchandise',
  'Priority support',
  '24/7 access',
];

function parseFeatures(f) {
  if (Array.isArray(f)) return f;
  if (typeof f === 'string') { try { return JSON.parse(f); } catch { return []; } }
  return [];
}

function durationLabel(days) {
  if (days === 30) return 'Monthly';
  if (days === 90) return 'Quarterly';
  if (days === 180) return 'Half-Yearly';
  if (days === 365) return 'Annual';
  return `${days} days`;
}

export default function Subscriptions() {
  const [activeTab, setActiveTab] = useState('Plans');

  const [plans, setPlans] = useState([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [deletePlanTarget, setDeletePlanTarget] = useState(null);
  const [savingPlan, setSavingPlan] = useState(false);
  const [deletingPlan, setDeletingPlan] = useState(false);
  const [featureInput, setFeatureInput] = useState('');
  const [features, setFeatures] = useState([]);

  const [payments, setPayments] = useState([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [paymentPage, setPaymentPage] = useState(1);
  const [paymentTotalPages, setPaymentTotalPages] = useState(1);

  const [expiring, setExpiring] = useState([]);
  const [availableFeatures, setAvailableFeatures] = useState(MASTER_FEATURES);
  const [editingPaymentId, setEditingPaymentId] = useState(null);
  const [editRefValue, setEditRefValue] = useState('');

  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const fetchPlans = useCallback(async () => {
    setPlansLoading(true);
    try {
      const res = await subscriptionsApi.listPlans();
      const result = res.data.data;
      setPlans(Array.isArray(result) ? result : result?.items || []);
    } catch {
      toast.error('Failed to load plans');
    } finally {
      setPlansLoading(false);
    }
  }, []);

  const fetchPayments = useCallback(async () => {
    setPaymentsLoading(true);
    try {
      const res = await subscriptionsApi.getPayments({ page: paymentPage, limit: 15 });
      const result = res.data.data;
      setPayments(result?.items || []);
      setPaymentTotalPages(result?.pagination?.totalPages || 1);
    } catch {
      toast.error('Failed to load payments');
    } finally {
      setPaymentsLoading(false);
    }
  }, [paymentPage]);

  const fetchExpiring = useCallback(async () => {
    try {
      const res = await subscriptionsApi.getExpiring(7);
      const result = res.data.data;
      setExpiring(Array.isArray(result) ? result : result?.items || []);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    fetchPlans();
    fetchExpiring();
    // Load gym features
    gymApi.getProfile().then(res => {
      const feats = res.data?.data?.branding?.gym_features;
      if (Array.isArray(feats) && feats.length > 0) setAvailableFeatures(feats);
    }).catch(() => {});
  }, [fetchPlans, fetchExpiring]);
  useEffect(() => { if (activeTab === 'Payments') fetchPayments(); }, [activeTab, fetchPayments]);

  const openAddPlan = () => {
    setEditingPlan(null);
    setFeatures([]);
    reset({ name: '', duration_days: '30', price: '', description: '' });
    setPlanModalOpen(true);
  };

  const openEditPlan = (plan) => {
    setEditingPlan(plan);
    setFeatures(parseFeatures(plan.features));
    reset({
      name: plan.name || '',
      duration_days: String(plan.duration_days || 30),
      price: plan.price || '',
      description: plan.description || '',
    });
    setPlanModalOpen(true);
  };

  const addFeature = () => {
    const trimmed = featureInput.trim();
    if (trimmed && !features.includes(trimmed)) {
      setFeatures([...features, trimmed]);
      setFeatureInput('');
    }
  };

  const removeFeature = (f) => setFeatures(features.filter(feat => feat !== f));

  const onSavePlan = async (values) => {
    setSavingPlan(true);
    try {
      const payload = {
        name: values.name,
        duration_days: Number(values.duration_days),
        price: Number(values.price),
        description: values.description,
        features,
      };
      if (editingPlan) {
        const planId = editingPlan.plan_id;
        if (!planId) { toast.error('Plan ID missing'); return; }
        await subscriptionsApi.updatePlan(planId, payload);
        toast.success('Plan updated');
      } else {
        await subscriptionsApi.createPlan(payload);
        toast.success('Plan created');
      }
      setPlanModalOpen(false);
      fetchPlans();
    } catch (err) {
      console.error('Save plan error:', err.response?.status, err.response?.data, 'planId:', editingPlan?.plan_id);
      toast.error(err.response?.data?.message || 'Failed to save plan');
    } finally {
      setSavingPlan(false);
    }
  };

  const savePaymentRef = async (paymentId) => {
    try {
      await subscriptionsApi.updatePayment(paymentId, { reference_id: editRefValue });
      toast.success('Reference updated');
      setEditingPaymentId(null);
      setEditRefValue('');
      fetchPayments();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update');
    }
  };

  const handleDeletePlan = async () => {
    if (!deletePlanTarget) return;
    setDeletingPlan(true);
    try {
      await subscriptionsApi.deletePlan(deletePlanTarget.plan_id);
      toast.success('Plan deleted');
      setDeletePlanTarget(null);
      fetchPlans();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete');
    } finally {
      setDeletingPlan(false);
    }
  };

  const paymentColumns = useMemo(() => [
    {
      header: 'Member',
      key: 'members',
      render: (_val, row) => (
        <div>
          <p className="text-sm font-medium text-gray-900">{row.members?.full_name || '-'}</p>
          <p className="text-xs text-gray-400">{row.members?.email || ''}</p>
        </div>
      ),
    },
    {
      header: 'Plan',
      key: 'plan_name',
      render: (_val, row) => (
        <span className="text-sm text-gray-700">
          {row.member_subscriptions?.subscription_plans?.name || '-'}
        </span>
      ),
    },
    {
      header: 'Amount',
      key: 'amount',
      render: (val) => <span className="font-semibold text-gray-900">{formatCurrency(val)}</span>,
    },
    {
      header: 'Mode',
      key: 'mode',
      render: (val) => (
        <Badge color="blue" size="sm">{(val || 'cash').replace('_', ' ')}</Badge>
      ),
    },
    {
      header: 'Reference',
      key: 'reference_id',
      sortable: false,
      render: (val, row) => {
        const pid = row.payment_id;
        if (editingPaymentId === pid) {
          return (
            <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
              <input type="text" value={editRefValue}
                onChange={e => setEditRefValue(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') savePaymentRef(pid); if (e.key === 'Escape') setEditingPaymentId(null); }}
                placeholder="Enter ref no."
                autoFocus
                className="w-28 rounded border border-primary-300 px-2 py-1 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary-500" />
              <button onClick={() => savePaymentRef(pid)} className="p-1 text-green-600 hover:bg-green-50 rounded cursor-pointer">
                <Check className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => setEditingPaymentId(null)} className="p-1 text-gray-400 hover:bg-gray-100 rounded cursor-pointer">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        }
        return (
          <div className="flex items-center gap-1.5 group" onClick={e => e.stopPropagation()}>
            <span className="text-xs text-gray-500 font-mono">{val || '-'}</span>
            {row.mode !== 'cash' && (
              <button onClick={() => { setEditingPaymentId(pid); setEditRefValue(val || ''); }}
                className="p-0.5 text-gray-300 hover:text-primary-500 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer" title="Edit reference">
                <Pencil className="h-3 w-3" />
              </button>
            )}
          </div>
        );
      },
    },
    {
      header: 'Date',
      key: 'paid_at',
      render: (val) => <span className="text-sm text-gray-500">{formatDate(val)}</span>,
    },
  ], [editingPaymentId, editRefValue]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Subscriptions</h1>
          <p className="text-sm text-gray-500 mt-1">Manage plans, payments and renewals</p>
        </div>
        {activeTab === 'Plans' && (
          <Button icon={Plus} onClick={openAddPlan}>Create Plan</Button>
        )}
      </div>

      {/* Expiring Widget */}
      {expiring.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-800">
                {expiring.length} subscription{expiring.length > 1 ? 's' : ''} expiring in 7 days
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                {expiring.slice(0, 5).map((item, idx) => (
                  <Badge key={item.sub_id || idx} color="yellow" size="sm">
                    {item.members?.full_name || 'Member'} — {formatDate(item.end_date)}
                  </Badge>
                ))}
                {expiring.length > 5 && (
                  <span className="text-xs text-amber-600">+{expiring.length - 5} more</span>
                )}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-6">
          {TABS.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
                activeTab === tab ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}>
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* Plans Tab */}
      {activeTab === 'Plans' && (
        <>
          {plansLoading ? (
            <LoadingSpinner text="Loading plans..." />
          ) : plans.length === 0 ? (
            <EmptyState icon={CreditCard} title="No subscription plans"
              description="Create your first plan to start managing subscriptions."
              actionLabel="Create Plan" onAction={openAddPlan} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {plans.map(plan => {
                const feats = parseFeatures(plan.features);
                return (
                  <Card key={plan.plan_id} className="flex flex-col">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-base font-semibold text-gray-900">{plan.name}</h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {durationLabel(plan.duration_days)}
                          {plan.is_active === false && <Badge color="gray" size="sm" className="ml-2">Inactive</Badge>}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => openEditPlan(plan)}
                          className="p-1.5 rounded-md text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors cursor-pointer">
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button onClick={() => setDeletePlanTarget(plan)}
                          className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <p className="text-2xl font-bold text-gray-900 mb-2">{formatCurrency(plan.price)}</p>

                    {plan.description && (
                      <p className="text-sm text-gray-500 mb-3">{plan.description}</p>
                    )}

                    {feats.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-auto pt-3">
                        {feats.map(f => (
                          <Badge key={f} color="indigo" size="sm">{f}</Badge>
                        ))}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Payments Tab */}
      {activeTab === 'Payments' && (
        <DataTable
          columns={paymentColumns}
          data={payments}
          loading={paymentsLoading}
          searchable={false}
          page={paymentPage}
          totalPages={paymentTotalPages}
          onPageChange={setPaymentPage}
          emptyTitle="No payments found"
          emptyDescription="Payment records will appear here."
          emptyIcon={DollarSign}
        />
      )}

      {/* Plan Create/Edit Modal */}
      <Modal open={planModalOpen} onClose={() => setPlanModalOpen(false)}
        title={editingPlan ? 'Edit Plan' : 'Create Plan'}
        description="Define your subscription plan details"
        footer={<Modal.Footer onCancel={() => setPlanModalOpen(false)} onConfirm={handleSubmit(onSavePlan)} confirmText={editingPlan ? 'Update' : 'Create'} loading={savingPlan} />}>
        <form onSubmit={handleSubmit(onSavePlan)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Plan Name <span className="text-red-500">*</span></label>
            <input type="text" placeholder="e.g. Gold Monthly"
              className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none"
              {...register('name', { required: 'Plan name is required' })} />
            {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Duration (days) <span className="text-red-500">*</span></label>
            <select className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none cursor-pointer"
              {...register('duration_days', { required: true })}>
              <option value="30">Monthly (30 days)</option>
              <option value="90">Quarterly (90 days)</option>
              <option value="180">Half-Yearly (180 days)</option>
              <option value="365">Annual (365 days)</option>
              <option value="45">45 days</option>
              <option value="60">60 days</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Price (INR) <span className="text-red-500">*</span></label>
            <input type="number" placeholder="e.g. 2000"
              className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none"
              {...register('price', { required: 'Price is required', min: { value: 0, message: 'Must be positive' } })} />
            {errors.price && <p className="mt-1 text-xs text-red-500">{errors.price.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea rows={2} placeholder="Plan description..."
              className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none resize-none"
              {...register('description')} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Features</label>
            <div className="flex flex-wrap gap-2">
              {availableFeatures.map(f => {
                const selected = features.includes(f);
                return (
                  <button key={f} type="button"
                    onClick={() => setFeatures(prev => selected ? prev.filter(x => x !== f) : [...prev, f])}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
                      selected
                        ? 'bg-primary-500 text-white border-primary-500'
                        : 'bg-white text-gray-600 border-gray-300 hover:border-primary-300 hover:text-primary-600'
                    }`}>
                    {f}
                  </button>
                );
              })}
            </div>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={!!deletePlanTarget} onClose={() => setDeletePlanTarget(null)} onConfirm={handleDeletePlan}
        title="Delete Plan" description={`Delete "${deletePlanTarget?.name}"? Active subscriptions won't be affected.`}
        confirmText="Delete" variant="danger" loading={deletingPlan} />
    </div>
  );
}
