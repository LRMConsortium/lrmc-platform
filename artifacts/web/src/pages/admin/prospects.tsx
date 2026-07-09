import { useListProspectLeads, useUpdateProspectLead } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Target, Phone, Mail } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { getListProspectLeadsQueryKey } from "@workspace/api-client-react";

export function ProspectsPage() {
  const queryClient = useQueryClient();
  const { data: leads, isLoading } = useListProspectLeads({}, { query: { queryKey: getListProspectLeadsQueryKey() } });
  const updateLead = useUpdateProspectLead();

  const handleStatusChange = (id: number, status: string) => {
    updateLead.mutate(
      { id, data: { status } },
      {
        onSuccess: () => {
          toast.success("Lead status updated");
          queryClient.invalidateQueries({ queryKey: getListProspectLeadsQueryKey() });
        }
      }
    );
  };

  const handleNotesSave = (id: number, notes: string) => {
    updateLead.mutate(
      { id, data: { notes } },
      {
        onSuccess: () => {
          toast.success("Notes saved");
          queryClient.invalidateQueries({ queryKey: getListProspectLeadsQueryKey() });
        }
      }
    );
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex items-center gap-3 border-b pb-6">
        <Target className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Prospect CRM</h1>
          <p className="text-muted-foreground mt-1">Lead pipeline for institutional partnerships.</p>
        </div>
      </div>

      {isLoading ? <div className="flex justify-center py-12"><Loader2 className="animate-spin w-8 h-8 text-primary" /></div> : (!leads || leads.length === 0) ? (
        <div className="text-center py-16 text-muted-foreground bg-card border rounded-xl">No leads in the pipeline.</div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {leads.map(lead => (
            <Card key={lead.id} className="flex flex-col border-t-4 border-t-primary">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start mb-2">
                  <Badge variant="outline" className="uppercase tracking-wider">{lead.source}</Badge>
                  <Badge variant={lead.status === 'qualified' ? 'default' : lead.status === 'converted' ? 'secondary' : lead.status === 'lost' ? 'destructive' : 'outline'}>{lead.status}</Badge>
                </div>
                <CardTitle>{lead.name}</CardTitle>
                <div className="text-sm font-medium text-accent uppercase">{lead.interest}</div>
              </CardHeader>
              <CardContent className="flex-1 space-y-4">
                <div className="space-y-2 text-sm">
                  {lead.email && <div className="flex items-center gap-2 text-muted-foreground"><Mail className="w-4 h-4" /> {lead.email}</div>}
                  {lead.phone && <div className="flex items-center gap-2 text-muted-foreground"><Phone className="w-4 h-4" /> {lead.phone}</div>}
                </div>
                <div className="space-y-2 pt-2 border-t">
                  <label className="text-xs font-semibold uppercase text-muted-foreground">Notes</label>
                  <Textarea defaultValue={lead.notes} onBlur={e => handleNotesSave(lead.id, e.target.value)} className="min-h-[80px] text-sm resize-none" placeholder="Add notes here..." />
                </div>
              </CardContent>
              <CardContent className="pt-0 flex gap-2 flex-wrap">
                {lead.status === 'new' && <Button size="sm" variant="outline" onClick={() => handleStatusChange(lead.id, 'contacted')}>Contacted</Button>}
                {lead.status === 'contacted' && <Button size="sm" variant="outline" onClick={() => handleStatusChange(lead.id, 'qualified')}>Qualified</Button>}
                {lead.status === 'qualified' && <Button size="sm" onClick={() => handleStatusChange(lead.id, 'converted')}>Convert</Button>}
                {(lead.status !== 'converted' && lead.status !== 'lost') && <Button size="sm" variant="destructive" onClick={() => handleStatusChange(lead.id, 'lost')}>Loss</Button>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
