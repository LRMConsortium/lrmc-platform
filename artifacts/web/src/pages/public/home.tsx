import { PublicLayout } from "@/components/layout/PublicLayout"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Link } from "wouter"
import {
  Building2, Car, Map, Store, GraduationCap, ShieldCheck,
  Plane, Home as HomeIcon, ArrowRight, CheckCircle2,
} from "lucide-react"

export default function Home() {
  return (
    <PublicLayout>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-primary/5 to-background">
        <div className="max-w-6xl mx-auto px-4 md:px-8 pt-10 md:pt-14 pb-6 md:pb-8">
          <div className="max-w-3xl">
            <span className="inline-block text-xs font-semibold uppercase tracking-wider text-primary bg-primary/10 rounded-full px-3 py-1 mb-6">
              Institutional Trust for a Growing Economy
            </span>
            <h1 className="font-serif text-4xl md:text-6xl font-bold leading-tight text-foreground mb-6">
              Property management and traveler services,
              <span className="text-primary"> built for Africa.</span>
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed mb-6 max-w-2xl">
              Legacy Rental Management Consortium (LRMC) is a consortium of African
              business professionals that helps property owners manage their rentals
              and helps travelers — especially those coming from abroad — find their
              way to the home they booked without confusion, delay, or being overcharged.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/register">
                <Button size="lg" className="gap-2">
                  Become a Member <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/how-it-works">
                <Button size="lg" variant="outline">See How It Works</Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Core service */}
      <section className="max-w-6xl mx-auto px-4 md:px-8 pt-6 md:pt-8 pb-10 md:pb-14">
        <div className="grid md:grid-cols-2 gap-10 items-center">
          <div>
            <h2 className="font-serif text-3xl font-bold mb-4">
              Our core service: managing rental properties, professionally.
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Most property owners across Africa list their homes on Facebook,
              LinkedIn, or word of mouth — with no professional management behind
              them. LRMC changes that. We give property owners a real management
              partner: verified tenants, structured listings, maintenance
              coordination, and a dedicated dashboard to track every unit.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              For renters — particularly travelers arriving from outside the
              country — we remove the single biggest source of anxiety: not
              knowing where to go, who to trust, or how to get there. LRMC acts
              as the facilitator between the property owner and the renter, from
              booking to arrival to move-in.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: Building2, label: "Property Management" },
              { icon: Map, label: "Land Brokering" },
              { icon: HomeIcon, label: "Construction Oversight" },
              { icon: Plane, label: "Traveler Facilitation" },
            ].map((item) => (
              <Card key={item.label} className="border-primary/10">
                <CardContent className="p-6 flex flex-col items-start gap-3">
                  <div className="bg-primary/10 p-2.5 rounded-lg">
                    <item.icon className="h-5 w-5 text-primary" />
                  </div>
                  <span className="font-semibold text-sm">{item.label}</span>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Ususu callout */}
      <section className="bg-card border-y border-border/60">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-10 md:py-14 grid md:grid-cols-2 gap-10 items-center">
          <div className="order-2 md:order-1 grid grid-cols-1 gap-4">
            {[
              "Fair, transparent pricing — no airport overcharging",
              "Drivers earn steady income from consistent ride volume",
              "Riders request rides straight from the LRMC platform",
              "Every driver and rider is verified through LRMC membership",
            ].map((point) => (
              <div key={point} className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <span className="text-sm text-foreground">{point}</span>
              </div>
            ))}
          </div>
          <div className="order-1 md:order-2">
            <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary bg-primary/10 rounded-full px-3 py-1 mb-4">
              <Car className="h-3.5 w-3.5" /> A Product of LRMC
            </span>
            <h2 className="font-serif text-3xl font-bold mb-4">Ususu by LRMC</h2>
            <p className="text-muted-foreground leading-relaxed mb-6">
              A traveler lands at the airport with no idea how to reach the
              property they booked — and is met with wildly overpriced,
              unreliable rides. Ususu is our answer: a fair-pricing mobility
              service that gets travelers from the airport to their rental,
              and keeps drivers busy enough to price fairly and still earn well.
            </p>
            <Link href="/ususu">
              <Button variant="outline" className="gap-2">
                Learn about Ususu <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Services grid */}
      <section className="max-w-6xl mx-auto px-4 md:px-8 py-10 md:py-14">
        <div className="text-center max-w-2xl mx-auto mb-8">
          <h2 className="font-serif text-3xl font-bold mb-3">One consortium, every service a property owner or traveler needs</h2>
          <p className="text-muted-foreground">From the moment a property is listed to the moment a renter walks through the door.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { icon: Building2, title: "Property Management", desc: "Rental listings, tenant verification, and maintenance handled for property owners." },
            { icon: Car, title: "Ususu Mobility", desc: "Fair-priced rides connecting travelers from the airport to their rental." },
            { icon: Map, title: "Land Brokering", desc: "Verified land listings and transaction support for buyers and sellers." },
            { icon: HomeIcon, title: "Construction Management", desc: "Vetted contractors and project tracking for builds and renovations." },
            { icon: Store, title: "Marketplace", desc: "A trusted marketplace for goods, services, and digital documents." },
            { icon: GraduationCap, title: "Youth Employment", desc: "Connecting young African talent with real employment opportunities." },
          ].map((s) => (
            <Card key={s.title}>
              <CardContent className="p-6">
                <div className="bg-primary/10 p-2.5 rounded-lg w-fit mb-4">
                  <s.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">{s.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="text-center mt-10">
          <Link href="/services">
            <Button variant="outline" className="gap-2">
              Explore all services <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary text-primary-foreground">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-12 text-center">
          <ShieldCheck className="h-10 w-10 mx-auto mb-4 opacity-90" />
          <h2 className="font-serif text-3xl font-bold mb-3">Join the Consortium</h2>
          <p className="opacity-90 max-w-xl mx-auto mb-6">
            Whether you own property, sell land, drive for Ususu, or need a place
            to land — LRMC membership gives you a trusted institution behind you.
          </p>
          <Link href="/register">
            <Button size="lg" variant="secondary" className="gap-2">
              Become a Member <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>
    </PublicLayout>
  )
}
