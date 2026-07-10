import { PublicLayout } from "@/components/layout/PublicLayout"
import { useListDigitalProducts, useGetCurrentUser } from "@workspace/api-client-react"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DigitalProductCheckoutDialog } from "@/components/DigitalProductCheckoutDialog"
import { formatUSD } from "@/lib/utils"
import { Store as StoreIcon } from "lucide-react"

export default function Store() {
  const { data: products, isLoading } = useListDigitalProducts()
  const { data: user } = useGetCurrentUser()
  const isMember = !!user

  const active = (products ?? []).filter((p) => p.status === "active")

  return (
    <PublicLayout>
      <section className="bg-gradient-to-b from-primary/5 to-background border-b border-border/60">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-10 md:py-14">
          <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary bg-primary/10 rounded-full px-3 py-1 mb-6">
            <StoreIcon className="w-3.5 h-3.5" /> Digital Store
          </span>
          <h1 className="font-serif text-4xl md:text-5xl font-bold leading-tight text-foreground mb-4">
            Guides & templates, open to everyone.
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl">
            Purchase LRMC's lease templates, guides, and toolkits with no account required.
            {" "}<a href="/login" className="text-primary underline underline-offset-2">Sign in as a member</a> for an automatic 10% discount.
          </p>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 md:px-8 py-12">
        {isLoading ? (
          <p className="text-muted-foreground">Loading products...</p>
        ) : active.length === 0 ? (
          <p className="text-muted-foreground">No digital products are available right now. Check back soon.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {active.map((p) => (
              <Card key={p.id} className="flex flex-col">
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-lg">{p.title}</CardTitle>
                    <Badge variant="outline" className="capitalize shrink-0">{p.category}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 space-y-3">
                  <p className="text-sm text-muted-foreground">{p.description}</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold">{formatUSD(p.priceCents)}</span>
                    {isMember && <Badge variant="secondary">Member -10% at checkout</Badge>}
                  </div>
                </CardContent>
                <CardFooter className="border-t mt-auto pt-6">
                  <DigitalProductCheckoutDialog product={p} />
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </section>
    </PublicLayout>
  )
}
