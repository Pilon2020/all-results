import { Header } from "@/components/header"
import { SearchBar } from "@/components/search-bar"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background dark:bg-[oklch(0.18,0,0)]">
      <Header />

      <main className="container mx-auto px-4 py-20">
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8">
          <div className="text-center space-y-4 max-w-3xl">
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-balance">
              Track Every Race,
              <br />
              <span className="text-primary">Analyze Every Performance</span>
            </h1>
            <p className="text-xl text-muted-foreground text-balance">
              Comprehensive race results analysis and athlete performance tracking for endurance sports
            </p>
          </div>

          <SearchBar />

          <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground">
            <span>Search for:</span>
            <span className="px-3 py-1 rounded-full bg-secondary text-secondary-foreground">Athletes</span>
            <span className="px-3 py-1 rounded-full bg-secondary text-secondary-foreground">Races</span>
          </div>
        </div>
      </main>
    </div>
  )
}
