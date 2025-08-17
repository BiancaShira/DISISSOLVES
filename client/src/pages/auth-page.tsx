import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wrench, Shield, Users, TrendingUp } from "lucide-react";

export default function AuthPage() {
  const { user, loginMutation, registerMutation } = useAuth();
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [registerForm, setRegisterForm] = useState({
    username: "",
    password: "",
    firstName: "",
    lastName: "",
    role: "user" as "user" | "supervisor" | "admin",
  });

  // Redirect if already logged in
  if (user) {
    return <Redirect to="/" />;
  }

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate(loginForm);
  };

  const handleRegister = (e: React.FormEvent) => {
    console.log(registerForm)
    e.preventDefault();
    registerMutation.mutate(registerForm);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Forms */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-dark-green to-lime-green rounded-lg flex items-center justify-center">
                <Wrench className="text-white text-xl" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-dark-green dark:text-lime-green">DisiSolves</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">Internal Troubleshooting Platform</p>
          </div>

          <Tabs defaultValue="login" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <Card>
                <CardHeader>
                  <CardTitle>Welcome Back</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                      <Label htmlFor="username">Username</Label>
                      <Input
                        id="username"
                        type="text"
                        value={loginForm.username}
                        onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        type="password"
                        value={loginForm.password}
                        onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                        required
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full bg-lime-green text-dark-green hover:bg-lime-green/90"
                      disabled={loginMutation.isPending}
                    >
                      {loginMutation.isPending ? "Signing in..." : "Sign In"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="register">
              <Card>
                <CardHeader>
                  <CardTitle>Create Account</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="firstName">First Name</Label>
                        <Input
                          id="firstName"
                          type="text"
                          value={registerForm.firstName}
                          onChange={(e) => setRegisterForm({ ...registerForm, firstName: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input
                          id="lastName"
                          type="text"
                          value={registerForm.lastName}
                          onChange={(e) => setRegisterForm({ ...registerForm, lastName: e.target.value })}
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="regUsername">Username</Label>
                      <Input
                        id="regUsername"
                        type="text"
                        value={registerForm.username}
                        onChange={(e) => setRegisterForm({ ...registerForm, username: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="regPassword">Password</Label>
                      <Input
                        id="regPassword"
                        type="password"
                        value={registerForm.password}
                        onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="role">Role</Label>
                      <Select value={registerForm.role} onValueChange={(value: "user" | "supervisor" | "admin") => setRegisterForm({ ...registerForm, role: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">User</SelectItem>
                          <SelectItem value="supervisor">Supervisor</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      type="submit"
                      className="w-full bg-lime-green text-dark-green hover:bg-lime-green/90"
                      disabled={registerMutation.isPending}
                    >
                      {registerMutation.isPending ? "Creating account..." : "Create Account"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Right side - Hero section */}
      <div className="flex-1 bg-gradient-to-br from-dark-green to-dark-green/90 text-white p-8 flex items-center justify-center">
        <div className="max-w-lg text-center">
          <h2 className="text-4xl font-bold mb-6">Solve IT Issues Together</h2>
          <p className="text-lg mb-8 text-gray-200">
            A collaborative platform for solving IBML Scanner, SoftTrac, and OmniScan issues.
            Share knowledge, get answers, and help your team stay productive.
          </p>
          
          <div className="grid grid-cols-1 gap-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-lime-green/20 rounded-lg flex items-center justify-center">
                <Users className="text-lime-green" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-lime-green">Role-based Access</h3>
                <p className="text-sm text-gray-300">Different permissions for Users, Supervisors, and Admins</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-lime-green/20 rounded-lg flex items-center justify-center">
                <Shield className="text-lime-green" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-lime-green">Approval Workflow</h3>
                <p className="text-sm text-gray-300">Quality control with admin approval for supervisor content</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-lime-green/20 rounded-lg flex items-center justify-center">
                <TrendingUp className="text-lime-green" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-lime-green">Trending Issues</h3>
                <p className="text-sm text-gray-300">Stay updated with the most relevant problems and solutions</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
