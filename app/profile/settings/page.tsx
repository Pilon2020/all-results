import { Header } from "@/components/header"
import { ProfileForm } from "../profile-form"

export const metadata = {
  title: "Profile Settings • RaceTrack",
  description: "Edit your personal information and keep your athlete profile in sync.",
}

export default function ProfileSettingsPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-10">
        <div className="space-y-6">
          <div className="flex flex-col gap-2">
            <p className="text-sm uppercase tracking-wide text-muted-foreground">Account</p>
            <h1 className="text-4xl font-bold tracking-tight">Profile settings</h1>
            <p className="text-muted-foreground">
              Update your personal information, links, and social handles. Changes sync to claimed athlete pages instantly.
            </p>
          </div>

          <ProfileForm />
        </div>
      </main>
    </div>
  )
}
