import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Listing from "./models/Listing.js";
import AdminProfile from "./models/AdminProfile.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const JSON_DB_PATH = path.join(__dirname, "db.json");

let useJsonDb = false;

// Determine if we should use the JSON fallback based on connection URL
const mongoUrl = process.env.mongodb_url;
if (!mongoUrl || mongoUrl.includes("xxxxx")) {
  console.log("⚠️ MongoDB URL is missing or is a placeholder. Using local JSON database (db.json).");
  useJsonDb = true;
}

// Initial structure for JSON db
const defaultDb = {
  listings: [],
  profile: {
    username: "admin",
    displayName: "Admin",
    email: "admin@stayease.com",
    phone: "+91 98765 43210",
    location: "Shimla, India",
    website: "https://stayease.com",
    bio: "Stay-Ease Administrator",
    avatar: ""
  }
};

// Helper to read JSON DB
function readJsonDb() {
  try {
    if (!fs.existsSync(JSON_DB_PATH)) {
      fs.writeFileSync(JSON_DB_PATH, JSON.stringify(defaultDb, null, 2));
      return defaultDb;
    }
    const data = fs.readFileSync(JSON_DB_PATH, "utf8");
    return JSON.parse(data);
  } catch (err) {
    console.error("Error reading JSON DB:", err);
    return defaultDb;
  }
}

// Helper to write JSON DB
function writeJsonDb(data) {
  try {
    fs.writeFileSync(JSON_DB_PATH, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Error writing JSON DB:", err);
  }
}

export const dbService = {
  setFallbackActive() {
    if (!useJsonDb) {
      useJsonDb = true;
      console.log("🔄 dbService switched to local JSON DB fallback.");
    }
  },
  
  isFallback() {
    return useJsonDb;
  },

  // ===== Listings operations =====
  async getListings(filter = {}) {
    if (!useJsonDb) {
      try {
        return await Listing.find(filter).sort({ createdAt: -1 });
      } catch (err) {
        console.error("Mongoose getListings failed, falling back:", err.message);
        dbService.setFallbackActive();
      }
    }
    
    // JSON fallback
    const db = readJsonDb();
    let items = db.listings;
    if (filter.category) {
      items = items.filter(item => item.category === filter.category);
    }
    return [...items].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },

  async getListingById(id) {
    if (!useJsonDb) {
      try {
        return await Listing.findById(id);
      } catch (err) {
        console.error("Mongoose getListingById failed, falling back:", err.message);
        dbService.setFallbackActive();
      }
    }

    const db = readJsonDb();
    return db.listings.find(item => item._id === id) || null;
  },

  async createListing(data) {
    if (!useJsonDb) {
      try {
        const listing = new Listing(data);
        return await listing.save();
      } catch (err) {
        console.error("Mongoose createListing failed, falling back:", err.message);
        dbService.setFallbackActive();
      }
    }

    const db = readJsonDb();
    const newListing = {
      _id: "json_" + Math.random().toString(36).substr(2, 9),
      ...data,
      createdAt: new Date().toISOString()
    };
    db.listings.push(newListing);
    writeJsonDb(db);
    return newListing;
  },

  async updateListing(id, data) {
    if (!useJsonDb) {
      try {
        return await Listing.findByIdAndUpdate(id, data, { new: true, runValidators: true });
      } catch (err) {
        console.error("Mongoose updateListing failed, falling back:", err.message);
        dbService.setFallbackActive();
      }
    }

    const db = readJsonDb();
    const idx = db.listings.findIndex(item => item._id === id);
    if (idx === -1) return null;
    
    db.listings[idx] = {
      ...db.listings[idx],
      ...data
    };
    writeJsonDb(db);
    return db.listings[idx];
  },

  async deleteListing(id) {
    if (!useJsonDb) {
      try {
        return await Listing.findByIdAndDelete(id);
      } catch (err) {
        console.error("Mongoose deleteListing failed, falling back:", err.message);
        dbService.setFallbackActive();
      }
    }

    const db = readJsonDb();
    const idx = db.listings.findIndex(item => item._id === id);
    if (idx === -1) return null;
    const deleted = db.listings.splice(idx, 1)[0];
    writeJsonDb(db);
    return deleted;
  },

  // ===== Profile operations =====
  async getAdminProfile() {
    if (!useJsonDb) {
      try {
        let profile = await AdminProfile.findOne({ username: "admin" });
        if (!profile) {
          profile = new AdminProfile({
            username: "admin",
            displayName: "Admin",
            email: "admin@stayease.com",
            phone: "+91 98765 43210",
            location: "Shimla, India",
            website: "https://stayease.com",
            bio: "Stay-Ease Administrator"
          });
          await profile.save();
        }
        return profile;
      } catch (err) {
        console.error("Mongoose getAdminProfile failed, falling back:", err.message);
        dbService.setFallbackActive();
      }
    }

    const db = readJsonDb();
    return db.profile;
  },

  async updateAdminProfile(data) {
    if (!useJsonDb) {
      try {
        let profile = await AdminProfile.findOne({ username: "admin" });
        if (!profile) {
          profile = new AdminProfile({ username: "admin" });
        }
        profile.displayName = data.displayName;
        profile.email = data.email;
        profile.phone = data.phone;
        profile.location = data.location;
        profile.website = data.website;
        profile.bio = data.bio;
        profile.avatar = data.avatar;
        profile.updatedAt = Date.now();
        await profile.save();
        return profile;
      } catch (err) {
        console.error("Mongoose updateAdminProfile failed, falling back:", err.message);
        dbService.setFallbackActive();
      }
    }

    const db = readJsonDb();
    db.profile = {
      ...db.profile,
      ...data,
      updatedAt: new Date().toISOString()
    };
    writeJsonDb(db);
    return db.profile;
  }
};
