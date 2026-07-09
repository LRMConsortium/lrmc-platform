import { useAuth } from "@workspace/replit-auth-web";
import { useListPayments } from "@workspace/api-client-react";
import { Loader2, ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getListPaymentsQueryKey } from "@workspace/api-client-react";

export function PaymentsPage() {
  const { user } = useAuth();
  const { data: payments, isLoading } = useListPayments(
    { userId: user?.id },
    { query: { enabled: !!user, queryKey: getListPaymentsQueryKey({ userId: user?.id }) } }
  );

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-serif font-bold text-foreground">Payment History</h1>
        <p className="text-muted-foreground mt-2">Ledger of your transactions across the LRMC network.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transaction Ledger</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? <div className="p-8 flex justify-center"><Loader2 className="animate-spin w-8 h-8 text-primary" /></div> : (!payments || payments.length === 0) ? (
            <div className="text-center py-12 text-muted-foreground">No payment history found.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map(p => (
                  <TableRow key={p.id}>
                    <TableCell className="text-muted-foreground whitespace-nowrap">
                      {new Date(p.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="capitalize font-medium">{p.category.replace('_', ' ')}</TableCell>
                    <TableCell>
                      <Badge variant={p.status === 'completed' ? 'default' : 'secondary'}>{p.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold">
                      {p.currency} {p.amount.toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
