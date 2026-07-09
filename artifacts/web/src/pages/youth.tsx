import { useAuth } from "@workspace/replit-auth-web";
import { 
  useListYouthEmploymentRecords, useCreateYouthEmploymentRecord, useUpdateYouthEmploymentRecord 
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2, Briefcase, Building } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { getListYouthEmploymentRecordsQueryKey } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function YouthEmploymentPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({ fullName: user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : "", email: user?.email || "", phone: user?.phone || "", program: "internship" });

  const { data: records, isLoading } = useListYouthEmploymentRecords({ query: { queryKey: getListYouthEmploymentRecordsQueryKey() } });

  const createRecord = useCreateYouthEmploymentRecord();
  const updateRecord = useUpdateYouthEmploymentRecord();

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    createRecord.mutate(
      { data: formData },
      {
        onSuccess: () => {
          toast.success("Application submitted successfully!");
          queryClient.invalidateQueries({ queryKey: getListYouthEmploymentRecordsQueryKey() });
          setFormData({ ...formData, program: "internship" });
        }
      }
    );
  };

  const handleUpdate = (id: number, status: string, placementCompany?: string) => {
    updateRecord.mutate(
      { id, data: { status, placementCompany } },
      {
        onSuccess: () => {
          toast.success(`Application updated to ${status}`);
          queryClient.invalidateQueries({ queryKey: getListYouthEmploymentRecordsQueryKey() });
        }
      }
    );
  };

  // For members, try to find their own record based on email.
  const myRecord = records?.find(r => r.email === user?.email);

  if (isLoading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin w-8 h-8 text-primary" /></div>;

  if (!isAdmin) {
    return (
      <div className="p-6 md:p-8 max-w-3xl mx-auto space-y-8">
        <div className="text-center space-y-4 py-8">
          <div className="w-16 h-16 bg-primary/10 text-primary flex items-center justify-center rounded-2xl mx-auto">
            <Briefcase className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-serif font-bold">Youth Employment Initiative</h1>
          <p className="text-muted-foreground text-lg">Apply for placements, internships, and apprenticeships across the LRMC partner network.</p>
        </div>

        {myRecord ? (
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader className="text-center">
              <CardTitle>Application Status</CardTitle>
              <CardDescription>You have already applied for this program.</CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-6">
              <div className="text-2xl font-bold uppercase tracking-wider text-primary">{myRecord.status}</div>
              {myRecord.placementCompany && (
                <div className="p-4 bg-background border rounded-lg inline-block">
                  <div className="text-sm text-muted-foreground mb-1">Placed With:</div>
                  <div className="font-bold flex items-center gap-2 justify-center"><Building className="w-4 h-4" /> {myRecord.placementCompany}</div>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Submit Application</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleApply} className="space-y-4">
                <div className="space-y-2"><Label>Full Name</Label><Input required value={formData.fullName} onChange={e=>setFormData({...formData, fullName: e.target.value})} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Email</Label><Input type="email" required value={formData.email} onChange={e=>setFormData({...formData, email: e.target.value})} /></div>
                  <div className="space-y-2"><Label>Phone</Label><Input required value={formData.phone} onChange={e=>setFormData({...formData, phone: e.target.value})} /></div>
                </div>
                <div className="space-y-2"><Label>Program Interest</Label><Input required value={formData.program} onChange={e=>setFormData({...formData, program: e.target.value})} placeholder="e.g. Construction Apprenticeship, Admin Trainee" /></div>
                <Button type="submit" className="w-full mt-6" disabled={createRecord.isPending}>Submit Application</Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-serif font-bold text-foreground">Applicant Pipeline</h1>
        <p className="text-muted-foreground mt-2">Manage youth employment candidates and partner placements.</p>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Applicant</TableHead>
                <TableHead>Program</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Placement</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records?.map(r => (
                <TableRow key={r.id}>
                  <TableCell>
                    <div className="font-medium">{r.fullName}</div>
                    <div className="text-xs text-muted-foreground">{r.email} • {r.phone}</div>
                  </TableCell>
                  <TableCell className="capitalize">{r.program}</TableCell>
                  <TableCell><Badge variant={r.status === 'placed' ? 'default' : 'secondary'}>{r.status}</Badge></TableCell>
                  <TableCell>{r.placementCompany || <span className="text-muted-foreground italic">None</span>}</TableCell>
                  <TableCell className="text-right space-x-2">
                    {r.status === 'pending' && <Button size="sm" variant="outline" onClick={() => handleUpdate(r.id, 'reviewed')}>Mark Reviewed</Button>}
                    {r.status === 'reviewed' && <Button size="sm" onClick={() => {
                      const company = prompt("Enter placement company name:");
                      if (company) handleUpdate(r.id, 'placed', company);
                    }}>Place Candidate</Button>}
                  </TableCell>
                </TableRow>
              ))}
              {(!records || records.length === 0) && (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No applications found.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
