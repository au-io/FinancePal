import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { 
  User as SelectUser, 
  RegisterData, 
  LoginData, 
  AdminUserData,
  adminUserSchema,
  registerSchema
} from "@shared/schema";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export async function setupAuth(app: Express) {
  // Create initial admin user on startup
  const adminUser = await storage.createInitialAdmin();
  if (adminUser) {
    // We need to hash the admin password since we're using a fixed password
    const hashedPassword = await hashPassword("admin123");
    await storage.updateUser(adminUser.id, { password: hashedPassword });
    console.log('Admin user configured with username: "admin" and password: "admin123"');
  }

  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "joba-finance-session-secret",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        // getUserByUsername now handles case-insensitive matching
        const user = await storage.getUserByUsername(username);
        if (!user || !(await comparePasswords(password, user.password))) {
          return done(null, false, { message: "Invalid username or password" });
        } else {
          return done(null, user);
        }
      } catch (error) {
        return done(error);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });

  // Create a separate endpoint for admin-created users
  app.post("/api/admin/users", async (req, res, next) => {
    try {
      console.log('Admin user creation request body:', req.body);
      
      // Verify this is an admin making the request
      if (!req.isAuthenticated() || !(req.user as SelectUser).isAdmin) {
        return res.status(403).json({ message: "Only admins can create users through this endpoint" });
      }
      
      // Validate admin user creation data
      let userData;
      try {
        userData = adminUserSchema.parse(req.body);
      } catch (error) {
        console.error('Admin user validation error:', error);
        return res.status(400).json({ message: "Invalid user data", error });
      }
      
      // Username check now uses case-insensitive matching
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists (case-insensitive)" });
      }

      // Create the user
      const hashedPassword = await hashPassword(userData.password);
      const userToCreate = {
        ...userData,
        password: hashedPassword
      };
      
      console.log('Admin creating user with data:', { 
        ...userToCreate, 
        password: '[REDACTED]' 
      });
      
      const user = await storage.createUser(userToCreate);
      console.log('User created by admin:', { id: user.id, username: user.username });
      
      // Don't log in as the newly created user
      const { password, ...userWithoutPassword } = user;
      return res.status(201).json(userWithoutPassword);
    } catch (error) {
      console.error('Error in admin user creation:', error);
      next(error);
    }
  });

  // Normal user registration endpoint (with confirmPassword)
  app.post("/api/register", async (req, res, next) => {
    try {
      console.log('User registration request body:', req.body);
      
      let userData;
      try {
        userData = registerSchema.parse(req.body);
      } catch (error) {
        console.error('User registration validation error:', error);
        return res.status(400).json({ message: "Invalid registration data", error });
      }
      
      // Username check now uses case-insensitive matching
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists (case-insensitive)" });
      }

      // Extract only the fields needed for user creation and exclude confirmPassword
      const { confirmPassword, ...userDataWithoutConfirm } = userData;
      const userToCreate = {
        ...userDataWithoutConfirm,
        password: await hashPassword(userData.password),
        isAdmin: false // Never allow self-registration as admin
      };

      console.log('Creating user with data:', { ...userToCreate, password: '[REDACTED]' });
      const user = await storage.createUser(userToCreate);
      console.log('User created through self-registration:', { id: user.id, username: user.username });

      // Self-registration - log in as the new user
      req.login(user, (err) => {
        if (err) return next(err);
        
        // Don't return the password in the response
        const { password, ...userWithoutPassword } = user;
        res.status(201).json(userWithoutPassword);
      });
    } catch (error) {
      console.error('Error in user registration:', error);
      next(error);
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err, user, info) => {
      if (err) return next(err);
      if (!user) {
        return res.status(401).json({ message: info?.message || "Invalid credentials" });
      }
      
      req.login(user, (err) => {
        if (err) return next(err);
        
        // Don't return the password in the response
        const { password, ...userWithoutPassword } = user;
        res.status(200).json(userWithoutPassword);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    // Don't return the password in the response
    const { password, ...userWithoutPassword } = req.user as SelectUser;
    res.json(userWithoutPassword);
  });

  return app;
}