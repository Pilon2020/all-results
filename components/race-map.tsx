import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MapPin } from "lucide-react"

export function RaceMap() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Race Course Map</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center h-96 bg-muted rounded-lg border-2 border-dashed border-border">
          <MapPin className="h-16 w-16 text-muted-foreground mb-4" />
          <p className="text-lg font-medium text-muted-foreground">Course Map</p>
          <p className="text-sm text-muted-foreground mt-2">GPX file visualization will be displayed here</p>
        </div>
      </CardContent>
    </Card>
  )
}
