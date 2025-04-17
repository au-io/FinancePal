import { 
  users, type User, type InsertUser,
  families, type Family, type InsertFamily,
  accounts, type Account, type InsertAccount,
  transactions, type Transaction, type InsertTransaction
} from "@shared/schema";
import { IStorage } from "./storage";
import { db, pool } from "./db";
import { eq, and, isNull, desc } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";

// PostgreSQL session store
const PostgresSessionStore = connectPg(session);

export class DatabaseStorage implements IStorage {
  public sessionStore: session.Store;
  
  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool,
      createTableIfMissing: true
    });
  }

  // User management
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async getUsersByFamilyId(familyId: number): Promise<User[]> {
    return await db.select().from(users).where(eq(users.familyId, familyId));
  }

  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set(userData)
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  async promoteUserToAdmin(id: number): Promise<User | undefined> {
    return this.updateUser(id, { isAdmin: true });
  }

  // Family management
  async createFamily(insertFamily: InsertFamily): Promise<Family> {
    const [family] = await db.insert(families).values(insertFamily).returning();
    return family;
  }

  async getFamilies(): Promise<Family[]> {
    return await db.select().from(families);
  }

  async getFamily(id: number): Promise<Family | undefined> {
    const [family] = await db.select().from(families).where(eq(families.id, id));
    return family;
  }

  async addUserToFamily(userId: number, familyId: number): Promise<User | undefined> {
    return this.updateUser(userId, { familyId });
  }

  async removeUserFromFamily(userId: number): Promise<User | undefined> {
    return this.updateUser(userId, { familyId: null });
  }

  // Account management
  async createAccount(insertAccount: InsertAccount): Promise<Account> {
    const [account] = await db.insert(accounts).values({
      ...insertAccount,
      createdAt: new Date()
    }).returning();
    return account;
  }

  async getAccount(id: number): Promise<Account | undefined> {
    const [account] = await db.select().from(accounts).where(eq(accounts.id, id));
    return account;
  }

  async getAccountsByUserId(userId: number): Promise<Account[]> {
    return await db.select().from(accounts).where(eq(accounts.userId, userId));
  }

  async updateAccount(id: number, accountData: Partial<Account>): Promise<Account | undefined> {
    const [updatedAccount] = await db
      .update(accounts)
      .set(accountData)
      .where(eq(accounts.id, id))
      .returning();
    return updatedAccount;
  }

  async deleteAccount(id: number): Promise<boolean> {
    const deleted = await db.delete(accounts).where(eq(accounts.id, id)).returning();
    return deleted.length > 0;
  }

  // Transaction management
  async createTransaction(insertTransaction: InsertTransaction): Promise<Transaction> {
    const [transaction] = await db.insert(transactions).values(insertTransaction).returning();
    return transaction;
  }

  async getTransaction(id: number): Promise<Transaction | undefined> {
    const [transaction] = await db.select().from(transactions).where(eq(transactions.id, id));
    return transaction;
  }

  async getTransactionsByUserId(userId: number): Promise<Transaction[]> {
    return await db
      .select()
      .from(transactions)
      .where(eq(transactions.userId, userId))
      .orderBy(desc(transactions.date));
  }

  async getTransactionsByAccountId(accountId: number): Promise<Transaction[]> {
    return await db
      .select()
      .from(transactions)
      .where(eq(transactions.sourceAccountId, accountId))
      .orderBy(desc(transactions.date));
  }

  async getTransactionsByFamilyId(familyId: number): Promise<Transaction[]> {
    // Get all users in the family
    const familyUsers = await this.getUsersByFamilyId(familyId);
    const userIds = familyUsers.map(user => user.id);
    
    // Get all transactions for all users in the family
    if (userIds.length === 0) return [];
    
    let allTransactions: Transaction[] = [];
    for (const userId of userIds) {
      const userTransactions = await this.getTransactionsByUserId(userId);
      allTransactions = [...allTransactions, ...userTransactions];
    }
    
    // Sort by date descending
    return allTransactions.sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }

  async updateTransaction(id: number, transactionData: Partial<Transaction>): Promise<Transaction | undefined> {
    const [updatedTransaction] = await db
      .update(transactions)
      .set(transactionData)
      .where(eq(transactions.id, id))
      .returning();
    return updatedTransaction;
  }

  async deleteTransaction(id: number): Promise<boolean> {
    const deleted = await db.delete(transactions).where(eq(transactions.id, id)).returning();
    return deleted.length > 0;
  }

  // For initial admin creation
  async createInitialAdmin(): Promise<User | undefined> {
    // Check if admin exists
    const existingAdmin = await db
      .select()
      .from(users)
      .where(eq(users.isAdmin, true))
      .limit(1);
    
    if (existingAdmin.length > 0) {
      return existingAdmin[0];
    }
    
    // Create an admin user
    const adminUser: InsertUser = {
      username: "admin",
      password: process.env.ADMIN_PASSWORD || "admin123", // Use env variable or default
      name: "Administrator",
      email: "admin@joba.finance",
      isAdmin: true,
      familyId: null
    };
    
    // Create admin user
    return this.createUser(adminUser);
  }
}