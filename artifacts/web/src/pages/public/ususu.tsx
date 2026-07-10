import { PublicLayout } from "@/components/layout/PublicLayout"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Link } from "wouter"
import {
  Car, MapPin, Wallet, ShieldCheck, Clock, TrendingUp,
  ArrowRight, Plane, UserCheck, Landmark,
} from "lucide-react"

export default function Ususu() {
  return (
    <PublicLayout>
      <section className="bg-gradient-to-b from-primary/5 to-background">
        <div className="max-w-4xl mx-auto px-4 md:px-8 py-10 md:py-12 text-center">
          <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary bg-primary/10 rounded-full px-3 py-1 mb-6">
            <Car className="h-3.5 w-3.5" /> A Mobility Product of LRMC
          </span>
          <h1 className="font-serif text-4xl md:text-5xl font-bold mb-6">
            Ususu by LRMC
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Fair rides from the airport to your door — for every traveler who has
            ever landed in an unfamiliar city with no idea how to get where
            they're going, and no way to know if the price they're being quoted
            is fair.
          </p>
        </div>
      </section>

      {/* The problem */}
      <section className="max-w-6xl mx-auto px-4 md:px-8 py-10 md:py-14">
        <div className="grid md:grid-cols-2 gap-10 items-center">
          <div>
            <h2 className="font-serif text-2xl font-bold mb-4">The problem we built Ususu to solve</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              A renter books a home on Facebook, LinkedIn, or another site,
              boards a flight, and lands with a confirmation number and no real
              plan for the last mile. At the airport, they're met with drivers
              quoting wildly different, often inflated prices, with no way to
              know what's fair — and no way to confirm the driver even knows
              where the property is.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              At the same time, honest drivers sit idle for long stretches
              because ride demand is unpredictable and undercut by informal
              competition. Ususu fixes both sides of this at once.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Card><CardContent className="p-6"><Plane className="h-5 w-5 text-primary mb-3" /><p className="text-sm font-medium">Travelers land with no clear way to reach their rental</p></CardContent></Card>
            <Card><CardContent className="p-6"><Wallet className="h-5 w-5 text-primary mb-3" /><p className="text-sm font-medium">Airport rides are frequently overpriced and inconsistent</p></CardContent></Card>
            <Card><CardContent className="p-6"><Clock className="h-5 w-5 text-primary mb-3" /><p className="text-sm font-medium">Drivers go long stretches without fares</p></CardContent></Card>
            <Card><CardContent className="p-6"><UserCheck className="h-5 w-5 text-primary mb-3" /><p className="text-sm font-medium">No verification of who's driving or where they're going</p></CardContent></Card>
          </div>
        </div>
      </section>

      {/* How Ususu works */}
      <section className="bg-card border-y border-border/60">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-10 md:py-14">
          <h2 className="font-serif text-2xl font-bold mb-8 text-center">How Ususu works</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-6">
                <MapPin className="h-6 w-6 text-primary mb-4" />
                <h3 className="font-semibold mb-2">Request a ride</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  From the LRMC platform, a renter requests a ride to a specific
                  property, so the driver already knows exactly where they're going.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <Wallet className="h-6 w-6 text-primary mb-4" />
                <h3 className="font-semibold mb-2">See the fare upfront</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Pricing is fixed and transparent before the ride starts —
                  no negotiating, no surprises when you arrive.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <ShieldCheck className="h-6 w-6 text-primary mb-4" />
                <h3 className="font-semibold mb-2">Ride with a verified driver</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Every Ususu driver is an LRMC member, verified and accountable
                  to the same institution as the property owner.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* For drivers */}
      <section className="max-w-6xl mx-auto px-4 md:px-8 py-10 md:py-14">
        <div className="grid md:grid-cols-2 gap-10 items-center">
          <div>
            <span className="inline-block text-xs font-semibold uppercase tracking-wider text-primary bg-primary/10 rounded-full px-3 py-1 mb-4">
              For Drivers
            </span>
            <h2 className="font-serif text-2xl font-bold mb-4">Steady work, fair pay</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Ususu driver membership is free. Instead of competing for
              scattered, underpriced fares, drivers are matched to a steady
              stream of airport and city ride requests coming through the LRMC
              platform — which means they can price fairly and still make a
              consistent living.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Every ride's payment flows into LRMC's treasury, which settles
              driver payouts on a predictable schedule — no chasing payment,
              no disputes over what was agreed.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4">
            <Card><CardContent className="p-6 flex items-center gap-4"><TrendingUp className="h-6 w-6 text-primary shrink-0" /><span className="text-sm font-medium">Consistent ride volume instead of unpredictable demand</span></CardContent></Card>
            <Card><CardContent className="p-6 flex items-center gap-4"><Landmark className="h-6 w-6 text-primary shrink-0" /><span className="text-sm font-medium">Reliable settlement through LRMC treasury</span></CardContent></Card>
            <Card><CardContent className="p-6 flex items-center gap-4"><ShieldCheck className="h-6 w-6 text-primary shrink-0" /><span className="text-sm font-medium">Membership-backed accountability for every ride</span></CardContent></Card>
          </div>
        </div>
      </section>

      <section className="bg-primary text-primary-foreground">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-12 text-center">
          <Car className="h-10 w-10 mx-auto mb-4 opacity-90" />
          <h2 className="font-serif text-3xl font-bold mb-3">Ride fair. Drive fair.</h2>
          <p className="opacity-90 max-w-xl mx-auto mb-6">
            Join LRMC to request an Ususu ride as a renter, or register free as
            an Ususu driver.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link href="/register">
              <Button size="lg" variant="secondary" className="gap-2">
                Become a Member <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <a href="mailto:drivers@africaususu.com">
              <Button size="lg" variant="outline" className="gap-2 border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground">
                Drive for Ususu
              </Button>
            </a>
          </div>
        </div>
      </section>
    </PublicLayout>
  )
}
