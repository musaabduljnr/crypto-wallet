import Link from "next/link";
import { Container } from "@/components/ui/container";
import { Heading, Text } from "@/components/ui/typography";
import { Button } from "@/components/ui/button";
import { FileQuestion, ArrowLeft, Home } from "lucide-react";

export default function NotFound() {
  return (
    <main className="min-h-screen py-24 flex flex-col items-center justify-center bg-background text-foreground">
      <Container size="sm" className="text-center space-y-6">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-muted text-muted-foreground border border-border">
          <FileQuestion className="h-8 w-8 text-primary" />
        </div>

        <div className="space-y-2">
          <Heading as="h1" variant="hero">
            404 — Page Not Found
          </Heading>
          <Text variant="muted" className="max-w-md mx-auto">
            The page or financial resource you are looking for does not exist or may have been relocated.
          </Text>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
          <Link href="/">
            <Button variant="primary" leftIcon={<Home className="w-4 h-4" />}>
              Return Home
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="outline" leftIcon={<ArrowLeft className="w-4 h-4" />}>
              Go to Dashboard
            </Button>
          </Link>
        </div>
      </Container>
    </main>
  );
}
