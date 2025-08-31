import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  LabelList,
} from "recharts";
import { format, subDays } from "date-fns";
import { es } from "date-fns/locale";
import { useWebSocket } from "@/hooks/use-websocket";

interface ChartDataPoint {
  label: string;
  subLabel?: string;
  count: number;
  percentage: number;
}

// Convierte una fecha UTC a hora de Argentina
function toArgentinaDate(dateStr: string) {
  const date = new Date(dateStr);
  // sumar 3 horas para Argentina GMT-3
  return new Date(date.getTime() + 3 * 60 * 60 * 1000);
}

export function SurveyProgressChart() {
  const [period, setPeriod] = useState("7days");
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [dateRange, setDateRange] = useState<string>("");
  const rawResponses = useRef<any[]>([]);

  const { responsesSurvey } = useWebSocket();
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);

  const updateChartData = (period: string) => {
    const today = toArgentinaDate(new Date().toISOString());
    let data: ChartDataPoint[] = [];

    if (period === "month") {
      const startMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      let currentStart = startMonth;
      let weekIndex = 1;

      while (currentStart <= endMonth) {
        const weekEnd = new Date(currentStart);
        weekEnd.setDate(currentStart.getDate() + 6);
        if (weekEnd > endMonth) weekEnd.setTime(endMonth.getTime());

        data.push({
          label: `${format(currentStart, "dd/MM")} - ${format(weekEnd, "dd/MM")}`,
          subLabel: `Semana ${weekIndex}`,
          count: 0,
          percentage: 0,
        });

        currentStart = new Date(weekEnd);
        currentStart.setDate(currentStart.getDate() + 1);
        weekIndex++;
      }

      setDateRange(
        `Del ${format(startMonth, "dd/MM/yyyy")} al ${format(endMonth, "dd/MM/yyyy")}`
      );
    } else {
      const days = period === "7days" ? 7 : 30;
      data = Array.from({ length: days }).map((_, i) => {
        const date = new Date(today);
        date.setDate(today.getDate() - (days - i - 1));
        return {
          label: format(date, "dd/MM", { locale: es }),
          subLabel:
            days === 7
              ? format(date, "EEEE", { locale: es })
              : format(date, "EEE", { locale: es }),
          count: 0,
          percentage: 0,
        };
      });

      setDateRange(
        `Del ${format(subDays(today, data.length - 1), "dd/MM/yyyy")} al ${format(today, "dd/MM/yyyy")}`
      );
    }

    // Contar respuestas usando hora local de Argentina
    rawResponses.current.forEach((response) => {
      const createdAtArg = toArgentinaDate(response.createdAt);

      if (period === "month") {
        const weekItem = data.find((item) => {
          const [startStr, endStr] = item.label.split(" - ");
          const startParts = startStr.split("/").map(Number);
          const endParts = endStr.split("/").map(Number);

          const start = new Date(today.getFullYear(), startParts[1] - 1, startParts[0]);
          const end = new Date(today.getFullYear(), endParts[1] - 1, endParts[0]);

          const createdStr = format(createdAtArg, "yyyy-MM-dd");
          const startStrFmt = format(start, "yyyy-MM-dd");
          const endStrFmt = format(end, "yyyy-MM-dd");

          return createdStr >= startStrFmt && createdStr <= endStrFmt;
        });

        if (weekItem) {
          weekItem.count += 1;
          weekItem.percentage = Math.min(weekItem.percentage + 1, 100);
        }
      } else {
        const labelArg = format(createdAtArg, "dd/MM", { locale: es });
        const dayItem = data.find((item) => item.label === labelArg);
        if (dayItem) {
          dayItem.count += 1;
          dayItem.percentage = Math.min(dayItem.percentage + 1, 100);
        }
      }
    });

    setChartData(data);
  };

  useEffect(() => {
    if (!responsesSurvey || responsesSurvey.length === 0) return;

    const flattened: any[] = [];
    responsesSurvey.forEach((arr) => {
      if (Array.isArray(arr)) flattened.push(...arr);
    });

    const unique = new Map();
    flattened.forEach((r) => unique.set(r.id, r));
    rawResponses.current = Array.from(unique.values());

    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    debounceTimeout.current = setTimeout(() => {
      updateChartData(period);
    }, 200);
  }, [responsesSurvey]);

  useEffect(() => {
    updateChartData(period);
  }, [period]);

  const CustomTick = ({ x, y, payload }: any) => {
    const item = chartData[payload.index];
    return (
      <g transform={`translate(${x},${y})`}>
        <text dy={8} textAnchor="middle" fill="#111827" fontSize={11}>
          {item.label}
        </text>
      </g>
    );
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0]?.payload;
      return (
        <div className="bg-white border border-gray-300 rounded p-2 shadow-md text-sm">
          {item.subLabel && <p className="font-semibold text-gray-700">{item.subLabel}</p>}
          <p className="text-gray-600">{item.label}</p>
          <p className="text-blue-600 font-medium">{item.count} respuestas</p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="border border-gray-200 col-span-2">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4">
        <div>
          <CardTitle className="text-lg font-semibold text-gray-900">
            Progreso de Encuestas
          </CardTitle>
          <p className="text-sm text-gray-500">{dateRange}</p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Seleccionar período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7days">Últimos 7 días</SelectItem>
            <SelectItem value="30days">Últimos 30 días</SelectItem>
            <SelectItem value="month">Este mes</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="px-4">
        {period === "7days" && (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={<CustomTick />} />
              <YAxis />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                <LabelList dataKey="count" position="center" fill="#fff" fontSize={12} fontWeight="bold"/>
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}

        {period === "30days" && (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={<CustomTick />} />
              <YAxis />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#3b82f6"
                strokeWidth={2}
                label={{ position: 'top', fill: '#3b82f6', fontSize: 12, fontWeight: 'bold' }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}

        {period === "month" && (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={<CustomTick />} />
              <YAxis />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                <LabelList dataKey="count" position="center" fill="#fff" fontSize={12} fontWeight="bold"/>
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
