import { useGetMemberDashboard, getGetMemberDashboardQueryKey } from "@workspace/api-client-react";
import { useAuth } from "@workspace/replit-auth-web";
import { Loader2, ArrowRight, Wallet, Home, Car, MessageSquare, CreditCard, Ticket } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";

export function MemberDashboardPage() {
  const { user } = useAuth();
  const { data: dashboard, isLoading, error } = useGetMemberDashboard(
    { userId: user?.id || "" },
    { query: { enabled: !!user?.id, queryKey: getGetMemberDashboardQueryKey({ userId: user?.id || "" }) } }
  );

  if (isLoading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin w-8 h-8 text-primary" /></div>;
  if (error || !dashboard) return <div className="p-8 text-destructive">Failed to load dashboard data.</div>;

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-serif font-bold text-foreground">Welcome back, {user?.firstName}</h1>
        <p className="text-muted-foreground mt-2">Here's your LRMC portal overview.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-primary text-primary-foreground border-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              <Home className="w-5 h-5" /> Active Assets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{dashboard.assetsCount}</div>
            <Link href="/assets" className="text-sm text-primary-foreground/80 hover:text-white mt-4 inline-flex items-center">
              Manage assets <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </CardContent>
        </Card>

        <Card className="bg-secondary text-secondary-foreground border-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              <Car className="w-5 h-5" /> Ususu Rides
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{dashboard.ridesCount}</div>
            <Link href="/ususu" className="text-sm text-secondary-foreground/80 hover:text-white mt-4 inline-flex items-center">
              View history <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-muted-foreground" /> Unread Messages
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{dashboard.unreadMessages}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              <Ticket className="w-5 h-5 text-muted-foreground" /> Open Tickets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{dashboard.openTickets}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Memberships */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle>My Memberships</CardTitle>
            <Link href="/memberships">
              <Button variant="ghost" size="sm">View All</Button>
            </Link>
          </CardHeader>
          <CardContent>
            {dashboard.memberships.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <p>No active memberships.</p>
                <Button variant="outline" className="mt-4">Apply Now</Button>
              </div>
            ) : (
              <div className="space-y-4">
                {dashboard.memberships.map(m => (
                  <div key={m.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <div className="font-medium capitalize">{m.type.replace('_', ' ')}</div>
                      <div className="text-sm text-muted-foreground">Joined {new Date(m.createdAt).toLocaleDateString()}</div>
                    </div>
                    <Badge variant={m.status === 'active' ? 'default' : 'secondary'}>{m.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Payments */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle>Recent Payments</CardTitle>
            <Link href="/payments">
              <Button variant="ghost" size="sm">History</Button>
            </Link>
          </CardHeader>
          <CardContent>
            {dashboard.recentPayments.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <p>No recent payments.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {dashboard.recentPayments.map(p => (
                  <div key={p.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-muted rounded-full">
                        <Wallet className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div>
                        <div className="font-medium capitalize">{p.category}</div>
                        <div className="text-sm text-muted-foreground">{new Date(p.createdAt).toLocaleDateString()}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">{p.currency} {p.amount.toLocaleString()}</div>
                      <Badge variant="outline" className="text-xs">{p.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
