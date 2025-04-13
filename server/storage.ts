import { 
  users, type User, type InsertUser,
  families, type Family, type InsertFamily,
  accounts, type Account, type InsertAccount,
  transactions, type Transaction, type InsertTransaction
} from "@shared/schema";
import createMemoryStore from "memorystore";
import session from "express-session";
import { randomBytes } from "crypto";

// Memory store for sessions
const MemoryStore = createMemoryStore(session);

// Storage interface
export interface IStorage {
  // User management
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getUsers(): Promise<User[]>;
  getUsersByFamilyId(familyId: number): Promise<User[]>;
  updateUser(id: number, user: Partial<User>): Promise<User | undefined>;
  promoteUserToAdmin(id: number): Promise<User | undefined>;
  
  // Family management
  createFamily(family: InsertFamily): Promise<Family>;
  getFamilies(): Promise<Family[]>;
  getFamily(id: number): Promise<Family | undefined>;
  addUserToFamily(userId: number, familyId: number): Promise<User | undefined>;
  removeUserFromFamily(userId: number): Promise<User | undefined>;
  
  // Account management
  createAccount(account: InsertAccount): Promise<Account>;
  getAccount(id: number): Promise<Account | undefined>;
  getAccountsByUserId(userId: number): Promise<Account[]>;
  updateAccount(id: number, account: Partial<Account>): Promise<Account | undefined>;
  deleteAccount(id: number): Promise<boolean>;
  
  // Transaction management
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  getTransaction(id: number): Promise<Transaction | undefined>;
  getTransactionsByUserId(userId: number): Promise<Transaction[]>;
  getTransactionsByAccountId(accountId: number): Promise<Transaction[]>;
  getTransactionsByFamilyId(familyId: number): Promise<Transaction[]>;
  updateTransaction(id: number, transaction: Partial<Transaction>): Promise<Transaction | undefined>;
  deleteTransaction(id: number): Promise<boolean>;
  
  // Session store for auth
  sessionStore: session.SessionStore;

  // For initial admin creation
  createInitialAdmin(): Promise<User | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private families: Map<number, Family>;
  private accounts: Map<number, Account>;
  private transactions: Map<number, Transaction>;
  private userCurrentId: number;
  private familyCurrentId: number;
  private accountCurrentId: number;
  private transactionCurrentId: number;
  public sessionStore: session.SessionStore;

