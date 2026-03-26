import { v4 as uuidv4 } from 'uuid';
import { supabaseAdmin } from '../config/supabase.js';
import ApiError from '../utils/ApiError.js';
import { parsePagination, paginatedResponse } from '../utils/pagination.js';

class AnnouncementService {
  async create(gymId, data) {
    const { data: announcement, error } = await supabaseAdmin
      .from('announcements')
      .insert({
        announcement_id: uuidv4(),
        gym_id: gymId,
        title: data.title,
        message: data.message,
        target_type: data.target_type,
        target_ids: data.target_ids || [],
        scheduled_at: data.scheduled_at || null,
        sent_at: data.scheduled_at ? null : new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw ApiError.internal('Failed to create announcement: ' + error.message);
    return announcement;
  }

  async list(gymId, query) {
    const { page, limit, offset } = parsePagination(query);

    const { data, error, count } = await supabaseAdmin
      .from('announcements')
      .select('*', { count: 'exact' })
      .eq('gym_id', gymId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw ApiError.internal('Failed to fetch announcements');
    return paginatedResponse(data, count, page, limit);
  }

  async getById(gymId, announcementId) {
    const { data, error } = await supabaseAdmin
      .from('announcements')
      .select('*')
      .eq('gym_id', gymId)
      .eq('announcement_id', announcementId)
      .single();

    if (error || !data) throw ApiError.notFound('Announcement not found');
    return data;
  }

  async delete(gymId, announcementId) {
    const { error } = await supabaseAdmin
      .from('announcements')
      .delete()
      .eq('gym_id', gymId)
      .eq('announcement_id', announcementId);

    if (error) throw ApiError.internal('Failed to delete announcement');
  }
}

export default new AnnouncementService();
