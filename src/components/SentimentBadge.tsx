import React from "react";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

interface SentimentBadgeProps {
  sentiment?: string | null;
  urgencyScore?: number | null;
  onEdit?: () => void;
}

export function SentimentBadge({ sentiment, urgencyScore, onEdit }: SentimentBadgeProps) {
  const { t } = useTranslation();
  
  if (!sentiment) return null;

  const getSentimentConfig = () => {
    switch (sentiment) {
      case "positive":
        return {
          label: t("ai.sentimentPositive"),
          className: "bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50"
        };
      case "negative":
        return {
          label: t("ai.sentimentNegative"),
          className: "bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50"
        };
      default:
        return {
          label: t("ai.sentimentNeutral"),
          className: "bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-gray-900/30 dark:text-gray-400 dark:hover:bg-gray-900/50"
        };
    }
  };

  const config = getSentimentConfig();

  return (
    <Badge 
      variant="secondary"
      onClick={onEdit}
      className={cn(
        "font-medium text-xs px-2 py-1 rounded shrink-0",
        config.className,
        onEdit && "cursor-pointer hover:opacity-80 transition-opacity"
      )}
    >
      {config.label}
      {urgencyScore && (
        <span className="ml-1">• {t("ai.urgency")}: {urgencyScore}/10</span>
      )}
    </Badge>
  );
}
