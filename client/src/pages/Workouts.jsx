import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import {
  Dumbbell,
  Plus,
  Edit2,
  Trash2,
  Search,
  ChevronDown,
  ChevronUp,
  X,
  UserPlus,
  Copy,
  LayoutGrid,
  List,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { workoutsApi, membersApi } from '../api/endpoints';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import EmptyState from '../components/ui/EmptyState';
import LoadingSpinner from '../components/ui/LoadingSpinner';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const PLAN_TYPES = ['Strength', 'Cardio', 'Flexibility', 'HIIT', 'CrossFit', 'Yoga', 'Custom'];
const DIFFICULTIES = ['Beginner', 'Intermediate', 'Advanced'];

const emptyExercise = () => ({
  name: '',
  sets: '',
  reps: '',
  duration: '',
  rest: '',
  notes: '',
});

export default function Workouts() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState('grid');

  // Plan modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Schedule builder state
  const [schedule, setSchedule] = useState(
    DAYS.reduce((acc, day) => ({ ...acc, [day]: [] }), {})
  );
  const [expandedDay, setExpandedDay] = useState('Monday');
  const [goalInput, setGoalInput] = useState('');
  const [goals, setGoals] = useState([]);

  // Assign modal
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignPlan, setAssignPlan] = useState(null);
  const [members, setMembers] = useState([]);
  const [selectedMember, setSelectedMember] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm();

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      const res = await workoutsApi.listPlans(params);
      const result = res.data.data;
      setPlans(result.items || result || []);
    } catch {
      toast.error('Failed to load workout plans');
    } finally {
      setLoading(false);
    }
  }, [search]);

  const fetchMembers = useCallback(async () => {
    try {
      const params = { limit: 100 };
      if (memberSearch) params.search = memberSearch;
      const res = await membersApi.list(params);
      const result = res.data.data;
      setMembers(result.items || []);
    } catch {
      // silent
    }
  }, [memberSearch]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const openAddModal = () => {
    setEditingPlan(null);
    setGoals([]);
    setSchedule(DAYS.reduce((acc, day) => ({ ...acc, [day]: [] }), {}));
    setExpandedDay('Monday');
    reset({ name: '', type: 'Strength', difficulty: 'Beginner', description: '' });
    setModalOpen(true);
  };

  const openEditModal = (plan) => {
    setEditingPlan(plan);
    setGoals(plan.goals || []);
    // Rebuild schedule from plan data
    const sched = DAYS.reduce((acc, day) => ({ ...acc, [day]: [] }), {});
    if (plan.schedule) {
      plan.schedule.forEach((dayData) => {
        if (sched[dayData.day] !== undefined) {
          sched[dayData.day] = dayData.exercises || [];
        }
      });
    }
    setSchedule(sched);
    setExpandedDay('Monday');
    reset({
      name: plan.name || '',
      type: plan.type || 'Strength',
      difficulty: plan.difficulty || 'Beginner',
      description: plan.description || '',
    });
    setModalOpen(true);
  };

  const openAssignModal = (plan) => {
    setAssignPlan(plan);
    setSelectedMember('');
    setMemberSearch('');
    setAssignModalOpen(true);
    fetchMembers();
  };

  // Schedule builder helpers
  const addExercise = (day) => {
    setSchedule((prev) => ({
      ...prev,
      [day]: [...prev[day], emptyExercise()],
    }));
  };

  const updateExercise = (day, idx, field, value) => {
    setSchedule((prev) => {
      const exercises = [...prev[day]];
      exercises[idx] = { ...exercises[idx], [field]: value };
      return { ...prev, [day]: exercises };
    });
  };

  const removeExercise = (day, idx) => {
    setSchedule((prev) => ({
      ...prev,
      [day]: prev[day].filter((_, i) => i !== idx),
    }));
  };

  const addGoal = () => {
    const trimmed = goalInput.trim();
    if (trimmed && !goals.includes(trimmed)) {
      setGoals([...goals, trimmed]);
      setGoalInput('');
    }
  };

  const onSavePlan = async (values) => {
    setSaving(true);
    try {
      const scheduleData = DAYS.map((day) => ({
        day,
        exercises: schedule[day].filter((ex) => ex.name.trim()),
      }));
      const payload = {
        name: values.name,
        type: values.type,
        difficulty: values.difficulty,
        description: values.description,
        goals,
        schedule: scheduleData,
      };
      if (editingPlan) {
        await workoutsApi.updatePlan(editingPlan.plan_id || editingPlan._id, payload);
        toast.success('Workout plan updated');
      } else {
        await workoutsApi.createPlan(payload);
        toast.success('Workout plan created');
      }
      setModalOpen(false);
      fetchPlans();
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
      await workoutsApi.deletePlan(deleteTarget.plan_id || deleteTarget._id);
      toast.success('Plan deleted');
      setDeleteTarget(null);
      fetchPlans();
    } catch {
      // handled
    } finally {
      setDeleting(false);
    }
  };

  const handleAssign = async () => {
    if (!assignPlan || !selectedMember) return;
    setAssigning(true);
    try {
      await workoutsApi.assign({
        plan_id: assignPlan.plan_id || assignPlan._id,
        member_id: selectedMember,
        start_date: new Date().toISOString(),
      });
      toast.success('Plan assigned to member');
      setAssignModalOpen(false);
    } catch {
      // handled
    } finally {
      setAssigning(false);
    }
  };

  const filteredPlans = plans;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Workout Plans</h1>
          <p className="text-sm text-gray-500 mt-1">
            Create and manage workout templates
          </p>
        </div>
        <Button icon={Plus} onClick={openAddModal}>
          Create Plan
        </Button>
      </div>

      {/* Search + View Toggle */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search plans..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none"
          />
        </div>
        <div className="flex rounded-lg border border-gray-300 overflow-hidden">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2.5 cursor-pointer ${viewMode === 'grid' ? 'bg-primary-50 text-primary-600' : 'text-gray-400 hover:bg-gray-50'}`}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2.5 cursor-pointer ${viewMode === 'list' ? 'bg-primary-50 text-primary-600' : 'text-gray-400 hover:bg-gray-50'}`}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Plans Grid/List */}
      {loading ? (
        <LoadingSpinner text="Loading workout plans..." />
      ) : filteredPlans.length === 0 ? (
        <EmptyState
          icon={Dumbbell}
          title="No workout plans"
          description="Create your first workout plan template."
          actionLabel="Create Plan"
          onAction={openAddModal}
        />
      ) : (
        <div
          className={
            viewMode === 'grid'
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
              : 'space-y-3'
          }
        >
          {filteredPlans.map((plan) => (
            <Card key={plan.plan_id || plan._id} className="flex flex-col">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-semibold text-gray-900 truncate">
                    {plan.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge color="indigo" size="sm">{plan.type || 'General'}</Badge>
                    <Badge color="blue" size="sm">{plan.difficulty || 'N/A'}</Badge>
                  </div>
                </div>
                <div className="flex gap-1 flex-shrink-0 ml-2">
                  <button
                    onClick={() => openAssignModal(plan)}
                    className="p-1.5 rounded-md text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer"
                    title="Assign to member"
                  >
                    <UserPlus className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => openEditModal(plan)}
                    className="p-1.5 rounded-md text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors cursor-pointer"
                    title="Edit"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(plan)}
                    className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {plan.description && (
                <p className="text-sm text-gray-500 mb-3 line-clamp-2">
                  {plan.description}
                </p>
              )}

              {plan.goals?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {plan.goals.map((g) => (
                    <Badge key={g} color="green" size="sm">{g}</Badge>
                  ))}
                </div>
              )}

              <div className="mt-auto pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-400">
                  {plan.schedule?.filter((d) => d.exercises?.length > 0).length || 0} active
                  day{plan.schedule?.filter((d) => d.exercises?.length > 0).length !== 1 ? 's' : ''} &middot;{' '}
                  {plan.schedule?.reduce((sum, d) => sum + (d.exercises?.length || 0), 0) || 0} exercises
                </p>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Plan Modal (slide-over, large) */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingPlan ? 'Edit Workout Plan' : 'Create Workout Plan'}
        description="Build a 7-day workout schedule"
        size="lg"
        footer={
          <Modal.Footer
            onCancel={() => setModalOpen(false)}
            onConfirm={handleSubmit(onSavePlan)}
            confirmText={editingPlan ? 'Update' : 'Create'}
            loading={saving}
          />
        }
      >
        <form onSubmit={handleSubmit(onSavePlan)} className="space-y-5">
          {/* Basic Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Plan Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Push Pull Legs"
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none"
                {...register('name', { required: 'Name is required' })}
              />
              {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none cursor-pointer"
                {...register('type')}
              >
                {PLAN_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty</label>
              <select
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none cursor-pointer"
                {...register('difficulty')}
              >
                {DIFFICULTIES.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              rows={2}
              placeholder="Plan description..."
              className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none resize-none"
              {...register('description')}
            />
          </div>

          {/* Goal Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Goals</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={goalInput}
                onChange={(e) => setGoalInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); addGoal(); }
                }}
                placeholder="e.g. Muscle Gain"
                className="flex-1 rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none"
              />
              <Button type="button" variant="secondary" size="sm" onClick={addGoal}>
                Add
              </Button>
            </div>
            {goals.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {goals.map((g) => (
                  <span
                    key={g}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-700 text-xs rounded-full"
                  >
                    {g}
                    <button
                      type="button"
                      onClick={() => setGoals(goals.filter((x) => x !== g))}
                      className="hover:text-red-500 cursor-pointer"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* 7-Day Schedule Builder */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Weekly Schedule
            </label>
            <div className="space-y-2">
              {DAYS.map((day) => (
                <div key={day} className="border border-gray-200 rounded-lg overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setExpandedDay(expandedDay === day ? '' : day)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-700">{day}</span>
                      <Badge color="gray" size="sm">
                        {schedule[day].length} exercise{schedule[day].length !== 1 ? 's' : ''}
                      </Badge>
                    </div>
                    {expandedDay === day ? (
                      <ChevronUp className="h-4 w-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-gray-400" />
                    )}
                  </button>

                  {expandedDay === day && (
                    <div className="p-4 space-y-3">
                      {schedule[day].map((ex, idx) => (
                        <div
                          key={idx}
                          className="grid grid-cols-6 gap-2 items-end p-3 bg-gray-50 rounded-lg relative"
                        >
                          <div className="col-span-6 sm:col-span-2">
                            <label className="block text-xs text-gray-500 mb-0.5">Exercise</label>
                            <input
                              type="text"
                              value={ex.name}
                              onChange={(e) => updateExercise(day, idx, 'name', e.target.value)}
                              placeholder="Exercise name"
                              className="w-full rounded border border-gray-300 px-2.5 py-1.5 text-sm focus:border-primary-500 focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-0.5">Sets</label>
                            <input
                              type="number"
                              value={ex.sets}
                              onChange={(e) => updateExercise(day, idx, 'sets', e.target.value)}
                              placeholder="3"
                              className="w-full rounded border border-gray-300 px-2.5 py-1.5 text-sm focus:border-primary-500 focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-0.5">Reps</label>
                            <input
                              type="text"
                              value={ex.reps}
                              onChange={(e) => updateExercise(day, idx, 'reps', e.target.value)}
                              placeholder="12"
                              className="w-full rounded border border-gray-300 px-2.5 py-1.5 text-sm focus:border-primary-500 focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-0.5">Duration</label>
                            <input
                              type="text"
                              value={ex.duration}
                              onChange={(e) => updateExercise(day, idx, 'duration', e.target.value)}
                              placeholder="30s"
                              className="w-full rounded border border-gray-300 px-2.5 py-1.5 text-sm focus:border-primary-500 focus:outline-none"
                            />
                          </div>
                          <div className="flex items-end gap-1">
                            <div className="flex-1">
                              <label className="block text-xs text-gray-500 mb-0.5">Rest</label>
                              <input
                                type="text"
                                value={ex.rest}
                                onChange={(e) => updateExercise(day, idx, 'rest', e.target.value)}
                                placeholder="60s"
                                className="w-full rounded border border-gray-300 px-2.5 py-1.5 text-sm focus:border-primary-500 focus:outline-none"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => removeExercise(day, idx)}
                              className="p-1.5 text-gray-400 hover:text-red-500 cursor-pointer"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                          <div className="col-span-6">
                            <label className="block text-xs text-gray-500 mb-0.5">Notes</label>
                            <input
                              type="text"
                              value={ex.notes}
                              onChange={(e) => updateExercise(day, idx, 'notes', e.target.value)}
                              placeholder="Optional notes..."
                              className="w-full rounded border border-gray-300 px-2.5 py-1.5 text-sm focus:border-primary-500 focus:outline-none"
                            />
                          </div>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        icon={Plus}
                        onClick={() => addExercise(day)}
                      >
                        Add Exercise
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </form>
      </Modal>

      {/* Assign Modal */}
      <Modal
        open={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        title="Assign Plan to Member"
        description={`Assign "${assignPlan?.name}" to a member`}
        footer={
          <Modal.Footer
            onCancel={() => setAssignModalOpen(false)}
            onConfirm={handleAssign}
            confirmText="Assign"
            loading={assigning}
          />
        }
      >
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search members..."
              value={memberSearch}
              onChange={(e) => {
                setMemberSearch(e.target.value);
                fetchMembers();
              }}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none"
            />
          </div>
          <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
            {members.length === 0 ? (
              <p className="text-sm text-gray-400 py-8 text-center">No members found</p>
            ) : (
              members.map((m) => {
                const mId = m.member_id || m._id;
                return (
                <label
                  key={mId}
                  className={`flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer ${
                    selectedMember === mId ? 'bg-primary-50' : ''
                  }`}
                >
                  <input
                    type="radio"
                    name="assignMember"
                    value={mId}
                    checked={selectedMember === mId}
                    onChange={() => setSelectedMember(mId)}
                    className="h-4 w-4 text-primary-500 cursor-pointer"
                  />
                  <div className="h-8 w-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                    {(m.full_name || '?')[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{m.full_name}</p>
                    <p className="text-xs text-gray-400 truncate">{m.phone || m.email}</p>
                  </div>
                </label>
                );
              })
            )}
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Workout Plan"
        description={`Are you sure you want to delete "${deleteTarget?.name}"?`}
        confirmText="Delete"
        loading={deleting}
      />
    </div>
  );
}
