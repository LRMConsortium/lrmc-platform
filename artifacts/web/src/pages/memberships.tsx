import { AppLayout } from "@/components/layout/AppLayout"
import {
  useListMemberships,
  getListMembershipsQueryKey,
  useCreateMembership,
  useUpdateMembership,
  useGetCurrentUser,
  useGetMyMembership,
  getGetMyMembershipQueryKey,
  useCheckoutMembership,
  useSubmitMembershipKyc,
  useReviewMembershipKyc,
} from "@workspace/api-client-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useQueryClient } from "@tanstack/react-query"
import { useToast } from "@/hooks/use-toast"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useEffect, useState } from "react"
import { useSearch } from "wouter"
import { formatMoney, formatDate } from "@/lib/utils"
import { Loader2, ShieldCheck, XCircle } from "lucide-react"

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
  const reviewKyc = useReviewMembershipKyc()
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

  const handleReviewKyc = (id: number, action: "approve" | "reject") => {
    reviewKyc.mutate({ id, data: { action } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListMembershipsQueryKey() })
        toast({ title: action === "approve" ? "KYC approved" : "KYC rejected" })
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
            <TableHead>Payment</TableHead>
            <TableHead>KYC</TableHead>
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
                <Badge variant={m.paymentStatus === 'paid' ? 'default' : 'secondary'}>{m.paymentStatus}</Badge>
              </TableCell>
              <TableCell>
                <Badge variant={m.kycStatus === 'approved' ? 'default' : m.kycStatus === 'rejected' ? 'destructive' : 'secondary'}>
                  {m.kycStatus.replace('_', ' ')}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant={m.status === 'active' ? 'default' : m.status === 'pending' ? 'secondary' : 'destructive'}>
                  {m.status}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">{formatDate(m.createdAt)}</TableCell>
              <TableCell className="text-right">
                {m.kycStatus === 'pending' && (
                  <div className="flex justify-end gap-2">
                    <Button size="sm" onClick={() => handleReviewKyc(m.id, 'approve')}>Approve KYC</Button>
                    <Button size="sm" variant="destructive" onClick={() => handleReviewKyc(m.id, 'reject')}>Reject KYC</Button>
                  </div>
                )}
                {m.kycStatus !== 'pending' && m.status === 'active' && (
                  <Button size="sm" variant="outline" onClick={() => handleUpdateStatus(m.id, 'suspended')}>Suspend</Button>
                )}
                {m.kycStatus !== 'pending' && m.status === 'suspended' && (
                  <Button size="sm" onClick={() => handleUpdateStatus(m.id, 'active')}>Reinstate</Button>
                )}
              </TableCell>
            </TableRow>
          ))}
          {memberships?.length === 0 && (
            <TableRow>
              <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No memberships found.</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}

function MemberMembershipView() {
  const { data: user } = useGetCurrentUser()
  const search = useSearch()
  const { data: myMembership, isLoading } = useGetMyMembership({ query: { queryKey: getGetMyMembershipQueryKey(), retry: false } })
  const checkout = useCheckoutMembership()
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const checkoutParam = new URLSearchParams(search).get("checkout")

  useEffect(() => {
    if (checkoutParam === "success") {
      queryClient.invalidateQueries({ queryKey: getGetMyMembershipQueryKey() })
      toast({ title: "Payment received", description: "Finalizing your membership fee..." })
    } else if (checkoutParam === "cancelled") {
      toast({ title: "Checkout cancelled", variant: "destructive" })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkoutParam])

  if (isLoading) return <div className="animate-pulse h-64 bg-muted rounded"></div>

  const handlePay = () => {
    if (!myMembership || !user) return
    checkout.mutate({ id: myMembership.id, data: { buyerEmail: user.email } }, {
      onSuccess: (session) => {
        window.location.href = session.checkoutUrl
      },
      onError: () => {
        toast({ title: "Couldn't start checkout", description: "Please try again.", variant: "destructive" })
      }
    })
  }

  return (
    <div className="bg-card border rounded-lg p-6">
      {myMembership ? (
        <div className="space-y-6">
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
                <p className="text-sm text-muted-foreground uppercase font-bold tracking-wider">Payment</p>
                <Badge className="mt-1" variant={myMembership.paymentStatus === 'paid' ? 'default' : 'secondary'}>{myMembership.paymentStatus}</Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground uppercase font-bold tracking-wider">Member Since</p>
                <p className="font-medium">{formatDate(myMembership.createdAt)}</p>
              </div>
            </div>
          </div>

          {myMembership.paymentStatus === "unpaid" && (
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-5 space-y-3">
              <h3 className="font-semibold">Membership fee required</h3>
              <p className="text-sm text-muted-foreground">
                Pay your membership fee to continue to identity verification and unlock the member's area.
              </p>
              <Button onClick={handlePay} disabled={checkout.isPending}>
                {checkout.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Pay membership fee
              </Button>
            </div>
          )}

          {myMembership.paymentStatus === "paid" && myMembership.kycStatus !== "approved" && (
            <MembershipKycForm membership={myMembership} />
          )}

          {myMembership.kycStatus === "approved" && (
            <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400">
              <ShieldCheck className="h-4 w-4" /> Identity verified — you have full access to the member's area.
            </div>
          )}
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

function MembershipKycForm({ membership }: { membership: { id: number; kycStatus: string; kycFullName?: string | null; kycIdType?: string | null; kycIdNumber?: string | null; kycNotes?: string | null } }) {
  const [fullName, setFullName] = useState(membership.kycFullName ?? "")
  const [idType, setIdType] = useState(membership.kycIdType ?? "national_id")
  const [idNumber, setIdNumber] = useState(membership.kycIdNumber ?? "")
  const submitKyc = useSubmitMembershipKyc()
  const queryClient = useQueryClient()
  const { toast } = useToast()

  if (membership.kycStatus === "pending") {
    return (
      <div className="rounded-lg border border-amber-400/40 bg-amber-500/10 p-5 space-y-1">
        <h3 className="font-semibold flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Identity verification pending</h3>
        <p className="text-sm text-muted-foreground">An admin is reviewing your submission. This can take a little time.</p>
      </div>
    )
  }

  const onSubmit = () => {
    submitKyc.mutate({ id: membership.id, data: { fullName, idType, idNumber } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetMyMembershipQueryKey() })
        toast({ title: "Verification submitted", description: "We'll review it shortly." })
      },
      onError: () => {
        toast({ title: "Couldn't submit verification", description: "Please try again.", variant: "destructive" })
      }
    })
  }

  return (
    <div className="rounded-lg border border-primary/30 bg-primary/5 p-5 space-y-4">
      <div>
        <h3 className="font-semibold">Identity verification required</h3>
        <p className="text-sm text-muted-foreground">
          Submit a few details so an admin can verify your identity before granting full access.
        </p>
      </div>
      {membership.kycStatus === "rejected" && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          <XCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">Your previous submission was rejected</p>
            {membership.kycNotes && <p className="text-destructive/80">{membership.kycNotes}</p>}
            <p className="text-destructive/80">Please correct the details below and resubmit.</p>
          </div>
        </div>
      )}
      <div className="grid gap-3 max-w-md">
        <div className="space-y-1">
          <label className="text-sm font-medium">Full legal name</label>
          <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="As shown on your ID" />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">ID type</label>
          <Select value={idType} onValueChange={setIdType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="national_id">National ID Card (NIC)</SelectItem>
              <SelectItem value="passport">Passport</SelectItem>
              <SelectItem value="drivers_license">Driver's Licence</SelectItem>
              <SelectItem value="voters_id">Voter's ID Card</SelectItem>
              <SelectItem value="foreign_national_id">Foreign National ID</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">ID number</label>
          <Input value={idNumber} onChange={(e) => setIdNumber(e.target.value)} placeholder="Document number" />
        </div>
        <Button onClick={onSubmit} disabled={submitKyc.isPending || !fullName || !idNumber}>
          {submitKyc.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
          Submit for review
        </Button>
      </div>
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
