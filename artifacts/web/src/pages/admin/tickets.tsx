import { useListInternalTickets, useUpdateInternalTicket } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Ticket, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { getListInternalTicketsQueryKey } from "@workspace/api-client-react";

export function InternalTicketsPage() {
  const queryClient = useQueryClient();
  const { data: tickets, isLoading } = useListInternalTickets({}, { query: { queryKey: getListInternalTicketsQueryKey() } });
  const updateTicket = useUpdateInternalTicket();

  const handleUpdate = (id: number, status: string) => {
    updateTicket.mutate(
      { id, data: { status } },
      {
        onSuccess: () => {
          toast.success("Ticket status updated");
          queryClient.invalidateQueries({ queryKey: getListInternalTicketsQueryKey() });
        }
      }
    );
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex items-center gap-3 border-b pb-6">
        <Ticket className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Support Tickets</h1>
          <p className="text-muted-foreground mt-1">Institutional issue tracking and resolution.</p>
        </div>
      </div>

      {isLoading ? <div className="flex justify-center py-12"><Loader2 className="animate-spin w-8 h-8 text-primary" /></div> : (!tickets || tickets.length === 0) ? (
        <div className="text-center py-16 text-muted-foreground bg-card border rounded-xl">No active tickets.</div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tickets.map(ticket => (
            <Card key={ticket.id} className={`flex flex-col border-l-4 ${ticket.priority === 'high' ? 'border-l-destructive' : ticket.priority === 'medium' ? 'border-l-accent' : 'border-l-muted'}`}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start mb-2">
                  <Badge variant="outline" className="uppercase">{ticket.department}</Badge>
                  <Badge variant={ticket.status === 'open' ? 'destructive' : ticket.status === 'in_progress' ? 'secondary' : 'default'}>{ticket.status.replace('_', ' ')}</Badge>
                </div>
                <CardTitle className="text-lg">{ticket.subject}</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 space-y-4">
                <p className="text-sm text-muted-foreground">{ticket.description}</p>
                <div className="text-xs text-muted-foreground font-mono bg-muted p-2 rounded">By: {ticket.createdBy.slice(0,8)}</div>
              </CardContent>
              <CardContent className="pt-0 flex justify-end gap-2 border-t mt-4 pt-4">
                {ticket.status === 'open' && <Button size="sm" variant="secondary" onClick={() => handleUpdate(ticket.id, 'in_progress')}>Start Work</Button>}
                {ticket.status !== 'resolved' && <Button size="sm" onClick={() => handleUpdate(ticket.id, 'resolved')}>Resolve</Button>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
