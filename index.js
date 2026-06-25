import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import mongoose from "mongoose";
import session from "express-session";
import Listing from "./models/Listing.js";
import Admin from "./models/Admin.js";
import { dbService } from "./src/dbService.js";
import User from "./models/User.js";
import isUserLoggedIn from "./middleware/isUserLoggedIn.js";
import isAdminLoggedIn from "./middleware/isAdminLoggedIn.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 5050;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ===== Middleware =====
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// serve static files
app.use(express.static(path.join(__dirname, "public")));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// ===== Session =====
app.use(
  session({
    secret: "stayease-session-secret-key-2026",
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 }, // 24 hours default
  })
);

// ===== MongoDB Connection =====
const mongoUrl = process.env.mongodb_url;

if (mongoUrl && !mongoUrl.includes("xxxxx")) {
  mongoose
    .connect(mongoUrl, { dbName: "stayandaman", serverSelectionTimeoutMS: 5000 })
    .then(() => console.log("✅ Connected to MongoDB"))
    .catch((err) => {
      console.error("❌ MongoDB connection error:", err.message);
      dbService.setFallbackActive();
    });
} else {
  console.log("ℹ️ Skipping MongoDB connection: using JSON database fallback.");
  dbService.setFallbackActive();
}

// ===== Auth Middleware =====
const requireAdmin = isAdminLoggedIn;

// ===== Expose Session data to EJS Views =====
app.use((req, res, next) => {
  res.locals.user = req.session && req.session.userId ? {
    id: req.session.userId,
    fullName: req.session.userFullName,
    email: req.session.userEmail,
    avatar: req.session.userAvatar,
    username: req.session.userUsername
  } : null;
  
  res.locals.admin = req.session && req.session.adminId ? {
    id: req.session.adminId,
    fullName: req.session.adminFullName,
    email: req.session.adminEmail,
    avatar: req.session.adminAvatar,
    username: req.session.adminUsername
  } : null;
  
  next();
});

// =============================================
//  LANDING & PUBLIC ROUTES
// =============================================

app.get("/", (req, res) => {
  res.render("landing");
});

// =============================================
//  USER AUTHENTICATION ROUTES
// =============================================

// User Login GET
app.get("/user/login", (req, res) => {
  if (req.session && req.session.userId) {
    return res.redirect("/home");
  }
  const successMsg = req.query.signupSuccess === "true" ? "Account created! You can now log in." : null;
  res.render("userLogin", { error: null, success: successMsg, oldValues: {} });
});

// User Login POST (Passwordless: username + email match)
app.post("/user/login", async (req, res) => {
  const { username, email, rememberMe } = req.body;
  try {
    if (!username || !email) {
      return res.render("userLogin", { 
        error: "Please enter both username and email.", 
        success: null, 
        oldValues: { username, email } 
      });
    }

    const trimmedUsername = username.toLowerCase().trim();
    const trimmedEmail = email.toLowerCase().trim();

    // 1. Check if user exists by username
    const userByUsername = await dbService.findUserByUsername(trimmedUsername);
    if (!userByUsername) {
      return res.render("userLogin", { 
        error: "Username not found. Please sign up first", 
        success: null, 
        oldValues: { username, email } 
      });
    }

    // 2. Check if username and email match the same user record
    const matchedUser = await dbService.findUserByUsernameAndEmail(trimmedUsername, trimmedEmail);
    if (!matchedUser) {
      return res.render("userLogin", { 
        error: "Email does not match this username", 
        success: null, 
        oldValues: { username, email } 
      });
    }

    // 3. Check if account is active
    if (matchedUser.isActive === false) {
      return res.render("userLogin", { 
        error: "Account deactivated, contact admin", 
        success: null, 
        oldValues: { username, email } 
      });
    }

    // Establish session
    req.session.userId = matchedUser._id || matchedUser.id;
    req.session.userFullName = matchedUser.fullName;
    req.session.userEmail = matchedUser.email;
    req.session.userAvatar = matchedUser.avatar || "";
    req.session.userUsername = matchedUser.username;

    // Update lastLogin timestamp
    await dbService.updateUserRecord(matchedUser._id || matchedUser.id, { lastLogin: new Date() });

    if (rememberMe) {
      req.session.cookie.maxAge = 7 * 24 * 60 * 60 * 1000; // Extend to 7 days
    } else {
      req.session.cookie.maxAge = 24 * 60 * 60 * 1000; // 24 hours
    }

    const redirectTo = req.session.redirectTo || "/home";
    delete req.session.redirectTo;
    res.redirect(redirectTo);
  } catch (err) {
    console.error("User login error:", err);
    res.render("userLogin", { 
      error: "An error occurred during login.", 
      success: null, 
      oldValues: { username, email } 
    });
  }
});

