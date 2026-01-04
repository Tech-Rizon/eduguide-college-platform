"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

/**
 * FAQ page
 *
 * Contains a few frequently asked questions. You can expand this list with more questions as needed.
 */
const faqs = [
  {
    question: "What services does EduGuide provide?",
    answer:
      "EduGuide helps students discover colleges, connect with our AI assistant for guidance, and access personalized tutoring and academic support."
  },
  {
    question: "How do I get started?",
    answer:
      "Simply create an account by clicking the ‘Get Started’ button on the home page, then complete your profile to begin receiving recommendations."
  },
  {
    question: "Is EduGuide free to use?",
    answer:
      "You can try our AI assistant for free via the demo chat. For personalized tutoring support, we offer a range of paid plans starting at $25/hr."
  },
  {
    question: "Do I need to be logged in to submit tutoring requests?",
    answer:
      "Yes. Submitting a tutoring request requires an account so we can match you with the right tutor and keep track of your sessions."
  },
];

export default function FAQPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 px-6 py-12">
      <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-8 text-center">Frequently Asked Questions</h1>
      <div className="max-w-3xl mx-auto space-y-6">
        {faqs.map((faq, idx) => (
          <Card key={idx} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">{faq.question}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700">{faq.answer}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="mt-12 flex justify-center">
        <Link href="/contact" passHref>
          <Button variant="outline">Still have questions? Contact us</Button>
        </Link>
      </div>
    </div>
  );
}