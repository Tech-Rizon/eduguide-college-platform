"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap, Search, Users, ArrowRight, Bot, Star, MessageSquareHeart } from "lucide-react";
import Link from "next/link";

function openLiveAdvisor(message?: string, urgent = false) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("eduguide:open-support", {
      detail: {
        live: true,
        message: message ?? "I need help from a live advisor.",
        urgent,
      },
    })
  );
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Navigation */}
      <nav className="flex items-center justify-between p-6 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center space-x-2"
        >
          <GraduationCap className="h-8 w-8 text-blue-600" />
          <span className="text-2xl font-bold text-gray-900">EduGuide</span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center space-x-4"
        >
          <Link href="/colleges">
            <Button variant="ghost">Colleges</Button>
          </Link>
          <Link href="/services">
            <Button variant="ghost">Services</Button>
          </Link>
          <Link href="/tutoring">
            <Button variant="ghost">Tutoring</Button>
          </Link>
          <Link href="/login">
            <Button variant="ghost">Login</Button>
          </Link>
          <Link href="/register">
            <Button>Start Free Student Plan</Button>
          </Link>
        </motion.div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-5xl md:text-6xl font-bold text-gray-900 mb-6"
          >
            Your College Journey
            <span className="block text-blue-600">Starts Here</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto"
          >
            Get AI-powered college recommendations based on your GPA, location, and goals. Discover the perfect school
            from our database of 40+ institutions across the US.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link href="/register">
              <Button size="lg" className="text-lg px-8 py-6">
                Start Free Student Plan
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Button
              size="lg"
              variant="outline"
              className="text-lg px-8 py-6"
              onClick={() => openLiveAdvisor("I need a live advisor for my college plan.")}
            >
              Talk to Live Advisor
              <MessageSquareHeart className="ml-2 h-5 w-5" />
            </Button>
            <Link href="/demo">
              <Button size="lg" variant="outline" className="text-lg px-8 py-6">
                Try AI Demo
                <Bot className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </motion.div>
        </div>

        {/* Features Grid */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="grid md:grid-cols-3 gap-8 mt-20"
        >
          <Card className="hover:shadow-lg transition-shadow duration-300 border-l-4 border-blue-600">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <Bot className="h-6 w-6 text-blue-600" />
                <CardTitle>AI College Matching</CardTitle>
              </div>
              <CardDescription>Smart GPA-based recommendations</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Tell us your GPA, location, and goals. Our AI analyzes your profile against 40+ colleges to find your
                best matches - including community colleges and universities.
              </p>
              <Link href="/demo">
                <Button variant="link" className="mt-2 p-0">
                  Try it now &rarr;
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow duration-300 border-l-4 border-green-600">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <Search className="h-6 w-6 text-green-600" />
                <CardTitle>College Discovery</CardTitle>
              </div>
              <CardDescription>Search and filter 40+ schools</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Browse our comprehensive database with detailed info on tuition, acceptance rates, majors, financial
                aid, and graduation rates. Filter by state, type, and budget.
              </p>
              <Link href="/colleges">
                <Button variant="link" className="mt-2 p-0">
                  Explore colleges &rarr;
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow duration-300 border-l-4 border-purple-600">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <Users className="h-6 w-6 text-purple-600" />
                <CardTitle>Expert Support</CardTitle>
              </div>
              <CardDescription>Tutoring, essays & live help</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Get 1-on-1 tutoring, essay review, admissions coaching, and live support from our team of certified
                educators and college counselors.
              </p>
              <Link href="/services">
                <Button variant="link" className="mt-2 p-0">
                  View services &rarr;
                </Button>
              </Link>
            </CardContent>
          </Card>
        </motion.div>

        {/* Stats Section */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-20 text-center"
        >
          <div className="p-6 bg-blue-50 rounded-lg">
            <div className="text-3xl font-bold text-blue-600 mb-2">40+</div>
            <div className="text-gray-600">Colleges & Universities</div>
          </div>
          <div className="p-6 bg-green-50 rounded-lg">
            <div className="text-3xl font-bold text-green-600 mb-2">24/7</div>
            <div className="text-gray-600">AI Assistant Available</div>
          </div>
          <div className="p-6 bg-purple-50 rounded-lg">
            <div className="text-3xl font-bold text-purple-600 mb-2">95%</div>
            <div className="text-gray-600">Student Satisfaction</div>
          </div>
          <div className="p-6 bg-orange-50 rounded-lg">
            <div className="text-3xl font-bold text-orange-600 mb-2">10k+</div>
            <div className="text-gray-600">Students Helped</div>
          </div>
        </motion.div>

        {/* Mid CTA */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1 }}
          className="mt-14 bg-white rounded-2xl border shadow-sm p-8 text-center"
        >
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Need a Real Person to Guide Next Steps?</h2>
          <p className="text-gray-600 mb-6">
            Start free and escalate to a live advisor anytime. Every request is queued and assigned in backoffice.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register">
              <Button size="lg">Start Free Student Plan</Button>
            </Link>
            <Button
              size="lg"
              variant="outline"
              onClick={() => openLiveAdvisor("Please connect me with a live advisor for next steps.")}
            >
              Talk to Live Advisor
            </Button>
          </div>
        </motion.div>

        {/* How It Works */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2 }}
          className="mt-20"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-12">How It Works</h2>
          <div className="grid md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                1
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Share Your Profile</h3>
              <p className="text-gray-600">Tell us your GPA, preferred state, intended major, and budget level.</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-green-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                2
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Get AI Matches</h3>
              <p className="text-gray-600">
                Our engine scores every school against your profile and recommends the best fits.
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                3
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Explore & Compare</h3>
              <p className="text-gray-600">
                Browse detailed college profiles with tuition, acceptance rates, majors, and aid info.
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-orange-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                4
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Apply with Confidence</h3>
              <p className="text-gray-600">
                Get tutoring, essay help, and admissions support for your applications.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Testimonials */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.3 }}
          className="mt-20"
        >
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">What Students Say</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                name: "Maria G.",
                quote: "EduGuide's AI recommended community colleges I never knew about. Now I'm transferring to UCLA!",
                rating: 5,
              },
              {
                name: "James T.",
                quote: "As a first-gen student, the recommendations changed my life. Now I'm at Howard University.",
                rating: 5,
              },
              {
                name: "David K.",
                quote: "The financial aid guidance helped me find $15,000 in scholarships I didn't know I qualified for.",
                rating: 5,
              },
            ].map((testimonial) => (
              <Card key={testimonial.name} className="hover:shadow-lg transition-shadow duration-300">
                <CardContent className="pt-6">
                  <div className="flex gap-0.5 mb-3">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-4 w-4 ${star <= testimonial.rating ? "text-yellow-500 fill-current" : "text-gray-300"}`}
                      />
                    ))}
                  </div>
                  <p className="text-gray-600 italic mb-4">&ldquo;{testimonial.quote}&rdquo;</p>
                  <p className="font-semibold text-gray-900">- {testimonial.name}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="text-center mt-6">
            <Link href="/feedback">
              <Button variant="outline">Read More Reviews &rarr;</Button>
            </Link>
          </div>
        </motion.div>

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.4 }}
          className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-12 text-center text-white mt-20"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Find Your Perfect College?</h2>
          <p className="text-lg mb-8 opacity-90 max-w-2xl mx-auto">
            Join thousands of students who&apos;ve found their ideal college with EduGuide. Start your journey today -
            it&apos;s free.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register">
              <Button size="lg" variant="secondary" className="text-lg px-8 py-6">
                Start Free Student Plan
              </Button>
            </Link>
            <Button
              size="lg"
              variant="outline"
              className="text-lg px-8 py-6 bg-transparent text-white border-white hover:bg-white hover:text-blue-600"
              onClick={() => openLiveAdvisor("I want to talk to a live advisor before applying.")}
            >
              Talk to Live Advisor
            </Button>
            <Link href="/demo">
              <Button
                size="lg"
                variant="outline"
                className="text-lg px-8 py-6 bg-transparent text-white border-white hover:bg-white hover:text-blue-600"
              >
                Try AI Demo
              </Button>
            </Link>
          </div>
          <div className="mt-4">
            <Button
              variant="link"
              className="text-white underline-offset-4 hover:underline"
              onClick={() =>
                openLiveAdvisor(
                  "Urgent: I need immediate support from a live advisor with guaranteed queue assignment.",
                  true
                )
              }
            >
              Urgent? Escalate to Support Team Now
            </Button>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 mt-20">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            {/* Brand */}
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <GraduationCap className="h-6 w-6 text-blue-400" />
                <span className="text-xl font-bold text-white">EduGuide</span>
              </div>
              <p className="text-sm text-gray-400">
                Your AI-powered guide to finding the perfect college and achieving your educational goals.
              </p>
            </div>

            {/* Platform */}
            <div>
              <h3 className="text-white font-semibold mb-4">Platform</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/demo" className="hover:text-blue-400 transition">
                    AI Advisor Demo
                  </Link>
                </li>
                <li>
                  <Link href="/colleges" className="hover:text-blue-400 transition">
                    College Discovery
                  </Link>
                </li>
                <li>
                  <Link href="/dashboard" className="hover:text-blue-400 transition">
                    Dashboard
                  </Link>
                </li>
                <li>
                  <Link href="/services" className="hover:text-blue-400 transition">
                    Our Services
                  </Link>
                </li>
              </ul>
            </div>

            {/* Support */}
            <div>
              <h3 className="text-white font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/help" className="hover:text-blue-400 transition">
                    Help Center
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="hover:text-blue-400 transition">
                    Contact Us
                  </Link>
                </li>
                <li>
                  <Link href="/faq" className="hover:text-blue-400 transition">
                    FAQ
                  </Link>
                </li>
                <li>
                  <Link href="/feedback" className="hover:text-blue-400 transition">
                    Student Reviews
                  </Link>
                </li>
                <li>
                  <Link href="/tutoring" className="hover:text-blue-400 transition">
                    Tutoring Plans
                  </Link>
                </li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <h3 className="text-white font-semibold mb-4">Company</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/about" className="hover:text-blue-400 transition">
                    About
                  </Link>
                </li>
                <li>
                  <Link href="/privacy" className="hover:text-blue-400 transition">
                    Privacy
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="hover:text-blue-400 transition">
                    Terms
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 text-sm text-gray-400 text-center">
            <p>&copy; 2026 EduGuide. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
