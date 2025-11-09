import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataSubjectRequests } from "@/components/compliance/DataSubjectRequests";
import { RetentionPolicies } from "@/components/compliance/RetentionPolicies";
import { ComplianceCertifications } from "@/components/compliance/ComplianceCertifications";
import { DataProtectionSettings } from "@/components/compliance/DataProtectionSettings";
import { useTranslation } from "react-i18next";
import { useSidebar } from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight } from "lucide-react";

const Compliance = () => {
  const { t } = useTranslation();
  const { open, toggleSidebar } = useSidebar();
  const [activeTab, setActiveTab] = useState("dsr");

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
          <div className="flex-1" />
          <ThemeToggle />
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="mx-auto space-y-6 w-full" style={{ maxWidth: '1400px' }}>
          <div>
            <h2 className="text-3xl font-bold tracking-tight mb-2">{t("compliance.title")}</h2>
            <p className="text-muted-foreground">
              {t("compliance.subtitle")}
            </p>
          </div>

        {/* Overview Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{t("compliance.dataSubjectRequests")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">{t("compliance.pendingRequests")}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{t("compliance.retentionPolicies")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">{t("compliance.activePolicies")}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{t("compliance.certifications")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">{t("compliance.activeCertifications")}</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 w-full">
          <TabsList>
            <TabsTrigger value="dsr">{t("compliance.dataSubjectRequests")}</TabsTrigger>
            <TabsTrigger value="retention">{t("compliance.retentionPolicies")}</TabsTrigger>
            <TabsTrigger value="certifications">{t("compliance.certifications")}</TabsTrigger>
            <TabsTrigger value="protection">{t("compliance.dataProtection")}</TabsTrigger>
          </TabsList>

          <TabsContent value="dsr" className="w-full">
            <DataSubjectRequests />
          </TabsContent>

          <TabsContent value="retention" className="w-full">
            <RetentionPolicies />
          </TabsContent>

          <TabsContent value="certifications" className="w-full">
            <ComplianceCertifications />
          </TabsContent>

          <TabsContent value="protection" className="w-full">
            <DataProtectionSettings />
          </TabsContent>
        </Tabs>
        </div>
      </main>
    </div>
  );
};

export default Compliance;
