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
import { formatMoney, formatDate } from "@/lib/utils"
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
                  {formatMoney(plot.priceCents)}
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
          </CardFooter>
        </Card>
      ))}
      {listings?.length === 0 && (
        <div className="col-span-full py-12 text-center text-muted-foreground bg-card border rounded-lg">
          No land listings available.
        </div>
      )}
    </div>
  )
}

function PurchaseLandButton({ plotId, priceCents }: { plotId: number, priceCents: number }) {
  const [open, setOpen] = useState(false)
  const purchase = useCreateLandTransaction()
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const onConfirm = () => {
    purchase.mutate({ data: { listingId: plotId } }, {
      onSuccess: () => {
        toast({ title: "Purchase initiated", description: "Transaction sent to treasury for settlement." })
        queryClient.invalidateQueries({ queryKey: getListLandListingsQueryKey() })
        queryClient.invalidateQueries({ queryKey: getListLandTransactionsQueryKey() })
        setOpen(false)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full bg-emerald-600 hover:bg-emerald-700">Initiate Purchase</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm Land Purchase</DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            You are about to initiate a purchase for this land. The total cost of <strong>{formatMoney(priceCents)}</strong> will be registered as a settlement obligation.
          </p>
          <Button onClick={onConfirm} disabled={purchase.isPending} className="w-full bg-emerald-600 hover:bg-emerald-700">
            Confirm Purchase
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function LandTransactionsTable() {
  const { data: txs, isLoading } = useListLandTransactions({ query: { queryKey: getListLandTransactionsQueryKey() }})

  if (isLoading) return <div className="h-64 bg-muted animate-pulse rounded-lg" />

  return (
    <div className="bg-card border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>TX ID</TableHead>
            <TableHead>Listing</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {txs?.map(tx => (
            <TableRow key={tx.id}>
              <TableCell className="font-mono text-xs">{tx.id}</TableCell>
              <TableCell>Listing #{tx.listingId}</TableCell>
              <TableCell className="font-medium">{formatMoney(tx.amountCents)}</TableCell>
              <TableCell>
                <Badge variant={tx.status === 'completed' ? 'default' : 'secondary'}>{tx.status}</Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">{formatDate(tx.createdAt)}</TableCell>
            </TableRow>
          ))}
          {txs?.length === 0 && (
            <TableRow><TableCell colSpan={5} className="text-center py-4">No transactions found.</TableCell></TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  location: z.string().min(1, "Location is required"),
  sizeMeters: z.string().refine(v => !isNaN(Number(v)) && Number(v) > 0, "Valid measurement required"),
  priceAmount: z.string().refine(v => !isNaN(Number(v)) && Number(v) >= 0, "Valid price required"),
})

function AddLandDialog() {
  const [open, setOpen] = useState(false)
  const create = useCreateLandListing()
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { title: "", location: "", sizeMeters: "", priceAmount: "" }
  })

  function onSubmit(values: z.infer<typeof formSchema>) {
    create.mutate({
      data: {
        title: values.title,
        location: values.location,
        sizeMeters: Number(values.sizeMeters),
        priceCents: Math.floor(Number(values.priceAmount) * 100)
      }
    }, {
      onSuccess: () => {
        toast({ title: "Land listed successfully" })
        queryClient.invalidateQueries({ queryKey: getListLandListingsQueryKey() })
        setOpen(false)
        form.reset()
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>List Plot</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Register Land Plot</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="title" render={({ field }) => (
              <FormItem><FormLabel>Title</FormLabel><FormControl><Input placeholder="Prime Plot near Beach" {...field} /></FormControl><FormMessage/></FormItem>
            )}/>
            <FormField control={form.control} name="location" render={({ field }) => (
              <FormItem><FormLabel>Location</FormLabel><FormControl><Input placeholder="Sanyang" {...field} /></FormControl><FormMessage/></FormItem>
            )}/>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="sizeMeters" render={({ field }) => (
                <FormItem><FormLabel>Measurement (m²)</FormLabel><FormControl><Input type="number" step="1" placeholder="500" {...field} /></FormControl><FormMessage/></FormItem>
              )}/>
              <FormField control={form.control} name="priceAmount" render={({ field }) => (
                <FormItem><FormLabel>Price (GMD)</FormLabel><FormControl><Input type="number" placeholder="150000" {...field} /></FormControl><FormMessage/></FormItem>
              )}/>
            </div>
            <Button type="submit" disabled={create.isPending} className="w-full">
              List for Sale
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
