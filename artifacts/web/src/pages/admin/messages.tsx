import { useAuth } from "@workspace/replit-auth-web";
import { useListInternalMessages, useCreateInternalMessage, useMarkInternalMessageRead } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2, Mail, Check, Inbox } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getListInternalMessagesQueryKey } from "@workspace/api-client-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const MAILBOXES = [
  "admin.internal", "finance.internal", "treasury.internal", "payments.internal",
  "membership.internal", "verification.internal", "land.internal", "construction.internal",
  "marketplace.internal", "store.internal", "youth.internal", "prospecting.internal",
  "dispatch.internal", "drivers.internal", "support.internal"
];

export function InternalMessagesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [mailbox, setMailbox] = useState("admin.internal");
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [formData, setFormData] = useState({ mailbox: "admin.internal", subject: "", body: "" });

  const { data: messages, isLoading } = useListInternalMessages(
    { mailbox },
    { query: { queryKey: getListInternalMessagesQueryKey({ mailbox }) } }
  );

  const createMsg = useCreateInternalMessage();
  const markRead = useMarkInternalMessageRead();

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    createMsg.mutate(
      { data: { senderId: user.id, ...formData } },
      {
        onSuccess: () => {
          toast.success("Message sent");
          queryClient.invalidateQueries({ queryKey: getListInternalMessagesQueryKey({ mailbox: formData.mailbox }) });
          setIsComposeOpen(false);
          setFormData({ mailbox: "admin.internal", subject: "", body: "" });
        }
      }
    );
  };

  const handleMarkRead = (id: number) => {
    markRead.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListInternalMessagesQueryKey({ mailbox }) });
        }
      }
    );
  };

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto h-[calc(100vh-5rem)] flex flex-col space-y-6">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Internal Communications</h1>
          <p className="text-muted-foreground mt-1">Departmental mailboxes and secure messaging.</p>
        </div>
        <Dialog open={isComposeOpen} onOpenChange={setIsComposeOpen}>
          <DialogTrigger asChild>
            <Button><Mail className="w-4 h-4 mr-2" /> Compose</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Internal Message</DialogTitle></DialogHeader>
            <form onSubmit={handleSend} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Destination Mailbox</Label>
                <Select value={formData.mailbox} onValueChange={v => setFormData({...formData, mailbox: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{MAILBOXES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Subject</Label><Input required value={formData.subject} onChange={e=>setFormData({...formData, subject: e.target.value})} /></div>
              <div className="space-y-2"><Label>Message</Label><Textarea required className="min-h-[150px]" value={formData.body} onChange={e=>setFormData({...formData, body: e.target.value})} /></div>
              <div className="flex justify-end"><Button type="submit" disabled={createMsg.isPending}>Send Message</Button></div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col md:flex-row gap-6 flex-1 min-h-0">
        <Card className="w-full md:w-64 shrink-0 overflow-y-auto">
          <CardHeader className="pb-2"><CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">Mailboxes</CardTitle></CardHeader>
          <CardContent className="p-2 space-y-1">
            {MAILBOXES.map(m => (
              <button 
                key={m} 
                onClick={() => setMailbox(m)}
                className={`w-full flex items-center gap-2 p-2 text-sm rounded-md transition-colors ${mailbox === m ? 'bg-primary/10 text-primary font-bold' : 'hover:bg-muted text-muted-foreground'}`}
              >
                <Inbox className="w-4 h-4" /> <span className="truncate">{m}</span>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card className="flex-1 flex flex-col min-h-0">
          <CardHeader className="border-b shrink-0 py-4">
            <CardTitle className="text-lg flex items-center gap-2"><Inbox className="w-5 h-5 text-primary" /> {mailbox}</CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-y-auto flex-1">
            {isLoading ? <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" /></div> : (!messages || messages.length === 0) ? (
              <div className="text-center py-20 text-muted-foreground">Mailbox is empty.</div>
            ) : (
              <div className="divide-y">
                {messages.map(msg => (
                  <div key={msg.id} className={`p-4 transition-colors ${!msg.isRead ? 'bg-primary/5' : ''}`}>
                    <div className="flex justify-between items-start mb-2">
                      <div className={`font-semibold ${!msg.isRead ? 'text-foreground' : 'text-muted-foreground'}`}>{msg.subject}</div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground">{new Date(msg.sentAt).toLocaleString()}</span>
                        {!msg.isRead && <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleMarkRead(msg.id)}><Check className="w-3 h-3 text-primary" /></Button>}
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground whitespace-pre-wrap">{msg.body}</div>
                    <div className="mt-3 text-xs text-muted-foreground font-mono">Sender: {msg.senderId.slice(0,8)}</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
