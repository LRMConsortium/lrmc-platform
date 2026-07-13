import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, Router as WouterRouter, Redirect } from 'wouter';
import { useGetCurrentUser } from '@workspace/api-client-react';

import Home from '@/pages/public/home';
import About from '@/pages/public/about';
import Services from '@/pages/public/services';
import HowItWorks from '@/pages/public/how-it-works';
import Contact from '@/pages/public/contact';
import Ususu from '@/pages/public/ususu';
import Store from '@/pages/public/store';
import StoreSuccess from '@/pages/public/store-success';
import StoreCancel from '@/pages/public/store-cancel';
import Login from '@/pages/login';
import Register from '@/pages/register';
import VerifyEmail from '@/pages/verify-email';
import ForgotPassword from '@/pages/forgot-password';
import ResetPassword from '@/pages/reset-password';
import Dashboard from '@/pages/dashboard';
import Memberships from '@/pages/memberships';
import Properties from '@/pages/properties';
import Land from '@/pages/land';
import Construction from '@/pages/construction';
import Mobility from '@/pages/mobility';
import Marketplace from '@/pages/marketplace';
import YouthEmployment from '@/pages/youth-employment';
import Prospecting from '@/pages/prospecting';
import Treasury from '@/pages/treasury';
import Risk from '@/pages/risk';
import Settlements from '@/pages/settlements';
import Messages from '@/pages/messages';
import Tickets from '@/pages/tickets';
import Settings from '@/pages/settings';
import Assets from '@/pages/assets';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function ProtectedRoute({ component: Component, adminOnly = false }: { component: any, adminOnly?: boolean }) {
  const { data: user, isLoading } = useGetCurrentUser()

  if (isLoading) return null

  if (!user) {
    return <Redirect href="/login" />
  }

  if (adminOnly && user.role !== "admin") {
    return <Redirect href="/dashboard" />
  }

  return <Component />
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/verify-email" component={VerifyEmail} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />

      {/* Public marketing pages */}
      <Route path="/" component={Home} />
      <Route path="/about" component={About} />
      <Route path="/services" component={Services} />
      <Route path="/how-it-works" component={HowItWorks} />
      <Route path="/contact" component={Contact} />
      <Route path="/ususu" component={Ususu} />
      <Route path="/store" component={Store} />
      <Route path="/store/success" component={StoreSuccess} />
      <Route path="/store/cancel" component={StoreCancel} />
      <Route path="/dashboard" component={() => <ProtectedRoute component={Dashboard} />} />
      <Route path="/memberships" component={() => <ProtectedRoute component={Memberships} />} />
      <Route path="/properties" component={() => <ProtectedRoute component={Properties} />} />
      <Route path="/land" component={() => <ProtectedRoute component={Land} />} />
      <Route path="/construction" component={() => <ProtectedRoute component={Construction} />} />
      <Route path="/mobility" component={() => <ProtectedRoute component={Mobility} />} />
      <Route path="/marketplace" component={() => <ProtectedRoute component={Marketplace} />} />
      <Route path="/youth-employment" component={() => <ProtectedRoute component={YouthEmployment} />} />
      <Route path="/messages" component={() => <ProtectedRoute component={Messages} />} />
      <Route path="/tickets" component={() => <ProtectedRoute component={Tickets} />} />
      <Route path="/settings" component={() => <ProtectedRoute component={Settings} />} />
      <Route path="/assets" component={() => <ProtectedRoute component={Assets} />} />

      {/* Admin Only Routes */}
      <Route path="/prospecting" component={() => <ProtectedRoute component={Prospecting} adminOnly />} />
      <Route path="/treasury" component={() => <ProtectedRoute component={Treasury} adminOnly />} />
      <Route path="/risk" component={() => <ProtectedRoute component={Risk} adminOnly />} />
      <Route path="/settlements" component={() => <ProtectedRoute component={Settlements} adminOnly />} />

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
