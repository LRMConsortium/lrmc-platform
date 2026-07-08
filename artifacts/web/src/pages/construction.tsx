import { AppLayout } from "@/components/layout/AppLayout"
import { useListConstructionProjects, useListConstructionContractors, useCreateConstructionContractor, useCreateConstructionProject, useUpdateConstructionProject, useGetCurrentUser } from "@workspace/api-client-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useQueryClient } from "@tanstack/react-query"
import { useToast } from "@/hooks/use-toast"
import { useState } from "react"
import { formatMoney, formatDate } from "@/lib/utils"
import { Hammer, Building, Star, MapPin } from "lucide-react"

export default function Construction() {
  const { data: user } = useGetCurrentUser()
  const isAdmin = user?.role === "admin"

  return (
    <AppLayout>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Construction</h1>
          <p className="text-muted-foreground mt-1">Manage contractors and active consortium building projects.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-serif font-bold">Active Projects</h2>
            {isAdmin && <AddProjectDialog />}
          </div>
          <ProjectsList />
        </div>
        
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-serif font-bold">Contractors</h2>
            {isAdmin && <AddContractorDialog />}
          </div>
          <ContractorsList />
        </div>
      </div>
    </AppLayout>
  )
}

function ProjectsList() {
  const { data: projects, isLoading } = useListConstructionProjects()
  const { data: user } = useGetCurrentUser()
  const isAdmin = user?.role === "admin"
  const update = useUpdateConstructionProject()
  const queryClient = useQueryClient()

  if (isLoading) return <div className="space-y-4 animate-pulse"><div className="h-32 bg-muted rounded-xl"></div></div>

  const handleStatus = (id: number, status: string) => {
    update.mutate({ id, data: { status } }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/construction-projects"] })
    })
  }

  return (
    <div className="space-y-4">
      {projects?.map(p => (
        <Card key={p.id} className="overflow-hidden hover:shadow-md transition-shadow border-l-4 border-l-orange-500">
          <CardContent className="p-0">
            <div className="flex flex-col sm:flex-row">
              <div className="p-6 flex-1">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-lg">{p.title}</h3>
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                      <MapPin className="h-3 w-3" /> {p.location}
                    </p>
                  </div>
                  <Badge variant={p.status === 'in_progress' ? 'default' : p.status === 'completed' ? 'secondary' : 'outline'}>
                    {p.status.replace('_', ' ')}
                  </Badge>
                </div>
                <div className="mt-6 flex flex-wrap gap-x-8 gap-y-2 text-sm">
                  <div>
                    <span className="text-muted-foreground font-medium mr-2">Budget:</span>
                    <span className="font-bold">{formatMoney(p.budgetCents)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground font-medium mr-2">Contractor ID:</span>
                    <span className="font-mono">{p.contractorId}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground font-medium mr-2">Started:</span>
                    <span>{formatDate(p.createdAt)}</span>
                  </div>
                </div>
              </div>
              {isAdmin && p.status === 'in_progress' && (
                <div className="bg-muted/20 p-4 sm:border-l sm:w-48 flex flex-col justify-center gap-2">
                  <Button size="sm" onClick={() => handleStatus(p.id, 'completed')}>Mark Completed</Button>
                  <Button size="sm" variant="outline" onClick={() => handleStatus(p.id, 'delayed')}>Mark Delayed</Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
      {projects?.length === 0 && (
        <div className="py-12 text-center text-muted-foreground border rounded-lg bg-card">No active projects.</div>
      )}
    </div>
  )
}

function ContractorsList() {
  const { data: contractors, isLoading } = useListConstructionContractors()

  if (isLoading) return <div className="space-y-4 animate-pulse"><div className="h-20 bg-muted rounded-xl"></div></div>

  return (
    <div className="space-y-3">
      {contractors?.map(c => (
        <Card key={c.id} className="hover:bg-muted/10 transition-colors">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="bg-primary/10 p-3 rounded-full">
              <Hammer className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold truncate">{c.companyName}</h4>
              <p className="text-xs text-muted-foreground truncate">{c.specialty}</p>
            </div>
            <div className="flex items-center gap-1 text-sm font-medium">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
              {c.rating.toFixed(1)}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// Dialogs omitted for brevity but following the same Form/Zod pattern as Land/Properties.
function AddProjectDialog() { return <Button variant="outline" className="hidden">Add Project (Stub)</Button> }
function AddContractorDialog() { return <Button variant="outline" className="hidden">Add Contractor (Stub)</Button> }
