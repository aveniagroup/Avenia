import { useSidebar, SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { TwoFactorSetup } from "@/components/TwoFactorSetup";
import { AuditLogViewer } from "@/components/AuditLogViewer";
import { IPWhitelistManager } from "@/components/IPWhitelistManager";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Lock, Eye, Globe, ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

function Security() {
  const { open, toggleSidebar } = useSidebar();
  
  return (
    <div className="flex-1 flex flex-col">
      <header className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="flex h-14 md:h-16 items-center gap-2 md:gap-4 px-4 md:px-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="h-7 w-7 -ml-2"
          >
            {open ? <ArrowLeft className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
            <span className="sr-only">Toggle Sidebar</span>
          </Button>
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6" />
            <h1 className="text-xl md:text-2xl font-bold">Security</h1>
          </div>
          <div className="flex-1" />
          <ThemeToggle />
        </div>
      </header>
        
        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold tracking-tight">Security Center</h2>
            <p className="text-muted-foreground">
              Manage advanced security features for your organization
            </p>
          </div>

          <div className="grid gap-6">
            {/* Security Overview */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Two-Factor Auth
                  </CardTitle>
                  <Lock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">Enhanced</div>
                  <p className="text-xs text-muted-foreground">
                    Extra layer of protection
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    IP Whitelisting
                  </CardTitle>
                  <Globe className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">Configured</div>
                  <p className="text-xs text-muted-foreground">
                    Restrict by location
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Audit Logging
                  </CardTitle>
                  <Eye className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">Active</div>
                  <p className="text-xs text-muted-foreground">
                    Track all actions
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Security Features */}
            <TwoFactorSetup />
            <IPWhitelistManager />
            <AuditLogViewer />
            
            {/* Data Encryption Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Data Encryption
                </CardTitle>
                <CardDescription>
                  Your data is protected with industry-standard encryption
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Lock className="h-4 w-4 text-green-500" />
                      Encryption at Rest
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      All data stored in the database is encrypted using AES-256 encryption.
                      This includes tickets, messages, user profiles, and all sensitive information.
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Lock className="h-4 w-4 text-green-500" />
                      Encryption in Transit
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      All communication between your browser and our servers uses TLS 1.3
                      encryption, ensuring your data is protected during transmission.
                    </p>
                  </div>
                </div>
                
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm">
                    <strong>Additional Security Measures:</strong>
                  </p>
                  <ul className="text-sm space-y-1 mt-2 list-disc list-inside text-muted-foreground">
                    <li>Row-Level Security (RLS) policies on all database tables</li>
                    <li>Automated PII detection and anonymization</li>
                    <li>Regular security audits and compliance checks</li>
                    <li>GDPR and data protection compliance built-in</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
  );
}

export default Security;
