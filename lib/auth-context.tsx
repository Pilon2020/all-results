"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"

interface User {
  id: string
  email: string
  name: string
  claimedAthleteId?: string
}

interface AuthContextType {
  user: User | null
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, name: string) => Promise<void>
  signOut: () => void
  claimAthlete: (athleteId: string) => void
  updateAthleteProfile: (athleteId: string, data: { instagram?: string; strava?: string }) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)

  // Load user from localStorage on mount
  useEffect(() => {
    const storedUser = localStorage.getItem("user")
    if (storedUser) {
      setUser(JSON.parse(storedUser))
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    // Mock sign in - in a real app, this would call an API
    const mockUser = {
      id: "user-1",
      email,
      name: email.split("@")[0],
    }
    setUser(mockUser)
    localStorage.setItem("user", JSON.stringify(mockUser))
  }

  const signUp = async (email: string, password: string, name: string) => {
    // Mock sign up - in a real app, this would call an API
    const mockUser = {
      id: "user-" + Date.now(),
      email,
      name,
    }
    setUser(mockUser)
    localStorage.setItem("user", JSON.stringify(mockUser))
  }

  const signOut = () => {
    setUser(null)
    localStorage.removeItem("user")
  }

  const claimAthlete = (athleteId: string) => {
    if (user) {
      const updatedUser = { ...user, claimedAthleteId: athleteId }
      setUser(updatedUser)
      localStorage.setItem("user", JSON.stringify(updatedUser))

      // Store claimed athlete data
      const claimedAthletes = JSON.parse(localStorage.getItem("claimedAthletes") || "{}")
      claimedAthletes[athleteId] = user.id
      localStorage.setItem("claimedAthletes", JSON.stringify(claimedAthletes))
    }
  }

  const updateAthleteProfile = (athleteId: string, data: { instagram?: string; strava?: string }) => {
    // Store athlete profile updates
    const athleteProfiles = JSON.parse(localStorage.getItem("athleteProfiles") || "{}")
    athleteProfiles[athleteId] = { ...athleteProfiles[athleteId], ...data }
    localStorage.setItem("athleteProfiles", JSON.stringify(athleteProfiles))
  }

  return (
    <AuthContext.Provider value={{ user, signIn, signUp, signOut, claimAthlete, updateAthleteProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
