import { useGetAdminDashboard } from "@workspace/api-client-react";
import { Loader2, Users, Building, Map, HardHat, Car, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function AdminDashboardPage() {
  const { data: dashboard, isLoading, error } = useGetAdminDashboard();

  if (isLoading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin w-8 h-8 text-primary" /></div>;
  if (error || !dashboard) return <div className="p-8 text-destructive">Failed to load admin dashboard data.</div>;

  const { treasury } = dashboard;

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Operations Control</h1>
          <p className="text-muted-foreground mt-2">Institutional overview for LRMC network.</p>
        </div>
        <div className="text-right">
          <div className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Reserve Ratio</div>
          <div className="text-3xl font-bold text-accent">{(treasury.reserveRatio * 100).toFixed(1)}%</div>
        </div>
      </div>

      {/* Treasury High-level */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-sidebar border-none text-sidebar-foreground">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-sidebar-foreground/70">Total USD Reserve</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">${treasury.totalUsdReserve.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card className="bg-sidebar border-none text-sidebar-foreground">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-sidebar-foreground/70">Operational (GMD)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">D {treasury.totalGmdOperational.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Settlements</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{treasury.pendingSettlementsTotal}</div>
          </CardContent>
        </Card>

        <Card className={treasury.openRiskEvents > 0 ? "border-destructive/50 bg-destructive/5" : ""}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Open Risk Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${treasury.openRiskEvents > 0 ? "text-destructive" : ""}`}>
              {treasury.openRiskEvents}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Operations Metrics */}
      <h2 className="text-2xl font-serif font-bold pt-6 border-t">Sector Performance</h2>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <MetricCard icon={<Users className="w-5 h-5" />} label="Members" value={dashboard.totalMembers} />
        <MetricCard icon={<Building className="w-5 h-5" />} label="Assets" value={dashboard.totalAssets} />
        <MetricCard icon={<Map className="w-5 h-5" />} label="Land Listings" value={dashboard.totalLandListings} />
        <MetricCard icon={<HardHat className="w-5 h-5" />} label="Projects" value={dashboard.totalConstructionProjects} />
        <MetricCard icon={<Car className="w-5 h-5" />} label="Active Drivers" value={dashboard.activeDrivers} />
        <MetricCard icon={<TrendingUp className="w-5 h-5" />} label="Rides Today" value={dashboard.ridesCompletedToday} />
      </div>

      {/* Recent Treasury Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Treasury Movement</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {treasury.recentTransactions.slice(0, 5).map(tx => (
              <div key={tx.id} className="flex items-center justify-between p-4 border rounded-lg bg-card">
                <div>
                  <div className="font-medium">{tx.description}</div>
                  <div className="text-sm text-muted-foreground capitalize">{tx.category} • {tx.type}</div>
                </div>
                <div className="text-right">
                  <div className={`font-bold ${tx.type === 'credit' ? 'text-primary' : ''}`}>
                    {tx.type === 'credit' ? '+' : '-'} {tx.amount.toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground">{new Date(tx.createdAt).toLocaleDateString()}</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({ icon, label, value }: { icon: React.ReactNode, label: string, value: number }) {
  return (
    <Card className="border shadow-sm">
      <CardContent className="p-4 flex flex-col items-center justify-center text-center">
        <div className="mb-2 text-primary">{icon}</div>
        <div className="text-2xl font-bold">{value}</div>
        <div className="text-xs text-muted-foreground mt-1 uppercase font-medium tracking-wide">{label}</div>
      </CardContent>
    </Card>
  );
}
