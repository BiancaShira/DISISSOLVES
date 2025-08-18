import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Send, Plus } from "lucide-react";

interface AdminPostModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AdminPostModal({ open, onOpenChange }: AdminPostModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [questionData, setQuestionData] = useState({
    title: "",
    description: "",
    category: "",
  });

  const [answerData, setAnswerData] = useState({
    answerText: "",
  });

  const createQuestionWithAnswerMutation = useMutation({
    mutationFn: async () => {
      // First create the question
      const questionResponse = await apiRequest("POST", "/api/questions", questionData);
      const question = await questionResponse.json();
      
      // Then create the answer for the question
      await apiRequest("POST", "/api/answers", {
        questionId: question.id,
        answerText: answerData.answerText,
      });
      
      return question;
    },
    onSuccess: () => {
      toast({
        title: "Question and Answer Posted!",
        description: "Your question with answer has been posted and is now visible to all users.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/questions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      onOpenChange(false);
      setQuestionData({ title: "", description: "", category: "" });
      setAnswerData({ answerText: "" });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to post question and answer. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionData.title || !questionData.description || !questionData.category || !answerData.answerText) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields including the answer.",
        variant: "destructive",
      });
      return;
    }
    createQuestionWithAnswerMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" data-testid="admin-post-modal">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Plus className="h-5 w-5 text-dark-green" />
            <span>Post Issue + Answer</span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Question Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Question Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Issue Title *</Label>
                <Input
                  id="title"
                  data-testid="input-question-title"
                  placeholder="Brief description of the issue..."
                  value={questionData.title}
                  onChange={(e) => setQuestionData(prev => ({ ...prev, title: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Detailed Description *</Label>
                <Textarea
                  id="description"
                  data-testid="textarea-question-description"
                  placeholder="Provide detailed information about the issue, steps to reproduce, and any relevant context..."
                  value={questionData.description}
                  onChange={(e) => setQuestionData(prev => ({ ...prev, description: e.target.value }))}
                  rows={4}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select 
                  value={questionData.category} 
                  onValueChange={(value) => setQuestionData(prev => ({ ...prev, category: value }))}
                  required
                >
                  <SelectTrigger data-testid="select-question-category">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ibml">IBML Scanners</SelectItem>
                    <SelectItem value="softtrac">SoftTrac</SelectItem>
                    <SelectItem value="omniscan">OmniScan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Answer Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Solution/Answer</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="answer">Provide Solution *</Label>
                <Textarea
                  id="answer"
                  data-testid="textarea-answer-text"
                  placeholder="Provide the solution or answer to this issue..."
                  value={answerData.answerText}
                  onChange={(e) => setAnswerData(prev => ({ ...prev, answerText: e.target.value }))}
                  rows={6}
                  required
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end space-x-3 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={createQuestionWithAnswerMutation.isPending}
              data-testid="button-submit"
              className="bg-dark-green hover:bg-dark-green/90"
            >
              {createQuestionWithAnswerMutation.isPending ? (
                "Posting..."
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Post Question + Answer
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}