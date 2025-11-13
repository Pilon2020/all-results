"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"

import type { ProfileUpdateInput, PublicUser, SignUpInput } from "@/lib/auth-helpers"

interface AuthContextType {
  user: PublicUser | null
  signIn: (email: string, password: string) => Promise<void>
  signUp: (data: SignUpInput) => Promise<void>
  signOut: () => void
  claimAthlete: (athleteId: string) => Promise<void>
  updateProfile: (data: ProfileUpdateInput) => Promise<PublicUser>
}

const SESSION_KEY = "user"

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const request = async <T>(url: string, body: unknown): Promise<T> => {
  let response: Response

  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
  } catch {
    throw new Error("Unable to reach the server. Please check your connection and try again.")
  }

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data?.error || "Unable to process your request.")
  }

  return data as T
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null)

  const persistSession = (authUser: PublicUser) => {
    setUser(authUser)
    localStorage.setItem(SESSION_KEY, JSON.stringify(authUser))
  }

  const clearSession = () => {
    setUser(null)
    localStorage.removeItem(SESSION_KEY)
  }

  useEffect(() => {
    const storedUser = localStorage.getItem(SESSION_KEY)
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser) as PublicUser
        setUser(parsed)
      } catch {
        clearSession()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const signIn = async (email: string, password: string) => {
    const { user: signedInUser } = await request<{ user: PublicUser }>("/api/auth/sign-in", { email, password })
    persistSession(signedInUser)
  }

  const signUp = async (payload: SignUpInput) => {
    const { user: createdUser } = await request<{ user: PublicUser }>("/api/auth/sign-up", payload)
    persistSession(createdUser)
  }

  const signOut = () => {
    clearSession()
  }

  const updateProfile = async (data: ProfileUpdateInput) => {
    if (!user) {
      throw new Error("You must be signed in to update your profile.")
    }

    const { user: updatedUser } = await request<{ user: PublicUser }>("/api/profile", {
      userId: user.id,
      ...data,
    })
    persistSession(updatedUser)
    return updatedUser
  }

  const claimAthlete = async (athleteId: string) => {
    if (!user) {
      throw new Error("You must be signed in to claim an athlete.")
    }

    const { user: updatedUser } = await request<{ user: PublicUser }>("/api/auth/claim", {
      userId: user.id,
      athleteId,
    })

    persistSession(updatedUser)
  }

  return (
    <AuthContext.Provider value={{ user, signIn, signUp, signOut, claimAthlete, updateProfile }}>
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
