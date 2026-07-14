import { AppLayout } from "@/components/layout/AppLayout"
import { useListLandListings, getListLandListingsQueryKey, useCreateLandListing, useGetCurrentUser, useListLandTransactions, getListLandTransactionsQueryKey, useCreateLandTransaction } from "@workspace/api-client-react"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useQueryClient } from "@tanstack/react-query"
import { useToast } from "@/hooks/use-toast"
import { useState } from "react"
import { formatUSD, formatGMD, formatDate } from "@/lib/utils"
import { useExchangeRate } from "@/hooks/useExchangeRate"
import { Map, MapPin } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default function Land() {
  const { data: user } = useGetCurrentUser()
  const isAdmin = user?.role === "admin"
  
  return (
    <AppLayout>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Land Registry</h1>
          <p className="text-muted-foreground mt-1">Browse and purchase available plots within the consortium.</p>
        </div>
        <AddLandDialog />
      </div>

      <div className="space-y-8">
        <LandListingsGrid />
        
        {isAdmin && (
          <div className="mt-12">
            <h2 className="text-2xl font-serif font-bold mb-4">Land Transactions Log</h2>
            <LandTransactionsTable />
          </div>
        )}
      </div>
    </AppLayout>
  )
}

function LandListingsGrid() {
  const { data: listings, isLoading } = useListLandListings({ query: { queryKey: getListLandListingsQueryKey() }})
  const { data: user } = useGetCurrentUser()
  const rate = useExchangeRate()

  if (isLoading) return <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
    {[1,2,3].map(i => <div key={i} className="h-48 bg-muted rounded-xl"></div>)}
  </div>

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {listings?.map(plot => (
        <Card key={plot.id} className="overflow-hidden flex flex-col hover:border-emerald-600/50 transition-colors">
          <CardHeader className="pb-2 bg-emerald-900/5 border-b border-emerald-900/10">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="line-clamp-1">{plot.title}</CardTitle>
                <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3 text-emerald-600" />
                  {plot.location}
                </div>
              </div>
              <Badge variant={plot.status === 'available' ? 'default' : 'secondary'} className={plot.status === 'available' ? 'bg-emerald-600' : ''}>
                {plot.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="flex-1 pt-4">
            <div className="flex justify-between items-end">
              <div>
                <div className="text-2xl font-serif font-bold text-foreground">
                  {formatGMD(plot.priceCents, rate)}
                </div>
                <div className="text-sm text-muted-foreground mt-0.5">
                  ≈ {formatUSD(plot.priceCents)}
                </div>
                <p className="text-sm font-medium text-emerald-600 mt-1">{plot.sizeMeters} m²</p>
              </div>
              <Map className="h-8 w-8 text-muted-foreground/20" />
            </div>
          </CardContent>
          <CardFooter className="bg-muted/20 border-t py-3">
            {plot.status === 'available' && plot.sellerId !== user?.id && (
              <PurchaseLandButton plotId={plot.id} priceCents={plot.priceCents} />
            )}
            {plot.sellerId === user?.id && (
              <div className="text-sm font-medium text-muted-foreground w-full text-center">Your Listing</div>
            )}
            {plot.status !== 'available' && plot.sellerId !== user?.id && (
              <div className="text-sm font-medium text-muted-foreground w-full text-center capitalize">{plot.status}</div>
            )}
          </CardFooter>
        </Card>
      ))}
      {listings?.length === 0 && (
        <div className="col-span-full py-12 text-center text-muted-foreground">No land listings available.</div>
      )}
    </div>
  )
}

