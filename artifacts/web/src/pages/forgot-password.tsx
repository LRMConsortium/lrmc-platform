import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Link } from "wouter"
import { ShieldCheck, Mail } from "lucide-react"

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
import { useForgotPassword } from "@workspace/api-client-react"
import { useState } from "react"
import { useToast } from "@/hooks/use-toast"

const schema = z.object({
  email: z.string().email(),
})

export default function ForgotPassword() {
  const forgotPassword = useForgotPassword()
  const [submitted, setSubmitted] = useState(false)
  const { toast } = useToast()

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  })

  function onSubmit(values: z.infer<typeof schema>) {
    forgotPassword.mutate({ data: values }, {
      onSuccess: () => setSubmitted(true),
      onError: () => {
        toast({
          title: "Something went wrong",
          description: "We couldn't process that request. Please try again.",
          variant: "destructive",
        })
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
          {submitted ? (
            <>
              <CardHeader className="space-y-3 text-center pb-2">
                <div className="mx-auto bg-primary/10 p-4 rounded-full w-fit">
                  <Mail className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-2xl font-serif">Check your inbox</CardTitle>
                <CardDescription>
                  If that email is registered, we've sent a link to reset your password. It expires in 1 hour.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center text-sm">
                <Link href="/login" className="text-primary hover:underline font-semibold">
                  Back to sign in
                </Link>
              </CardContent>
            </>
          ) : (
            <>
              <CardHeader className="space-y-1 text-center pb-6">
                <CardTitle className="text-2xl font-serif">Forgot password</CardTitle>
                <CardDescription>
                  Enter your account email and we'll send you a reset link
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
                    <Button type="submit" className="w-full h-11 text-base mt-2" disabled={forgotPassword.isPending}>
                      {forgotPassword.isPending ? "Sending..." : "Send reset link"}
                    </Button>
                  </form>
                </Form>
                <div className="mt-6 text-center text-sm">
                  <Link href="/login" className="text-primary hover:underline font-semibold">
                    Back to sign in
                  </Link>
                </div>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  )
}
