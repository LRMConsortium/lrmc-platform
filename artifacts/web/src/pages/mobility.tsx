import { AppLayout } from "@/components/layout/AppLayout"
import { useListDrivers, useListRides, useCreateRide, useGetCurrentUser, useUpdateRide } from "@workspace/api-client-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
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
import { Car, MapPin, Navigation } from "lucide-react"

export default function Mobility() {
  const { data: user } = useGetCurrentUser()
  const isAdmin = user?.role === "admin"

  return (
    <AppLayout>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Ususu Mobility</h1>
          <p className="text-muted-foreground mt-1">Consortium ride-hailing & logistics.</p>
        </div>
        {!isAdmin && <BookRideDialog />}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-2xl font-serif font-bold">Recent Rides</h2>
          <RidesList />
        </div>
        
        {isAdmin && (
          <div className="space-y-6">
            <h2 className="text-xl font-serif font-bold">Active Drivers</h2>
            <DriversList />
          </div>
        )}
      </div>
    </AppLayout>
  )
}

function RidesList() {
  const { data: rides, isLoading } = useListRides()
  const { data: user } = useGetCurrentUser()
  const isAdmin = user?.role === "admin"
  const update = useUpdateRide()
  const queryClient = useQueryClient()

  const setStatus = (id: number, status: string) => {
    update.mutate({ id, data: { status } }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/rides"] })
    })
  }

  if (isLoading) return <div className="space-y-4 animate-pulse"><div className="h-32 bg-muted rounded-xl"></div></div>

  return (
    <div className="space-y-4">
      {rides?.map(ride => (
        <Card key={ride.id} className="overflow-hidden border-l-4 border-l-slate-800">
          <CardContent className="p-0">
            <div className="flex flex-col sm:flex-row">
              <div className="p-5 flex-1 relative">
                <div className="absolute top-5 right-5">
                  <Badge variant={ride.status === 'completed' ? 'secondary' : 'default'}>{ride.status}</Badge>
                </div>
                
                <div className="flex items-start gap-4 mb-4">
                  <div className="mt-1 flex flex-col items-center">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    <div className="w-0.5 h-6 bg-border" />
                    <MapPin className="w-4 h-4 text-destructive" />
                  </div>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Pickup</p>
                      <p className="font-medium">{ride.pickup}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Dropoff</p>
                      <p className="font-medium">{ride.dropoff}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-sm mt-4 pt-4 border-t">
                  <span className="font-bold text-lg text-primary">{formatMoney(ride.fareCents)}</span>
                  <span className="text-muted-foreground px-2 border-l">{formatDate(ride.createdAt)}</span>
                </div>
              </div>
              
              {isAdmin && ride.status === 'requested' && (
                <div className="bg-muted/30 p-4 sm:w-48 flex flex-col justify-center gap-2 border-l">
                  <Button size="sm" onClick={() => setStatus(ride.id, 'accepted')}>Assign Driver</Button>
                  <Button size="sm" variant="destructive" onClick={() => setStatus(ride.id, 'cancelled')}>Cancel</Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
      {rides?.length === 0 && (
        <div className="py-12 text-center text-muted-foreground border rounded-lg bg-card">No rides found.</div>
      )}
    </div>
  )
}

function DriversList() {
  const { data: drivers, isLoading } = useListDrivers()

  if (isLoading) return <div className="space-y-4 animate-pulse"><div className="h-20 bg-muted rounded-xl"></div></div>

  return (
    <div className="space-y-3">
      {drivers?.map(d => (
        <Card key={d.id}>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="bg-slate-100 p-3 rounded-full text-slate-700">
              <Car className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold truncate text-sm">Driver #{d.userId}</h4>
              <p className="text-xs text-muted-foreground truncate">{d.vehicleInfo}</p>
            </div>
            <Badge variant={d.status === 'active' ? 'default' : 'secondary'} className="text-[10px]">{d.status}</Badge>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

const formSchema = z.object({
  pickup: z.string().min(2, "Required"),
  dropoff: z.string().min(2, "Required"),
})

function BookRideDialog() {
  const [open, setOpen] = useState(false)
  const create = useCreateRide()
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { pickup: "", dropoff: "" }
  })

  function onSubmit(values: z.infer<typeof formSchema>) {
    create.mutate({
      data: {
        pickup: values.pickup,
        dropoff: values.dropoff,
        fareCents: 50000 // Mock 500 GMD flat fare for stub
      }
    }, {
      onSuccess: () => {
        toast({ title: "Ride requested" })
        queryClient.invalidateQueries({ queryKey: ["/api/rides"] })
        setOpen(false)
        form.reset()
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-slate-800 hover:bg-slate-900 text-white"><Navigation className="w-4 h-4 mr-2" /> Book Ususu</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request Ususu Ride</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="pickup" render={({ field }) => (
              <FormItem><FormLabel>Pickup Location</FormLabel><FormControl><Input placeholder="Banjul Center" {...field} /></FormControl><FormMessage/></FormItem>
            )}/>
            <FormField control={form.control} name="dropoff" render={({ field }) => (
              <FormItem><FormLabel>Dropoff Location</FormLabel><FormControl><Input placeholder="Senegambia" {...field} /></FormControl><FormMessage/></FormItem>
            )}/>
            <Button type="submit" disabled={create.isPending} className="w-full">
              Request Ride (Flat 500 GMD)
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