function PurchaseLandButton({ plotId, priceCents }: { plotId: number; priceCents: number }) {
  const [open, setOpen] = useState(false)
  const create = useCreateLandTransaction()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const rate = useExchangeRate()

  const onConfirm = () => {
    create.mutate({ data: { listingId: plotId } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListLandListingsQueryKey() })
        queryClient.invalidateQueries({ queryKey: getListLandTransactionsQueryKey() })
        toast({ title: "Purchase recorded", description: "The land transaction has been logged." })
        setOpen(false)
      },
      onError: () => {
        toast({ title: "Purchase failed", description: "Please try again.", variant: "destructive" })
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="w-full bg-emerald-600 hover:bg-emerald-700">Purchase</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm Purchase</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          You are about to initiate a purchase for this land. The total cost of{" "}
          <strong>{formatGMD(priceCents, rate)}</strong> ({formatUSD(priceCents)}) will be
          registered as a settlement obligation.
        </p>
        <div className="flex gap-3 pt-2">
          <Button variant="outline" onClick={() => setOpen(false)} className="flex-1">Cancel</Button>
          <Button onClick={onConfirm} disabled={create.isPending} className="flex-1 bg-emerald-600 hover:bg-emerald-700">
            {create.isPending ? "Processing..." : "Confirm"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function LandTransactionsTable() {
  const { data: transactions, isLoading } = useListLandTransactions({ query: { queryKey: getListLandTransactionsQueryKey() }})
  const rate = useExchangeRate()

  if (isLoading) return <div className="h-32 bg-muted rounded-xl animate-pulse"></div>

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Listing</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions?.map(tx => (
            <TableRow key={tx.id}>
              <TableCell className="text-muted-foreground text-sm">#{tx.id}</TableCell>
              <TableCell>#{tx.listingId}</TableCell>
              <TableCell className="capitalize">{tx.status}</TableCell>
              <TableCell className="font-medium">
                <span>{formatGMD(tx.amountCents, rate)}</span>
                <span className="text-xs text-muted-foreground ml-1.5">{formatUSD(tx.amountCents)}</span>
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">{formatDate(tx.createdAt)}</TableCell>
            </TableRow>
          ))}
          {transactions?.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground py-8">No transactions yet.</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}

const addLandSchema = z.object({
  title: z.string().min(2, "Title is required"),
  location: z.string().min(2, "Location is required"),
  sizeMeters: z.coerce.number().positive("Size must be positive"),
  priceCents: z.coerce.number().int().positive("Price must be positive"),
})

function AddLandDialog() {
  const [open, setOpen] = useState(false)
  const { data: user } = useGetCurrentUser()
  const create = useCreateLandListing()
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const form = useForm<z.infer<typeof addLandSchema>>({
    resolver: zodResolver(addLandSchema),
    defaultValues: { title: "", location: "", sizeMeters: 0, priceCents: 0 },
  })

  if (!user) return null

  const onSubmit = (values: z.infer<typeof addLandSchema>) => {
    create.mutate({ data: { title: values.title, location: values.location, priceCents: values.priceCents, sizeMeters: values.sizeMeters } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListLandListingsQueryKey() })
        toast({ title: "Listing created" })
        setOpen(false)
        form.reset()
      },
      onError: () => {
        toast({ title: "Failed to create listing", variant: "destructive" })
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-emerald-600 hover:bg-emerald-700">+ Add Listing</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Land Listing</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="title" render={({ field }) => (
              <FormItem>
                <FormLabel>Title</FormLabel>
                <FormControl><Input placeholder="Plot in Bakau" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="location" render={({ field }) => (
              <FormItem>
                <FormLabel>Location</FormLabel>
                <FormControl><Input placeholder="Bakau, The Gambia" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="sizeMeters" render={({ field }) => (
              <FormItem>
                <FormLabel>Measurement (m²)</FormLabel>
                <FormControl><Input type="number" step="1" min="1" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="priceCents" render={({ field }) => (
              <FormItem>
                <FormLabel>Price (USD cents — e.g. 500000 = $5,000)</FormLabel>
                <FormControl><Input type="number" step="1" min="1" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <Button type="submit" disabled={create.isPending} className="w-full">
              {create.isPending ? "Creating..." : "Create Listing"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
