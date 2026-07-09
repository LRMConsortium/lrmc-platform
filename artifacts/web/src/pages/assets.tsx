import { useAuth } from "@workspace/replit-auth-web";
import { useListAssets, useCreateAsset, useUpdateAsset, useDeleteAsset } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2, Plus, Edit, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { getListAssetsQueryKey } from "@workspace/api-client-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const ASSET_KINDS = ["property", "vehicle", "airbnb", "resort"];

export function AssetsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<string>("all");
  const [kindFilter, setKindFilter] = useState<string>("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState({ title: "", kind: "property", location: "", priceDalasi: "0", description: "", imageUrl: "" });

  const queryParams = activeTab === "mine" ? { ownerId: user?.id } : {};
  if (kindFilter !== "all") {
    (queryParams as any).kind = kindFilter;
  }

  const { data: assets, isLoading } = useListAssets(queryParams, {
    query: { queryKey: getListAssetsQueryKey(queryParams) }
  });

  const createAsset = useCreateAsset();
  const updateAsset = useUpdateAsset();
  const deleteAsset = useDeleteAsset();

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    createAsset.mutate(
      { data: { ownerId: user.id, ...formData, priceDalasi: Number(formData.priceDalasi) } },
      {
        onSuccess: () => {
          toast.success("Asset created successfully!");
          queryClient.invalidateQueries({ queryKey: getListAssetsQueryKey({ ownerId: user.id }) });
          queryClient.invalidateQueries({ queryKey: getListAssetsQueryKey({}) });
          setIsCreateOpen(false);
          setFormData({ title: "", kind: "property", location: "", priceDalasi: "0", description: "", imageUrl: "" });
        }
      }
    );
  };

  const handleStatusUpdate = (id: number, status: string) => {
    updateAsset.mutate(
      { id, data: { status } },
      {
        onSuccess: () => {
          toast.success(`Asset marked as ${status}`);
          queryClient.invalidateQueries({ queryKey: getListAssetsQueryKey(queryParams) });
        }
      }
    );
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this asset?")) {
      deleteAsset.mutate(
        { id },
        {
          onSuccess: () => {
            toast.success("Asset deleted");
            queryClient.invalidateQueries({ queryKey: getListAssetsQueryKey(queryParams) });
          }
        }
      );
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Asset Management</h1>
          <p className="text-muted-foreground mt-2">Manage properties, vehicles, and rentals.</p>
        </div>
        {!isAdmin && (
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-2" /> Add Asset</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Register New Asset</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Kind</Label>
                    <Select value={formData.kind} onValueChange={v => setFormData({...formData, kind: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ASSET_KINDS.map(k => <SelectItem key={k} value={k}>{k.toUpperCase()}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Price / Rate (GMD)</Label>
                    <Input type="number" value={formData.priceDalasi} onChange={e => setFormData({...formData, priceDalasi: e.target.value})} required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Location / Details</Label>
                  <Input value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Image URL (Optional)</Label>
                  <Input type="url" value={formData.imageUrl} onChange={e => setFormData({...formData, imageUrl: e.target.value})} />
                </div>
                <div className="flex justify-end pt-4">
                  <Button type="submit" disabled={createAsset.isPending}>Save Asset</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        {!isAdmin && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-[400px]">
            <TabsList>
              <TabsTrigger value="all">Public Listings</TabsTrigger>
              <TabsTrigger value="mine">My Assets</TabsTrigger>
            </TabsList>
          </Tabs>
        )}
        <Select value={kindFilter} onValueChange={setKindFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by kind..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Kinds</SelectItem>
            {ASSET_KINDS.map(k => <SelectItem key={k} value={k}>{k.toUpperCase()}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : (!assets || assets.length === 0) ? (
        <div className="text-center py-16 text-muted-foreground bg-card border rounded-xl">
          No assets found matching your criteria.
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {assets.map(asset => (
            <Card key={asset.id} className="overflow-hidden flex flex-col">
              {asset.imageUrl ? (
                <div className="h-48 overflow-hidden bg-muted">
                  <img src={asset.imageUrl} alt={asset.title} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="h-48 bg-muted flex items-center justify-center text-muted-foreground">
                  No Image
                </div>
              )}
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start gap-2">
                  <CardTitle className="line-clamp-1">{asset.title}</CardTitle>
                  <Badge variant={asset.status === 'active' ? 'default' : 'secondary'}>{asset.status}</Badge>
                </div>
                <div className="text-sm font-medium text-accent uppercase tracking-wider">{asset.kind}</div>
              </CardHeader>
              <CardContent className="flex-1">
                <p className="text-sm text-muted-foreground line-clamp-2">{asset.description || "No description provided."}</p>
                <div className="mt-4 flex items-center justify-between text-sm">
                  <span className="font-semibold">D {asset.priceDalasi.toLocaleString()}</span>
                  <span className="text-muted-foreground">{asset.location}</span>
                </div>
              </CardContent>
              {((isAdmin || asset.ownerId === user?.id) && activeTab === 'mine' || isAdmin) && (
                <CardFooter className="border-t bg-muted/20 pt-4 flex gap-2 justify-end">
                  {isAdmin && asset.status === 'pending' && (
                    <Button size="sm" variant="outline" onClick={() => handleStatusUpdate(asset.id, 'active')}>Approve</Button>
                  )}
                  {asset.ownerId === user?.id && (
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(asset.id)}><Trash2 className="w-4 h-4" /></Button>
                  )}
                </CardFooter>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
