import { v4 as uuidv4 } from 'uuid';
import { supabaseAdmin } from '../config/supabase.js';
import ApiError from '../utils/ApiError.js';
import { parsePagination, paginatedResponse } from '../utils/pagination.js';

class SubscriptionService {
  // ─── Plan CRUD ─────────────────────────────────────
  async createPlan(gymId, data) {
    const { data: plan, error } = await supabaseAdmin
      .from('subscription_plans')
      .insert({
        plan_id: uuidv4(),
        gym_id: gymId,
        name: data.name,
        duration_days: data.duration_days,
        price: data.price,
        description: data.description || null,
        features: data.features || [],
        is_active: true,
      })
      .select()
      .single();

    if (error) throw ApiError.internal('Failed to create plan: ' + error.message);
    return plan;
  }

  async listPlans(gymId, includeInactive = false) {
    let query = supabaseAdmin
      .from('subscription_plans')
      .select('*')
      .eq('gym_id', gymId)
      .order('created_at', { ascending: false });

    if (!includeInactive) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;
    if (error) throw ApiError.internal('Failed to fetch plans');
    return data || [];
  }

  async getPlanById(gymId, planId) {
    const { data, error } = await supabaseAdmin
      .from('subscription_plans')
      .select('*')
      .eq('gym_id', gymId)
      .eq('plan_id', planId)
      .single();

    if (error || !data) throw ApiError.notFound('Plan not found');
    return data;
  }

  async updatePlan(gymId, planId, updates) {
    const { data, error } = await supabaseAdmin
      .from('subscription_plans')
      .update(updates)
      .eq('gym_id', gymId)
      .eq('plan_id', planId)
      .select()
      .single();

    if (error) throw ApiError.internal('Failed to update plan');
    if (!data) throw ApiError.notFound('Plan not found');
    return data;
  }

  async deletePlan(gymId, planId) {
    // Check if any active subscriptions use this plan
    const { count } = await supabaseAdmin
      .from('member_subscriptions')
      .select('sub_id', { count: 'exact' })
      .eq('plan_id', planId)
      .eq('status', 'active');

    if (count > 0) {
      throw ApiError.conflict('Cannot delete plan with active subscriptions. Deactivate it instead.');
    }

    const { error } = await supabaseAdmin
      .from('subscription_plans')
      .delete()
      .eq('gym_id', gymId)
      .eq('plan_id', planId);

    if (error) throw ApiError.internal('Failed to delete plan');
  }

  // ─── Member Subscriptions ──────────────────────────
  async assignSubscription(gymId, data) {
    const plan = await this.getPlanById(gymId, data.plan_id);

    const startDate = new Date(data.start_date);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + plan.duration_days);

    const subId = uuidv4();
    const { data: subscription, error } = await supabaseAdmin
      .from('member_subscriptions')
      .insert({
        sub_id: subId,
        member_id: data.member_id,
        gym_id: gymId,
        plan_id: data.plan_id,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        status: 'active',
      })
      .select('*, subscription_plans(name, price, duration_days)')
      .single();

    if (error) throw ApiError.internal('Failed to assign subscription: ' + error.message);

    // Record payment if provided
    if (data.payment_amount) {
      await this.recordPayment({
        sub_id: subId,
        member_id: data.member_id,
        gym_id: gymId,
        amount: data.payment_amount,
        mode: data.payment_mode || 'cash',
        reference_id: data.reference_id || null,
      });
    }

