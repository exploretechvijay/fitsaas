import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { supabaseAdmin } from '../config/supabase.js';
import ApiError from '../utils/ApiError.js';
import { parsePagination, paginatedResponse } from '../utils/pagination.js';

class StaffService {
  async createStaff(gymId, data) {
    // Check duplicate email
    const { data: existing } = await supabaseAdmin
      .from('users')
      .select('user_id')
      .eq('email', data.email)
      .single();

    if (existing) {
      throw ApiError.conflict('A user with this email already exists');
    }

    const passwordHash = await bcrypt.hash(data.password, 12);
    const staffRole = data.role === 'manager' ? 'gym_admin' : 'staff';

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .insert({
        user_id: uuidv4(),
        gym_id: gymId,
        email: data.email,
        password_hash: passwordHash,
        role: staffRole,
        full_name: data.full_name,
        phone: data.phone,
        profile_photo: data.profile_photo || null,
        specialization: data.specialization || null,
        staff_role: data.role,
        is_active: true,
      })
      .select('user_id, gym_id, email, role, full_name, phone, profile_photo, specialization, staff_role, is_active, created_at')
      .single();

    if (error) throw ApiError.internal('Failed to create staff: ' + error.message);
    return user;
  }

  async listStaff(gymId, query) {
    const { page, limit, offset } = parsePagination(query);

    let dbQuery = supabaseAdmin
      .from('users')
      .select('user_id, gym_id, email, role, full_name, phone, profile_photo, specialization, staff_role, is_active, created_at', { count: 'exact' })
      .eq('gym_id', gymId)
      .in('role', ['staff', 'gym_admin'])
      .neq('staff_role', null);

    if (query.role) dbQuery = dbQuery.eq('staff_role', query.role);
    if (query.search) {
      dbQuery = dbQuery.or(`full_name.ilike.%${query.search}%,email.ilike.%${query.search}%`);
    }

    dbQuery = dbQuery.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

    const { data, error, count } = await dbQuery;
    if (error) throw ApiError.internal('Failed to fetch staff');

    return paginatedResponse(data, count, page, limit);
  }

  async getStaffById(gymId, staffId) {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('user_id, gym_id, email, role, full_name, phone, profile_photo, specialization, staff_role, is_active, created_at')
      .eq('gym_id', gymId)
      .eq('user_id', staffId)
      .single();

    if (error || !data) throw ApiError.notFound('Staff member not found');
    return data;
  }

  async updateStaff(gymId, staffId, updates) {
    const updateData = {};
    if (updates.full_name) updateData.full_name = updates.full_name;
    if (updates.phone) updateData.phone = updates.phone;
    if (updates.specialization !== undefined) updateData.specialization = updates.specialization;
    if (updates.is_active !== undefined) updateData.is_active = updates.is_active;
    if (updates.role) updateData.staff_role = updates.role;
    if (updates.profile_photo) updateData.profile_photo = updates.profile_photo;

    const { data, error } = await supabaseAdmin
      .from('users')
      .update(updateData)
      .eq('gym_id', gymId)
      .eq('user_id', staffId)
      .select('user_id, gym_id, email, role, full_name, phone, profile_photo, specialization, staff_role, is_active, created_at')
      .single();

    if (error) throw ApiError.internal('Failed to update staff');
    if (!data) throw ApiError.notFound('Staff member not found');
    return data;
  }

  async deleteStaff(gymId, staffId) {
    const { error } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('gym_id', gymId)
      .eq('user_id', staffId);

    if (error) throw ApiError.internal('Failed to delete staff');
  }

  async assignMembers(gymId, trainerId, memberIds) {
    // Verify trainer exists
    const trainer = await this.getStaffById(gymId, trainerId);
    if (trainer.staff_role !== 'trainer') {
      throw ApiError.badRequest('Can only assign members to trainers');
    }

    const assignments = memberIds.map(memberId => ({
      assignment_id: uuidv4(),
      trainer_id: trainerId,
      member_id: memberId,
      gym_id: gymId,
    }));

    // Upsert to avoid duplicates
    const { data, error } = await supabaseAdmin
      .from('trainer_member_assignments')
      .upsert(assignments, { onConflict: 'trainer_id,member_id' })
      .select();

    if (error) throw ApiError.internal('Failed to assign members');
    return data;
  }

  async getTrainerMembers(gymId, trainerId) {
    const { data, error } = await supabaseAdmin
      .from('trainer_member_assignments')
      .select(`
        *,
        members(member_id, full_name, email, phone, photo_url, goal)
      `)
      .eq('gym_id', gymId)
      .eq('trainer_id', trainerId);

    if (error) throw ApiError.internal('Failed to fetch trainer members');
    return (data || []).map(a => a.members).filter(Boolean);
  }
}

export default new StaffService();
