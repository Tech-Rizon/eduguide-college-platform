"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  GraduationCap,
  ArrowLeft,
  Search,
  MapPin,
  DollarSign,
  Users,
  BookOpen,
  Star,
  TrendingUp,
  Filter,
  ExternalLink,
  MessageSquareHeart,
  Bookmark,
  X
} from "lucide-react";
import { motion } from "framer-motion";
import { collegeDatabase, getStates, getCollegeTypes, type CollegeEntry } from "@/lib/collegeDatabase";

function openLiveAdvisor(message: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("eduguide:open-support", {
      detail: {
        live: true,
        message,
      },
    })
  );
}

export default function CollegesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedState, setSelectedState] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [maxTuition, setMaxTuition] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [savedCollegeIds, setSavedCollegeIds] = useState<string[]>([]);

  const states = getStates();
  const types = getCollegeTypes();

  const filteredColleges = useMemo(() => {
    let results = [...collegeDatabase];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      results = results.filter(c =>
        c.name.toLowerCase().includes(query) ||
        c.city.toLowerCase().includes(query) ||
        c.state.toLowerCase().includes(query) ||
        c.description.toLowerCase().includes(query) ||
        c.majors.some(m => m.toLowerCase().includes(query)) ||
        c.tags.some(t => t.includes(query))
      );
    }

    if (selectedState) {
      results = results.filter(c => c.state === selectedState);
    }

    if (selectedType) {
      results = results.filter(c => c.type === selectedType);
    }

    if (maxTuition) {
      const max = Number.parseInt(maxTuition);
      if (!Number.isNaN(max)) {
        results = results.filter(c => c.tuitionInState <= max);
      }
    }

    return results.sort((a, b) => a.ranking - b.ranking);
  }, [searchQuery, selectedState, selectedType, maxTuition]);

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedState("");
    setSelectedType("");
    setMaxTuition("");
  };

  const toggleSaveCollege = (collegeId: string) => {
    setSavedCollegeIds((previous) =>
      previous.includes(collegeId) ? previous.filter((id) => id !== collegeId) : [...previous, collegeId]
    );
  };

  const hasActiveFilters = searchQuery || selectedState || selectedType || maxTuition;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
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
          <Link href="/register">
            <Button>Get Started</Button>
          </Link>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            College Discovery
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Explore {collegeDatabase.length} colleges and universities. Filter by location, type, budget, and more.
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Save schools as you browse, then ask a live advisor about fit, costs, and deadlines.
          </p>
        </motion.div>

        {/* Search & Filters */}
        <div className="mb-8 space-y-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, state, city, or major..."
                className="pl-10"
              />
            </div>
            <Button
              variant={showFilters ? "default" : "outline"}
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
            {hasActiveFilters && (
              <Button variant="ghost" onClick={clearFilters}>
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}
          </div>

          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-white rounded-lg border shadow-sm"
            >
              <div>
                <label htmlFor="college-filter-state" className="text-sm font-medium text-gray-700 mb-1 block">State</label>
                <select
                  id="college-filter-state"
                  value={selectedState}
                  onChange={(e) => setSelectedState(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="">All States</option>
                  {states.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="college-filter-type" className="text-sm font-medium text-gray-700 mb-1 block">Type</label>
                <select
                  id="college-filter-type"
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="">All Types</option>
                  {types.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="college-filter-tuition" className="text-sm font-medium text-gray-700 mb-1 block">Max In-State Tuition</label>
                <select
                  id="college-filter-tuition"
                  value={maxTuition}
                  onChange={(e) => setMaxTuition(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="">Any Budget</option>
                  <option value="5000">Under $5,000</option>
                  <option value="10000">Under $10,000</option>
                  <option value="15000">Under $15,000</option>
                  <option value="25000">Under $25,000</option>
                  <option value="50000">Under $50,000</option>
                </select>
              </div>
            </motion.div>
          )}

          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>Showing {filteredColleges.length} of {collegeDatabase.length} colleges</span>
            {hasActiveFilters && (
              <div className="flex gap-2">
                {selectedState && <Badge variant="secondary">{selectedState}</Badge>}
                {selectedType && <Badge variant="secondary">{selectedType}</Badge>}
                {maxTuition && <Badge variant="secondary">Under ${Number(maxTuition).toLocaleString()}</Badge>}
              </div>
            )}
          </div>
        </div>

        {/* Results */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredColleges.map((college, index) => (
            <motion.div
              key={college.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(index * 0.05, 0.5) }}
            >
              <CollegeCard
                college={college}
                isSaved={savedCollegeIds.includes(college.id)}
                onToggleSave={() => toggleSaveCollege(college.id)}
                onAskAdvisor={() =>
                  openLiveAdvisor(
                    `I need advisor guidance for ${college.name} (${college.location}). Please help me evaluate fit, affordability, and key application deadlines.`
                  )
                }
              />
            </motion.div>
          ))}
        </div>

        {filteredColleges.length === 0 && (
          <div className="text-center py-16">
            <Search className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">No colleges found</h3>
            <p className="text-gray-500 mb-4">Try adjusting your search or filters</p>
            <Button variant="outline" onClick={clearFilters}>Clear Filters</Button>
          </div>
        )}

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-center text-white"
        >
          <h2 className="text-2xl font-bold mb-4">Need Personalized Recommendations?</h2>
          <p className="text-lg mb-6 opacity-90">
            Our AI advisor can match you with the best schools based on your GPA, location, major, and budget.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/demo">
              <Button size="lg" variant="secondary" className="text-lg px-8 py-6">
                Try AI Advisor
              </Button>
            </Link>
            <Button
              size="lg"
              variant="outline"
              className="text-lg px-8 py-6 text-white border-white hover:bg-white hover:text-blue-600"
              onClick={() =>
                openLiveAdvisor(
                  "I need a live advisor to review the schools I'm considering and recommend the next best application steps."
                )
              }
            >
              Talk to Live Advisor
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function CollegeCard({
  college,
  isSaved,
  onToggleSave,
  onAskAdvisor,
}: {
  college: CollegeEntry;
  isSaved: boolean;
  onToggleSave: () => void;
  onAskAdvisor: () => void;
}) {
  const typeColors: Record<string, string> = {
    "Community College": "bg-green-100 text-green-700",
    "Public University": "bg-blue-100 text-blue-700",
    "Private University": "bg-purple-100 text-purple-700",
    "Technical College": "bg-gray-100 text-gray-700",
  };

  return (
    <Card className="hover:shadow-lg transition-shadow duration-300 h-full flex flex-col">
      <CardContent className="p-5 flex-1 flex flex-col">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 leading-tight flex items-center gap-1">
              {college.name}
              <a
                href={college.website}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Visit ${college.name} website`}
                className="text-blue-600 hover:text-blue-800"
              >
                <ExternalLink className="h-3 w-3" />
              </a>
            </h3>
            <Badge className={`mt-1 text-xs ${typeColors[college.type] || "bg-gray-100 text-gray-700"}`}>
              {college.type}
            </Badge>
          </div>
          <div className="flex items-center gap-1 ml-2">
            <Star className="h-4 w-4 text-yellow-500 fill-current" />
            <span className="text-sm font-bold">#{college.ranking}</span>
          </div>
        </div>

        <div className="space-y-2 text-sm text-gray-600 flex-1">
          <div className="flex items-center">
            <MapPin className="h-3.5 w-3.5 mr-1.5 shrink-0 text-gray-400" />
            {college.location}
          </div>
          <div className="flex items-center">
            <DollarSign className="h-3.5 w-3.5 mr-1.5 shrink-0 text-gray-400" />
            <span className="truncate">{college.tuition}</span>
          </div>
          <div className="flex items-center">
            <Users className="h-3.5 w-3.5 mr-1.5 shrink-0 text-gray-400" />
            Acceptance: {college.acceptanceRate}
          </div>
          <div className="flex items-center">
            <TrendingUp className="h-3.5 w-3.5 mr-1.5 shrink-0 text-gray-400" />
            Graduation: {college.graduationRate}% | Aid: {college.financialAidPercent}%
          </div>
          {college.avgGPA > 0 && (
            <div className="flex items-center">
              <BookOpen className="h-3.5 w-3.5 mr-1.5 shrink-0 text-gray-400" />
              Avg GPA: {college.avgGPA} | Enrollment: {college.enrollmentSize.toLocaleString()}
            </div>
          )}
        </div>

        <div className="mt-3 flex flex-wrap gap-1">
          {college.majors.slice(0, 3).map(m => (
            <Badge key={m} variant="secondary" className="text-xs">{m}</Badge>
          ))}
          {college.majors.length > 3 && (
            <Badge variant="secondary" className="text-xs">+{college.majors.length - 3}</Badge>
          )}
        </div>

        <p className="mt-3 text-xs text-gray-500 line-clamp-2">{college.description}</p>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button size="sm" variant={isSaved ? "default" : "outline"} onClick={onToggleSave}>
            <Bookmark className="h-3.5 w-3.5 mr-1" />
            {isSaved ? "Saved" : "Save School"}
          </Button>
          <Button size="sm" variant="outline" onClick={onAskAdvisor}>
            <MessageSquareHeart className="h-3.5 w-3.5 mr-1" />
            Ask Advisor
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
