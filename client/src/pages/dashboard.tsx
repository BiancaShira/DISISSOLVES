import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/components/sidebar";
import { QuestionCard } from "@/components/question-card";
import { RaiseIssueModal } from "@/components/raise-issue-modal";
import { useAuth } from "@/hooks/use-auth";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Plus, Users, CheckCircle, Hourglass, TrendingUp } from "lucide-react";
import type { QuestionWithAuthor } from "@shared/schema";

export default function Dashboard() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortBy, setSortBy] = useState("recent");
  const [showRaiseIssueModal, setShowRaiseIssueModal] = useState(false);

  // Fetch questions
  const { data: questions = [], isLoading: questionsLoading } = useQuery<QuestionWithAuthor[]>({
    queryKey: ["/api/questions", { category: categoryFilter, status: statusFilter, search: searchQuery, sortBy }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (categoryFilter) params.append("category", categoryFilter);
      if (statusFilter) params.append("status", statusFilter);
      if (searchQuery) params.append("search", searchQuery);
      if (sortBy) params.append("sortBy", sortBy);
      
      const response = await fetch(`/api/questions?${params}`);
      if (!response.ok) throw new Error("Failed to fetch questions");
      return response.json();
    },
  });

  // Fetch stats (admin only)
  const { data: stats } = useQuery({
    queryKey: ["/api/stats"],
    queryFn: async () => {
      const response = await fetch("/api/stats");
      if (!response.ok) throw new Error("Failed to fetch stats");
      return response.json();
    },
    enabled: user?.role === "admin",
  });

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      
      {/* Main Content */}
      <main className="ml-64 min-h-screen">
        {/* Header */}
        <header className="bg-card border-b border-border p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h2 className="text-2xl font-bold text-foreground">Dashboard</h2>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-muted-foreground">Welcome back,</span>
                <span className="text-sm font-medium text-primary">
                  {user?.firstName || user?.username}
                </span>
              </div>
            </div>
            
            {/* Search */}
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search issues..."
                  className="pl-10 w-80"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>
        </header>

        <div className="p-6">
          {/* Stats Overview (Admin only) */}
          {user?.role === "admin" && stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Questions</p>
                      <p className="text-3xl font-bold text-foreground">{stats.totalQuestions}</p>
                    </div>
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                      <TrendingUp className="text-blue-600 dark:text-blue-400 h-6 w-6" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Pending Approvals</p>
                      <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">{stats.pendingApprovals}</p>
                    </div>
                    <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/20 rounded-lg flex items-center justify-center">
                      <Hourglass className="text-orange-600 dark:text-orange-400 h-6 w-6" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Active Users</p>
                      <p className="text-3xl font-bold text-foreground">{stats.activeUsers}</p>
                    </div>
                    <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                      <Users className="text-green-600 dark:text-green-400 h-6 w-6" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Resolution Rate</p>
                      <p className="text-3xl font-bold text-foreground">{stats.resolutionRate}%</p>
                    </div>
                    <div className="w-12 h-12 bg-lime-100 dark:bg-lime-900/20 rounded-lg flex items-center justify-center">
                      <CheckCircle className="text-lime-600 dark:text-lime-400 h-6 w-6" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <h3 className="text-lg font-semibold text-foreground">Filter Questions</h3>
                
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center space-x-2">
                    <label className="text-sm font-medium text-foreground">Category:</label>
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="All Categories" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All Categories</SelectItem>
                        <SelectItem value="ibml">IBML Scanners</SelectItem>
                        <SelectItem value="softtrac">SoftTrac</SelectItem>
                        <SelectItem value="omniscan">OmniScan</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center space-x-2">
                    <label className="text-sm font-medium text-foreground">Status:</label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="All Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All Status</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center space-x-2">
                    <label className="text-sm font-medium text-foreground">Sort by:</label>
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="trending">Trending</SelectItem>
                        <SelectItem value="recent">Most Recent</SelectItem>
                        <SelectItem value="views">Most Viewed</SelectItem>
                        <SelectItem value="answers">Most Answers</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Questions List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-foreground">Questions</h3>
              <Button 
                onClick={() => setShowRaiseIssueModal(true)}
                className="bg-lime-green text-dark-green hover:bg-lime-green/90"
              >
                <Plus className="mr-2 h-4 w-4" />
                Raise New Issue
              </Button>
            </div>

            {questionsLoading ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Loading questions...</p>
              </div>
            ) : questions.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground">No questions found matching your criteria.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {questions.map((question) => (
                  <QuestionCard key={question.id} question={question} />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Raise Issue Modal */}
      <RaiseIssueModal 
        open={showRaiseIssueModal} 
        onOpenChange={setShowRaiseIssueModal}
      />
    </div>
  );
}
