import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Sidebar } from "@/components/sidebar";
import { RaiseIssueModal } from "@/components/raise-issue-modal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Clock, Eye, User, MessageCircle, Send, Check, X } from "lucide-react";
import type { QuestionWithAuthor, AnswerWithAuthor } from "@shared/schema";

export default function QuestionDetail() {
  const [match, params] = useRoute("/questions/:id");
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [answerText, setAnswerText] = useState("");
  const [showRaiseIssueModal, setShowRaiseIssueModal] = useState(false);

  const handleRaiseIssue = () => {
    setShowRaiseIssueModal(true);
  };

  if (!match || !params?.id) {
    return <div>Question not found</div>;
  }

  // Fetch question details
  const { data: question, isLoading: questionLoading } = useQuery<QuestionWithAuthor>({
    queryKey: ["/api/questions", params.id],
    queryFn: async () => {
      const response = await fetch(`/api/questions/${params.id}`);
      if (!response.ok) throw new Error("Failed to fetch question");
      return response.json();
    },
  });

  // Fetch answers
  const { data: answers = [], isLoading: answersLoading } = useQuery<AnswerWithAuthor[]>({
    queryKey: ["/api/questions", params.id, "answers"],
    queryFn: async () => {
      const response = await fetch(`/api/questions/${params.id}/answers`);
      if (!response.ok) throw new Error("Failed to fetch answers");
      return response.json();
    },
  });

  // Submit answer mutation
  const submitAnswerMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/questions/${params.id}/answers`, { answerText });
    },
    onSuccess: () => {
      toast({
        title: "Answer submitted!",
        description: user?.role === "admin" 
          ? "Your answer has been posted."
          : "Your answer has been submitted for review.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/questions", params.id, "answers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/questions"] });
      setAnswerText("");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to submit answer. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Approve/Reject answer mutations
  const approveAnswerMutation = useMutation({
    mutationFn: async (answerId: string) => {
      await apiRequest("PATCH", `/api/answers/${answerId}/status`, { status: "approved" });
    },
    onSuccess: () => {
      toast({ title: "Answer approved", description: "The answer has been approved successfully." });
      queryClient.invalidateQueries({ queryKey: ["/api/questions", params.id, "answers"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to approve answer.", variant: "destructive" });
    },
  });

  const rejectAnswerMutation = useMutation({
    mutationFn: async (answerId: string) => {
      await apiRequest("PATCH", `/api/answers/${answerId}/status`, { status: "rejected" });
    },
    onSuccess: () => {
      toast({ title: "Answer rejected", description: "The answer has been rejected." });
      queryClient.invalidateQueries({ queryKey: ["/api/questions", params.id, "answers"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to reject answer.", variant: "destructive" });
    },
  });

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

  const handleSubmitAnswer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!answerText.trim()) {
      toast({
        title: "Answer required",
        description: "Please provide an answer before submitting.",
        variant: "destructive",
      });
      return;
    }
    submitAnswerMutation.mutate();
  };

  if (questionLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Sidebar onRaiseIssue={handleRaiseIssue} />
        <main className="ml-64 min-h-screen p-6">
          <div className="text-center py-8">
            <p className="text-muted-foreground">Loading question...</p>
          </div>
        </main>
      </div>
    );
  }

  if (!question) {
    return (
      <div className="min-h-screen bg-background">
        <Sidebar onRaiseIssue={handleRaiseIssue} />
        <main className="ml-64 min-h-screen p-6">
          <div className="text-center py-8">
            <p className="text-muted-foreground">Question not found.</p>
            <Link href="/">
              <Button variant="outline" className="mt-4">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Button>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar onRaiseIssue={handleRaiseIssue} />
      
      <main className="ml-64 min-h-screen">
        {/* Header */}
        <header className="bg-card border-b border-border p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Dashboard
                </Button>
              </Link>
              <h2 className="text-2xl font-bold text-foreground">Question Details</h2>
            </div>
          </div>
        </header>

        <div className="p-6 space-y-6">
          {/* Question Card */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-3">
                    <Badge className={getCategoryColor(question.category)}>
                      {getCategoryLabel(question.category)}
                    </Badge>
                    <Badge className={getStatusColor(question.status)}>
                      {question.status === "pending" && <Clock className="mr-1 h-3 w-3" />}
                      {question.status === "approved" && <Check className="mr-1 h-3 w-3" />}
                      {question.status === "rejected" && <X className="mr-1 h-3 w-3" />}
                      {question.status.charAt(0).toUpperCase() + question.status.slice(1)}
                    </Badge>
                    {question.isFinal === 1 && (
                      <Badge variant="destructive" className="bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
                        FINAL ANSWER
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-2xl mb-4">{question.title}</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="prose dark:prose-invert mb-6">
                <p className="text-foreground whitespace-pre-wrap">{question.description}</p>
                
                {question.attachment && (
                  <div className="mt-4">
                    <img 
                      src={`/uploads/${question.attachment}`} 
                      alt="Question attachment" 
                      className="max-w-full h-auto rounded-lg border"
                      style={{ maxHeight: '400px' }}
                    />
                  </div>
                )}
              </div>
              
              <div className="flex items-center justify-between pt-4 border-t border-border">
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
                
                <Badge variant="secondary" className="flex items-center">
                  <MessageCircle className="mr-1 h-3 w-3" />
                  {answers.length} answers
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Answers Section */}
          <Card>
            <CardHeader>
              <CardTitle>Answers ({answers.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {answersLoading ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Loading answers...</p>
                </div>
              ) : answers.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No answers yet. Be the first to help!</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {answers.map((answer) => (
                    <div key={answer.id} className="border-b border-border last:border-b-0 pb-6 last:pb-0">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <Badge className={getStatusColor(answer.status)}>
                            {answer.status === "pending" && <Clock className="mr-1 h-3 w-3" />}
                            {answer.status === "approved" && <Check className="mr-1 h-3 w-3" />}
                            {answer.status === "rejected" && <X className="mr-1 h-3 w-3" />}
                            {answer.status.charAt(0).toUpperCase() + answer.status.slice(1)}
                          </Badge>
                        </div>
                        
                        {user?.role === "admin" && answer.status === "pending" && (
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => approveAnswerMutation.mutate(answer.id)}
                              disabled={approveAnswerMutation.isPending}
                              className="text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => rejectAnswerMutation.mutate(answer.id)}
                              disabled={rejectAnswerMutation.isPending}
                              className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                      
                      <div className="prose dark:prose-invert mb-4">
                        <p className="text-foreground whitespace-pre-wrap">{answer.answerText}</p>
                        
                        {answer.attachment && (
                          <div className="mt-4">
                            <img 
                              src={`/uploads/${answer.attachment}`} 
                              alt="Answer attachment" 
                              className="max-w-full h-auto rounded-lg border"
                              style={{ maxHeight: '300px' }}
                            />
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <div className="flex items-center space-x-1">
                          <User className="h-4 w-4" />
                          <span>
                            {answer.author?.firstName && answer.author?.lastName
                              ? `${answer.author.firstName} ${answer.author.lastName}`
                              : answer.author?.username
                            }
                          </span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock className="h-4 w-4" />
                          <span>{getTimeAgo(answer.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Answer Form - Available to supervisors and admins, but not for final questions */}
          {user && (user.role === "supervisor" || user.role === "admin") && question.status === "approved" && question.isFinal !== 1 && (
            <Card>
              <CardHeader>
                <CardTitle>Submit an Answer</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmitAnswer} className="space-y-4">
                  <div>
                    <Label htmlFor="answer">Your Answer</Label>
                    <Textarea
                      id="answer"
                      rows={6}
                      placeholder="Provide a detailed answer to help solve this issue..."
                      value={answerText}
                      onChange={(e) => setAnswerText(e.target.value)}
                      required
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      disabled={submitAnswerMutation.isPending}
                      className="bg-lime-green text-dark-green hover:bg-lime-green/90"
                    >
                      <Send className="mr-2 h-4 w-4" />
                      {submitAnswerMutation.isPending ? "Submitting..." : "Submit Answer"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      <RaiseIssueModal 
        open={showRaiseIssueModal} 
        onOpenChange={setShowRaiseIssueModal} 
      />
    </div>
  );
}