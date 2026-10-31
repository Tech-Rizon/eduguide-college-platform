"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  GraduationCap,
  ArrowLeft,
  Bot,
  Search,
  Users,
  BookOpen,
  DollarSign,
  MessageCircle,
  Target,
  TrendingUp,
  Award,
  Calendar,
  FileText,
  Headphones,
  CheckCircle,
  ArrowRight,
  Sparkles
} from "lucide-react";
import { motion } from "framer-motion";

const services = [
  {
    icon: <Bot className="h-8 w-8" />,
    title: "AI College Matching",
    description: "Our smart recommendation engine analyzes your GPA, location, demographics, and career goals to match you with the best-fit colleges and universities.",
    features: [
      "GPA-based college matching",
      "Location and state preferences",
      "Budget-aware recommendations",
      "Community college discovery",
      "Transfer pathway guidance",
      "Major/career alignment"
    ],
    color: "bg-blue-100 text-blue-600",
    badge: "Core Feature",
    link: "/demo",
    linkText: "Try AI Advisor"
  },
  {
    icon: <Search className="h-8 w-8" />,
    title: "College Discovery Database",
    description: "Browse our comprehensive database of colleges and universities with detailed information on tuition, acceptance rates, majors, financial aid, and more.",
    features: [
      "40+ colleges & universities",
      "Detailed tuition breakdowns",
      "Acceptance rate & GPA requirements",
      "Major programs listed",
      "Financial aid percentages",
      "Search & filter by any criteria"
    ],
    color: "bg-green-100 text-green-600",
    badge: "New",
    link: "/colleges",
    linkText: "Explore Colleges"
  },
  {
    icon: <BookOpen className="h-8 w-8" />,
    title: "Academic Tutoring",
    description: "One-on-one expert tutoring across all subjects with flexible scheduling, progress tracking, and personalized study plans.",
    features: [
      "1-on-1 expert tutoring",
      "Math, Science, English & more",
      "Essay writing assistance",
      "Test prep (SAT/ACT)",
      "Study planning & scheduling",
      "Progress tracking & analytics"
    ],
    color: "bg-purple-100 text-purple-600",
    badge: "Popular",
    link: "/tutoring",
    linkText: "View Plans"
  },
  {
    icon: <DollarSign className="h-8 w-8" />,
    title: "Financial Aid Guidance",
    description: "Get expert help navigating FAFSA, finding scholarships, understanding grants, and planning your college budget.",
    features: [
      "FAFSA filing assistance",
      "Scholarship search & matching",
      "Grant eligibility assessment",
      "Student loan counseling",
      "State-specific aid programs",
      "Budget planning tools"
    ],
    color: "bg-yellow-100 text-yellow-600",
    badge: "Essential",
    link: "/dashboard",
    linkText: "Get Guidance"
  },
  {
    icon: <Target className="h-8 w-8" />,
    title: "Admissions Support",
    description: "Comprehensive support through the entire college application process from essay writing to interview preparation.",
    features: [
      "Application strategy planning",
      "Personal statement review",
      "Letter of recommendation guidance",
      "Interview preparation",
      "Deadline tracking",
      "Application fee waiver assistance"
    ],
    color: "bg-red-100 text-red-600",
    badge: "Premium",
    link: "/tutoring",
    linkText: "Get Support"
  },
  {
    icon: <Headphones className="h-8 w-8" />,
    title: "Live Support",
    description: "Connect with real academic advisors and support staff for immediate help with any questions about your college journey.",
    features: [
      "Real-time chat support",
      "Academic advisor access",
      "Quick response times",
      "Available during business hours",
      "Follow-up support",
      "Escalation to specialists"
    ],
    color: "bg-indigo-100 text-indigo-600",
    badge: "New",
    link: "/contact",
    linkText: "Contact Us"
  }
];

const process_steps = [
  {
    step: 1,
    title: "Create Your Profile",
    description: "Sign up and share your academic details - GPA, location, intended major, and budget preferences.",
    icon: <Users className="h-6 w-6" />
  },
  {
    step: 2,
    title: "Get AI Recommendations",
    description: "Our AI engine instantly matches you with colleges based on your unique profile and goals.",
    icon: <Sparkles className="h-6 w-6" />
  },
  {
    step: 3,
    title: "Explore & Compare",
    description: "Browse detailed college profiles, compare options side-by-side, and narrow down your choices.",
    icon: <Search className="h-6 w-6" />
  },
  {
    step: 4,
    title: "Apply with Confidence",
    description: "Get tutoring, essay help, and admissions support to submit your strongest application.",
    icon: <Award className="h-6 w-6" />
  }
];

export default function ServicesPage() {
  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-purple-50">
      <nav className="flex items-center justify-between p-6 max-w-7xl mx-auto">
        <Link href="/" className="flex items-center space-x-2">
          <GraduationCap className="h-8 w-8 text-blue-600" />
          <span className="text-2xl font-bold text-gray-900">EduGuide</span>
        </Link>
        <div className="flex items-center space-x-4">
          <Link href="/colleges">
            <Button variant="ghost">Colleges</Button>
          </Link>
          <Link href="/tutoring">
            <Button variant="ghost">Tutoring</Button>
          </Link>
          <Link href="/">
            <Button variant="ghost">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Home
            </Button>
          </Link>
          <Link href="/register">
            <Button>Get Started</Button>
          </Link>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Our Services
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Everything you need for your college journey - from AI-powered matching to expert tutoring and admissions support.
          </p>
        </motion.div>

        {/* Services Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-20">
          {services.map((service, index) => (
            <motion.div
              key={service.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="h-full flex flex-col hover:shadow-lg transition-shadow duration-300">
                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <div className={`p-3 rounded-lg ${service.color}`}>
                      {service.icon}
                    </div>
                    <Badge variant="secondary">{service.badge}</Badge>
                  </div>
                  <CardTitle className="text-xl">{service.title}</CardTitle>
                  <CardDescription>{service.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <ul className="space-y-2 flex-1">
                    {service.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-sm text-gray-600">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Link href={service.link} className="mt-4">
                    <Button variant="outline" className="w-full">
                      {service.linkText}
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* How It Works */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-20"
        >
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">How EduGuide Works</h2>
          <div className="grid md:grid-cols-4 gap-8">
            {process_steps.map((step) => (
              <div key={step.step} className="text-center">
                <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto mb-4">
                  {step.icon}
                </div>
                <div className="text-sm font-medium text-blue-600 mb-1">Step {step.step}</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-sm text-gray-600">{step.description}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-20"
        >
          <Card className="text-center">
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-blue-600">40+</div>
              <p className="text-sm text-gray-500">Colleges in Database</p>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-green-600">24/7</div>
              <p className="text-sm text-gray-500">AI Available</p>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-purple-600">95%</div>
              <p className="text-sm text-gray-500">Student Satisfaction</p>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-orange-600">10k+</div>
              <p className="text-sm text-gray-500">Students Helped</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-linear-to-r from-blue-600 to-purple-600 rounded-2xl p-12 text-center text-white"
        >
          <h2 className="text-3xl font-bold mb-4">Start Your College Journey Today</h2>
          <p className="text-lg mb-8 opacity-90 max-w-2xl mx-auto">
            Join thousands of students who have found their perfect college match with EduGuide. All core features are free to use.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register">
              <Button size="lg" variant="secondary" className="text-lg px-8 py-6">
                Get Started Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/demo">
              <Button size="lg" variant="outline" className="text-lg px-8 py-6 text-white border-white hover:bg-white hover:text-blue-600">
                Try AI Demo
                <Bot className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
