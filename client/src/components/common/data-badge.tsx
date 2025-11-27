import { Badge } from "@/components/ui/badge";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface DataBadgeProps {
  isMock?: boolean;
  isSample?: boolean;
  className?: string;
}

export function DataBadge({ isMock, isSample, className }: DataBadgeProps) {
  if (!isMock && !isSample) {
    return null;
  }

  return (
    <Badge
      variant="outline"
      className={cn(
        "text-xs font-normal italic",
        "bg-amber-50 dark:bg-amber-950/20",
        "border-amber-300 dark:border-amber-800",
        "text-amber-700 dark:text-amber-400",
        className
      )}
      title={isMock ? "모의 데이터입니다" : "샘플 데이터입니다"}
    >
      <AlertCircle className="w-3 h-3 mr-1" />
      {isMock ? "모의 데이터" : "샘플 데이터"}
    </Badge>
  );
}

