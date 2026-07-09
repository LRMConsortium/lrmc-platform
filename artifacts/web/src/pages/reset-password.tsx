import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Link, useLocation, useSearch } from "wouter"
import { ShieldCheck, CheckCircle2, XCircle } from "lucide-react"

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
import { useResetPassword, ApiError } from "@workspace/api-client-react"
import { useMemo, useState } from "react"

const schema = z.object({
  password: z.string().min(6, "Password must be at least 6 characters"),
})

export default function ResetPassword() {
  const search = useSearch()
  const [, setLocation] = useLocation()
  const token = useMemo(() => new URLSearchParams(search).get("token") ?? "", [search])
  const resetPassword = useResetPassword()
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { password: "" },
  })

  function onSubmit(values: z.infer<typeof schema>) {
    resetPassword.mutate({ data: { token, password: values.password } }, {
      onSuccess: () => setStatus("success"),
      onError: (err) => {
        setStatus("error")
        setErrorMessage(
          err instanceof ApiError && typeof err.data === "object" && err.data && "error" in err.data
            ? String((err.data as { error?: string }).error)
            : "This link is invalid or has expired."
        )
      },
    })
  }

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
          {!token ? (
            <CardContent className="text-center py-10 space-y-3">
              <XCircle className="h-10 w-10 text-destructive mx-auto" />
              <CardTitle className="text-xl font-serif">Invalid link</CardTitle>
              <CardDescription>
                This password reset link is missing its token.{" "}
                <Link href="/forgot-password" className="text-primary hover:underline font-semibold">
                  Request a new one
                </Link>
                .
              </CardDescription>
            </CardContent>
          ) : status === "success" ? (
            <CardContent className="text-center py-10 space-y-3">
              <CheckCircle2 className="h-10 w-10 text-primary mx-auto" />
              <CardTitle className="text-xl font-serif">Password updated</CardTitle>
              <CardDescription>
                You can now sign in with your new password. Any other active sessions have been signed out.
              </CardDescription>
              <Button className="mt-2" onClick={() => setLocation("/login")}>
                Go to sign in
              </Button>
            </CardContent>
          ) : status === "error" ? (
            <CardContent className="text-center py-10 space-y-3">
              <XCircle className="h-10 w-10 text-destructive mx-auto" />
              <CardTitle className="text-xl font-serif">Link expired or invalid</CardTitle>
              <CardDescription>{errorMessage}</CardDescription>
              <Link href="/forgot-password" className="text-primary hover:underline font-semibold block mt-2">
                Request a new reset link
              </Link>
            </CardContent>
          ) : (
            <>
              <CardHeader className="space-y-1 text-center pb-6">
                <CardTitle className="text-2xl font-serif">Set a new password</CardTitle>
                <CardDescription>Choose a new password for your account</CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>New password</FormLabel>
                          <FormControl>
                            <Input type="password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" className="w-full h-11 text-base mt-2" disabled={resetPassword.isPending}>
                      {resetPassword.isPending ? "Updating..." : "Update password"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  )
}
