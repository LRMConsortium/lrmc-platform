import { PublicLayout } from "@/components/layout/PublicLayout"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Link } from "wouter"
import { Button } from "@/components/ui/button"
import {
  Building2, Car, Map, Store, GraduationCap, HomeIcon,
  FileText, Megaphone, ArrowRight,
} from "lucide-react"

const services = [
  {
    icon: Building2,
    title: "Property Management",
    tag: "Core Service",
    desc: "Our flagship service. LRMC manages rental properties on behalf of owners — Airbnb hosts, resort owners, and individual landlords — handling listings, tenant verification, rent collection coordination, and maintenance requests, all tracked through a member dashboard.",
    who: "Property Owners, Airbnb Hosts, Resort Owners, Renters",
  },
  {
    icon: Car,
    title: "Ususu Mobility",
    tag: "Product of LRMC",
    desc: "Fair, transparent airport-to-door rides for travelers, and steady, well-priced work for verified drivers. Ususu solves the single biggest pain point for renters arriving from outside the country: getting to the property they booked without being overcharged or lost.",
    who: "Renters, Travelers, Ususu Drivers",
  },
  {
    icon: Map,
    title: "Land Selling & Brokering",
    tag: "",
    desc: "Verified land listings with transaction support from offer to closing, reducing the fraud and ambiguity common in informal land sales.",
    who: "Land Sellers, Buyers",
  },
  {
    icon: HomeIcon,
    title: "Construction Management",
    tag: "",
    desc: "A network of vetted construction contractors and project tracking tools so property owners and land buyers can build or renovate with confidence.",
    who: "Construction Contractors, Property & Land Owners",
  },
  {
    icon: Store,
    title: "Marketplace",
    tag: "",
    desc: "A general marketplace for goods and services between LRMC members — from home furnishings to professional services — with listings tied to verified member accounts.",
    who: "Sellers, Buyers",
  },
  {
    icon: FileText,
    title: "Digital Document Store",
    tag: "E-commerce",
    desc: "A curated digital storefront for the documents and guides property owners, sellers, and buyers actually need — lease templates, relocation checklists, land transaction guides, and more — added and maintained by LRMC administrators.",
    who: "Property Owners, Sellers, Buyers",
  },
  {
    icon: GraduationCap,
    title: "Youth Employment Initiative",
    tag: "",
    desc: "Connecting young African talent to real employment opportunities across LRMC's network of property owners, contractors, and partners.",
    who: "Youth Job Seekers, Employers",
  },
  {
    icon: Megaphone,
    title: "Advertising & Prospecting",
    tag: "",
    desc: "A vetted advertising placement system and a prospecting pipeline that helps LRMC responsibly grow its membership base across every sector it serves.",
    who: "Advertisers, Prospective Members",
  },
]

export default function Services() {
  return (
    <PublicLayout>
      <section className="bg-gradient-to-b from-primary/5 to-background">
        <div className="max-w-4xl mx-auto px-4 md:px-8 py-10 md:py-12 text-center">
          <span className="inline-block text-xs font-semibold uppercase tracking-wider text-primary bg-primary/10 rounded-full px-3 py-1 mb-6">
            Our Services
          </span>
          <h1 className="font-serif text-4xl md:text-5xl font-bold mb-6">
            Everything a property owner or traveler needs, under one consortium.
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Rental property management is our core service. Every other service
            LRMC offers exists to support that mission — helping owners manage
            what they own, and helping renters and travelers get there safely.
          </p>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 md:px-8 py-10 md:py-14 space-y-4">
        {services.map((s) => (
          <Card key={s.title} className="overflow-hidden">
            <CardContent className="p-6 md:p-8 flex flex-col md:flex-row gap-6">
              <div className="bg-primary/10 p-3 rounded-lg w-fit h-fit">
                <s.icon className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <h2 className="font-serif text-xl font-bold">{s.title}</h2>
                  {s.tag && <Badge variant="secondary">{s.tag}</Badge>}
                </div>
                <p className="text-muted-foreground leading-relaxed mb-3">{s.desc}</p>
                <p className="text-xs uppercase tracking-wider font-semibold text-primary/80">
                  For: {s.who}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="bg-primary text-primary-foreground">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-12 text-center">
          <h2 className="font-serif text-3xl font-bold mb-3">Ready to work with LRMC?</h2>
          <p className="opacity-90 max-w-xl mx-auto mb-6">
            Membership starts at 1,000 Dalasi and gives you access to the full
            consortium — dashboards, verification, and support built for your role.
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
