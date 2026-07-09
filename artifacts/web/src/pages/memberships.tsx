import { useAuth } from "@workspace/replit-auth-web";
import { useListMemberships, useCreateMembership, useUpdateMembership } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { getListMembershipsQueryKey } from "@workspace/api-client-react";

const MEMBERSHIP_TYPES = [
  "property_owner", "vehicle_owner", "airbnb_host", "resort_owner", 
  "land_seller", "construction_contractor", "advertiser", "ususu_driver", "renter"
];

export function MembershipsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const queryClient = useQueryClient();

  const { data: memberships, isLoading } = useListMemberships(isAdmin ? {} : { userId: user?.id }, {
    query: { queryKey: getListMembershipsQueryKey(isAdmin ? {} : { userId: user?.id }) }
  });

  const createMembership = useCreateMembership();
  const updateMembership = useUpdateMembership();

  const [newType, setNewType] = useState<string>("");

  const handleApply = () => {
    if (!newType || !user) return;
    createMembership.mutate(
      { data: { userId: user.id, type: newType, feeDalasi: 500 } },
      {
        onSuccess: () => {
          toast.success("Membership application submitted!");
          queryClient.invalidateQueries({ queryKey: getListMembershipsQueryKey({ userId: user.id }) });
          setNewType("");
        },
        onError: () => {
          toast.error("Failed to submit application");
        }
      }
    );
  };

  const handleUpdateStatus = (id: number, status: string) => {
    updateMembership.mutate(
      { id, data: { status, paidAt: status === 'active' ? new Date().toISOString() : null } },
      {
        onSuccess: () => {
          toast.success(`Membership marked as ${status}`);
          queryClient.invalidateQueries({ queryKey: getListMembershipsQueryKey({}) });
        }
      }
    );
  };

  if (isLoading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin w-8 h-8 text-primary" /></div>;

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-serif font-bold text-foreground">
          {isAdmin ? "Directory & Memberships" : "My Memberships"}
        </h1>
        <p className="text-muted-foreground mt-2">
          {isAdmin ? "Manage network membership approvals and status." : "Manage your credentials across LRMC sectors."}
        </p>
      </div>

      {!isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Apply for New Membership</CardTitle>
            <CardDescription>Select a sector to expand your participation in the consortium.</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-4">
            <Select value={newType} onValueChange={setNewType}>
              <SelectTrigger className="w-[300px]">
                <SelectValue placeholder="Select membership type..." />
              </SelectTrigger>
              <SelectContent>
                {MEMBERSHIP_TYPES.map(t => (
                  <SelectItem key={t} value={t}>{t.replace('_', ' ').toUpperCase()}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleApply} disabled={!newType || createMembership.isPending}>
              {createMembership.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
              Submit Application
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Current Records</CardTitle>
        </CardHeader>
        <CardContent>
          {(!memberships || memberships.length === 0) ? (
            <div className="text-center py-12 text-muted-foreground">No memberships found.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {isAdmin && <TableHead>User ID</TableHead>}
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Fee (GMD)</TableHead>
                  <TableHead>Applied On</TableHead>
                  {isAdmin && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {memberships.map((m) => (
                  <TableRow key={m.id}>
                    {isAdmin && <TableCell className="font-mono text-xs">{m.userId.slice(0,8)}...</TableCell>}
                    <TableCell className="capitalize">{m.type.replace('_', ' ')}</TableCell>
                    <TableCell>
                      <Badge variant={m.status === 'active' ? 'default' : m.status === 'pending' ? 'secondary' : 'destructive'}>
                        {m.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{m.feeDalasi.toLocaleString()}</TableCell>
                    <TableCell>{new Date(m.createdAt).toLocaleDateString()}</TableCell>
                    {isAdmin && (
                      <TableCell className="text-right space-x-2">
                        {m.status === 'pending' && (
                          <>
                            <Button size="sm" variant="outline" onClick={() => handleUpdateStatus(m.id, 'active')}>Approve</Button>
                            <Button size="sm" variant="destructive" onClick={() => handleUpdateStatus(m.id, 'rejected')}>Reject</Button>
                          </>
                        )}
                        {m.status === 'active' && (
                          <Button size="sm" variant="outline" onClick={() => handleUpdateStatus(m.id, 'suspended')}>Suspend</Button>
                        )}
                      </TableCell>
                    )}
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
