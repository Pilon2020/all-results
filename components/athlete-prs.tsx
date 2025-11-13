import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Trophy } from "lucide-react"

interface PRRecord {
  time: string
  race: string
  date: string
}

interface AthletePRsProps {
  prs: {
    sprint?: PRRecord
    olympic?: PRRecord
    half?: PRRecord
    full?: PRRecord
  }
}

export function AthletePRs({ prs }: AthletePRsProps) {
  const distances = [
    { key: "sprint", label: "Sprint Distance", data: prs.sprint },
    { key: "olympic", label: "Olympic Distance", data: prs.olympic },
    { key: "half", label: "Half Distance (70.3)", data: prs.half },
    { key: "full", label: "Full Distance (140.6)", data: prs.full },
  ]

  return (
    <Card className="sticky top-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          Personal Records
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {distances.map(
          (distance) =>
            distance.data && (
              <div key={distance.key} className="space-y-2 pb-4 border-b border-border last:border-0 last:pb-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">{distance.label}</span>
                  <Badge variant="secondary" className="text-xs">
                    PR
                  </Badge>
                </div>
                <p className="text-2xl font-bold font-mono">{distance.data.time}</p>
                <div className="space-y-1">
                  <p className="text-sm font-medium">{distance.data.race}</p>
                  <p className="text-xs text-muted-foreground">{distance.data.date}</p>
                </div>
              </div>
            ),
        )}
      </CardContent>
    </Card>
  )
}
