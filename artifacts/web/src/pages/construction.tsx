import { useAuth } from "@workspace/replit-auth-web";
import { 
  useListConstructionContractors, useCreateConstructionContractor, useUpdateConstructionContractor, 
  useListConstructionProjects, useCreateConstructionProject, useUpdateConstructionProject 
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { Loader2, HardHat, Building, Calendar, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { getListConstructionContractorsQueryKey, getListConstructionProjectsQueryKey } from "@workspace/api-client-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ConstructionPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<string>(isAdmin ? "contractors" : "projects");
  const [isContractorModalOpen, setContractorModalOpen] = useState(false);
  const [isProjectModalOpen, setProjectModalOpen] = useState(false);

  // Forms
  const [contractorForm, setContractorForm] = useState({ companyName: "", specialty: "", licenseNumber: "" });
  const [projectForm, setProjectForm] = useState({ title: "", location: "", budgetUsd: "10000", startDate: "", endDate: "" });

  const { data: allContractorsForUser } = useListConstructionContractors(
    { query: { enabled: !isAdmin && !!user, queryKey: getListConstructionContractorsQueryKey() } }
  );
  const myContractor = allContractorsForUser?.find((c) => c.userId === user?.id);

  const { data: allContractors, isLoading: loadingContractors } = useListConstructionContractors(
    { query: { enabled: isAdmin, queryKey: getListConstructionContractorsQueryKey() } }
  );

  const { data: projects, isLoading: loadingProjects } = useListConstructionProjects(
    !isAdmin && myContractor ? { contractorId: myContractor.id } : {},
    { query: { enabled: isAdmin || !!myContractor, queryKey: getListConstructionProjectsQueryKey(!isAdmin && myContractor ? { contractorId: myContractor.id } : {}) } }
  );

  const createContractor = useCreateConstructionContractor();
  const updateContractor = useUpdateConstructionContractor();
  const createProject = useCreateConstructionProject();
  const updateProject = useUpdateConstructionProject();

  const handleRegisterContractor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    createContractor.mutate(
      { data: { userId: user.id, ...contractorForm } },
      {
        onSuccess: () => {
          toast.success("Application submitted!");
          queryClient.invalidateQueries({ queryKey: getListConstructionContractorsQueryKey() });
          setContractorModalOpen(false);
        }
      }
    );
  };

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!myContractor) return;
    createProject.mutate(
      { data: { contractorId: myContractor.id, ...projectForm, budgetUsd: Number(projectForm.budgetUsd) } },
      {
        onSuccess: () => {
          toast.success("Project added successfully!");
          queryClient.invalidateQueries({ queryKey: getListConstructionProjectsQueryKey({ contractorId: myContractor.id }) });
          setProjectModalOpen(false);
        }
      }
    );
  };

  const handleUpdateContractorStatus = (id: number, status: string) => {
    updateContractor.mutate(
      { id, data: { status } },
      {
        onSuccess: () => {
          toast.success(`Contractor marked as ${status}`);
          queryClient.invalidateQueries({ queryKey: getListConstructionContractorsQueryKey() });
        }
      }
    );
  };

  const handleUpdateProjectStatus = (id: number, status: string) => {
    updateProject.mutate(
      { id, data: { status } },
      {
        onSuccess: () => {
          toast.success(`Project marked as ${status}`);
          queryClient.invalidateQueries({ queryKey: getListConstructionProjectsQueryKey(isAdmin ? {} : { contractorId: myContractor?.id }) });
        }
      }
    );
  };

  if (!isAdmin && myContractor === undefined && !loadingContractors) {
    return (
      <div className="p-8 max-w-3xl mx-auto mt-12 text-center space-y-6">
        <HardHat className="w-16 h-16 mx-auto text-muted-foreground" />
        <h1 className="text-3xl font-serif font-bold">Construction Partner Program</h1>
        <p className="text-muted-foreground text-lg">Register your construction business with LRMC to access verified projects, institutional financing, and manage your portfolio.</p>
        
        <Dialog open={isContractorModalOpen} onOpenChange={setContractorModalOpen}>
          <DialogTrigger asChild>
            <Button size="lg" className="px-8"><CheckCircle className="mr-2" /> Apply as Contractor</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Contractor Registration</DialogTitle></DialogHeader>
            <form onSubmit={handleRegisterContractor} className="space-y-4 pt-4">
              <div className="space-y-2"><Label>Company Name</Label><Input required value={contractorForm.companyName} onChange={e=>setContractorForm({...contractorForm, companyName: e.target.value})} /></div>
              <div className="space-y-2"><Label>Specialty</Label><Input value={contractorForm.specialty} onChange={e=>setContractorForm({...contractorForm, specialty: e.target.value})} placeholder="e.g. Residential, Commercial, Civil" /></div>
              <div className="space-y-2"><Label>License Number</Label><Input value={contractorForm.licenseNumber} onChange={e=>setContractorForm({...contractorForm, licenseNumber: e.target.value})} /></div>
              <div className="flex justify-end"><Button type="submit" disabled={createContractor.isPending}>Submit Application</Button></div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Construction Management</h1>
          <p className="text-muted-foreground mt-2">Manage infrastructure projects and contractor relationships.</p>
        </div>
        {!isAdmin && myContractor?.status === 'active' && (
          <Dialog open={isProjectModalOpen} onOpenChange={setProjectModalOpen}>
            <DialogTrigger asChild>
              <Button><Building className="w-4 h-4 mr-2" /> New Project</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Register Project</DialogTitle></DialogHeader>
              <form onSubmit={handleCreateProject} className="space-y-4 pt-4">
                <div className="space-y-2"><Label>Project Title</Label><Input required value={projectForm.title} onChange={e=>setProjectForm({...projectForm, title: e.target.value})} /></div>
                <div className="space-y-2"><Label>Location</Label><Input required value={projectForm.location} onChange={e=>setProjectForm({...projectForm, location: e.target.value})} /></div>
                <div className="space-y-2"><Label>Budget (USD)</Label><Input type="number" required value={projectForm.budgetUsd} onChange={e=>setProjectForm({...projectForm, budgetUsd: e.target.value})} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Start Date</Label><Input type="date" value={projectForm.startDate} onChange={e=>setProjectForm({...projectForm, startDate: e.target.value})} /></div>
                  <div className="space-y-2"><Label>End Date</Label><Input type="date" value={projectForm.endDate} onChange={e=>setProjectForm({...projectForm, endDate: e.target.value})} /></div>
                </div>
                <div className="flex justify-end"><Button type="submit" disabled={createProject.isPending}>Add Project</Button></div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {!isAdmin && myContractor && myContractor.status !== 'active' && (
        <Card className="bg-muted/50 border-dashed">
          <CardContent className="py-6 text-center text-muted-foreground">
            Your contractor application is currently <strong className="text-foreground">{myContractor.status}</strong>. 
            {myContractor.status === 'pending' && " You will be able to add projects once approved."}
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          {isAdmin && <TabsTrigger value="contractors">Contractors</TabsTrigger>}
          <TabsTrigger value="projects">{isAdmin ? "All Projects" : "My Projects"}</TabsTrigger>
        </TabsList>

        {isAdmin && (
          <TabsContent value="contractors" className="m-0">
            {loadingContractors ? <div className="p-8 flex justify-center"><Loader2 className="animate-spin w-8 h-8 text-primary" /></div> : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {allContractors?.map(c => (
                  <Card key={c.id}>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg">{c.companyName}</CardTitle>
                        <Badge variant={c.status === 'active' ? 'default' : 'secondary'}>{c.status}</Badge>
                      </div>
                      <CardDescription>{c.specialty} • Lic: {c.licenseNumber}</CardDescription>
                    </CardHeader>
                    {c.status === 'pending' && (
                      <CardFooter className="pt-4 border-t flex gap-2">
                        <Button className="w-full" variant="outline" onClick={() => handleUpdateContractorStatus(c.id, 'active')}>Approve</Button>
                        <Button className="w-full" variant="destructive" onClick={() => handleUpdateContractorStatus(c.id, 'rejected')}>Reject</Button>
                      </CardFooter>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        )}

        <TabsContent value="projects" className="m-0">
          {loadingProjects ? <div className="p-8 flex justify-center"><Loader2 className="animate-spin w-8 h-8 text-primary" /></div> : (!projects || projects.length === 0) ? (
            <div className="text-center py-12 text-muted-foreground bg-card border rounded-xl">No projects found.</div>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              {projects.map(p => (
                <Card key={p.id}>
                  <CardHeader className="pb-2 border-b mb-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle>{p.title}</CardTitle>
                        <CardDescription className="flex items-center gap-1 mt-1"><HardHat className="w-3 h-3" /> {p.location}</CardDescription>
                      </div>
                      <Badge variant={p.status === 'in_progress' ? 'default' : p.status === 'completed' ? 'secondary' : 'outline'}>{p.status.replace('_', ' ')}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Budget</span>
                      <span className="font-bold text-accent">${p.budgetUsd.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground flex items-center"><Calendar className="w-3 h-3 mr-1" /> Timeline</span>
                      <span>{p.startDate ? new Date(p.startDate).toLocaleDateString() : 'TBD'} - {p.endDate ? new Date(p.endDate).toLocaleDateString() : 'TBD'}</span>
                    </div>
                  </CardContent>
                  {(isAdmin || (!isAdmin && myContractor?.id === p.contractorId)) && p.status !== 'completed' && (
                    <CardFooter className="pt-4 border-t flex gap-2 justify-end bg-muted/20">
                      {p.status === 'planning' && <Button size="sm" onClick={() => handleUpdateProjectStatus(p.id, 'in_progress')}>Start Project</Button>}
                      {p.status === 'in_progress' && <Button size="sm" variant="secondary" onClick={() => handleUpdateProjectStatus(p.id, 'completed')}>Mark Completed</Button>}
                    </CardFooter>
                  )}
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
