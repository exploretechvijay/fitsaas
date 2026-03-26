import { useState, useEffect, useCallback } from 'react';
import {
  BarChart3,
  Download,
  Calendar,
  Users,
  IndianRupee,
  CreditCard,
  AlertCircle,
} from 'lucide-react';
import {
  BarChart,
  Bar,
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
import toast from 'react-hot-toast';
import { reportsApi } from '../api/endpoints';
import { formatCurrency, formatNumber } from '../utils/formatters';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import StatsCard from '../components/ui/StatsCard';
import LoadingSpinner from '../components/ui/LoadingSpinner';

const TABS = ['Member Report', 'Revenue Report', 'Subscription Report'];
const PIE_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

export default function Reports() {
  const [activeTab, setActiveTab] = useState('Member Report');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Data
  const [memberReport, setMemberReport] = useState(null);
  const [revenueReport, setRevenueReport] = useState(null);
  const [subscriptionReport, setSubscriptionReport] = useState(null);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      if (activeTab === 'Member Report') {
        const res = await reportsApi.members(params);
        setMemberReport(res.data.data);
      } else if (activeTab === 'Revenue Report') {
        const res = await reportsApi.revenue(params);
        setRevenueReport(res.data.data);
      } else {
        const res = await reportsApi.subscriptions();
        setSubscriptionReport(res.data.data);
      }
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to load report';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [activeTab, startDate, endDate]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const exportCSV = () => {
    let csvContent = '';
    let filename = '';

    if (activeTab === 'Member Report' && memberReport) {
      filename = 'member_report.csv';
      const rows = memberReport.monthly_data || memberReport.monthlyData || memberReport.data || [];
      if (rows.length > 0) {
        csvContent = Object.keys(rows[0]).join(',') + '\n';
        rows.forEach((row) => {
          csvContent += Object.values(row).join(',') + '\n';
        });
      }
    } else if (activeTab === 'Revenue Report' && revenueReport) {
      filename = 'revenue_report.csv';
      const rows = revenueReport.monthly_data || revenueReport.monthlyData || revenueReport.data || [];
      if (rows.length > 0) {
        csvContent = Object.keys(rows[0]).join(',') + '\n';
        rows.forEach((row) => {
          csvContent += Object.values(row).join(',') + '\n';
        });
      }
    } else if (activeTab === 'Subscription Report' && subscriptionReport) {
      filename = 'subscription_report.csv';
      const rows = subscriptionReport.plan_distribution || subscriptionReport.planDistribution || subscriptionReport.data || [];
      if (rows.length > 0) {
        csvContent = Object.keys(rows[0]).join(',') + '\n';
        rows.forEach((row) => {
          csvContent += Object.values(row).join(',') + '\n';
        });
      }
    }

    if (!csvContent) {
      toast.error('No data to export');
      return;
    }

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Report exported');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-sm text-gray-500 mt-1">
            Track key metrics and performance
          </p>
        </div>
        <Button variant="secondary" icon={Download} onClick={exportCSV}>
          Export CSV
        </Button>
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

      {/* Date Range Filter */}
      {(activeTab === 'Member Report' || activeTab === 'Revenue Report') && (
        <Card>
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Calendar className="inline h-3.5 w-3.5 mr-1" />
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none cursor-pointer"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none cursor-pointer"
              />
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setStartDate('');
                setEndDate('');
              }}
            >
              Clear
            </Button>
          </div>
        </Card>
      )}

      {/* Content */}
      {loading ? (
        <LoadingSpinner text="Loading report..." />
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <AlertCircle className="h-12 w-12 text-red-400 mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Failed to load report</h2>
          <p className="text-sm text-gray-500 mb-4">{error}</p>
          <Button onClick={fetchReport}>Retry</Button>
        </div>
      ) : (
        <>
          {/* Member Report */}
          {activeTab === 'Member Report' && memberReport && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatsCard
                  label="Total Members"
                  value={formatNumber(memberReport.total_members ?? memberReport.totalMembers)}
                  icon={Users}
                />
                <StatsCard
                  label="Active Members"
                  value={formatNumber(memberReport.active_members ?? memberReport.activeMembers)}
                  icon={Users}
                  iconColor="text-emerald-500"
                  iconBg="bg-emerald-50"
                />
                <StatsCard
                  label="New This Period"
                  value={formatNumber(memberReport.new_members ?? memberReport.newMembers)}
                  icon={Users}
                  iconColor="text-blue-500"
                  iconBg="bg-blue-50"
                />
                <StatsCard
                  label="Churned"
                  value={formatNumber(memberReport.churned_members ?? memberReport.churnedMembers)}
                  icon={Users}
                  iconColor="text-red-500"
                  iconBg="bg-red-50"
                />
              </div>

              <Card>
                <Card.Header>
                  <Card.Title>Member Growth Trend</Card.Title>
                </Card.Header>
                {(memberReport.monthly_data || memberReport.monthlyData || []).length > 0 ? (
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={memberReport.monthly_data || memberReport.monthlyData}>
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
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="new_members" fill="#6366f1" name="New Members" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="churned" fill="#ef4444" name="Churned" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-gray-400 py-12 text-center">
                    No data available for the selected period
                  </p>
                )}
              </Card>

              <Card>
                <Card.Header>
                  <Card.Title>Gender Distribution</Card.Title>
                </Card.Header>
                {(memberReport.gender_distribution || memberReport.genderDistribution || []).length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={memberReport.gender_distribution || memberReport.genderDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={4}
                        dataKey="value"
                        nameKey="name"
                      >
                        {(memberReport.gender_distribution || memberReport.genderDistribution).map((entry, idx) => (
                          <Cell key={entry.name} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend iconType="circle" iconSize={8} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-gray-400 py-12 text-center">
                    No data available
                  </p>
                )}
              </Card>
            </div>
          )}

          {/* Revenue Report */}
          {activeTab === 'Revenue Report' && revenueReport && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatsCard
                  label="Total Revenue"
                  value={formatCurrency(revenueReport.total_revenue ?? revenueReport.totalRevenue)}
                  icon={IndianRupee}
                />
                <StatsCard
                  label="This Month"
                  value={formatCurrency(revenueReport.this_month_revenue ?? revenueReport.thisMonthRevenue)}
                  icon={IndianRupee}
                  iconColor="text-emerald-500"
                  iconBg="bg-emerald-50"
                  change={revenueReport.revenue_change ?? revenueReport.revenueChange}
                  changeLabel="vs last month"
                />
                <StatsCard
                  label="Average Per Member"
                  value={formatCurrency(revenueReport.avg_per_member ?? revenueReport.avgPerMember)}
                  icon={IndianRupee}
                  iconColor="text-blue-500"
                  iconBg="bg-blue-50"
                />
                <StatsCard
                  label="Pending Payments"
                  value={formatNumber(revenueReport.pending_payments ?? revenueReport.pendingPayments)}
                  icon={CreditCard}
                  iconColor="text-amber-500"
                  iconBg="bg-amber-50"
                />
              </div>

              <Card>
                <Card.Header>
                  <Card.Title>Revenue Trend</Card.Title>
                </Card.Header>
                {(revenueReport.monthly_data || revenueReport.monthlyData || []).length > 0 ? (
                  <ResponsiveContainer width="100%" height={350}>
                    <LineChart data={revenueReport.monthly_data || revenueReport.monthlyData}>
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
                        tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                      />
                      <Tooltip formatter={(v) => formatCurrency(v)} />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="revenue"
                        stroke="#6366f1"
                        strokeWidth={2.5}
                        dot={{ r: 4, fill: '#6366f1' }}
                        name="Revenue"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-gray-400 py-12 text-center">
                    No data available for the selected period
                  </p>
                )}
              </Card>

              <Card>
                <Card.Header>
                  <Card.Title>Revenue by Payment Method</Card.Title>
                </Card.Header>
                {(revenueReport.by_method || revenueReport.byMethod || []).length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={revenueReport.by_method || revenueReport.byMethod}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={4}
                        dataKey="value"
                        nameKey="name"
                      >
                        {(revenueReport.by_method || revenueReport.byMethod).map((entry, idx) => (
                          <Cell key={entry.name} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => formatCurrency(v)} />
                      <Legend iconType="circle" iconSize={8} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-gray-400 py-12 text-center">
                    No data available
                  </p>
                )}
              </Card>
            </div>
          )}

          {/* Subscription Report */}
          {activeTab === 'Subscription Report' && subscriptionReport && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatsCard
                  label="Total Subscriptions"
                  value={formatNumber(subscriptionReport.total_subscriptions ?? subscriptionReport.totalSubscriptions)}
                  icon={CreditCard}
                />
                <StatsCard
                  label="Active"
                  value={formatNumber(subscriptionReport.active_subscriptions ?? subscriptionReport.activeSubscriptions)}
                  icon={CreditCard}
                  iconColor="text-emerald-500"
                  iconBg="bg-emerald-50"
                />
                <StatsCard
                  label="Expiring (30d)"
                  value={formatNumber(subscriptionReport.expiring_count ?? subscriptionReport.expiringCount)}
                  icon={CreditCard}
                  iconColor="text-amber-500"
                  iconBg="bg-amber-50"
                />
                <StatsCard
                  label="Renewal Rate"
                  value={`${subscriptionReport.renewal_rate ?? subscriptionReport.renewalRate ?? 0}%`}
                  icon={CreditCard}
                  iconColor="text-blue-500"
                  iconBg="bg-blue-50"
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <Card.Header>
                    <Card.Title>Plan Distribution</Card.Title>
                  </Card.Header>
                  {(subscriptionReport.plan_distribution || subscriptionReport.planDistribution || []).length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={subscriptionReport.plan_distribution || subscriptionReport.planDistribution}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={4}
                          dataKey="value"
                          nameKey="name"
                        >
                          {(subscriptionReport.plan_distribution || subscriptionReport.planDistribution).map((entry, idx) => (
                            <Cell key={entry.name} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend iconType="circle" iconSize={8} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-sm text-gray-400 py-12 text-center">
                      No data available
                    </p>
                  )}
                </Card>

                <Card>
                  <Card.Header>
                    <Card.Title>Status Breakdown</Card.Title>
                  </Card.Header>
                  {(subscriptionReport.status_breakdown || subscriptionReport.statusBreakdown || []).length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={subscriptionReport.status_breakdown || subscriptionReport.statusBreakdown} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis
                          type="number"
                          tick={{ fontSize: 12, fill: '#94a3b8' }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          type="category"
                          dataKey="name"
                          tick={{ fontSize: 12, fill: '#94a3b8' }}
                          axisLine={false}
                          tickLine={false}
                          width={80}
                        />
                        <Tooltip />
                        <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-sm text-gray-400 py-12 text-center">
                      No data available
                    </p>
                  )}
                </Card>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
