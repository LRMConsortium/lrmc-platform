import { useAuth } from "@workspace/replit-auth-web";
import { 
  useListDrivers, useCreateDriver, useUpdateDriver, 
  useListRides, useCreateRide, useUpdateRide 
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { Loader2, Car, MapPin, CheckCircle, Navigation } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { getListDriversQueryKey, getListRidesQueryKey } from "@workspace/api-client-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function UsusuPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<string>("rider");
  const [isDriverModalOpen, setDriverModalOpen] = useState(false);
  const [isRideModalOpen, setRideModalOpen] = useState(false);

  // Forms
  const [driverForm, setDriverForm] = useState({ vehicleInfo: "", licenseNumber: "" });
  const [rideForm, setRideForm] = useState({ pickup: "", dropoff: "", fareGmd: "" });

  const { data: myDriverData } = useListDrivers(
    { userId: user?.id },
    { query: { enabled: !isAdmin && !!user, queryKey: getListDriversQueryKey({ userId: user?.id }) } }
  );
  const myDriver = myDriverData?.[0];

  const { data: allDrivers, isLoading: loadingDrivers } = useListDrivers(
    {}, { query: { enabled: isAdmin, queryKey: getListDriversQueryKey({}) } }
  );

  const { data: rides, isLoading: loadingRides } = useListRides(
    isAdmin ? {} : activeTab === "rider" ? { riderId: user?.id } : { status: 'requested' },
    { query: { queryKey: getListRidesQueryKey(isAdmin ? {} : activeTab === "rider" ? { riderId: user?.id } : { status: 'requested' }) } }
  );
  
  const { data: myDriverRides } = useListRides(
    { driverId: myDriver?.id },
    { query: { enabled: !isAdmin && !!myDriver && activeTab === "driver", queryKey: getListRidesQueryKey({ driverId: myDriver?.id }) } }
  );

  const createDriver = useCreateDriver();
  const updateDriver = useUpdateDriver();
  const createRide = useCreateRide();
  const updateRide = useUpdateRide();

  const handleRegisterDriver = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    createDriver.mutate(
      { data: { userId: user.id, ...driverForm } },
      {
        onSuccess: () => {
          toast.success("Driver application submitted!");
          queryClient.invalidateQueries({ queryKey: getListDriversQueryKey({ userId: user.id }) });
          setDriverModalOpen(false);
        }
      }
    );
  };

  const handleRequestRide = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    createRide.mutate(
      { data: { riderId: user.id, ...rideForm, fareGmd: Number(rideForm.fareGmd) } },
      {
        onSuccess: () => {
          toast.success("Ride requested!");
          queryClient.invalidateQueries({ queryKey: getListRidesQueryKey({ riderId: user.id }) });
          setRideModalOpen(false);
          setRideForm({ pickup: "", dropoff: "", fareGmd: "" });
        }
      }
    );
  };

  const handleAcceptRide = (id: number) => {
    if (!myDriver) return;
    updateRide.mutate(
      { id, data: { driverId: myDriver.id, status: 'accepted' } },
      {
        onSuccess: () => {
          toast.success("Ride accepted!");
          queryClient.invalidateQueries({ queryKey: getListRidesQueryKey({ status: 'requested' }) });
          queryClient.invalidateQueries({ queryKey: getListRidesQueryKey({ driverId: myDriver.id }) });
        }
      }
    );
  };

  const handleCompleteRide = (id: number) => {
    updateRide.mutate(
      { id, data: { status: 'completed', completedAt: new Date().toISOString() } },
      {
        onSuccess: () => {
          toast.success("Ride completed!");
          queryClient.invalidateQueries({ queryKey: getListRidesQueryKey({ driverId: myDriver?.id }) });
        }
      }
    );
  };

  const handleUpdateDriverStatus = (id: number, status: string) => {
    updateDriver.mutate(
      { id, data: { status } },
      {
        onSuccess: () => {
          toast.success(`Driver marked as ${status}`);
          queryClient.invalidateQueries({ queryKey: getListDriversQueryKey({}) });
        }
      }
    );
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Ususu Mobility</h1>
          <p className="text-muted-foreground mt-2">The Gambia's premier rideshare network.</p>
        </div>
        {!isAdmin && (
          <div className="flex gap-2">
            <Dialog open={isRideModalOpen} onOpenChange={setRideModalOpen}>
              <DialogTrigger asChild>
                <Button className="bg-secondary hover:bg-secondary/90 text-secondary-foreground"><Navigation className="w-4 h-4 mr-2" /> Request Ride</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Book a Ride</DialogTitle></DialogHeader>
                <form onSubmit={handleRequestRide} className="space-y-4 pt-4">
                  <div className="space-y-2"><Label>Pickup Location</Label><Input required value={rideForm.pickup} onChange={e=>setRideForm({...rideForm, pickup: e.target.value})} /></div>
                  <div className="space-y-2"><Label>Dropoff Location</Label><Input required value={rideForm.dropoff} onChange={e=>setRideForm({...rideForm, dropoff: e.target.value})} /></div>
                  <div className="space-y-2"><Label>Offered Fare (GMD)</Label><Input type="number" required value={rideForm.fareGmd} onChange={e=>setRideForm({...rideForm, fareGmd: e.target.value})} /></div>
                  <div className="flex justify-end"><Button type="submit" disabled={createRide.isPending}>Find Driver</Button></div>
                </form>
              </DialogContent>
            </Dialog>

            {!myDriver && (
              <Dialog open={isDriverModalOpen} onOpenChange={setDriverModalOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline"><Car className="w-4 h-4 mr-2" /> Become a Driver</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Driver Registration</DialogTitle></DialogHeader>
                  <form onSubmit={handleRegisterDriver} className="space-y-4 pt-4">
                    <div className="space-y-2"><Label>Vehicle Information</Label><Input required placeholder="Make, Model, Year, Color" value={driverForm.vehicleInfo} onChange={e=>setDriverForm({...driverForm, vehicleInfo: e.target.value})} /></div>
                    <div className="space-y-2"><Label>License Plate / Registration</Label><Input required value={driverForm.licenseNumber} onChange={e=>setDriverForm({...driverForm, licenseNumber: e.target.value})} /></div>
                    <div className="flex justify-end"><Button type="submit" disabled={createDriver.isPending}>Apply to Drive</Button></div>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          {isAdmin ? (
            <>
              <TabsTrigger value="rider">Live Rides Board</TabsTrigger>
              <TabsTrigger value="driver">Driver Approvals</TabsTrigger>
            </>
          ) : (
            <>
              <TabsTrigger value="rider">My Rides</TabsTrigger>
              {myDriver && <TabsTrigger value="driver">Driver Portal</TabsTrigger>}
            </>
          )}
        </TabsList>

        <TabsContent value="rider" className="m-0">
          {loadingRides ? <div className="p-8 flex justify-center"><Loader2 className="animate-spin w-8 h-8 text-primary" /></div> : (!rides || rides.length === 0) ? (
            <div className="text-center py-12 text-muted-foreground bg-card border rounded-xl">No rides found.</div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {rides.map(r => (
                <Card key={r.id}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div className="text-sm font-medium text-muted-foreground">Ride #{r.id}</div>
                      <Badge variant={r.status === 'requested' ? 'secondary' : r.status === 'completed' ? 'default' : 'outline'}>{r.status}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-start gap-3">
                      <MapPin className="w-4 h-4 mt-1 text-primary shrink-0" />
                      <div className="text-sm">
                        <div className="font-semibold text-foreground">Pickup</div>
                        <div className="text-muted-foreground">{r.pickup}</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Navigation className="w-4 h-4 mt-1 text-secondary shrink-0" />
                      <div className="text-sm">
                        <div className="font-semibold text-foreground">Dropoff</div>
                        <div className="text-muted-foreground">{r.dropoff}</div>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="border-t pt-4 flex justify-between items-center bg-muted/20">
                    <div className="font-bold text-accent">D {r.fareGmd.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">{new Date(r.requestedAt).toLocaleTimeString()}</div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {isAdmin && (
          <TabsContent value="driver" className="m-0">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {allDrivers?.map(d => (
                <Card key={d.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">Driver #{d.id}</CardTitle>
                      <Badge variant={d.status === 'active' ? 'default' : 'secondary'}>{d.status}</Badge>
                    </div>
                    <CardDescription>{d.vehicleInfo} • Lic: {d.licenseNumber}</CardDescription>
                  </CardHeader>
                  {d.status === 'pending' && (
                    <CardFooter className="pt-4 border-t flex gap-2">
                      <Button className="w-full" variant="outline" onClick={() => handleUpdateDriverStatus(d.id, 'active')}>Approve</Button>
                      <Button className="w-full" variant="destructive" onClick={() => handleUpdateDriverStatus(d.id, 'suspended')}>Suspend</Button>
                    </CardFooter>
                  )}
                </Card>
              ))}
            </div>
          </TabsContent>
        )}

        {!isAdmin && activeTab === "driver" && (
          <TabsContent value="driver" className="m-0 space-y-8">
            {myDriver?.status !== 'active' ? (
              <Card className="bg-muted/50 border-dashed"><CardContent className="py-8 text-center">Your driver account is <strong className="text-foreground">{myDriver?.status}</strong>.</CardContent></Card>
            ) : (
              <div className="grid lg:grid-cols-2 gap-8">
                {/* Available Requests */}
                <div className="space-y-4">
                  <h3 className="text-xl font-bold font-serif border-b pb-2">Available Requests</h3>
                  {(!rides || rides.length === 0) ? <div className="text-center py-6 text-muted-foreground border rounded-lg">No open requests.</div> : rides.map(r => (
                    <Card key={r.id} className="border-secondary/50">
                      <CardContent className="p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
                        <div className="space-y-1 flex-1">
                          <div className="font-semibold">{r.pickup} → {r.dropoff}</div>
                          <div className="text-sm text-muted-foreground font-bold text-accent">D {r.fareGmd.toLocaleString()}</div>
                        </div>
                        <Button onClick={() => handleAcceptRide(r.id)}>Accept Ride</Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* My Active/Completed Rides */}
                <div className="space-y-4">
                  <h3 className="text-xl font-bold font-serif border-b pb-2">My Dispatch Queue</h3>
                  {(!myDriverRides || myDriverRides.length === 0) ? <div className="text-center py-6 text-muted-foreground border rounded-lg">No assigned rides.</div> : myDriverRides.map(r => (
                    <Card key={r.id}>
                      <CardContent className="p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
                        <div className="space-y-1 flex-1">
                          <div className="font-semibold">{r.pickup} → {r.dropoff}</div>
                          <Badge variant={r.status === 'completed' ? 'secondary' : 'default'}>{r.status}</Badge>
                        </div>
                        {r.status === 'accepted' && (
                          <Button variant="secondary" onClick={() => handleCompleteRide(r.id)}>Complete</Button>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
