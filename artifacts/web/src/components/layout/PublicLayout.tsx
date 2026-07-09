import { Link, useLocation } from "wouter"
import { ShieldCheck, Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useState } from "react"

const navItems = [
  { href: "/", label: "Home" },
  { href: "/about", label: "Who We Are" },
  { href: "/services", label: "Services" },
  { href: "/ususu", label: "Ususu" },
  { href: "/how-it-works", label: "How It Works" },
  { href: "/contact", label: "Contact" },
]

export function PublicLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation()
  const [open, setOpen] = useState(false)

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-50 bg-background/90 backdrop-blur border-b border-border/60">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 md:px-8 h-16">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="bg-primary/10 p-1.5 rounded-lg">
              <ShieldCheck className="h-5 w-5 text-primary" />
            </div>
            <div className="leading-none">
              <div className="font-serif font-bold text-lg tracking-tight text-primary">LRMC</div>
              <div className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">Legacy Rental Management Consortium</div>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  location === item.href
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-2">
            <Link href="/login">
              <Button variant="ghost" size="sm">Member Sign In</Button>
            </Link>
            <Link href="/register">
              <Button size="sm">Join LRMC</Button>
            </Link>
          </div>

          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setOpen(!open)}>
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        {open && (
          <div className="md:hidden border-t border-border/60 bg-background px-4 py-3 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "block px-3 py-2 rounded-md text-sm font-medium",
                  location === item.href ? "text-primary bg-primary/10" : "text-muted-foreground hover:bg-muted"
                )}
              >
                {item.label}
              </Link>
            ))}
            <div className="flex gap-2 pt-2">
              <Link href="/login" className="flex-1" onClick={() => setOpen(false)}>
                <Button variant="outline" size="sm" className="w-full">Sign In</Button>
              </Link>
              <Link href="/register" className="flex-1" onClick={() => setOpen(false)}>
                <Button size="sm" className="w-full">Join LRMC</Button>
              </Link>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-border/60 bg-card">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-12 grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <span className="font-serif font-bold text-primary">LRMC</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Legacy Rental Management Consortium is a consortium of African business
              professionals building the trusted infrastructure travelers and property
              owners need across the continent.
            </p>
          </div>
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground mb-3">Company</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/about" className="hover:text-primary">Who We Are</Link></li>
              <li><Link href="/services" className="hover:text-primary">Our Services</Link></li>
              <li><Link href="/how-it-works" className="hover:text-primary">How It Works</Link></li>
              <li><Link href="/contact" className="hover:text-primary">Contact</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground mb-3">Ususu Mobility</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/ususu" className="hover:text-primary">Ride with Ususu</Link></li>
              <li><a href="mailto:drivers@africaususu.com" className="hover:text-primary">Become a Driver</a></li>
              <li><a href="mailto:dispatch@africaususu.com" className="hover:text-primary">Dispatch Support</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground mb-3">Get In Touch</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="mailto:office@africalrmc.com" className="hover:text-primary">office@africalrmc.com</a></li>
              <li><a href="mailto:membership@africalrmc.com" className="hover:text-primary">membership@africalrmc.com</a></li>
              <li><a href="mailto:support@africalrmc.com" className="hover:text-primary">support@africalrmc.com</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-border/60 py-4 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Legacy Rental Management Consortium. All rights reserved.
        </div>
      </footer>
    </div>
  )
}
