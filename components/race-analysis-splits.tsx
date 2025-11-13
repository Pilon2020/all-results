import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface RaceAnalysisSplitsProps {
  splits: {
    swim: Array<{ distance: string; time: string; pace: string }>
    bike: Array<{ distance: string; time: string; speed: string }>
    run: Array<{ distance: string; time: string; pace: string }>
  }
}

export function RaceAnalysisSplits({ splits }: RaceAnalysisSplitsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Split Analysis</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="swim" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="swim">Swim Splits</TabsTrigger>
            <TabsTrigger value="bike">Bike Splits</TabsTrigger>
            <TabsTrigger value="run">Run Splits</TabsTrigger>
          </TabsList>

          <TabsContent value="swim" className="mt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-semibold">Distance</TableHead>
                  <TableHead className="font-semibold">Cumulative Time</TableHead>
                  <TableHead className="font-semibold">Pace</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {splits.swim.map((split, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{split.distance}</TableCell>
                    <TableCell className="font-mono">{split.time}</TableCell>
                    <TableCell className="font-mono text-muted-foreground">{split.pace}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>

          <TabsContent value="bike" className="mt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-semibold">Distance</TableHead>
                  <TableHead className="font-semibold">Cumulative Time</TableHead>
                  <TableHead className="font-semibold">Avg Speed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {splits.bike.map((split, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{split.distance}</TableCell>
                    <TableCell className="font-mono">{split.time}</TableCell>
                    <TableCell className="font-mono text-muted-foreground">{split.speed}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>

          <TabsContent value="run" className="mt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-semibold">Distance</TableHead>
                  <TableHead className="font-semibold">Cumulative Time</TableHead>
                  <TableHead className="font-semibold">Pace</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {splits.run.map((split, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{split.distance}</TableCell>
                    <TableCell className="font-mono">{split.time}</TableCell>
                    <TableCell className="font-mono text-muted-foreground">{split.pace}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
