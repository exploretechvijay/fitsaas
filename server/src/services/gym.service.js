import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { supabaseAdmin } from '../config/supabase.js';
import ApiError from '../utils/ApiError.js';
import { parsePagination, paginatedResponse } from '../utils/pagination.js';

class GymService {
  async createGym(data) {
    const gymId = uuidv4();

    // Check for duplicate email
    const { data: existing } = await supabaseAdmin
      .from('tenants')
      .select('gym_id')
      .eq('email', data.email)
      .single();

    if (existing) {
      throw ApiError.conflict('A gym with this email already exists');
    }

    // Create tenant
    const { data: gym, error: gymError } = await supabaseAdmin
      .from('tenants')
      .insert({
        gym_id: gymId,
        name: data.name,
        owner_name: data.owner_name,
        email: data.email,
        phone: data.phone,
        address: data.address || null,
        status: 'trial',
        saas_plan_id: data.saas_plan_id || null,
      })
      .select()
      .single();

    if (gymError) throw ApiError.internal('Failed to create gym: ' + gymError.message);

    // Create admin user for this gym
    const tempPassword = `FitSaaS@${Date.now().toString(36)}`;
    const passwordHash = await bcrypt.hash(tempPassword, 12);

    const { error: userError } = await supabaseAdmin
      .from('users')
      .insert({
        user_id: uuidv4(),
        gym_id: gymId,
        email: data.email,
        password_hash: passwordHash,
        role: 'gym_admin',
        full_name: data.owner_name,
        phone: data.phone,
        is_active: true,
      });

    if (userError) throw ApiError.internal('Failed to create gym admin user: ' + userError.message);

    return { gym, tempPassword };
  }

  async listGyms(query) {
    const { page, limit, offset } = parsePagination(query);

    let dbQuery = supabaseAdmin
      .from('tenants')
      .select('*, saas_plans(name, max_members)', { count: 'exact' });

    if (query.status) {
      dbQuery = dbQuery.eq('status', query.status);
    }

    if (query.search) {
      dbQuery = dbQuery.or(`name.ilike.%${query.search}%,owner_name.ilike.%${query.search}%,email.ilike.%${query.search}%`);
    }

    dbQuery = dbQuery
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await dbQuery;

    if (error) throw ApiError.internal('Failed to fetch gyms: ' + error.message);

    return paginatedResponse(data, count, page, limit);
  }

  async getGymById(gymId) {
    const { data, error } = await supabaseAdmin
      .from('tenants')
      .select('*, saas_plans(name, max_members, max_staff, ai_credits)')
      .eq('gym_id', gymId)
      .single();

    if (error || !data) throw ApiError.notFound('Gym not found');
    return data;
  }

  async updateGym(gymId, updates) {
    const { data, error } = await supabaseAdmin
      .from('tenants')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('gym_id', gymId)
      .select()
      .single();

    if (error) throw ApiError.internal('Failed to update gym: ' + error.message);
    if (!data) throw ApiError.notFound('Gym not found');
    return data;
  }

  async toggleGymStatus(gymId, status) {
    return this.updateGym(gymId, { status });
  }

  async getGymStats(gymId) {
    const [membersResult, subsResult, revenueResult] = await Promise.all([
      supabaseAdmin
        .from('members')
        .select('member_id', { count: 'exact' })
        .eq('gym_id', gymId),
      supabaseAdmin
        .from('member_subscriptions')
        .select('status', { count: 'exact' })
        .eq('gym_id', gymId)
        .eq('status', 'active'),
      supabaseAdmin
        .from('payments')
        .select('amount')
        .eq('gym_id', gymId),
    ]);

    const totalRevenue = (revenueResult.data || []).reduce(
      (sum, p) => sum + parseFloat(p.amount || 0), 0
    );

    return {
      total_members: membersResult.count || 0,
      active_subscriptions: subsResult.count || 0,
      total_revenue: totalRevenue,
    };
  }

  async getPlatformStats() {
    const [gymsResult, activeGymsResult, membersResult, revenueResult] = await Promise.all([
      supabaseAdmin.from('tenants').select('gym_id', { count: 'exact' }),
      supabaseAdmin.from('tenants').select('gym_id', { count: 'exact' }).eq('status', 'active'),
      supabaseAdmin.from('members').select('member_id', { count: 'exact' }),
      supabaseAdmin.from('payments').select('amount'),
    ]);

    const totalRevenue = (revenueResult.data || []).reduce(
      (sum, p) => sum + parseFloat(p.amount || 0), 0
    );

    return {
      total_gyms: gymsResult.count || 0,
      active_gyms: activeGymsResult.count || 0,
      total_members: membersResult.count || 0,
      total_revenue: totalRevenue,
    };
  }
}

export default new GymService();
