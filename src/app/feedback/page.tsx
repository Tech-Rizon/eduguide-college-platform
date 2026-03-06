"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  GraduationCap,
  ArrowLeft,
  Star,
  MessageSquare,
  ThumbsUp,
  Send,
  User,
  CheckCircle
} from "lucide-react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";

interface Review {
  id: string;
  name: string;
  rating: number;
  category: string;
  comment: string;
  date: string;
  helpful: number;
}

const existingReviews: Review[] = [
  {
    id: "1",
    name: "Maria G.",
    rating: 5,
    category: "AI Recommendations",
    comment: "The AI recommended Santa Monica College based on my GPA and budget, and it was the perfect fit! I'm now transferring to UCLA. EduGuide made the whole process so much easier.",
    date: "2026-01-15",
    helpful: 24
  },
  {
    id: "2",
    name: "James T.",
    rating: 5,
    category: "College Discovery",
    comment: "As a first-generation student, I had no idea where to start. EduGuide's AI understood my situation and recommended schools I never would have found on my own. Now I'm thriving!",
    date: "2026-01-10",
    helpful: 18
  },
  {
    id: "3",
    name: "Sophia L.",
    rating: 4,
    category: "Tutoring Support",
    comment: "The tutoring service helped me raise my GPA from 2.5 to 3.4. My tutor was amazing at explaining math concepts. Would love more available time slots though.",
    date: "2025-12-28",
    helpful: 15
  },
  {
    id: "4",
    name: "David K.",
    rating: 5,
    category: "Financial Aid Guidance",
    comment: "I didn't know I qualified for so many scholarships! The AI walked me through FAFSA and found state-specific grants for Texas residents. Saved over $15,000 in my first year.",
    date: "2025-12-20",
    helpful: 31
  },
  {
    id: "5",
    name: "Aaliyah M.",
    rating: 4,
    category: "AI Recommendations",
    comment: "Told the AI my GPA was 3.8 and I wanted computer science - it recommended Georgia Tech and UT Austin which were both great matches. The comparison feature was super helpful.",
    date: "2025-12-15",
    helpful: 12
  },
  {
    id: "6",
    name: "Carlos R.",
    rating: 5,
    category: "Live Support",
    comment: "Had a question about transfer credits at midnight and the live support connected me with an advisor within minutes. Incredibly responsive team!",
    date: "2025-12-08",
    helpful: 9
  }
];

const categories = ["AI Recommendations", "College Discovery", "Tutoring Support", "Financial Aid Guidance", "Live Support", "General"];

export default function FeedbackPage() {
  const [reviews, setReviews] = useState<Review[]>(existingReviews);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [helpedIds, setHelpedIds] = useState<Set<string>>(new Set());

  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : "0";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!rating || !name.trim() || !comment.trim() || !category) {
      toast.error("Please fill in all fields and select a rating");
      return;
    }

    const newReview: Review = {
      id: Date.now().toString(),
      name: name.trim(),
      rating,
      category,
      comment: comment.trim(),
      date: new Date().toISOString().split("T")[0],
      helpful: 0
    };

    setReviews(prev => [newReview, ...prev]);
    setSubmitted(true);
    setRating(0);
    setName("");
    setCategory("");
    setComment("");
    toast.success("Thank you for your feedback!");
  };

  const markHelpful = (id: string) => {
    if (helpedIds.has(id)) return;
    setHelpedIds(prev => new Set(prev).add(id));
    setReviews(prev => prev.map(r => r.id === id ? { ...r, helpful: r.helpful + 1 } : r));
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-purple-50">
      <nav className="flex items-center justify-between p-6 max-w-7xl mx-auto">
        <Link href="/" className="flex items-center space-x-2">
          <GraduationCap className="h-8 w-8 text-blue-600" />
          <span className="text-2xl font-bold text-gray-900">EduGuide</span>
        </Link>
        <div className="flex items-center space-x-4">
          <Link href="/dashboard">
            <Button variant="ghost">Dashboard</Button>
          </Link>
          <Link href="/">
            <Button variant="ghost">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Home
            </Button>
          </Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Student Feedback
          </h1>
          <p className="text-xl text-gray-600">
            See what students are saying and share your EduGuide experience
          </p>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-10">
          <Card className="text-center">
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-yellow-500 flex items-center justify-center gap-1">
                <Star className="h-7 w-7 fill-current" />
                {avgRating}
              </div>
              <p className="text-sm text-gray-500 mt-1">Average Rating</p>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-blue-600">{reviews.length}</div>
              <p className="text-sm text-gray-500 mt-1">Total Reviews</p>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-green-600">
                {reviews.filter(r => r.rating >= 4).length}
              </div>
              <p className="text-sm text-gray-500 mt-1">Positive Reviews</p>
            </CardContent>
          </Card>
        </div>

        {/* Submit Review */}
        <Card className="mb-10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-blue-600" />
              Share Your Experience
            </CardTitle>
            <CardDescription>Help other students by sharing your feedback about EduGuide</CardDescription>
          </CardHeader>
          <CardContent>
            {submitted ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-6"
              >
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-gray-900">Thank you for your feedback!</h3>
                <p className="text-gray-500 mt-1">Your review helps other students make better decisions.</p>
                <Button className="mt-4" onClick={() => setSubmitted(false)}>Write Another Review</Button>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Your Name</label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="First name and last initial"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Category</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    >
                      <option value="">Select a category</option>
                      {categories.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Rating</label>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="p-1"
                      >
                        <Star
                          className={`h-7 w-7 transition-colors ${
                            star <= (hoverRating || rating)
                              ? "text-yellow-500 fill-current"
                              : "text-gray-300"
                          }`}
                        />
                      </button>
                    ))}
                    {rating > 0 && <span className="text-sm text-gray-500 ml-2 self-center">{rating}/5</span>}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Your Review</label>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Share your experience with EduGuide..."
                    rows={4}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm resize-none"
                  />
                </div>

                <Button type="submit" className="w-full">
                  <Send className="h-4 w-4 mr-2" />
                  Submit Review
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        {/* Reviews List */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">Student Reviews</h2>
          {reviews.map((review, index) => (
            <motion.div
              key={review.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(index * 0.05, 0.3) }}
            >
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <User className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{review.name}</p>
                        <div className="flex items-center gap-2">
                          <div className="flex">
                            {[1, 2, 3, 4, 5].map(s => (
                              <Star
                                key={s}
                                className={`h-4 w-4 ${s <= review.rating ? "text-yellow-500 fill-current" : "text-gray-300"}`}
                              />
                            ))}
                          </div>
                          <span className="text-xs text-gray-400">{review.date}</span>
                        </div>
                      </div>
                    </div>
                    <Badge variant="secondary">{review.category}</Badge>
                  </div>

                  <p className="text-gray-700 text-sm leading-relaxed">{review.comment}</p>

                  <div className="mt-3 flex items-center">
                    <button
                      onClick={() => markHelpful(review.id)}
                      disabled={helpedIds.has(review.id)}
                      className={`flex items-center gap-1 text-sm ${
                        helpedIds.has(review.id) ? "text-blue-600" : "text-gray-400 hover:text-blue-600"
                      } transition-colors`}
                    >
                      <ThumbsUp className="h-4 w-4" />
                      Helpful ({review.helpful})
                    </button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
