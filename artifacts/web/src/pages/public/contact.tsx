import { PublicLayout } from "@/components/layout/PublicLayout"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Mail, Building2, Landmark, Users, Map, Store,
  GraduationCap, Car, LifeBuoy,
} from "lucide-react"
import { useState } from "react"

const departments = [
  { icon: Building2, label: "General / Office", email: "office@africalrmc.com" },
  { icon: Users, label: "Membership & Verification", email: "membership@africalrmc.com" },
  { icon: Landmark, label: "Finance & Treasury", email: "finance@africalrmc.com" },
  { icon: Map, label: "Land & Construction", email: "land@africalrmc.com" },
  { icon: Store, label: "Marketplace & Store", email: "marketplace@africalrmc.com" },
  { icon: GraduationCap, label: "Youth Employment", email: "youth@africalrmc.com" },
  { icon: Car, label: "Ususu Drivers", email: "drivers@africaususu.com" },
  { icon: LifeBuoy, label: "Support & Help Desk", email: "support@africalrmc.com" },
]

export default function Contact() {
  const [form, setForm] = useState({ name: "", email: "", department: "office@africalrmc.com", message: "" })

  const mailtoHref = `mailto:${form.department}?subject=${encodeURIComponent(
    `Inquiry from ${form.name || "LRMC website"}`
  )}&body=${encodeURIComponent(
    `${form.message}\n\n— ${form.name}${form.email ? ` (${form.email})` : ""}`
  )}`

  return (
    <PublicLayout>
      <section className="bg-gradient-to-b from-primary/5 to-background">
        <div className="max-w-4xl mx-auto px-4 md:px-8 py-16 md:py-24 text-center">
          <span className="inline-block text-xs font-semibold uppercase tracking-wider text-primary bg-primary/10 rounded-full px-3 py-1 mb-6">
            Contact
          </span>
          <h1 className="font-serif text-4xl md:text-5xl font-bold mb-6">
            Talk to LRMC
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Whether you're a property owner, a renter planning a trip, a driver,
            or a prospective partner — reach the right team directly.
          </p>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 md:px-8 py-16 md:py-24 grid md:grid-cols-5 gap-10">
        <div className="md:col-span-3">
          <Card>
            <CardContent className="p-6 md:p-8">
              <h2 className="font-serif text-xl font-bold mb-6">Send us a message</h2>
              <form
                className="space-y-5"
                onSubmit={(e) => {
                  e.preventDefault()
                  window.location.href = mailtoHref
                }}
              >
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Your name</Label>
                    <Input id="name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Your email</Label>
                    <Input id="email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <select
                    id="department"
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                    value={form.department}
                    onChange={(e) => setForm({ ...form, department: e.target.value })}
                  >
                    {departments.map((d) => (
                      <option key={d.email} value={d.email}>{d.label} — {d.email}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="message">Message</Label>
                  <Textarea id="message" rows={5} required value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
                </div>
                <Button type="submit" size="lg" className="gap-2 w-full sm:w-auto">
                  <Mail className="h-4 w-4" /> Send via Email
                </Button>
                <p className="text-xs text-muted-foreground">
                  This opens your email app with the message pre-filled so it's
                  sent directly from your own inbox to the right LRMC department.
                </p>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2 space-y-3">
          <h2 className="font-serif text-xl font-bold mb-2">Direct department contacts</h2>
          {departments.map((d) => (
            <a key={d.email} href={`mailto:${d.email}`} className="block">
              <Card className="hover:border-primary/40 transition-colors">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="bg-primary/10 p-2 rounded-lg shrink-0">
                    <d.icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{d.label}</p>
                    <p className="text-xs text-muted-foreground truncate">{d.email}</p>
                  </div>
                </CardContent>
              </Card>
            </a>
          ))}
        </div>
      </section>

      <section className="bg-card border-t border-border/60">
        <div className="max-w-4xl mx-auto px-4 md:px-8 py-12 text-center">
          <p className="text-sm text-muted-foreground">
            Already a member? <a href="/login" className="text-primary font-medium hover:underline">Sign in to your dashboard</a> to
            reach your team through internal messages and tickets — the fastest
            way to get a response.
          </p>
        </div>
      </section>
    </PublicLayout>
  )
}
