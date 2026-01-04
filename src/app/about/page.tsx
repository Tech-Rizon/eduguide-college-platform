"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

/**
 * About page
 *
 * Shares information about the mission and vision of EduGuide. Feel free to customize this content further.
 */
export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 px-6 py-12">
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">About EduGuide</h1>
        <p className="text-lg text-gray-600 mb-8">
          EduGuide is a platform built by educators, engineers, and students dedicated to helping learners find
          the right college and excel academically. We believe every student deserves personalized guidance on
          their educational journey. Our mission is to make that guidance accessible and affordable.
        </p>
        <p className="text-lg text-gray-600 mb-8">
          Our AI assistant and network of certified tutors provide tailored recommendations and support at every stage
          — from choosing a school to crafting a standout application, staying on top of coursework, and preparing for
          your future career.
        </p>
        <p className="text-lg text-gray-600 mb-8">
          If you share our vision or would like to partner with us, please don’t hesitate to get in touch.
        </p>
        <div className="flex justify-center">
          <Link href="/contact" passHref>
            <Button size="lg">Contact Us</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}