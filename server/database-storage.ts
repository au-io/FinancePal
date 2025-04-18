import { 
  users, type User, type InsertUser,
  families, type Family, type InsertFamily,
  accounts, type Account, type InsertAccount,
  transactions, type Transaction, type InsertTransaction
} from "@shared/schema";
import { IStorage } from "./storage";
import { db, pool } from "./db";
import { eq, and, isNull, desc, sql } from "drizzle-orm";
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
    // First try exact match
    const [exactMatch] = await db.select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);
    
    if (exactMatch) {
      return exactMatch;
    }
    
    // If no exact match, get all users and do a case-insensitive compare in JS
    // This is not as efficient but more portable than SQL-specific solutions
    const allUsers = await db.select().from(users);
    
    const caseInsensitiveMatch = allUsers.find(
      user => user.username.toLowerCase() === username.toLowerCase()
    );
    
    return caseInsensitiveMatch;
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
    const { sourceAccountId, destinationAccountId, type, amount } = insertTransaction;
    
    // Start a transaction to ensure atomicity
    return await db.transaction(async (tx) => {
      // Insert the transaction first
      const [transaction] = await tx.insert(transactions).values(insertTransaction).returning();
      
      // Now update the account balances based on transaction type
      const sourceAccount = await tx
        .select()
        .from(accounts)
        .where(eq(accounts.id, sourceAccountId))
        .then(res => res[0]);
      
      if (!sourceAccount) {
        throw new Error("Source account not found");
      }
      
      if (type === "Income") {
        // For income, add to source account
        await tx
          .update(accounts)
          .set({ balance: sourceAccount.balance + amount })
          .where(eq(accounts.id, sourceAccountId));
      } 
      else if (type === "Expense") {
        // For expense, subtract from source account
        await tx
          .update(accounts)
          .set({ balance: sourceAccount.balance - amount })
          .where(eq(accounts.id, sourceAccountId));
      } 
      else if (type === "Transfer" && destinationAccountId) {
        // For transfer, subtract from source and add to destination
        const destAccount = await tx
          .select()
          .from(accounts)
          .where(eq(accounts.id, destinationAccountId))
          .then(res => res[0]);
        
        if (!destAccount) {
          throw new Error("Destination account not found");
        }
        
        // Update source account (decrease balance)
        await tx
          .update(accounts)
          .set({ balance: sourceAccount.balance - amount })
          .where(eq(accounts.id, sourceAccountId));
        
        // Update destination account (increase balance)
        await tx
          .update(accounts)
          .set({ balance: destAccount.balance + amount })
          .where(eq(accounts.id, destinationAccountId));
      }
      
      return transaction;
    });
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
    // First get the original transaction to compare changes
    const originalTransaction = await this.getTransaction(id);
    if (!originalTransaction) {
      return undefined;
    }
    
    return await db.transaction(async (tx) => {
      // Update the transaction first
      const [updatedTransaction] = await tx
        .update(transactions)
        .set(transactionData)
        .where(eq(transactions.id, id))
        .returning();
      
      if (!updatedTransaction) {
        return undefined;
      }
      
      // If amount, type, source, or destination changed, we need to update account balances
      const amountChanged = transactionData.amount !== undefined && 
                           transactionData.amount !== originalTransaction.amount;
      const typeChanged = transactionData.type !== undefined && 
                         transactionData.type !== originalTransaction.type;
      const sourceChanged = transactionData.sourceAccountId !== undefined && 
                          transactionData.sourceAccountId !== originalTransaction.sourceAccountId;
      const destChanged = transactionData.destinationAccountId !== undefined && 
                         transactionData.destinationAccountId !== originalTransaction.destinationAccountId;
      
      if (amountChanged || typeChanged || sourceChanged || destChanged) {
        // First, reverse the effects of the original transaction
        const { sourceAccountId: origSourceId, destinationAccountId: origDestId, 
                type: origType, amount: origAmount } = originalTransaction;
                
        // Get original source account
        let origSourceAccount;
        try {
          origSourceAccount = await tx
            .select()
            .from(accounts)
            .where(eq(accounts.id, origSourceId))
            .then(res => res[0]);
        } catch (error) {
          console.error("Original source account not found", error);
        }
        
        if (origSourceAccount) {
          if (origType === "Income") {
            // Reverse: subtract the original amount from the original source account
            await tx
              .update(accounts)
              .set({ balance: origSourceAccount.balance - origAmount })
              .where(eq(accounts.id, origSourceId));
          } 
          else if (origType === "Expense") {
            // Reverse: add the original amount back to the original source account
            await tx
              .update(accounts)
              .set({ balance: origSourceAccount.balance + origAmount })
              .where(eq(accounts.id, origSourceId));
          } 
          else if (origType === "Transfer" && origDestId) {
            // Reverse: add back to original source and subtract from original destination
            let origDestAccount;
            try {
              origDestAccount = await tx
                .select()
                .from(accounts)
                .where(eq(accounts.id, origDestId))
                .then(res => res[0]);
            } catch (error) {
              console.error("Original destination account not found", error);
            }
            
            if (origDestAccount) {
              // Update original source account (increase balance)
              await tx
                .update(accounts)
                .set({ balance: origSourceAccount.balance + origAmount })
                .where(eq(accounts.id, origSourceId));
              
              // Update original destination account (decrease balance)
              await tx
                .update(accounts)
                .set({ balance: origDestAccount.balance - origAmount })
                .where(eq(accounts.id, origDestId));
            }
          }
        }
        
        // Now apply the effects of the updated transaction
        const { sourceAccountId: newSourceId, destinationAccountId: newDestId, 
                type: newType, amount: newAmount } = updatedTransaction;
        
        // Get new source account
        const newSourceAccount = await tx
          .select()
          .from(accounts)
          .where(eq(accounts.id, newSourceId))
          .then(res => res[0]);
        
        if (!newSourceAccount) {
          throw new Error("New source account not found");
        }
        
        if (newType === "Income") {
          // Apply: add the new amount to the new source account
          await tx
            .update(accounts)
            .set({ balance: newSourceAccount.balance + newAmount })
            .where(eq(accounts.id, newSourceId));
        } 
        else if (newType === "Expense") {
          // Apply: subtract the new amount from the new source account
          await tx
            .update(accounts)
            .set({ balance: newSourceAccount.balance - newAmount })
            .where(eq(accounts.id, newSourceId));
        } 
        else if (newType === "Transfer" && newDestId) {
          // Apply: subtract from new source and add to new destination
          const newDestAccount = await tx
            .select()
            .from(accounts)
            .where(eq(accounts.id, newDestId))
            .then(res => res[0]);
          
          if (!newDestAccount) {
            throw new Error("New destination account not found");
          }
          
          // Update new source account (decrease balance)
          await tx
            .update(accounts)
            .set({ balance: newSourceAccount.balance - newAmount })
            .where(eq(accounts.id, newSourceId));
          
          // Update new destination account (increase balance)
          await tx
            .update(accounts)
            .set({ balance: newDestAccount.balance + newAmount })
            .where(eq(accounts.id, newDestId));
        }
      }
      
      return updatedTransaction;
    });
  }

  async deleteTransaction(id: number): Promise<boolean> {
    // Get the transaction first to know how to update account balances
    const transaction = await this.getTransaction(id);
    if (!transaction) {
      return false;
    }
    
    return await db.transaction(async (tx) => {
      // Delete the transaction
      const deleted = await tx.delete(transactions).where(eq(transactions.id, id)).returning();
      
      if (deleted.length === 0) {
        return false;
      }
      
      const { sourceAccountId, destinationAccountId, type, amount } = transaction;
      
      // Get source account
      const sourceAccount = await tx
        .select()
        .from(accounts)
        .where(eq(accounts.id, sourceAccountId))
        .then(res => res[0]);
      
      if (!sourceAccount) {
        throw new Error("Source account not found");
      }
      
      // Reverse the account balance changes based on transaction type
      if (type === "Income") {
        // For income, subtract from source account
        await tx
          .update(accounts)
          .set({ balance: sourceAccount.balance - amount })
          .where(eq(accounts.id, sourceAccountId));
      } 
      else if (type === "Expense") {
        // For expense, add back to source account
        await tx
          .update(accounts)
          .set({ balance: sourceAccount.balance + amount })
          .where(eq(accounts.id, sourceAccountId));
      } 
      else if (type === "Transfer" && destinationAccountId) {
        // For transfer, add back to source and subtract from destination
        const destAccount = await tx
          .select()
          .from(accounts)
          .where(eq(accounts.id, destinationAccountId))
          .then(res => res[0]);
        
        if (!destAccount) {
          throw new Error("Destination account not found");
        }
        
        // Update source account (increase balance)
        await tx
          .update(accounts)
          .set({ balance: sourceAccount.balance + amount })
          .where(eq(accounts.id, sourceAccountId));
        
        // Update destination account (decrease balance)
        await tx
          .update(accounts)
          .set({ balance: destAccount.balance - amount })
          .where(eq(accounts.id, destinationAccountId));
      }
      
      return true;
    });
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