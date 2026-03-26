import { v4 as uuidv4 } from 'uuid';
import { supabaseAdmin } from '../config/supabase.js';
import ApiError from '../utils/ApiError.js';
import { parsePagination, paginatedResponse } from '../utils/pagination.js';

class LeadService {
  async create(gymId, userId, data) {
    const { data: lead, error } = await supabaseAdmin
      .from('leads')
      .insert({
        lead_id: uuidv4(),
        gym_id: gymId,
        full_name: data.full_name,
        phone: data.phone,
        email: data.email || null,
        gender: data.gender || null,
        age: data.age || null,
        source: data.source || 'walk_in',
        status: data.status || 'new',
        interest: data.interest || null,
        notes: data.notes || null,
        assigned_to: data.assigned_to || null,
        created_by: userId,
        follow_up_date: data.follow_up_date || null,
      })
      .select()
      .single();

    if (error) throw ApiError.internal('Failed to create lead: ' + error.message);
    return lead;
  }

  async bulkCreate(gymId, userId, leads) {
    const rows = leads.map(l => ({
      lead_id: uuidv4(),
      gym_id: gymId,
      full_name: l.full_name,
      phone: l.phone,
      email: l.email || null,
      gender: l.gender || null,
      age: l.age ? parseInt(l.age) : null,
      source: l.source || 'bulk_upload',
      status: 'new',
      interest: l.interest || null,
      notes: l.notes || null,
      created_by: userId,
    }));

    const { data, error } = await supabaseAdmin
      .from('leads')
      .insert(rows)
      .select();

    if (error) throw ApiError.internal('Failed to upload leads: ' + error.message);
    return { inserted: data.length, total: leads.length };
  }

  async list(gymId, query) {
    const { page, limit, offset } = parsePagination(query);

    let dbQuery = supabaseAdmin
      .from('leads')
      .select('*, users!leads_assigned_to_fkey(full_name)', { count: 'exact' })
      .eq('gym_id', gymId);

    if (query.status) dbQuery = dbQuery.eq('status', query.status);
    if (query.source) dbQuery = dbQuery.eq('source', query.source);
    if (query.search) {
      dbQuery = dbQuery.or(`full_name.ilike.%${query.search}%,phone.ilike.%${query.search}%,email.ilike.%${query.search}%`);
    }
    if (query.follow_up_date) {
      dbQuery = dbQuery.eq('follow_up_date', query.follow_up_date);
    }

    dbQuery = dbQuery.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

    const { data, error, count } = await dbQuery;
    if (error) throw ApiError.internal('Failed to fetch leads: ' + error.message);

    return paginatedResponse(data, count, page, limit);
  }

  async getById(gymId, leadId) {
    const { data, error } = await supabaseAdmin
      .from('leads')
      .select('*')
      .eq('gym_id', gymId)
      .eq('lead_id', leadId)
      .single();

    if (error || !data) throw ApiError.notFound('Lead not found');
    return data;
  }

  async update(gymId, leadId, updates) {
    const updateData = { ...updates, updated_at: new Date().toISOString() };
    delete updateData.lead_id;
    delete updateData.gym_id;
    delete updateData.created_by;
    delete updateData.created_at;

    const { data, error } = await supabaseAdmin
      .from('leads')
      .update(updateData)
      .eq('gym_id', gymId)
      .eq('lead_id', leadId)
      .select()
      .single();

    if (error) throw ApiError.internal('Failed to update lead: ' + error.message);
    if (!data) throw ApiError.notFound('Lead not found');
    return data;
  }

  async delete(gymId, leadId) {
    const { error } = await supabaseAdmin
      .from('leads')
      .delete()
      .eq('gym_id', gymId)
      .eq('lead_id', leadId);

    if (error) throw ApiError.internal('Failed to delete lead');
  }

  async addActivity(gymId, leadId, userId, data) {
    const { data: activity, error } = await supabaseAdmin
      .from('lead_activities')
      .insert({
        activity_id: uuidv4(),
        lead_id: leadId,
        gym_id: gymId,
        type: data.type,
        disposition: data.disposition || null,
        notes: data.notes || null,
        created_by: userId,
      })
      .select()
      .single();

    if (error) throw ApiError.internal('Failed to add activity: ' + error.message);

    // Update lead's last_contacted_at and status if disposition changes it
    const leadUpdates = { last_contacted_at: new Date().toISOString() };
    if (data.new_status) leadUpdates.status = data.new_status;
    if (data.follow_up_date) leadUpdates.follow_up_date = data.follow_up_date;

    await supabaseAdmin
      .from('leads')
      .update(leadUpdates)
      .eq('lead_id', leadId);

    return activity;
  }

  async getActivities(leadId) {
    const { data, error } = await supabaseAdmin
      .from('lead_activities')
      .select('*, users!lead_activities_created_by_fkey(full_name)')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false });

    if (error) throw ApiError.internal('Failed to fetch activities');
    return data || [];
  }

  async getStats(gymId) {
    const { data } = await supabaseAdmin
      .from('leads')
      .select('status')
      .eq('gym_id', gymId);

    const stats = { total: 0, new: 0, contacted: 0, interested: 0, follow_up: 0, trial: 0, converted: 0, not_interested: 0, lost: 0 };
    (data || []).forEach(l => {
      stats.total++;
      stats[l.status] = (stats[l.status] || 0) + 1;
    });
    return stats;
  }

  async convertToMember(gymId, leadId) {
    const lead = await this.getById(gymId, leadId);

    // Create member from lead data
    const memberId = uuidv4();
    const { error } = await supabaseAdmin
      .from('members')
      .insert({
        member_id: memberId,
        gym_id: gymId,
        full_name: lead.full_name,
        email: lead.email || `${lead.phone}@placeholder.com`,
        phone: lead.phone,
        gender: lead.gender,
      });

    if (error) throw ApiError.internal('Failed to create member: ' + error.message);

    // Update lead status
    await this.update(gymId, leadId, { status: 'converted', converted_member_id: memberId });

    return { member_id: memberId, lead_id: leadId };
  }
}

export default new LeadService();
