"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Check, Circle } from "lucide-react"

import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { useAuth } from "@/lib/auth-context"
import { PASSWORD_REQUIREMENTS, STRONG_PASSWORD_REGEX } from "@/lib/auth-helpers"

const PASSWORD_HINTS = [
  { key: "length", label: "At least 10 characters", test: (value: string) => value.length >= 10 },
  { key: "uppercase", label: "One uppercase letter", test: (value: string) => /[A-Z]/.test(value) },
  { key: "lowercase", label: "One lowercase letter", test: (value: string) => /[a-z]/.test(value) },
  { key: "number", label: "One number", test: (value: string) => /\d/.test(value) },
  { key: "symbol", label: "One special character", test: (value: string) => /[^A-Za-z0-9]/.test(value) },
]

const signUpSchema = z
  .object({
    firstName: z.string().trim().min(1, "First name is required"),
    lastName: z.string().trim().min(1, "Last name is required"),
    email: z.string().trim().email("Enter a valid email address"),
    password: z
      .string()
      .min(10, "Password must be at least 10 characters")
      .regex(STRONG_PASSWORD_REGEX, PASSWORD_REQUIREMENTS),
    confirmPassword: z.string().min(10, "Please confirm your password"),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  })

type SignUpValues = z.infer<typeof signUpSchema>

export default function SignUpPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { signUp } = useAuth()

  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isPasswordFocused, setIsPasswordFocused] = useState(false)

  const form = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  })

  const passwordValue = form.watch("password") ?? ""

  const passwordHintItems = useMemo(
    () =>
      PASSWORD_HINTS.map((hint) => ({
        ...hint,
        met: hint.test(passwordValue),
      })),
    [passwordValue],
  )

  const shouldShowPasswordHints = isPasswordFocused || passwordValue.length > 0

  const handleSubmit = async (values: SignUpValues) => {
    setFormError(null)
    setIsSubmitting(true)

    try {
      await signUp({
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        password: values.password,
      })
      const nextRoute = searchParams.get("next") || "/"
      router.push(nextRoute)
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Unable to create your account.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto flex min-h-[calc(100vh-5rem)] items-center justify-center px-4 py-12">
        <div className="w-full max-w-2xl">
          <Card className="shadow-lg">
            <CardHeader className="space-y-2 text-center">
              <CardTitle className="text-3xl font-bold tracking-tight">Create your account</CardTitle>
              <CardDescription>
                Tell us who you are so we can personalize rankings, athlete ownership, and race insights.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {formError && (
                <Alert variant="destructive">
                  <AlertDescription>{formError}</AlertDescription>
                </Alert>
              )}

              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First name</FormLabel>
                          <FormControl>
                            <Input placeholder="Jordan" autoComplete="given-name" {...field} />
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
                            <Input placeholder="Rivera" autoComplete="family-name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="you@example.com" autoComplete="email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                type="password"
                                placeholder="••••••••"
                                autoComplete="new-password"
                                {...field}
                                onFocus={(event) => {
                                  setIsPasswordFocused(true)
                                  field.onFocus?.(event)
                                }}
                                onBlur={(event) => {
                                  field.onBlur()
                                  setIsPasswordFocused(false)
                                }}
                              />
                              {shouldShowPasswordHints && (
                                <div className="absolute right-0 top-full z-10 mt-2 w-72">
                                  <div className="rounded-xl border bg-popover p-4 text-sm shadow-xl">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                      Password requirements
                                    </p>
                                    <ul className="mt-3 space-y-2">
                                      {passwordHintItems.map((hint) => (
                                        <li
                                          key={hint.key}
                                          className={`flex items-center gap-2 ${
                                            hint.met ? "text-foreground" : "text-muted-foreground"
                                          }`}
                                        >
                                          <span
                                            className={`flex h-5 w-5 items-center justify-center rounded-full border text-[10px] ${
                                              hint.met
                                                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600"
                                                : "border-border text-muted-foreground"
                                            }`}
                                          >
                                            {hint.met ? <Check className="h-3 w-3" /> : <Circle className="h-3 w-3" />}
                                          </span>
                                          <span className={hint.met ? "line-through" : ""}>{hint.label}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                </div>
                              )}
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="••••••••" autoComplete="new-password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? "Creating account..." : "Create Account"}
                  </Button>
                </form>
              </Form>
            </CardContent>

            <CardFooter className="justify-center gap-2 text-sm text-muted-foreground">
              <span>Already have an account?</span>
              <Link href="/sign-in" className="font-medium text-foreground underline-offset-4 hover:underline">
                Sign in
              </Link>
            </CardFooter>
          </Card>
        </div>
      </main>
    </div>
  )
}
