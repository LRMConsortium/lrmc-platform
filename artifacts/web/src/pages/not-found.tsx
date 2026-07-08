import { AppLayout } from "@/components/layout/AppLayout"
import { Link } from "wouter"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <AppLayout>
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center">
        <h1 className="text-6xl font-serif font-bold text-primary mb-4">404</h1>
        <p className="text-xl text-muted-foreground mb-8">This module could not be found within the consortium records.</p>
        <Link href="/">
          <Button size="lg">Return to Dashboard</Button>
        </Link>
      </div>
    </AppLayout>
  )
}
