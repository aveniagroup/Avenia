import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Plus, Award, ExternalLink, CalendarIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { getDateFnsLocale } from "@/i18n/config";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

interface Certification {
  id: string;
  certification_type: string;
  status: string;
  valid_from: string;
  valid_until: string;
  certificate_url: string;
  notes: string;
}

export function ComplianceCertifications() {
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation();

  const [formData, setFormData] = useState({
    certification_type: "SOC2_TYPE2",
    status: "not_started",
    valid_from: undefined as Date | undefined,
    valid_until: undefined as Date | undefined,
    certificate_url: "",
    notes: ""
  });

  useEffect(() => {
    fetchCertifications();
  }, []);

  const fetchCertifications = async () => {
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .single();

      if (!profile?.organization_id) return;

      const { data, error } = await supabase
        .from("compliance_certifications")
        .select("*")
        .eq("organization_id", profile.organization_id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCertifications(data || []);
    } catch (error) {
      console.error("Error fetching certifications:", error);
      toast({
        title: t("common.error"),
        description: t("compliance.cert.fetchFailed"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createCertification = async () => {
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .single();

      if (!profile?.organization_id) return;

      const { error } = await supabase
        .from("compliance_certifications")
        .insert({
          organization_id: profile.organization_id,
          certification_type: formData.certification_type,
          status: formData.status,
          valid_from: formData.valid_from ? format(formData.valid_from, "yyyy-MM-dd") : null,
          valid_until: formData.valid_until ? format(formData.valid_until, "yyyy-MM-dd") : null,
          certificate_url: formData.certificate_url,
          notes: formData.notes
        });

      if (error) throw error;

      toast({
        title: t("common.success"),
        description: t("compliance.cert.certificationAdded"),
      });

      setIsDialogOpen(false);
      setFormData({
        certification_type: "SOC2_TYPE2",
        status: "not_started",
        valid_from: undefined,
        valid_until: undefined,
        certificate_url: "",
        notes: ""
      });
      fetchCertifications();
    } catch (error: any) {
      console.error("Error creating certification:", error);
      toast({
        title: t("common.error"),
        description: error.message || t("compliance.cert.addFailed"),
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      not_started: "outline",
      in_progress: "secondary",
      active: "default",
      expired: "destructive"
    };
    return <Badge variant={variants[status] || "outline"}>{status.replace('_', ' ')}</Badge>;
  };

  const certificationTypes = [
    { value: "SOC2_TYPE2", label: "SOC 2 Type II" },
    { value: "ISO_27001", label: "ISO 27001" },
    { value: "GDPR", label: "GDPR Compliance" },
    { value: "HIPAA", label: "HIPAA" },
    { value: "PCI_DSS", label: "PCI DSS" },
    { value: "CCPA", label: "CCPA Compliance" }
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>{t("compliance.certifications")}</CardTitle>
            <CardDescription>
              {t("compliance.cert.description")}
            </CardDescription>
          </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  {t("compliance.cert.addCertification")}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t("compliance.cert.addCertification")}</DialogTitle>
                  <DialogDescription>
                    {t("compliance.cert.addDescription")}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>{t("compliance.cert.certificationType")}</Label>
                    <Select
                      value={formData.certification_type}
                      onValueChange={(value) => setFormData({ ...formData, certification_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {certificationTypes.map(type => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>{t("compliance.dsr.status")}</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) => setFormData({ ...formData, status: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="not_started">{t("compliance.cert.notStarted")}</SelectItem>
                        <SelectItem value="in_progress">{t("compliance.cert.inProgress")}</SelectItem>
                        <SelectItem value="active">{t("compliance.retention.active")}</SelectItem>
                        <SelectItem value="expired">{t("compliance.cert.expired")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>{t("compliance.cert.validFrom")}</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !formData.valid_from && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.valid_from ? (
                            format(formData.valid_from, "PPP", { locale: getDateFnsLocale() })
                          ) : (
                            <span>{t("datePicker.placeholder")}</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={formData.valid_from}
                          onSelect={(date) => setFormData({ ...formData, valid_from: date })}
                          initialFocus
                          locale={getDateFnsLocale()}
                          className="pointer-events-auto"
                        />
                        <div className="flex gap-2 p-3 border-t">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => setFormData({ ...formData, valid_from: undefined })}
                          >
                            {t("datePicker.clear")}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => setFormData({ ...formData, valid_from: new Date() })}
                          >
                            {t("datePicker.today")}
                          </Button>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <Label>{t("compliance.cert.validUntil")}</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !formData.valid_until && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.valid_until ? (
                            format(formData.valid_until, "PPP", { locale: getDateFnsLocale() })
                          ) : (
                            <span>{t("datePicker.placeholder")}</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={formData.valid_until}
                          onSelect={(date) => setFormData({ ...formData, valid_until: date })}
                          initialFocus
                          locale={getDateFnsLocale()}
                          className="pointer-events-auto"
                        />
                        <div className="flex gap-2 p-3 border-t">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => setFormData({ ...formData, valid_until: undefined })}
                          >
                            {t("datePicker.clear")}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => setFormData({ ...formData, valid_until: new Date() })}
                          >
                            {t("datePicker.today")}
                          </Button>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <Label>{t("compliance.cert.certificateUrl")}</Label>
                    <Input
                      value={formData.certificate_url}
                      onChange={(e) => setFormData({ ...formData, certificate_url: e.target.value })}
                      placeholder="https://..."
                    />
                  </div>
                  <div>
                    <Label>{t("compliance.cert.notes")}</Label>
                    <Textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder={t("compliance.cert.notesPlaceholder")}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={createCertification}>{t("compliance.cert.addCertification")}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div>{t("common.loading")}</div>
          ) : certifications.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t("compliance.cert.noCertifications")}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {certifications.map((cert) => (
                <Card key={cert.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <Award className="h-5 w-5 text-primary" />
                        <CardTitle className="text-lg">
                          {certificationTypes.find(t => t.value === cert.certification_type)?.label || cert.certification_type}
                        </CardTitle>
                      </div>
                      {getStatusBadge(cert.status)}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {cert.valid_from && (
                      <div className="text-sm">
                        <span className="font-medium">{t("compliance.cert.validFrom")}:</span>{" "}
                        {format(new Date(cert.valid_from), "MMM d, yyyy", { locale: getDateFnsLocale() })}
                      </div>
                    )}
                    {cert.valid_until && (
                      <div className="text-sm">
                        <span className="font-medium">{t("compliance.cert.validUntil")}:</span>{" "}
                        {format(new Date(cert.valid_until), "MMM d, yyyy", { locale: getDateFnsLocale() })}
                      </div>
                    )}
                    {cert.notes && (
                      <div className="text-sm text-muted-foreground">
                        {cert.notes}
                      </div>
                    )}
                    {cert.certificate_url && (
                      <Button variant="link" className="p-0 h-auto" asChild>
                        <a href={cert.certificate_url} target="_blank" rel="noopener noreferrer">
                          {t("compliance.cert.viewCertificate")} <ExternalLink className="h-3 w-3 ml-1" />
                        </a>
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
  );
}
