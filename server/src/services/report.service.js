import { supabaseAdmin } from '../config/supabase.js';
import ApiError from '../utils/ApiError.js';

class ReportService {
  async getMemberReport(gymId, startDate, endDate) {
    const start = startDate || new Date(new Date().setMonth(new Date().getMonth() - 6)).toISOString();
    const end = endDate || new Date().toISOString();

    // Total members
    const { count: totalMembers } = await supabaseAdmin
      .from('members')
      .select('member_id', { count: 'exact' })
      .eq('gym_id', gymId);

    // New members in date range
    const { data: newMembers } = await supabaseAdmin
      .from('members')
      .select('member_id, created_at')
      .eq('gym_id', gymId)
      .gte('created_at', start)
      .lte('created_at', end);

    // Group by month
    const monthlyJoins = {};
    (newMembers || []).forEach(m => {
      const month = m.created_at.substring(0, 7); // YYYY-MM
      monthlyJoins[month] = (monthlyJoins[month] || 0) + 1;
    });

    // Active vs inactive
    const { count: activeCount } = await supabaseAdmin
      .from('member_subscriptions')
      .select('sub_id', { count: 'exact' })
      .eq('gym_id', gymId)
      .eq('status', 'active');

    return {
      total_members: totalMembers || 0,
      new_members_in_period: (newMembers || []).length,
      active_members: activeCount || 0,
      inactive_members: (totalMembers || 0) - (activeCount || 0),
      monthly_joins: monthlyJoins,
    };
  }

  async getRevenueReport(gymId, startDate, endDate) {
    const start = startDate || new Date(new Date().setMonth(new Date().getMonth() - 6)).toISOString();
    const end = endDate || new Date().toISOString();

    const { data: payments } = await supabaseAdmin
      .from('payments')
      .select(`
        payment_id, amount, mode, paid_at,
        member_subscriptions(subscription_plans(name))
      `)
      .eq('gym_id', gymId)
      .gte('paid_at', start)
      .lte('paid_at', end)
      .order('paid_at', { ascending: true });

    const totalRevenue = (payments || []).reduce((sum, p) => sum + parseFloat(p.amount), 0);

    // Group by month
    const monthlyRevenue = {};
    const revenueByPlan = {};
    const revenueByMode = {};

    (payments || []).forEach(p => {
      const month = p.paid_at.substring(0, 7);
      monthlyRevenue[month] = (monthlyRevenue[month] || 0) + parseFloat(p.amount);

      const planName = p.member_subscriptions?.subscription_plans?.name || 'Unknown';
      revenueByPlan[planName] = (revenueByPlan[planName] || 0) + parseFloat(p.amount);

      revenueByMode[p.mode] = (revenueByMode[p.mode] || 0) + parseFloat(p.amount);
    });

    return {
      total_revenue: totalRevenue,
      total_transactions: (payments || []).length,
      monthly_revenue: monthlyRevenue,
      revenue_by_plan: revenueByPlan,
      revenue_by_mode: revenueByMode,
    };
  }

  async getSubscriptionReport(gymId) {
    const { data: subs } = await supabaseAdmin
      .from('member_subscriptions')
      .select('sub_id, status, start_date, end_date, subscription_plans(name)')
      .eq('gym_id', gymId);

    const statusCounts = { active: 0, expired: 0, paused: 0, cancelled: 0 };
    (subs || []).forEach(s => {
      statusCounts[s.status] = (statusCounts[s.status] || 0) + 1;
    });

    // Expiry forecast (next 30 days)
    const today = new Date();
    const thirtyDays = new Date(today);
    thirtyDays.setDate(thirtyDays.getDate() + 30);

    const expiringCount = (subs || []).filter(s =>
      s.status === 'active' &&
      new Date(s.end_date) >= today &&
      new Date(s.end_date) <= thirtyDays
    ).length;

    // Renewal rate
    const totalExpired = statusCounts.expired + statusCounts.active;
    const renewalRate = totalExpired > 0
      ? ((statusCounts.active / totalExpired) * 100).toFixed(1)
      : 0;

    return {
      status_distribution: statusCounts,
      expiring_next_30_days: expiringCount,
      renewal_rate: parseFloat(renewalRate),
      total_subscriptions: (subs || []).length,
    };
  }

  async getDashboardStats(gymId) {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
    const sevenDaysFromNow = new Date(today);
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    const [
      totalMembersResult,
      newMembersResult,
      expiringResult,
      monthlyRevenueResult,
    ] = await Promise.all([
      supabaseAdmin
        .from('members')
        .select('member_id', { count: 'exact' })
        .eq('gym_id', gymId),
      supabaseAdmin
        .from('members')
        .select('member_id', { count: 'exact' })
        .eq('gym_id', gymId)
        .gte('created_at', startOfMonth),
      supabaseAdmin
        .from('member_subscriptions')
        .select('sub_id', { count: 'exact' })
        .eq('gym_id', gymId)
        .eq('status', 'active')
        .gte('end_date', today.toISOString())
        .lte('end_date', sevenDaysFromNow.toISOString()),
      supabaseAdmin
        .from('payments')
        .select('amount')
        .eq('gym_id', gymId)
        .gte('paid_at', startOfMonth),
    ]);

    const monthlyRevenue = (monthlyRevenueResult.data || []).reduce(
      (sum, p) => sum + parseFloat(p.amount || 0), 0
    );

    // Member growth over last 6 months
    const sixMonthsAgo = new Date(today);
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const { data: memberGrowth } = await supabaseAdmin
      .from('members')
      .select('created_at')
      .eq('gym_id', gymId)
      .gte('created_at', sixMonthsAgo.toISOString());

    const growthByMonth = {};
    (memberGrowth || []).forEach(m => {
      const month = m.created_at.substring(0, 7);
      growthByMonth[month] = (growthByMonth[month] || 0) + 1;
    });

    // Subscription distribution
    const { data: subscriptions } = await supabaseAdmin
      .from('member_subscriptions')
      .select('status')
      .eq('gym_id', gymId);

    const subDistribution = { active: 0, expired: 0, paused: 0, cancelled: 0 };
    (subscriptions || []).forEach(s => {
      subDistribution[s.status] = (subDistribution[s.status] || 0) + 1;
    });

    // Recent activity
    const { data: recentMembers } = await supabaseAdmin
      .from('members')
      .select('member_id, full_name, created_at')
      .eq('gym_id', gymId)
      .order('created_at', { ascending: false })
      .limit(5);

    return {
      kpi: {
        total_active_members: totalMembersResult.count || 0,
        new_members_this_month: newMembersResult.count || 0,
        expiring_subscriptions_7d: expiringResult.count || 0,
        revenue_this_month: monthlyRevenue,
      },
      member_growth: growthByMonth,
      subscription_distribution: subDistribution,
      recent_activity: (recentMembers || []).map(m => ({
        type: 'new_member',
        description: `${m.full_name} joined`,
        date: m.created_at,
      })),
    };
  }
}

export default new ReportService();
