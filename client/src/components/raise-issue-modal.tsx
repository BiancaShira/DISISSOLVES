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
import { Send, Upload, X } from "lucide-react";

interface RaiseIssueModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RaiseIssueModal({ open, onOpenChange }: RaiseIssueModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const createQuestionMutation = useMutation({
    mutationFn: async (data: typeof formData & { attachment?: string }) => {
      await apiRequest("POST", "/api/questions", data);
    },
    onSuccess: () => {
      toast({
        title: "Issue submitted!",
        description: user?.role === "admin" 
          ? "Your question has been posted and is now visible."
          : "Your question has been submitted for review.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/questions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      onOpenChange(false);
      setFormData({ title: "", description: "", category: "" });
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to submit question. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
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
      setSelectedFile(file);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.description || !formData.category) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    let attachment = "";
    if (selectedFile) {
      try {
        const uploadData = new FormData();
        uploadData.append('image', selectedFile);
        
        const response = await fetch('/api/upload', {
          method: 'POST',
          body: uploadData,
        });
        
        if (response.ok) {
          const result = await response.json();
          attachment = result.filename;
        }
      } catch (error) {
        console.error('Failed to upload image:', error);
        toast({
          title: "Upload failed",
          description: "Failed to upload image. The question will be submitted without the image.",
          variant: "destructive",
        });
      }
    }

    createQuestionMutation.mutate({
      ...formData,
      attachment: attachment || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Raise New Issue</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="title">Issue Title *</Label>
            <Input
              id="title"
              placeholder="Brief description of your issue..."
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>
          
          <div>
            <Label htmlFor="category">Category *</Label>
            <Select 
              value={formData.category} 
              onValueChange={(value) => setFormData({ ...formData, category: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ibml">IBML Scanners</SelectItem>
                <SelectItem value="softtrac">SoftTrac</SelectItem>
                <SelectItem value="omniscan">OmniScan</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="description">Detailed Description *</Label>
            <Textarea
              id="description"
              rows={6}
              placeholder="Please provide detailed information about the issue, including steps to reproduce, error messages, and any troubleshooting steps you've already tried..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
              data-testid="textarea-description"
            />
          </div>

          {/* Image Attachment */}
          <div>
            <Label>Attach Image (Optional)</Label>
            <div className="space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
                data-testid="input-file"
              />
              
              {!selectedFile ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-20 border-dashed border-2 border-gray-300 hover:border-gray-400"
                  data-testid="button-upload"
                >
                  <div className="flex flex-col items-center space-y-1">
                    <Upload className="h-6 w-6 text-gray-400" />
                    <span className="text-sm text-gray-600">Click to upload image</span>
                    <span className="text-xs text-gray-400">JPEG, PNG, GIF, WebP (max 5MB)</span>
                  </div>
                </Button>
              ) : (
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                      <Upload className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{selectedFile.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={removeFile}
                    data-testid="button-remove-file"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createQuestionMutation.isPending}
              className="bg-lime-green text-dark-green hover:bg-lime-green/90 font-bold text-lg py-6 px-8 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
              data-testid="button-submit-issue"
            >
              <Send className="mr-3 h-5 w-5" />
              {createQuestionMutation.isPending ? "SUBMITTING..." : "SUBMIT ISSUE"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
