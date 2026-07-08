import { AppLayout } from "@/components/layout/AppLayout"
import { useGetCurrentUser } from "@workspace/api-client-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export default function Settings() {
  const { data: user } = useGetCurrentUser()

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-serif font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your account profile.</p>
      </div>

      <div className="max-w-2xl">
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
      </div>
    </AppLayout>
  )
}
