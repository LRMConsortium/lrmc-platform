import { PublicLayout } from "@/components/layout/PublicLayout"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Link } from "wouter"
import { CheckCircle2 } from "lucide-react"

export default function StoreSuccess() {
  return (
    <PublicLayout>
      <section className="max-w-2xl mx-auto px-4 md:px-8 py-24">
        <Card>
          <CardContent className="pt-10 pb-10 text-center space-y-4">
            <CheckCircle2 className="w-12 h-12 text-primary mx-auto" />
            <h1 className="font-serif text-2xl font-bold">Payment received</h1>
            <p className="text-muted-foreground">
              Thank you for your purchase. We've emailed your download link to the address
              you provided at checkout — it may take a minute to arrive.
            </p>
            <Link href="/store">
              <Button variant="outline">Back to the store</Button>
            </Link>
          </CardContent>
        </Card>
      </section>
    </PublicLayout>
  )
}
