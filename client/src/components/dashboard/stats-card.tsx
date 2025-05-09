import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ArrowUpRight } from "lucide-react";

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
