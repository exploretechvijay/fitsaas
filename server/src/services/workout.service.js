import { v4 as uuidv4 } from 'uuid';
import { supabaseAdmin } from '../config/supabase.js';
import ApiError from '../utils/ApiError.js';
import { parsePagination, paginatedResponse } from '../utils/pagination.js';

class WorkoutService {
  async createPlan(gymId, userId, data) {
    const planId = uuidv4();

    const { data: plan, error: planError } = await supabaseAdmin
      .from('workout_plans')
      .insert({
        plan_id: planId,
        gym_id: gymId,
        name: data.name,
        type: data.type,
        difficulty: data.difficulty,
        goal_tags: data.goal_tags || [],
        created_by: userId,
      })
      .select()
      .single();

    if (planError) throw ApiError.internal('Failed to create workout plan: ' + planError.message);

    // Insert days and exercises
    if (data.days && data.days.length > 0) {
      for (const day of data.days) {
        const dayId = uuidv4();
        await supabaseAdmin.from('workout_days').insert({
          day_id: dayId,
          plan_id: planId,
          day_number: day.day_number,
          is_rest_day: day.is_rest_day,
        });

        if (!day.is_rest_day && day.exercises && day.exercises.length > 0) {
          const exercises = day.exercises.map((ex, index) => ({
            exercise_id: uuidv4(),
            day_id: dayId,
            name: ex.name,
            sets: ex.sets || null,
            reps: ex.reps || null,
            duration_seconds: ex.duration_seconds || null,
            rest_seconds: ex.rest_seconds || null,
            notes: ex.notes || null,
            order_index: index + 1,
          }));

          await supabaseAdmin.from('workout_exercises').insert(exercises);
        }
      }
    }

    return this.getPlanById(gymId, planId);
  }

  async listPlans(gymId, query) {
    const { page, limit, offset } = parsePagination(query);

    let dbQuery = supabaseAdmin
      .from('workout_plans')
      .select('*', { count: 'exact' })
      .eq('gym_id', gymId);

    if (query.type) dbQuery = dbQuery.eq('type', query.type);
    if (query.difficulty) dbQuery = dbQuery.eq('difficulty', query.difficulty);
    if (query.search) dbQuery = dbQuery.ilike('name', `%${query.search}%`);

    dbQuery = dbQuery
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await dbQuery;
    if (error) throw ApiError.internal('Failed to fetch workout plans');

    return paginatedResponse(data, count, page, limit);
  }

  async getPlanById(gymId, planId) {
    const { data: plan, error } = await supabaseAdmin
      .from('workout_plans')
      .select('*')
      .eq('gym_id', gymId)
      .eq('plan_id', planId)
      .single();

    if (error || !plan) throw ApiError.notFound('Workout plan not found');

    // Fetch days with exercises
    const { data: days } = await supabaseAdmin
      .from('workout_days')
      .select(`
        *,
        workout_exercises(*)
      `)
      .eq('plan_id', planId)
      .order('day_number', { ascending: true });

    // Sort exercises within each day
    if (days) {
      days.forEach(day => {
        if (day.workout_exercises) {
          day.workout_exercises.sort((a, b) => a.order_index - b.order_index);
        }
      });
    }

    return { ...plan, days: days || [] };
  }

  async updatePlan(gymId, planId, updates) {
    const { data, error } = await supabaseAdmin
      .from('workout_plans')
      .update({
        name: updates.name,
        type: updates.type,
        difficulty: updates.difficulty,
        goal_tags: updates.goal_tags,
        updated_at: new Date().toISOString(),
      })
      .eq('gym_id', gymId)
      .eq('plan_id', planId)
      .select()
      .single();

    if (error || !data) throw ApiError.notFound('Workout plan not found');

    // If days are provided, rebuild them
    if (updates.days) {
      // Delete existing days and exercises
      const { data: existingDays } = await supabaseAdmin
        .from('workout_days')
        .select('day_id')
        .eq('plan_id', planId);

      if (existingDays) {
        for (const day of existingDays) {
          await supabaseAdmin.from('workout_exercises').delete().eq('day_id', day.day_id);
        }
        await supabaseAdmin.from('workout_days').delete().eq('plan_id', planId);
      }

      // Insert new days
      for (const day of updates.days) {
        const dayId = uuidv4();
        await supabaseAdmin.from('workout_days').insert({
          day_id: dayId,
          plan_id: planId,
          day_number: day.day_number,
          is_rest_day: day.is_rest_day,
        });

        if (!day.is_rest_day && day.exercises) {
          const exercises = day.exercises.map((ex, index) => ({
            exercise_id: uuidv4(),
            day_id: dayId,
            name: ex.name,
            sets: ex.sets || null,
            reps: ex.reps || null,
            duration_seconds: ex.duration_seconds || null,
            rest_seconds: ex.rest_seconds || null,
            notes: ex.notes || null,
            order_index: index + 1,
          }));

          await supabaseAdmin.from('workout_exercises').insert(exercises);
        }
      }
    }

    return this.getPlanById(gymId, planId);
  }

  async deletePlan(gymId, planId) {
    // Check for active assignments
    const { count } = await supabaseAdmin
      .from('member_workout_assignments')
      .select('assignment_id', { count: 'exact' })
      .eq('plan_id', planId);

    if (count > 0) {
      throw ApiError.conflict('Cannot delete plan with active member assignments');
    }

    // Delete exercises, days, then plan
    const { data: days } = await supabaseAdmin
      .from('workout_days')
      .select('day_id')
      .eq('plan_id', planId);

    if (days) {
      for (const day of days) {
        await supabaseAdmin.from('workout_exercises').delete().eq('day_id', day.day_id);
      }
    }

    await supabaseAdmin.from('workout_days').delete().eq('plan_id', planId);
    await supabaseAdmin.from('workout_plans').delete().eq('gym_id', gymId).eq('plan_id', planId);
  }

  async assignToMember(gymId, data) {
    const { data: assignment, error } = await supabaseAdmin
      .from('member_workout_assignments')
      .insert({
        assignment_id: uuidv4(),
        member_id: data.member_id,
        plan_id: data.plan_id,
        assigned_by: data.assigned_by,
        start_date: data.start_date,
      })
      .select('*, workout_plans(name, type, difficulty), members(full_name)')
      .single();

    if (error) throw ApiError.internal('Failed to assign workout plan: ' + error.message);
    return assignment;
  }

  async getMemberAssignments(gymId, memberId) {
    const { data, error } = await supabaseAdmin
      .from('member_workout_assignments')
      .select(`
        *,
        workout_plans(name, type, difficulty, goal_tags)
      `)
      .eq('member_id', memberId)
      .order('start_date', { ascending: false });

    if (error) throw ApiError.internal('Failed to fetch assignments');
    return data || [];
  }
}

export default new WorkoutService();
