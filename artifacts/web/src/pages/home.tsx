import { Button } from "@/components/ui/button";
import { useAuth } from "@workspace/replit-auth-web";
import { ArrowRight, Building2, Map, Car, HardHat, ShieldCheck, TrendingUp, Globe2, Briefcase } from "lucide-react";
import { Redirect } from "wouter";
import { crossDomainHref, CORPORATE_DOMAIN, USUSU_DOMAIN } from "@/lib/domains";

const sectors = [
  { icon: Car, title: "Ususu Mobility", desc: "The Gambia's premier rideshare and mobility network. Safe, reliable, and fair." },
  { icon: Map, title: "Land Registry", desc: "Transparent land brokering and real estate listings with full institutional backing." },
  { icon: HardHat, title: "Construction", desc: "Certified contractors and project management for robust infrastructure development." },
  { icon: Building2, title: "Asset Management", desc: "Property, vehicle, Airbnb, and resort rental management under one unified trust." },
  { icon: Briefcase, title: "Youth Employment", desc: "Empowering the next generation with job placements and skill development programs." },
  { icon: ShieldCheck, title: "Digital & Marketplace", desc: "Secure digital e-commerce documents and a thriving local marketplace." },
];

export default function Home() {
  const { isAuthenticated, login } = useAuth();

  if (isAuthenticated) {
    return <Redirect to="/dashboard" />;
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
        <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/0.1),transparent_50%)]" />
        <div className="container mx-auto px-4 md:px-6 relative z-10">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary font-medium text-sm mb-4">
              <Globe2 className="w-4 h-4" />
              <span>Multi-Sector Institution • The Gambia</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-serif font-bold text-foreground leading-[1.1] tracking-tight">
              Institutional Trust for a <span className="text-primary italic">Growing Economy</span>
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              LRMC connects mobility, real estate, construction, and commerce through a secure, unified Pan-African infrastructure.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Button onClick={() => login()} size="lg" className="bg-primary hover:bg-primary/90 text-white rounded-full px-8 h-14 text-lg w-full sm:w-auto">
                Access Member Portal
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Button
                onClick={() => login("/memberships")}
                variant="outline"
                size="lg"
                className="rounded-full px-8 h-14 text-lg w-full sm:w-auto border-2"
              >
                Apply for Membership
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Sectors Overview */}
      <section id="sectors" className="py-24 bg-card">
        <div className="container mx-auto px-4 md:px-6">
          <div className="mb-16">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-4">Our Ecosystem</h2>
            <p className="text-lg text-muted-foreground max-w-2xl">
              A comprehensive suite of services designed to standardize and secure economic activity across key sectors.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {sectors.map((sector, i) => (
              <div key={i} className="group p-8 rounded-2xl border border-border bg-background hover:border-primary/50 transition-colors">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-6 text-primary group-hover:scale-110 transition-transform">
                  <sector.icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold mb-3">{sector.title}</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {sector.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Ecosystem Links */}
      <section id="ususu" className="py-24 bg-background">
        <div className="container mx-auto px-4 md:px-6">
          <div className="mb-16 max-w-2xl">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-4">Two Homes Within One Trust</h2>
            <p className="text-lg text-muted-foreground">
              LRMC's public face lives here. Our mobility network and our corporate operations each have their own dedicated address.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            <a
              href={crossDomainHref(USUSU_DOMAIN, "/ususu")}
              className="group block p-8 rounded-2xl border border-border bg-card hover:border-primary/50 transition-colors"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-6 text-primary group-hover:scale-110 transition-transform">
                <Car className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-2">Ususu Mobility</h3>
              <p className="text-muted-foreground mb-4">Rider and driver onboarding, dispatch, and settlements — at africaususu.com.</p>
              <span className="inline-flex items-center gap-2 text-primary font-medium">
                Visit Ususu <ArrowRight className="w-4 h-4" />
              </span>
            </a>
            <a
              href={crossDomainHref(CORPORATE_DOMAIN, "/dashboard")}
              className="group block p-8 rounded-2xl border border-border bg-card hover:border-primary/50 transition-colors"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-6 text-primary group-hover:scale-110 transition-transform">
                <Briefcase className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-2">Corporate HQ</h3>
              <p className="text-muted-foreground mb-4">Membership, treasury, risk, and internal operations — at africalrmc.com.</p>
              <span className="inline-flex items-center gap-2 text-primary font-medium">
                Enter Corporate HQ <ArrowRight className="w-4 h-4" />
              </span>
            </a>
          </div>
        </div>
      </section>

      {/* About/Trust Section */}
      <section id="about" className="py-24 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-4xl md:text-5xl font-serif font-bold mb-6">Built on Transparency. Driven by Progress.</h2>
              <div className="space-y-6 text-lg text-primary-foreground/80">
                <p>
                  The Legacy Rental Management Consortium (LRMC) was established to provide institutional-grade trust to fragmented markets.
                </p>
                <p>
                  From regulating property rentals to managing the Ususu dispatch network, our mandate is to ensure safety, reliability, and economic empowerment for all Gambians.
                </p>
                <ul className="space-y-4 pt-4">
                  <li className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-accent flex items-center justify-center text-primary">✓</div>
                    <span className="font-medium text-white">Full Financial Control & Treasury</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-accent flex items-center justify-center text-primary">✓</div>
                    <span className="font-medium text-white">Verified Members & Contractors</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-accent flex items-center justify-center text-primary">✓</div>
                    <span className="font-medium text-white">Transparent Dispute Resolution</span>
                  </li>
                </ul>
              </div>
            </div>
            <div className="bg-white/5 rounded-3xl p-8 border border-white/10 backdrop-blur-sm">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <ShieldCheck className="w-8 h-8 text-accent mb-3" />
                  <div className="text-lg font-bold mb-1">Financially Regulated</div>
                  <div className="text-sm text-primary-foreground/70">Every settlement is backed and independently audited.</div>
                </div>
                <div>
                  <Building2 className="w-8 h-8 text-accent mb-3" />
                  <div className="text-lg font-bold mb-1">Audited Governance</div>
                  <div className="text-sm text-primary-foreground/70">Institutional-grade oversight across every sector.</div>
                </div>
                <div className="col-span-2 pt-6 border-t border-white/10">
                  <TrendingUp className="w-8 h-8 text-accent mb-4" />
                  <h4 className="text-xl font-bold mb-2">Built for Stability</h4>
                  <p className="text-primary-foreground/70">
                    Our financial infrastructure is built to ensure stability for large-scale land brokering and construction financing. Full treasury details are available to authorized members and staff.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-32 bg-background text-center">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-serif font-bold mb-6">Ready to join the consortium?</h2>
          <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
            Whether you're a property owner, contractor, or looking to drive with Ususu, your journey starts here.
          </p>
          <Button onClick={() => login()} size="lg" className="bg-primary hover:bg-primary/90 text-white rounded-full px-10 h-16 text-xl">
            Sign In to the Portal
            <ArrowRight className="w-6 h-6 ml-2" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-card border-t border-border py-12 text-center text-muted-foreground">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center gap-2 mb-6">
            <Building2 className="h-6 w-6 text-primary" />
            <span className="text-xl font-serif font-bold text-foreground">LRMC</span>
          </div>
          <p className="mb-6">Legacy Rental Management Consortium • The Gambia</p>
          <p className="text-sm">© {new Date().getFullYear()} LRMC. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
