import { Link, useLocation } from "wouter"
import { 
  Building2, 
  Home, 
  Map, 
  Car, 
  Store, 
  GraduationCap, 
  Users, 
  Landmark, 
  AlertTriangle, 
  FileText, 
  MessageSquare, 
  Ticket, 
  Settings,
  LogOut,
  Menu,
  ShieldCheck
} from "lucide-react"
import { useLogout, useGetCurrentUser } from "@workspace/api-client-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useQueryClient } from "@tanstack/react-query"
import { useState } from "react"

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { data: user } = useGetCurrentUser()
  const logout = useLogout()
  const [, setLocation] = useLocation()
  const queryClient = useQueryClient()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => {
        queryClient.clear()
        setLocation("/")
      }
    })
  }

  if (!user) return null

  const isAdmin = user.role === "admin"

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: Home },
    { href: "/memberships", label: "Memberships", icon: Users },
    { href: "/properties", label: "Properties", icon: Building2 },
    { href: "/land", label: "Land Registry", icon: Map },
    { href: "/construction", label: "Construction", icon: Home },
    { href: "/mobility", label: "Ususu Mobility", icon: Car },
    { href: "/marketplace", label: "Marketplace", icon: Store },
    { href: "/youth-employment", label: "Youth Placement", icon: GraduationCap },
    ...(isAdmin ? [
      { href: "/prospecting", label: "Prospecting", icon: Users },
      { href: "/treasury", label: "Treasury", icon: Landmark },
      { href: "/risk", label: "Risk Management", icon: AlertTriangle },
      { href: "/settlements", label: "Settlements", icon: FileText },
    ] : []),
    { href: "/messages", label: "Messages", icon: MessageSquare },
    { href: "/tickets", label: "Tickets", icon: Ticket },
    { href: "/settings", label: "Settings", icon: Settings },
  ]

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Mobile Header */}
      <header className="md:hidden flex items-center justify-between p-4 border-b bg-card">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-primary" />
          <span className="font-serif font-bold text-lg tracking-tight text-primary">LRMC</span>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
          <Menu className="h-5 w-5" />
        </Button>
      </header>

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-card border-r flex flex-col transition-transform duration-300 ease-in-out md:relative md:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6 flex items-center gap-3 border-b border-border/50">
          <div className="bg-primary/10 p-2 rounded-lg">
            <ShieldCheck className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="font-serif font-bold text-xl tracking-tight text-primary leading-none">LRMC</h1>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mt-1">Consortium</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1 scrollbar-none">
          {navItems.map((item) => (
            <NavItem key={item.href} {...item} onClick={() => setSidebarOpen(false)} />
          ))}
        </nav>

        <div className="p-4 border-t border-border/50 bg-muted/20">
          <div className="flex items-center justify-between mb-4">
            <div className="overflow-hidden">
              <p className="text-sm font-semibold truncate text-foreground">{user.fullName}</p>
              <p className="text-xs text-muted-foreground capitalize">{user.role}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout} className="shrink-0 text-muted-foreground hover:text-destructive">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden animate-in fade-in" 
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-background/50">
        <div className="max-w-6xl mx-auto p-4 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {children}
        </div>
      </main>
    </div>
  )
}

function NavItem({ href, label, icon: Icon, onClick }: { href: string, label: string, icon: any, onClick: () => void }) {
  const [location] = useLocation()
  const isActive = location === href || location.startsWith(href + '/')

  return (
    <Link href={href} className={cn(
      "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 group",
      isActive 
        ? "bg-primary text-primary-foreground shadow-sm" 
        : "text-muted-foreground hover:bg-muted hover:text-foreground"
    )} onClick={onClick}>
      <Icon className={cn("h-4 w-4", isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground")} />
      {label}
    </Link>
  )
}
