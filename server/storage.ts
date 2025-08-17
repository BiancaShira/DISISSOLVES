import { users, questions, answers, activityLog, type User, type InsertUser, type Question, type InsertQuestion, type Answer, type InsertAnswer, type QuestionWithAuthor, type AnswerWithAuthor } from "@shared/schema";
import { db } from "./db";
import { eq, desc, asc, count, and, or, ilike, sql } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
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
  createQuestion(question: InsertQuestion & { createdBy: string }): Promise<Question>;
  updateQuestionStatus(id: string, status: "pending" | "approved" | "rejected"): Promise<void>;
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
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true 
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
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
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
          ilike(questions.title, `%${search}%`),
          ilike(questions.description, `%${search}%`)
        )
      );
    }

    let query = baseQuery;
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    // Apply sorting
    switch (sortBy) {
      case "views":
        query = query.orderBy(desc(questions.views));
        break;
      case "answers":
        query = query.orderBy(desc(count(answers.id)));
        break;
      case "trending":
        // Simple trending: recent questions with high views and answers
        query = query.orderBy(
          desc(sql`(${questions.views} + ${count(answers.id)} * 2) / (EXTRACT(EPOCH FROM (NOW() - ${questions.createdAt})) / 3600 + 1)`)
        );
        break;
      default:
        query = query.orderBy(desc(questions.createdAt));
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

  async createQuestion(question: InsertQuestion & { createdBy: string }): Promise<Question> {
    const [newQuestion] = await db
      .insert(questions)
      .values(question)
      .returning();
    return newQuestion;
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
    const [newAnswer] = await db
      .insert(answers)
      .values(answer)
      .returning();
    return newAnswer;
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
    questionsByCategory: any[];
    questionsByStatus: any[];
    answersByStatus: any[];
    topUsers: any[];
    trendingQuestions: any[];
  }> {
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

    return {
      questionsByCategory,
      questionsByStatus,
      answersByStatus,
      topUsers,
      trendingQuestions,
    };
  }
}

export const storage = new DatabaseStorage();
