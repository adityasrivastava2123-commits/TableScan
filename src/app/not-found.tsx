import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QrCode } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <Card className="max-w-md w-full text-center">
        <CardHeader className="space-y-4">
          <div className="mx-auto w-20 h-20 bg-black rounded-2xl flex items-center justify-center">
            <QrCode className="w-10 h-10 text-white" />
          </div>
          <div>
            <CardTitle className="text-3xl mb-2">Page not found</CardTitle>
            <p className="text-muted-foreground">
              The page you're looking for doesn't exist or has been moved.
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full">
            <Link href="/">
              Go to Dashboard
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