// User Signup GET
app.get("/user/signup", (req, res) => {
  if (req.session && req.session.userId) {
    return res.redirect("/home");
  }
  res.render("userSignup", { error: null, oldValues: {} });
});

// User Signup POST
app.post("/user/signup", async (req, res) => {
  const { fullName, username, email, phone, gender, dateOfBirth, city, avatar } = req.body;
  try {
    if (!fullName || !username || !email || !phone || !gender) {
      return res.render("userSignup", { 
        error: "Please fill in all required fields.", 
        oldValues: req.body 
      });
    }

    const lowercaseUsername = username.toLowerCase().replace(/\s+/g, "").trim();
    const lowercaseEmail = email.toLowerCase().trim();

    // Check lowercase format
    const usernameRegex = /^[a-z0-9_]+$/;
    if (!usernameRegex.test(lowercaseUsername)) {
      return res.render("userSignup", { 
        error: "Username can only contain lowercase letters, numbers, and underscores.", 
        oldValues: req.body 
      });
    }

    // Check unique username
    const existingUsername = await dbService.findUserByUsername(lowercaseUsername);
    if (existingUsername) {
      return res.render("userSignup", { 
        error: "Username is already taken.", 
        oldValues: req.body 
      });
    }

    // Check unique email
    const existingEmail = await dbService.findUserByEmail(lowercaseEmail);
    if (existingEmail) {
      return res.render("userSignup", { 
        error: "Email is already registered.", 
        oldValues: req.body 
      });
    }

    // Create user
    await dbService.createUserRecord({
      fullName,
      username: lowercaseUsername,
      email: lowercaseEmail,
      phone,
      gender,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
      city,
      avatar: avatar || "",
      isActive: true,
      createdAt: new Date()
    });

    res.redirect("/user/login?signupSuccess=true");
  } catch (err) {
    console.error("User signup error:", err);
    res.render("userSignup", { 
      error: "An error occurred during sign up.", 
      oldValues: req.body 
    });
  }
});

