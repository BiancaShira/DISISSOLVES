import { users, questions, answers, activityLog, type User, type InsertUser, type Question, type InsertQuestion, type Answer, type InsertAnswer, type QuestionWithAuthor, type AnswerWithAuthor } from "@shared/schema";
import { db } from "./db";
import { eq, desc, asc, count, sum, and, or, like, sql } from "drizzle-orm";
import MemoryStore from "memorystore";
import session from "express-session";

// Use memory store for sessions (in-memory for Replit compatibility)
const SessionStore = MemoryStore(session);

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  getUsersByRole(role: string): Promise<User[]>;
  updateUser(id: string, updates: Partial<InsertUser>): Promise<void>;
  deleteUser(id: string): Promise<void>;
  
  // Questions
  getQuestions(filters?: {
    category?: string;
    status?: string;
    search?: string;
    sortBy?: "trending" | "recent" | "views" | "answers";
    limit?: number;
    offset?: number;
    userId?: string; // For user-specific queries
  }): Promise<QuestionWithAuthor[]>;
  getQuestionById(id: string): Promise<QuestionWithAuthor | undefined>;
  createQuestion(question: InsertQuestion & { createdBy: string; isFinal?: number }): Promise<Question>;
  updateQuestionStatus(id: string, status: "pending" | "approved" | "rejected"): Promise<void>;
  updateQuestionFinalStatus(id: string, isFinal: number): Promise<void>;
  deleteQuestion(id: string): Promise<void>;
  incrementQuestionViews(id: string): Promise<void>;
  
  // Answers
  getAnswersByQuestionId(questionId: string): Promise<AnswerWithAuthor[]>;
  createAnswer(answer: InsertAnswer & { createdBy: string }): Promise<Answer>;
  updateAnswerStatus(id: string, status: "pending" | "approved" | "rejected"): Promise<void>;
  
  // Activity log
  logActivity(activity: { userId: string; action: string }): Promise<void>;
  getUserActivity(userId: string): Promise<any[]>;
  
  // Analytics
  getStats(): Promise<{
    totalQuestions: number;
    pendingApprovals: number;
    activeUsers: number;
    resolutionRate: number;
  }>;
  getAnalyticsData(): Promise<{
    questionsByCategory: any[];
    questionsByStatus: any[];
    answersByStatus: any[];
    topUsers: any[];
    trendingQuestions: any[];
  }>;
  
  sessionStore: any;
}

export class DatabaseStorage implements IStorage {
  sessionStore: any;

