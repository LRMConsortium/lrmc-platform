import { useState } from "react"
import { useCheckoutDigitalProduct, useGetCurrentUser, type DigitalProduct } from "@workspace/api-client-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { formatUSD } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { Download } from "lucide-react"

/** Member discount, mirrored from the server's coupon (also enforced server-side). */
const MEMBER_DISCOUNT_PERCENT = 10

export function DigitalProductCheckoutDialog({ product }: { product: DigitalProduct }) {
  const [open, setOpen] = useState(false)
  const { data: user } = useGetCurrentUser()
  const isMember = !!user
  const [email, setEmail] = useState(user?.email ?? "")
  const { toast } = useToast()

  const checkout = useCheckoutDigitalProduct({
    mutation: {
      onSuccess: (data) => {
        window.location.href = data.checkoutUrl
      },
      onError: () => {
        toast({ title: "Couldn't start checkout", description: "Please try again in a moment.", variant: "destructive" })
      },
    },
  })

  const discountedCents = isMember
    ? Math.round(product.priceCents * (1 - MEMBER_DISCOUNT_PERCENT / 100))
    : product.priceCents
  const canSubmit = /\S+@\S+\.\S+/.test(email)

  return (
    <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (next) setEmail(user?.email ?? "") }}>
      <DialogTrigger asChild>
        <Button className="w-full gap-2"><Download className="w-4 h-4" /> Purchase & Download</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{product.title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{product.description}</p>
          <div className="flex items-baseline gap-2">
            {isMember ? (
              <>
                <span className="text-2xl font-bold">{formatUSD(discountedCents)}</span>
                <span className="text-sm text-muted-foreground line-through">{formatUSD(product.priceCents)}</span>
                <Badge variant="secondary">Member -{MEMBER_DISCOUNT_PERCENT}%</Badge>
              </>
            ) : (
              <span className="text-2xl font-bold">{formatUSD(product.priceCents)}</span>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="checkout-email">Your email</Label>
            <Input
              id="checkout-email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">Your download link is sent here after payment.</p>
          </div>
        </div>
        <DialogFooter>
          <Button
            className="w-full"
            disabled={!canSubmit || checkout.isPending}
            onClick={() => checkout.mutate({ id: product.id, data: { buyerEmail: email } })}
          >
            {checkout.isPending ? "Redirecting to secure checkout..." : "Continue to payment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
