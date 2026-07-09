import { useAuth } from "@workspace/replit-auth-web";
import { useListAds, useCreateAd } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2, Megaphone } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { getListAdsQueryKey } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function AdsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({ title: "", description: "", placement: "dashboard_banner", budgetUsd: "50" });

  const { data: ads, isLoading } = useListAds(
    { advertiserId: user?.id },
    { query: { enabled: !!user, queryKey: getListAdsQueryKey({ advertiserId: user?.id }) } }
  );

  const createAd = useCreateAd();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    createAd.mutate(
      { data: { advertiserId: user.id, ...formData, budgetUsd: Number(formData.budgetUsd) } },
      {
        onSuccess: () => {
          toast.success("Ad submitted for review!");
          queryClient.invalidateQueries({ queryKey: getListAdsQueryKey({ advertiserId: user.id }) });
          setFormData({ title: "", description: "", placement: "dashboard_banner", budgetUsd: "50" });
        }
      }
    );
  };

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-8">
      <div className="flex items-center justify-between border-b pb-6">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Advertising</h1>
          <p className="text-muted-foreground mt-2">Promote your business across the LRMC network.</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Submit New Campaign</CardTitle>
            <CardDescription>Ads are billed in USD from your treasury allocation or standard payment method.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2"><Label>Campaign Title</Label><Input required value={formData.title} onChange={e=>setFormData({...formData, title: e.target.value})} /></div>
              <div className="space-y-2"><Label>Placement</Label><Input required value={formData.placement} onChange={e=>setFormData({...formData, placement: e.target.value})} placeholder="e.g. dashboard_banner, mobile_app" /></div>
              <div className="space-y-2"><Label>Budget (USD)</Label><Input type="number" required value={formData.budgetUsd} onChange={e=>setFormData({...formData, budgetUsd: e.target.value})} /></div>
              <div className="space-y-2"><Label>Ad Copy / Description</Label><Textarea required value={formData.description} onChange={e=>setFormData({...formData, description: e.target.value})} /></div>
              <Button type="submit" className="w-full mt-4" disabled={createAd.isPending}>Submit for Review</Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <h3 className="text-xl font-bold font-serif">My Campaigns</h3>
          {isLoading ? <div className="flex justify-center"><Loader2 className="animate-spin w-6 h-6 text-primary" /></div> : (!ads || ads.length === 0) ? (
            <div className="text-center py-12 text-muted-foreground border rounded-xl bg-card">No campaigns running.</div>
          ) : (
            <div className="space-y-4">
              {ads.map(ad => (
                <Card key={ad.id}>
                  <CardHeader className="py-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{ad.title}</CardTitle>
                        <div className="text-sm text-muted-foreground font-mono mt-1">{ad.placement}</div>
                      </div>
                      <Badge variant={ad.status === 'active' ? 'default' : 'secondary'}>{ad.status}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="py-0 pb-4 text-sm text-muted-foreground">
                    <div className="flex justify-between items-center mt-2 pt-2 border-t">
                      <span>Budget</span>
                      <span className="font-bold text-foreground">${ad.budgetUsd.toLocaleString()}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
