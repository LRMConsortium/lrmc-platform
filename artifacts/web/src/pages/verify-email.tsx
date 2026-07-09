import { Link, useSearch } from "wouter"
import { ShieldCheck, CheckCircle2, XCircle, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useVerifyEmail } from "@workspace/api-client-react"
import { useEffect, useMemo, useRef, useState } from "react"

export default function VerifyEmail() {
  const search = useSearch()
  const token = useMemo(() => new URLSearchParams(search).get("token") ?? "", [search])
  const verifyEmail = useVerifyEmail()
  const [status, setStatus] = useState<"loading" | "success" | "error">(token ? "loading" : "error")
  const attempted = useRef(false)

  useEffect(() => {
    if (!token || attempted.current) return
    attempted.current = true
    verifyEmail.mutate({ data: { token } }, {
      onSuccess: () => setStatus("success"),
      onError: () => setStatus("error"),
    })
  }, [token, verifyEmail])

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
          <CardContent className="text-center py-10 space-y-3">
            {status === "loading" && (
              <>
                <Loader2 className="h-10 w-10 text-primary mx-auto animate-spin" />
                <CardTitle className="text-xl font-serif">Confirming your email...</CardTitle>
              </>
            )}
            {status === "success" && (
              <>
                <CheckCircle2 className="h-10 w-10 text-primary mx-auto" />
                <CardTitle className="text-xl font-serif">Email confirmed</CardTitle>
                <CardDescription>Your account is now active. You can sign in.</CardDescription>
                <Button asChild className="mt-2">
                  <Link href="/login">Go to sign in</Link>
                </Button>
              </>
            )}
            {status === "error" && (
              <>
                <XCircle className="h-10 w-10 text-destructive mx-auto" />
                <CardTitle className="text-xl font-serif">Link expired or invalid</CardTitle>
                <CardDescription>
                  This confirmation link is no longer valid. You can request a new one from the sign in page.
                </CardDescription>
                <Link href="/login" className="text-primary hover:underline font-semibold block mt-2">
                  Back to sign in
                </Link>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
