import React from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";

interface KeyboardShortcut {
  keys: string[];
  translationKey: string;
}

interface KeyboardShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function KeyboardShortcutsDialog({ open, onOpenChange }: KeyboardShortcutsDialogProps) {
  const { t } = useTranslation();

  const shortcuts: KeyboardShortcut[] = [
    { keys: ["Ctrl", "N"], translationKey: "keyboardShortcuts.createNewTicket" },
    { keys: ["Ctrl", "K"], translationKey: "keyboardShortcuts.toggleShortcuts" },
    { keys: ["/"], translationKey: "keyboardShortcuts.focusSearch" },
    { keys: ["Escape"], translationKey: "keyboardShortcuts.closeDialogs" },
    { keys: ["Ctrl", "A"], translationKey: "keyboardShortcuts.selectAll" },
    { keys: ["↑", "↓"], translationKey: "keyboardShortcuts.navigateTickets" },
    { keys: ["Enter"], translationKey: "keyboardShortcuts.openTicket" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t("keyboardShortcuts.title")}</DialogTitle>
          <DialogDescription>
            {t("keyboardShortcuts.description")}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-4">
          {shortcuts.map((shortcut, index) => (
            <div key={index} className="flex items-center justify-between py-2 border-b last:border-0">
              <span className="text-sm text-muted-foreground">{t(shortcut.translationKey)}</span>
              <div className="flex gap-1">
                {shortcut.keys.map((key, keyIndex) => (
                  <React.Fragment key={keyIndex}>
                    {keyIndex > 0 && <span className="text-muted-foreground mx-1">+</span>}
                    <Badge variant="outline" className="font-mono">
                      {key}
                    </Badge>
                  </React.Fragment>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}