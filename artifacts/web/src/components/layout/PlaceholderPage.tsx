import { AppLayout } from "@/components/layout/AppLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function PlaceholderPage({ title, desc }: { title: string, desc: string }) {
  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-serif font-bold text-foreground">{title}</h1>
        <p className="text-muted-foreground mt-1">{desc}</p>
      </div>
      <Card>
        <CardContent className="py-24 text-center">
          <p className="text-muted-foreground text-lg">Module integrated into the Consortium ecosystem.</p>
          <p className="text-sm text-muted-foreground/60 mt-2">Data syncing via backend API.</p>
        </CardContent>
      </Card>
    </AppLayout>
  )
}