  constructor() {
    this.users = new Map();
    this.families = new Map();
    this.accounts = new Map();
    this.transactions = new Map();
    this.userCurrentId = 1;
    this.familyCurrentId = 1;
    this.accountCurrentId = 1;
    this.transactionCurrentId = 1;
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    });
  }

  // User management
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username.toLowerCase() === username.toLowerCase(),
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userCurrentId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  
  async getUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }
  
  async getUsersByFamilyId(familyId: number): Promise<User[]> {
    return Array.from(this.users.values())
      .filter(user => user.familyId === familyId);
  }
  
  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...userData };
    this.users.set(id, updatedUser);
    return updatedUser;
  }
  
  async promoteUserToAdmin(id: number): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, isAdmin: true };
    this.users.set(id, updatedUser);
    return updatedUser;
  }
  
  // Family management
  async createFamily(insertFamily: InsertFamily): Promise<Family> {
    const id = this.familyCurrentId++;
    const family: Family = { 
      ...insertFamily, 
      id, 
      createdAt: new Date(),
      // Ensure currency has a default value if not provided
      currency: insertFamily.currency || 'USD'
    };
    this.families.set(id, family);
    return family;
  }
  
  async getFamilies(): Promise<Family[]> {
    return Array.from(this.families.values());
  }
  
  async getFamily(id: number): Promise<Family | undefined> {
    return this.families.get(id);
  }
  
  async addUserToFamily(userId: number, familyId: number): Promise<User | undefined> {
    const user = this.users.get(userId);
    if (!user) return undefined;
    
    const family = this.families.get(familyId);
    if (!family) return undefined;
    
    const updatedUser = { ...user, familyId };
    this.users.set(userId, updatedUser);
    return updatedUser;
  }
  
  async removeUserFromFamily(userId: number): Promise<User | undefined> {
    const user = this.users.get(userId);
    if (!user) return undefined;
    
    const updatedUser = { ...user, familyId: null };
    this.users.set(userId, updatedUser);
    return updatedUser;
  }
  
  // Account management
  async createAccount(insertAccount: InsertAccount): Promise<Account> {
    const id = this.accountCurrentId++;
    const account: Account = { ...insertAccount, id, createdAt: new Date() };
    this.accounts.set(id, account);
    return account;
  }
  
  async getAccount(id: number): Promise<Account | undefined> {
    return this.accounts.get(id);
  }
  
  async getAccountsByUserId(userId: number): Promise<Account[]> {
    return Array.from(this.accounts.values())
      .filter(account => account.userId === userId);
  }
  
  async updateAccount(id: number, accountData: Partial<Account>): Promise<Account | undefined> {
    const account = this.accounts.get(id);
    if (!account) return undefined;
    
    const updatedAccount = { ...account, ...accountData };
    this.accounts.set(id, updatedAccount);
    return updatedAccount;
  }
  
  async deleteAccount(id: number): Promise<boolean> {
    return this.accounts.delete(id);
  }
  
  // Transaction management
  async createTransaction(insertTransaction: InsertTransaction): Promise<Transaction> {
    const id = this.transactionCurrentId++;
    const transaction: Transaction = { ...insertTransaction, id };
    this.transactions.set(id, transaction);
    
    // Update account balances
    if (insertTransaction.type === "Transfer" && insertTransaction.destinationAccountId) {
      // For transfers, subtract from source and add to destination
      const sourceAccount = this.accounts.get(insertTransaction.sourceAccountId);
      const destAccount = this.accounts.get(insertTransaction.destinationAccountId);
      
      if (sourceAccount && destAccount) {
        sourceAccount.balance -= insertTransaction.amount;
        destAccount.balance += insertTransaction.amount;
        
        this.accounts.set(sourceAccount.id, sourceAccount);
        this.accounts.set(destAccount.id, destAccount);
      }
    } else {
      // For income/expense, update single account
      const account = this.accounts.get(insertTransaction.sourceAccountId);
      if (account) {
        if (insertTransaction.type === "Income") {
          account.balance += insertTransaction.amount;
        } else if (insertTransaction.type === "Expense") {
          account.balance -= insertTransaction.amount;
        }
        this.accounts.set(account.id, account);
      }
    }
    
    return transaction;
  }
  
  async getTransaction(id: number): Promise<Transaction | undefined> {
    return this.transactions.get(id);
  }
  
  async getTransactionsByUserId(userId: number): Promise<Transaction[]> {
    return Array.from(this.transactions.values())
      .filter(transaction => transaction.userId === userId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }
  
  async getTransactionsByAccountId(accountId: number): Promise<Transaction[]> {
    return Array.from(this.transactions.values())
      .filter(transaction => 
        transaction.sourceAccountId === accountId || 
        transaction.destinationAccountId === accountId
      )
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }
  
  async getTransactionsByFamilyId(familyId: number): Promise<Transaction[]> {
    // Get all users in the family
    const familyUsers = await this.getUsersByFamilyId(familyId);
    const familyUserIds = familyUsers.map(user => user.id);
    
    // Return transactions for any family member
    return Array.from(this.transactions.values())
      .filter(transaction => familyUserIds.includes(transaction.userId))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }
  
  async updateTransaction(id: number, transactionData: Partial<Transaction>): Promise<Transaction | undefined> {
    const transaction = this.transactions.get(id);
    if (!transaction) return undefined;
    
    const updatedTransaction = { ...transaction, ...transactionData };
    this.transactions.set(id, updatedTransaction);
    return updatedTransaction;
  }
  
  async deleteTransaction(id: number): Promise<boolean> {
    return this.transactions.delete(id);
  }
  
  // Create initial admin account
  async createInitialAdmin(): Promise<User | undefined> {
    // Check if any admin user already exists
    const existingAdmin = Array.from(this.users.values()).find(user => user.isAdmin);
    if (existingAdmin) {
      return existingAdmin;
    }
    
    // Use a consistent password for development
    const adminPassword = "admin123";
    
    // Create admin user
    const adminUser: InsertUser = {
      username: "admin",
      password: adminPassword, // Will be hashed in setupAuth
      name: "Admin User",
      email: "admin@jobafinance.com",
      isAdmin: true,
      familyId: null
    };
    
    // Create the admin and create a demo family
    const admin = await this.createUser(adminUser);
    
    // Create a demo family for admin
    try {
      const family = await this.createFamily({
        name: "Demo Family",
        createdBy: admin.id,
        currency: "USD"
      });
      
      // Add admin to the family
      await this.addUserToFamily(admin.id, family.id);
      
      // Add a demo checking account
      await this.createAccount({
        name: "Demo Checking",
        userId: admin.id,
        category: "Checking",
        icon: "account_balance",
        balance: 5000,
      });
      
      console.log("Created demo family and account for admin");
    } catch (error) {
      console.error("Error creating demo data:", error);
    }
    
    return admin;
  }
}

export const storage = new MemStorage();