// Live Username Availability Check API
app.get("/api/users/check-username", async (req, res) => {
  try {
    const { username } = req.query;
    if (!username) {
      return res.json({ available: false });
    }
    const sanitized = username.toLowerCase().trim();
    const existing = await dbService.findUserByUsername(sanitized);
    res.json({ available: !existing });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// User Logout POST
app.post("/user/logout", (req, res) => {
  if (req.session) {
    req.session.userId = null;
    req.session.userFullName = null;
    req.session.userEmail = null;
    req.session.userAvatar = null;
    req.session.userUsername = null;
    
    // Completely destroy session if no admin is logged in
    if (!req.session.adminId) {
      req.session.destroy(() => {
        res.redirect("/");
      });
    } else {
      res.redirect("/");
    }
  } else {
    res.redirect("/");
  }
});

// =============================================
//  USER PROFILE & BOOKING PAGES
// =============================================

app.get("/profile", isUserLoggedIn, async (req, res) => {
  try {
    const profileDetails = await dbService.getUserById(req.session.userId);
    res.render("userProfile", { profileDetails, success: null });
  } catch (err) {
    console.error(err);
    res.redirect("/home");
  }
});

app.post("/profile", isUserLoggedIn, async (req, res) => {
  try {
    const { fullName, phone, gender, dateOfBirth, city, avatar } = req.body;

    if (!fullName || !phone) {
      const profileDetails = await dbService.getUserById(req.session.userId);
      return res.render("userProfile", { profileDetails, success: null });
    }

    const updatedUser = await dbService.updateUserRecord(req.session.userId, {
      fullName,
      phone,
      gender,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
      city,
      avatar: avatar || ""
    });

    req.session.userFullName = updatedUser.fullName;
    req.session.userAvatar = updatedUser.avatar || "";

    res.render("userProfile", { profileDetails: updatedUser, success: "Profile details updated successfully." });
  } catch (err) {
    console.error(err);
    const profileDetails = await dbService.getUserById(req.session.userId);
    res.render("userProfile", { profileDetails, success: null });
  }
});

app.get("/hotels", (req, res) => res.redirect("/home/hotel"));
app.get("/lodges", (req, res) => res.redirect("/home/Lodges"));
app.get("/rentals", (req, res) => res.redirect("/home/Rentals"));

app.get("/home", isUserLoggedIn, (req, res) => {
  res.render("home");
});

app.get("/home/hotel", isUserLoggedIn, async (req, res) => {
  try {
    const listings = await dbService.getListings({ category: "Hotel" });
    res.render("hotel", { listings });
  } catch (err) {
    console.error(err);
    res.render("hotel", { listings: [] });
  }
});

app.get("/home/Rentals", isUserLoggedIn, async (req, res) => {
  try {
    const listings = await dbService.getListings({ category: "Rental" });
    res.render("Rentals", { listings });
  } catch (err) {
    console.error(err);
    res.render("Rentals", { listings: [] });
  }
});

app.get("/home/Lodges", isUserLoggedIn, async (req, res) => {
  try {
    const listings = await dbService.getListings({ category: "Lodge" });
    res.render("Lodges", { listings });
  } catch (err) {
    console.error(err);
    res.render("Lodges", { listings: [] });
  }
});


// =============================================
//  ADMIN AUTHENTICATION ROUTES
// =============================================

// Admin Login GET
app.get("/admin/login", (req, res) => {
  if (req.session && req.session.adminId) {
    return res.redirect("/admin/dashboard");
  }
  const successMsg = req.query.signupSuccess === "true" ? "Account created! You can now log in." : null;
  res.render("adminLogin", { error: null, success: successMsg, oldValues: {} });
});

// Admin Login POST
app.post("/admin/login", async (req, res) => {
  const { username, email } = req.body;
  try {
    if (!username || !email) {
      return res.render("adminLogin", { 
        error: "Please enter both admin username and email.", 
        success: null, 
        oldValues: { username, email } 
      });
    }

    const trimmedUsername = username.trim();
    const trimmedEmail = email.toLowerCase().trim();

    // 1. Check if admin exists
    const adminByUsername = await dbService.findAdminByUsername(trimmedUsername);
    if (!adminByUsername) {
      return res.render("adminLogin", { 
        error: "Admin not found. Contact super admin.", 
        success: null, 
        oldValues: { username, email } 
      });
    }

    // 2. Check if username and email match same record
    const matchedAdmin = await dbService.findAdminByUsernameAndEmail(trimmedUsername, trimmedEmail);
    if (!matchedAdmin) {
      return res.render("adminLogin", { 
        error: "Email does not match this admin username", 
        success: null, 
        oldValues: { username, email } 
      });
    }

    // Create session
    req.session.adminId = matchedAdmin._id || matchedAdmin.id;
    req.session.adminFullName = matchedAdmin.fullName;
    req.session.adminEmail = matchedAdmin.email;
    req.session.adminAvatar = matchedAdmin.avatar || "";
    req.session.adminUsername = matchedAdmin.username;

    // Update lastLogin
    await dbService.updateAdminRecord(matchedAdmin._id || matchedAdmin.id, { lastLogin: new Date() });

    res.redirect("/admin/dashboard");
  } catch (err) {
    console.error("Admin login error:", err);
    res.render("adminLogin", { 
      error: "An error occurred during admin login.", 
      success: null, 
      oldValues: { username, email } 
    });
  }
});

// Admin Signup GET (Hidden Page)
app.get("/admin/signup", (req, res) => {
  res.render("adminSignup", { error: null, oldValues: {} });
});

// Admin Signup POST
app.post("/admin/signup", async (req, res) => {
  const { fullName, username, email, phone, secretCode } = req.body;
  try {
    if (!fullName || !username || !email || !secretCode) {
      return res.render("adminSignup", { 
        error: "Please fill in all required fields.", 
        oldValues: req.body 
      });
    }

    if (secretCode !== "STAYEASE_ADMIN_2025") {
      return res.render("adminSignup", { 
        error: "Invalid admin access code", 
        oldValues: req.body 
      });
    }

    const trimmedUsername = username.trim();
    const lowercaseEmail = email.toLowerCase().trim();

    // Check unique username
    const existingAdminByUsername = await dbService.findAdminByUsername(trimmedUsername);
    if (existingAdminByUsername) {
      return res.render("adminSignup", { 
        error: "Admin username is already taken.", 
        oldValues: req.body 
      });
    }

    // Check unique email
    const existingAdminByEmail = await dbService.findAdminByEmail(lowercaseEmail);
    if (existingAdminByEmail) {
      return res.render("adminSignup", { 
        error: "Admin email is already registered.", 
        oldValues: req.body 
      });
    }

    // Create admin
    await dbService.createAdminRecord({
      fullName,
      username: trimmedUsername,
      email: lowercaseEmail,
      phone: phone || "",
      avatar: "",
      createdAt: new Date()
    });

    res.redirect("/admin/login?signupSuccess=true");
  } catch (err) {
    console.error("Admin signup error:", err);
    res.render("adminSignup", { 
      error: "An error occurred during registration.", 
      oldValues: req.body 
    });
  }
});

// Admin Logout POST
app.post("/admin/logout", (req, res) => {
  if (req.session) {
    req.session.adminId = null;
    req.session.adminFullName = null;
    req.session.adminEmail = null;
    req.session.adminAvatar = null;
    req.session.adminUsername = null;
    
    // Completely destroy session if no user is logged in
    if (!req.session.userId) {
      req.session.destroy(() => {
        res.redirect("/");
      });
    } else {
      res.redirect("/");
    }
  } else {
    res.redirect("/");
  }
});


// =============================================
//  ADMIN PAGES (Protected)
// =============================================

app.get("/admin/dashboard", requireAdmin, (req, res) => {
  res.render("adminDashboard", { activePage: "overview" });
});

app.get("/admin/listings", requireAdmin, (req, res) => {
  res.render("adminDashboard", { activePage: "hotels" });
});

app.get("/admin/users", requireAdmin, (req, res) => {
  res.render("adminDashboard", { activePage: "users" });
});

app.get("/admin/profile", requireAdmin, (req, res) => {
  res.render("adminDashboard", { activePage: "profile" });
});


// =============================================
//  API ROUTES (for Admin Dashboard AJAX)
// =============================================

// GET all listings
app.get("/api/listings", async (req, res) => {
  try {
    const listings = await dbService.getListings();
    res.json(listings);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch listings" });
  }
});

// GET single listing
app.get("/api/listings/:id", async (req, res) => {
  try {
    const listing = await dbService.getListingById(req.params.id);
    if (!listing) return res.status(404).json({ error: "Listing not found" });
    res.json(listing);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch listing" });
  }
});

// POST create listing
app.post("/api/listings", requireAdmin, async (req, res) => {
  try {
    const listing = await dbService.createListing(req.body);
    res.status(201).json(listing);
  } catch (err) {
    console.error("Create listing error:", err);
    res.status(400).json({ error: err.message });
  }
});

// PUT update listing
app.put("/api/listings/:id", requireAdmin, async (req, res) => {
  try {
    const listing = await dbService.updateListing(req.params.id, req.body);
    if (!listing) return res.status(404).json({ error: "Listing not found" });
    res.json(listing);
  } catch (err) {
    console.error("Update listing error:", err);
    res.status(400).json({ error: err.message });
  }
});

// DELETE listing
app.delete("/api/listings/:id", requireAdmin, async (req, res) => {
  try {
    const listing = await dbService.deleteListing(req.params.id);
    if (!listing) return res.status(404).json({ error: "Listing not found" });
    res.json({ message: "Listing deleted successfully" });
  } catch (err) {
    console.error("Delete listing error:", err);
    res.status(500).json({ error: "Failed to delete listing" });
  }
});

// GET all users (Admin view)
app.get("/api/admin/users", requireAdmin, async (req, res) => {
  try {
    const users = await dbService.getAllUsers();
    res.json(users);
  } catch (err) {
    console.error("Fetch admin users failed:", err);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// TOGGLE active status of user
app.put("/api/admin/users/:id/toggle", requireAdmin, async (req, res) => {
  try {
    const user = await dbService.getUserById(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    const updated = await dbService.updateUserRecord(req.params.id, { isActive: !user.isActive });
    res.json(updated);
  } catch (err) {
    console.error("Toggle user active state error:", err);
    res.status(500).json({ error: "Failed to update user status" });
  }
});

// DELETE user
app.delete("/api/admin/users/:id", requireAdmin, async (req, res) => {
  try {
    const user = await dbService.deleteUserRecord(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ message: "User deleted successfully" });
  } catch (err) {
    console.error("Delete user error:", err);
    res.status(500).json({ error: "Failed to delete user" });
  }
});

// EXPORT users CSV
app.get("/api/admin/users/export", requireAdmin, async (req, res) => {
  try {
    const users = await dbService.getAllUsers();
    const headers = ["Name", "Username", "Email", "Phone", "Gender", "City", "Date of Birth", "Joined Date", "Last Login"];
    const csvRows = [headers.join(",")];
    for (const u of users) {
      const row = [
        `"${(u.fullName || '').replace(/"/g, '""')}"`,
        `"${(u.username || '').replace(/"/g, '""')}"`,
        `"${(u.email || '').replace(/"/g, '""')}"`,
        `"${(u.phone || '').replace(/"/g, '""')}"`,
        `"${(u.gender || '').replace(/"/g, '""')}"`,
        `"${(u.city || '').replace(/"/g, '""')}"`,
        `"${u.dateOfBirth ? new Date(u.dateOfBirth).toISOString().split('T')[0] : ''}"`,
        `"${u.createdAt ? new Date(u.createdAt).toISOString().split('T')[0] : ''}"`,
        `"${u.lastLogin ? new Date(u.lastLogin).toISOString() : ''}"`
      ];
      csvRows.push(row.join(","));
    }
    const csvString = csvRows.join("\n");
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename=users_export_${new Date().toISOString().split('T')[0]}.csv`);
    res.status(200).send(csvString);
  } catch (err) {
    console.error("CSV Export failed:", err);
    res.status(500).send("Export failed");
  }
});

// GET admin profile details
app.get("/api/admin/profile", requireAdmin, async (req, res) => {
  try {
    const profile = await dbService.getAdminProfile();
    res.json(profile);
  } catch (err) {
    console.error("Fetch profile error:", err);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

// PUT update admin profile details
app.put("/api/admin/profile", requireAdmin, async (req, res) => {
  try {
    const profile = await dbService.updateAdminProfile(req.body);
    res.json(profile);
  } catch (err) {
    console.error("Update profile error:", err);
    res.status(400).json({ error: err.message });
  }
});


// =============================================
//  START SERVER
// =============================================

app.listen(port, () => {
  console.log(`app is listening on port ${port}`);
});