import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Sidebar } from "@/components/sidebar";
import { RaiseIssueModal } from "@/components/raise-issue-modal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, TrendingUp, Users, CheckCircle, Clock, Eye } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const COLORS = ['#052E16', '#84CC16', '#22c55e', '#16a34a', '#15803d'];

export default function Analytics() {
  const { user } = useAuth();
  const [showRaiseIssueModal, setShowRaiseIssueModal] = useState(false);

  const handleRaiseIssue = () => {
    setShowRaiseIssueModal(true);
  };

  const { data: analytics, isLoading } = useQuery({
    queryKey: ["/api/analytics"],
    queryFn: async () => {
      const response = await fetch("/api/analytics");
      if (!response.ok) throw new Error("Failed to fetch analytics");
      return response.json();
    },
    enabled: user?.role === "admin",
  });

  const { data: stats } = useQuery({
    queryKey: ["/api/stats"],
    queryFn: async () => {
      const response = await fetch("/api/stats");
      if (!response.ok) throw new Error("Failed to fetch stats");
      return response.json();
    },
    enabled: user?.role === "admin",
  });

  if (user?.role !== "admin") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Access Denied</h1>
          <p className="text-muted-foreground">You need admin privileges to view analytics.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar onRaiseIssue={handleRaiseIssue} />
      
      <main className="ml-64 min-h-screen">
        <header className="bg-card border-b border-border p-6">
          <div className="flex items-center space-x-4">
            <BarChart3 className="h-8 w-8 text-primary" />
            <div>
              <h2 className="text-2xl font-bold text-foreground">Analytics Dashboard</h2>
              <p className="text-muted-foreground">System insights and reporting</p>
            </div>
          </div>
        </header>

        <div className="p-6">
          {/* Key Stats */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Questions</p>
                      <p className="text-3xl font-bold text-foreground">{stats.totalQuestions}</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Pending Approvals</p>
                      <p className="text-3xl font-bold text-orange-600">{stats.pendingApprovals}</p>
                    </div>
                    <Clock className="h-8 w-8 text-orange-600" />
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
                    <Users className="h-8 w-8 text-green-600" />
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
                    <CheckCircle className="h-8 w-8 text-lime-600" />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {isLoading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Loading analytics...</p>
            </div>
          ) : analytics ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Questions by Category */}
              <Card>
                <CardHeader>
                  <CardTitle>Questions by Category</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={analytics.questionsByCategory}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="category" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#84CC16" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Questions by Status */}
              <Card>
                <CardHeader>
                  <CardTitle>Questions by Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={analytics.questionsByStatus}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(entry) => `${entry.status}: ${entry.count}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="count"
                      >
                        {analytics.questionsByStatus.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Trending Questions */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="h-5 w-5" />
                    Trending Questions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analytics.trendingQuestions?.slice(0, 5).map((question: any, index: number) => (
                      <div key={question.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium text-foreground">{question.title}</p>
                          <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-1">
                            <span className="bg-lime-100 text-lime-800 dark:bg-lime-900/20 dark:text-lime-300 px-2 py-1 rounded text-xs">
                              {question.category}
                            </span>
                            <span>{question.views} views</span>
                            <span>{question.answerCount} answers</span>
                          </div>
                        </div>
                        <div className="text-2xl font-bold text-muted-foreground">#{index + 1}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No analytics data available.</p>
            </div>
          )}
        </div>
      </main>
      
      <RaiseIssueModal 
        isOpen={showRaiseIssueModal} 
        onClose={() => setShowRaiseIssueModal(false)} 
      />
    </div>
  );
}