  constructor() {
    // Use memory store for session storage in Replit environment
    this.sessionStore = new SessionStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    });
  }

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    await db
      .insert(users)
      .values(insertUser);
    
    // Get the created user by username since MySQL doesn't have RETURNING
    const [createdUser] = await db
      .select()
      .from(users)
      .where(eq(users.username, insertUser.username));
    
    return createdUser;
  }

  async getQuestions(filters: {
    category?: string;
    status?: string;
    search?: string;
    sortBy?: "trending" | "recent" | "views" | "answers";
    limit?: number;
    offset?: number;
    userId?: string;
  } = {}): Promise<QuestionWithAuthor[]> {
    const { category, status, search, sortBy = "recent", limit = 20, offset = 0, userId } = filters;
    
    const baseQuery = db
      .select({
        id: questions.id,
        title: questions.title,
        description: questions.description,
        category: questions.category,
        priority: questions.priority,
        createdBy: questions.createdBy,
        createdAt: questions.createdAt,
        status: questions.status,
        views: questions.views,
        isFinal: questions.isFinal,
        attachment: questions.attachment,
        author: {
          id: users.id,
          username: users.username,
          firstName: users.firstName,
          lastName: users.lastName,
        },
        answerCount: count(answers.id),
      })
      .from(questions)
      .leftJoin(users, eq(questions.createdBy, users.id))
      .leftJoin(answers, and(eq(answers.questionId, questions.id), eq(answers.status, "approved")))
      .groupBy(questions.id, users.id);

    // Apply filters
    const conditions = [];
    if (category) conditions.push(eq(questions.category, category as any));
    if (status) conditions.push(eq(questions.status, status as any));
    if (userId) conditions.push(eq(questions.createdBy, userId));
    if (search) {
      conditions.push(
        or(
          like(questions.title, `%${search}%`),
          like(questions.description, `%${search}%`)
        )
      );
    }

    let query = baseQuery;
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as typeof baseQuery;
    }

    // Apply sorting
    switch (sortBy) {
      case "views":
        query = query.orderBy(desc(questions.views)) as typeof baseQuery;
        break;
      case "answers":
        query = query.orderBy(desc(count(answers.id))) as typeof baseQuery;
        break;
      case "trending":
        // Simple trending: recent questions with high views and answers
        query = query.orderBy(
          desc(sql`(${questions.views} + COUNT(${answers.id}) * 2) / (TIMESTAMPDIFF(HOUR, ${questions.createdAt}, NOW()) + 1)`)
        ) as typeof baseQuery;
        break;
      default:
        query = query.orderBy(desc(questions.createdAt)) as typeof baseQuery;
    }

    const result = await query.limit(limit).offset(offset);
    
    return result.map(row => ({
      ...row,
      answerCount: Number(row.answerCount) || 0,
    })) as QuestionWithAuthor[];
  }

  async getQuestionById(id: string): Promise<QuestionWithAuthor | undefined> {
    const [result] = await db
      .select({
        id: questions.id,
        title: questions.title,
        description: questions.description,
        category: questions.category,
        priority: questions.priority,
        createdBy: questions.createdBy,
        createdAt: questions.createdAt,
        status: questions.status,
        views: questions.views,
        isFinal: questions.isFinal,
        attachment: questions.attachment,
        author: {
          id: users.id,
          username: users.username,
          firstName: users.firstName,
          lastName: users.lastName,
        },
        answerCount: count(answers.id),
      })
      .from(questions)
      .leftJoin(users, eq(questions.createdBy, users.id))
      .leftJoin(answers, and(eq(answers.questionId, questions.id), eq(answers.status, "approved")))
      .where(eq(questions.id, id))
      .groupBy(questions.id, users.id);

    if (!result) return undefined;

    return {
      ...result,
      answerCount: Number(result.answerCount) || 0,
    } as QuestionWithAuthor;
  }

  async createQuestion(question: InsertQuestion & { createdBy: string; isFinal?: number }): Promise<Question> {
    await db
      .insert(questions)
      .values(question);
    
    // Get the created question by title and createdBy since MySQL doesn't have RETURNING
    const [createdQuestion] = await db
      .select()
      .from(questions)
      .where(and(eq(questions.title, question.title), eq(questions.createdBy, question.createdBy)))
      .orderBy(desc(questions.createdAt))
      .limit(1);
    
    return createdQuestion;
  }

  async updateQuestionStatus(id: string, status: "pending" | "approved" | "rejected"): Promise<void> {
    await db
      .update(questions)
      .set({ status })
      .where(eq(questions.id, id));
  }

  async incrementQuestionViews(id: string): Promise<void> {
    await db
      .update(questions)
      .set({ views: sql`${questions.views} + 1` })
      .where(eq(questions.id, id));
  }

  async getAnswersByQuestionId(questionId: string): Promise<AnswerWithAuthor[]> {
    const result = await db
      .select({
        id: answers.id,
        questionId: answers.questionId,
        answerText: answers.answerText,
        createdBy: answers.createdBy,
        createdAt: answers.createdAt,
        status: answers.status,
        author: {
          id: users.id,
          username: users.username,
          firstName: users.firstName,
          lastName: users.lastName,
        },
      })
      .from(answers)
      .leftJoin(users, eq(answers.createdBy, users.id))
      .where(eq(answers.questionId, questionId))
      .orderBy(desc(answers.createdAt));

    return result as AnswerWithAuthor[];
  }

  async createAnswer(answer: InsertAnswer & { createdBy: string }): Promise<Answer> {
    await db
      .insert(answers)
      .values(answer);
    
    // Get the created answer by questionId and createdBy since MySQL doesn't have RETURNING
    const [createdAnswer] = await db
      .select()
      .from(answers)
      .where(and(eq(answers.questionId, answer.questionId), eq(answers.createdBy, answer.createdBy)))
      .orderBy(desc(answers.createdAt))
      .limit(1);
    
    return createdAnswer;
  }

  async updateQuestionFinalStatus(id: string, isFinal: number): Promise<void> {
    await db
      .update(questions)
      .set({ isFinal })
      .where(eq(questions.id, id));
  }

  async deleteQuestion(id: string): Promise<void> {
    // First delete all related answers
    await db
      .delete(answers)
      .where(eq(answers.questionId, id));
    
    // Then delete the question
    await db
      .delete(questions)
      .where(eq(questions.id, id));
  }

  async updateAnswerStatus(id: string, status: "pending" | "approved" | "rejected"): Promise<void> {
    await db
      .update(answers)
      .set({ status })
      .where(eq(answers.id, id));
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async getUsersByRole(role: string): Promise<User[]> {
    return await db.select().from(users).where(eq(users.role, role)).orderBy(desc(users.createdAt));
  }

  async updateUser(id: string, updates: Partial<InsertUser>): Promise<void> {
    await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id));
  }

  async deleteUser(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  async logActivity(activity: { userId: string; action: string }): Promise<void> {
    await db
      .insert(activityLog)
      .values(activity);
  }

  async getUserActivity(userId: string): Promise<any[]> {
    const userQuestions = await db
      .select({
        id: questions.id,
        title: questions.title,
        createdAt: questions.createdAt,
        status: questions.status,
        type: sql`'question'`.as('type'),
      })
      .from(questions)
      .where(eq(questions.createdBy, userId))
      .orderBy(desc(questions.createdAt));

    const userAnswers = await db
      .select({
        id: answers.id,
        questionId: answers.questionId,
        createdAt: answers.createdAt,
        status: answers.status,
        type: sql`'answer'`.as('type'),
        questionTitle: questions.title,
      })
      .from(answers)
      .leftJoin(questions, eq(answers.questionId, questions.id))
      .where(eq(answers.createdBy, userId))
      .orderBy(desc(answers.createdAt));

    // Combine and sort by date
    const activities = [...userQuestions, ...userAnswers];
    return activities.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getStats(): Promise<{
    totalQuestions: number;
    pendingApprovals: number;
    activeUsers: number;
    resolutionRate: number;
  }> {
    const [totalQuestionsResult] = await db
      .select({ count: count() })
      .from(questions);

    const [pendingApprovalsResult] = await db
      .select({ count: count() })
      .from(questions)
      .where(eq(questions.status, "pending"));

    const [pendingAnswersResult] = await db
      .select({ count: count() })
      .from(answers)
      .where(eq(answers.status, "pending"));

    const [activeUsersResult] = await db
      .select({ count: count() })
      .from(users)
      .where(sql`${users.createdAt} > NOW() - INTERVAL '30 days'`);

    const [answeredQuestionsResult] = await db
      .select({ count: count() })
      .from(questions)
      .leftJoin(answers, and(eq(answers.questionId, questions.id), eq(answers.status, "approved")))
      .where(sql`${answers.id} IS NOT NULL`);

    const totalQuestions = Number(totalQuestionsResult.count);
    const answeredQuestions = Number(answeredQuestionsResult.count);
    const resolutionRate = totalQuestions > 0 ? Math.round((answeredQuestions / totalQuestions) * 100) : 0;

    return {
      totalQuestions: Number(totalQuestionsResult.count),
      pendingApprovals: Number(pendingApprovalsResult.count) + Number(pendingAnswersResult.count),
      activeUsers: Number(activeUsersResult.count),
      resolutionRate,
    };
  }

  async getAnalyticsData(): Promise<{
    totalQuestions: number;
    totalAnswers: number;
    questionsThisWeek: number;
    answersThisWeek: number;
    pendingApprovals: number;
    totalViews: number;
    questionsByCategory: any[];
    questionsByStatus: any[];
    answersByStatus: any[];
    questionsByRole: any;
    topUsers: any[];
    trendingQuestions: any[];
    activeUsers: number;
    avgQuestionsPerUser: number;
    avgAnswersPerQuestion: number;
    avgResponseTime: number;
    avgResolutionTime: number;
  }> {
    // Basic counts
    const [totalQuestionsResult] = await db
      .select({ count: count() })
      .from(questions);

    const [totalAnswersResult] = await db
      .select({ count: count() })
      .from(answers);

    const [questionsThisWeekResult] = await db
      .select({ count: count() })
      .from(questions)
      .where(sql`${questions.createdAt} > NOW() - INTERVAL '7 days'`);

    const [answersThisWeekResult] = await db
      .select({ count: count() })
      .from(answers)
      .where(sql`${answers.createdAt} > NOW() - INTERVAL '7 days'`);

    const [pendingQuestionsResult] = await db
      .select({ count: count() })
      .from(questions)
      .where(eq(questions.status, "pending"));

    const [pendingAnswersResult] = await db
      .select({ count: count() })
      .from(answers)
      .where(eq(answers.status, "pending"));

    const [totalViewsResult] = await db
      .select({ totalViews: sum(questions.views) })
      .from(questions);

    const [activeUsersResult] = await db
      .select({ count: count() })
      .from(users)
      .where(sql`${users.createdAt} > NOW() - INTERVAL '30 days'`);

    const questionsByCategory = await db
      .select({
        category: questions.category,
        count: count(),
      })
      .from(questions)
      .groupBy(questions.category);

    const questionsByStatus = await db
      .select({
        status: questions.status,
        count: count(),
      })
      .from(questions)
      .groupBy(questions.status);

    const answersByStatus = await db
      .select({
        status: answers.status,
        count: count(),
      })
      .from(answers)
      .groupBy(answers.status);

    const questionsByRole = await db
      .select({
        role: users.role,
        count: count(),
      })
      .from(questions)
      .leftJoin(users, eq(questions.createdBy, users.id))
      .groupBy(users.role);

    const topUsers = await db
      .select({
        userId: users.id,
        username: users.username,
        firstName: users.firstName,
        lastName: users.lastName,
        questionCount: count(questions.id),
        answerCount: count(answers.id),
      })
      .from(users)
      .leftJoin(questions, eq(questions.createdBy, users.id))
      .leftJoin(answers, eq(answers.createdBy, users.id))
      .groupBy(users.id, users.username, users.firstName, users.lastName)
      .orderBy(desc(count(questions.id)));

    const trendingQuestions = await db
      .select({
        id: questions.id,
        title: questions.title,
        views: questions.views,
        answerCount: count(answers.id),
        category: questions.category,
        createdAt: questions.createdAt,
      })
      .from(questions)
      .leftJoin(answers, and(eq(answers.questionId, questions.id), eq(answers.status, "approved")))
      .where(eq(questions.status, "approved"))
      .groupBy(questions.id, questions.title, questions.views, questions.category, questions.createdAt)
      .orderBy(desc(sql`(${questions.views} + ${count(answers.id)} * 2)`))
      .limit(10);

    // Calculate derived metrics
    const totalQuestions = Number(totalQuestionsResult.count);
    const totalAnswers = Number(totalAnswersResult.count);
    const activeUsers = Number(activeUsersResult.count);

    const avgQuestionsPerUser = activeUsers > 0 ? Math.round(totalQuestions / activeUsers * 10) / 10 : 0;
    const avgAnswersPerQuestion = totalQuestions > 0 ? Math.round(totalAnswers / totalQuestions * 10) / 10 : 0;

    // Convert questionsByRole array to object
    const questionsByRoleObj = questionsByRole.reduce((acc: any, item: any) => {
      acc[item.role] = Number(item.count);
      return acc;
    }, {});

    return {
      totalQuestions,
      totalAnswers,
      questionsThisWeek: Number(questionsThisWeekResult.count),
      answersThisWeek: Number(answersThisWeekResult.count),
      pendingApprovals: Number(pendingQuestionsResult.count) + Number(pendingAnswersResult.count),
      totalViews: Number(totalViewsResult.totalViews) || 0,
      questionsByCategory,
      questionsByStatus,
      answersByStatus,
      questionsByRole: questionsByRoleObj,
      topUsers,
      trendingQuestions,
      activeUsers,
      avgQuestionsPerUser,
      avgAnswersPerQuestion,
      avgResponseTime: 2.5, // Mock data for now
      avgResolutionTime: 8.2, // Mock data for now
    };
  }
}

export const storage = new DatabaseStorage();
