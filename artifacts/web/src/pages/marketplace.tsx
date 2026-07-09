import { useAuth } from "@workspace/replit-auth-web";
import { 
  useListMarketplaceListings, useCreateMarketplaceListing, useUpdateMarketplaceListing, useDeleteMarketplaceListing 
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2, Plus, Store, Tag } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { getListMarketplaceListingsQueryKey } from "@workspace/api-client-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function MarketplacePage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<string>("browse");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formData, setFormData] = useState({ title: "", description: "", category: "general", priceDalasi: "0", imageUrl: "" });

  const { data: listings, isLoading } = useListMarketplaceListings(
    activeTab === "mine" ? { sellerId: user?.id } : {},
    { query: { queryKey: getListMarketplaceListingsQueryKey(activeTab === "mine" ? { sellerId: user?.id } : {}) } }
  );

  const createListing = useCreateMarketplaceListing();
  const updateListing = useUpdateMarketplaceListing();
  const deleteListing = useDeleteMarketplaceListing();

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    createListing.mutate(
      { data: { sellerId: user.id, ...formData, priceDalasi: Number(formData.priceDalasi) } },
      {
        onSuccess: () => {
          toast.success("Item listed successfully!");
          queryClient.invalidateQueries({ queryKey: getListMarketplaceListingsQueryKey({ sellerId: user.id }) });
          setIsCreateOpen(false);
          setFormData({ title: "", description: "", category: "general", priceDalasi: "0", imageUrl: "" });
        }
      }
    );
  };

  const handleStatusUpdate = (id: number, status: string) => {
    updateListing.mutate(
      { id, data: { status } },
      {
        onSuccess: () => {
          toast.success(`Listing ${status}`);
          queryClient.invalidateQueries({ queryKey: getListMarketplaceListingsQueryKey({}) });
        }
      }
    );
  };

  const handleDelete = (id: number) => {
    if (confirm("Remove this listing?")) {
      deleteListing.mutate({ id }, {
        onSuccess: () => {
          toast.success("Listing removed");
          queryClient.invalidateQueries({ queryKey: getListMarketplaceListingsQueryKey({ sellerId: user?.id }) });
        }
      });
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Marketplace</h1>
          <p className="text-muted-foreground mt-2">Local commerce backed by LRMC trust.</p>
        </div>
        {!isAdmin && (
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-2" /> List Item</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create Listing</DialogTitle></DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4 pt-4">
                <div className="space-y-2"><Label>Title</Label><Input required value={formData.title} onChange={e=>setFormData({...formData, title: e.target.value})} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Category</Label><Input value={formData.category} onChange={e=>setFormData({...formData, category: e.target.value})} placeholder="e.g. electronics, furniture" /></div>
                  <div className="space-y-2"><Label>Price (GMD)</Label><Input type="number" required value={formData.priceDalasi} onChange={e=>setFormData({...formData, priceDalasi: e.target.value})} /></div>
                </div>
                <div className="space-y-2"><Label>Description</Label><Textarea value={formData.description} onChange={e=>setFormData({...formData, description: e.target.value})} /></div>
                <div className="space-y-2"><Label>Image URL</Label><Input type="url" value={formData.imageUrl} onChange={e=>setFormData({...formData, imageUrl: e.target.value})} /></div>
                <div className="flex justify-end"><Button type="submit" disabled={createListing.isPending}>Publish</Button></div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="browse">{isAdmin ? "All Listings" : "Browse"}</TabsTrigger>
          {!isAdmin && <TabsTrigger value="mine">My Listings</TabsTrigger>}
        </TabsList>

        <TabsContent value={activeTab} className="m-0">
          {isLoading ? <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div> : (!listings || listings.length === 0) ? (
            <div className="text-center py-16 text-muted-foreground bg-card border rounded-xl">No items listed yet.</div>
          ) : (
            <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-6">
              {listings.map(item => (
                <Card key={item.id} className="overflow-hidden flex flex-col">
                  {item.imageUrl ? (
                    <div className="h-40 overflow-hidden bg-muted"><img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" /></div>
                  ) : (
                    <div className="h-40 bg-muted flex items-center justify-center text-muted-foreground"><Store className="w-8 h-8" /></div>
                  )}
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg line-clamp-1">{item.title}</CardTitle>
                      {isAdmin && <Badge variant={item.status === 'active' ? 'default' : 'secondary'}>{item.status}</Badge>}
                    </div>
                    <div className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-1"><Tag className="w-3 h-3" /> {item.category}</div>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <div className="font-bold text-xl text-primary">D {item.priceDalasi.toLocaleString()}</div>
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{item.description}</p>
                  </CardContent>
                  {((isAdmin && item.status !== 'removed') || item.sellerId === user?.id) && (
                    <CardFooter className="border-t pt-4 flex justify-end gap-2 bg-muted/20">
                      {isAdmin && <Button size="sm" variant="destructive" onClick={() => handleStatusUpdate(item.id, 'removed')}>Remove</Button>}
                      {item.sellerId === user?.id && <Button size="sm" variant="outline" onClick={() => handleDelete(item.id)}>Delete</Button>}
                    </CardFooter>
                  )}
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
