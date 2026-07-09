import { 
  useGetTreasuryOverview, useListTreasuryAccounts, useListTreasuryTransactions, 
  useListRiskEvents, useCreateRiskEvent, useUpdateRiskEvent, 
  useListSettlementObligations, useUpdateSettlementObligation, useListTreasuryAuditLogs
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2, Landmark, TrendingUp, ShieldAlert, ArrowRightLeft, FileSearch, Building2, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { 
  getGetTreasuryOverviewQueryKey, getListTreasuryAccountsQueryKey, getListTreasuryTransactionsQueryKey,
  getListRiskEventsQueryKey, getListSettlementObligationsQueryKey, getListTreasuryAuditLogsQueryKey
} from "@workspace/api-client-react";

export function TreasuryConsole() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");

  // Fetch all necessary data
  const { data: overview, isLoading: loadingOverview } = useGetTreasuryOverview({ query: { queryKey: getGetTreasuryOverviewQueryKey() } });
  const { data: accounts } = useListTreasuryAccounts({ query: { enabled: activeTab === 'accounts', queryKey: getListTreasuryAccountsQueryKey() } });
  const { data: transactions } = useListTreasuryTransactions({}, { query: { enabled: activeTab === 'ledger', queryKey: getListTreasuryTransactionsQueryKey() } });
  const { data: riskEvents } = useListRiskEvents({}, { query: { enabled: activeTab === 'risk', queryKey: getListRiskEventsQueryKey() } });
  const { data: settlements } = useListSettlementObligations({}, { query: { enabled: activeTab === 'risk', queryKey: getListSettlementObligationsQueryKey() } });
  const { data: auditLogs } = useListTreasuryAuditLogs({ query: { enabled: activeTab === 'audit', queryKey: getListTreasuryAuditLogsQueryKey() } });

  // Mutations
  const updateRisk = useUpdateRiskEvent();
  const updateSettlement = useUpdateSettlementObligation();

  const handleResolveRisk = (id: number) => {
    updateRisk.mutate({ id, data: { status: 'resolved', resolvedAt: new Date().toISOString() } }, {
      onSuccess: () => {
        toast.success("Risk event resolved");
        queryClient.invalidateQueries({ queryKey: getListRiskEventsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetTreasuryOverviewQueryKey() });
      }
    });
  };

  const handleSettle = (id: number) => {
    updateSettlement.mutate({ id, data: { status: 'paid' } }, {
      onSuccess: () => {
        toast.success("Obligation marked as paid");
        queryClient.invalidateQueries({ queryKey: getListSettlementObligationsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetTreasuryOverviewQueryKey() });
      }
    });
  };

  if (loadingOverview || !overview) return <div className="p-8 flex justify-center mt-20"><Loader2 className="animate-spin w-12 h-12 text-primary" /></div>;

  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto space-y-8 bg-background min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-sidebar text-sidebar-foreground rounded-2xl flex items-center justify-center shadow-lg">
            <Landmark className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-4xl font-serif font-bold text-foreground">Treasury Console</h1>
            <p className="text-muted-foreground text-lg mt-1">Financial control, reserves, and risk management.</p>
          </div>
        </div>
        <div className="flex gap-6 items-end bg-card p-4 rounded-xl border shadow-sm">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">USD Reserves</div>
            <div className="text-2xl font-bold font-serif text-accent">${overview.totalUsdReserve.toLocaleString()}</div>
          </div>
          <div className="w-px h-10 bg-border"></div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Reserve Ratio</div>
            <div className={`text-2xl font-bold font-serif ${overview.reserveRatio > 0.15 ? 'text-primary' : 'text-destructive'}`}>
              {(overview.reserveRatio * 100).toFixed(1)}%
            </div>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-8 p-1 bg-muted/50 w-full justify-start overflow-x-auto">
          <TabsTrigger value="overview" className="gap-2 px-6"><TrendingUp className="w-4 h-4" /> Executive Overview</TabsTrigger>
          <TabsTrigger value="accounts" className="gap-2 px-6"><Building2 className="w-4 h-4" /> Accounts & Liquidity</TabsTrigger>
          <TabsTrigger value="ledger" className="gap-2 px-6"><ArrowRightLeft className="w-4 h-4" /> Master Ledger</TabsTrigger>
          <TabsTrigger value="risk" className="gap-2 px-6"><ShieldAlert className="w-4 h-4" /> Risk & Settlements</TabsTrigger>
          <TabsTrigger value="audit" className="gap-2 px-6"><FileSearch className="w-4 h-4" /> Audit Log</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="bg-primary text-primary-foreground border-none shadow-md">
              <CardContent className="p-6">
                <div className="text-primary-foreground/70 text-sm font-bold uppercase tracking-wider mb-2">Ususu Revenue (YTD)</div>
                <div className="text-4xl font-bold">D {overview.ususuRevenueToDateGmd.toLocaleString()}</div>
              </CardContent>
            </Card>
            <Card className="bg-card shadow-md">
              <CardContent className="p-6">
                <div className="text-muted-foreground text-sm font-bold uppercase tracking-wider mb-2">Operational GMD</div>
                <div className="text-4xl font-bold font-serif">D {overview.totalGmdOperational.toLocaleString()}</div>
              </CardContent>
            </Card>
            <Card className="bg-card shadow-md">
              <CardContent className="p-6">
                <div className="text-muted-foreground text-sm font-bold uppercase tracking-wider mb-2">Pending Settlements</div>
                <div className="text-4xl font-bold">{overview.pendingSettlementsTotal}</div>
              </CardContent>
            </Card>
            <Card className={`shadow-md ${overview.openRiskEvents > 0 ? 'bg-destructive/10 border-destructive/50' : 'bg-card'}`}>
              <CardContent className="p-6">
                <div className="text-muted-foreground text-sm font-bold uppercase tracking-wider mb-2">Open Risk Events</div>
                <div className={`text-4xl font-bold ${overview.openRiskEvents > 0 ? 'text-destructive' : 'text-primary'}`}>
                  {overview.openRiskEvents}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle>Recent Activity Overview</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overview.recentTransactions.map(tx => (
                    <TableRow key={tx.id}>
                      <TableCell className="text-muted-foreground text-sm">{new Date(tx.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell className="capitalize">{tx.category}</TableCell>
                      <TableCell>{tx.description}</TableCell>
                      <TableCell className={`text-right font-mono font-bold ${tx.type === 'credit' ? 'text-primary' : 'text-destructive'}`}>
                        {tx.type === 'credit' ? '+' : '-'} {tx.amount.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="accounts">
          <Card>
            <CardHeader>
              <CardTitle>Treasury Accounts</CardTitle>
              <CardDescription>Internal structural accounts supporting LRMC liquidity.</CardDescription>
            </CardHeader>
            <CardContent>
              {accounts && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Account Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Currency</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {accounts.map(acc => (
                      <TableRow key={acc.id}>
                        <TableCell className="font-bold">{acc.name}</TableCell>
                        <TableCell className="capitalize text-muted-foreground">{acc.type}</TableCell>
                        <TableCell><Badge variant="outline">{acc.currency}</Badge></TableCell>
                        <TableCell className="text-right font-mono text-lg font-bold">
                          {acc.currency === 'USD' ? '$' : 'D'} {acc.balance.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ledger">
          <Card>
            <CardHeader><CardTitle>Master Transactions Ledger</CardTitle></CardHeader>
            <CardContent>
              {transactions && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Transaction ID</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map(tx => (
                      <TableRow key={tx.id}>
                        <TableCell className="font-mono text-xs text-muted-foreground">TX-{tx.id}</TableCell>
                        <TableCell className="whitespace-nowrap">{new Date(tx.createdAt).toLocaleString()}</TableCell>
                        <TableCell className="capitalize">{tx.category.replace('_', ' ')}</TableCell>
                        <TableCell>{tx.description}</TableCell>
                        <TableCell><Badge variant={tx.type === 'credit' ? 'default' : 'secondary'}>{tx.type}</Badge></TableCell>
                        <TableCell className={`text-right font-mono font-bold ${tx.type === 'credit' ? 'text-primary' : 'text-destructive'}`}>
                          {tx.amount.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="risk" className="space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-destructive flex items-center gap-2"><ShieldAlert className="w-5 h-5" /> Active Risk Events</CardTitle></CardHeader>
              <CardContent>
                {(!riskEvents || riskEvents.filter(r => r.status !== 'resolved').length === 0) ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground bg-muted/20 rounded-xl border border-dashed">
                    <CheckCircle2 className="w-12 h-12 mb-4 text-primary/50" />
                    <p>No active risk events.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {riskEvents.filter(r => r.status !== 'resolved').map(risk => (
                      <div key={risk.id} className={`p-4 border rounded-xl border-l-4 ${risk.severity === 'critical' ? 'border-l-destructive bg-destructive/5' : 'border-l-accent'}`}>
                        <div className="flex justify-between items-start mb-2">
                          <Badge variant="outline" className="uppercase">{risk.type}</Badge>
                          <Badge variant={risk.severity === 'critical' ? 'destructive' : 'default'}>{risk.severity}</Badge>
                        </div>
                        <p className="text-sm font-medium">{risk.description}</p>
                        <div className="flex justify-between items-center mt-4">
                          <span className="text-xs text-muted-foreground font-mono">{new Date(risk.detectedAt).toLocaleString()}</span>
                          <Button size="sm" onClick={() => handleResolveRisk(risk.id)}>Mark Resolved</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Pending Settlements</CardTitle></CardHeader>
              <CardContent>
                {(!settlements || settlements.filter(s => s.status !== 'paid').length === 0) ? (
                  <div className="text-center py-12 text-muted-foreground border border-dashed rounded-xl">All obligations settled.</div>
                ) : (
                  <div className="space-y-4">
                    {settlements.filter(s => s.status !== 'paid').map(s => (
                      <div key={s.id} className="p-4 border rounded-xl flex items-center justify-between">
                        <div>
                          <div className="font-bold">{s.payeeName}</div>
                          <div className="text-sm text-muted-foreground uppercase">{s.payeeType}</div>
                          <div className="text-xs font-mono mt-1 text-destructive">Due: {new Date(s.dueDate).toLocaleDateString()}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-xl font-bold font-mono text-accent">{s.currency} {s.amount.toLocaleString()}</div>
                          <Button size="sm" className="mt-2 w-full" onClick={() => handleSettle(s.id)}>Mark Paid</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="audit">
          <Card>
            <CardHeader>
              <CardTitle>Treasury Audit Log</CardTitle>
              <CardDescription>Immutable record of all high-level treasury actions.</CardDescription>
            </CardHeader>
            <CardContent>
              {auditLogs && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Entity</TableHead>
                      <TableHead>Details</TableHead>
                      <TableHead className="text-right">Actor ID</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditLogs.map(log => (
                      <TableRow key={log.id}>
                        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{new Date(log.createdAt).toLocaleString()}</TableCell>
                        <TableCell className="font-bold text-xs uppercase tracking-wider">{log.action}</TableCell>
                        <TableCell><Badge variant="outline">{log.entityType} #{log.entityId}</Badge></TableCell>
                        <TableCell className="text-sm">{log.details}</TableCell>
                        <TableCell className="text-right font-mono text-xs text-muted-foreground">{log.actorId ? log.actorId.slice(0,8) : 'SYSTEM'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
