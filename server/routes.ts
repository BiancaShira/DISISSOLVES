import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertQuestionSchema, insertAnswerSchema } from "@shared/schema";

function requireAuth(req: any, res: any, next: any) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Authentication required" });
  }
  next();
}

function requireRole(roles: string[]) {
  return (req: any, res: any, next: any) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }
    next();
  };
}

export async function registerRoutes(app: Express): Promise<Server> {
  // sets up /api/register, /api/login, /api/logout, /api/user
  setupAuth(app);

  // Questions routes
  app.get("/api/questions", requireAuth, async (req, res) => {
    try {
      const { category, status, search, sortBy, limit, offset } = req.query;
      
      const questions = await storage.getQuestions({
        category: category as string,
        status: status as string,
        search: search as string,
        sortBy: sortBy as "trending" | "recent" | "views" | "answers",
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined,
      });

      res.json(questions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch questions" });
    }
  });

  app.get("/api/questions/:id", requireAuth, async (req, res) => {
    try {
      const question = await storage.getQuestionById(req.params.id);
      if (!question) {
        return res.status(404).json({ message: "Question not found" });
      }

      // Increment view count
      await storage.incrementQuestionViews(req.params.id);

      res.json(question);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch question" });
    }
  });

  app.post("/api/questions", requireAuth, async (req, res) => {
    try {
      const validatedData = insertQuestionSchema.parse(req.body);
      
      const question = await storage.createQuestion({
        ...validatedData,
        createdBy: req.user!.id,
        status: req.user!.role === "admin" ? "approved" : "pending",
      });

      // Log activity
      await storage.logActivity({
        userId: req.user!.id,
        action: `Created question: ${question.title}`,
      });

      res.status(201).json(question);
    } catch (error) {
      res.status(400).json({ message: "Invalid question data" });
    }
  });

  app.patch("/api/questions/:id/status", requireAuth, requireRole(["admin"]), async (req, res) => {
    try {
      const { status } = req.body;
      if (!["pending", "approved", "rejected"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      await storage.updateQuestionStatus(req.params.id, status);

      // Log activity
      await storage.logActivity({
        userId: req.user!.id,
        action: `Updated question status to: ${status}`,
      });

      res.sendStatus(200);
    } catch (error) {
      res.status(500).json({ message: "Failed to update question status" });
    }
  });

  // Answers routes
  app.get("/api/questions/:id/answers", requireAuth, async (req, res) => {
    try {
      const answers = await storage.getAnswersByQuestionId(req.params.id);
      res.json(answers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch answers" });
    }
  });

  app.post("/api/questions/:id/answers", requireAuth, async (req, res) => {
    try {
      const { answerText } = req.body;
      
      if (!answerText || typeof answerText !== 'string' || answerText.trim().length === 0) {
        return res.status(400).json({ message: "Answer text is required" });
      }

      // Determine answer status based on user role
      let status: "pending" | "approved" | "rejected" = "pending";
      if (req.user!.role === "admin") {
        status = "approved";
      } else if (req.user!.role === "supervisor") {
        status = "pending"; // Supervisors need approval
      } else {
        status = "pending"; // Regular users need approval
      }

      const answer = await storage.createAnswer({
        answerText: answerText.trim(),
        questionId: req.params.id,
        createdBy: req.user!.id,
        status,
      });

      // Log activity
      await storage.logActivity({
        userId: req.user!.id,
        action: `Answered question`,
      });

      res.status(201).json(answer);
    } catch (error) {
      console.error("Answer creation error:", error);
      res.status(400).json({ message: "Failed to create answer", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.patch("/api/answers/:id/status", requireAuth, requireRole(["admin"]), async (req, res) => {
    try {
      const { status } = req.body;
      if (!["pending", "approved", "rejected"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      await storage.updateAnswerStatus(req.params.id, status);

      // Log activity
      await storage.logActivity({
        userId: req.user!.id,
        action: `Updated answer status to: ${status}`,
      });

      res.sendStatus(200);
    } catch (error) {
      res.status(500).json({ message: "Failed to update answer status" });
    }
  });

  // Analytics routes
  app.get("/api/stats", requireAuth, requireRole(["admin"]), async (req, res) => {
    try {
      const stats = await storage.getStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  app.get("/api/analytics", requireAuth, requireRole(["admin"]), async (req, res) => {
    try {
      const analytics = await storage.getAnalyticsData();
      res.json(analytics);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  // User management routes
  app.get("/api/users", requireAuth, requireRole(["admin"]), async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.patch("/api/users/:id", requireAuth, requireRole(["admin"]), async (req, res) => {
    try {
      const { role, firstName, lastName } = req.body;
      const updates: any = {};
      if (role) updates.role = role;
      if (firstName !== undefined) updates.firstName = firstName;
      if (lastName !== undefined) updates.lastName = lastName;
      
      await storage.updateUser(req.params.id, updates);
      res.sendStatus(200);
    } catch (error) {
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  app.delete("/api/users/:id", requireAuth, requireRole(["admin"]), async (req, res) => {
    try {
      if (req.params.id === req.user!.id) {
        return res.status(400).json({ message: "Cannot delete your own account" });
      }
      await storage.deleteUser(req.params.id);
      res.sendStatus(200);
    } catch (error) {
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // Activity routes
  app.get("/api/activity/:userId", requireAuth, async (req, res) => {
    try {
      // Users can only view their own activity unless they're admin
      if (req.params.userId !== req.user!.id && req.user!.role !== "admin") {
        return res.status(403).json({ message: "Can only view your own activity" });
      }
      
      const activity = await storage.getUserActivity(req.params.userId);
      res.json(activity);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch activity" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
