"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  GraduationCap,
  ArrowLeft,
  BookOpen,
  Users,
  Target,
  Clock,
  CheckCircle,
  MessageCircle,
  FileText,
  Calculator,
  Microscope,
  PenTool,
  Presentation,
  Calendar,
  TrendingUp,
  Award,
  Briefcase,
  Video
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

const services = [
  {
    category: "Admission Help",
    icon: <Target className="h-6 w-6" />,
    color: "bg-blue-100 text-blue-600",
    items: [
      "College selection advice (AI and human guidance)",
      "Application walkthroughs and timeline planning",
      "Statement of Purpose & personal statement reviews",
      "Scholarship research and application support",
      "Interview preparation and mock sessions",
      "Financial aid guidance and FAFSA assistance"
    ]
  },
  {
    category: "Coursework Tutoring",
    icon: <BookOpen className="h-6 w-6" />,
    color: "bg-green-100 text-green-600",
    items: [
      "1-on-1 help with Math, Science, Literature, and more",
      "Essay writing, grammar, and academic editing",
      "Project guidance, research methodology, and presentation support",
      "Online course platform assistance (Moodle, Canvas, Blackboard)",
      "Homework help and assignment completion strategies",
      "Test preparation and study techniques"
    ]
  },
  {
    category: "Academic Planning",
    icon: <Calendar className="h-6 w-6" />,
    color: "bg-purple-100 text-purple-600",
    items: [
      "Personalized study techniques & productivity strategies",
      "Exam revision plans and study schedules",
      "Time management and organizational skills",
      "GPA tracking and academic progress monitoring",
      "Course selection and academic pathway planning",
      "Learning disability support and accommodations"
    ]
  },
  {
    category: "Graduation & Beyond",
    icon: <Award className="h-6 w-6" />,
    color: "bg-orange-100 text-orange-600",
    items: [
      "Internship and externship application support",
      "Final year project and thesis assistance",
      "Resume writing and job interview preparation",
      "Graduate school application guidance",
      "Career transition planning and networking",
      "Professional skill development workshops"
    ]
  }
];

const features = [
  {
    icon: <Users className="h-8 w-8 text-blue-600" />,
    title: "Expert Tutors",
    description: "Certified educators and subject matter experts from top universities"
  },
  {
    icon: <Clock className="h-8 w-8 text-green-600" />,
    title: "Flexible Scheduling",
    description: "24/7 availability with sessions that fit your busy student life"
  },
  {
    icon: <Video className="h-8 w-8 text-purple-600" />,
    title: "Multiple Formats",
    description: "Live video calls, chat support, and in-person sessions available"
  },
  {
    icon: <TrendingUp className="h-8 w-8 text-orange-600" />,
    title: "Progress Tracking",
    description: "Monitor your improvement with detailed analytics and reports"
  }
];

const subjects = [
  { name: "Mathematics", icon: <Calculator className="h-5 w-5" />, popular: true },
  { name: "Science", icon: <Microscope className="h-5 w-5" />, popular: true },
  { name: "English & Literature", icon: <PenTool className="h-5 w-5" />, popular: true },
  { name: "History & Social Studies", icon: <BookOpen className="h-5 w-5" />, popular: false },
  { name: "Computer Science", icon: <Presentation className="h-5 w-5" />, popular: true },
  { name: "Foreign Languages", icon: <MessageCircle className="h-5 w-5" />, popular: false },
  { name: "Business & Economics", icon: <Briefcase className="h-5 w-5" />, popular: false },
  { name: "Test Prep (SAT/ACT)", icon: <FileText className="h-5 w-5" />, popular: true }
];

