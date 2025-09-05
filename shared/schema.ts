import { sql } from "drizzle-orm";
import { mysqlTable, text, varchar, timestamp, int, mysqlEnum } from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const userRoleEnum = mysqlEnum("user_role", ["admin", "user", "supervisor"]);
export const supervisorTypeEnum = mysqlEnum("supervisor_type", ["qc", "validation", "scanner"]);
export const categoryEnum = mysqlEnum("category", ["ibml", "softtrac", "omniscan"]);
export const statusEnum = mysqlEnum("status", ["pending", "approved", "rejected"]);
export const priorityEnum = mysqlEnum("priority", ["low", "medium", "high", "urgent"]);

export const users = mysqlTable("users", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(uuid())`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: userRoleEnum.notNull().default("user"),
  supervisorType: supervisorTypeEnum,
  firstName: text("first_name"),
  lastName: text("last_name"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const questions = mysqlTable("questions", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(uuid())`),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: categoryEnum.notNull(),
  priority: priorityEnum.notNull().default("medium"),
  createdBy: varchar("created_by", { length: 36 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  status: statusEnum.notNull().default("pending"),
  views: int("views").default(0).notNull(),
  isFinal: int("is_final").default(0).notNull(), // 0 = false, 1 = true for admin posted questions
  attachment: text("attachment"), // Optional image attachment path
});

export const answers = mysqlTable("answers", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(uuid())`),
  questionId: varchar("question_id", { length: 36 }).notNull(),
  answerText: text("answer_text").notNull(),
  createdBy: varchar("created_by", { length: 36 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  status: statusEnum.notNull().default("pending"),
  attachment: text("attachment"), // Optional image attachment path
});

export const activityLog = mysqlTable("activity_log", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(uuid())`),
  userId: varchar("user_id", { length: 36 }).notNull(),
  action: text("action").notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  questions: many(questions),
  answers: many(answers),
  activities: many(activityLog),
}));

export const questionsRelations = relations(questions, ({ one, many }) => ({
  author: one(users, {
    fields: [questions.createdBy],
    references: [users.id],
  }),
  answers: many(answers),
}));

export const answersRelations = relations(answers, ({ one }) => ({
  question: one(questions, {
    fields: [answers.questionId],
    references: [questions.id],
  }),
  author: one(users, {
    fields: [answers.createdBy],
    references: [users.id],
  }),
}));

export const activityLogRelations = relations(activityLog, ({ one }) => ({
  user: one(users, {
    fields: [activityLog.userId],
    references: [users.id],
  }),
}));

// Schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertQuestionSchema = createInsertSchema(questions).omit({
  id: true,
  createdAt: true,
  views: true,
  createdBy: true,
  isFinal: true, // This will be set programmatically
});

export const insertAnswerSchema = createInsertSchema(answers).omit({
  id: true,
  createdAt: true,
  createdBy: true,
});

export const insertActivityLogSchema = createInsertSchema(activityLog).omit({
  id: true,
  timestamp: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertQuestion = z.infer<typeof insertQuestionSchema>;
export type Question = typeof questions.$inferSelect;
export type InsertAnswer = z.infer<typeof insertAnswerSchema>;
export type Answer = typeof answers.$inferSelect;
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
export type ActivityLog = typeof activityLog.$inferSelect;

// Extended types for frontend use
export type QuestionWithAuthor = Question & {
  author: Pick<User, "id" | "username" | "firstName" | "lastName">;
  answerCount: number;
};

export type AnswerWithAuthor = Answer & {
  author: Pick<User, "id" | "username" | "firstName" | "lastName">;
};
