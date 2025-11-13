"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"

// Mock data for charts
const swimData = [
  { date: "Jan 23", duration: 52, pace: 1.45 },
  { date: "Mar 23", duration: 50, pace: 1.42 },
  { date: "May 23", duration: 49, pace: 1.38 },
  { date: "Jul 23", duration: 48, pace: 1.35 },
  { date: "Oct 23", duration: 48, pace: 1.33 },
]

const bikeData = [
  { date: "Jan 23", duration: 265, speed: 40.5 },
  { date: "Mar 23", duration: 258, speed: 41.8 },
  { date: "May 23", duration: 255, speed: 42.3 },
  { date: "Jul 23", duration: 252, speed: 42.8 },
  { date: "Oct 23", duration: 252, speed: 42.9 },
]

const runData = [
  { date: "Jan 23", duration: 182, pace: 4.32 },
  { date: "Mar 23", duration: 175, pace: 4.15 },
  { date: "May 23", duration: 168, pace: 3.58 },
  { date: "Jul 23", duration: 162, pace: 3.52 },
  { date: "Oct 23", duration: 158, pace: 3.45 },
]

export function AthleteAnalysis() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Performance Analysis</CardTitle>
            <Badge variant="outline">Metric</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Swim Analysis */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-chart-3" />
              Swim Performance
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={swimData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="duration"
                  stroke="hsl(var(--chart-3))"
                  strokeWidth={2}
                  name="Duration (min)"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Bike Analysis */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-chart-2" />
              Bike Performance
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={bikeData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="speed"
                  stroke="hsl(var(--chart-2))"
                  strokeWidth={2}
                  name="Avg Speed (km/h)"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Run Analysis */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-chart-1" />
              Run Performance
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={runData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="duration"
                  stroke="hsl(var(--chart-1))"
                  strokeWidth={2}
                  name="Duration (min)"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
