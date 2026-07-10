import { PublicLayout } from "@/components/layout/PublicLayout"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Link } from "wouter"
import { XCircle } from "lucide-react"

export default function StoreCancel() {
  return (
    <PublicLayout>
      <section className="max-w-2xl mx-auto px-4 md:px-8 py-16">
        <Card>
          <CardContent className="pt-10 pb-10 text-center space-y-4">
            <XCircle className="w-12 h-12 text-muted-foreground mx-auto" />
            <h1 className="font-serif text-2xl font-bold">Checkout cancelled</h1>
            <p className="text-muted-foreground">
              No payment was made. You can pick up where you left off any time.
            </p>
            <Link href="/store">
              <Button>Back to the store</Button>
            </Link>
          </CardContent>
        </Card>
      </section>
    </PublicLayout>
  )
}
