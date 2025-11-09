import React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

interface PriorityBadgeProps {
  priority: "low" | "medium" | "high" | "urgent";
  className?: string;
  onEdit?: () => void;
}

const priorityConfig = {
  low: {
    translationKey: "tickets.low",
    className: "bg-success/10 text-success border-success/20 hover:bg-success/20",
  },
  medium: {
    translationKey: "tickets.medium",
    className: "bg-warning/10 text-warning border-warning/20 hover:bg-warning/20",
  },
  high: {
    translationKey: "tickets.high",
    className: "bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20",
  },
  urgent: {
    translationKey: "tickets.urgent",
    className: "bg-destructive/20 text-destructive border-destructive/30 hover:bg-destructive/30 font-semibold",
  },
};

export function PriorityBadge({ priority, className, onEdit }: PriorityBadgeProps) {
  const config = priorityConfig[priority];
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
