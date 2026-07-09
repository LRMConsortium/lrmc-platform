import { useAuth } from "@workspace/replit-auth-web";
import { useListLandListings, useCreateLandListing, useUpdateLandListing, useListLandTransactions, useCreateLandTransaction } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2, Plus, DollarSign, MapPin, Ruler } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { getListLandListingsQueryKey, getListLandTransactionsQueryKey } from "@workspace/api-client-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function LandPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<string>("browse");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formData, setFormData] = useState({ title: "", location: "", sizeAcres: "1", priceUsd: "5000", description: "", imageUrl: "" });

  const { data: listings, isLoading: loadingListings } = useListLandListings(
    activeTab === "mine" ? { sellerId: user?.id } : {},
    { query: { queryKey: getListLandListingsQueryKey(activeTab === "mine" ? { sellerId: user?.id } : {}) } }
  );

  const { data: transactions } = useListLandTransactions(
    { query: { enabled: activeTab === 'transactions' || isAdmin, queryKey: getListLandTransactionsQueryKey() } }
  );

  const createListing = useCreateLandListing();
  const updateListing = useUpdateLandListing();
  const createTransaction = useCreateLandTransaction();

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    createListing.mutate(
      { data: { sellerId: user.id, ...formData, sizeAcres: Number(formData.sizeAcres), priceUsd: Number(formData.priceUsd) } },
      {
        onSuccess: () => {
          toast.success("Land listing created successfully!");
          queryClient.invalidateQueries({ queryKey: getListLandListingsQueryKey({ sellerId: user.id }) });
          setIsCreateOpen(false);
          setFormData({ title: "", location: "", sizeAcres: "1", priceUsd: "5000", description: "", imageUrl: "" });
        }
      }
    );
  };

  const handleStatusUpdate = (id: number, status: string) => {
    updateListing.mutate(
      { id, data: { status } },
      {
        onSuccess: () => {
          toast.success(`Listing marked as ${status}`);
          queryClient.invalidateQueries({ queryKey: getListLandListingsQueryKey({}) });
        }
      }
    );
  };

  const handleOffer = (listingId: number, priceUsd: number) => {
    if (!user) return;
    createTransaction.mutate(
      { data: { listingId, buyerId: user.id, amountUsd: priceUsd } },
      {
        onSuccess: () => {
          toast.success("Offer submitted! A transaction record was created.");
          queryClient.invalidateQueries({ queryKey: getListLandTransactionsQueryKey() });
        }
      }
    );
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Land Registry</h1>
          <p className="text-muted-foreground mt-2">Institutional-grade land brokering and transfers (USD).</p>
        </div>
        {!isAdmin && (
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="shrink-0"><Plus className="w-4 h-4 mr-2" /> List Property</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>List Land for Sale</DialogTitle></DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4 pt-4">
                <div className="space-y-2"><Label>Title</Label><Input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} required /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Size (Acres)</Label><Input type="number" step="0.1" value={formData.sizeAcres} onChange={e => setFormData({...formData, sizeAcres: e.target.value})} required /></div>
                  <div className="space-y-2"><Label>Price (USD)</Label><Input type="number" value={formData.priceUsd} onChange={e => setFormData({...formData, priceUsd: e.target.value})} required /></div>
                </div>
                <div className="space-y-2"><Label>Location</Label><Input value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} required /></div>
                <div className="space-y-2"><Label>Description</Label><Textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} /></div>
                <div className="space-y-2"><Label>Image URL (Optional)</Label><Input type="url" value={formData.imageUrl} onChange={e => setFormData({...formData, imageUrl: e.target.value})} /></div>
                <div className="flex justify-end pt-4"><Button type="submit" disabled={createListing.isPending}>List Property</Button></div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="browse">Browse Listings</TabsTrigger>
          {!isAdmin && <TabsTrigger value="mine">My Listings</TabsTrigger>}
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
        </TabsList>

        {(activeTab === "browse" || activeTab === "mine") && (
          <TabsContent value={activeTab} className="m-0">
            {loadingListings ? (
              <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
            ) : (!listings || listings.length === 0) ? (
              <div className="text-center py-16 text-muted-foreground bg-card border rounded-xl">No listings found.</div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {listings.map(listing => (
                  <Card key={listing.id} className="overflow-hidden flex flex-col">
                    <div className="h-48 bg-muted relative">
                      {listing.imageUrl ? <img src={listing.imageUrl} alt={listing.title} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-muted-foreground">No Image</div>}
                      <div className="absolute top-2 right-2 bg-background/90 backdrop-blur-sm px-3 py-1 rounded-full font-bold text-accent shadow-sm border">
                        ${listing.priceUsd.toLocaleString()}
                      </div>
                    </div>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start gap-2">
                        <CardTitle className="line-clamp-1 text-lg">{listing.title}</CardTitle>
                        <Badge variant={listing.status === 'active' ? 'default' : 'secondary'}>{listing.status}</Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
                        <span className="flex items-center"><MapPin className="w-3 h-3 mr-1" /> {listing.location}</span>
                        <span className="flex items-center"><Ruler className="w-3 h-3 mr-1" /> {listing.sizeAcres} Acres</span>
                      </div>
                    </CardHeader>
                    <CardContent className="flex-1">
                      <p className="text-sm text-muted-foreground line-clamp-3">{listing.description}</p>
                    </CardContent>
                    <CardFooter className="border-t bg-muted/20 pt-4 flex gap-2">
                      {isAdmin && listing.status === 'pending' && (
                        <Button className="w-full" variant="outline" onClick={() => handleStatusUpdate(listing.id, 'active')}>Approve Listing</Button>
                      )}
                      {(!isAdmin && listing.sellerId !== user?.id && listing.status === 'active') && (
                        <Button className="w-full" onClick={() => handleOffer(listing.id, listing.priceUsd)}>Make Offer</Button>
                      )}
                      {listing.sellerId === user?.id && (
                        <div className="w-full text-center text-sm font-medium text-muted-foreground">Your Listing</div>
                      )}
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        )}

        <TabsContent value="transactions" className="m-0">
          <Card>
            <CardHeader><CardTitle>Land Transactions</CardTitle></CardHeader>
            <CardContent>
              {(!transactions || transactions.length === 0) ? (
                <div className="text-center py-12 text-muted-foreground">No transactions on record.</div>
              ) : (
                <div className="space-y-4">
                  {transactions.map(tx => (
                    <div key={tx.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <div className="font-medium">Listing #{tx.listingId}</div>
                        <div className="text-sm text-muted-foreground">Buyer ID: <span className="font-mono">{tx.buyerId.slice(0,8)}</span></div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">${tx.amountUsd.toLocaleString()}</div>
                        <Badge variant={tx.status === 'completed' ? 'default' : 'secondary'}>{tx.status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
