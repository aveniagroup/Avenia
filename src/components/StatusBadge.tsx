import React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

interface StatusBadgeProps {
  status: "open" | "in_progress" | "resolved" | "closed";
  className?: string;
  onEdit?: () => void;
}

const statusConfig = {
  open: {
    translationKey: "tickets.open",
    className: "bg-info/10 text-info border-info/20 hover:bg-info/20",
  },
  in_progress: {
    translationKey: "tickets.inProgress",
    className: "bg-warning/10 text-warning border-warning/20 hover:bg-warning/20",
  },
  resolved: {
    translationKey: "tickets.resolved",
    className: "bg-success/10 text-success border-success/20 hover:bg-success/20",
  },
  closed: {
    translationKey: "tickets.closed",
    className: "bg-muted text-muted-foreground border-border hover:bg-muted",
  },
};

export function StatusBadge({ status, className, onEdit }: StatusBadgeProps) {
  const config = statusConfig[status];
  const { t } = useTranslation();
  
  return (
    <Badge 
      variant="outline" 
      onClick={onEdit}
      className={cn(
        "font-medium text-xs px-2 py-1 rounded shrink-0",
        config.className,
        onEdit && "cursor-pointer hover:opacity-80 transition-opacity",
        className
      )}
    >
      {t(config.translationKey)}
    </Badge>
  );
}
