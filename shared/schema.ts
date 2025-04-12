import { pgTable, text, serial, integer, boolean, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User and Authentication schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  isAdmin: boolean("is_admin").default(false).notNull(),
  familyId: integer("family_id"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  name: true,
  email: true,
  isAdmin: true,
  familyId: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Family schema
export const families = pgTable("families", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  currency: text("currency").default("USD").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdBy: integer("created_by").notNull(),
});

export const insertFamilySchema = createInsertSchema(families).pick({
  name: true,
  currency: true,
  createdBy: true,
});

export type InsertFamily = z.infer<typeof insertFamilySchema>;
export type Family = typeof families.$inferSelect;

// Account/Wallet schema
export const accountCategories = ["Checking", "Savings", "Credit", "Loan", "Investment"] as const;
export const accountIcons = [
  "account_balance", "credit_card", "savings", "attach_money", "payments",
  "wallet", "monetization_on", "account_balance_wallet"
] as const;

export const accounts = pgTable("accounts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  userId: integer("user_id").notNull(),
  category: text("category").notNull(),
  icon: text("icon").notNull(),
  balance: real("balance").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAccountSchema = createInsertSchema(accounts).pick({
  name: true,
  userId: true,
  category: true,
  icon: true,
  balance: true,
});

export type InsertAccount = z.infer<typeof insertAccountSchema>;
export type Account = typeof accounts.$inferSelect;

// Transaction schema
export const transactionTypes = ["Income", "Expense", "Transfer"] as const;
export const transactionFrequencies = ["One-Time", "Monthly", "Yearly", "Custom"] as const;

export const transactionCategories = [
  "Housing", "Transportation", "Food", "Utilities", "Insurance", 
  "Healthcare", "Savings", "Personal", "Entertainment", "Education",
  "Debt", "Gifts", "Salary", "Business", "Other"
] as const;

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  sourceAccountId: integer("source_account_id").notNull(),
  destinationAccountId: integer("destination_account_id"),
  userId: integer("user_id").notNull(),
  amount: real("amount").notNull(),
  type: text("type").notNull(),
  category: text("category").notNull(),
  description: text("description"),
  date: timestamp("date").defaultNow().notNull(),
  isRecurring: boolean("is_recurring").default(false).notNull(),
  frequency: text("frequency"),
  frequencyDay: integer("frequency_day"),
  frequencyCustomDays: integer("frequency_custom_days"),
});

export const insertTransactionSchema = createInsertSchema(transactions).pick({
  sourceAccountId: true,
  destinationAccountId: true,
  userId: true,
  amount: true,
  type: true,
  category: true,
  description: true,
  date: true,
  isRecurring: true,
  frequency: true,
  frequencyDay: true,
  frequencyCustomDays: true,
});

export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactions.$inferSelect;

// Extended schemas for validation and forms
export const loginSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const registerSchema = insertUserSchema.extend({
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Confirm password must be at least 6 characters"),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export type LoginData = z.infer<typeof loginSchema>;
export type RegisterData = z.infer<typeof registerSchema>;
