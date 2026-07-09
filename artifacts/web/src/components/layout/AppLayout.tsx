import { Navbar } from "./Navbar";
import { Sidebar } from "./Sidebar";
import { useAuth } from "@workspace/replit-auth-web";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <div className="flex-1 flex overflow-hidden pt-20">
        {isAuthenticated && <Sidebar />}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
