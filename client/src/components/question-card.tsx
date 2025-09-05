import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Clock, Eye, MessageCircle, User, Check, X, Trash2 } from "lucide-react";
import type { QuestionWithAuthor } from "@shared/schema";

interface QuestionCardProps {
  question: QuestionWithAuthor;
}

export function QuestionCard({ question }: QuestionCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "ibml": return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300";
      case "softtrac": return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300";
      case "omniscan": return "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved": return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300";
      case "pending": return "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300";
      case "rejected": return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case "ibml": return "IBML Scanners";
      case "softtrac": return "SoftTrac";
      case "omniscan": return "OmniScan";
      default: return category;
    }
  };

  const getTimeAgo = (date: string | Date) => {
    const now = new Date();
    const created = new Date(date);
    const diffInHours = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    const diffInWeeks = Math.floor(diffInDays / 7);
    return `${diffInWeeks}w ago`;
  };

  const approveQuestionMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PATCH", `/api/questions/${question.id}/status`, { status: "approved" });
    },
    onSuccess: () => {
      toast({
        title: "Question approved",
        description: "The question has been approved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/questions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to approve question.",
        variant: "destructive",
      });
    },
  });

  const rejectQuestionMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PATCH", `/api/questions/${question.id}/status`, { status: "rejected" });
    },
    onSuccess: () => {
      toast({
        title: "Question rejected",
        description: "The question has been rejected.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/questions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to reject question.",
        variant: "destructive",
      });
    },
  });

  const deleteQuestionMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/questions/${question.id}`);
    },
    onSuccess: () => {
      toast({
        title: "Question deleted",
        description: "The rejected question has been permanently deleted.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/questions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete question.",
        variant: "destructive",
      });
    },
  });

  const handleCardClick = () => {
    setLocation(`/questions/${question.id}`);
  };

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={handleCardClick}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-3">
              <Badge className={getCategoryColor(question.category)} data-testid={`badge-category-${question.category}`}>
                {getCategoryLabel(question.category)}
              </Badge>
              {/* Status badge - Only show for Admin and Supervisor */}
              {(user?.role === "admin" || user?.role === "supervisor") && (
                <Badge className={getStatusColor(question.status)} data-testid={`badge-status-${question.status}`}>
                  {question.status === "pending" && <Clock className="mr-1 h-3 w-3" />}
                  {question.status === "approved" && <Check className="mr-1 h-3 w-3" />}
                  {question.status === "rejected" && <X className="mr-1 h-3 w-3" />}
                  {question.status.charAt(0).toUpperCase() + question.status.slice(1)}
                </Badge>
              )}
            </div>
            
            <h4 className="text-lg font-semibold text-foreground mb-2 hover:text-primary">
              {question.title}
            </h4>
            
            <p className="text-muted-foreground mb-4 line-clamp-2">
              {question.description}
            </p>
            
            {question.attachment && (
              <div className="mb-4">
                <img 
                  src={`/uploads/${question.attachment}`} 
                  alt="Question attachment" 
                  className="max-w-full h-auto rounded-lg border"
                  style={{ maxHeight: '200px' }}
                />
              </div>
            )}
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                <div className="flex items-center space-x-1">
                  <User className="h-4 w-4" />
                  <span>
                    {question.author?.firstName && question.author?.lastName
                      ? `${question.author.firstName} ${question.author.lastName}`
                      : question.author?.username
                    }
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  <Clock className="h-4 w-4" />
                  <span>{getTimeAgo(question.createdAt)}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Eye className="h-4 w-4" />
                  <span>{question.views} views</span>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Badge variant="secondary" className="flex items-center">
                  <MessageCircle className="mr-1 h-3 w-3" />
                  {question.answerCount}
                </Badge>
                
                {/* Admin approval actions */}
                {user?.role === "admin" && question.status === "pending" && (
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        approveQuestionMutation.mutate();
                      }}
                      disabled={approveQuestionMutation.isPending}
                      className="text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        rejectQuestionMutation.mutate();
                      }}
                      disabled={rejectQuestionMutation.isPending}
                      className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                
                {/* Admin delete actions for rejected questions */}
                {user?.role === "admin" && question.status === "rejected" && (
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm("Are you sure you want to permanently delete this rejected question?")) {
                          deleteQuestionMutation.mutate();
                        }
                      }}
                      disabled={deleteQuestionMutation.isPending}
                      className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
