import { useGetCurrentUser, useListAssets, useCreateAsset, useUpdateAsset, useDeleteAsset, getListAssetsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2, Plus, Trash2, CheckCircle, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const ASSET_KINDS = ["property", "vehicle", "airbnb", "resort"] as const;

const statusBadge = (status: string) => {
  if (status === "active") return <Badge>Active</Badge>;
  if (status === "pending_review") return <Badge variant="secondary">Pending Review</Badge>;
  return <Badge variant="outline">Inactive</Badge>;
};

export default function Assets() {
  const { data: user } = useGetCurrentUser();
  const isAdmin = user?.role === "admin";
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<"all" | "mine">("all");
  const [kindFilter, setKindFilter] = useState<string>("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    kind: "property",
    location: "",
    priceCents: "0",
    description: "",
    imageUrl: "",
  });

  const queryParams = {
    ...(activeTab === "mine" && user ? { ownerId: user.id } : {}),
    ...(kindFilter !== "all" ? { kind: kindFilter } : {}),
  };

  const { data: assets, isLoading } = useListAssets(queryParams, {
    query: { queryKey: getListAssetsQueryKey(queryParams) },
  });

  const createAsset = useCreateAsset();
  const updateAsset = useUpdateAsset();
  const deleteAsset = useDeleteAsset();

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: getListAssetsQueryKey(queryParams) });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createAsset.mutate(
      { data: { ...form, priceCents: Number(form.priceCents) } },
      {
        onSuccess: () => {
          toast({ title: "Asset submitted for review" });
          invalidate();
          setIsCreateOpen(false);
          setForm({ title: "", kind: "property", location: "", priceCents: "0", description: "", imageUrl: "" });
        },
        onError: () => toast({ title: "Failed to create asset", variant: "destructive" }),
      }
    );
  };

  const handleStatusUpdate = (id: number, status: string) => {
    updateAsset.mutate(
      { id, data: { status } },
      {
        onSuccess: () => { toast({ title: `Asset marked ${status}` }); invalidate(); },
        onError: () => toast({ title: "Update failed", variant: "destructive" }),
      }
    );
  };

  const handleDelete = (id: number) => {
    if (!confirm("Delete this asset?")) return;
    deleteAsset.mutate(
      { id },
      {
        onSuccess: () => { toast({ title: "Asset deleted" }); invalidate(); },
        onError: () => toast({ title: "Delete failed", variant: "destructive" }),
      }
    );
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Asset Management</h1>
          <p className="text-muted-foreground mt-1">Register and manage properties, vehicles, and rentals.</p>
        </div>
        {user && (
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-2" />Register Asset</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Register a New Asset</DialogTitle></DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4 pt-2">
                <div className="space-y-1">
                  <Label>Title</Label>
                  <Input required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>Kind</Label>
                    <Select value={form.kind} onValueChange={v => setForm({ ...form, kind: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ASSET_KINDS.map(k => <SelectItem key={k} value={k}>{k.charAt(0).toUpperCase() + k.slice(1)}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Price (GMD cents)</Label>
                    <Input type="number" min="0" value={form.priceCents} onChange={e => setForm({ ...form, priceCents: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Location</Label>
                  <Input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Description</Label>
                  <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Image URL (optional)</Label>
                  <Input value={form.imageUrl} onChange={e => setForm({ ...form, imageUrl: e.target.value })} />
                </div>
                <Button type="submit" className="w-full" disabled={createAsset.isPending}>
                  {createAsset.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Submit for Review
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <Tabs value={activeTab} onValueChange={v => setActiveTab(v as "all" | "mine")}>
          <TabsList>
            <TabsTrigger value="all">All Assets</TabsTrigger>
            <TabsTrigger value="mine">My Assets</TabsTrigger>
          </TabsList>
        </Tabs>
        <Select value={kindFilter} onValueChange={setKindFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="All kinds" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All kinds</SelectItem>
            {ASSET_KINDS.map(k => <SelectItem key={k} value={k}>{k.charAt(0).toUpperCase() + k.slice(1)}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : !assets?.length ? (
        <div className="text-center py-16 text-muted-foreground bg-card border rounded-xl">
          No assets found.
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {assets.map(asset => (
            <Card key={asset.id} className="flex flex-col overflow-hidden">
              {asset.imageUrl ? (
                <div className="h-44 bg-muted overflow-hidden">
                  <img src={asset.imageUrl} alt={asset.title} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="h-44 bg-muted flex items-center justify-center text-muted-foreground text-sm">No Image</div>
              )}
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start gap-2">
                  <CardTitle className="text-base line-clamp-1">{asset.title}</CardTitle>
                  {statusBadge(asset.status)}
                </div>
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">{asset.kind}</p>
              </CardHeader>
              <CardContent className="flex-1 space-y-1 text-sm text-muted-foreground">
                {asset.description && <p className="line-clamp-2">{asset.description}</p>}
                <div className="flex justify-between pt-1">
                  <span className="font-semibold text-foreground">D {(asset.priceCents / 100).toLocaleString()}</span>
                  {asset.location && <span>{asset.location}</span>}
                </div>
              </CardContent>
              {(isAdmin || asset.ownerId === user?.id) && (
                <CardFooter className="border-t bg-muted/20 pt-3 flex gap-2 justify-end">
                  {isAdmin && asset.status === "pending_review" && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => handleStatusUpdate(asset.id, "active")}>
                        <CheckCircle className="w-3 h-3 mr-1" />Approve
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleStatusUpdate(asset.id, "inactive")}>
                        <XCircle className="w-3 h-3 mr-1" />Reject
                      </Button>
                    </>
                  )}
                  {(isAdmin || asset.ownerId === user?.id) && (
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(asset.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
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
