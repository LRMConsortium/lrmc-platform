import { AppLayout } from "@/components/layout/AppLayout"
import { useListTreasuryAccounts, useListTreasuryTransactions, useGetTreasurySummary, getGetTreasurySummaryQueryKey } from "@workspace/api-client-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { formatMoney, formatUSD, formatDate } from "@/lib/utils"
import { Landmark, ArrowUpRight, ArrowDownRight, RefreshCw } from "lucide-react"

export default function Treasury() {
  const { data: summary, isLoading: sumLoading } = useGetTreasurySummary({ query: { queryKey: getGetTreasurySummaryQueryKey() }})
  const { data: accounts, isLoading: accLoading } = useListTreasuryAccounts()
  const { data: txs, isLoading: txLoading } = useListTreasuryTransactions()

  return (
    <AppLayout>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Treasury Operations</h1>
          <p className="text-muted-foreground mt-1">Central liquidity, accounts, and ledger.</p>
        </div>
      </div>

      {sumLoading ? (
        <div className="animate-pulse space-y-8">
          <div className="h-32 bg-muted rounded-xl"></div>
        </div>
      ) : summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="bg-slate-900 text-white">
            <CardContent className="pt-6">
              <p className="text-slate-400 text-sm font-medium uppercase tracking-wider mb-2">Total USD Reserves</p>
              <p className="text-3xl font-serif font-bold">{formatUSD(summary.totalUsdReservesCents)}</p>
            </CardContent>
          </Card>
          <Card className="bg-primary text-white">
            <CardContent className="pt-6">
              <p className="text-primary-foreground/70 text-sm font-medium uppercase tracking-wider mb-2">GMD Operational</p>
              <p className="text-3xl font-serif font-bold">{formatMoney(summary.totalGmdOperationalCents)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground text-sm font-medium uppercase tracking-wider mb-2">Reserve Ratio</p>
              <p className="text-3xl font-serif font-bold text-amber-600">{(summary.reserveRatio * 100).toFixed(1)}%</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground text-sm font-medium uppercase tracking-wider mb-2">Pending Settlements</p>
              <p className="text-3xl font-serif font-bold text-destructive">{formatMoney(summary.pendingSettlementsCents)}</p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 space-y-6">
          <h2 className="text-2xl font-serif font-bold">Treasury Ledger</h2>
          <Card className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {txs?.map(tx => (
                  <TableRow key={tx.id}>
                    <TableCell className="text-muted-foreground whitespace-nowrap">{formatDate(tx.createdAt)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="uppercase text-[10px]">
                        {tx.type === 'deposit' ? <ArrowDownRight className="w-3 h-3 mr-1 text-emerald-500" /> : 
                         tx.type === 'withdrawal' ? <ArrowUpRight className="w-3 h-3 mr-1 text-destructive" /> : 
                         <RefreshCw className="w-3 h-3 mr-1 text-blue-500" />}
                        {tx.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium max-w-[200px] truncate" title={tx.description}>{tx.description}</TableCell>
                    <TableCell className={`text-right font-mono font-medium ${tx.type === 'deposit' ? 'text-emerald-600' : tx.type === 'withdrawal' ? 'text-destructive' : ''}`}>
                      {tx.type === 'withdrawal' ? '-' : '+'}{formatMoney(tx.amountCents)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </div>

        <div className="space-y-6">
          <h2 className="text-xl font-serif font-bold">Active Accounts</h2>
          <div className="space-y-4">
            {accounts?.map(acc => (
              <Card key={acc.id} className="hover:border-primary/50 transition-colors">
                <CardContent className="p-5">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-bold text-lg leading-none">{acc.name}</h4>
                      <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wider">{acc.type}</p>
                    </div>
                    <Badge variant="secondary">{acc.currency}</Badge>
                  </div>
                  <div className="text-2xl font-serif mt-4 text-foreground/80">
                    {acc.currency === 'USD' ? formatUSD(acc.balanceCents) : formatMoney(acc.balanceCents)}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
