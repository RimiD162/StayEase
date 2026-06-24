import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import mongoose from "mongoose";
import session from "express-session";
import Listing from "./models/Listing.js";
import AdminProfile from "./models/AdminProfile.js";
import { dbService } from "./dbService.js";

dotenv.config();

const app = express();
const port = 8080;

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
    secret: "stayease-admin-secret-key-2026",
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 }, // 24 hours
  })
);

// ===== MongoDB Connection =====
const mongoUrl = process.env.mongodb_url;

if (mongoUrl && !mongoUrl.includes("xxxxx")) {
  mongoose
    .connect(mongoUrl, { dbName: "stayease", serverSelectionTimeoutMS: 5000 })
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
function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) {
    return next();
  }
  res.redirect("/admin/login");
}

// ===== Admin Credentials =====
const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "admin123";

// =============================================
//  PUBLIC ROUTES
// =============================================

app.get("/home", (req, res) => {
  res.render("home");
});

app.get("/home/hotel", async (req, res) => {
  try {
    const listings = await dbService.getListings({ category: "Hotel" });
    res.render("hotel", { listings });
  } catch (err) {
    console.error(err);
    res.render("hotel", { listings: [] });
  }
});

app.get("/home/Rentals", async (req, res) => {
  try {
    const listings = await dbService.getListings({ category: "Rental" });
    res.render("Rentals", { listings });
  } catch (err) {
    console.error(err);
    res.render("Rentals", { listings: [] });
  }
});

app.get("/home/Lodges", async (req, res) => {
  try {
    const listings = await dbService.getListings({ category: "Lodge" });
    res.render("Lodges", { listings });
  } catch (err) {
    console.error(err);
    res.render("Lodges", { listings: [] });
  }
});

// =============================================
//  ADMIN AUTH ROUTES
// =============================================

app.get("/admin/login", (req, res) => {
  if (req.session && req.session.isAdmin) {
    return res.redirect("/admin/dashboard");
  }
  res.render("adminLogin", { error: null });
});

app.post("/admin/login", (req, res) => {
  const { username, password } = req.body;

  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    req.session.isAdmin = true;
    req.session.adminUser = username;
    return res.redirect("/admin/dashboard");
  }

  res.render("adminLogin", { error: "Invalid username or password" });
});

app.get("/admin/logout", (req, res) => {
  req.session.destroy((err) => {
    res.redirect("/admin/login");
  });
});

app.get("/admin/dashboard", requireAdmin, (req, res) => {
  res.render("adminDashboard");
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

// =============================================
//  ADMIN PROFILE API ROUTES
// =============================================

// GET admin profile
app.get("/api/admin/profile", requireAdmin, async (req, res) => {
  try {
    const profile = await dbService.getAdminProfile();
    res.json(profile);
  } catch (err) {
    console.error("Fetch profile error:", err);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

// PUT update admin profile
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