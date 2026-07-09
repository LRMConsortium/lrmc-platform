import { Link, useLocation } from "wouter";
import { useAuth } from "@workspace/replit-auth-web";
import { 
  LayoutDashboard, Users, Home, Map, HardHat, Car, 
  Store, Download, Briefcase, Megaphone, CreditCard, 
  Landmark, MessageSquare, Ticket, ChevronRight, UserCircle, Target
} from "lucide-react";
import { cn } from "@/lib/utils";

const memberLinks = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/memberships", label: "Memberships", icon: Users },
  { href: "/assets", label: "My Assets", icon: Home },
  { href: "/land", label: "Land & Real Estate", icon: Map },
  { href: "/construction", label: "Construction", icon: HardHat },
  { href: "/ususu", label: "Ususu Mobility", icon: Car },
  { href: "/marketplace", label: "Marketplace", icon: Store },
  { href: "/store", label: "Digital Store", icon: Download },
  { href: "/youth", label: "Youth Employment", icon: Briefcase },
  { href: "/ads", label: "Advertising", icon: Megaphone },
  { href: "/payments", label: "Payments", icon: CreditCard },
];

const adminLinks = [
  { href: "/dashboard", label: "Operations", icon: LayoutDashboard },
  { href: "/treasury", label: "Treasury & Finance", icon: Landmark },
  { href: "/memberships", label: "Directory", icon: Users },
  { href: "/assets", label: "Asset Management", icon: Home },
  { href: "/land", label: "Land Registry", icon: Map },
  { href: "/construction", label: "Contractors", icon: HardHat },
  { href: "/ususu", label: "Dispatch & Drivers", icon: Car },
  { href: "/marketplace", label: "Marketplace Mod", icon: Store },
  { href: "/store", label: "Digital Store Admin", icon: Download },
  { href: "/youth", label: "Youth Placements", icon: Briefcase },
  { href: "/prospects", label: "Prospect CRM", icon: Target },
  { href: "/messages", label: "Internal Comm", icon: MessageSquare },
  { href: "/tickets", label: "Support Tickets", icon: Ticket },
];

export function Sidebar() {
  const [location] = useLocation();
  const { user } = useAuth();

  const links = user?.role === 'admin' ? adminLinks : memberLinks;

  return (
    <aside className="w-64 border-r border-border bg-sidebar hidden md:flex flex-col text-sidebar-foreground">
      <div className="p-6">
        <div className="text-xs font-semibold uppercase tracking-wider text-sidebar-primary mb-6">
          {user?.role === 'admin' ? 'Administration' : 'Member Portal'}
        </div>
        <nav className="space-y-1.5 h-[calc(100vh-14rem)] overflow-y-auto pr-2 scrollbar-thin">
          {links.map((link) => {
            const isActive = location === link.href || location.startsWith(`${link.href}/`);
            return (
              <Link 
                key={link.href} 
                href={link.href}
                className={cn(
                  "flex items-center justify-between py-2 px-3 rounded-md text-sm font-medium transition-colors group",
                  isActive 
                    ? "bg-sidebar-accent text-sidebar-accent-foreground" 
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                )}
              >
                <div className="flex items-center gap-3">
                  <link.icon className={cn("w-4 h-4 shrink-0", isActive ? "text-sidebar-primary" : "text-sidebar-foreground/50 group-hover:text-sidebar-foreground/80")} />
                  <span className="truncate">{link.label}</span>
                </div>
                {isActive && <ChevronRight className="w-4 h-4 text-sidebar-primary shrink-0" />}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="mt-auto p-4 border-t border-sidebar-border">
        <Link href="/profile" className="flex items-center gap-3 group hover:bg-sidebar-accent/50 p-2 rounded-md transition-colors">
          <UserCircle className="w-8 h-8 text-sidebar-foreground/50 group-hover:text-sidebar-foreground/80 transition-colors" />
          <div className="flex flex-col overflow-hidden">
            <span className="text-sm font-medium truncate">{user?.firstName || 'User'} {user?.lastName || ''}</span>
            <span className="text-xs text-sidebar-foreground/50 truncate w-full">{user?.email}</span>
          </div>
        </Link>
      </div>
    </aside>
  );
}
