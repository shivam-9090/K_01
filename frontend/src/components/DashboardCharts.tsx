import React from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useDashboardChart } from "../hooks/useDashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";

export const DashboardCharts: React.FC = () => {
  const { data: chartData, isLoading } = useDashboardChart();

  return (
    <Card className="col-span-1 lg:col-span-2">
      <CardHeader>
        <CardTitle>Task Completion Overview</CardTitle>
      </CardHeader>
      <CardContent className="pl-2">
        <div className="h-[300px] w-full">
          {isLoading ? (
            <div className="h-full flex items-center justify-center">
              <Spinner />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData || []}
                margin={{
                  top: 10,
                  right: 30,
                  left: 0,
                  bottom: 0,
                }}
              >
                <defs>
                  <linearGradient id="colorTasks" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor="var(--primary)"
                      stopOpacity={0.8}
                    />
                    <stop
                      offset="95%"
                      stopColor="var(--primary)"
                      stopOpacity={0}
                    />
                  </linearGradient>
                  <linearGradient
                    id="colorCompleted"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-muted"
                  horizontal={true}
                  vertical={false}
                />
                <XAxis
                  dataKey="name"
                  className="text-sm font-medium fill-muted-foreground"
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  className="text-sm font-medium fill-muted-foreground"
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${value}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    borderRadius: "var(--radius)",
                    border: "1px solid hsl(var(--border))",
                  }}
                  labelStyle={{
                    color: "hsl(var(--foreground))",
                    fontWeight: "bold",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="tasks"
                  stroke="var(--primary)"
                  fillOpacity={1}
                  fill="url(#colorTasks)"
                  name="Total Tasks"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="completed"
                  stroke="#10b981"
                  fillOpacity={1}
                  fill="url(#colorCompleted)"
                  name="Completed"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
