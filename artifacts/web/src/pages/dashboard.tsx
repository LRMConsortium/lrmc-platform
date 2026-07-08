import { AppLayout } from "@/components/layout/AppLayout"
import { useGetCurrentUser } from "@workspace/api-client-react"
import { Redirect } from "wouter"
import { DashboardAdmin } from "./dashboard-admin"
import { DashboardMember } from "./dashboard-member"
import { Loader2 } from "lucide-react"

export default function Dashboard() {
  const { data: user, isLoading } = useGetCurrentUser()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!user) {
    return <Redirect href="/login" />
  }

  return (
    <AppLayout>
      {user.role === "admin" ? <DashboardAdmin /> : <DashboardMember />}
    </AppLayout>
  )
}
