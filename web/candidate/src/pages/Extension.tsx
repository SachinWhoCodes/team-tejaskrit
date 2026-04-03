import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Download, Chrome, LogIn, Globe, PenLine, FileText, CheckCircle2, ArrowRight, Puzzle, RefreshCw, Wifi, WifiOff } from "lucide-react";
import { motion } from "framer-motion";

const steps = [
  { icon: Chrome, title: "Install Extension", desc: "Add from Chrome Web Store" },
  { icon: LogIn, title: "Login", desc: "Connect with your Tejaskrit account" },
  { icon: Globe, title: "Open Career Page", desc: "Navigate to any company's job page" },
  { icon: PenLine, title: "Autofill", desc: "Click to autofill the application form" },
  { icon: FileText, title: "Generate Resume", desc: "Create a tailored resume for this role" },
  { icon: CheckCircle2, title: "Mark Applied", desc: "Confirm submission to update tracker" },
  { icon: ArrowRight, title: "Tracker Updated", desc: "Application appears in your tracker" },
];

export default function Extension() {
  const [consentOpen, setConsentOpen] = useState(false);
  const connected = true;

  return (
    <AppLayout>
      <div className="page-container">
        <h1 className="text-2xl font-bold mb-1">Apply Anywhere</h1>
        <p className="text-sm text-muted-foreground mb-6">Use the Chrome extension to apply on any career page</p>

        {/* Steps */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {steps.map((step, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
              <Card className="card-elevated p-5 text-center h-full flex flex-col items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-accent flex items-center justify-center">
                  <step.icon className="h-5 w-5 text-accent-foreground" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Step {i + 1}</p>
                  <p className="text-sm font-medium">{step.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{step.desc}</p>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Extension Status */}
          <Card className="card-elevated p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2"><Puzzle className="h-4 w-4" /> Extension Status</h3>
            <div className="flex items-center gap-3 mb-4">
              <div className={`h-3 w-3 rounded-full ${connected ? "bg-success" : "bg-destructive"}`} />
              <span className="text-sm font-medium">{connected ? "Connected" : "Disconnected"}</span>
            </div>
            <p className="text-xs text-muted-foreground mb-1">Last synced: 5 minutes ago</p>
            <p className="text-xs text-muted-foreground mb-4">Extension version: 1.2.3</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="gap-1 text-xs"><RefreshCw className="h-3 w-3" /> Reconnect</Button>
              <Button variant="outline" size="sm" className="gap-1 text-xs"><Download className="h-3 w-3" /> Install Extension</Button>
            </div>
          </Card>

          {/* Mock Extension Popup */}
          <Card className="card-elevated p-6">
            <h3 className="font-semibold mb-4">Extension Preview</h3>
            <Card className="bg-muted/50 p-4 rounded-xl max-w-xs mx-auto space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-bold text-sm tracking-wide">Tejaskrit</span>
                <Badge variant="secondary" className="text-[10px]">Extension</Badge>
              </div>
              <div className="bg-card rounded-lg p-3 space-y-1">
                <p className="text-xs font-medium">Detected: Software Engineer</p>
                <p className="text-xs text-muted-foreground">google.com/careers</p>
              </div>
              <Button size="sm" className="w-full text-xs" onClick={() => setConsentOpen(true)}>Autofill Application</Button>
              <Button size="sm" variant="outline" className="w-full text-xs gap-1" onClick={() => setConsentOpen(true)}>
                <FileText className="h-3 w-3" /> Generate Tailored Resume
              </Button>
              <Button size="sm" variant="outline" className="w-full text-xs gap-1"><Download className="h-3 w-3" /> Download Resume</Button>
              <Button size="sm" variant="secondary" className="w-full text-xs gap-1">
                <CheckCircle2 className="h-3 w-3" /> I Submitted → Mark Applied
              </Button>
            </Card>
          </Card>
        </div>

        {/* Consent Modal */}
        <Dialog open={consentOpen} onOpenChange={setConsentOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Data Usage Consent</DialogTitle></DialogHeader>
            <p className="text-sm text-muted-foreground">We'll use your profile data to autofill the form or generate a tailored resume. Your data stays private.</p>
            <label className="flex items-center gap-2 mt-3 cursor-pointer">
              <Checkbox />
              <span className="text-xs text-muted-foreground">Don't show this again</span>
            </label>
            <div className="flex gap-2 mt-4">
              <Button size="sm" onClick={() => setConsentOpen(false)}>Continue</Button>
              <Button size="sm" variant="outline" onClick={() => setConsentOpen(false)}>Cancel</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
