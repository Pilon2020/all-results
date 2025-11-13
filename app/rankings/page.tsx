import Link from "next/link"
import { Trophy, ArrowUpRight } from "lucide-react"

import { Header } from "@/components/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getTopAthletes } from "@/lib/data"

export const revalidate = 300

export default async function RankingsPage() {
  const topAthletes = await getTopAthletes(10)

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8 space-y-10">
        <section className="max-w-3xl space-y-4">
          <Badge variant="secondary" className="text-xs">
            Power Rankings
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-balance">Top 10 Athletes by ELO</h1>
          <p className="text-lg text-muted-foreground">
            Updated automatically as new race results land. The leaderboard highlights who&apos;s trending and which
            federations or squads are dominating the scene.
          </p>
        </section>

        <Card>
          <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <CardTitle className="text-2xl flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              Current Standings
            </CardTitle>
            <span className="text-sm text-muted-foreground">
              Showing the highest rated athletes on the platform right now.
            </span>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Athlete</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>Team</TableHead>
                    <TableHead className="text-right">ELO</TableHead>
                    <TableHead className="sr-only">Profile</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topAthletes.map((athlete, index) => (
                    <TableRow key={athlete.athleteId}>
                      <TableCell className="font-semibold">{index + 1}</TableCell>
                      <TableCell>
                        <Link href={`/athletes/${athlete.athleteId}`} className="font-medium hover:underline">
                          {athlete.firstName} {athlete.lastName}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{athlete.country}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{athlete.team || "—"}</TableCell>
                      <TableCell className="text-right font-mono font-semibold text-lg">{athlete.eloScore}</TableCell>
                      <TableCell className="text-right">
                        <Link href={`/athletes/${athlete.athleteId}`} className="inline-flex items-center text-primary">
                          View
                          <ArrowUpRight className="h-4 w-4 ml-1" />
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                  {topAthletes.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                        No athletes are ranked yet. Once results are synced, ELO standings will populate automatically.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
