import { Header } from "@/components/header"
import { ProfileOverview } from "./profile-overview"

export const metadata = {
  title: "Your Profile • RaceTrack",
  description: "View your account summary, claimed athlete, and recent results.",
}

export default function ProfilePage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-10">
        <div className="space-y-6">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">Your profile</h1>
            <p className="text-muted-foreground mt-2">
              Keep tabs on the details tied to your account and any athlete profile you&apos;ve claimed.
            </p>
          </div>

          <ProfileOverview />
        </div>
      </main>
    </div>
  )
}
