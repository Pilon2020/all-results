import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Waves, Bike, Footprints, Clock } from "lucide-react"

interface RaceAnalysisOverviewProps {
  performance: {
    swim: {
      time: string
      pace: string
      rank: number
      percentile: number
    }
    t1: {
      time: string
      rank: number
    }
    bike: {
      time: string
      speed: string
      rank: number
      percentile: number
    }
    t2: {
      time: string
      rank: number
    }
    run: {
      time: string
      pace: string
      rank: number
      percentile: number
    }
  }
}

export function RaceAnalysisOverview({ performance }: RaceAnalysisOverviewProps) {
  const segments = [
    {
      icon: Waves,
      label: "Swim",
      time: performance.swim.time,
      detail: performance.swim.pace,
      rank: performance.swim.rank,
      percentile: performance.swim.percentile,
      color: "bg-chart-3/10 text-chart-3",
    },
    {
      icon: Clock,
      label: "T1",
      time: performance.t1.time,
      detail: "Transition",
      rank: performance.t1.rank,
      color: "bg-muted text-muted-foreground",
    },
    {
      icon: Bike,
      label: "Bike",
      time: performance.bike.time,
      detail: performance.bike.speed,
      rank: performance.bike.rank,
      percentile: performance.bike.percentile,
      color: "bg-chart-2/10 text-chart-2",
    },
    {
      icon: Clock,
      label: "T2",
      time: performance.t2.time,
      detail: "Transition",
      rank: performance.t2.rank,
      color: "bg-muted text-muted-foreground",
    },
    {
      icon: Footprints,
      label: "Run",
      time: performance.run.time,
      detail: performance.run.pace,
      rank: performance.run.rank,
      percentile: performance.run.percentile,
      color: "bg-chart-1/10 text-chart-1",
    },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Performance Overview</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {segments.map((segment, index) => (
            <div key={index} className="space-y-3">
              <div className={`p-6 rounded-lg ${segment.color}`}>
                <div className="flex items-center justify-between mb-3">
                  <segment.icon className="h-6 w-6" />
                  <Badge variant="outline" className="text-xs">
                    Rank {segment.rank}
                  </Badge>
                </div>
                <p className="text-sm font-medium mb-1">{segment.label}</p>
                <p className="text-2xl font-bold font-mono">{segment.time}</p>
                <p className="text-xs mt-2 opacity-80">{segment.detail}</p>
                {segment.percentile && (
                  <div className="mt-3 pt-3 border-t border-current/20">
                    <p className="text-xs">
                      Top <span className="font-bold">{100 - segment.percentile}%</span>
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
