import { Suspense } from "react"

import { Header } from "@/components/header"
import { SearchResults } from "@/components/search-results"

export const dynamic = "force-dynamic"

type SearchPageProps = {
  searchParams: Promise<{ q?: string }>
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const resolvedSearchParams = await searchParams
  const query = resolvedSearchParams?.q ?? ""

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <Suspense fallback={<div className="text-center py-20">Loading...</div>}>
          <SearchResults query={query} />
        </Suspense>
      </main>
    </div>
  )
}
