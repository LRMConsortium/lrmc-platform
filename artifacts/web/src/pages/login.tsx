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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useLogin, useGetCurrentUser, useResendVerification } from "@workspace/api-client-react"
import { useQueryClient } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { useToast } from "@/hooks/use-toast"
import { ApiError } from "@workspace/api-client-react"

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, "Password is required"),
})

export default function Login() {
  const [, setLocation] = useLocation()
  const { data: user, isLoading: userLoading } = useGetCurrentUser()
  const login = useLogin()
  const resendVerification = useResendVerification()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null)

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  })

  useEffect(() => {
    if (user && !userLoading) {
      setLocation("/dashboard")
    }
  }, [user, userLoading, setLocation])

  function onSubmit(values: z.infer<typeof loginSchema>) {
    setUnverifiedEmail(null)
    login.mutate({ data: values }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] })
        setLocation("/dashboard")
      },
      onError: (err) => {
        const data = err instanceof ApiError ? (err.data as { code?: string } | null) : null
        if (data?.code === "email_not_verified") {
          setUnverifiedEmail(values.email)
          toast({
            title: "Email not verified",
            description: "Please confirm your email before signing in.",
            variant: "destructive"
          })
          return
        }
        toast({
          title: "Login failed",
          description: "Please check your credentials and try again.",
          variant: "destructive"
        })
      }
    })
  }

  function onResend() {
    if (!unverifiedEmail) return
    resendVerification.mutate({ data: { email: unverifiedEmail } }, {
      onSuccess: () => {
        toast({
          title: "Verification email sent",
          description: "Check your inbox for a new confirmation link.",
        })
      },
      onError: () => {
        toast({
          title: "Something went wrong",
          description: "We couldn't send that email. Please try again.",
          variant: "destructive",
        })
      }
    })
  }

  if (userLoading) return null

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="bg-primary p-4 rounded-xl shadow-lg mb-4">
            <ShieldCheck className="h-10 w-10 text-primary-foreground" />
          </div>
          <h1 className="font-serif text-3xl font-bold text-foreground">Legacy Rental Management</h1>
          <p className="text-muted-foreground uppercase tracking-widest text-xs font-semibold mt-2">Consortium Portal</p>
        </div>

        <Card className="border-t-4 border-t-primary shadow-xl">
          <CardHeader className="space-y-1 text-center pb-6">
            <CardTitle className="text-2xl font-serif">Sign in</CardTitle>
            <CardDescription>
              Access the institutional back-office
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="name@lrmc.gm" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
                <div className="text-right -mt-2">
                  <Link href="/forgot-password" className="text-sm text-primary hover:underline">
                    Forgot password?
                  </Link>
                </div>
                <Button type="submit" className="w-full h-11 text-base mt-2" disabled={login.isPending}>
                  {login.isPending ? "Authenticating..." : "Sign in to Portal"}
                </Button>
                {unverifiedEmail && (
                  <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-center space-y-2">
                    <p className="text-muted-foreground">
                      Your email isn't verified yet.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={onResend}
                      disabled={resendVerification.isPending}
                    >
                      {resendVerification.isPending ? "Sending..." : "Resend verification email"}
                    </Button>
                  </div>
                )}
              </form>
            </Form>
            <div className="mt-6 text-center text-sm">
              <span className="text-muted-foreground">Don't have an account? </span>
              <Link href="/register" className="text-primary hover:underline font-semibold">
                Apply for membership
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
