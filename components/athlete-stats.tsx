import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Trophy, TrendingUp, Target, Calendar, Award, Flag } from "lucide-react"
import { formatDistance } from "@/lib/utils"

export function AthleteStats() {
  const stats = [
    {
      icon: Trophy,
      label: "Podium Finishes",
      value: "24",
      description: "Top 3 placements",
      color: "text-chart-1",
    },
    {
      icon: Award,
      label: "Total Races",
      value: "87",
      description: "3.2% DNF rate",
      color: "text-chart-2",
    },
    {
      icon: TrendingUp,
      label: "Max Elo Score",
      value: "2,891",
      description: "Achieved Oct 2023",
      color: "text-chart-3",
    },
    {
      icon: Calendar,
      label: "Races per Year",
      value: "12.4",
      description: "Average since 2018",
      color: "text-chart-4",
    },
    {
      icon: Target,
      label: "Favorite Distance",
      value: "Full",
      description: "45% of all races",
      color: "text-chart-5",
    },
    {
      icon: Flag,
      label: "Win Rate",
      value: "34%",
      description: "1st place finishes",
      color: "text-primary",
    },
  ]

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Career Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {stats.map((stat, index) => (
              <div key={index} className="p-4 rounded-lg border border-border bg-card">
                <div className="flex items-start gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-muted ${stat.color}`}>
                    <stat.icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="text-2xl font-bold mt-1">{stat.value}</p>
                    <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Average Finish Times by Distance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { distance: "Sprint Distance", time: "00:54:23", stdDev: "±2:15" },
            { distance: "Olympic Distance", time: "01:48:12", stdDev: "±3:42" },
            { distance: "Half Distance (70.3)", time: "03:45:34", stdDev: "±5:18" },
            { distance: "Full Distance (140.6)", time: "07:52:18", stdDev: "±8:24" },
          ].map((item, index) => (
            <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted">
              <div>
                <p className="font-medium">{formatDistance(item.distance)}</p>
                <p className="text-xs text-muted-foreground mt-1">{item.stdDev}</p>
              </div>
              <p className="text-xl font-bold font-mono">{item.time}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rivalries</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">Top Nemesis</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 rounded-lg bg-destructive/10">
                <span className="font-medium">Patrick Lange</span>
                <Badge variant="destructive">8-12 Record</Badge>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">Top Victims</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 rounded-lg bg-chart-4/10">
                <span className="font-medium">Magnus Ditlev</span>
                <Badge className="bg-chart-4">15-8 Record</Badge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-chart-4/10">
                <span className="font-medium">Kristian Blummenfelt</span>
                <Badge className="bg-chart-4">12-6 Record</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
