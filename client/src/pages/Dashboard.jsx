import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  UserPlus,
  CreditCard,
  IndianRupee,
  AlertCircle,
  ClipboardList,
  Clock,
} from 'lucide-react';
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { reportsApi } from '../api/endpoints';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency, timeAgo } from '../utils/formatters';
import StatsCard from '../components/ui/StatsCard';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Badge from '../components/ui/Badge';

const PIE_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444'];

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await reportsApi.dashboard();
      setData(res.data.data);
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to load dashboard';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  if (loading) {
    return <LoadingSpinner text="Loading dashboard..." className="min-h-[60vh]" />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <AlertCircle className="h-12 w-12 text-red-400 mb-4" />
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Failed to load dashboard</h2>
        <p className="text-sm text-gray-500 mb-4">{error}</p>
        <Button onClick={fetchDashboard}>Retry</Button>
      </div>
    );
  }

  // Map API response (snake_case) to component data
  const kpi = data?.kpi || {};

  // Transform member_growth object { "2026-01": 5, "2026-02": 3 } into array for chart
  const memberGrowthObj = data?.member_growth || {};
  const memberGrowth = Object.entries(memberGrowthObj).map(([month, count]) => ({
    month,
    members: count,
  }));

  // Transform subscription_distribution { active: 5, expired: 2, ... } into array for pie chart
  const subDistObj = data?.subscription_distribution || {};
  const subscriptionDistribution = Object.entries(subDistObj)
    .filter(([, value]) => value > 0)
    .map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
    }));

  const recentActivity = data?.recent_activity || [];

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {user?.full_name?.split(' ')[0] || 'Admin'}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Here is what is happening at your gym today.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          label="Active Members"
          value={kpi.total_active_members ?? 0}
          icon={Users}
        />
        <StatsCard
          label="New This Month"
          value={kpi.new_members_this_month ?? 0}
          icon={UserPlus}
          iconColor="text-emerald-500"
          iconBg="bg-emerald-50"
        />
        <StatsCard
          label="Expiring (7 days)"
          value={kpi.expiring_subscriptions_7d ?? 0}
          icon={CreditCard}
          iconColor="text-amber-500"
          iconBg="bg-amber-50"
        />
        <StatsCard
          label="Revenue This Month"
          value={formatCurrency(kpi.revenue_this_month)}
          icon={IndianRupee}
          iconColor="text-blue-500"
          iconBg="bg-blue-50"
        />
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <Button icon={UserPlus} onClick={() => navigate('/members?action=add')}>
          Add Member
        </Button>
        <Button
          variant="secondary"
          icon={ClipboardList}
          onClick={() => navigate('/subscriptions')}
        >
          Create Plan
        </Button>
        <Button
          variant="secondary"
          icon={Clock}
          onClick={() => navigate('/subscriptions')}
        >
          View Expiring
        </Button>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Member Growth Chart */}
        <Card className="lg:col-span-2">
          <Card.Header>
            <Card.Title>Member Growth</Card.Title>
            <Card.Description>Last 6 months trend</Card.Description>
          </Card.Header>
          {memberGrowth.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={memberGrowth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 12, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="members"
                  stroke="#6366f1"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#6366f1' }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-sm text-gray-400">
              No growth data available yet
            </div>
          )}
        </Card>

        {/* Subscription Distribution */}
        <Card>
          <Card.Header>
            <Card.Title>Subscription Split</Card.Title>
            <Card.Description>By status</Card.Description>
          </Card.Header>
          {subscriptionDistribution.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={subscriptionDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={4}
                  dataKey="value"
                  nameKey="name"
                >
                  {subscriptionDistribution.map((entry, idx) => (
                    <Cell
                      key={entry.name}
                      fill={PIE_COLORS[idx % PIE_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-sm text-gray-400">
              No subscription data yet
            </div>
          )}
        </Card>
      </div>

      {/* Recent Activity Feed */}
      <Card>
        <Card.Header>
          <Card.Title>Recent Activity</Card.Title>
        </Card.Header>
        {recentActivity.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {recentActivity.map((activity, idx) => (
              <div key={idx} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary-50 flex items-center justify-center">
                  <Clock className="h-4 w-4 text-primary-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700">{activity.description}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {timeAgo(activity.date)}
                  </p>
                </div>
                {activity.type && (
                  <Badge color="blue" size="sm">
                    {activity.type.replace('_', ' ')}
                  </Badge>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400 py-8 text-center">
            No recent activity to show
          </p>
        )}
      </Card>
    </div>
  );
}
