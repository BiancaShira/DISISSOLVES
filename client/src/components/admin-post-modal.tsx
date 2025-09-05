import { useState, useRef } from "react";
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
import { Send, Plus, Upload, X } from "lucide-react";

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
  const [questionFile, setQuestionFile] = useState<File | null>(null);
  const [answerFile, setAnswerFile] = useState<File | null>(null);
  const questionFileInputRef = useRef<HTMLInputElement>(null);
  const answerFileInputRef = useRef<HTMLInputElement>(null);

  const createQuestionWithAnswerMutation = useMutation({
    mutationFn: async () => {
      let questionAttachment = "";
      let answerAttachment = "";
      
      // Upload question image if present
      if (questionFile) {
        try {
          const formData = new FormData();
          formData.append('image', questionFile);
          
          const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
          });
          
          if (response.ok) {
            const result = await response.json();
            questionAttachment = result.filename;
          }
        } catch (error) {
          console.error('Failed to upload question image:', error);
        }
      }
      
      // Upload answer image if present
      if (answerFile) {
        try {
          const formData = new FormData();
          formData.append('image', answerFile);
          
          const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
          });
          
          if (response.ok) {
            const result = await response.json();
            answerAttachment = result.filename;
          }
        } catch (error) {
          console.error('Failed to upload answer image:', error);
        }
      }
      
      // First create the question with admin privileges (approved + final)
      const questionResponse = await apiRequest("POST", "/api/questions", {
        ...questionData,
        isFinal: 1, // Admin questions are final
        attachment: questionAttachment || undefined,
      });
      const question = await questionResponse.json();
      
      // Then create the answer for the question (admin answers are automatically approved)
      await apiRequest("POST", "/api/answers", {
        questionId: question.id,
        answerText: answerData.answerText,
        attachment: answerAttachment || undefined,
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
      setQuestionFile(null);
      setAnswerFile(null);
      if (questionFileInputRef.current) {
        questionFileInputRef.current.value = "";
      }
      if (answerFileInputRef.current) {
        answerFileInputRef.current.value = "";
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to post question and answer. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (fileType: 'question' | 'answer') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type and size
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: "Please select a JPEG, PNG, GIF, or WebP image.",
          variant: "destructive",
        });
        return;
      }
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({
          title: "File too large",
          description: "Please select an image smaller than 5MB.",
          variant: "destructive",
        });
        return;
      }
      
      if (fileType === 'question') {
        setQuestionFile(file);
      } else {
        setAnswerFile(file);
      }
    }
  };

  const removeFile = (fileType: 'question' | 'answer') => () => {
    if (fileType === 'question') {
      setQuestionFile(null);
      if (questionFileInputRef.current) {
        questionFileInputRef.current.value = "";
      }
    } else {
      setAnswerFile(null);
      if (answerFileInputRef.current) {
        answerFileInputRef.current.value = "";
      }
    }
  };

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

              {/* Question Image Attachment */}
              <div className="space-y-2">
                <Label>Attach Image to Question (Optional)</Label>
                <input
                  ref={questionFileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect('question')}
                  className="hidden"
                  data-testid="input-question-file"
                />
                
                {!questionFile ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => questionFileInputRef.current?.click()}
                    className="w-full h-16 border-dashed border-2 border-gray-300 hover:border-gray-400"
                    data-testid="button-question-upload"
                  >
                    <div className="flex items-center space-x-2">
                      <Upload className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-600">Upload question image</span>
                    </div>
                  </Button>
                ) : (
                  <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded-lg border">
                    <div className="flex items-center space-x-2">
                      <Upload className="h-4 w-4 text-green-600" />
                      <span className="text-sm">{questionFile.name}</span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={removeFile('question')}
                      data-testid="button-remove-question-file"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
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

              {/* Answer Image Attachment */}
              <div className="space-y-2">
                <Label>Attach Image to Answer (Optional)</Label>
                <input
                  ref={answerFileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect('answer')}
                  className="hidden"
                  data-testid="input-answer-file"
                />
                
                {!answerFile ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => answerFileInputRef.current?.click()}
                    className="w-full h-16 border-dashed border-2 border-gray-300 hover:border-gray-400"
                    data-testid="button-answer-upload"
                  >
                    <div className="flex items-center space-x-2">
                      <Upload className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-600">Upload answer image</span>
                    </div>
                  </Button>
                ) : (
                  <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded-lg border">
                    <div className="flex items-center space-x-2">
                      <Upload className="h-4 w-4 text-green-600" />
                      <span className="text-sm">{answerFile.name}</span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={removeFile('answer')}
                      data-testid="button-remove-answer-file"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
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
              className="bg-dark-green hover:bg-dark-green/90 font-bold text-lg py-6 px-8 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
            >
              {createQuestionWithAnswerMutation.isPending ? (
                "POSTING..."
              ) : (
                <>
                  <Send className="mr-3 h-5 w-5" />
                  POST QUESTION + ANSWER
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}