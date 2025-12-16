"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { User, LogOut, UserCircle, Settings } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { SearchBar } from "@/components/search-bar"

export function Header() {
  const { user, signOut } = useAuth()
  const pathname = usePathname()
  const isHomePage = pathname === "/"

  return (
    <header className="relative z-[250] border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <span className="text-xl font-bold text-primary-foreground">RT</span>
            </div>
            <span className="text-xl font-bold tracking-tight">RACETRACK</span>
          </Link>

          <div className="flex-1 max-w-md mx-4" style={{ visibility: isHomePage ? "hidden" : "visible" }}>
            <SearchBar />
          </div>

          <nav className="hidden md:flex items-center gap-6 flex-shrink-0">
            <Link
              href="/results"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              RESULTS
            </Link>
            <Link
              href="/rankings"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              RANKINGS
            </Link>
          </nav>

          <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <UserCircle className="h-6 w-6" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {user ? (
                  <>
                    <div className="px-2 py-1.5">
                      <p className="text-sm font-medium">{user.name}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/profile">
                        <Settings className="mr-2 h-4 w-4" />
                        Profile
                      </Link>
                    </DropdownMenuItem>
                    {user.claimedAthleteId && (
                      <DropdownMenuItem asChild>
                        <Link href={`/athletes/${user.claimedAthleteId}`}>
                          <User className="mr-2 h-4 w-4" />
                          My Athlete Profile
                        </Link>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={signOut}>
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign Out
                    </DropdownMenuItem>
                  </>
                ) : (
                  <>
                    <DropdownMenuItem asChild>
                      <Link href="/sign-in">Sign In</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/sign-up">Sign Up</Link>
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  )
}
