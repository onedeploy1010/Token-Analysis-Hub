import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-[80vh] w-full flex items-center justify-center bg-background">
      <Card className="w-full max-w-md mx-4 bg-card border-border">
        <CardContent className="pt-10 pb-8 text-center flex flex-col items-center">
          <div className="bg-destructive/10 p-4 rounded-full mb-6">
            <AlertTriangle className="h-10 w-10 text-destructive" />
          </div>
          <h1 className="text-3xl font-bold font-mono tracking-tight text-foreground mb-2">404 - Not Found</h1>
          <p className="text-muted-foreground mb-8">
            The sector or module you are attempting to access does not exist in the current terminal index.
          </p>
          <Link href="/">
            <Button variant="outline" className="border-border">
              <ArrowLeft className="mr-2 h-4 w-4" /> Return to Dashboard
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
