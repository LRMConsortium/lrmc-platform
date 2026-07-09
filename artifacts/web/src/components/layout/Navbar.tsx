import { Link, useLocation } from "wouter";
import { useAuth } from "@workspace/replit-auth-web";
import { Button } from "@/components/ui/button";
import { Building2, Menu, X, ArrowRight, UserCircle } from "lucide-react";
import { useState } from "react";
import { crossDomainHref, USUSU_DOMAIN } from "@/lib/domains";

export function Navbar() {
  const { user, isAuthenticated, login, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [location] = useLocation();

  const isHome = location === "/";

  return (
    <nav className={`w-full z-50 transition-colors ${isHome ? 'bg-transparent absolute top-0 left-0 border-none' : 'bg-card border-b border-border'}`}>
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex h-20 items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center gap-2 text-primary group">
              <Building2 className="h-8 w-8 text-primary group-hover:text-accent transition-colors" />
              <span className={`text-2xl font-serif font-bold ${isHome ? 'text-primary' : 'text-card-foreground'}`}>
                LRMC
              </span>
            </Link>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            {isHome && (
              <div className="flex items-center gap-6 text-sm font-medium text-muted-foreground">
                <a href="#about" className="hover:text-primary transition-colors">Who We Are</a>
                <a href="#sectors" className="hover:text-primary transition-colors">Sectors</a>
                <a href={crossDomainHref(USUSU_DOMAIN, "/ususu")} className="hover:text-primary transition-colors">Ususu</a>
              </div>
            )}
            
            <div className="flex items-center gap-4">
              {isAuthenticated ? (
                <>
                  <Link href="/dashboard" className="text-sm font-medium hover:text-primary transition-colors">
                    Dashboard
                  </Link>
                  <Button variant="outline" onClick={logout} className="gap-2">
                    <UserCircle className="w-4 h-4" />
                    Sign Out
                  </Button>
                </>
              ) : (
                <Button onClick={login} className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 rounded-full px-6">
                  Access Portal
                  <ArrowRight className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Mobile Menu Toggle */}
          <div className="md:hidden flex items-center">
            <button onClick={() => setIsOpen(!isOpen)} className="text-primary p-2">
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Nav */}
      {isOpen && (
        <div className="md:hidden bg-card border-b border-border p-4 absolute top-20 left-0 w-full shadow-lg">
          <div className="flex flex-col gap-4">
            {isHome && (
              <>
                <a href="#about" onClick={() => setIsOpen(false)} className="text-sm font-medium p-2">Who We Are</a>
                <a href="#sectors" onClick={() => setIsOpen(false)} className="text-sm font-medium p-2">Sectors</a>
              </>
            )}
            {isAuthenticated ? (
              <>
                <Link href="/dashboard" onClick={() => setIsOpen(false)} className="text-sm font-medium p-2">
                  Dashboard
                </Link>
                <Button variant="outline" onClick={() => { logout(); setIsOpen(false); }} className="w-full justify-start">
                  Sign Out
                </Button>
              </>
            ) : (
              <Button onClick={() => { login(); setIsOpen(false); }} className="w-full justify-start">
                Access Portal
              </Button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
