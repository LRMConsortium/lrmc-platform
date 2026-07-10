import { PublicLayout } from "@/components/layout/PublicLayout"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Link } from "wouter"
import { ArrowRight, UserPlus, Building2, Plane, Car, ShieldCheck } from "lucide-react"

export default function HowItWorks() {
  return (
    <PublicLayout>
      <section className="bg-gradient-to-b from-primary/5 to-background">
        <div className="max-w-4xl mx-auto px-4 md:px-8 py-10 md:py-12 text-center">
          <span className="inline-block text-xs font-semibold uppercase tracking-wider text-primary bg-primary/10 rounded-full px-3 py-1 mb-6">
            How It Works
          </span>
          <h1 className="font-serif text-4xl md:text-5xl font-bold mb-6">
            From membership to move-in, here's how LRMC works.
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            The process looks a little different depending on whether you're a
            property owner or a renter — but it always starts with membership.
          </p>
        </div>
      </section>

      {/* Step 0: membership */}
      <section className="max-w-4xl mx-auto px-4 md:px-8 py-12">
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-8 flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="bg-primary/10 p-3 rounded-lg">
              <UserPlus className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h2 className="font-serif text-xl font-bold mb-2">Step 1 — Everyone joins as a member</h2>
              <p className="text-muted-foreground leading-relaxed">
                Membership costs 1,000 Dalasi and covers Property Owners, Vehicle
                Owners, Airbnb Hosts, Resort Owners, Land Sellers, Construction
                Contractors, Advertisers, and Renters. Ususu Drivers join free.
                Membership verifies who you are and unlocks your dashboard.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Property owner path */}
      <section className="max-w-6xl mx-auto px-4 md:px-8 py-12">
        <div className="flex items-center gap-3 mb-8">
          <Building2 className="h-6 w-6 text-primary" />
          <h2 className="font-serif text-2xl font-bold">For Property Owners</h2>
        </div>
        <div className="grid md:grid-cols-4 gap-6">
          {[
            { n: "1", title: "List your property", desc: "Register your property, unit, or Airbnb with LRMC and set your terms." },
            { n: "2", title: "We verify and publish", desc: "LRMC reviews and lists your property, so renters know it's a trusted listing." },
            { n: "3", title: "Renters book through LRMC", desc: "Bookings and inquiries are coordinated through your member dashboard." },
            { n: "4", title: "We manage the details", desc: "Tenant handoff, maintenance requests, and renewals are tracked for you." },
          ].map((s) => (
            <Card key={s.n}>
              <CardContent className="p-6">
                <div className="text-3xl font-serif font-bold text-primary/30 mb-3">{s.n}</div>
                <h3 className="font-semibold mb-2">{s.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Renter / traveler path */}
      <section className="bg-card border-y border-border/60">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-12">
          <div className="flex items-center gap-3 mb-8">
            <Plane className="h-6 w-6 text-primary" />
            <h2 className="font-serif text-2xl font-bold">For Renters &amp; Travelers</h2>
          </div>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { n: "1", title: "Book your stay", desc: "Reserve a property listed through LRMC — no more guessing if a Facebook or LinkedIn listing is real." },
              { n: "2", title: "Land and request Ususu", desc: "The moment you land, request an Ususu ride straight to your rental at a fair, upfront price." },
              { n: "3", title: "Arrive without the runaround", desc: "No haggling with taxi drivers, no getting lost — Ususu takes you directly to your door." },
              { n: "4", title: "Move in, supported", desc: "LRMC and the property owner coordinate your move-in and are on hand for anything you need." },
            ].map((s) => (
              <Card key={s.n}>
                <CardContent className="p-6">
                  <div className="text-3xl font-serif font-bold text-primary/30 mb-3">{s.n}</div>
                  <h3 className="font-semibold mb-2">{s.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Driver path */}
      <section className="max-w-6xl mx-auto px-4 md:px-8 py-12">
        <div className="flex items-center gap-3 mb-8">
          <Car className="h-6 w-6 text-primary" />
          <h2 className="font-serif text-2xl font-bold">For Ususu Drivers</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { title: "Join free", desc: "Ususu driver membership is free — register your vehicle and get verified." },
            { title: "Get matched to riders", desc: "LRMC keeps drivers busy with consistent airport and city ride requests." },
            { title: "Get paid fairly, on time", desc: "Fares are fixed and transparent, with settlements handled through LRMC treasury." },
          ].map((s) => (
            <Card key={s.title}>
              <CardContent className="p-6">
                <h3 className="font-semibold mb-2">{s.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="bg-primary text-primary-foreground">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-12 text-center">
          <ShieldCheck className="h-10 w-10 mx-auto mb-4 opacity-90" />
          <h2 className="font-serif text-3xl font-bold mb-3">It starts with one membership</h2>
          <p className="opacity-90 max-w-xl mx-auto mb-6">
            Whichever path applies to you, it begins the same way — join LRMC.
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
