import { PublicLayout } from "@/components/layout/PublicLayout"
import { Card, CardContent } from "@/components/ui/card"
import { ShieldCheck, Target, Eye, Handshake, Globe2 } from "lucide-react"

export default function About() {
  return (
    <PublicLayout>
      <section className="bg-gradient-to-b from-primary/5 to-background">
        <div className="max-w-4xl mx-auto px-4 md:px-8 py-16 md:py-24 text-center">
          <span className="inline-block text-xs font-semibold uppercase tracking-wider text-primary bg-primary/10 rounded-full px-3 py-1 mb-6">
            Who We Are
          </span>
          <h1 className="font-serif text-4xl md:text-5xl font-bold mb-6">
            A consortium of African professionals, building the trust layer
            the rental economy has been missing.
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Legacy Rental Management Consortium (LRMC) was founded by business
            people across the continent who saw the same problem from every
            angle: property owners with no professional management, renters and
            travelers with no reliable way to find or reach a home they'd booked,
            and no single institution taking responsibility for the outcome.
          </p>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 md:px-8 py-16 md:py-24">
        <div className="grid md:grid-cols-2 gap-12">
          <div>
            <h2 className="font-serif text-2xl font-bold mb-4">Our Story</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Across Africa, most rental property is managed informally — listed
              on Facebook or LinkedIn, handled through word of mouth, with no
              structure protecting the owner or the renter. Travelers arriving
              from outside the country face the sharpest end of this: they land
              at the airport with a booking confirmation and no real way to get
              to the property, often falling prey to overpriced taxis or
              unreliable directions.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              LRMC was built to close that gap — as one consortium that property
              owners, land sellers, contractors, advertisers, and drivers can all
              belong to, and that travelers and renters can rely on from booking
              to arrival to move-in. Our mobility product, Ususu, exists
              specifically to solve the "last mile" problem: getting a traveler
              from the airport to their door, fairly and predictably.
            </p>
          </div>
          <div>
            <h2 className="font-serif text-2xl font-bold mb-4">Where We Operate</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              LRMC's treasury and corporate operations are anchored through
              Legacy Surplus Partners for USD reserves, with local currency
              operations run through Wave Mobile Money and a Remitly Business
              bridge connecting USD and Gambian Dalasi. This lets us operate
              with the discipline of a formal financial institution while
              staying rooted in how business is actually done in West Africa.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              We are building deliberately: starting with membership,
              property management, and Ususu mobility, and expanding into
              land brokering, construction management, marketplace commerce,
              and youth employment as one connected institution rather than a
              collection of disconnected apps.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-card border-y border-border/60">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-16 md:py-24">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <Target className="h-6 w-6 text-primary mb-4" />
                <h3 className="font-semibold mb-2">Our Mission</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Make it seamless for property owners to manage their rentals
                  and for renters — especially those arriving from abroad — to
                  reach their homes safely, fairly, and without confusion.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <Eye className="h-6 w-6 text-primary mb-4" />
                <h3 className="font-semibold mb-2">Our Vision</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  To be the trusted institution behind Africa's rental economy —
                  the name property owners, renters, and travelers turn to first.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <Handshake className="h-6 w-6 text-primary mb-4" />
                <h3 className="font-semibold mb-2">Our Values</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Fair pricing, verified membership, transparent transactions,
                  and accountability to every party in the transaction — owner,
                  renter, driver, and buyer alike.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <Globe2 className="h-6 w-6 text-primary mb-4" />
                <h3 className="font-semibold mb-2">Our Reach</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Rooted in The Gambia and West Africa, built to serve travelers
                  and property owners across the continent.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-4 md:px-8 py-16 md:py-24 text-center">
        <ShieldCheck className="h-10 w-10 mx-auto text-primary mb-4" />
        <h2 className="font-serif text-2xl font-bold mb-4">One Institution, Every Stakeholder</h2>
        <p className="text-muted-foreground leading-relaxed">
          LRMC membership brings property owners, vehicle owners, Airbnb hosts,
          resort owners, land sellers, construction contractors, advertisers,
          Ususu drivers, and renters into a single, accountable consortium —
          each with dashboards, protections, and support built for their role.
        </p>
      </section>
    </PublicLayout>
  )
}
