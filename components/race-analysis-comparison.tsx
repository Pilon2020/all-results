import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { TrendingDown, TrendingUp } from "lucide-react"

interface RaceAnalysisComparisonProps {
  comparison: {
    ageGroup: {
      swim: { athlete: string; average: string; diff: string }
      bike: { athlete: string; average: string; diff: string }
      run: { athlete: string; average: string; diff: string }
      total: { athlete: string; average: string; diff: string }
    }
  }
}

export function RaceAnalysisComparison({ comparison }: RaceAnalysisComparisonProps) {
  const segments = [
    { label: "Swim", data: comparison.ageGroup.swim },
    { label: "Bike", data: comparison.ageGroup.bike },
    { label: "Run", data: comparison.ageGroup.run },
    { label: "Total", data: comparison.ageGroup.total },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Age Group Comparison</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-semibold">Segment</TableHead>
              <TableHead className="font-semibold">Athlete Time</TableHead>
              <TableHead className="font-semibold">AG Average</TableHead>
              <TableHead className="font-semibold">Difference</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {segments.map((segment, index) => {
              const isFaster = segment.data.diff.startsWith("-")
              return (
                <TableRow key={index} className={index === segments.length - 1 ? "font-semibold" : ""}>
                  <TableCell>{segment.label}</TableCell>
                  <TableCell className="font-mono">{segment.data.athlete}</TableCell>
                  <TableCell className="font-mono text-muted-foreground">{segment.data.average}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge variant={isFaster ? "default" : "destructive"} className="font-mono">
                        {isFaster ? <TrendingDown className="h-3 w-3 mr-1" /> : <TrendingUp className="h-3 w-3 mr-1" />}
                        {segment.data.diff}
                      </Badge>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>

        <div className="mt-6 p-4 rounded-lg bg-muted">
          <p className="text-sm text-muted-foreground">
            This athlete performed significantly better than the age group average across all segments, finishing over 1
            hour ahead of the average competitor in their age group.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
