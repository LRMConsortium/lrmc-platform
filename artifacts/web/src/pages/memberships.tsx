import { AppLayout } from "@/components/layout/AppLayout"
import { useListMemberships, getListMembershipsQueryKey, useCreateMembership, useUpdateMembership, useGetCurrentUser, useGetMyMembership, getGetMyMembershipQueryKey } from "@workspace/api-client-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useQueryClient } from "@tanstack/react-query"
import { useToast } from "@/hooks/use-toast"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useState } from "react"
import { formatMoney, formatDate } from "@/lib/utils"

export default function Memberships() {
  const { data: user } = useGetCurrentUser()
  const isAdmin = user?.role === "admin"

  return (
    <AppLayout>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Memberships</h1>
          <p className="text-muted-foreground mt-1">Manage LRMC consortium memberships.</p>
        </div>
        {!isAdmin && <ApplyMembershipDialog />}
      </div>
      
      {isAdmin ? <AdminMembershipView /> : <MemberMembershipView />}
    </AppLayout>
  )
}

function AdminMembershipView() {
  const { data: memberships, isLoading } = useListMemberships({}, { query: { queryKey: getListMembershipsQueryKey() }})
  const updateMembership = useUpdateMembership()
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const handleUpdateStatus = (id: number, status: string) => {
    updateMembership.mutate({ id, data: { status } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListMembershipsQueryKey() })
        toast({ title: "Status updated" })
      }
    })
  }

  if (isLoading) return <div className="animate-pulse h-64 bg-muted rounded"></div>

  return (
    <div className="bg-card border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User ID</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Fee Paid</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Applied</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {memberships?.map(m => (
            <TableRow key={m.id}>
              <TableCell className="font-mono text-xs">{m.userId}</TableCell>
              <TableCell className="capitalize font-semibold">{m.type}</TableCell>
              <TableCell>{formatMoney(m.feePaidCents)}</TableCell>
              <TableCell>
                <Badge variant={m.status === 'active' ? 'default' : m.status === 'pending' ? 'secondary' : 'destructive'}>
                  {m.status}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">{formatDate(m.createdAt)}</TableCell>
              <TableCell className="text-right">
                {m.status === 'pending' && (
                  <div className="flex justify-end gap-2">
                    <Button size="sm" onClick={() => handleUpdateStatus(m.id, 'active')}>Approve</Button>
                    <Button size="sm" variant="destructive" onClick={() => handleUpdateStatus(m.id, 'rejected')}>Reject</Button>
                  </div>
                )}
                {m.status === 'active' && (
                  <Button size="sm" variant="outline" onClick={() => handleUpdateStatus(m.id, 'suspended')}>Suspend</Button>
                )}
              </TableCell>
            </TableRow>
          ))}
          {memberships?.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No memberships found.</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}

function MemberMembershipView() {
  const { data: myMembership, isLoading } = useGetMyMembership({ query: { queryKey: getGetMyMembershipQueryKey(), retry: false } })

  if (isLoading) return <div className="animate-pulse h-64 bg-muted rounded"></div>

  return (
    <div className="bg-card border rounded-lg p-6">
      {myMembership ? (
        <div className="space-y-4">
          <h2 className="text-xl font-bold font-serif">Your Membership</h2>
          <div className="grid grid-cols-2 gap-4 max-w-md">
            <div>
              <p className="text-sm text-muted-foreground uppercase font-bold tracking-wider">Type</p>
              <p className="font-semibold text-lg capitalize">{myMembership.type}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground uppercase font-bold tracking-wider">Status</p>
              <Badge className="mt-1" variant={myMembership.status === 'active' ? 'default' : 'secondary'}>{myMembership.status}</Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground uppercase font-bold tracking-wider">Member Since</p>
              <p className="font-medium">{formatDate(myMembership.createdAt)}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-lg text-muted-foreground mb-4">You don't have an active membership yet.</p>
          <ApplyMembershipDialog />
        </div>
      )}
    </div>
  )
}

function ApplyMembershipDialog() {
  const [open, setOpen] = useState(false)
  const [type, setType] = useState("basic")
  const apply = useCreateMembership()
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const onSubmit = () => {
    apply.mutate({ data: { type } }, {
      onSuccess: () => {
        toast({ title: "Application submitted", description: "Your membership application is pending review." })
        queryClient.invalidateQueries({ queryKey: getListMembershipsQueryKey() })
        setOpen(false)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Apply for Membership</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Apply for Membership</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Membership Tier</label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="basic">Basic (Free)</SelectItem>
                <SelectItem value="premium">Premium (D5,000 / yr)</SelectItem>
                <SelectItem value="corporate">Corporate (D20,000 / yr)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={onSubmit} disabled={apply.isPending} className="w-full">
            Submit Application
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
