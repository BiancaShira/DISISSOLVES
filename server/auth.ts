import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser, insertUserSchema } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export async function initializePredefinedUsers() {
  try {
    const predefinedUsers = [
      // Admins (Password: P@ssw0rd)
      { username: "admin", password: "P@ssw0rd", role: "admin", firstName: "Admin", lastName: "1", supervisorType: null },
      { username: "superadmin", password: "P@ssw0rd", role: "admin", firstName: "Super", lastName: "Admin", supervisorType: null },
      
      // QC Supervisors (Password: disi@2025)
      { username: "qcsupervisor1", password: "disi@2025", role: "supervisor", firstName: "QC", lastName: "Supervisor 1", supervisorType: "qc" },
      { username: "qcsupervisor2", password: "disi@2025", role: "supervisor", firstName: "QC", lastName: "Supervisor 2", supervisorType: "qc" },
      
      // Validation Supervisors (Password: disi@2025)
      { username: "valsupervisor1", password: "disi@2025", role: "supervisor", firstName: "Validation", lastName: "Supervisor 1", supervisorType: "validation" },
      { username: "valsupervisor2", password: "disi@2025", role: "supervisor", firstName: "Validation", lastName: "Supervisor 2", supervisorType: "validation" },
      
      // Scanner Supervisors (Password: disi@2025)
      { username: "scannersupervisor1", password: "disi@2025", role: "supervisor", firstName: "Scanner", lastName: "Supervisor 1", supervisorType: "scanner" },
      { username: "scannersupervisor2", password: "disi@2025", role: "supervisor", firstName: "Scanner", lastName: "Supervisor 2", supervisorType: "scanner" },
      
      // Users (Password: disi2025)
      { username: "user1", password: "disi2025", role: "user", firstName: "Test", lastName: "User 1", supervisorType: null },
      { username: "user2", password: "disi2025", role: "user", firstName: "Test", lastName: "User 2", supervisorType: null },
    ];

    for (const userData of predefinedUsers) {
      const existingUser = await storage.getUserByUsername(userData.username);
      if (!existingUser) {
        await storage.createUser({
          username: userData.username,
          password: await hashPassword(userData.password),
          role: userData.role as any,
          supervisorType: userData.supervisorType as any,
          firstName: userData.firstName,
          lastName: userData.lastName,
        });
        console.log(`Created predefined user: ${userData.username}`);
      }
    }
  } catch (error) {
    console.error("Error initializing predefined users:", error);
  }
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "default-secret-key",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user || !(await comparePasswords(password, user.password))) {
          return done(null, false);
        } else {
          return done(null, user);
        }
      } catch (error) {
        return done(error);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      const validatedData = insertUserSchema.parse(req.body);
      console.log(validatedData)
      
      const existingUser = await storage.getUserByUsername(validatedData.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const user = await storage.createUser({
        ...validatedData,
        password: await hashPassword(validatedData.password),
      });

      // Log registration activity
      await storage.logActivity({
        userId: user.id,
        action: "User registered",
      });

      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json(user);
      });
    } catch (error) {
      res.status(400).json({ message: "Invalid registration data" });
    }
  });

  app.post("/api/login", passport.authenticate("local"), async (req, res) => {
    // Log login activity
    await storage.logActivity({
      userId: req.user!.id,
      action: "User logged in",
    });

    res.status(200).json(req.user);
  });

  app.post("/api/logout", async (req, res, next) => {
    if (req.user) {
      // Log logout activity
      await storage.logActivity({
        userId: req.user.id,
        action: "User logged out",
      });
    }

    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(req.user);
  });
}
