import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Sidebar } from "@/components/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { History, MessageSquare, HelpCircle, Calendar } from "lucide-react";
import { Link } from "wouter";

export default function Activity() {
  const { user } = useAuth();

  const { data: activity = [], isLoading } = useQuery({
    queryKey: ["/api/activity", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const response = await fetch(`/api/activity/${user.id}`);
      if (!response.ok) throw new Error("Failed to fetch activity");
      return response.json();
    },
    enabled: !!user?.id,
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved": return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300";
      case "pending": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300";
      case "rejected": return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
    }
  };

  const getTypeIcon = (type: string) => {
    return type === "question" ? HelpCircle : MessageSquare;
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      
      <main className="ml-64 min-h-screen">
        <header className="bg-card border-b border-border p-6">
          <div className="flex items-center space-x-4">
            <History className="h-8 w-8 text-primary" />
            <div>
              <h2 className="text-2xl font-bold text-foreground">My Activity</h2>
              <p className="text-muted-foreground">Track your questions and answers</p>
            </div>
          </div>
        </header>

        <div className="p-6">
          {isLoading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Loading activity...</p>
            </div>
          ) : activity.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <History className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No Activity Yet</h3>
                <p className="text-muted-foreground mb-4">
                  You haven't posted any questions or answers yet.
                </p>
                <Link href="/" className="inline-block">
                  <button className="bg-lime-green text-dark-green hover:bg-lime-green/90 px-4 py-2 rounded-md font-medium">
                    Browse Questions
                  </button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity ({activity.length} items)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {activity.map((item: any) => {
                    const TypeIcon = getTypeIcon(item.type);
                    return (
                      <div key={`${item.type}-${item.id}`} className="flex items-start space-x-4 p-4 border border-border rounded-lg">
                        <div className="w-10 h-10 bg-lime-green/10 rounded-full flex items-center justify-center flex-shrink-0">
                          <TypeIcon className="h-5 w-5 text-lime-green" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-1">
                                <span className="text-sm font-medium text-muted-foreground">
                                  {item.type === "question" ? "Posted Question" : "Posted Answer"}
                                </span>
                                <Badge className={getStatusColor(item.status)}>
                                  {item.status}
                                </Badge>
                              </div>
                              
                              <h3 className="font-medium text-foreground mb-1">
                                {item.type === "question" ? item.title : `Answer to: ${item.questionTitle}`}
                              </h3>
                              
                              <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                                <div className="flex items-center space-x-1">
                                  <Calendar className="h-4 w-4" />
                                  <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                                </div>
                                {item.type === "answer" && (
                                  <Link href={`/questions/${item.questionId}`} className="text-primary hover:underline">
                                    View Question
                                  </Link>
                                )}
                                {item.type === "question" && (
                                  <Link href={`/questions/${item.id}`} className="text-primary hover:underline">
                                    View Details
                                  </Link>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}