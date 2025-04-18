import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { 
  insertFamilySchema, 
  insertAccountSchema,
  insertTransactionSchema,
  transactionTypes,
  transactionCategories
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
    let accounts = await storage.getAccountsByUserId(userId);
    
    // If user is part of a family, also get family members' accounts
    if (req.user && req.user.familyId) {
      const familyMembers = await storage.getUsersByFamilyId(req.user.familyId);
      
      // Get accounts for each family member
      const familyMemberPromises = familyMembers
        .filter(member => member.id !== userId) // Exclude current user
        .map(member => storage.getAccountsByUserId(member.id));
      
      const familyMemberAccounts = await Promise.all(familyMemberPromises);
      
      // Flatten the array of arrays
      const otherFamilyAccounts = familyMemberAccounts.flat();
      
      // Combine with user's own accounts
      accounts = [...accounts, ...otherFamilyAccounts];
    }
    
    res.json(accounts);
  });
  
  app.get("/api/accounts/:id", requireAuth, async (req, res) => {
    const accountId = parseInt(req.params.id);
    const account = await storage.getAccount(accountId);
    
    if (!account) {
      return res.status(404).json({ message: "Account not found" });
    }
    
    // Allow if account belongs to the user directly
    const isSameUser = account.userId === req.user!.id;
    
    // Or allow if both users are in the same family (family account sharing)
    let isSameFamily = false;
    if (req.user && req.user.familyId) {
      const accountOwner = await storage.getUser(account.userId);
      isSameFamily = Boolean(accountOwner && accountOwner.familyId === req.user.familyId && accountOwner.familyId !== null);
    }
    
    // Admin can access any account
    const isAdmin = req.user!.isAdmin;
    
    if (!isSameUser && !isSameFamily && !isAdmin) {
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
      
      // Allow if account belongs to the user directly
      const isSameUser = account.userId === req.user!.id;
      
      // Or allow if both users are in the same family (family account sharing)
      let isSameFamily = false;
      if (req.user && req.user.familyId) {
        const accountOwner = await storage.getUser(account.userId);
        isSameFamily = Boolean(accountOwner && accountOwner.familyId === req.user.familyId && accountOwner.familyId !== null);
      }
      
      // Admin can also update accounts
      const isAdmin = req.user!.isAdmin;
      
      if (!isSameUser && !isSameFamily && !isAdmin) {
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
    
    // Allow if account belongs to the user directly
    const isSameUser = account.userId === req.user!.id;
    
    // Or allow if both users are in the same family (family account sharing)
    let isSameFamily = false;
    if (req.user && req.user.familyId) {
      const accountOwner = await storage.getUser(account.userId);
      isSameFamily = Boolean(accountOwner && accountOwner.familyId === req.user.familyId && accountOwner.familyId !== null);
    }
    
    // Admin can also delete accounts
    const isAdmin = req.user!.isAdmin;
    
    if (!isSameUser && !isSameFamily && !isAdmin) {
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
      
      // Additional validation: ensure transaction has a valid type
      if (!transactionTypes.includes(parsedData.type as any)) {
        return res.status(400).json({ 
          message: "Transaction type must be Income, Expense, or Transfer" 
        });
      }
      
      // If it's a transfer, ensure destination account is provided
      if (parsedData.type === "Transfer" && !parsedData.destinationAccountId) {
        return res.status(400).json({ 
          message: "Destination account is required for transfers" 
        });
      }
      
      // Check if source account exists and belongs to user or family
      const sourceAccount = await storage.getAccount(parsedData.sourceAccountId);
      if (!sourceAccount) {
        return res.status(404).json({ message: "Source account not found" });
      }
      
      // Allow if account belongs to the user directly
      const isSameUser = sourceAccount.userId === userId;
      
      // Or allow if both users are in the same family (family account sharing)
      let isSameFamily = false;
      if (req.user && req.user.familyId) {
        const accountOwner = await storage.getUser(sourceAccount.userId);
        isSameFamily = Boolean(accountOwner && accountOwner.familyId === req.user.familyId && accountOwner.familyId !== null);
      }
      
      if (!isSameUser && !isSameFamily) {
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
      // Check if account belongs to user or family
      const account = await storage.getAccount(accountId);
      
      if (!account) {
        return res.status(404).json({ message: "Account not found" });
      }
      
      // Allow if account belongs to the user directly
      const isSameUser = account.userId === userId;
      
      // Or allow if both users are in the same family (family account sharing)
      let isSameFamily = false;
      if (req.user && req.user.familyId) {
        const accountOwner = await storage.getUser(account.userId);
        isSameFamily = Boolean(accountOwner && accountOwner.familyId === req.user.familyId && accountOwner.familyId !== null);
      }
      
      if (!isSameUser && !isSameFamily) {
        return res.status(403).json({ 
          message: "You don't have permission to access this account's transactions" 
        });
      }
      
      transactions = await storage.getTransactionsByAccountId(accountId);
    } else {
      // If user is part of a family, get all family transactions
      if (req.user && req.user.familyId) {
        transactions = await storage.getTransactionsByFamilyId(req.user.familyId);
      } else {
        // Otherwise just get the user's transactions
        transactions = await storage.getTransactionsByUserId(userId);
      }
    }
    
    // Enhance transactions with user data and account names
    const enhancedTransactions = await Promise.all(transactions.map(async (transaction) => {
      const user = await storage.getUser(transaction.userId);
      const sourceAccount = await storage.getAccount(transaction.sourceAccountId);
      
      // Also get destination account name for transfers
      let destinationAccountName = null;
      if (transaction.type === 'Transfer' && transaction.destinationAccountId) {
        const destAccount = await storage.getAccount(transaction.destinationAccountId);
        destinationAccountName = destAccount ? destAccount.name : 'Unknown Account';
      }
      
      return {
        ...transaction,
        userName: user ? user.name : 'Unknown User',
        userUsername: user ? user.username : 'unknown',
        sourceAccountName: sourceAccount ? sourceAccount.name : 'Unknown Account',
        destinationAccountName
      };
    }));
    
    res.json(enhancedTransactions);
  });
  
  app.get("/api/transactions/:id", requireAuth, async (req, res) => {
    const transactionId = parseInt(req.params.id);
    const transaction = await storage.getTransaction(transactionId);
    
    if (!transaction) {
      return res.status(404).json({ message: "Transaction not found" });
    }
    
    // Check if transaction belongs to user or family
    const isSameUser = transaction.userId === req.user!.id;
    
    // Or allow if both users are in the same family (family transaction sharing)
    let isSameFamily = false;
    if (req.user && req.user.familyId) {
      const transactionOwner = await storage.getUser(transaction.userId);
      isSameFamily = Boolean(transactionOwner && transactionOwner.familyId === req.user.familyId && transactionOwner.familyId !== null);
    }
    
    if (!isSameUser && !isSameFamily) {
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
      
      // Check if transaction belongs to user or family
      const isSameUser = transaction.userId === req.user!.id;
      
      // Or allow if both users are in the same family (family transaction sharing)
      let isSameFamily = false;
      if (req.user && req.user.familyId) {
        const transactionOwner = await storage.getUser(transaction.userId);
        isSameFamily = Boolean(transactionOwner && transactionOwner.familyId === req.user.familyId && transactionOwner.familyId !== null);
      }
      
      if (!isSameUser && !isSameFamily) {
        return res.status(403).json({ 
          message: "You don't have permission to update this transaction" 
        });
      }
      
      // Handle date conversion if present
      const updatedData = { ...req.body };
      if (updatedData.date && typeof updatedData.date === 'string') {
        updatedData.date = new Date(updatedData.date);
      }
      
      // Ensure we don't override the userId with a blank value from the client
      if (updatedData.userId === 0) {
        delete updatedData.userId;
      }
      
      // If type is being updated, validate it's one of the allowed types
      if (updatedData.type && !transactionTypes.includes(updatedData.type as any)) {
        return res.status(400).json({ 
          message: "Transaction type must be Income, Expense, or Transfer" 
        });
      }
      
      // If changing to Transfer type, ensure destinationAccountId is provided
      if (updatedData.type === "Transfer" && !updatedData.destinationAccountId && 
          !transaction.destinationAccountId) {
        return res.status(400).json({ 
          message: "Destination account is required for transfers" 
        });
      }
      
      console.log("Updating transaction in routes:", { 
        transactionId, 
        data: updatedData,
        currentTransaction: transaction
      });
      
      const updatedTransaction = await storage.updateTransaction(transactionId, updatedData);
      
      console.log("Update completed:", { 
        updatedTransaction 
      });
      
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
    
    // Check if transaction belongs to user or family
    const isSameUser = transaction.userId === req.user!.id;
    
    // Or allow if both users are in the same family (family transaction sharing)
    let isSameFamily = false;
    if (req.user && req.user.familyId) {
      const transactionOwner = await storage.getUser(transaction.userId);
      isSameFamily = Boolean(transactionOwner && transactionOwner.familyId === req.user.familyId && transactionOwner.familyId !== null);
    }
    
    if (!isSameUser && !isSameFamily) {
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
    
    // Enhance transactions with user data and account names
    const enhancedTransactions = await Promise.all(familyTransactions.map(async (transaction) => {
      const user = await storage.getUser(transaction.userId);
      const sourceAccount = await storage.getAccount(transaction.sourceAccountId);
      
      // Also get destination account name for transfers
      let destinationAccountName = null;
      if (transaction.type === 'Transfer' && transaction.destinationAccountId) {
        const destAccount = await storage.getAccount(transaction.destinationAccountId);
        destinationAccountName = destAccount ? destAccount.name : 'Unknown Account';
      }
      
      return {
        ...transaction,
        userName: user ? user.name : 'Unknown User',
        userUsername: user ? user.username : 'unknown',
        sourceAccountName: sourceAccount ? sourceAccount.name : 'Unknown Account',
        destinationAccountName
      };
    }));
    
    res.json(enhancedTransactions);
  });
  
  // CSV Templates
  app.get("/api/templates/regular-transactions", requireAuth, (req, res) => {
    const today = new Date().toISOString().split('T')[0];
    
    // Start with a documentation row that explains valid values
    let csvContent = "# JoBa Finance - Regular Transaction Import Template\n";
    csvContent += "# Date Format: YYYY-MM-DD (e.g., 2025-04-18)\n";
    csvContent += "# Type: Income, Expense (synonyms like salary, payment, bill are also supported)\n";
    csvContent += "# Category: Housing, Transportation, Food, Utilities, Insurance, Healthcare, Savings, Personal, Entertainment, Education, Debt, Gifts, Salary, Business, Other\n";
    csvContent += "# Amount: Positive number for Income, Negative number for Expense\n";
    csvContent += "#\n";
    
    // Add header row
    csvContent += "Date,Type,Category,Description,Amount\n";
    
    // Add example rows
    const exampleRows = [
      `${today},Income,Salary,"Monthly Salary",1500`,
      `${today},Income,Business,"Freelance work",800`,
      `${today},Expense,Food,"Grocery shopping",-85.50`,
      `${today},Expense,Transportation,"Gas for car",-50.25`,
      `${today},Expense,Utilities,"Electricity bill",-120`,
      `${today},Expense,Entertainment,"Movie tickets",-25`
    ];
    
    csvContent += exampleRows.join("\n");
    
    // Set headers for file download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=regular-transactions-template.csv');
    
    res.send(csvContent);
  });
  
  app.get("/api/templates/transfer-transactions", requireAuth, async (req, res) => {
    const userId = req.user!.id;
    const accounts = await storage.getAccountsByUserId(userId);
    
    // If user has fewer than 2 accounts, provide generic account names
    const sourceAccountName = accounts.length > 0 ? accounts[0].name : "Checking Account";
    const destAccountName = accounts.length > 1 ? accounts[1].name : "Savings Account";
    
    // Get all account names for documentation
    const accountNames = accounts.map(a => `"${a.name}"`).join(", ");
    const accountsInfo = accountNames || "You need to create accounts first";
    
    const today = new Date().toISOString().split('T')[0];
    
    // Start with a documentation row that explains valid values
    let csvContent = "# JoBa Finance - Transfer Transaction Import Template\n";
    csvContent += "# Date Format: YYYY-MM-DD (e.g., 2025-04-18)\n";
    csvContent += "# Type: Must be 'Transfer' (synonyms like send, move are also supported)\n";
    csvContent += "# DestinationAccount: Must exactly match one of your account names:\n";
    csvContent += `# Available accounts: ${accountsInfo}\n`;
    csvContent += "#\n";
    
    // Add header row
    csvContent += "Date,Type,Category,Description,Amount,DestinationAccount\n";
    
    // Add example rows
    const exampleRows = [
      `${today},Transfer,Transfer,"Transfer to savings",100,"${destAccountName}"`,
      `${today},Transfer,Transfer,"Emergency fund transfer",50,"${destAccountName}"`,
      `${today},Transfer,Transfer,"Monthly savings",200,"${destAccountName}"`
    ];
    
    csvContent += exampleRows.join("\n");
    
    // Set headers for file download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=transfer-transactions-template.csv');
    
    res.send(csvContent);
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
    
    // Build CSV header based on transaction types
    let csvHeader = "Date,Type,Category,Description,Amount,CreatedBy";
    
    // Add destination account column if there are any transfer transactions
    const hasTransfers = transactions.some(tx => tx.type === "Transfer");
    if (hasTransfers) {
      csvHeader += ",DestinationAccount";
    }
    csvHeader += "\n";
    
    const csvRows = await Promise.all(transactions.map(async tx => {
      const sourceAccount = await storage.getAccount(tx.sourceAccountId);
      const sourceAccountName = sourceAccount ? sourceAccount.name : "Unknown Account";
      
      // Get user info for the transaction
      const user = await storage.getUser(tx.userId);
      const userName = user ? user.name : "Unknown User";
      
      let row = `${new Date(tx.date).toISOString().split('T')[0]},${tx.type},${tx.category},"${tx.description || ''}",${tx.amount},"${userName}"`;
      
      // Add destination account for transfers
      if (hasTransfers) {
        if (tx.type === "Transfer" && tx.destinationAccountId) {
          const destAccount = await storage.getAccount(tx.destinationAccountId);
          const destAccountName = destAccount ? destAccount.name : "";
          row += `,"${destAccountName}"`;
        } else {
          row += ",";
        }
      }
      
      return row;
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
