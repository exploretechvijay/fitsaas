import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import {
  ArrowLeft, User, Phone, Mail, MapPin, Calendar, Edit2, Save, X,
  Dumbbell, Utensils, CreditCard, StickyNote, Plus, AlertCircle, Activity,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import toast from 'react-hot-toast';
import { membersApi, workoutsApi, dietApi, subscriptionsApi } from '../api/endpoints';
import { formatDate, formatCurrency, timeAgo } from '../utils/formatters';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import LoadingSpinner from '../components/ui/LoadingSpinner';

export default function MemberProfile() {
  const { memberId } = useParams();
  const navigate = useNavigate();

  const [member, setMember] = useState(null);
  const [metrics, setMetrics] = useState([]);
  const [workoutAssignments, setWorkoutAssignments] = useState([]);
  const [dietPlans, setDietPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showMetricForm, setShowMetricForm] = useState(false);
  const [savingMetric, setSavingMetric] = useState(false);
  const [notes, setNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);

  // Subscription assignment
  const [subModalOpen, setSubModalOpen] = useState(false);
  const [plans, setPlans] = useState([]);
  const [assigningSub, setAssigningSub] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm();
  const { register: registerMetric, handleSubmit: handleMetricSubmit, reset: resetMetric } = useForm();
  const { register: registerSub, handleSubmit: handleSubSubmit, reset: resetSub, watch: watchSub } = useForm();
  const watchedPaymentMode = watchSub('payment_mode');

  const fetchMember = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await membersApi.get(memberId);
      const data = res.data.data;
      setMember(data);
      setNotes(data.medical_notes || '');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load member');
    } finally {
      setLoading(false);
    }
  }, [memberId]);

  const fetchMetrics = useCallback(async () => {
    try {
      const res = await membersApi.getMetrics(memberId);
      setMetrics(res.data.data || []);
    } catch { /* silent */ }
  }, [memberId]);

  const fetchWorkout = useCallback(async () => {
    try {
      const res = await workoutsApi.getMemberAssignments(memberId);
      setWorkoutAssignments(res.data.data || []);
    } catch { /* silent */ }
  }, [memberId]);

  const fetchDiet = useCallback(async () => {
    try {
      const res = await dietApi.getMemberPlans(memberId);
      setDietPlans(res.data.data || []);
    } catch { /* silent */ }
  }, [memberId]);

  const fetchPlans = useCallback(async () => {
    try {
      const res = await subscriptionsApi.listPlans();
      const result = res.data.data;
      setPlans(Array.isArray(result) ? result : result?.items || []);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    fetchMember();
    fetchMetrics();
    fetchWorkout();
    fetchDiet();
    fetchPlans();
  }, [fetchMember, fetchMetrics, fetchWorkout, fetchDiet, fetchPlans]);

  const startEditing = () => {
    reset({
      full_name: member.full_name || '',
      email: member.email || '',
      phone: member.phone || '',
      gender: member.gender || '',
      dob: member.dob?.split('T')[0] || '',
      height: member.height || '',
      weight: member.weight || '',
      goal: member.goal || '',
      dietary_pref: member.dietary_pref || '',
      emergency_contact_name: member.emergency_contact_name || '',
      emergency_contact_phone: member.emergency_contact_phone || '',
    });
    setEditing(true);
  };

  const onSave = async (values) => {
    setSaving(true);
    try {
      await membersApi.update(memberId, values);
      toast.success('Member updated');
      setEditing(false);
      fetchMember();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update');
    } finally {
      setSaving(false);
    }
  };

  const onAddMetric = async (values) => {
    setSavingMetric(true);
    try {
      const weight = Number(values.weight);
      const height = Number(values.height) || member.height;
      const bmi = weight && height ? parseFloat((weight / ((height / 100) ** 2)).toFixed(1)) : undefined;
      await membersApi.addMetric(memberId, {
        weight,
        bmi,
        body_fat_pct: Number(values.body_fat_pct) || undefined,
        recorded_at: values.date ? new Date(values.date).toISOString() : new Date().toISOString(),
      });
      toast.success('Metric recorded');
      setShowMetricForm(false);
      resetMetric();
      fetchMetrics();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save metric');
    } finally {
      setSavingMetric(false);
    }
  };

  const saveNotes = async () => {
    setSavingNotes(true);
    try {
      await membersApi.update(memberId, { medical_notes: notes });
      toast.success('Notes saved');
    } catch {
      toast.error('Failed to save notes');
    } finally {
      setSavingNotes(false);
    }
  };

  const onAssignSubscription = async (values) => {
    setAssigningSub(true);
    try {
      await subscriptionsApi.assign({
        member_id: memberId,
        plan_id: values.plan_id,
        start_date: values.start_date || new Date().toISOString(),
        payment_amount: Number(values.payment_amount) || undefined,
        payment_mode: values.payment_mode || undefined,
        reference_id: values.reference_id || undefined,
      });
      toast.success('Subscription assigned!');
      setSubModalOpen(false);
      resetSub();
      fetchMember();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to assign');
    } finally {
      setAssigningSub(false);
    }
  };

  if (loading) return <LoadingSpinner text="Loading member profile..." className="min-h-[60vh]" />;

  if (error || !member) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <AlertCircle className="h-12 w-12 text-red-400 mb-4" />
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Member not found</h2>
        <p className="text-sm text-gray-500 mb-4">{error}</p>
        <Button variant="secondary" icon={ArrowLeft} onClick={() => navigate('/members')}>Back to Members</Button>
      </div>
    );
  }

  // Extract subscription data from the member response
  const subscriptions = member.member_subscriptions || [];
  const activeSub = subscriptions.find(s => s.status === 'active');
  const statusColor = { active: 'green', expired: 'red', inactive: 'gray', paused: 'yellow', cancelled: 'gray' };

  // Chart data - use recorded_at for x-axis
  const chartData = metrics.map(m => ({
    ...m,
    date: formatDate(m.recorded_at),
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/members')} className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xl font-bold">
              {(member.full_name || '?')[0].toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-gray-900">{member.full_name}</h1>
                <Badge color={activeSub ? 'green' : 'gray'} dot size="sm">
                  {activeSub ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <p className="text-sm text-gray-500">Member since {formatDate(member.created_at)}</p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {!editing && <Button variant="secondary" icon={Edit2} onClick={startEditing}>Edit</Button>}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal Info */}
          <Card>
            <Card.Header><Card.Title>Personal Information</Card.Title></Card.Header>
            {editing ? (
              <form onSubmit={handleSubmit(onSave)} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                    <input type="text" className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none" {...register('full_name', { required: 'Required' })} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input type="email" className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none" {...register('email')} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input type="tel" className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none" {...register('phone')} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                    <select className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none" {...register('gender')}>
                      <option value="">Select</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                    <input type="date" className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none" {...register('dob')} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Goal</label>
                    <select className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none" {...register('goal')}>
                      <option value="">Select</option>
                      <option value="weight_loss">Weight Loss</option>
                      <option value="muscle_gain">Muscle Gain</option>
                      <option value="endurance">Endurance</option>
                      <option value="flexibility">Flexibility</option>
                      <option value="general_fitness">General Fitness</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Weight (kg)</label>
                    <input type="number" step="0.1" className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none" {...register('weight')} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Height (cm)</label>
                    <input type="number" step="0.1" className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none" {...register('height')} />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Emergency Contact Name</label>
                    <input type="text" className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none" {...register('emergency_contact_name')} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Emergency Contact Phone</label>
                    <input type="tel" className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none" {...register('emergency_contact_phone')} />
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <Button type="submit" icon={Save} loading={saving}>Save Changes</Button>
                  <Button type="button" variant="secondary" icon={X} onClick={() => setEditing(false)}>Cancel</Button>
                </div>
              </form>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InfoItem icon={Mail} label="Email" value={member.email} />
                <InfoItem icon={Phone} label="Phone" value={member.phone} />
                <InfoItem icon={User} label="Gender" value={member.gender} />
                <InfoItem icon={Calendar} label="Date of Birth" value={formatDate(member.dob)} />
                <InfoItem icon={Activity} label="Goal" value={member.goal?.replace(/_/g, ' ')} />
                <InfoItem icon={Activity} label="Diet Preference" value={member.dietary_pref?.replace(/_/g, ' ')} />
                <InfoItem icon={Activity} label="Height / Weight" value={`${member.height || '-'} cm / ${member.weight || '-'} kg`} />
                <InfoItem icon={Phone} label="Emergency" value={member.emergency_contact_name ? `${member.emergency_contact_name} (${member.emergency_contact_phone || ''})` : null} />
              </div>
            )}
          </Card>

          {/* Subscription History */}
          <Card>
            <Card.Header>
              <Card.Title>Subscription History</Card.Title>
              <Button size="sm" icon={Plus} onClick={() => { resetSub({ plan_id: '', start_date: new Date().toISOString().split('T')[0], payment_amount: '', payment_mode: 'cash' }); setSubModalOpen(true); }}>
                Add Subscription
              </Button>
            </Card.Header>
            {subscriptions.length > 0 ? (
              <div className="relative pl-6 border-l-2 border-gray-200 space-y-5">
                {subscriptions.map((sub, idx) => (
                  <div key={sub.sub_id || idx} className="relative">
                    <div className={`absolute -left-[25px] top-1 h-3 w-3 rounded-full border-2 ${sub.status === 'active' ? 'border-green-500 bg-green-100' : 'border-gray-400 bg-white'}`} />
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-gray-900">
                            {sub.subscription_plans?.name || 'Plan'}
                          </p>
                          <Badge color={statusColor[sub.status] || 'gray'} size="sm">{sub.status}</Badge>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {formatDate(sub.start_date)} — {formatDate(sub.end_date)}
                        </p>
                      </div>
                      <p className="text-sm font-semibold text-gray-700">
                        {formatCurrency(sub.subscription_plans?.price)}
                      </p>
                    </div>
                    {sub.cancel_reason && (
                      <p className="text-xs text-red-500 mt-1">Reason: {sub.cancel_reason}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 py-4 text-center">No subscription history</p>
            )}
          </Card>

          {/* Body Metrics Chart */}
          <Card>
            <Card.Header>
              <div>
                <Card.Title>Body Metrics</Card.Title>
                <Card.Description>Weight and BMI over time</Card.Description>
              </div>
              <Button size="sm" variant="secondary" icon={Plus} onClick={() => setShowMetricForm(!showMetricForm)}>
                Add Metric
              </Button>
            </Card.Header>

            {showMetricForm && (
              <form onSubmit={handleMetricSubmit(onAddMetric)} className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 p-4 bg-gray-50 rounded-lg">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Weight (kg) *</label>
                  <input type="number" step="0.1" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none" {...registerMetric('weight', { required: true })} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Height (cm)</label>
                  <input type="number" step="0.1" defaultValue={member.height || ''} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none" {...registerMetric('height')} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Body Fat %</label>
                  <input type="number" step="0.1" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none" {...registerMetric('body_fat_pct')} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
                  <input type="date" defaultValue={new Date().toISOString().split('T')[0]} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none" {...registerMetric('date')} />
                </div>
                <div className="col-span-2 sm:col-span-4 flex gap-2 justify-end">
                  <Button type="button" variant="secondary" size="sm" onClick={() => setShowMetricForm(false)}>Cancel</Button>
                  <Button type="submit" size="sm" loading={savingMetric}>Save</Button>
                </div>
              </form>
            )}

            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Legend iconSize={10} />
                  <Line type="monotone" dataKey="weight" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} name="Weight (kg)" />
                  <Line type="monotone" dataKey="bmi" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} name="BMI" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-gray-400 py-8 text-center">No metric data recorded yet</p>
            )}
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Current Subscription */}
          <Card>
            <Card.Header>
              <Card.Title><span className="flex items-center gap-2"><CreditCard className="h-4 w-4 text-gray-400" />Subscription</span></Card.Title>
            </Card.Header>
            {activeSub ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Plan</span>
                  <span className="text-sm font-medium text-gray-900">{activeSub.subscription_plans?.name || '-'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Status</span>
                  <Badge color="green" dot size="sm">{activeSub.status}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Start</span>
                  <span className="text-sm text-gray-700">{formatDate(activeSub.start_date)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Expiry</span>
                  <span className="text-sm text-gray-700">{formatDate(activeSub.end_date)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Price</span>
                  <span className="text-sm font-semibold text-gray-900">{formatCurrency(activeSub.subscription_plans?.price)}</span>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-gray-400 mb-3">No active subscription</p>
                <Button size="sm" icon={Plus} onClick={() => { resetSub({ plan_id: '', start_date: new Date().toISOString().split('T')[0], payment_amount: '', payment_mode: 'cash' }); setSubModalOpen(true); }}>
                  Assign Plan
                </Button>
              </div>
            )}
          </Card>

          {/* Workout Plan */}
          <Card>
            <Card.Header>
              <Card.Title><span className="flex items-center gap-2"><Dumbbell className="h-4 w-4 text-gray-400" />Workout Plan</span></Card.Title>
            </Card.Header>
            {workoutAssignments.length > 0 ? (
              <div className="space-y-3">
                {workoutAssignments.slice(0, 3).map((wa, idx) => (
                  <div key={wa.assignment_id || idx} className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm font-medium text-gray-900 break-words">{wa.workout_plans?.name || 'Workout Plan'}</p>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {wa.workout_plans?.type && <Badge color="indigo" size="sm">{wa.workout_plans.type.replace(/_/g, ' ')}</Badge>}
                      {wa.workout_plans?.difficulty && <Badge color="blue" size="sm">{wa.workout_plans.difficulty}</Badge>}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Started {formatDate(wa.start_date)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-4">No workout plan assigned</p>
            )}
          </Card>

          {/* Diet Plan */}
          <Card>
            <Card.Header>
              <Card.Title><span className="flex items-center gap-2"><Utensils className="h-4 w-4 text-gray-400" />Diet Plan</span></Card.Title>
            </Card.Header>
            {dietPlans.length > 0 ? (
              <div className="space-y-3">
                {dietPlans.slice(0, 3).map((plan) => (
                  <div key={plan.diet_id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Badge color={plan.source === 'ai' ? 'purple' : 'blue'} size="sm">{plan.source === 'ai' ? 'AI' : 'Manual'}</Badge>
                      <span className="text-xs text-gray-400">{timeAgo(plan.created_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-4">No diet plan assigned</p>
            )}
          </Card>

          {/* Notes */}
          <Card>
            <Card.Header>
              <Card.Title><span className="flex items-center gap-2"><StickyNote className="h-4 w-4 text-gray-400" />Notes</span></Card.Title>
              {!editingNotes && (
                <button onClick={() => setEditingNotes(true)} className="p-1.5 rounded-md text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors cursor-pointer">
                  <Edit2 className="h-4 w-4" />
                </button>
              )}
            </Card.Header>
            {editingNotes ? (
              <>
                <textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add medical notes or trainer observations..."
                  className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-700 placeholder-gray-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none resize-none" />
                <div className="flex justify-end gap-2 mt-3">
                  <Button size="sm" variant="secondary" onClick={() => { setEditingNotes(false); setNotes(member.medical_notes || ''); }}>Cancel</Button>
                  <Button size="sm" icon={Save} onClick={() => { saveNotes(); setEditingNotes(false); }} loading={savingNotes}>Save</Button>
                </div>
              </>
            ) : (
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{notes || <span className="text-gray-400 italic">No notes added yet</span>}</p>
            )}
          </Card>
        </div>
      </div>

      {/* Assign Subscription Modal */}
      <Modal open={subModalOpen} onClose={() => setSubModalOpen(false)} title="Assign Subscription"
        description={`Assign a plan to ${member.full_name}`}
        footer={<Modal.Footer onCancel={() => setSubModalOpen(false)} onConfirm={handleSubSubmit(onAssignSubscription)} confirmText="Assign" loading={assigningSub} />}>
        <form onSubmit={handleSubSubmit(onAssignSubscription)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Plan <span className="text-red-500">*</span></label>
            <select className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none"
              {...registerSub('plan_id', { required: 'Select a plan' })}>
              <option value="">Select a plan</option>
              {plans.map(p => (
                <option key={p.plan_id} value={p.plan_id}>
                  {p.name} — {formatCurrency(p.price)} ({p.duration_days} days)
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input type="date" className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none"
              {...registerSub('start_date')} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Amount</label>
              <input type="number" placeholder="0" className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none"
                {...registerSub('payment_amount')} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Mode</label>
              <select className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none"
                {...registerSub('payment_mode')}>
                <option value="cash">Cash</option>
                <option value="upi">UPI</option>
                <option value="card">Card</option>
                <option value="bank_transfer">Bank Transfer</option>
              </select>
            </div>
          </div>
          {watchedPaymentMode && watchedPaymentMode !== 'cash' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Transaction Reference No. <span className="text-red-500">*</span>
              </label>
              <input type="text" placeholder={watchedPaymentMode === 'upi' ? 'e.g. UPI Ref: 123456789012' : watchedPaymentMode === 'card' ? 'e.g. Card Auth: TXN12345' : 'e.g. NEFT/IMPS Ref No.'}
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none"
                {...registerSub('reference_id', { required: watchedPaymentMode !== 'cash' ? 'Reference number is required for digital payments' : false })} />
              <p className="mt-1 text-xs text-gray-400">This will appear in the Payments tab for tracking</p>
            </div>
          )}
        </form>
      </Modal>
    </div>
  );
}

function InfoItem({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex-shrink-0 h-8 w-8 rounded-lg bg-gray-100 flex items-center justify-center">
        <Icon className="h-4 w-4 text-gray-400" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">{label}</p>
        <p className="text-sm text-gray-700 mt-0.5 break-words">{value || '-'}</p>
      </div>
    </div>
  );
}