    return subscription;
  }

  async renewSubscription(gymId, subId, data) {
    // Get current subscription
    const { data: currentSub, error: fetchError } = await supabaseAdmin
      .from('member_subscriptions')
      .select('*')
      .eq('sub_id', subId)
      .eq('gym_id', gymId)
      .single();

    if (fetchError || !currentSub) throw ApiError.notFound('Subscription not found');

    // Mark current as expired
    await supabaseAdmin
      .from('member_subscriptions')
      .update({ status: 'expired' })
      .eq('sub_id', subId);

    const plan = await this.getPlanById(gymId, data.plan_id);

    // Start from current end date or today, whichever is later
    const startDate = data.start_date
      ? new Date(data.start_date)
      : new Date(Math.max(new Date(currentSub.end_date).getTime(), Date.now()));

    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + plan.duration_days);

    const newSubId = uuidv4();
    const { data: newSub, error } = await supabaseAdmin
      .from('member_subscriptions')
      .insert({
        sub_id: newSubId,
        member_id: currentSub.member_id,
        gym_id: gymId,
        plan_id: data.plan_id,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        status: 'active',
      })
      .select('*, subscription_plans(name, price, duration_days)')
      .single();

    if (error) throw ApiError.internal('Failed to renew subscription');

    if (data.payment_amount) {
      await this.recordPayment({
        sub_id: newSubId,
        member_id: currentSub.member_id,
        gym_id: gymId,
        amount: data.payment_amount,
        mode: data.payment_mode || 'cash',
      });
    }

    return newSub;
  }

  async pauseSubscription(gymId, subId, pauseDays) {
    const { data: sub, error: fetchError } = await supabaseAdmin
      .from('member_subscriptions')
      .select('*')
      .eq('sub_id', subId)
      .eq('gym_id', gymId)
      .eq('status', 'active')
      .single();

    if (fetchError || !sub) throw ApiError.notFound('Active subscription not found');

    // Extend end date by pause days
    const newEndDate = new Date(sub.end_date);
    newEndDate.setDate(newEndDate.getDate() + pauseDays);

    const { data, error } = await supabaseAdmin
      .from('member_subscriptions')
      .update({
        status: 'paused',
        paused_at: new Date().toISOString(),
        pause_days: (sub.pause_days || 0) + pauseDays,
        end_date: newEndDate.toISOString(),
      })
      .eq('sub_id', subId)
      .select()
      .single();

    if (error) throw ApiError.internal('Failed to pause subscription');
    return data;
  }

  async resumeSubscription(gymId, subId) {
    const { data, error } = await supabaseAdmin
      .from('member_subscriptions')
      .update({ status: 'active', paused_at: null })
      .eq('sub_id', subId)
      .eq('gym_id', gymId)
      .eq('status', 'paused')
      .select()
      .single();

    if (error || !data) throw ApiError.notFound('Paused subscription not found');
    return data;
  }

  async cancelSubscription(gymId, subId, cancelReason) {
    const { data, error } = await supabaseAdmin
      .from('member_subscriptions')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancel_reason: cancelReason,
      })
      .eq('sub_id', subId)
      .eq('gym_id', gymId)
      .in('status', ['active', 'paused'])
      .select()
      .single();

    if (error || !data) throw ApiError.notFound('Subscription not found or already cancelled');
    return data;
  }

  async getExpiringSubscriptions(gymId, days = 7) {
    const today = new Date();
    const futureDate = new Date(today);
    futureDate.setDate(futureDate.getDate() + days);

    const { data, error } = await supabaseAdmin
      .from('member_subscriptions')
      .select(`
        *,
        members(full_name, email, phone),
        subscription_plans(name, price)
      `)
      .eq('gym_id', gymId)
      .eq('status', 'active')
      .gte('end_date', today.toISOString())
      .lte('end_date', futureDate.toISOString())
      .order('end_date', { ascending: true });

    if (error) throw ApiError.internal('Failed to fetch expiring subscriptions');
    return data || [];
  }

  // ─── Payments ─────────────────────────────────────
  async recordPayment(data) {
    const { data: payment, error } = await supabaseAdmin
      .from('payments')
      .insert({
        payment_id: uuidv4(),
        sub_id: data.sub_id,
        member_id: data.member_id,
        gym_id: data.gym_id,
        amount: data.amount,
        mode: data.mode,
        reference_id: data.reference_id || null,
        paid_at: data.paid_at || new Date().toISOString(),
        notes: data.notes || null,
      })
      .select()
      .single();

    if (error) throw ApiError.internal('Failed to record payment: ' + error.message);
    return payment;
  }

  async updatePayment(gymId, paymentId, updates) {
    const updateData = {};
    if (updates.reference_id !== undefined) updateData.reference_id = updates.reference_id;
    if (updates.notes !== undefined) updateData.notes = updates.notes;

    const { data, error } = await supabaseAdmin
      .from('payments')
      .update(updateData)
      .eq('gym_id', gymId)
      .eq('payment_id', paymentId)
      .select()
      .single();

    if (error) throw ApiError.internal('Failed to update payment');
    if (!data) throw ApiError.notFound('Payment not found');
    return data;
  }

  async getPayments(gymId, query) {
    const { page, limit, offset } = parsePagination(query);

    let dbQuery = supabaseAdmin
      .from('payments')
      .select(`
        *,
        members(full_name, email),
        member_subscriptions(subscription_plans(name))
      `, { count: 'exact' })
      .eq('gym_id', gymId)
      .order('paid_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (query.member_id) {
      dbQuery = dbQuery.eq('member_id', query.member_id);
    }

    if (query.start_date && query.end_date) {
      dbQuery = dbQuery
        .gte('paid_at', query.start_date)
        .lte('paid_at', query.end_date);
    }

    const { data, error, count } = await dbQuery;
    if (error) throw ApiError.internal('Failed to fetch payments');

    return paginatedResponse(data, count, page, limit);
  }
}

export default new SubscriptionService();
