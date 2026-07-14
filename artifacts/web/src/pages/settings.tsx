import { useState } from "react"
import { AppLayout } from "@/components/layout/AppLayout"
import { useGetCurrentUser } from "@workspace/api-client-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useQueryClient } from "@tanstack/react-query"
import { useToast } from "@/hooks/use-toast"
import { useExchangeRate } from "@/hooks/useExchangeRate"
import { formatGMD, formatUSD } from "@/lib/utils"

export default function Settings() {
  const { data: user } = useGetCurrentUser()
  const isAdmin = user?.role === "admin"

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-serif font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your account profile and platform configuration.</p>
      </div>

      <div className="max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Profile Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input defaultValue={user?.fullName} disabled />
            </div>
            <div className="space-y-2">
              <Label>Email Address</Label>
              <Input defaultValue={user?.email} disabled />
            </div>
            <div className="space-y-2">
              <Label>Phone Number</Label>
              <Input defaultValue={user?.phone} disabled />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Input defaultValue={user?.role} className="capitalize" disabled />
            </div>
            <Button className="mt-4" disabled>Update Profile</Button>
          </CardContent>
        </Card>

        {isAdmin && <ExchangeRateCard />}
      </div>
    </AppLayout>
  )
}

function ExchangeRateCard() {
  const rate = useExchangeRate()
  const [newRate, setNewRate] = useState("")
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const onSave = async () => {
    const parsed = parseFloat(newRate)
    if (!parsed || parsed <= 0 || parsed > 10000) {
      toast({ title: "Invalid rate", description: "Enter a positive number (e.g. 70).", variant: "destructive" })
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}api/settings/exchange-rate`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ usdToGmd: parsed }),
      })
      if (!res.ok) throw new Error("Failed")
      await queryClient.invalidateQueries({ queryKey: ["exchange-rate"] })
      toast({ title: "Exchange rate updated", description: `Now $1 = D ${parsed}` })
      setNewRate("")
    } catch {
      toast({ title: "Could not update rate", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>USD → GMD Exchange Rate</CardTitle>
        <CardDescription>
          All prices are stored in USD. This rate converts them to Gambian Dalasi for display across
          the platform. Update it whenever the rate changes significantly.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md bg-muted/50 px-4 py-3 text-sm space-y-1">
          <div className="font-medium">Current rate: <span className="text-primary">1 USD = D {rate} GMD</span></div>
          <div className="text-muted-foreground">Example: {formatUSD(500000)} = {formatGMD(500000, rate)}</div>
        </div>
        <div className="flex gap-3 items-end">
          <div className="flex-1 space-y-2">
            <Label>New rate (GMD per $1 USD)</Label>
            <Input
              type="number"
              step="0.01"
              min="1"
              max="10000"
              placeholder={`Current: ${rate}`}
              value={newRate}
              onChange={e => setNewRate(e.target.value)}
            />
          </div>
          <Button onClick={onSave} disabled={saving || !newRate}>
            {saving ? "Saving…" : "Update Rate"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
