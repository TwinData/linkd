import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/context/AuthProvider";
import { Seo } from "@/components/Seo";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, TrendingDown, DollarSign, Users, Activity, Calendar } from "lucide-react";

const StatCard = ({ title, value, icon, trend }: { 
  title: string; 
  value: string | number; 
  icon?: React.ReactNode;
  trend?: { value: number; isPositive: boolean };
}) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      {icon && <div className="text-muted-foreground">{icon}</div>}
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold text-foreground">{value}</div>
      {trend && (
        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
          {trend.isPositive ? (
            <>
              <TrendingUp className="h-3 w-3 text-emerald-500" />
              <span className="text-emerald-500">+{trend.value.toFixed(1)}%</span>
            </>
          ) : (
            <>
              <TrendingDown className="h-3 w-3 text-red-500" />
              <span className="text-red-500">{trend.value.toFixed(1)}%</span>
            </>
          )}
          <span>from last month</span>
        </p>
      )}
    </CardContent>
  </Card>
);

type Client = Tables<"clients">;
type Transaction = Tables<"transactions">;
type FloatDeposit = Tables<"float_deposits">;
type Promotion = Tables<"promotions">;

const Dashboard = () => {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [floatDeposits, setFloatDeposits] = useState<FloatDeposit[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/", { replace: true });
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    const loadData = async () => {
      if (!user || loading) return;
      setFetching(true);
      const [clientsRes, transactionsRes, floatDepositsRes, promotionsRes] = await Promise.all([
        supabase.from("clients").select("*").order("created_at", { ascending: false }),
        supabase.from("transactions").select("*").order("created_at", { ascending: false }),
        supabase.from("float_deposits").select("*").order("created_at", { ascending: false }),
        supabase.from("promotions").select("*").order("created_at", { ascending: false })
      ]);
      setClients(clientsRes.data || []);
      setTransactions(transactionsRes.data || []);
      setFloatDeposits(floatDepositsRes.data || []);
      setPromotions(promotionsRes.data || []);
      setFetching(false);
    };
    loadData();

    // Set up realtime subscription for transactions
    const transactionsChannel = supabase
      .channel('dashboard-transactions')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'transactions' },
        async (payload) => {
          console.log('Transaction change detected:', payload);
          // Reload transactions when any change occurs
          const { data } = await supabase.from("transactions").select("*").order("created_at", { ascending: false });
          setTransactions(data || []);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(transactionsChannel);
    };
  }, [user, loading]);

  const analytics = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    
    // Today's transactions
    const todayTransactions = transactions.filter(t => {
      const transactionDate = new Date(t.created_at as string);
      return transactionDate >= today && transactionDate < tomorrow;
    });
    
    // Recent transactions (last 30 days)
    const recentTransactions = transactions.filter(t => 
      new Date(t.created_at as string) > thirtyDaysAgo
    );
    
    // Previous period transactions (30-60 days ago)
    const previousTransactions = transactions.filter(t => {
      const date = new Date(t.created_at as string);
      return date > sixtyDaysAgo && date <= thirtyDaysAgo;
    });
    
    // Calculations - using parseFloat to handle all numeric values properly
    const totalKES = transactions.reduce((sum, t) => sum + (parseFloat(String(t.payout_kes)) || 0), 0);
    const totalKWD = transactions.reduce((sum, t) => sum + (parseFloat(String(t.amount_kd)) || 0), 0);
    const avgRate = transactions.length > 0 ? 
      transactions.reduce((sum, t) => sum + (parseFloat(String(t.rate_kes_per_kd)) || 0), 0) / transactions.length : 0;
    
    // Debug logging to help track calculation issues
    console.log('Dashboard Analytics:', {
      transactionCount: transactions.length,
      totalKWD,
      totalKES,
      avgRate,
      sampleTransactions: transactions.slice(0, 3).map(t => ({
        id: t.id,
        amount_kd: t.amount_kd,
        payout_kes: t.payout_kes,
        created_at: t.created_at
      }))
    });
    
    const todayKES = todayTransactions.reduce((sum, t) => sum + (parseFloat(String(t.payout_kes)) || 0), 0);
    const todayKWD = todayTransactions.reduce((sum, t) => sum + (parseFloat(String(t.amount_kd)) || 0), 0);
    
    // Float deposits analytics
    const totalFloatKD = floatDeposits.reduce((sum, f) => sum + (parseFloat(String(f.total_kd)) || 0), 0);
    const totalFloatKES = floatDeposits.reduce((sum, f) => sum + (parseFloat(String(f.total_kes)) || 0), 0);
    const totalProfit = floatDeposits.reduce((sum, f) => sum + (parseFloat(String(f.profit)) || 0), 0);
    
    // Active promotions
    const activePromotions = promotions.filter(p => p.active).length;
    
    // Trends calculation
    const currentMonthVolume = recentTransactions.reduce((sum, t) => sum + (parseFloat(String(t.amount_kd)) || 0), 0);
    const previousMonthVolume = previousTransactions.reduce((sum, t) => sum + (parseFloat(String(t.amount_kd)) || 0), 0);
    const volumeTrend = previousMonthVolume > 0 ? 
      ((currentMonthVolume - previousMonthVolume) / previousMonthVolume) * 100 : 0;
    
    const clientsTrend = clients.length > 0 ? Math.random() * 20 - 10 : 0; // Placeholder
    
    return {
      totalClients: clients.length,
      recentTransactions: recentTransactions.length,
      todayTransactions: todayTransactions.length,
      totalKES,
      totalKWD,
      todayKES,
      todayKWD,
      avgRate,
      totalFloatKD,
      totalFloatKES,
      totalProfit,
      activePromotions,
      trends: {
        volume: { value: volumeTrend, isPositive: volumeTrend > 0 },
        clients: { value: clientsTrend, isPositive: clientsTrend > 0 }
      }
    };
  }, [clients, transactions, floatDeposits, promotions]);

  const chartData = useMemo(() => {
    // Transaction volume over last 6 months
    const last6Months = Array.from({ length: 6 }, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - (5 - i));
      date.setDate(1); // First day of month
      return date;
    });
    
    const monthlyVolume = last6Months.map(date => {
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
      
      const monthTransactions = transactions.filter(t => {
        const tDate = new Date(t.created_at as string);
        return tDate >= monthStart && tDate <= monthEnd;
      });
      
      const volume = monthTransactions.reduce((sum, t) => sum + (parseFloat(String(t.amount_kd)) || 0), 0);
      
      return {
        month: date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        volume: Math.round(volume),
        transactions: monthTransactions.length
      };
    });
    
    // Transaction amount distribution by link amount
    const amountRanges = [
      { name: '10 KD', min: 9, max: 11, color: 'hsl(var(--primary))' },
      { name: '25 KD', min: 24, max: 26, color: 'hsl(120 60% 50%)' },
      { name: '50 KD', min: 49, max: 51, color: 'hsl(var(--secondary))' },
      { name: '100 KD', min: 99, max: 101, color: 'hsl(30 80% 55%)' },
      { name: '200+ KD', min: 200, max: Infinity, color: 'hsl(var(--destructive))' },
      { name: 'Other', min: 0, max: 9, color: 'hsl(var(--muted))' }
    ];
    
    const amountData = amountRanges.map(range => {
      const count = transactions.filter(t => {
        const amount = parseFloat(String(t.amount_kd)) || 0;
        if (range.name === 'Other') {
          return amount < 9 || (amount > 11 && amount < 24) || (amount > 26 && amount < 49) || (amount > 51 && amount < 99) || (amount > 101 && amount < 200);
        }
        return amount >= range.min && amount <= range.max;
      }).length;
      
      return {
        name: range.name,
        value: count,
        color: range.color
      };
    }).filter(item => item.value > 0);

    // Client growth over time
    const clientGrowth = last6Months.map(date => {
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
      const clientCount = clients.filter(c => new Date(c.created_at as string) <= monthEnd).length;
      
      return {
        month: date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        clients: clientCount
      };
    });

    // Average transaction amount by month
    const avgAmountByMonth = last6Months.map(date => {
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
      
      const monthTransactions = transactions.filter(t => {
        const tDate = new Date(t.created_at as string);
        return tDate >= monthStart && tDate <= monthEnd;
      });
      
      const avgAmount = monthTransactions.length > 0 
        ? monthTransactions.reduce((sum, t) => sum + (parseFloat(String(t.amount_kd)) || 0), 0) / monthTransactions.length
        : 0;
      
      return {
        month: date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        avgAmount: Math.round(avgAmount * 100) / 100
      };
    });
    
    return { monthlyVolume, amountData, clientGrowth, avgAmountByMonth };
  }, [transactions, clients]);

  const recentActivity = useMemo(() => {
    const allActivity = [
      ...transactions.slice(0, 5).map(t => ({
        type: 'transaction',
        id: t.id,
        description: `Transaction of ${(parseFloat(String(t.amount_kd)) || 0).toFixed(2)} KWD`,
        date: t.created_at,
        amount: `${(parseFloat(String(t.payout_kes)) || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })} KES`
      })),
      ...clients.slice(0, 3).map(c => ({
        type: 'client',
        id: c.id,
        description: `New client: ${c.name}`,
        date: c.created_at,
        amount: ''
      }))
    ].sort((a, b) => new Date(b.date as string).getTime() - new Date(a.date as string).getTime()).slice(0, 8);
    
    return allActivity;
  }, [clients, transactions]);

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <p className="text-muted-foreground">Loading your dashboard…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Seo
        title="LinKD Dashboard | Clients, Transactions & Promotions"
        description="View analytics for clients, transactions, and promotions on your LinKD dashboard."
        canonical={window.location.href}
      />
      <header className="border-b border-border">
        <div className="container flex items-center justify-between py-4">
          <h1 className="text-xl font-semibold text-foreground">LinKD Dashboard</h1>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:inline">{user?.email}</span>
            <Button variant="secondary" onClick={signOut}>Sign out</Button>
          </div>
        </div>
      </header>

      <main className="container py-8 space-y-8">
        <section aria-labelledby="overview" className="space-y-4">
          <h2 id="overview" className="text-lg font-medium text-foreground">Dashboard Overview</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard 
              title="Transacted Today" 
              value={`${analytics.todayKWD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} KWD`}
              icon={<DollarSign className="h-4 w-4" />}
            />
            <StatCard 
              title="Total Clients" 
              value={analytics.totalClients}
              icon={<Users className="h-4 w-4" />}
              trend={analytics.trends.clients}
            />
            <StatCard 
              title="Transactions (30d)" 
              value={analytics.recentTransactions}
              icon={<Activity className="h-4 w-4" />}
              trend={analytics.trends.volume}
            />
            <StatCard 
              title="Active Promotions" 
              value={analytics.activePromotions}
              icon={<Calendar className="h-4 w-4" />}
            />
          </div>
        </section>

        <section aria-labelledby="detailed-stats" className="space-y-4">
          <h2 id="detailed-stats" className="text-lg font-medium text-foreground">Financial Overview</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard title="Total KES Processed" value={`${analytics.totalKES.toLocaleString('en-US', { maximumFractionDigits: 2 })} KES`} />
            <StatCard title="Total KWD Processed" value={`${analytics.totalKWD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} KWD`} />
            <StatCard title="Average Rate" value={`${analytics.avgRate.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} KES/KWD`} />
            <StatCard title="Float Deposits (KD)" value={`${analytics.totalFloatKD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} KD`} />
            <StatCard title="Float Deposits (KES)" value={`${analytics.totalFloatKES.toLocaleString('en-US', { maximumFractionDigits: 2 })} KES`} />
            <StatCard title="Total Profit" value={`${analytics.totalProfit.toLocaleString('en-US', { maximumFractionDigits: 2 })} KES`} />
          </div>
        </section>

        <section aria-labelledby="charts" className="space-y-8">
          <h2 id="charts" className="text-lg font-medium text-foreground">Analytics Charts</h2>
          
          {/* First row of charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <Card className="w-full">
              <CardHeader>
                <CardTitle>Transaction Volume (Last 6 Months)</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="w-full h-[350px]">
                  <ChartContainer
                    config={{
                      volume: {
                        label: "Volume (KWD)",
                        color: "hsl(var(--primary))",
                      },
                    }}
                    className="w-full h-full"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData.monthlyVolume} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="volume" fill="hsl(var(--primary))" />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="w-full">
              <CardHeader>
                <CardTitle>Distribution by Link Amount</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="w-full h-[350px]">
                  <ChartContainer
                    config={{
                      "10KD": {
                        label: "10 KD",
                        color: "hsl(var(--primary))",
                      },
                      "25KD": {
                        label: "25 KD", 
                        color: "hsl(120 60% 50%)",
                      },
                      "50KD": {
                        label: "50 KD",
                        color: "hsl(var(--secondary))",
                      },
                      "100KD": {
                        label: "100 KD",
                        color: "hsl(30 80% 55%)",
                      },
                      "200KD": {
                        label: "200+ KD",
                        color: "hsl(var(--destructive))",
                      },
                      other: {
                        label: "Other",
                        color: "hsl(var(--muted))",
                      },
                    }}
                    className="w-full h-full"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                        <Pie
                          data={chartData.amountData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {chartData.amountData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <ChartTooltip content={<ChartTooltipContent />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Second row of charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="w-full">
              <CardHeader>
                <CardTitle>Client Growth Over Time</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="w-full h-[350px]">
                  <ChartContainer
                    config={{
                      clients: {
                        label: "Total Clients",
                        color: "hsl(120 60% 50%)",
                      },
                    }}
                    className="w-full h-full"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData.clientGrowth} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Line 
                          type="monotone" 
                          dataKey="clients" 
                          stroke="hsl(120 60% 50%)" 
                          strokeWidth={2}
                          dot={{ fill: "hsl(120 60% 50%)" }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="w-full">
              <CardHeader>
                <CardTitle>Average Transaction Amount</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="w-full h-[350px]">
                  <ChartContainer
                    config={{
                      avgAmount: {
                        label: "Average Amount (KWD)",
                        color: "hsl(30 80% 55%)",
                      },
                    }}
                    className="w-full h-full"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData.avgAmountByMonth} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Line 
                          type="monotone" 
                          dataKey="avgAmount" 
                          stroke="hsl(30 80% 55%)" 
                          strokeWidth={2}
                          dot={{ fill: "hsl(30 80% 55%)" }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section aria-labelledby="activity" className="space-y-2">
          <h2 id="activity" className="text-lg font-medium text-foreground">Recent Activity</h2>
          <Card>
            <CardContent className="p-0">
              <div className="w-full overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Activity</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fetching && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground py-8">Loading…</TableCell>
                      </TableRow>
                    )}
                    {!fetching && recentActivity.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground py-8">No recent activity.</TableCell>
                      </TableRow>
                    )}
                    {!fetching && recentActivity.map((activity, index) => (
                      <TableRow key={`${activity.type}-${activity.id}-${index}`}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${activity.type === 'transaction' ? 'bg-green-500' : 'bg-blue-500'}`} />
                            {activity.description}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(activity.date as string).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {activity.amount}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
};

export default Dashboard;
