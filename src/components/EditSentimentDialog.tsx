import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useTranslation } from "react-i18next";

interface EditSentimentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentSentiment?: string | null;
  currentUrgency?: number | null;
  onSave: (sentiment: string, urgency: number) => Promise<void>;
}

export function EditSentimentDialog({
  open,
  onOpenChange,
  currentSentiment,
  currentUrgency,
  onSave,
}: EditSentimentDialogProps) {
  const { t } = useTranslation();
  const [sentiment, setSentiment] = useState(currentSentiment || "neutral");
  const [urgency, setUrgency] = useState(currentUrgency || 5);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(sentiment, urgency);
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to update sentiment:", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Sentiment & Urgency</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="sentiment">Sentiment</Label>
            <Select value={sentiment} onValueChange={setSentiment}>
              <SelectTrigger id="sentiment">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="positive">{t("ai.sentimentPositive")}</SelectItem>
                <SelectItem value="neutral">{t("ai.sentimentNeutral")}</SelectItem>
                <SelectItem value="negative">{t("ai.sentimentNegative")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="urgency">Urgency Score</Label>
              <span className="text-sm font-medium">{urgency}/10</span>
            </div>
            <Slider
              id="urgency"
              min={1}
              max={10}
              step={1}
              value={[urgency]}
              onValueChange={(values) => setUrgency(values[0])}
              className="w-full"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
