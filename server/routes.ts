import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import path from "path";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertQuestionSchema, insertAnswerSchema } from "@shared/schema";
import { emailService } from "./email";

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

// Configure multer for file uploads
const storage_config = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/uploads/')
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, uniqueSuffix + path.extname(file.originalname))
  }
});

const upload = multer({ 
  storage: storage_config,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.'));
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // sets up /api/register, /api/login, /api/logout, /api/user
  setupAuth(app);

  // File upload endpoint
  app.post("/api/upload", requireAuth, upload.single('image'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      
      const filename = req.file.filename;
      res.json({ filename, url: `/uploads/${filename}` });
    } catch (error) {
      res.status(500).json({ message: "Failed to upload file" });
    }
  });

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
      
      // Check if supervisor already has pending question (one at a time rule)
      if (req.user!.role === "supervisor") {
        const existingPendingQuestions = await storage.getQuestions({
          userId: req.user!.id,
          status: "pending",
          limit: 1,
        });
        
        if (existingPendingQuestions.length > 0) {
          return res.status(400).json({ 
            message: "You already have a pending question. Please wait for approval before posting another." 
          });
        }
      }
      
      const question = await storage.createQuestion({
        ...validatedData,
        createdBy: req.user!.id,
        status: req.user!.role === "admin" ? "approved" : "pending",
        isFinal: req.body.isFinal || (req.user!.role === "admin" ? 1 : 0), // Admin questions are final by default
      });

      // Log activity
      await storage.logActivity({
        userId: req.user!.id,
        action: `Created question: ${question.title}`,
      });

      // Send email notification to IT department for new issues raised by users
      if (req.user!.role === "user") {
        try {
          const itEmail = "itintern@disigroup.com";
          const userDisplayName = req.user!.firstName && req.user!.lastName 
            ? `${req.user!.firstName} ${req.user!.lastName}` 
            : req.user!.username;

          await emailService.sendIssueNotification(
            [itEmail],
            validatedData.title,
            validatedData.description,
            validatedData.category,
            userDisplayName
          );
        } catch (emailError) {
          // Don't fail the question creation if email fails
          console.error("Failed to send email notification:", emailError);
        }
      }

      res.status(201).json(question);
    } catch (error) {
      res.status(400).json({ message: "Invalid question data" });
    }
  });

  app.patch("/api/questions/:id/status", requireAuth, requireRole(["admin", "supervisor"]), async (req, res) => {
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

  // Delete rejected questions (Admin only)
  app.delete("/api/questions/:id", requireAuth, requireRole(["admin"]), async (req, res) => {
    try {
      const question = await storage.getQuestionById(req.params.id);
      if (!question) {
        return res.status(404).json({ message: "Question not found" });
      }

      if (question.status !== "rejected") {
        return res.status(400).json({ message: "Only rejected questions can be deleted" });
      }

      await storage.deleteQuestion(req.params.id);

      // Log activity
      await storage.logActivity({
        userId: req.user!.id,
        action: `Deleted rejected question: ${question.title}`,
      });

      res.sendStatus(200);
    } catch (error) {
      res.status(500).json({ message: "Failed to delete question" });
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

      // Check if question exists and get its details
      const question = await storage.getQuestionById(req.params.id);
      if (!question) {
        return res.status(404).json({ message: "Question not found" });
      }

      // Prevent users from posting answers
      if (req.user!.role === "user") {
        return res.status(403).json({ message: "Users cannot post answers. Only view and raise issues." });
      }

      // Check if question is marked as final (admin posted question + answer)
      if (question.isFinal) {
        return res.status(403).json({ message: "This question already has a final answer. No additional answers allowed." });
      }

      // Determine answer status based on user role
      let status: "pending" | "approved" | "rejected" = "pending";
      if (req.user!.role === "admin") {
        status = "approved";
      } else if (req.user!.role === "supervisor") {
        status = "pending"; // Supervisors need approval
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

      // Send email notification to IT department for supervisor answers needing approval
      if (req.user!.role === "supervisor" && status === "pending") {
        try {
          const itEmail = "itintern@disigroup.com";
          const supervisorDisplayName = req.user!.firstName && req.user!.lastName 
            ? `${req.user!.firstName} ${req.user!.lastName}` 
            : req.user!.username;

          await emailService.sendAnswerApprovalNotification(
            [itEmail],
            question.title,
            supervisorDisplayName,
            answerText.trim()
          );
        } catch (emailError) {
          // Don't fail the answer creation if email fails
          console.error("Failed to send answer approval notification:", emailError);
        }
      }

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

  app.post("/api/users", requireAuth, requireRole(["admin"]), async (req, res) => {
    try {
      const { username, password, firstName, lastName, role } = req.body;
      
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const newUser = await storage.createUser({
        username,
        password,
        firstName,
        lastName,
        role: role || "user",
      });

      // Log activity
      await storage.logActivity({
        userId: req.user!.id,
        action: `Created user: ${username}`,
      });

      res.status(201).json(newUser);
    } catch (error) {
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  app.patch("/api/users/:id", requireAuth, requireRole(["admin"]), async (req, res) => {
    try {
      const { role, firstName, lastName, username, password } = req.body;
      const updates: any = {};
      if (role) updates.role = role;
      if (firstName !== undefined) updates.firstName = firstName;
      if (lastName !== undefined) updates.lastName = lastName;
      if (username) updates.username = username;
      if (password) updates.password = password;
      
      await storage.updateUser(req.params.id, updates);
      
      // Log activity
      await storage.logActivity({
        userId: req.user!.id,
        action: `Updated user: ${req.params.id}`,
      });
      
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

  // Create answer directly (used by admin for question+answer posting)
  app.post("/api/answers", requireAuth, async (req, res) => {
    try {
      const validatedData = insertAnswerSchema.parse(req.body);
      
      // Check if question exists and if admin is posting
      const question = await storage.getQuestionById(validatedData.questionId);
      if (!question) {
        return res.status(404).json({ message: "Question not found" });
      }

      // Only admin can post answers directly
      if (req.user!.role !== "admin") {
        return res.status(403).json({ message: "Only admins can post answers directly" });
      }
      
      const answer = await storage.createAnswer({
        ...validatedData,
        createdBy: req.user!.id,
        status: "approved", // Admin answers are always approved
      });

      // Mark question as final if admin posted answer
      if (req.user!.role === "admin") {
        await storage.updateQuestionFinalStatus(validatedData.questionId, 1);
      }

      // Log activity
      await storage.logActivity({
        userId: req.user!.id,
        action: `Created answer for question: ${question.title}`,
      });

      res.status(201).json(answer);
    } catch (error) {
      res.status(400).json({ message: "Invalid answer data" });
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
