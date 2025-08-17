import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Sidebar } from "@/components/sidebar";
import { RaiseIssueModal } from "@/components/raise-issue-modal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Users, Edit, Trash2, UserPlus } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { User } from "@shared/schema";

export default function UserManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [showRaiseIssueModal, setShowRaiseIssueModal] = useState(false);

  const handleRaiseIssue = () => {
    setShowRaiseIssueModal(true);
  };

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const response = await fetch("/api/users");
      if (!response.ok) throw new Error("Failed to fetch users");
      return response.json();
    },
    enabled: user?.role === "admin",
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, updates }: { userId: string; updates: any }) => {
      await apiRequest("PATCH", `/api/users/${userId}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setEditingUser(null);
      toast({
        title: "Success",
        description: "User updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update user",
        variant: "destructive",
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      await apiRequest("DELETE", `/api/users/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Success",
        description: "User deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete user",
        variant: "destructive",
      });
    },
  });

  const handleRoleChange = (userId: string, newRole: string) => {
    updateUserMutation.mutate({
      userId,
      updates: { role: newRole },
    });
  };

  const handleDeleteUser = (userId: string, username: string) => {
    if (confirm(`Are you sure you want to delete user "${username}"? This action cannot be undone.`)) {
      deleteUserMutation.mutate(userId);
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "admin": return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300";
      case "supervisor": return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
    }
  };

  if (user?.role !== "admin") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Access Denied</h1>
          <p className="text-muted-foreground">You need admin privileges to manage users.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar onRaiseIssue={handleRaiseIssue} />
      
      <main className="ml-64 min-h-screen">
        <header className="bg-card border-b border-border p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Users className="h-8 w-8 text-primary" />
              <div>
                <h2 className="text-2xl font-bold text-foreground">User Management</h2>
                <p className="text-muted-foreground">Manage user accounts and roles</p>
              </div>
            </div>
            <Button className="bg-lime-green text-dark-green hover:bg-lime-green/90">
              <UserPlus className="mr-2 h-4 w-4" />
              Add User
            </Button>
          </div>
        </header>

        <div className="p-6">
          {isLoading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Loading users...</p>
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>All Users ({users.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {users.map((userItem) => (
                    <div key={userItem.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-lime-green rounded-full flex items-center justify-center">
                          <span className="text-dark-green font-semibold text-sm">
                            {userItem.firstName && userItem.lastName
                              ? `${userItem.firstName[0]}${userItem.lastName[0]}`
                              : userItem.username.slice(0, 2)
                            }
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-foreground">
                            {userItem.firstName && userItem.lastName
                              ? `${userItem.firstName} ${userItem.lastName}`
                              : userItem.username
                            }
                          </p>
                          <p className="text-sm text-muted-foreground">@{userItem.username}</p>
                          <p className="text-xs text-muted-foreground">
                            Joined {new Date(userItem.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-muted-foreground">Role:</span>
                          {editingUser === userItem.id ? (
                            <Select
                              defaultValue={userItem.role}
                              onValueChange={(newRole) => handleRoleChange(userItem.id, newRole)}
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="user">User</SelectItem>
                                <SelectItem value="supervisor">Supervisor</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <Badge className={getRoleColor(userItem.role)}>
                              {userItem.role.charAt(0).toUpperCase() + userItem.role.slice(1)}
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center space-x-2">
                          {editingUser === userItem.id ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingUser(null)}
                            >
                              Cancel
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingUser(userItem.id)}
                              disabled={userItem.id === user?.id}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteUser(userItem.id, userItem.username)}
                            disabled={userItem.id === user?.id || deleteUserMutation.isPending}
                            className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
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