export default function TutoringPage() {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  // Read published Stripe Price IDs from environment (set these on Netlify)
  const BASIC_PRICE = process.env.NEXT_PUBLIC_STRIPE_PRICE_BASIC ?? ''
  const PREMIUM_PRICE = process.env.NEXT_PUBLIC_STRIPE_PRICE_PREMIUM ?? ''
  const ELITE_PRICE = process.env.NEXT_PUBLIC_STRIPE_PRICE_ELITE ?? ''

  // handleCheckout requires a Stripe Price ID. Inline amounts were removed.
  const handleCheckout = async (priceId: string | undefined, planName?: string) => {
    if (!priceId) {
      toast.error('Payment not configured. Please contact support.');
      return;
    }

    try {
      setLoadingPlan(planName ?? null);
      const payload: Record<string, any> = { plan: planName, priceId };

      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const body = await res.json();

      if (!res.ok) {
        throw new Error(body.error || 'Failed to create checkout session');
      }

      if (body.url) {
        window.location.href = body.url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (err: any) {
      console.error('Checkout error:', err);
      toast.error(err?.message || 'Unable to start checkout');
    } finally {
      setLoadingPlan(null);
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
          <Link href="/">
            <Button variant="ghost">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
                <Button
                  className="w-full mt-6"
                  onClick={() => handleCheckout(2500, 'Basic Support', BASIC_PRICE || undefined)}
                  disabled={loadingPlan !== null && loadingPlan !== 'Basic Support'}
                >
                  {loadingPlan === 'Basic Support' ? 'Processing…' : 'Choose Basic'}
                </Button>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            Academic Support
            <span className="block text-blue-600">That Goes Beyond</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            EduGuide's tutoring support isn't just about assignments — it's your long-term academic partner.
            We support students through every milestone of their journey: from college admission prep to graduating with confidence.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="text-lg px-8 py-6">
              Request Academic Support Now
              <MessageCircle className="ml-2 h-5 w-5" />
                <Button
                  className="w-full mt-6"
                  onClick={() => handleCheckout(4500, 'Premium Support', PREMIUM_PRICE || undefined)}
                  disabled={loadingPlan !== null && loadingPlan !== 'Premium Support'}
                >
                  {loadingPlan === 'Premium Support' ? 'Processing…' : 'Choose Premium'}
                </Button>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="grid md:grid-cols-4 gap-6 mb-16"
        >
          {features.map((feature) => (
            <Card key={feature.title} className="text-center hover:shadow-lg transition-shadow duration-300">
              <CardContent className="pt-6">
                <div className="flex justify-center mb-4">
                  {feature.icon}
                </div>
                <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                <p className="text-gray-600 text-sm">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </motion.div>

        {/* Services */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="mb-16"
        >
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Comprehensive Academic Support Services
          </h2>
          <div className="grid lg:grid-cols-2 gap-8">
            {services.map((service) => (
              <Card key={service.category} className="hover:shadow-lg transition-shadow duration-300">
                <CardHeader>
                  <div className="flex items-center space-x-3">
                    <div className={`p-3 rounded-lg ${service.color}`}>
                      {service.icon}
                    </div>
                    <CardTitle className="text-xl">{service.category}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {service.items.map((item) => (
                      <li key={item} className="flex items-start space-x-2">
                        <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700">{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </motion.div>

        {/* Subjects */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.6 }}
          className="mb-16"
        >
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Subjects We Cover
          </h2>
          <div className="grid md:grid-cols-4 gap-4">
            {subjects.map((subject) => (
              <Card key={subject.name} className="hover:shadow-md transition-shadow duration-300">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <div className="text-blue-600">
                      {subject.icon}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{subject.name}</h3>
                      {subject.popular && (
                        <Badge variant="secondary" className="text-xs mt-1">
                          Popular
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </motion.div>

        {/* How It Works */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.6 }}
          className="mb-16"
        >
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            How Our Tutoring Works
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-blue-600">1</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Assessment & Matching</h3>
              <p className="text-gray-600">
                We assess your needs and match you with the perfect tutor based on your subject, learning style, and goals.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-green-600">2</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Personalized Sessions</h3>
              <p className="text-gray-600">
                Engage in one-on-one sessions tailored to your pace, with flexible scheduling and multiple format options.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-purple-600">3</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Track Progress</h3>
              <p className="text-gray-600">
                Monitor your improvement with detailed analytics, regular assessments, and goal achievement tracking.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Pricing Tiers */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1, duration: 0.6 }}
          className="mb-16"
        >
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Choose Your Support Level
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {/* Basic Plan */}
            <Card className="hover:shadow-lg transition-shadow duration-300">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">Basic Support</CardTitle>
                <CardDescription>Perfect for occasional help</CardDescription>
                <div className="text-3xl font-bold text-blue-600 mt-4">$25/hr</div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span>1-on-1 tutoring sessions</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span>Homework help</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span>Basic progress tracking</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span>Email support</span>
                  </li>
                </ul>
                <Button
                  className="w-full mt-6"
                  onClick={() => handleCheckout(BASIC_PRICE || undefined, 'Basic Support')}
                  disabled={loadingPlan !== null && loadingPlan !== 'Basic Support'}
                >
                  {loadingPlan === 'Basic Support' ? 'Processing…' : 'Choose Basic'}
                <Button
                  className="w-full mt-6"
                  onClick={() => handleCheckout(7500, 'Elite Support', ELITE_PRICE || undefined)}
                  disabled={loadingPlan !== null && loadingPlan !== 'Elite Support'}
                >
                  {loadingPlan === 'Elite Support' ? 'Processing…' : 'Choose Elite'}
                </Button>
                <Badge className="bg-blue-600 text-white">Most Popular</Badge>
              </div>
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">Premium Support</CardTitle>
                <CardDescription>Comprehensive academic assistance</CardDescription>
                <div className="text-3xl font-bold text-blue-600 mt-4">$45/hr</div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span>Everything in Basic</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span>College application support</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span>Essay writing assistance</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span>Study planning & scheduling</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span>Priority support</span>
                  </li>
                </ul>
                <Button
                  className="w-full mt-6"
                  onClick={() => handleCheckout(PREMIUM_PRICE || undefined, 'Premium Support')}
                  disabled={loadingPlan !== null && loadingPlan !== 'Premium Support'}
                >
                  {loadingPlan === 'Premium Support' ? 'Processing…' : 'Choose Premium'}
                </Button>
              </CardContent>
            </Card>

            {/* Elite Plan */}
            <Card className="hover:shadow-lg transition-shadow duration-300">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">Elite Support</CardTitle>
                <CardDescription>Complete academic partnership</CardDescription>
                <div className="text-3xl font-bold text-blue-600 mt-4">$75/hr</div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span>Everything in Premium</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span>Dedicated academic coach</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span>Career planning & guidance</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span>Interview preparation</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span>24/7 chat support</span>
                  </li>
                </ul>
                <Button
                  className="w-full mt-6"
                  onClick={() => handleCheckout(ELITE_PRICE || undefined, 'Elite Support')}
                  disabled={loadingPlan !== null && loadingPlan !== 'Elite Support'}
                >
                  {loadingPlan === 'Elite Support' ? 'Processing…' : 'Choose Elite'}
                </Button>
              </CardContent>
            </Card>
          </div>
        </motion.div>

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.3, duration: 0.6 }}
          className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-12 text-center text-white"
        >
          <h2 className="text-3xl font-bold mb-4">Ready to Excel in Your Studies?</h2>
          <p className="text-xl mb-8 opacity-90">
            Join thousands of students who have improved their grades and achieved their academic goals with EduGuide.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" variant="secondary" className="text-lg px-8 py-6">
              Start Free Trial
              <ArrowLeft className="ml-2 h-5 w-5 rotate-180" />
            </Button>
            <Button size="lg" variant="outline" className="text-lg px-8 py-6 text-white border-white hover:bg-white hover:text-blue-600">
              Talk to an Advisor
              <MessageCircle className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
