import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import { AppLayout } from '@/components/layout/AppLayout';
import Home from '@/pages/home';
import { MemberDashboardPage } from '@/pages/member/dashboard';
import { AdminDashboardPage } from '@/pages/admin/dashboard';
import { TreasuryConsole } from '@/pages/admin/treasury';
import { MembershipsPage } from '@/pages/memberships';
import { AssetsPage } from '@/pages/assets';
import { LandPage } from '@/pages/land';
import { ConstructionPage } from '@/pages/construction';
import { UsusuPage } from '@/pages/ususu';
import { MarketplacePage } from '@/pages/marketplace';
import { DigitalStorePage } from '@/pages/store';
import { YouthEmploymentPage } from '@/pages/youth';
import { AdsPage } from '@/pages/ads';
import { PaymentsPage } from '@/pages/payments';
import { ProfilePage } from '@/pages/profile';
import { ProspectsPage } from '@/pages/admin/prospects';
import { InternalMessagesPage } from '@/pages/admin/messages';
import { InternalTicketsPage } from '@/pages/admin/tickets';
import { useAuth } from '@workspace/replit-auth-web';
import { Loader2 } from 'lucide-react';

const queryClient = new QueryClient();

function ProtectedRoute({ component: Component, adminOnly = false }: { component: any, adminOnly?: boolean }) {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    // Return an empty div because useAuth() redirects to /api/login automatically
    return <div />;
  }

  if (adminOnly && user?.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] space-y-4 text-center">
        <h2 className="text-2xl font-bold">Access Denied</h2>
        <p className="text-muted-foreground">You don't have permission to view this page.</p>
      </div>
    );
  }

  return <Component />;
}

function DashboardRouter() {
  const { user } = useAuth();
  if (user?.role === 'admin') {
    return <AdminDashboardPage />;
  }
  return <MemberDashboardPage />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      
      <Route path="/dashboard">
        {() => <ProtectedRoute component={DashboardRouter} />}
      </Route>

      <Route path="/memberships">
        {() => <ProtectedRoute component={MembershipsPage} />}
      </Route>

      <Route path="/assets">
        {() => <ProtectedRoute component={AssetsPage} />}
      </Route>

      <Route path="/land">
        {() => <ProtectedRoute component={LandPage} />}
      </Route>

      <Route path="/construction">
        {() => <ProtectedRoute component={ConstructionPage} />}
      </Route>

      <Route path="/ususu">
        {() => <ProtectedRoute component={UsusuPage} />}
      </Route>

      <Route path="/marketplace">
        {() => <ProtectedRoute component={MarketplacePage} />}
      </Route>

      <Route path="/store">
        {() => <ProtectedRoute component={DigitalStorePage} />}
      </Route>

      <Route path="/youth">
        {() => <ProtectedRoute component={YouthEmploymentPage} />}
      </Route>

      <Route path="/ads">
        {() => <ProtectedRoute component={AdsPage} />}
      </Route>

      <Route path="/payments">
        {() => <ProtectedRoute component={PaymentsPage} />}
      </Route>

      <Route path="/profile">
        {() => <ProtectedRoute component={ProfilePage} />}
      </Route>

      {/* Admin specific */}
      <Route path="/treasury">
        {() => <ProtectedRoute component={TreasuryConsole} adminOnly />}
      </Route>
      <Route path="/prospects">
        {() => <ProtectedRoute component={ProspectsPage} adminOnly />}
      </Route>
      <Route path="/messages">
        {() => <ProtectedRoute component={InternalMessagesPage} adminOnly />}
      </Route>
      <Route path="/tickets">
        {() => <ProtectedRoute component={InternalTicketsPage} adminOnly />}
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <AppLayout>
            <Router />
          </AppLayout>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
