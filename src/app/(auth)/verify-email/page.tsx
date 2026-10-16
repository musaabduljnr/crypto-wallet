import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MailCheck, ArrowRight, RefreshCw } from "lucide-react";

export default function VerifyEmailPage() {
  return (
    <Card className="border-border shadow-md text-center">
      <CardHeader className="space-y-2">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20">
          <MailCheck className="h-7 w-7" />
        </div>
        <CardTitle className="text-2xl font-bold">Check Your Email</CardTitle>
        <CardDescription className="text-sm max-w-sm mx-auto">
          We have sent an authentication verification link to your email address. Please click the link to confirm your account and activate your wallet.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="p-3.5 rounded-xl bg-muted/60 border border-border text-xs text-muted-foreground leading-relaxed">
          Didn't receive the email? Check your spam or junk folder, or click below to return to sign in once confirmed.
        </div>

        <Link href="/auth/login" className="block w-full">
          <Button variant="primary" size="lg" className="w-full" rightIcon={<ArrowRight className="w-4 h-4" />}>
            Proceed to Sign In
          </Button>
        </Link>
      </CardContent>

      <CardFooter className="flex justify-center border-t border-border pt-4 text-xs text-muted-foreground">
        <span>Need assistance? </span>
        <a href="mailto:support@apexwallet.ng" className="ml-1 text-primary font-medium hover:underline">
          Contact Support
        </a>
      </CardFooter>
    </Card>
  );
}
