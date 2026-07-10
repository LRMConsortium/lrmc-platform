import { Link, useLocation } from "wouter"
import { ShieldCheck, Menu, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { useState } from "react"
import { useToast } from "@/hooks/use-toast"

const navItems = [
  { href: "/", label: "Home" },
  { href: "/about", label: "Who We Are" },
  { href: "/services", label: "Services" },
  { href: "/ususu", label: "Ususu" },
  { href: "/store", label: "Store" },
  { href: "/how-it-works", label: "How It Works" },
  { href: "/contact", label: "Contact" },
]

export function PublicLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation()
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState("")
  const { toast } = useToast()

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    toast({
      title: "You're subscribed to Ageli",
      description: "We'll send LRMC news and updates to " + email + ".",
    })
    setEmail("")
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-50 bg-background/90 backdrop-blur border-b border-border/60">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 md:px-8 h-16">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="leading-none">
              <div className="font-serif font-bold text-lg tracking-tight text-primary">LRMC</div>
              <div className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">Legacy Rental Management Consortium</div>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-2">
              <Link href="/login">
                <Button variant="ghost" size="sm">Member Sign In</Button>
              </Link>
              <Link href="/register">
                <Button size="sm">Join LRMC</Button>
              </Link>
            </div>

            <DropdownMenu open={open} onOpenChange={setOpen}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Open menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {navItems.map((item) => (
                  <DropdownMenuItem key={item.href} asChild>
                    <Link
                      href={item.href}
                      className={cn(
                        "w-full cursor-pointer",
                        location === item.href && "text-primary font-medium"
                      )}
                    >
                      {item.label}
                    </Link>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuItem asChild className="md:hidden">
                  <Link href="/login" className="w-full cursor-pointer">Member Sign In</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="md:hidden">
                  <Link href="/register" className="w-full cursor-pointer font-medium text-primary">Join LRMC</Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-border/60 bg-card">
        <div className="border-b border-border/60">
          <div className="max-w-6xl mx-auto px-4 md:px-8 py-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <Mail className="h-4 w-4 text-primary" />
                <h4 className="font-serif font-bold text-foreground">Ageli — the LRMC Newsletter</h4>
              </div>
              <p className="text-sm text-muted-foreground max-w-md">
                Get news on properties, land listings, and Ususu straight to your inbox.
              </p>
            </div>
            <form onSubmit={handleNewsletterSubmit} className="flex w-full max-w-sm gap-2">
              <label htmlFor="ageli-newsletter-email" className="sr-only">Email address</label>
              <Input
                id="ageli-newsletter-email"
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-background"
              />
              <Button type="submit" className="shrink-0">Subscribe</Button>
            </form>
          </div>
        </div>
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
