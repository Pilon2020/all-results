"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { useAuth } from "@/lib/auth-context"
import type { PublicUser } from "@/lib/auth-helpers"
import { ClaimedAthleteCard } from "./claimed-athlete-card"

const urlSchema = z
  .string()
  .trim()
  .optional()
  .refine(
    (value) => {
      if (!value) {
        return true
      }
      try {
        const url = new URL(value)
        return ["http:", "https:"].includes(url.protocol)
      } catch {
        return false
      }
    },
    { message: "Enter a valid URL (including https://)." },
  )

const profileSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required"),
  lastName: z.string().trim().min(1, "Last name is required"),
  country: z.string().trim().optional(),
  team: z.string().trim().optional(),
  age: z
    .string()
    .optional()
    .refine(
      (value) => {
        if (!value) return true
        const parsed = Number(value)
        return Number.isFinite(parsed) && parsed >= 0
      },
      { message: "Enter a valid age." },
    ),
  photoUrl: urlSchema,
  strava: urlSchema,
  instagram: urlSchema,
})

type ProfileFormValues = z.infer<typeof profileSchema>

const mapUserToFormValues = (user?: PublicUser | null) => ({
  firstName: user?.firstName ?? "",
  lastName: user?.lastName ?? "",
  country: user?.country ?? "",
  team: user?.team ?? "",
  age: user?.age ? String(user.age) : "",
  photoUrl: user?.photoUrl ?? "",
  strava: user?.socialLinks?.strava ?? "",
  instagram: user?.socialLinks?.instagram ?? "",
})

export function ProfileForm() {
  const router = useRouter()
  const { user, updateProfile } = useAuth()
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle")
  const [serverError, setServerError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: mapUserToFormValues(user),
  })

  useEffect(() => {
    form.reset(mapUserToFormValues(user))
  }, [user, form])

  const photoPreview = form.watch("photoUrl")

  const handleSubmit = async (values: ProfileFormValues) => {
    if (!user) {
      router.push("/sign-in?next=/profile/settings")
      return
    }

    setStatus("idle")
    setServerError(null)
    setIsSaving(true)

    try {
      const payload = {
        firstName: values.firstName,
        lastName: values.lastName,
        country: values.country || null,
        team: values.team || null,
        age: values.age ? Number(values.age) : null,
        photoUrl: values.photoUrl || null,
        socialLinks:
          values.strava || values.instagram
            ? {
                strava: values.strava || undefined,
                instagram: values.instagram || undefined,
              }
            : undefined,
      }

      const updatedUser = await updateProfile(payload)
      form.reset(mapUserToFormValues(updatedUser))
      setStatus("success")
    } catch (error) {
      setStatus("error")
      setServerError(error instanceof Error ? error.message : "Unable to update your profile.")
    } finally {
      setIsSaving(false)
    }
  }

  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sign in to manage your profile</CardTitle>
          <CardDescription>Update your personal information and keep your claimed athlete profile in sync.</CardDescription>
        </CardHeader>
        <CardFooter className="flex flex-wrap gap-3">
          <Button onClick={() => router.push("/sign-in?next=/profile/settings")}>Sign in</Button>
          <Button variant="outline" onClick={() => router.push("/sign-up?next=/profile/settings")}>
            Sign up
          </Button>
        </CardFooter>
      </Card>
    )
  }

  const claimedAthleteCard = user.claimedAthleteId ? (
    <ClaimedAthleteCard athleteId={user.claimedAthleteId} />
  ) : (
    <Card>
      <CardHeader>
        <CardTitle>Claim an athlete profile</CardTitle>
        <CardDescription>
          Visit any athlete page and tap <strong>Claim Athlete</strong> to link it to your account. Once linked, the profile
          will appear here along with your latest results.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button variant="outline" asChild>
          <Link href="/search">Find an athlete</Link>
        </Button>
      </CardContent>
    </Card>
  )

  const successAlert =
    status === "success" ? (
      <Alert>
        <AlertDescription>Your profile was updated successfully.</AlertDescription>
      </Alert>
    ) : null

  const errorAlert =
    status === "error" ? (
      <Alert variant="destructive">
        <AlertDescription>{serverError ?? "Unable to update your profile."}</AlertDescription>
      </Alert>
    ) : null

  return (
    <div className="space-y-6">
      {successAlert}
      {errorAlert}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Account details</CardTitle>
              <CardDescription>Keep your personal details up to date. These will sync with your athlete profile.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First name</FormLabel>
                      <FormControl>
                        <Input placeholder="Jordan" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last name</FormLabel>
                      <FormControl>
                        <Input placeholder="Rivera" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <FormLabel>Email</FormLabel>
                  <Input value={user.email} disabled className="mt-2" />
                </div>
                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Country</FormLabel>
                      <FormControl>
                        <Input placeholder="Canada" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="team"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Team</FormLabel>
                      <FormControl>
                        <Input placeholder="Northern Flyers" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="age"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Age</FormLabel>
                      <FormControl>
                        <Input placeholder="35" inputMode="numeric" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="photoUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Profile photo URL</FormLabel>
                    <FormControl>
                      <Input placeholder="https://images.example.com/me.jpg" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {photoPreview && (
                <div className="flex items-center gap-3 rounded-lg border p-3">
                  <img
                    src={photoPreview}
                    alt="Profile preview"
                    className="h-16 w-16 rounded-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div>
                    <p className="text-sm font-medium">Preview</p>
                    <p className="text-xs text-muted-foreground">
                      This image will show up anywhere your athlete profile is referenced.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Social & media</CardTitle>
              <CardDescription>Link your social accounts so fans can follow along.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="strava"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Strava</FormLabel>
                    <FormControl>
                      <Input placeholder="https://www.strava.com/athletes/12345" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="instagram"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Instagram</FormLabel>
                    <FormControl>
                      <Input placeholder="https://instagram.com/your-handle" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {claimedAthleteCard}

          <Card>
            <CardContent className="flex flex-col gap-4 pt-6 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-medium">Save changes</p>
                <p className="text-sm text-muted-foreground">
                  Updates sync instantly across your account and claimed athlete profile.
                </p>
              </div>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Saving..." : "Save profile"}
              </Button>
            </CardContent>
          </Card>
        </form>
      </Form>
    </div>
  )
}
