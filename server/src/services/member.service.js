import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { supabaseAdmin } from '../config/supabase.js';
import ApiError from '../utils/ApiError.js';
import { parsePagination, paginatedResponse } from '../utils/pagination.js';

class MemberService {
  async createMember(gymId, data) {
    // Check for duplicate email within the gym
    const { data: existing } = await supabaseAdmin
      .from('members')
      .select('member_id')
      .eq('gym_id', gymId)
      .eq('email', data.email)
      .single();

    if (existing) {
      throw ApiError.conflict('A member with this email already exists in this gym');
    }

    const memberId = uuidv4();
    const { data: member, error } = await supabaseAdmin
      .from('members')
      .insert({
        member_id: memberId,
        gym_id: gymId,
        full_name: data.full_name,
        email: data.email,
        phone: data.phone,
        dob: data.dob || null,
        gender: data.gender || null,
        photo_url: data.photo_url || null,
        height: data.height || null,
        weight: data.weight || null,
        goal: data.goal || null,
        dietary_pref: data.dietary_pref || null,
        medical_notes: data.medical_notes || null,
        emergency_contact_name: data.emergency_contact_name || null,
        emergency_contact_phone: data.emergency_contact_phone || null,
      })
      .select()
      .single();

    if (error) throw ApiError.internal('Failed to create member: ' + error.message);

    // Log initial body metrics if weight provided
    if (data.weight || data.height) {
      const bmi = data.weight && data.height
        ? parseFloat((data.weight / ((data.height / 100) ** 2)).toFixed(1))
        : null;

      await supabaseAdmin.from('body_metrics').insert({
        metric_id: uuidv4(),
        member_id: memberId,
        weight: data.weight || null,
        bmi,
        recorded_at: new Date().toISOString(),
      });
    }

    // Auto-create user account for mobile app login
    let memberPassword = null;
    if (data.email) {
      const tempPassword = `Fit@${Date.now().toString(36)}`;
      const passwordHash = await bcrypt.hash(tempPassword, 12);
      const { error: userError } = await supabaseAdmin.from('users').insert({
        user_id: uuidv4(),
        gym_id: gymId,
        email: data.email,
        password_hash: passwordHash,
        role: 'member',
        full_name: data.full_name,
        phone: data.phone,
        is_active: true,
      });
      if (!userError) memberPassword = tempPassword;
    }

    return { ...member, member_password: memberPassword };
  }

  async listMembers(gymId, query) {
    const { page, limit, offset } = parsePagination(query);

    let dbQuery = supabaseAdmin
      .from('members')
      .select(`
        *,
        member_subscriptions(
          sub_id, plan_id, start_date, end_date, status,
          subscription_plans(name, price)
        )
      `, { count: 'exact' })
      .eq('gym_id', gymId);

    if (query.search) {
      dbQuery = dbQuery.or(
        `full_name.ilike.%${query.search}%,email.ilike.%${query.search}%,phone.ilike.%${query.search}%`
      );
    }

    if (query.gender) {
      dbQuery = dbQuery.eq('gender', query.gender);
    }

    const sortBy = query.sort_by || 'created_at';
    const sortOrder = query.sort_order === 'asc' ? true : false;
    dbQuery = dbQuery.order(sortBy, { ascending: sortOrder }).range(offset, offset + limit - 1);

    const { data, error, count } = await dbQuery;
    if (error) throw ApiError.internal('Failed to fetch members: ' + error.message);

    // Enrich with subscription status
    const enriched = (data || []).map((member) => {
      const activeSub = (member.member_subscriptions || []).find(s => s.status === 'active');
      return {
        ...member,
        subscription_status: activeSub ? 'active' : 'inactive',
        current_plan: activeSub?.subscription_plans?.name || null,
        subscription_start: activeSub?.start_date || null,
        subscription_expiry: activeSub?.end_date || null,
      };
    });

    // Filter by subscription status if requested
    let filtered = enriched;
    if (query.status) {
      filtered = enriched.filter(m => {
        if (query.status === 'active') return m.subscription_status === 'active';
        if (query.status === 'expired') return m.subscription_status === 'inactive';
        return true;
      });
    }

    return paginatedResponse(filtered, count, page, limit);
  }

  async getMemberById(gymId, memberId) {
    const { data, error } = await supabaseAdmin
      .from('members')
      .select(`
        *,
        member_subscriptions(
          *,
          subscription_plans(name, price, duration_days)
        ),
        member_workout_assignments(
          *,
          workout_plans(name, type, difficulty)
        ),
        diet_plans(*),
        body_metrics(*)
      `)
      .eq('gym_id', gymId)
      .eq('member_id', memberId)
      .single();

    if (error || !data) throw ApiError.notFound('Member not found');
    return data;
  }

  async updateMember(gymId, memberId, updates) {
    const { data, error } = await supabaseAdmin
      .from('members')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('gym_id', gymId)
      .eq('member_id', memberId)
      .select()
      .single();

    if (error) throw ApiError.internal('Failed to update member: ' + error.message);
    if (!data) throw ApiError.notFound('Member not found');

    // Log body metrics if weight changed
    if (updates.weight) {
      const height = updates.height || data.height;
      const bmi = updates.weight && height
        ? parseFloat((updates.weight / ((height / 100) ** 2)).toFixed(1))
        : null;

      await supabaseAdmin.from('body_metrics').insert({
        metric_id: uuidv4(),
        member_id: memberId,
        weight: updates.weight,
        bmi,
        recorded_at: new Date().toISOString(),
      });
    }

    return data;
  }

  async deleteMember(gymId, memberId) {
    const { error } = await supabaseAdmin
      .from('members')
      .delete()
      .eq('gym_id', gymId)
      .eq('member_id', memberId);

    if (error) throw ApiError.internal('Failed to delete member: ' + error.message);
  }

  async getMemberMetrics(memberId) {
    const { data, error } = await supabaseAdmin
      .from('body_metrics')
      .select('*')
      .eq('member_id', memberId)
      .order('recorded_at', { ascending: true });

    if (error) throw ApiError.internal('Failed to fetch metrics');
    return data || [];
  }

  async addBodyMetric(memberId, metricData) {
    const { data, error } = await supabaseAdmin
      .from('body_metrics')
      .insert({
        metric_id: uuidv4(),
        member_id: memberId,
        weight: metricData.weight || null,
        bmi: metricData.bmi || null,
        body_fat_pct: metricData.body_fat_pct || null,
        recorded_at: metricData.recorded_at || new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw ApiError.internal('Failed to add metric');
    return data;
  }
}

export default new MemberService();
