import {
  useGetCurrentUser,
  useListAssets,
  useCreateAsset,
  useUpdateAsset,
  useDeleteAsset,
  useApproveAsset,
  useRejectAsset,
  useAssignAsset,
  getListAssetsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  Loader2, Plus, Trash2, CheckCircle, XCircle, Link2, FolderInput,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

// ── Institutional taxonomy ────────────────────────────────────────────────────
const ASSET_TAXONOMY: Record<string, string[]> = {
  RealEstate: ["ResidentialProperty", "CommercialProperty", "AirbnbUnit", "ResortUnit", "MultiUnitBuilding", "Warehouse", "OfficeSpace"],
  Land: ["LandParcel", "AgriculturalLand", "DevelopmentPlot", "CommunityLand"],
  Construction: ["ConstructionProject", "RenovationProject", "InfrastructureProject", "ContractorAssignment"],
  Mobility: ["UsusuRoute", "UsusuVehicle", "UsusuDriverProfile", "UsusuStation"],
  Digital: ["DigitalProduct", "DigitalService", "SubscriptionPackage", "OnlineCourse", "DigitalDocument"],
  Marketplace: ["MarketplaceListing", "VendorProduct", "VendorService", "ClassifiedAd"],
  Membership: ["MembershipTier", "MembershipBenefit", "MembershipAddon"],
  Revenue: ["RevenueStream", "PaymentPlan", "Invoice", "Subscription", "CommissionModel"],
  Employment: ["EmploymentPlacement", "EmployerProfile", "JobListing", "TrainingProgram"],
  Travel: ["TravelerRoute", "TravelPackage", "TravelService"],
  Event: ["EventTicket", "EventListing", "EventVenue"],
  Treasury: ["TreasuryAccount", "TreasuryInstrument", "TreasuryAllocation"],
  PartnerBusiness: ["PartnerBusinessProfile", "PartnerService", "PartnerContract"],
};

const CATEGORIES = Object.keys(ASSET_TAXONOMY);

const STATUS_VALUES = ["pending_review", "approved", "rejected", "archived", "active", "inactive"] as const;

const statusBadge = (status: string) => {
  const map: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
    approved: { label: "Approved", variant: "default" },
    active: { label: "Active", variant: "default" },
    pending_review: { label: "Pending Review", variant: "secondary" },
    rejected: { label: "Rejected", variant: "destructive" },
    archived: { label: "Archived", variant: "outline" },
    inactive: { label: "Inactive", variant: "outline" },
  };
  const s = map[status] ?? { label: status, variant: "outline" as const };
  return <Badge variant={s.variant}>{s.label}</Badge>;
};

