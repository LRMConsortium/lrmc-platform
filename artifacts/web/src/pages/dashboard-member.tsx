import { useGetMemberDashboard, getGetMemberDashboardQueryKey } from "@workspace/api-client-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Building2, Car, MessageSquare, Ticket, ShieldCheck, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Link } from "wouter"
import { formatMoney } from "@/lib/utils"

export function DashboardMember() {
  const { data: dash } = useGetMemberDashboard({ query: { queryKey: getGetMemberDashboardQueryKey() } })

  if (!dash) return <div className="animate-pulse space-y-4">
    <div className="h-12 w-64 bg-muted rounded"></div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {[1,2,3,4].map(i => <div key={i} className="h-32 bg-muted rounded"></div>)}
    </div>
  </div>

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-primary text-primary-foreground p-6 rounded-xl shadow-lg relative overflow-hidden">
        <div className="absolute -right-8 -top-8 text-primary-foreground/10">
          <ShieldCheck className="w-48 h-48" />
        </div>
        <div className="relative z-10">
          <h1 className="text-3xl font-serif font-bold">Welcome Back</h1>
          <p className="text-primary-foreground/80 mt-1 text-lg">Your LRMC Member Dashboard</p>
        </div>
        
        <div className="relative z-10 bg-background/10 backdrop-blur border border-primary-foreground/20 p-4 rounded-lg flex items-center gap-4">
          <div>
            <p className="text-xs text-primary-foreground/80 uppercase font-bold tracking-wider">Membership Status</p>
            <div className="flex items-center gap-2 mt-1">
              <div className={`h-2.5 w-2.5 rounded-full ${dash.membership?.status === 'active' ? 'bg-emerald-400' : 'bg-amber-400'}`}></div>
              <span className="font-semibold text-lg capitalize">{dash.membership?.status || 'None'}</span>
            </div>
          </div>
          {dash.membership?.type && (
            <div className="pl-4 border-l border-primary-foreground/20">
              <p className="text-xs text-primary-foreground/80 uppercase font-bold tracking-wider">Tier</p>
              <p className="font-semibold text-lg capitalize mt-1">{dash.membership.type}</p>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:border-primary/50 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Properties</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dash.propertyListingsCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Active listings</p>
          </CardContent>
        </Card>
        
        <Card className="hover:border-primary/50 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Ususu Rides</CardTitle>
            <Car className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dash.rideCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Total rides booked</p>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/50 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Messages</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dash.unreadMessages}</div>
            <p className="text-xs text-muted-foreground mt-1">Unread messages</p>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/50 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Support</CardTitle>
            <Ticket className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dash.openTickets}</div>
            <p className="text-xs text-muted-foreground mt-1">Open tickets</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <Link href="/properties">
              <Button variant="outline" className="w-full justify-between h-auto py-4">
                <div className="flex flex-col items-start gap-1">
                  <span className="font-semibold">List Property</span>
                  <span className="text-xs text-muted-foreground font-normal">Add house or vehicle</span>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </Button>
            </Link>
            <Link href="/mobility">
              <Button variant="outline" className="w-full justify-between h-auto py-4">
                <div className="flex flex-col items-start gap-1">
                  <span className="font-semibold">Book Ride</span>
                  <span className="text-xs text-muted-foreground font-normal">Ususu Mobility</span>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </Button>
            </Link>
            <Link href="/marketplace">
              <Button variant="outline" className="w-full justify-between h-auto py-4">
                <div className="flex flex-col items-start gap-1">
                  <span className="font-semibold">Marketplace</span>
                  <span className="text-xs text-muted-foreground font-normal">Browse goods</span>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </Button>
            </Link>
            <Link href="/tickets">
              <Button variant="outline" className="w-full justify-between h-auto py-4">
                <div className="flex flex-col items-start gap-1">
                  <span className="font-semibold">Get Support</span>
                  <span className="text-xs text-muted-foreground font-normal">Open a ticket</span>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </Button>
            </Link>
          </CardContent>
        </Card>
        
        <Card className="bg-secondary/10 border-secondary/20">
          <CardHeader>
            <CardTitle>Consortium Notice</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-4">
            <p>Welcome to the new digital portal. All transactions are settled via the central treasury in GMD or USD equivalents.</p>
            <p className="font-semibold">Need to upgrade your membership?</p>
            <Link href="/memberships">
              <Button className="w-full">View Tiers</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
