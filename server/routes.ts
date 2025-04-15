import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { 
  insertFamilySchema, 
  insertAccountSchema,
  insertTransactionSchema,
  transactionTypes
} from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";

// Auth middleware to ensure user is authenticated
function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
}

// Admin middleware to ensure user is an admin
function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated() && req.user?.isAdmin) {
    return next();
  }
  res.status(403).json({ message: "Forbidden - Admin access required" });
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Sets up authentication routes
  await setupAuth(app);
  
  // Middleware to parse and handle zod validation errors
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    if (err instanceof ZodError) {
      return res.status(400).json({ 
        message: "Validation error", 
        errors: fromZodError(err).message
      });
    }
    next(err);
  });

  // =========== ADMIN ROUTES ===========
  
  // Families CRUD
  app.post("/api/families", requireAdmin, async (req, res, next) => {
    try {
      // Add the current user's ID as the createdBy field
      const familyData = {
        ...req.body,
        createdBy: req.user!.id
      };
      
      const parsedData = insertFamilySchema.parse(familyData);
      const family = await storage.createFamily(parsedData);
      res.status(201).json(family);
    } catch (error) {
      next(error);
    }
  });
  
  app.get("/api/families", requireAdmin, async (req, res) => {
    const families = await storage.getFamilies();
    res.json(families);
  });
  
  app.get("/api/families/:id", requireAdmin, async (req, res) => {
    const family = await storage.getFamily(parseInt(req.params.id));
    if (!family) {
      return res.status(404).json({ message: "Family not found" });
    }
    res.json(family);
  });
  
  // User-Family Management
  app.post("/api/users/:userId/family/:familyId", requireAdmin, async (req, res) => {
    const userId = parseInt(req.params.userId);
    const familyId = parseInt(req.params.familyId);
    
    const updatedUser = await storage.addUserToFamily(userId, familyId);
    if (!updatedUser) {
      return res.status(404).json({ message: "User or family not found" });
    }
    
    // Don't return the password
    const { password, ...userWithoutPassword } = updatedUser;
    res.json(userWithoutPassword);
  });
  
  app.delete("/api/users/:userId/family", requireAdmin, async (req, res) => {
    const userId = parseInt(req.params.userId);
    
    const updatedUser = await storage.removeUserFromFamily(userId);
    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Don't return the password
    const { password, ...userWithoutPassword } = updatedUser;
    res.json(userWithoutPassword);
  });
  
  // User Management
  app.get("/api/users", requireAdmin, async (req, res) => {
    const users = await storage.getUsers();
    // Don't return passwords
    const usersWithoutPasswords = users.map(user => {
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });
    res.json(usersWithoutPasswords);
  });
  
  // Update a user
  app.patch("/api/users/:userId", requireAdmin, async (req, res, next) => {
    try {
      const userId = parseInt(req.params.userId);
      
      // Get the current user
      const currentUser = await storage.getUser(userId);
      if (!currentUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Update the user
      const updatedUser = await storage.updateUser(userId, req.body);
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Don't return the password
      const { password, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      next(error);
    }
  });
  
  app.post("/api/users/:userId/promote", requireAdmin, async (req, res) => {
    const userId = parseInt(req.params.userId);
    const updatedUser = await storage.promoteUserToAdmin(userId);
    
    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Don't return the password
    const { password, ...userWithoutPassword } = updatedUser;
    res.json(userWithoutPassword);
  });
  
  // =========== USER ROUTES ===========
  
  // Accounts CRUD
  app.post("/api/accounts", requireAuth, async (req, res, next) => {
    try {
      const userId = req.user!.id;
      const parsedData = insertAccountSchema.parse({ ...req.body, userId });
      const account = await storage.createAccount(parsedData);
      res.status(201).json(account);
    } catch (error) {
      next(error);
    }
  });
  
  app.get("/api/accounts", requireAuth, async (req, res) => {
    const userId = req.user!.id;
    const accounts = await storage.getAccountsByUserId(userId);
    res.json(accounts);
  });
  
  app.get("/api/accounts/:id", requireAuth, async (req, res) => {
    const accountId = parseInt(req.params.id);
    const account = await storage.getAccount(accountId);
    
    if (!account) {
      return res.status(404).json({ message: "Account not found" });
    }
    
    // Only allow users to access their own accounts
    if (account.userId !== req.user!.id && !req.user!.isAdmin) {
      return res.status(403).json({ message: "You don't have permission to access this account" });
    }
    
    res.json(account);
  });
  
  app.patch("/api/accounts/:id", requireAuth, async (req, res, next) => {
    try {
      const accountId = parseInt(req.params.id);
      const account = await storage.getAccount(accountId);
      
      if (!account) {
        return res.status(404).json({ message: "Account not found" });
      }
      
      // Only allow users to update their own accounts
      if (account.userId !== req.user!.id) {
        return res.status(403).json({ message: "You don't have permission to update this account" });
      }
      
      const updatedAccount = await storage.updateAccount(accountId, req.body);
      res.json(updatedAccount);
    } catch (error) {
      next(error);
    }
  });
  
  app.delete("/api/accounts/:id", requireAuth, async (req, res) => {
    const accountId = parseInt(req.params.id);
    const account = await storage.getAccount(accountId);
    
    if (!account) {
      return res.status(404).json({ message: "Account not found" });
    }
    
    // Only allow users to delete their own accounts
    if (account.userId !== req.user!.id) {
      return res.status(403).json({ message: "You don't have permission to delete this account" });
    }
    
    await storage.deleteAccount(accountId);
    res.status(204).end();
  });
  
  // Transactions CRUD
  app.post("/api/transactions", requireAuth, async (req, res, next) => {
    try {
      const userId = req.user!.id;
      const transactionData = { ...req.body, userId };
      
      // Convert date string to Date object if it's a string
      if (transactionData.date && typeof transactionData.date === 'string') {
        transactionData.date = new Date(transactionData.date);
      }
      
      // Validate transaction data
      const parsedData = insertTransactionSchema.parse(transactionData);
      
      // If it's a transfer, ensure destination account is provided
      if (parsedData.type === "Transfer" && !parsedData.destinationAccountId) {
        return res.status(400).json({ 
          message: "Destination account is required for transfers" 
        });
      }
      
      // Check if source account exists and belongs to user
      const sourceAccount = await storage.getAccount(parsedData.sourceAccountId);
      if (!sourceAccount) {
        return res.status(404).json({ message: "Source account not found" });
      }
      
      if (sourceAccount.userId !== userId) {
        return res.status(403).json({ 
          message: "You don't have permission to use this source account" 
        });
      }
      
      // For expense or transfer, check if there are sufficient funds
      if ((parsedData.type === "Expense" || parsedData.type === "Transfer") && 
          sourceAccount.balance < parsedData.amount) {
        return res.status(400).json({ message: "Insufficient funds in source account" });
      }
      
      // If it's a transfer, check if destination account exists
      if (parsedData.type === "Transfer" && parsedData.destinationAccountId) {
        const destAccount = await storage.getAccount(parsedData.destinationAccountId);
        if (!destAccount) {
          return res.status(404).json({ message: "Destination account not found" });
        }
      }
      
      const transaction = await storage.createTransaction(parsedData);
      res.status(201).json(transaction);
    } catch (error) {
      next(error);
    }
  });
  
  app.get("/api/transactions", requireAuth, async (req, res) => {
    const userId = req.user!.id;
    
    // Handle filtering by account
    const accountId = req.query.accountId ? parseInt(req.query.accountId as string) : null;
    let transactions;
    
    if (accountId) {
      // Check if account belongs to user
      const account = await storage.getAccount(accountId);
      if (!account || account.userId !== userId) {
        return res.status(403).json({ 
          message: "You don't have permission to access this account's transactions" 
        });
      }
      
      transactions = await storage.getTransactionsByAccountId(accountId);
    } else {
      transactions = await storage.getTransactionsByUserId(userId);
    }
    
    res.json(transactions);
  });
  
  app.get("/api/transactions/:id", requireAuth, async (req, res) => {
    const transactionId = parseInt(req.params.id);
    const transaction = await storage.getTransaction(transactionId);
    
    if (!transaction) {
      return res.status(404).json({ message: "Transaction not found" });
    }
    
    // Only allow users to access their own transactions
    if (transaction.userId !== req.user!.id) {
      return res.status(403).json({ 
        message: "You don't have permission to access this transaction" 
      });
    }
    
    res.json(transaction);
  });
  
  app.patch("/api/transactions/:id", requireAuth, async (req, res, next) => {
    try {
      const transactionId = parseInt(req.params.id);
      const transaction = await storage.getTransaction(transactionId);
      
      if (!transaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }
      
      // Only allow users to update their own transactions
      if (transaction.userId !== req.user!.id) {
        return res.status(403).json({ 
          message: "You don't have permission to update this transaction" 
        });
      }
      
      // Handle date conversion if present
      const updatedData = { ...req.body };
      if (updatedData.date && typeof updatedData.date === 'string') {
        updatedData.date = new Date(updatedData.date);
      }
      
      const updatedTransaction = await storage.updateTransaction(transactionId, updatedData);
      res.json(updatedTransaction);
    } catch (error) {
      next(error);
    }
  });
  
  app.delete("/api/transactions/:id", requireAuth, async (req, res) => {
    const transactionId = parseInt(req.params.id);
    const transaction = await storage.getTransaction(transactionId);
    
    if (!transaction) {
      return res.status(404).json({ message: "Transaction not found" });
    }
    
    // Only allow users to delete their own transactions
    if (transaction.userId !== req.user!.id) {
      return res.status(403).json({ 
        message: "You don't have permission to delete this transaction" 
      });
    }
    
    await storage.deleteTransaction(transactionId);
    res.status(204).end();
  });
  
  // Family View
  app.get("/api/family/members", requireAuth, async (req, res) => {
    const user = req.user!;
    
    if (!user.familyId) {
      return res.status(400).json({ message: "You are not part of a family" });
    }
    
    const familyMembers = await storage.getUsersByFamilyId(user.familyId);
    
    // Don't return passwords
    const membersWithoutPasswords = familyMembers.map(member => {
      const { password, ...memberWithoutPassword } = member;
      return memberWithoutPassword;
    });
    
    res.json(membersWithoutPasswords);
  });
  
  app.get("/api/family/transactions", requireAuth, async (req, res) => {
    const user = req.user!;
    
    if (!user.familyId) {
      return res.status(400).json({ message: "You are not part of a family" });
    }
    
    const familyTransactions = await storage.getTransactionsByFamilyId(user.familyId);
    res.json(familyTransactions);
  });
  
  // CSV Export
  app.get("/api/export/transactions", requireAuth, async (req, res) => {
    const userId = req.user!.id;
    
    // Get date range from query params
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : null;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : null;
    
    let transactions = await storage.getTransactionsByUserId(userId);
    
    // Filter by date range if provided
    if (startDate && endDate) {
      transactions = transactions.filter(tx => {
        const txDate = new Date(tx.date);
        return txDate >= startDate && txDate <= endDate;
      });
    }
    
    // Convert to CSV format
    const csvHeader = "Id,Date,Type,Category,Description,Amount,Account\n";
    const csvRows = await Promise.all(transactions.map(async tx => {
      const account = await storage.getAccount(tx.sourceAccountId);
      const accountName = account ? account.name : "Unknown Account";
      
      return `${tx.id},${new Date(tx.date).toISOString()},${tx.type},${tx.category},"${tx.description || ''}",${tx.amount},"${accountName}"`;
    }));
    
    const csvContent = csvHeader + csvRows.join("\n");
    
    // Set headers for file download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=transactions.csv');
    
    res.send(csvContent);
  });

  const httpServer = createServer(app);
  return httpServer;
}
