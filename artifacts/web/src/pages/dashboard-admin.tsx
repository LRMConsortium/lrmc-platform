import { useGetAdminDashboard, getGetAdminDashboardQueryKey } from "@workspace/api-client-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Building2, Map, Car, Store, GraduationCap, AlertTriangle, Landmark, FileText, Ticket } from "lucide-react"
import { formatMoney, formatUSD } from "@/lib/utils"

export function DashboardAdmin() {
  const { data: dash } = useGetAdminDashboard({ query: { queryKey: getGetAdminDashboardQueryKey() } })

  if (!dash) return <div className="animate-pulse space-y-4">
    <div className="h-12 w-64 bg-muted rounded"></div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {[1,2,3,4,5,6,7,8].map(i => <div key={i} className="h-32 bg-muted rounded"></div>)}
    </div>
  </div>

  const stats = [
    { title: "Total Members", value: dash.totalMembers, icon: Users, color: "text-blue-600", desc: `${dash.pendingMemberships} pending` },
    { title: "Land Listings", value: dash.totalLandListings, icon: Map, color: "text-emerald-600" },
    { title: "Construction Projects", value: dash.totalConstructionProjects, icon: Building2, color: "text-orange-600" },
    { title: "Ususu Drivers", value: dash.totalDrivers, icon: Car, color: "text-slate-600", desc: `${dash.activeRides} active rides` },
    { title: "Marketplace Items", value: dash.totalMarketplaceListings, icon: Store, color: "text-pink-600" },
    { title: "Youth Records", value: dash.totalYouthRecords, icon: GraduationCap, color: "text-purple-600" },
    { title: "Prospect Leads", value: dash.totalProspectLeads, icon: Users, color: "text-cyan-600" },
    { title: "Open Support Tickets", value: dash.openTickets, icon: Ticket, color: "text-rose-600" },
    { title: "Open Risk Events", value: dash.openRiskEvents, icon: AlertTriangle, color: "text-red-600" },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-serif font-bold text-foreground">Institution Overview</h1>
        <p className="text-muted-foreground mt-1 text-lg">Central command for LRMC operations.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <Card key={i} className="border-none shadow-md overflow-hidden relative group">
            <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform ${stat.color}`}>
              <stat.icon className="w-16 h-16" />
            </div>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{stat.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-serif">{stat.value}</div>
              {stat.desc && <p className="text-xs text-muted-foreground mt-1 font-medium">{stat.desc}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-8">
        <h2 className="text-xl font-serif font-bold mb-4 flex items-center gap-2">
          <Landmark className="h-5 w-5 text-primary" />
          Treasury Summary
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="bg-primary text-primary-foreground">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-primary-foreground/80 uppercase tracking-wider">USD Reserves</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-serif">{formatUSD(dash.treasurySummary.totalUsdReservesCents)}</div>
            </CardContent>
          </Card>
          
          <Card className="bg-secondary text-secondary-foreground">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-secondary-foreground/80 uppercase tracking-wider">GMD Operational</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-serif">{formatMoney(dash.treasurySummary.totalGmdOperationalCents)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Exchange Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-serif">{dash.treasurySummary.latestRate?.rate.toFixed(2) || "N/A"}</div>
              <p className="text-xs text-muted-foreground mt-1 font-medium">GMD per 1 USD</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
