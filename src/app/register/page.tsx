"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { GraduationCap, ArrowLeft, CheckCircle, Eye, EyeOff, Shield, AlertTriangle, Phone } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";

// Password strength requirements
const PASSWORD_MIN_LENGTH = 8;

function getPasswordStrength(password: string): {
  score: number;
  label: string;
  color: string;
  checks: { label: string; met: boolean }[];
} {
  const checks = [
    { label: "At least 8 characters", met: password.length >= PASSWORD_MIN_LENGTH },
    { label: "Contains uppercase letter", met: /[A-Z]/.test(password) },
    { label: "Contains lowercase letter", met: /[a-z]/.test(password) },
    { label: "Contains a number", met: /\d/.test(password) },
    { label: "Contains special character", met: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password) },
  ];

  const score = checks.filter((c) => c.met).length;

  if (score <= 1) return { score, label: "Very Weak", color: "bg-red-500", checks };
  if (score === 2) return { score, label: "Weak", color: "bg-orange-500", checks };
  if (score === 3) return { score, label: "Fair", color: "bg-yellow-500", checks };
  if (score === 4) return { score, label: "Strong", color: "bg-green-500", checks };
  return { score, label: "Very Strong", color: "bg-emerald-600", checks };
}

const registerSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters").max(50, "First name is too long"),
  lastName: z.string().min(2, "Last name must be at least 2 characters").max(50, "Last name is too long"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().max(30, "Phone number is too long").optional(),
  password: z
    .string()
    .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`)
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/\d/, "Password must contain at least one number")
    .regex(/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/, "Password must contain at least one special character"),
  confirmPassword: z.string(),
  currentSchool: z.string().min(1, "Current school is required"),
  schoolType: z.enum(["high_school", "community_college", "university", "other"]),
  graduationYear: z.string().min(4, "Graduation year is required"),
  highSchool: z.string().optional(),
  highSchoolGradYear: z.string().optional(),
  acceptTerms: z.boolean().refine((value) => value, {
    message: "You must accept the Terms of Service and Privacy Policy",
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type RegisterForm = z.infer<typeof registerSchema>;

const steps = [
  { id: 1, title: "Get Started", description: "Just a few details to reserve your spot" },
  { id: 2, title: "Secure Account", description: "Create your password" },
  { id: 3, title: "Education", description: "Tell us about your academic background" },
  { id: 4, title: "Almost Done!", description: "Review your information" },
];

export default function RegisterPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signUp } = useAuth();

  const form = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
      currentSchool: "",
      schoolType: "high_school",
      graduationYear: "",
      highSchool: "",
      highSchoolGradYear: "",
      acceptTerms: false,
    },
  });

  const watchedPassword = form.watch("password");
  const passwordStrength = useMemo(
    () => getPasswordStrength(watchedPassword || ""),
    [watchedPassword]
  );
  const passwordStrengthWidthClass = ["w-0", "w-1/5", "w-2/5", "w-3/5", "w-4/5", "w-full"][passwordStrength.score];

  useEffect(() => {
    const emailFromQuery = searchParams.get("email")?.trim().toLowerCase();
    if (!emailFromQuery || form.getValues("email")) return;
    form.setValue("email", emailFromQuery, { shouldValidate: true });
  }, [form, searchParams]);

  const nextStep = async () => {
    if (currentStep === 1) {
      const isValid = await form.trigger(["firstName", "lastName", "email"]);
      if (!isValid) return;

      setIsLoading(true);
      try {
        const values = form.getValues();
        const res = await fetch("/api/leads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            firstName: values.firstName,
            lastName: values.lastName,
            email: values.email,
            phone: values.phone || null,
          }),
        });

        if (res.status === 409) {
          const payload = await res.json().catch(() => ({})) as { code?: string };
          if (payload.code === "already_registered") {
            toast.error("You already have an account. Please sign in instead.");
            router.push(`/login?email=${encodeURIComponent(values.email)}`);
            return;
          }
        }

        if (!res.ok) {
          const payload = await res.json().catch(() => ({})) as { error?: string };
          toast.error(payload.error ?? "Could not save your info. Please try again.");
          return;
        }

        setCurrentStep(2);
      } catch {
        toast.error("Something went wrong. Please check your connection and try again.");
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (currentStep === 2) {
      const isValid = await form.trigger(["password", "confirmPassword", "acceptTerms"]);
      if (isValid) setCurrentStep(3);
      return;
    }

    if (currentStep === 3) {
      const isValid = await form.trigger(["currentSchool", "schoolType", "graduationYear"]);
      if (isValid) setCurrentStep(4);
      return;
    }
  };

  const prevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const onSubmit = async (data: RegisterForm) => {
    setIsLoading(true);
    try {
      const { error: authError } = await signUp(
        data.email,
        data.password,
        {
          full_name: `${data.firstName} ${data.lastName}`,
          first_name: data.firstName,
          last_name: data.lastName,
          phone: data.phone || null,
          current_school: data.currentSchool,
          school_type: data.schoolType,
          graduation_year: data.graduationYear,
          high_school: data.highSchool || null,
          high_school_grad_year: data.highSchoolGradYear || null,
          accepted_terms_at: new Date().toISOString(),
        }
      );

      if (authError) {
        throw authError;
      }

      toast.success("Account created! Please check your email to verify your account.");
      router.push("/login?registered=1");
    } catch (error: unknown) {
      console.error("Registration error:", error);
      const message = error instanceof Error ? error.message : "Registration failed. Please try again.";

      if (message.includes("already registered") || message.includes("already exists")) {
        toast.error("An account with this email already exists. Please sign in instead.");
      } else {
        toast.error(message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-purple-50">
      <nav className="flex items-center justify-between p-6 max-w-7xl mx-auto">
        <Link href="/" className="flex items-center space-x-2">
          <GraduationCap className="h-8 w-8 text-blue-600" />
          <span className="text-2xl font-bold text-gray-900">EduGuide</span>
        </Link>
        <Link href="/">
          <Button variant="ghost">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
        </Link>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-12">
        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className={`flex items-center ${index < steps.length - 1 ? "mr-2 sm:mr-4" : ""}`}>
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                    currentStep > step.id
                      ? "bg-green-500 text-white"
                      : currentStep === step.id
                      ? "bg-blue-500 text-white"
                      : "bg-gray-200 text-gray-500"
                  }`}
                >
                  {currentStep > step.id ? <CheckCircle className="h-4 w-4" /> : step.id}
                </div>
                <span className="ml-1.5 text-xs font-medium text-gray-600 hidden sm:inline">
                  {step.title}
                </span>
                {index < steps.length - 1 && (
                  <div
                    className={`ml-2 sm:ml-4 w-8 sm:w-12 h-0.5 transition-colors ${
                      currentStep > step.id ? "bg-green-500" : "bg-gray-200"
                    }`}
                  />
                )}
              </div>
            </div>
          ))}
        </div>

        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">{steps[currentStep - 1].title}</CardTitle>
              <CardDescription>{steps[currentStep - 1].description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

                  {/* ── Step 1: Get Started ─────────────────────────────── */}
                  {currentStep === 1 && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="firstName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>First Name</FormLabel>
                              <FormControl>
                                <Input placeholder="John" autoComplete="given-name" {...field} />
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
                              <FormLabel>Last Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Doe" autoComplete="family-name" {...field} />
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
                            <FormLabel>Email Address</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="john@example.com" autoComplete="email" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-1.5">
                              <Phone className="h-3.5 w-3.5 text-gray-500" />
                              Phone Number
                              <span className="text-gray-400 font-normal text-xs ml-1">(optional)</span>
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="tel"
                                placeholder="+1 (555) 000-0000"
                                autoComplete="tel"
                                {...field}
                              />
                            </FormControl>
                            <FormDescription className="text-xs">
                              Our advisors may reach out to help you get started.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                  {/* ── Step 2: Secure Account ──────────────────────────── */}
                  {currentStep === 2 && (
                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input
                                  type={showPassword ? "text" : "password"}
                                  placeholder="Create a strong password"
                                  autoComplete="new-password"
                                  className="pr-10"
                                  {...field}
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowPassword(!showPassword)}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                  tabIndex={-1}
                                  aria-label={showPassword ? "Hide password" : "Show password"}
                                >
                                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                              </div>
                            </FormControl>

                            {/* Password Strength Meter */}
                            {watchedPassword && (
                              <div className="mt-2 space-y-2">
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                    <div
                                      className={`h-full rounded-full transition-all duration-300 ${passwordStrength.color} ${passwordStrengthWidthClass}`}
                                    />
                                  </div>
                                  <span className={`text-xs font-medium ${
                                    passwordStrength.score <= 2 ? "text-red-600" :
                                    passwordStrength.score === 3 ? "text-yellow-600" :
                                    "text-green-600"
                                  }`}>
                                    {passwordStrength.label}
                                  </span>
                                </div>
                                <ul className="space-y-1">
                                  {passwordStrength.checks.map((check) => (
                                    <li key={check.label} className="flex items-center gap-1.5 text-xs">
                                      {check.met ? (
                                        <CheckCircle className="h-3 w-3 text-green-500" />
                                      ) : (
                                        <AlertTriangle className="h-3 w-3 text-gray-300" />
                                      )}
                                      <span className={check.met ? "text-green-700" : "text-gray-400"}>
                                        {check.label}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="confirmPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Confirm Password</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input
                                  type={showConfirmPassword ? "text" : "password"}
                                  placeholder="Confirm your password"
                                  autoComplete="new-password"
                                  className="pr-10"
                                  {...field}
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                  tabIndex={-1}
                                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                                >
                                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Terms of Service */}
                      <FormField
                        control={form.control}
                        name="acceptTerms"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 mt-2">
                            <FormControl>
                              <Checkbox
                                checked={Boolean(field.value)}
                                onCheckedChange={(checked) => field.onChange(Boolean(checked))}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel className="text-sm font-normal cursor-pointer">
                                I agree to the{" "}
                                <span className="text-blue-600 hover:underline font-medium">Terms of Service</span>
                                {" "}and{" "}
                                <span className="text-blue-600 hover:underline font-medium">Privacy Policy</span>
                              </FormLabel>
                              <FormDescription className="text-xs">
                                By creating an account, you agree to our terms and acknowledge our privacy practices.
                              </FormDescription>
                              <FormMessage />
                            </div>
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                  {/* ── Step 3: Education ───────────────────────────────── */}
                  {currentStep === 3 && (
                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="currentSchool"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Current School</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter your current school name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="schoolType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>School Type</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select your current school type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="high_school">High School</SelectItem>
                                <SelectItem value="community_college">Community College</SelectItem>
                                <SelectItem value="university">University</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="graduationYear"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Expected Graduation Year</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select graduation year" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {Array.from({ length: 12 }, (_, i) => {
                                  const year = new Date().getFullYear() + i;
                                  return (
                                    <SelectItem key={year} value={year.toString()}>
                                      {year}
                                    </SelectItem>
                                  );
                                })}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="highSchool"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>High School (if different from current)</FormLabel>
                            <FormControl>
                              <Input placeholder="High school name (optional)" {...field} />
                            </FormControl>
                            <FormDescription>
                              Only fill this if you&apos;re currently not in high school
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="highSchoolGradYear"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>High School Graduation Year (optional)</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select graduation year" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {Array.from({ length: 16 }, (_, i) => {
                                  const year = 2030 - i;
                                  return (
                                    <SelectItem key={year} value={year.toString()}>
                                      {year}
                                    </SelectItem>
                                  );
                                })}
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              Only fill this if you&apos;re currently not in high school
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                  {/* ── Step 4: Review ──────────────────────────────────── */}
                  {currentStep === 4 && (
                    <div className="space-y-6">
                      <div className="text-center space-y-3">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                          <Shield className="h-8 w-8 text-green-600" />
                        </div>
                        <h3 className="text-xl font-semibold">Review Your Information</h3>
                        <p className="text-gray-600 text-sm">
                          Please verify your details before completing registration.
                        </p>
                      </div>

                      <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <span className="text-gray-500">Name</span>
                            <p className="font-medium">{form.getValues("firstName")} {form.getValues("lastName")}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Email</span>
                            <p className="font-medium break-all">{form.getValues("email")}</p>
                          </div>
                          {form.getValues("phone") && (
                            <div>
                              <span className="text-gray-500">Phone</span>
                              <p className="font-medium">{form.getValues("phone")}</p>
                            </div>
                          )}
                          <div>
                            <span className="text-gray-500">School</span>
                            <p className="font-medium">{form.getValues("currentSchool")}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">School Type</span>
                            <p className="font-medium capitalize">{form.getValues("schoolType")?.replace("_", " ")}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Graduation Year</span>
                            <p className="font-medium">{form.getValues("graduationYear")}</p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <p className="text-sm text-blue-700">
                          A verification email will be sent to <strong>{form.getValues("email")}</strong>. Please check your inbox to activate your account.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Navigation Buttons */}
                  <div className="flex justify-between pt-6">
                    {currentStep > 1 && (
                      <Button type="button" variant="outline" onClick={prevStep} disabled={isLoading}>
                        Previous
                      </Button>
                    )}

                    {currentStep < 4 ? (
                      <Button type="button" onClick={nextStep} disabled={isLoading} className="ml-auto">
                        {isLoading ? (
                          <span className="flex items-center gap-2">
                            <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Saving...
                          </span>
                        ) : (
                          "Continue"
                        )}
                      </Button>
                    ) : (
                      <Button type="submit" disabled={isLoading} className="ml-auto">
                        {isLoading ? (
                          <span className="flex items-center gap-2">
                            <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Creating Account...
                          </span>
                        ) : (
                          "Create Account"
                        )}
                      </Button>
                    )}
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </motion.div>

        <div className="text-center mt-6">
          <p className="text-gray-600">
            Already have an account?{" "}
            <Link href="/login" className="text-blue-600 hover:underline font-medium">
              Sign in here
            </Link>
          </p>
        </div>

        <p className="text-center text-xs text-gray-400 mt-8">
          Your data is encrypted and protected by Supabase Auth
        </p>
      </div>
    </div>
  );
}
