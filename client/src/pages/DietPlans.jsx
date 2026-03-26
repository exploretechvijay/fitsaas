import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import {
  Utensils,
  Sparkles,
  Plus,
  Trash2,
  Search,
  Edit2,
  Save,
  Eye,
  Printer,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { dietApi, membersApi } from '../api/endpoints';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import EmptyState from '../components/ui/EmptyState';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { formatDate, timeAgo } from '../utils/formatters';

const TABS = ['AI Generate', 'Manual Create', 'View Plans'];
const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MANUAL_MEAL_KEYS = ['breakfast', 'morning_snack', 'lunch', 'afternoon_snack', 'pre_workout', 'post_workout', 'dinner'];
const MANUAL_MEAL_LABELS = { breakfast: 'Breakfast', morning_snack: 'Morning Snack', lunch: 'Lunch', afternoon_snack: 'Afternoon Snack', pre_workout: 'Pre-Workout', post_workout: 'Post-Workout', dinner: 'Dinner' };

function emptyDayMeals() {
  const meals = {};
  MANUAL_MEAL_KEYS.forEach(k => { meals[k] = { name: '', items: '', calories: '', protein_g: '', carbs_g: '', fat_g: '' }; });
  return meals;
}

function emptyWeek() {
  return DAY_NAMES.map((name, i) => ({ day: i + 1, day_name: name, meals: emptyDayMeals() }));
}

export default function DietPlans() {
  const [activeTab, setActiveTab] = useState('AI Generate');

  // Members
  const [members, setMembers] = useState([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [selectedMember, setSelectedMember] = useState('');

  // AI Generate
  const [generating, setGenerating] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState(null);
  const [savingGenerated, setSavingGenerated] = useState(false);
  const [selectedDayIdx, setSelectedDayIdx] = useState(0);

  // Manual Create
  const [manualDays, setManualDays] = useState(emptyWeek);
  const [manualDayIdx, setManualDayIdx] = useState(0);
  const [manualNotes, setManualNotes] = useState('');
  const [savingManual, setSavingManual] = useState(false);

  // View Plans
  const [viewMember, setViewMember] = useState('');
  const [dietPlans, setDietPlans] = useState([]);
  const [plansLoading, setPlansLoading] = useState(false);
  const [viewPlan, setViewPlan] = useState(null);
  const [viewDayIdx, setViewDayIdx] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [editDayIdx, setEditDayIdx] = useState(0);
  const [editDays, setEditDays] = useState([]);
  const [editNotes, setEditNotes] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const {
    register: registerGen,
    handleSubmit: handleGenSubmit,
    formState: { errors: genErrors },
  } = useForm();

  const {
    register: registerManual,
    handleSubmit: handleManualSubmit,
    reset: resetManual,
    formState: { errors: manualErrors },
  } = useForm();

  // Fetch members
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
    fetchMembers();
  }, [fetchMembers]);

  // Get selected member object
  const selectedMemberObj = members.find(m => m.member_id === selectedMember);

  // AI Generate
  const onGenerate = async (values) => {
    if (!selectedMember) {
      toast.error('Please select a member');
      return;
    }
    const member = selectedMemberObj;
    if (!member) {
      toast.error('Member not found');
      return;
    }
    // Calculate age from dob
    let age = Number(values.age);
    if (!age && member.dob) {
      const birthDate = new Date(member.dob);
      age = Math.floor((Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    }
    if (!age) age = 25; // fallback

    setGenerating(true);
    setGeneratedPlan(null);
    setSelectedDayIdx(0);
    try {
      const res = await dietApi.generate({
        member_id: selectedMember,
        goal: values.goal || member.goal || 'general_fitness',
        dietary_pref: values.dietary_pref || member.dietary_pref || 'non_veg',
        weight: Number(values.weight) || member.weight || 70,
        height: Number(values.height) || member.height || 170,
        age,
      });
      setGeneratedPlan(res.data.data);
      toast.success('Diet plan generated!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate');
    } finally {
      setGenerating(false);
    }
  };

  const saveGeneratedPlan = async () => {
    if (!generatedPlan) return;
    setSavingGenerated(true);
    try {
      await dietApi.save({
        member_id: selectedMember,
        source: 'ai',
        week_data: generatedPlan,
      });
      toast.success('Diet plan saved!');
      setGeneratedPlan(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally {
      setSavingGenerated(false);
    }
  };

  // PDF Export
  const exportPlanPDF = () => {
    if (!generatedPlan) return;
    const member = selectedMemberObj;
    const w = window.open('', '_blank');
    const days = generatedPlan.days || [];
    const mealLabels = {
      breakfast: 'Breakfast', morning_snack: 'Morning Snack', lunch: 'Lunch',
      afternoon_snack: 'Afternoon Snack', pre_workout: 'Pre-Workout',
      post_workout: 'Post-Workout', dinner: 'Dinner',
    };
    const mealColors = {
      breakfast: '#f59e0b', morning_snack: '#f97316', lunch: '#22c55e',
      afternoon_snack: '#14b8a6', pre_workout: '#3b82f6',
      post_workout: '#6366f1', dinner: '#8b5cf6',
    };

    let html = `<!DOCTYPE html><html><head><title>Diet Plan - ${member?.full_name || 'Member'}</title>
    <style>
      * { margin:0; padding:0; box-sizing:border-box; }
      body { font-family: 'Segoe UI', sans-serif; color: #1f2937; padding: 30px; font-size: 13px; }
      .header { text-align:center; margin-bottom:30px; border-bottom:3px solid #6366f1; padding-bottom:20px; }
      .header h1 { font-size:24px; color:#6366f1; margin-bottom:5px; }
      .header p { color:#6b7280; font-size:13px; }
      .member-info { display:flex; gap:20px; justify-content:center; margin:10px 0; flex-wrap:wrap; }
      .member-info span { background:#f3f4f6; padding:4px 12px; border-radius:20px; font-size:12px; }
      .day-section { page-break-inside:avoid; margin-bottom:25px; }
      .day-title { font-size:16px; font-weight:700; color:#1f2937; padding:8px 16px; background:#f8fafc; border-left:4px solid #6366f1; margin-bottom:12px; }
      .totals { display:flex; gap:15px; margin-bottom:12px; }
      .totals div { flex:1; text-align:center; padding:8px; border-radius:8px; background:#f8fafc; border:1px solid #e5e7eb; }
      .totals .val { font-size:18px; font-weight:700; }
      .totals .lbl { font-size:10px; color:#6b7280; text-transform:uppercase; margin-top:2px; }
      .meals-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
      .meal-card { border:1px solid #e5e7eb; border-radius:10px; padding:12px; }
      .meal-card .meal-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; }
      .meal-card .meal-type { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; }
      .meal-card .meal-name { font-size:13px; font-weight:600; margin-bottom:6px; }
      .meal-card ul { padding-left:16px; margin-bottom:6px; }
      .meal-card li { font-size:11px; color:#4b5563; margin-bottom:2px; }
      .meal-card .macros { font-size:10px; color:#6b7280; display:flex; gap:10px; }
      .meal-card .kcal { font-size:12px; font-weight:600; }
      .notes { margin-top:20px; padding:15px; background:#eff6ff; border-radius:10px; border:1px solid #bfdbfe; font-size:12px; color:#1e40af; }
      .footer { text-align:center; margin-top:30px; font-size:11px; color:#9ca3af; border-top:1px solid #e5e7eb; padding-top:15px; }
      @media print { body { padding:15px; } .day-section { page-break-inside:avoid; } }
    </style></head><body>
    <div class="header">
      <h1>7-Day Diet Plan</h1>
      <p>Prepared for <strong>${member?.full_name || 'Member'}</strong></p>
      <div class="member-info">
        ${member?.weight ? '<span>Weight: '+member.weight+' kg</span>' : ''}
        ${member?.height ? '<span>Height: '+member.height+' cm</span>' : ''}
        ${member?.goal ? '<span>Goal: '+member.goal.replace(/_/g,' ')+'</span>' : ''}
        ${member?.dietary_pref ? '<span>Diet: '+member.dietary_pref.replace(/_/g,' ')+'</span>' : ''}
      </div>
    </div>`;

    for (const day of days) {
      html += `<div class="day-section">
        <div class="day-title">${day.day_name || 'Day '+day.day}</div>`;
      if (day.daily_totals) {
        html += `<div class="totals">
          <div><div class="val">${day.daily_totals.calories}</div><div class="lbl">Calories</div></div>
          <div><div class="val" style="color:#3b82f6">${day.daily_totals.protein_g}g</div><div class="lbl">Protein</div></div>
          <div><div class="val" style="color:#f59e0b">${day.daily_totals.carbs_g}g</div><div class="lbl">Carbs</div></div>
          <div><div class="val" style="color:#ef4444">${day.daily_totals.fat_g}g</div><div class="lbl">Fat</div></div>
        </div>`;
      }
      html += '<div class="meals-grid">';
      for (const [key, meal] of Object.entries(day.meals || {})) {
        const color = mealColors[key] || '#6b7280';
        html += `<div class="meal-card" style="border-left:3px solid ${color}">
          <div class="meal-header">
            <span class="meal-type" style="color:${color}">${mealLabels[key] || key.replace(/_/g,' ')}</span>
            <span class="kcal">${meal.calories} kcal</span>
          </div>
          <div class="meal-name">${meal.name}</div>
          <ul>${(meal.items||[]).map(i=>'<li>'+i+'</li>').join('')}</ul>
          <div class="macros"><span>Protein: ${meal.protein_g}g</span><span>Carbs: ${meal.carbs_g}g</span><span>Fat: ${meal.fat_g}g</span></div>
        </div>`;
      }
      html += '</div></div>';
    }

    if (generatedPlan.notes) {
      html += `<div class="notes"><strong>Note:</strong> ${generatedPlan.notes}</div>`;
    }
    html += `<div class="footer">Generated by FitSaaS &bull; ${new Date().toLocaleDateString()}</div></body></html>`;

    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 500);
  };

  // Manual Create
  const updateManualMeal = (dayIdx, mealKey, field, value) => {
    setManualDays(prev => {
      const updated = [...prev];
      updated[dayIdx] = {
        ...updated[dayIdx],
        meals: {
          ...updated[dayIdx].meals,
          [mealKey]: { ...updated[dayIdx].meals[mealKey], [field]: value },
        },
      };
      return updated;
    });
  };

  const copyDayToAll = (sourceDayIdx) => {
    setManualDays(prev => {
      const source = prev[sourceDayIdx].meals;
      return prev.map((day, i) => i === sourceDayIdx ? day : { ...day, meals: JSON.parse(JSON.stringify(source)) });
    });
    toast.success('Copied to all days');
  };

  const onSaveManual = async () => {
    if (!selectedMember) {
      toast.error('Please select a member');
      return;
    }
    // Build week_data in same format as AI
    const weekData = {
      days: manualDays.map(day => {
        const meals = {};
        Object.entries(day.meals).forEach(([key, meal]) => {
          if (meal.name || meal.items) {
            meals[key] = {
              name: meal.name || MANUAL_MEAL_LABELS[key],
              items: meal.items ? meal.items.split(',').map(i => i.trim()).filter(Boolean) : [],
              calories: Number(meal.calories) || 0,
              protein_g: Number(meal.protein_g) || 0,
              carbs_g: Number(meal.carbs_g) || 0,
              fat_g: Number(meal.fat_g) || 0,
            };
          }
        });
        const filled = Object.values(meals);
        return {
          day: day.day,
          day_name: day.day_name,
          meals,
          daily_totals: {
            calories: filled.reduce((s, m) => s + (m.calories || 0), 0),
            protein_g: filled.reduce((s, m) => s + (m.protein_g || 0), 0),
            carbs_g: filled.reduce((s, m) => s + (m.carbs_g || 0), 0),
            fat_g: filled.reduce((s, m) => s + (m.fat_g || 0), 0),
          },
        };
      }),
      notes: manualNotes || '',
    };

    setSavingManual(true);
    try {
      await dietApi.save({
        member_id: selectedMember,
        source: 'manual',
        week_data: weekData,
      });
      toast.success('Diet plan saved!');
      setManualDays(emptyWeek());
      setManualNotes('');
      setManualDayIdx(0);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally {
      setSavingManual(false);
    }
  };

  // View Plans
  const fetchMemberPlans = useCallback(async () => {
    if (!viewMember) return;
    setPlansLoading(true);
    try {
      const res = await dietApi.getMemberPlans(viewMember);
      setDietPlans(res.data.data || []);
    } catch {
      toast.error('Failed to load diet plans');
    } finally {
      setPlansLoading(false);
    }
  }, [viewMember]);

  useEffect(() => {
    if (activeTab === 'View Plans' && viewMember) {
      fetchMemberPlans();
    }
  }, [activeTab, fetchMemberPlans, viewMember]);

  const handleDeletePlan = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await dietApi.delete(deleteTarget.diet_id || deleteTarget._id);
      toast.success('Plan deleted');
      setDeleteTarget(null);
      fetchMemberPlans();
    } catch {
      // handled
    } finally {
      setDeleting(false);
    }
  };

  // Edit diet plan
  const openEditPlan = (plan) => {
    let weekData = plan.week_data || plan.weekData || {};
    if (typeof weekData === 'string') { try { weekData = JSON.parse(weekData); } catch { weekData = {}; } }
    const days = weekData.days || [];

    // Convert days to editable format (items array -> comma string)
    const editableDays = DAY_NAMES.map((name, i) => {
      const sourceDay = days.find(d => d.day === i + 1 || d.day_name === name) || {};
      const meals = {};
      MANUAL_MEAL_KEYS.forEach(k => {
        const src = sourceDay.meals?.[k];
        meals[k] = {
          name: src?.name || '',
          items: Array.isArray(src?.items) ? src.items.join(', ') : (src?.items || ''),
          calories: src?.calories || '',
          protein_g: src?.protein_g || '',
          carbs_g: src?.carbs_g || '',
          fat_g: src?.fat_g || '',
        };
      });
      return { day: i + 1, day_name: name, meals };
    });

    setEditingPlan(plan);
    setEditDays(editableDays);
    setEditNotes(weekData.notes || '');
    setEditDayIdx(0);
  };

  const updateEditMeal = (dayIdx, mealKey, field, value) => {
    setEditDays(prev => {
      const updated = [...prev];
      updated[dayIdx] = {
        ...updated[dayIdx],
        meals: {
          ...updated[dayIdx].meals,
          [mealKey]: { ...updated[dayIdx].meals[mealKey], [field]: value },
        },
      };
      return updated;
    });
  };

  const onSaveEdit = async () => {
    setSavingEdit(true);
    try {
      const weekData = {
        days: editDays.map(day => {
          const meals = {};
          Object.entries(day.meals).forEach(([key, meal]) => {
            if (meal.name || meal.items) {
              meals[key] = {
                name: meal.name || MANUAL_MEAL_LABELS[key],
                items: meal.items ? meal.items.split(',').map(i => i.trim()).filter(Boolean) : [],
                calories: Number(meal.calories) || 0,
                protein_g: Number(meal.protein_g) || 0,
                carbs_g: Number(meal.carbs_g) || 0,
                fat_g: Number(meal.fat_g) || 0,
              };
            }
          });
          const filled = Object.values(meals);
          return {
            day: day.day, day_name: day.day_name, meals,
            daily_totals: {
              calories: filled.reduce((s, m) => s + (m.calories || 0), 0),
              protein_g: filled.reduce((s, m) => s + (m.protein_g || 0), 0),
              carbs_g: filled.reduce((s, m) => s + (m.carbs_g || 0), 0),
              fat_g: filled.reduce((s, m) => s + (m.fat_g || 0), 0),
            },
          };
        }),
        notes: editNotes,
      };
      await dietApi.update(editingPlan.diet_id, { week_data: weekData });
      toast.success('Diet plan updated!');
      setEditingPlan(null);
      fetchMemberPlans();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update');
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Diet Plans</h1>
        <p className="text-sm text-gray-500 mt-1">
          Generate AI-powered or create custom diet plans
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-6">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
                activeTab === tab
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* Member Selector (shared for AI Generate and Manual Create) */}
      {(activeTab === 'AI Generate' || activeTab === 'Manual Create') && (
        <Card>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Member
          </label>
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search members..."
              value={memberSearch}
              onChange={(e) => setMemberSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none"
            />
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            {members.slice(0, 20).map((m) => {
              const mId = m.member_id || m._id;
              return (
              <button
                key={mId}
                onClick={() => setSelectedMember(mId)}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm border transition-colors cursor-pointer ${
                  selectedMember === mId
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <div className="h-5 w-5 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-[10px] font-bold">
                  {(m.full_name || '?')[0].toUpperCase()}
                </div>
                {m.full_name}
              </button>
              );
            })}
          </div>
        </Card>
      )}

      {/* AI Generate Tab */}
      {activeTab === 'AI Generate' && (
        <div className="space-y-6">
          <Card>
            <Card.Header>
              <Card.Title>
                <span className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-amber-500" />
                  AI Diet Plan Generator
                </span>
              </Card.Title>
            </Card.Header>
            <form onSubmit={handleGenSubmit(onGenerate)} className="space-y-4">
              {/* Auto-filled info from selected member */}
              {selectedMemberObj && (
                <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600">
                  <span className="font-medium text-gray-900">{selectedMemberObj.full_name}</span>
                  {' — '}
                  {selectedMemberObj.weight && `${selectedMemberObj.weight}kg`}
                  {selectedMemberObj.height && `, ${selectedMemberObj.height}cm`}
                  {selectedMemberObj.goal && `, Goal: ${selectedMemberObj.goal.replace('_',' ')}`}
                  {selectedMemberObj.dietary_pref && `, ${selectedMemberObj.dietary_pref.replace('_',' ')}`}
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Goal</label>
                  <select
                    className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none cursor-pointer"
                    {...registerGen('goal')}
                    defaultValue={selectedMemberObj?.goal || 'weight_loss'}
                  >
                    <option value="weight_loss">Weight Loss</option>
                    <option value="muscle_gain">Muscle Gain</option>
                    <option value="endurance">Endurance</option>
                    <option value="flexibility">Flexibility</option>
                    <option value="general_fitness">General Fitness</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Dietary Preference</label>
                  <select
                    className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none cursor-pointer"
                    {...registerGen('dietary_pref')}
                    defaultValue={selectedMemberObj?.dietary_pref || 'non_veg'}
                  >
                    <option value="veg">Vegetarian</option>
                    <option value="non_veg">Non-Vegetarian</option>
                    <option value="vegan">Vegan</option>
                    <option value="eggetarian">Eggetarian</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Weight (kg)</label>
                  <input type="number" step="0.1" placeholder="e.g. 70"
                    className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none"
                    defaultValue={selectedMemberObj?.weight || ''}
                    {...registerGen('weight')} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Height (cm)</label>
                  <input type="number" step="0.1" placeholder="e.g. 170"
                    className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none"
                    defaultValue={selectedMemberObj?.height || ''}
                    {...registerGen('height')} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
                  <input type="number" placeholder="e.g. 25"
                    className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none"
                    {...registerGen('age')} />
                </div>
              </div>
              <Button type="submit" icon={Sparkles} loading={generating}>
                Generate Plan
              </Button>
            </form>
          </Card>

          {/* Generated Plan Preview */}
          {generatedPlan && (
            <div className="space-y-4">
              {/* Header with Save/Discard */}
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">Generated Diet Plan</h2>
                <div className="flex gap-3">
                  <Button icon={Save} onClick={saveGeneratedPlan} loading={savingGenerated}>
                    Save Plan
                  </Button>
                  <Button variant="secondary" icon={Printer} onClick={exportPlanPDF}>
                    Print / PDF
                  </Button>
                  <Button variant="ghost" onClick={() => setGeneratedPlan(null)}>
                    Discard
                  </Button>
                </div>
              </div>

              {/* Notes */}
              {generatedPlan.notes && (
                <div className="rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 px-4 py-3">
                  <p className="text-xs font-semibold text-blue-700 mb-1">Nutritionist Note</p>
                  <p className="text-sm text-blue-800 leading-relaxed">{generatedPlan.notes}</p>
                </div>
              )}

              {/* Day tabs */}
              {(() => {
                const days = generatedPlan.days || [];
                const [activeDay, setActiveDay] = [selectedDayIdx, setSelectedDayIdx];
                const currentDay = days[activeDay] || days[0];
                if (!currentDay) return <p className="text-sm text-gray-400">No meal data available</p>;

                return (
                  <>
                    {/* Day selector */}
                    <div className="flex gap-2 overflow-x-auto pb-2">
                      {days.map((day, idx) => (
                        <button
                          key={idx}
                          onClick={() => setSelectedDayIdx(idx)}
                          className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                            activeDay === idx
                              ? 'bg-primary-500 text-white shadow-sm'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {day.day_name || `Day ${day.day}`}
                        </button>
                      ))}
                    </div>

                    {/* Daily totals bar */}
                    {currentDay.daily_totals && (
                      <div className="grid grid-cols-4 gap-3">
                        <div className="bg-white border border-gray-200 rounded-lg p-3 text-center">
                          <p className="text-xl font-bold text-gray-900">{currentDay.daily_totals.calories}</p>
                          <p className="text-xs text-gray-500 mt-0.5">Calories</p>
                        </div>
                        <div className="bg-white border border-gray-200 rounded-lg p-3 text-center">
                          <p className="text-xl font-bold text-blue-600">{currentDay.daily_totals.protein_g}g</p>
                          <p className="text-xs text-gray-500 mt-0.5">Protein</p>
                        </div>
                        <div className="bg-white border border-gray-200 rounded-lg p-3 text-center">
                          <p className="text-xl font-bold text-amber-600">{currentDay.daily_totals.carbs_g}g</p>
                          <p className="text-xs text-gray-500 mt-0.5">Carbs</p>
                        </div>
                        <div className="bg-white border border-gray-200 rounded-lg p-3 text-center">
                          <p className="text-xl font-bold text-red-500">{currentDay.daily_totals.fat_g}g</p>
                          <p className="text-xs text-gray-500 mt-0.5">Fat</p>
                        </div>
                      </div>
                    )}

                    {/* Meal timeline */}
                    <MealTimeline meals={currentDay.meals} />
                  </>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* Manual Create Tab */}
      {activeTab === 'Manual Create' && (
        <div className="space-y-4">
          <Card>
            <Card.Header>
              <Card.Title>Create Diet Plan Manually</Card.Title>
            </Card.Header>

            {/* Day tabs */}
            <div className="flex gap-1.5 overflow-x-auto pb-3 mb-4">
              {manualDays.map((day, idx) => (
                <button key={idx} onClick={() => setManualDayIdx(idx)}
                  className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                    manualDayIdx === idx ? 'bg-primary-500 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}>
                  {day.day_name}
                </button>
              ))}
            </div>

            {/* Copy day helper */}
            <div className="flex justify-end mb-3">
              <Button type="button" variant="ghost" size="sm" onClick={() => copyDayToAll(manualDayIdx)}>
                Copy {manualDays[manualDayIdx].day_name} to all days
              </Button>
            </div>

            {/* Meals for selected day */}
            <div className="space-y-3">
              {MANUAL_MEAL_KEYS.map(mealKey => {
                const meal = manualDays[manualDayIdx].meals[mealKey];
                const mealMeta = MEAL_ORDER.find(m => m.key === mealKey);
                return (
                  <div key={mealKey} className={`rounded-xl border p-4 ${mealMeta?.bg || 'bg-gray-50'} ${mealMeta?.color || 'border-gray-300'} border-l-4`}>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-base">{mealMeta?.icon || '🍽️'}</span>
                      <span className="text-sm font-bold text-gray-700">{MANUAL_MEAL_LABELS[mealKey]}</span>
                    </div>
                    <div className="space-y-2">
                      <input type="text" value={meal.name} onChange={e => updateManualMeal(manualDayIdx, mealKey, 'name', e.target.value)}
                        placeholder={`e.g. ${MANUAL_MEAL_LABELS[mealKey]} name`}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none bg-white" />
                      <input type="text" value={meal.items} onChange={e => updateManualMeal(manualDayIdx, mealKey, 'items', e.target.value)}
                        placeholder="Food items (comma separated) e.g. Roti - 2, Dal - 1 katori, Sabzi - 1 katori"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none bg-white" />
                      <div className="grid grid-cols-4 gap-2">
                        <div>
                          <label className="block text-[10px] text-gray-500 mb-0.5 uppercase">Calories</label>
                          <input type="number" value={meal.calories} onChange={e => updateManualMeal(manualDayIdx, mealKey, 'calories', e.target.value)}
                            placeholder="0" className="w-full rounded border border-gray-300 px-2.5 py-1.5 text-sm focus:border-primary-500 focus:outline-none bg-white" />
                        </div>
                        <div>
                          <label className="block text-[10px] text-gray-500 mb-0.5 uppercase">Protein (g)</label>
                          <input type="number" value={meal.protein_g} onChange={e => updateManualMeal(manualDayIdx, mealKey, 'protein_g', e.target.value)}
                            placeholder="0" className="w-full rounded border border-gray-300 px-2.5 py-1.5 text-sm focus:border-primary-500 focus:outline-none bg-white" />
                        </div>
                        <div>
                          <label className="block text-[10px] text-gray-500 mb-0.5 uppercase">Carbs (g)</label>
                          <input type="number" value={meal.carbs_g} onChange={e => updateManualMeal(manualDayIdx, mealKey, 'carbs_g', e.target.value)}
                            placeholder="0" className="w-full rounded border border-gray-300 px-2.5 py-1.5 text-sm focus:border-primary-500 focus:outline-none bg-white" />
                        </div>
                        <div>
                          <label className="block text-[10px] text-gray-500 mb-0.5 uppercase">Fat (g)</label>
                          <input type="number" value={meal.fat_g} onChange={e => updateManualMeal(manualDayIdx, mealKey, 'fat_g', e.target.value)}
                            placeholder="0" className="w-full rounded border border-gray-300 px-2.5 py-1.5 text-sm focus:border-primary-500 focus:outline-none bg-white" />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Notes */}
          <Card>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes / Instructions</label>
            <textarea rows={3} value={manualNotes} onChange={e => setManualNotes(e.target.value)}
              placeholder="Any special instructions, allergies, or notes..."
              className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-primary-500 focus:outline-none resize-none" />
          </Card>

          {/* Save */}
          <div className="flex gap-3">
            <Button icon={Save} onClick={onSaveManual} loading={savingManual}>Save Diet Plan</Button>
            <Button variant="secondary" onClick={() => { setManualDays(emptyWeek()); setManualNotes(''); setManualDayIdx(0); }}>Reset</Button>
          </div>
        </div>
      )}

      {/* View Plans Tab */}
      {activeTab === 'View Plans' && (
        <div className="space-y-4">
          <Card>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Member to View Plans
            </label>
            <select
              value={viewMember}
              onChange={(e) => setViewMember(e.target.value)}
              className="w-full max-w-md rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none cursor-pointer"
            >
              <option value="">Select member...</option>
              {members.map((m) => (
                <option key={m.member_id || m._id} value={m.member_id || m._id}>{m.full_name}</option>
              ))}
            </select>
          </Card>

          {viewMember && (
            <>
              {plansLoading ? (
                <LoadingSpinner text="Loading diet plans..." />
              ) : dietPlans.length === 0 ? (
                <EmptyState
                  icon={Utensils}
                  title="No diet plans"
                  description="This member has no diet plans yet."
                />
              ) : (
                <div className="space-y-4">
                  {dietPlans.map((plan) => (
                    <Card key={plan.diet_id || plan._id}>
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="text-base font-semibold text-gray-900">
                            {plan.name || 'Diet Plan'}
                          </h3>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {(plan.total_calories || plan.totalCalories) ? `${plan.total_calories || plan.totalCalories} kcal/day` : ''} &middot;{' '}
                            Created {timeAgo(plan.created_at || plan.createdAt)}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <button onClick={() => setViewPlan(plan)} title="View"
                            className="p-1.5 rounded-md text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors cursor-pointer">
                            <Eye className="h-4 w-4" />
                          </button>
                          <button onClick={() => openEditPlan(plan)} title="Edit"
                            className="p-1.5 rounded-md text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors cursor-pointer">
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button onClick={() => setDeleteTarget(plan)} title="Delete"
                            className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      {plan.description && (
                        <p className="text-sm text-gray-500">{plan.description}</p>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* View Plan Detail Modal */}
      <Modal
        open={!!viewPlan}
        onClose={() => { setViewPlan(null); setViewDayIdx(0); }}
        title="Diet Plan"
        size="lg"
      >
        {viewPlan && (() => {
          let weekData = viewPlan.week_data || viewPlan.weekData || viewPlan;
          if (typeof weekData === 'string') { try { weekData = JSON.parse(weekData); } catch { weekData = {}; } }
          const days = weekData.days || [];
          if (days.length === 0) return <p className="text-sm text-gray-400 py-8 text-center">No meal data available</p>;

          const currentDay = days[viewDayIdx] || days[0];

          return (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Badge color="blue" size="sm">{viewPlan.source === 'ai' ? 'AI Generated' : 'Manual'}</Badge>
                <span>{formatDate(viewPlan.created_at)}</span>
              </div>

              {/* Day tabs */}
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {days.map((day, idx) => (
                  <button key={idx} onClick={() => setViewDayIdx(idx)}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                      viewDayIdx === idx ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}>
                    {day.day_name?.substring(0, 3) || `D${day.day}`}
                  </button>
                ))}
              </div>

              {/* Daily totals */}
              {currentDay.daily_totals && (
                <div className="grid grid-cols-4 gap-2">
                  <div className="text-center p-2 bg-gray-50 rounded-lg">
                    <p className="text-base font-bold text-gray-900">{currentDay.daily_totals.calories}</p>
                    <p className="text-[10px] text-gray-500">CALORIES</p>
                  </div>
                  <div className="text-center p-2 bg-blue-50 rounded-lg">
                    <p className="text-base font-bold text-blue-600">{currentDay.daily_totals.protein_g}g</p>
                    <p className="text-[10px] text-gray-500">PROTEIN</p>
                  </div>
                  <div className="text-center p-2 bg-amber-50 rounded-lg">
                    <p className="text-base font-bold text-amber-600">{currentDay.daily_totals.carbs_g}g</p>
                    <p className="text-[10px] text-gray-500">CARBS</p>
                  </div>
                  <div className="text-center p-2 bg-red-50 rounded-lg">
                    <p className="text-base font-bold text-red-500">{currentDay.daily_totals.fat_g}g</p>
                    <p className="text-[10px] text-gray-500">FAT</p>
                  </div>
                </div>
              )}

              {/* Meals timeline - ordered */}
              <MealTimeline meals={currentDay.meals} />

              {weekData.notes && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs font-semibold text-blue-700 mb-1">Note</p>
                  <p className="text-xs text-blue-800">{weekData.notes}</p>
                </div>
              )}
            </div>
          );
        })()}
      </Modal>

      {/* Edit Diet Plan Modal */}
      <Modal open={!!editingPlan} onClose={() => setEditingPlan(null)} title="Edit Diet Plan" size="lg"
        footer={<Modal.Footer onCancel={() => setEditingPlan(null)} onConfirm={onSaveEdit} confirmText="Save Changes" loading={savingEdit} />}>
        {editingPlan && (
          <div className="space-y-4">
            {/* Day tabs */}
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {editDays.map((day, idx) => (
                <button key={idx} onClick={() => setEditDayIdx(idx)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    editDayIdx === idx ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}>
                  {day.day_name?.substring(0, 3)}
                </button>
              ))}
            </div>

            {/* Meals for selected day */}
            <div className="space-y-3">
              {MANUAL_MEAL_KEYS.map(mealKey => {
                const meal = editDays[editDayIdx]?.meals[mealKey] || {};
                const mealMeta = MEAL_ORDER.find(m => m.key === mealKey);
                return (
                  <div key={mealKey} className={`rounded-xl border p-3 ${mealMeta?.bg || 'bg-gray-50'} ${mealMeta?.color || 'border-gray-300'} border-l-4`}>
                    <div className="flex items-center gap-2 mb-2">
                      <span>{mealMeta?.icon || '🍽️'}</span>
                      <span className="text-xs font-bold text-gray-700">{MANUAL_MEAL_LABELS[mealKey]}</span>
                    </div>
                    <div className="space-y-2">
                      <input type="text" value={meal.name || ''} onChange={e => updateEditMeal(editDayIdx, mealKey, 'name', e.target.value)}
                        placeholder="Meal name" className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:outline-none bg-white" />
                      <input type="text" value={meal.items || ''} onChange={e => updateEditMeal(editDayIdx, mealKey, 'items', e.target.value)}
                        placeholder="Items (comma separated)" className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:outline-none bg-white" />
                      <div className="grid grid-cols-4 gap-2">
                        {[['calories','Cal'],['protein_g','P(g)'],['carbs_g','C(g)'],['fat_g','F(g)']].map(([field, label]) => (
                          <div key={field}>
                            <label className="block text-[10px] text-gray-500 uppercase">{label}</label>
                            <input type="number" value={meal[field] || ''} onChange={e => updateEditMeal(editDayIdx, mealKey, field, e.target.value)}
                              className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-primary-500 focus:outline-none bg-white" />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea rows={2} value={editNotes} onChange={e => setEditNotes(e.target.value)}
                placeholder="Instructions or notes..."
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none resize-none" />
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeletePlan}
        title="Delete Diet Plan"
        description="Are you sure you want to delete this diet plan?"
        confirmText="Delete"
        loading={deleting}
      />
    </div>
  );
}

// Ordered meal timeline component - used in both generated preview and saved plan view
const MEAL_ORDER = [
  { key: 'breakfast', label: 'Breakfast', icon: '🌅', color: 'border-amber-400', dot: 'bg-amber-400', bg: 'bg-amber-50' },
  { key: 'morning_snack', label: 'Morning Snack', icon: '🍎', color: 'border-orange-400', dot: 'bg-orange-400', bg: 'bg-orange-50' },
  { key: 'lunch', label: 'Lunch', icon: '🍽️', color: 'border-green-400', dot: 'bg-green-500', bg: 'bg-green-50' },
  { key: 'afternoon_snack', label: 'Afternoon Snack', icon: '🥤', color: 'border-teal-400', dot: 'bg-teal-400', bg: 'bg-teal-50' },
  { key: 'pre_workout', label: 'Pre-Workout', icon: '⚡', color: 'border-blue-400', dot: 'bg-blue-400', bg: 'bg-blue-50' },
  { key: 'post_workout', label: 'Post-Workout', icon: '💪', color: 'border-indigo-400', dot: 'bg-indigo-400', bg: 'bg-indigo-50' },
  { key: 'dinner', label: 'Dinner', icon: '🌙', color: 'border-purple-400', dot: 'bg-purple-500', bg: 'bg-purple-50' },
];

function MealTimeline({ meals }) {
  if (!meals) return null;
  const orderedMeals = MEAL_ORDER.filter(m => meals[m.key]).map(m => ({ ...m, data: meals[m.key] }));

  return (
    <div className="relative pl-8">
      {/* Timeline line */}
      <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-gray-200" />

      <div className="space-y-4">
        {orderedMeals.map((meal, idx) => (
          <div key={meal.key} className="relative">
            {/* Timeline dot */}
            <div className={`absolute -left-8 top-3 h-[9px] w-[9px] rounded-full ring-2 ring-white ${meal.dot}`} />

            <div className={`rounded-xl border ${meal.color} ${meal.bg} p-4`}>
              {/* Header */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-base">{meal.icon}</span>
                  <div>
                    <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">{meal.label}</span>
                  </div>
                </div>
                <span className="text-sm font-bold text-gray-800">{meal.data.calories} kcal</span>
              </div>

              {/* Meal name */}
              <p className="text-sm font-semibold text-gray-900 mb-1.5">{meal.data.name}</p>

              {/* Items */}
              <ul className="space-y-1 mb-2">
                {(meal.data.items || []).map((item, i) => (
                  <li key={i} className="text-xs text-gray-600 flex items-start gap-1.5">
                    <span className="mt-1.5 h-1 w-1 rounded-full bg-gray-400 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>

              {/* Macros */}
              <div className="flex gap-4 text-[11px] font-medium">
                <span className="text-blue-600">P: {meal.data.protein_g}g</span>
                <span className="text-amber-600">C: {meal.data.carbs_g}g</span>
                <span className="text-red-500">F: {meal.data.fat_g}g</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
