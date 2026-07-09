import { useAuth } from "@workspace/replit-auth-web";
import { 
  useListDigitalProducts, useCreateDigitalProduct, usePurchaseDigitalProduct 
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2, Plus, Download, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getListDigitalProductsQueryKey } from "@workspace/api-client-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function DigitalStorePage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const queryClient = useQueryClient();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formData, setFormData] = useState({ title: "", description: "", category: "document", priceDalasi: "100" });

  const { data: products, isLoading } = useListDigitalProducts({ query: { queryKey: getListDigitalProductsQueryKey() } });

  const createProduct = useCreateDigitalProduct();
  const purchaseProduct = usePurchaseDigitalProduct();

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createProduct.mutate(
      { data: { ...formData, priceDalasi: Number(formData.priceDalasi) } },
      {
        onSuccess: () => {
          toast.success("Digital product published!");
          queryClient.invalidateQueries({ queryKey: getListDigitalProductsQueryKey() });
          setIsCreateOpen(false);
          setFormData({ title: "", description: "", category: "document", priceDalasi: "100" });
        }
      }
    );
  };

  const handlePurchase = (id: number) => {
    purchaseProduct.mutate(
      { id },
      {
        onSuccess: () => {
          toast.success("Purchase successful! Check your email for the download link.");
          queryClient.invalidateQueries({ queryKey: getListDigitalProductsQueryKey() });
        }
      }
    );
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between border-b pb-6">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Digital Document Store</h1>
          <p className="text-muted-foreground mt-2">Official templates, legal forms, and verified reports.</p>
        </div>
        {isAdmin && (
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-2" /> Publish Product</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Publish Digital Product</DialogTitle></DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4 pt-4">
                <div className="space-y-2"><Label>Title</Label><Input required value={formData.title} onChange={e=>setFormData({...formData, title: e.target.value})} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Category</Label><Input required value={formData.category} onChange={e=>setFormData({...formData, category: e.target.value})} /></div>
                  <div className="space-y-2"><Label>Price (GMD)</Label><Input type="number" required value={formData.priceDalasi} onChange={e=>setFormData({...formData, priceDalasi: e.target.value})} /></div>
                </div>
                <div className="space-y-2"><Label>Description</Label><Textarea required value={formData.description} onChange={e=>setFormData({...formData, description: e.target.value})} /></div>
                <div className="flex justify-end"><Button type="submit" disabled={createProduct.isPending}>Publish</Button></div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {isLoading ? <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div> : (!products || products.length === 0) ? (
        <div className="text-center py-16 text-muted-foreground bg-card border rounded-xl">No digital products available.</div>
      ) : (
        <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-6">
          {products.map(p => (
            <Card key={p.id} className="flex flex-col">
              <CardHeader>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center text-primary mb-4">
                  <FileText className="w-6 h-6" />
                </div>
                <CardTitle className="text-lg leading-tight">{p.title}</CardTitle>
                <div className="text-xs font-medium text-muted-foreground uppercase">{p.category}</div>
              </CardHeader>
              <CardContent className="flex-1">
                <p className="text-sm text-muted-foreground line-clamp-3">{p.description}</p>
              </CardContent>
              <CardFooter className="border-t bg-muted/20 pt-4 flex items-center justify-between">
                <div className="font-bold text-accent">D {p.priceDalasi.toLocaleString()}</div>
                {!isAdmin && (
                  <Button size="sm" onClick={() => handlePurchase(p.id)} disabled={purchaseProduct.isPending}>
                    <Download className="w-4 h-4 mr-2" /> Buy
                  </Button>
                )}
                {isAdmin && <div className="text-xs text-muted-foreground">{p.downloads} downloads</div>}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
