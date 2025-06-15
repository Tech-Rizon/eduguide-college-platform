"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

const quickLoginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type LoginForm = z.infer<typeof loginSchema>;
type QuickLoginForm = z.infer<typeof quickLoginSchema>;

interface LoginFormProps {
  onSuccess?: () => void;
  showQuickLogin?: boolean;
}

export function LoginForm({ onSuccess, showQuickLogin = false }: LoginFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));

      try {
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
          const user = JSON.parse(storedUser);
          if (user.email === data.email) {
            toast.success("Login successful!");
            onSuccess ? onSuccess() : router.push("/dashboard");
            return;
          }
        }

        toast.success("Login successful!");

        if (!storedUser) {
          localStorage.setItem("user", JSON.stringify({
            id: "demo-user",
            email: data.email,
            firstName: "Demo",
            lastName: "User",
            createdAt: new Date().toISOString(),
          }));
        }
      } catch (storageError) {
        console.error("Error accessing localStorage:", storageError);
        toast.success("Login successful!");
      }

      onSuccess ? onSuccess() : router.push("/dashboard");
    } catch (error) {
      toast.error("Login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Welcome Back</CardTitle>
        <CardDescription>
          Sign in to your EduGuide account to continue your college journey
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="Enter your email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {!showQuickLogin && (
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Enter your password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="flex items-center justify-between">
              <a href="/forgot-password" className="text-sm text-blue-600 hover:underline">
                Forgot password?
              </a>
            </div>

            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? "Signing In..." : "Sign In"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

export function QuickLoginForm({ onSuccess }: { onSuccess?: () => void }) {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<QuickLoginForm>({
    resolver: zodResolver(quickLoginSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (data: QuickLoginForm) => {
    setIsLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      try {
        localStorage.setItem("quickUser", JSON.stringify({
          id: "quick-user",
          email: data.email,
          firstName: "Guest",
          lastName: "User",
          createdAt: new Date().toISOString(),
        }));
      } catch (storageError) {
        console.error("Error accessing localStorage:", storageError);
      }

      toast.success("Quick access granted!");
      onSuccess?.();
    } catch (error) {
      toast.error("Quick login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="bg-blue-50 border-blue-200">
      <CardHeader>
        <CardTitle className="text-lg text-blue-900">Quick Access</CardTitle>
        <CardDescription className="text-blue-700">
          Get instant access with just your email - perfect for trying our tutoring services
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="Enter your email for quick access" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? "Getting Access..." : "Quick Access"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
