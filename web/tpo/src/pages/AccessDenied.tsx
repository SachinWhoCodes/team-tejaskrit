import { ShieldX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export default function AccessDenied() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center max-w-md px-6 animate-fade-in">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mb-6">
          <ShieldX className="w-8 h-8 text-destructive" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Access Denied</h1>
        <p className="text-muted-foreground mb-6">
          This section is restricted to Training & Placement Officers only.
          Please contact your institute's TPO if you believe this is an error.
        </p>
        <Button asChild>
          <Link to="/login">Return to Dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
