import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Save, Star, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface FilterPreset {
  id: string;
  name: string;
  filters: {
    status?: string;
    priority?: string;
    search?: string;
  };
  is_default: boolean;
}

interface FilterPresetsProps {
  currentFilters: {
    status: string;
    priority: string;
    search: string;
  };
  onApplyPreset: (filters: { status: string; priority: string; search: string }) => void;
}

export function FilterPresets({ currentFilters, onApplyPreset }: FilterPresetsProps) {
  const [presets, setPresets] = useState<FilterPreset[]>([]);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [presetName, setPresetName] = useState("");
  const { toast } = useToast();
  const { t } = useTranslation();

  useEffect(() => {
    loadPresets();
  }, []);

  const loadPresets = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("filter_presets")
      .select("*")
      .eq("user_id", user.id)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false });

    if (!error && data) {
      setPresets(data as FilterPreset[]);
    }
  };

  const handleSavePreset = async () => {
    if (!presetName.trim()) {
      toast({ title: "Please enter a preset name", variant: "destructive" });
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("filter_presets").insert({
      user_id: user.id,
      name: presetName,
      filters: currentFilters,
      is_default: false,
    });

    if (error) {
      toast({ title: "Failed to save preset", variant: "destructive" });
    } else {
      toast({ title: t("filterPresets.saveSuccess") });
      setSaveDialogOpen(false);
      setPresetName("");
      loadPresets();
    }
  };

  const handleSetDefault = async (presetId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from("filter_presets")
      .update({ is_default: false })
      .eq("user_id", user.id);

    const { error } = await supabase
      .from("filter_presets")
      .update({ is_default: true })
      .eq("id", presetId);

    if (!error) {
      toast({ title: "Default preset updated" });
      loadPresets();
    }
  };

  const handleDeletePreset = async (presetId: string) => {
    const { error } = await supabase
      .from("filter_presets")
      .delete()
      .eq("id", presetId);

    if (!error) {
      toast({ title: "Preset deleted" });
      loadPresets();
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <Star className="h-4 w-4 mr-2" />
            {t("filterPresets.title")}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {presets.map((preset) => (
            <div key={preset.id} className="flex items-center justify-between px-2 py-1 hover:bg-muted rounded">
              <button
                onClick={() => onApplyPreset(preset.filters as any)}
                className="flex-1 text-left text-sm"
              >
                {preset.name}
                {preset.is_default && <Star className="inline h-3 w-3 ml-1 fill-current" />}
              </button>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSetDefault(preset.id);
                  }}
                >
                  <Star className={`h-3 w-3 ${preset.is_default ? "fill-current" : ""}`} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeletePreset(preset.id);
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setSaveDialogOpen(true)}>
            <Save className="h-4 w-4 mr-2" />
            {t("filterPresets.saveCurrentFilters")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("filterPresets.saveCurrentFilters")}</DialogTitle>
            <DialogDescription>Give your filter preset a name</DialogDescription>
          </DialogHeader>
          <Input
            placeholder={t("filterPresets.presetName")}
            value={presetName}
            onChange={(e) => setPresetName(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleSavePreset}>{t("common.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}