import mongoose from "mongoose";

const adminSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true,
    trim: true,
  },
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  phone: {
    type: String,
    trim: true,
    default: "",
  },
  avatar: {
    type: String, // Base64 data URI
    default: "",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  lastLogin: {
    type: Date,
    required: false,
  },
  // Additional fields for profile compatibility in Admin Dashboard
  location: {
    type: String,
    trim: true,
    default: "",
  },
  website: {
    type: String,
    trim: true,
    default: "",
  },
  bio: {
    type: String,
    default: "",
  }
});

const Admin = mongoose.model("Admin", adminSchema);

export default Admin;