// ── Admin action dialogs ──────────────────────────────────────────────────────
function AssignDialog({ assetId, invalidate }: { assetId: number; invalidate: () => void }) {
  const [open, setOpen] = useState(false);
  const [module, setModule] = useState("");
  const [notes, setNotes] = useState("");
  const assignAsset = useAssignAsset();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    assignAsset.mutate(
      { id: assetId, data: { module, notes: notes || undefined } },
      {
        onSuccess: () => { toast.success("Asset assigned to module"); invalidate(); setOpen(false); },
        onError: () => toast.error("Assignment failed"),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline"><FolderInput className="w-3 h-3 mr-1" />Assign</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Assign to Module</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label>Module</Label>
            <Input value={module} onChange={e => setModule(e.target.value)} placeholder="e.g. Marketplace" required />
          </div>
          <div className="space-y-1">
            <Label>Notes (optional)</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
          </div>
          <Button type="submit" className="w-full" disabled={assignAsset.isPending}>
            {assignAsset.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Assign"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Assets() {
  const { data: user } = useGetCurrentUser();
  const isAdmin = user?.role === "admin";
  const queryClient = useQueryClient();

  const [myAssetsOnly, setMyAssetsOnly] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Create form state
  const [form, setForm] = useState({
    category: CATEGORIES[0],
    type: ASSET_TAXONOMY[CATEGORIES[0]][0],
    title: "",
    description: "",
    metadata: "",
  });

  const queryParams = {
    ...(myAssetsOnly && user ? { ownerId: user.id } : {}),
    ...(categoryFilter !== "all" ? { category: categoryFilter } : {}),
    ...(typeFilter !== "all" ? { type: typeFilter } : {}),
    ...(statusFilter !== "all" ? { status: statusFilter } : {}),
  };

  const { data: assets, isLoading } = useListAssets(queryParams, {
    query: { queryKey: getListAssetsQueryKey(queryParams) },
  });

  const createAsset = useCreateAsset();
  const deleteAsset = useDeleteAsset();
  const approveAsset = useApproveAsset();
  const rejectAsset = useRejectAsset();

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: getListAssetsQueryKey(queryParams) });

  const handleCategoryChange = (cat: string) => {
    setForm(f => ({ ...f, category: cat, type: ASSET_TAXONOMY[cat]?.[0] ?? "" }));
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    let metadata: Record<string, unknown> = {};
    try { if (form.metadata.trim()) metadata = JSON.parse(form.metadata); } catch { /* ignore */ }

    createAsset.mutate(
      { data: { category: form.category, type: form.type, title: form.title, description: form.description || undefined, metadata } },
      {
        onSuccess: () => {
          toast.success("Asset submitted for review");
          invalidate();
          setIsCreateOpen(false);
          setForm({ category: CATEGORIES[0], type: ASSET_TAXONOMY[CATEGORIES[0]][0], title: "", description: "", metadata: "" });
        },
        onError: () => toast.error("Failed to create asset"),
      }
    );
  };

  const handleApprove = (id: number) =>
    approveAsset.mutate({ id }, {
      onSuccess: () => { toast.success("Asset approved"); invalidate(); },
      onError: () => toast.error("Approval failed"),
    });

  const handleReject = (id: number) =>
    rejectAsset.mutate({ id, data: {} }, {
      onSuccess: () => { toast.success("Asset rejected"); invalidate(); },
      onError: () => toast.error("Rejection failed"),
    });

  const handleDelete = (id: number) => {
    if (!confirm("Delete this asset?")) return;
    deleteAsset.mutate({ id }, {
      onSuccess: () => { toast.success("Asset deleted"); invalidate(); },
      onError: () => toast.error("Delete failed"),
    });
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Asset Registry</h1>
          <p className="text-muted-foreground mt-1">Institutional asset management for LRMC.</p>
        </div>
        {user && (
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-2" />Register Asset</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Register New Asset</DialogTitle></DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-1">
                  <Label>Category</Label>
                  <Select value={form.category} onValueChange={handleCategoryChange}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Type</Label>
                  <Select value={form.type} onValueChange={t => setForm(f => ({ ...f, type: t }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(ASSET_TAXONOMY[form.category] ?? []).map(t => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Title</Label>
                  <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
                </div>
                <div className="space-y-1">
                  <Label>Description</Label>
                  <Textarea rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Metadata (JSON, optional)</Label>
                  <Textarea
                    rows={3}
                    placeholder='{"bedrooms": 3, "bathrooms": 2}'
                    value={form.metadata}
                    onChange={e => setForm(f => ({ ...f, metadata: e.target.value }))}
                    className="font-mono text-xs"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={createAsset.isPending}>
                  {createAsset.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit for Review"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <Select value={categoryFilter} onValueChange={v => { setCategoryFilter(v); setTypeFilter("all"); }}>
          <SelectTrigger className="w-44"><SelectValue placeholder="All Categories" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={setTypeFilter} disabled={categoryFilter === "all"}>
          <SelectTrigger className="w-52"><SelectValue placeholder="All Types" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {(categoryFilter !== "all" ? ASSET_TAXONOMY[categoryFilter] ?? [] : []).map(t => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="All Statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {STATUS_VALUES.map(s => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}
          </SelectContent>
        </Select>

        {user && (
          <Button
            variant={myAssetsOnly ? "default" : "outline"}
            onClick={() => setMyAssetsOnly(v => !v)}
          >
            My Assets
          </Button>
        )}
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : !assets?.length ? (
        <div className="text-center py-20 text-muted-foreground">No assets found.</div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {assets.map(asset => (
            <Card key={asset.id} className="flex flex-col">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start gap-2">
                  <CardTitle className="text-base line-clamp-1">{asset.title}</CardTitle>
                  {statusBadge(asset.status)}
                </div>
                <div className="flex gap-2 flex-wrap mt-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-primary">{asset.category}</span>
                  <span className="text-xs text-muted-foreground">· {asset.type}</span>
                </div>
              </CardHeader>
              <CardContent className="flex-1 space-y-2 text-sm text-muted-foreground">
                {asset.description && <p className="line-clamp-2">{asset.description}</p>}
                {/* Metadata preview */}
                {asset.metadata && Object.keys(asset.metadata).length > 0 && (
                  <div className="bg-muted rounded-md p-2 text-xs font-mono space-y-0.5">
                    {Object.entries(asset.metadata).slice(0, 4).map(([k, v]) => (
                      <div key={k} className="flex gap-1">
                        <span className="text-muted-foreground">{k}:</span>
                        <span className="text-foreground truncate">{String(v)}</span>
                      </div>
                    ))}
                    {Object.keys(asset.metadata).length > 4 && (
                      <div className="text-muted-foreground">+{Object.keys(asset.metadata).length - 4} more fields</div>
                    )}
                  </div>
                )}
              </CardContent>

              {(isAdmin || asset.ownerId === user?.id) && (
                <CardFooter className="border-t bg-muted/20 pt-3 flex flex-wrap gap-2 justify-end">
                  {isAdmin && asset.status === "pending_review" && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => handleApprove(asset.id)}>
                        <CheckCircle className="w-3 h-3 mr-1" />Approve
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleReject(asset.id)}>
                        <XCircle className="w-3 h-3 mr-1" />Reject
                      </Button>
                    </>
                  )}
                  {isAdmin && asset.status === "approved" && (
                    <AssignDialog assetId={asset.id} invalidate={invalidate} />
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
