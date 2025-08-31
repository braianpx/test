import { Card, CardContent } from "@/components/ui/card";
import { ArrowUpIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  iconBgColor: string;
  iconColor: string;
  trend?: {
    value: string;
    isPositive?: boolean;
    label: string;
  };
}

/**
 * Tarjeta de estadísticas que muestra:
 * - Título
 * - Valor
 * - Ícono
 * - Tendencia (opcional)
 */
export function StatsCard({
  title,
  value,
  icon,
  iconBgColor,
  iconColor,
  trend,
}: StatsCardProps) {
  return (
    <Card className="border border-gray-200">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
          </div>
          <div
            className={cn("p-2 rounded-full flex items-center justify-center", iconBgColor)}
          >
            <div className={cn(iconColor)}>{icon}</div>
          </div>
        </div>
        {trend && (
          <div className="mt-2">
            <span
              className={cn(
                "text-sm font-medium flex items-center",
                trend.isPositive ? "text-green-600" : "text-gray-600"
              )}
            >
              {trend.isPositive && <ArrowUpIcon className="h-4 w-4 mr-1" />}
              {trend.value} {trend.label}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
