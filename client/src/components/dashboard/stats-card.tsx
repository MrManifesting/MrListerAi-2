import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ArrowUpRight } from "lucide-react";

import { Card } from "@/components/ui/card";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  icon: React.ReactNode;
  iconColor: string;
  iconBgColor: string;
  title: string;
  value: string | number;
  change?: {
    value: string | number;
    positive?: boolean;
  };
  tooltip?: string;
  variant?: "default" | "outline" | "glass";
}

export function StatsCard({
  icon,
  iconColor,
  iconBgColor,
  title,
  value,
  change,
  tooltip,
  variant = "default"
}: StatsCardProps) {
  return (
    <Card 
      className={cn("overflow-hidden", 
        variant === "glass" ? "glass-card" : "",
        "hover:shadow-md transition-all duration-300"
      )}
      variant={variant === "outline" ? "outline" : "default"}
    >
      <div className="p-6 flex justify-between items-start">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <div className="flex items-baseline space-x-2">
            <h3 className="text-2xl font-bold tracking-tight">{value}</h3>
            {change && (
              <div 
                className={cn(
                  "flex items-center text-xs font-medium",
                  change.positive 
                    ? "text-chart-2" 
                    : "text-destructive"
                )}
              >
                {change.positive ? (
                  <ArrowUpRight className="mr-1 h-3 w-3" />
                ) : (
                  <ArrowDownRight className="mr-1 h-3 w-3" />
                )}
                {change.value}
              </div>
            )}
          </div>
        </div>
        <div 
          className={cn(
            "flex items-center justify-center rounded-full p-2",
            iconBgColor
          )}
        >
          <div className={cn("h-5 w-5", iconColor)}>
            {icon}
          </div>
        </div>
      </div>
      {tooltip && (
        <div className="px-6 pb-4 -mt-2">
          <p className="text-xs text-muted-foreground">{tooltip}</p>
        </div>
      )}
    </Card>
  );
}

export function StatsCard({
  icon,
  iconColor,
  iconBgColor,
  title,
  value,
  change,
}: StatsCardProps) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-center">
          <div className={cn("flex-shrink-0 rounded-md p-3", iconBgColor)}>
            <span className={cn("text-xl", iconColor)}>{icon}</span>
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">
                {title}
              </dt>
              <dd className="flex items-baseline">
                <div className="text-2xl font-semibold text-gray-900">
                  {value}
                </div>
                {change && (
                  <div
                    className={cn(
                      "ml-2 flex items-baseline text-sm font-semibold",
                      change.positive
                        ? "text-green-600"
                        : "text-red-600"
                    )}
                  >
                    <ArrowUpRight
                      size={16}
                      className={cn(
                        change.positive ? "" : "transform rotate-90"
                      )}
                    />
                    <span className="sr-only">
                      {change.positive ? "Increased by" : "Decreased by"}
                    </span>
                    {change.value}
                  </div>
                )}
              </dd>
            </dl>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
