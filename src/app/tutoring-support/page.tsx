"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import {
  GraduationCap,
  ArrowLeft,
  BookOpen,
  Users,
  Target,
  CheckCircle,
  MessageCircle,
  FileText,
  Calculator,
  Microscope,
  PenTool,
  Calendar,
  Award,
  Briefcase,
  Upload,
  AlertCircle
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";

const requestSchema = z.object({
  subject: z.string().min(1, "Subject is required"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  priority: z.enum(["low", "medium", "high"]),
  file_url: z.string().optional(),
});

type RequestForm = z.infer<typeof requestSchema>;

const subjects = [
  { value: "mathematics", label: "Mathematics", icon: <Calculator className="h-4 w-4" /> },
  { value: "science", label: "Science", icon: <Microscope className="h-4 w-4" /> },
  { value: "english", label: "English & Literature", icon: <PenTool className="h-4 w-4" /> },
  { value: "history", label: "History & Social Studies", icon: <BookOpen className="h-4 w-4" /> },
  { value: "computer_science", label: "Computer Science", icon: <FileText className="h-4 w-4" /> },
  { value: "business", label: "Business & Economics", icon: <Briefcase className="h-4 w-4" /> },
  { value: "college_prep", label: "College Application & Essays", icon: <GraduationCap className="h-4 w-4" /> },
  { value: "test_prep", label: "Test Preparation (SAT/ACT)", icon: <Target className="h-4 w-4" /> },
  { value: "other", label: "Other", icon: <BookOpen className="h-4 w-4" /> },
];

const services = [
  {
    title: "Assignment Help",
    description: "Get expert assistance with homework, projects, and assignments across all subjects.",
    features: ["Step-by-step guidance", "Concept explanations", "Problem-solving techniques", "Quality review"]
  },
  {
    title: "Study Plans & Exam Prep",
    description: "Personalized study schedules and exam preparation strategies for academic success.",
    features: ["Custom study schedules", "Exam strategies", "Time management", "Progress tracking"]
  },
  {
    title: "College Application Support",
    description: "Complete guidance from college selection to application submission and beyond.",
    features: ["College matching", "Essay writing", "Application review", "Interview prep"]
  },
  {
    title: "Academic Planning",
    description: "Long-term academic planning from admission to graduation and career preparation.",
    features: ["Course selection", "GPA optimization", "Career guidance", "Graduate school prep"]
  },
];

function TutoringSupportPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { user } = useAuth();

  const form = useForm<RequestForm>({
    resolver: zodResolver(requestSchema),
    defaultValues: {
      subject: "",
      description: "",
      priority: "medium",
      file_url: "",
    },
  });

  const onSubmit = async (data: RequestForm) => {
    if (!user) {
      toast.error("Please log in to submit a tutoring request.");
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('tutoring_requests')
        .insert({
          user_id: user.id,
          subject: data.subject,
          description: data.description,
          priority: data.priority,
          file_url: data.file_url || null,
          status: 'pending'
        });

      if (error) {
        throw error;
      }

      setIsSubmitted(true);
      toast.success("Your tutoring request has been submitted successfully!");
      form.reset();
    } catch (error: any) {
      console.error('Request submission error:', error);
      toast.error("Failed to submit request. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Navigation */}
      <nav className="flex items-center justify-between p-6 max-w-7xl mx-auto">
        <Link href="/" className="flex items-center space-x-2">
          <GraduationCap className="h-8 w-8 text-blue-600" />
          <span className="text-2xl font-bold text-gray-900">EduGuide</span>
        </Link>

        <div className="flex items-center space-x-4">
          <Link href="/dashboard">
            <Button variant="ghost">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>
          <Link href="/tutoring">
            <Button variant="outline">Browse Tutoring</Button>
          </Link>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Academic Support & Tutoring
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Get personalized help with assignments, study plans, college applications, and academic planning.
            Our expert tutors provide comprehensive support from admission to graduation.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Services Overview */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-6">What We Offer</h2>
            <div className="space-y-6">
              {services.map((service, index) => (
                <Card key={index} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-lg">{service.title}</CardTitle>
                    <CardDescription>{service.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {service.features.map((feature, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {feature}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.div>

          {/* Request Form */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MessageCircle className="h-5 w-5 text-blue-600" />
                  <span>Submit Tutoring Request</span>
                </CardTitle>
                <CardDescription>
                  Tell us what you need help with and we'll match you with the right tutor.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isSubmitted ? (
                  <Alert className="border-green-200 bg-green-50">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">
                      <strong>Request Submitted!</strong> We'll review your request and get back to you within 24 hours.
                      Check your dashboard for updates.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                      <FormField
                        control={form.control}
                        name="subject"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Subject Area</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select the subject you need help with" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {subjects.map((subject) => (
                                  <SelectItem key={subject.value} value={subject.value}>
                                    <div className="flex items-center space-x-2">
                                      {subject.icon}
                                      <span>{subject.label}</span>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Request Description</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Please describe what you need help with, including specific topics, assignment details, deadlines, and any particular challenges you're facing..."
                                className="min-h-[120px]"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="priority"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Priority Level</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="low">
                                  <div className="flex items-center space-x-2">
                                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                    <span>Low - General help (1-2 weeks)</span>
                                  </div>
                                </SelectItem>
                                <SelectItem value="medium">
                                  <div className="flex items-center space-x-2">
                                    <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                                    <span>Medium - Assignment due soon (2-7 days)</span>
                                  </div>
                                </SelectItem>
                                <SelectItem value="high">
                                  <div className="flex items-center space-x-2">
                                    <div className="w-2 h-2 rounded-full bg-red-500"></div>
                                    <span>High - Urgent help needed (1-2 days)</span>
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="file_url"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Supporting Documents (Optional)</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Paste a link to your assignment, notes, or other helpful documents"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          <strong>Note:</strong> Our tutors will review your request and provide an estimated
                          timeline and cost before beginning work. All sessions are conducted with certified
                          academic professionals.
                        </AlertDescription>
                      </Alert>

                      <Button type="submit" disabled={isLoading} className="w-full">
                        {isLoading ? "Submitting Request..." : "Submit Tutoring Request"}
                      </Button>
                    </form>
                  </Form>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-center text-white"
        >
          <h2 className="text-2xl font-bold mb-4">Need Immediate Help?</h2>
          <p className="text-lg mb-6 opacity-90">
            Our AI assistant is available 24/7 for quick questions and guidance.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/dashboard">
              <Button size="lg" variant="secondary">
                Chat with AI Assistant
              </Button>
            </Link>
            <Link href="/tutoring">
              <Button size="lg" variant="outline" className="text-white border-white hover:bg-white hover:text-blue-600">
                Browse Tutoring Plans
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default function TutoringSupportPageWithAuth() {
  return (
    <ProtectedRoute>
      <TutoringSupportPage />
    </ProtectedRoute>
  );
}
