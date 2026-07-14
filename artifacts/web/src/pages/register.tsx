import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Link, useLocation } from "wouter"
import { ShieldCheck } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useRegister, useGetCurrentUser } from "@workspace/api-client-react"
import { useState } from "react"
import { useEffect } from "react"
import { useToast } from "@/hooks/use-toast"
import { Mail } from "lucide-react"

// Common country dialing codes — defaulting to Gambia (+220)
const COUNTRY_CODES = [
  { code: "+220", label: "+220 Gambia" },
  { code: "+221", label: "+221 Senegal" },
  { code: "+233", label: "+233 Ghana" },
  { code: "+234", label: "+234 Nigeria" },
  { code: "+27",  label: "+27 South Africa" },
  { code: "+254", label: "+254 Kenya" },
  { code: "+1",   label: "+1 USA / Canada" },
  { code: "+44",  label: "+44 United Kingdom" },
  { code: "+33",  label: "+33 France" },
  { code: "+49",  label: "+49 Germany" },
] as const

const registerSchema = z.object({
  fullName: z.string().min(2, "Full name is required"),
  email: z.string().email(),
  phoneCode: z.string().min(1, "Country code is required"),
  phoneNumber: z.string().min(4, "Phone number is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
})

export default function Register() {
  const [, setLocation] = useLocation()
  const { data: user, isLoading: userLoading } = useGetCurrentUser()
  const register = useRegister()
  const { toast } = useToast()
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null)

  const form = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phoneCode: "+220",
      phoneNumber: "",
      password: "",
    },
  })

  useEffect(() => {
    if (user && !userLoading) {
      setLocation("/dashboard")
    }
  }, [user, userLoading, setLocation])

  function onSubmit(values: z.infer<typeof registerSchema>) {
    const phone = `${values.phoneCode} ${values.phoneNumber}`.trim()
    register.mutate({ data: { fullName: values.fullName, email: values.email, phone, password: values.password } }, {
      onSuccess: () => {
        setSubmittedEmail(values.email)
      },
      onError: () => {
        toast({
          title: "Registration failed",
          description: "There was an error creating your account.",
          variant: "destructive"
        })
      }
    })
  }

  if (userLoading) return null

  if (submittedEmail) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-muted/30 p-4">
        <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-8 duration-700">
          <Card className="border-t-4 border-t-primary shadow-xl text-center">
            <CardHeader className="space-y-3 pb-2">
              <div className="mx-auto bg-primary/10 p-4 rounded-full w-fit">
                <Mail className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl font-serif">Check your inbox</CardTitle>
              <CardDescription>
                We sent a confirmation link to <span className="font-medium text-foreground">{submittedEmail}</span>.
                Click it to activate your account before signing in.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                Didn't get it? You can request a new link from the{" "}
                <Link href="/login" className="text-primary hover:underline font-semibold">
                  sign in page
                </Link>
                .
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-muted/30 p-4 py-12">
      <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="bg-primary p-4 rounded-xl shadow-lg mb-4">
            <ShieldCheck className="h-10 w-10 text-primary-foreground" />
          </div>
          <h1 className="font-serif text-3xl font-bold text-foreground">Legacy Rental Management</h1>
          <p className="text-muted-foreground uppercase tracking-widest text-xs font-semibold mt-2">Membership Application</p>
        </div>

        <Card className="border-t-4 border-t-primary shadow-xl">
          <CardHeader className="space-y-1 text-center pb-6">
            <CardTitle className="text-2xl font-serif">Apply for Access</CardTitle>
            <CardDescription>
              Join the consortium to access our services
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Legal Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Musa Jallow" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <Input placeholder="musa@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Phone with country code */}
                <div className="space-y-2">
                  <FormLabel>Phone Number</FormLabel>
                  <div className="flex gap-2">
                    <FormField
                      control={form.control}
                      name="phoneCode"
                      render={({ field }) => (
                        <FormItem className="w-44 shrink-0">
                          <FormControl>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {COUNTRY_CODES.map(c => (
                                  <SelectItem key={c.code} value={c.code}>{c.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="phoneNumber"
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormControl>
                            <Input placeholder="123 4567" type="tel" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full h-11 text-base mt-2" disabled={register.isPending}>
                  {register.isPending ? "Submitting..." : "Submit Application"}
                </Button>
              </form>
            </Form>
            <div className="mt-6 text-center text-sm">
              <span className="text-muted-foreground">Already a member? </span>
              <Link href="/login" className="text-primary hover:underline font-semibold">Sign in</Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
