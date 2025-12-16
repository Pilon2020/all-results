import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

interface RaceResult {
  athleteId: string
  name: string
  bib: number
  overall: number
  gender: number
  division: number
  ageGroup: string
  country: string
  swim: string
  t1: string
  bike: string
  t2: string
  run: string
  finish: string
}

interface RaceResultsProps {
  raceId: string
  results: RaceResult[]
}

export function RaceResults({ raceId, results }: RaceResultsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Race Results</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-semibold">Name</TableHead>
                <TableHead className="font-semibold">Bib #</TableHead>
                <TableHead className="font-semibold">Overall</TableHead>
                <TableHead className="font-semibold">Gender</TableHead>
                <TableHead className="font-semibold">Div</TableHead>
                <TableHead className="font-semibold">AG</TableHead>
                <TableHead className="font-semibold">Country</TableHead>
                <TableHead className="font-semibold">Swim</TableHead>
                <TableHead className="font-semibold">T1</TableHead>
                <TableHead className="font-semibold">Bike</TableHead>
                <TableHead className="font-semibold">T2</TableHead>
                <TableHead className="font-semibold">Run</TableHead>
                <TableHead className="font-semibold">Finish</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.map((result, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <Link href={`/athletes/${result.athleteId}`} className="font-medium text-primary hover:underline">
                      {result.name}
                    </Link>
                  </TableCell>
                  <TableCell>{result.bib}</TableCell>
                  <TableCell>
                    {result.overall <= 3 ? (
                      <Badge variant="default" className="font-semibold">
                        {result.overall}
                      </Badge>
                    ) : (
                      result.overall
                    )}
                  </TableCell>
                  <TableCell>{result.gender}</TableCell>
                  <TableCell>{result.division}</TableCell>
                  <TableCell>{result.ageGroup}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{result.country}</Badge>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{result.swim}</TableCell>
                  <TableCell className="font-mono text-sm text-muted-foreground">{result.t1}</TableCell>
                  <TableCell className="font-mono text-sm">{result.bike}</TableCell>
                  <TableCell className="font-mono text-sm text-muted-foreground">{result.t2}</TableCell>
                  <TableCell className="font-mono text-sm">{result.run}</TableCell>
                  <TableCell className="font-mono text-sm font-semibold">{result.finish}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
