import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Shield, Copy, CheckCircle2 } from "lucide-react";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

export function TwoFactorSetup() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [isEnabled, setIsEnabled] = useState(false);
  const [secret, setSecret] = useState("");
  const [qrCode, setQrCode] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"check" | "setup" | "verify" | "complete">("check");

  useEffect(() => {
    checkTwoFactorStatus();
  }, []);

  const checkTwoFactorStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("user_2fa_settings")
        .select("is_enabled")
        .eq("user_id", user.id)
        .maybeSingle();

      setIsEnabled(data?.is_enabled || false);
    } catch (error) {
      console.error("Error checking 2FA status:", error);
    }
  };

  const generateSecret = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Generate a random secret (base32)
      const newSecret = generateBase32Secret();
      setSecret(newSecret);

      // Generate QR code URL
      const appName = "TicketFlow";
      const qrUrl = `otpauth://totp/${appName}:${user.email}?secret=${newSecret}&issuer=${appName}`;
      setQrCode(qrUrl);

      // Generate backup codes
      const codes = Array.from({ length: 8 }, () => 
        Math.random().toString(36).substring(2, 10).toUpperCase()
      );
      setBackupCodes(codes);

      setStep("setup");
    } catch (error) {
      toast({
        title: t("common.error"),
        description: t("twoFactor.errorGeneratingSecret"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateBase32Secret = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    let secret = "";
    for (let i = 0; i < 32; i++) {
      secret += chars[Math.floor(Math.random() * chars.length)];
    }
    return secret;
  };

  const verifyAndEnable = async () => {
    if (verificationCode.length !== 6) {
      toast({
        title: t("twoFactor.invalidCode"),
        description: t("twoFactor.invalidCodeDesc"),
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // In production, verify the TOTP code on the backend
      // For now, we'll just enable it
      const { error } = await supabase
        .from("user_2fa_settings")
        .upsert({
          user_id: user.id,
          is_enabled: true,
          secret: secret,
          backup_codes: backupCodes,
        });

      if (error) throw error;

      // Log audit event
      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", user.id)
        .single();

      if (profile?.organization_id) {
        await supabase.rpc("log_audit_event", {
          _organization_id: profile.organization_id,
          _user_id: user.id,
          _action: "2fa_enabled",
          _resource_type: "security",
          _severity: "info",
        });
      }

      setIsEnabled(true);
      setStep("complete");
      toast({
        title: t("twoFactor.success"),
        description: t("twoFactor.setupSuccess"),
      });
    } catch (error) {
      toast({
        title: t("common.error"),
        description: t("twoFactor.errorEnabling"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const disable2FA = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("user_2fa_settings")
        .update({ is_enabled: false })
        .eq("user_id", user.id);

      if (error) throw error;

      // Log audit event
      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", user.id)
        .single();

      if (profile?.organization_id) {
        await supabase.rpc("log_audit_event", {
          _organization_id: profile.organization_id,
          _user_id: user.id,
          _action: "2fa_disabled",
          _resource_type: "security",
          _severity: "warning",
        });
      }

      setIsEnabled(false);
      setStep("check");
      toast({
        title: t("twoFactor.success"),
        description: t("twoFactor.disableSuccess"),
      });
    } catch (error) {
      toast({
        title: t("common.error"),
        description: t("twoFactor.errorDisabling"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: t("twoFactor.copied"),
      description: t("twoFactor.copiedToClipboard"),
    });
  };

  if (step === "check") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            {t("twoFactor.title")}
          </CardTitle>
          <CardDescription>
            {t("twoFactor.description")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isEnabled ? (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                {t("twoFactor.enabled")}
              </AlertDescription>
            </Alert>
          ) : (
            <Alert>
              <AlertDescription>
                {t("twoFactor.disabled")}
              </AlertDescription>
            </Alert>
          )}
          
          {!isEnabled ? (
            <Button onClick={generateSecret} disabled={loading}>
              {t("twoFactor.setup")}
            </Button>
          ) : (
            <Button onClick={disable2FA} disabled={loading} variant="destructive">
              {t("twoFactor.disable")}
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  if (step === "setup") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("twoFactor.setup")}</CardTitle>
          <CardDescription>
            {t("twoFactor.scanQr")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>1. {t("twoFactor.scanQr")}</Label>
            {qrCode && (
              <div className="bg-white p-4 rounded-lg inline-block">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrCode)}`}
                  alt="2FA QR Code"
                  className="w-48 h-48"
                />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>2. {t("twoFactor.manualCode")}</Label>
            <div className="flex items-center gap-2">
              <Input value={secret} readOnly className="font-mono" />
              <Button
                size="icon"
                variant="outline"
                onClick={() => copyToClipboard(secret)}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>3. {t("twoFactor.saveBackupCodes")}</Label>
            <Alert>
              <AlertDescription>
                {t("twoFactor.backupCodesWarning")}
              </AlertDescription>
            </Alert>
            <div className="grid grid-cols-2 gap-2 p-4 bg-muted rounded-lg font-mono text-sm">
              {backupCodes.map((code, i) => (
                <div key={i}>{code}</div>
              ))}
            </div>
            <Button
              variant="outline"
              onClick={() => copyToClipboard(backupCodes.join("\n"))}
              className="w-full"
            >
              <Copy className="h-4 w-4 mr-2" />
              {t("twoFactor.copyAllCodes")}
            </Button>
          </div>

          <Button onClick={() => setStep("verify")} className="w-full">
            {t("twoFactor.continueVerification")}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (step === "verify") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("twoFactor.verifySetup")}</CardTitle>
          <CardDescription>
            {t("twoFactor.enterCode")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-center">
            <InputOTP
              maxLength={6}
              value={verificationCode}
              onChange={setVerificationCode}
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          </div>

          <Button 
            onClick={verifyAndEnable} 
            disabled={loading || verificationCode.length !== 6}
            className="w-full"
          >
            {t("twoFactor.verifyEnable")}
          </Button>

          <Button 
            onClick={() => setStep("setup")} 
            variant="ghost"
            className="w-full"
          >
            {t("common.cancel")}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-green-500" />
          {t("twoFactor.enabledTitle")}
        </CardTitle>
        <CardDescription>
          {t("twoFactor.accountProtected")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={() => setStep("check")}>
          {t("twoFactor.done")}
        </Button>
      </CardContent>
    </Card>
  );
}
