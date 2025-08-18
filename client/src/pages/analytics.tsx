import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/components/sidebar";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, TrendingUp, Users, MessageCircle, Eye, Clock } from "lucide-react";

export default function Analytics() {
  const { user } = useAuth();

  // Fetch comprehensive stats
  const { data: stats, isLoading } = useQuery({
    queryKey: ["/api/analytics"],
    queryFn: async () => {
      const response = await fetch("/api/analytics");
      if (!response.ok) throw new Error("Failed to fetch analytics");
      return response.json();
    },
    enabled: user?.role === "admin",
  });

  const { data: trendingQuestions = [] } = useQuery({
    queryKey: ["/api/questions", { sortBy: "trending", limit: 5 }],
    queryFn: async () => {
      const response = await fetch("/api/questions?sortBy=trending&limit=5");
      if (!response.ok) throw new Error("Failed to fetch trending questions");
      return response.json();
    },
    enabled: user?.role === "admin",
  });

  // Redirect if not admin
  if (user?.role !== "admin") {
    return (
      <div className="min-h-screen bg-background">
        <Sidebar />
        <main className="ml-64 min-h-screen p-8">
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">Access denied. Admin privileges required.</p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      
      <main className="ml-64 min-h-screen p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Analytics Dashboard</h1>
            <p className="text-muted-foreground">System activity and performance metrics</p>
          </div>

          {isLoading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Loading analytics...</p>
            </div>
          ) : (
            <>
              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <Card data-testid="card-total-questions">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Questions</CardTitle>
                    <MessageCircle className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats?.totalQuestions || 0}</div>
                    <p className="text-xs text-muted-foreground">
                      {stats?.questionsThisWeek || 0} this week
                    </p>
                  </CardContent>
                </Card>

                <Card data-testid="card-total-answers">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Answers</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats?.totalAnswers || 0}</div>
                    <p className="text-xs text-muted-foreground">
                      {stats?.answersThisWeek || 0} this week
                    </p>
                  </CardContent>
                </Card>

                <Card data-testid="card-pending-approvals">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats?.pendingApprovals || 0}</div>
                    <p className="text-xs text-muted-foreground">
                      Questions + Answers
                    </p>
                  </CardContent>
                </Card>

                <Card data-testid="card-total-views">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Views</CardTitle>
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats?.totalViews || 0}</div>
                    <p className="text-xs text-muted-foreground">
                      All time views
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Questions by Category */}
                <Card data-testid="card-questions-by-category">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <BarChart3 className="h-5 w-5" />
                      <span>Questions by Category</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {stats?.questionsByCategory?.map((item: any) => (
                        <div key={item.category} className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
                              {item.category === "ibml" ? "IBML Scanners" : 
                               item.category === "softtrac" ? "SoftTrac" : 
                               item.category === "omniscan" ? "OmniScan" : item.category}
                            </Badge>
                          </div>
                          <span className="font-semibold">{item.count}</span>
                        </div>
                      )) || (
                        <p className="text-muted-foreground text-center">No data available</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Trending Issues */}
                <Card data-testid="card-trending-issues">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <TrendingUp className="h-5 w-5" />
                      <span>Trending Issues</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {trendingQuestions.length > 0 ? (
                        trendingQuestions.map((question: any) => (
                          <div key={question.id} className="border-b border-border last:border-b-0 pb-3 last:pb-0">
                            <h4 className="font-medium text-sm mb-1">{question.title}</h4>
                            <div className="flex items-center space-x-3 text-xs text-muted-foreground">
                              <span className="flex items-center space-x-1">
                                <Eye className="h-3 w-3" />
                                <span>{question.views}</span>
                              </span>
                              <span className="flex items-center space-x-1">
                                <MessageCircle className="h-3 w-3" />
                                <span>{question.answerCount}</span>
                              </span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-muted-foreground text-center">No trending questions</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* User Engagement */}
              <Card className="mt-8" data-testid="card-user-engagement">
                <CardHeader>
                  <CardTitle>User Engagement</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-dark-green">{stats?.activeUsers || 0}</div>
                      <p className="text-sm text-muted-foreground">Active Users</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-lime-green">{stats?.avgQuestionsPerUser || 0}</div>
                      <p className="text-sm text-muted-foreground">Avg Questions/User</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{stats?.avgAnswersPerQuestion || 0}</div>
                      <p className="text-sm text-muted-foreground">Avg Answers/Question</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </main>
    </div>
  );
}