import { AppLayout } from "@/components/layout/AppLayout"
import { useListPropertyListings, getListPropertyListingsQueryKey, useCreatePropertyListing, useGetCurrentUser, useUpdatePropertyListing } from "@workspace/api-client-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useQueryClient } from "@tanstack/react-query"
import { useToast } from "@/hooks/use-toast"
import { useState } from "react"
import { formatMoney, formatDate } from "@/lib/utils"
import { Building2, MapPin } from "lucide-react"

export default function Properties() {
  const { data: properties, isLoading } = useListPropertyListings({}, { query: { queryKey: getListPropertyListingsQueryKey() }})
  const { data: user } = useGetCurrentUser()

  return (
    <AppLayout>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Properties</h1>
          <p className="text-muted-foreground mt-1">Browse and manage residential & commercial rentals.</p>
        </div>
        <AddPropertyDialog />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
          {[1,2,3].map(i => <div key={i} className="h-64 bg-muted rounded-xl"></div>)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {properties?.map(p => (
            <PropertyCard key={p.id} property={p} isOwner={p.ownerId === user?.id} isAdmin={user?.role === 'admin'} />
          ))}
          {properties?.length === 0 && (
            <div className="col-span-full py-12 text-center text-muted-foreground bg-card border rounded-lg">
              No property listings found.
            </div>
          )}
        </div>
      )}
    </AppLayout>
  )
}

function PropertyCard({ property, isOwner, isAdmin }: { property: any, isOwner: boolean, isAdmin: boolean }) {
  const update = useUpdatePropertyListing()
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const setStatus = (status: string) => {
    update.mutate({ id: property.id, data: { status } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListPropertyListingsQueryKey() })
        toast({ title: "Status updated" })
      }
    })
  }

  return (
    <Card className="overflow-hidden flex flex-col hover:border-primary/50 transition-colors">
      <div className="h-32 bg-muted/50 flex items-center justify-center border-b relative">
        <Building2 className="h-12 w-12 text-muted-foreground/30" />
        <div className="absolute top-3 right-3">
          <Badge variant={property.status === 'active' ? 'default' : 'secondary'}>{property.status}</Badge>
        </div>
      </div>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="line-clamp-1">{property.title}</CardTitle>
            <CardDescription className="flex items-center gap-1 mt-1 text-xs">
              <MapPin className="h-3 w-3" />
              {property.location}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="text-2xl font-serif font-bold text-primary">
          {formatMoney(property.priceCents)}
        </div>
        <p className="text-xs text-muted-foreground capitalize mt-1">Category: {property.category}</p>
        <p className="text-xs text-muted-foreground mt-1">Listed on {formatDate(property.createdAt)}</p>
      </CardContent>
      <CardFooter className="bg-muted/20 border-t py-3 gap-2">
        {(isAdmin || isOwner) && property.status !== 'active' && (
          <Button size="sm" className="w-full" onClick={() => setStatus('active')}>Activate</Button>
        )}
        {(isAdmin || isOwner) && property.status === 'active' && (
          <Button size="sm" variant="outline" className="w-full" onClick={() => setStatus('archived')}>Archive</Button>
        )}
        {!isAdmin && !isOwner && property.status === 'active' && (
          <Button size="sm" className="w-full">Contact Owner</Button>
        )}
      </CardFooter>
    </Card>
  )
}

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  location: z.string().min(1, "Location is required"),
  category: z.string().min(1, "Category is required"),
  priceAmount: z.string().refine(v => !isNaN(Number(v)) && Number(v) >= 0, "Valid price required"),
})

function AddPropertyDialog() {
  const [open, setOpen] = useState(false)
  const create = useCreatePropertyListing()
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { title: "", location: "", category: "house", priceAmount: "" }
  })

  function onSubmit(values: z.infer<typeof formSchema>) {
    create.mutate({
      data: {
        title: values.title,
        location: values.location,
        category: values.category,
        priceCents: Math.floor(Number(values.priceAmount) * 100)
      }
    }, {
      onSuccess: () => {
        toast({ title: "Property listed successfully" })
        queryClient.invalidateQueries({ queryKey: getListPropertyListingsQueryKey() })
        setOpen(false)
        form.reset()
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>List New Property</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>List Property</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="title" render={({ field }) => (
              <FormItem><FormLabel>Title</FormLabel><FormControl><Input placeholder="4 Bedroom Villa" {...field} /></FormControl><FormMessage/></FormItem>
            )}/>
            <FormField control={form.control} name="location" render={({ field }) => (
              <FormItem><FormLabel>Location</FormLabel><FormControl><Input placeholder="Brufut" {...field} /></FormControl><FormMessage/></FormItem>
            )}/>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="category" render={({ field }) => (
                <FormItem><FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="house">House / Apt</SelectItem>
                      <SelectItem value="airbnb">Short-let / Airbnb</SelectItem>
                      <SelectItem value="commercial">Commercial</SelectItem>
                      <SelectItem value="vehicle">Vehicle</SelectItem>
                    </SelectContent>
                  </Select>
                <FormMessage/></FormItem>
              )}/>
              <FormField control={form.control} name="priceAmount" render={({ field }) => (
                <FormItem><FormLabel>Price (GMD)</FormLabel><FormControl><Input type="number" placeholder="50000" {...field} /></FormControl><FormMessage/></FormItem>
              )}/>
            </div>
            <Button type="submit" disabled={create.isPending} className="w-full">
              Publish Listing
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
