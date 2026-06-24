import mongoose from "mongoose";

const adminProfileSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  displayName: {
    type: String,
    default: "Admin",
    trim: true,
  },
  email: {
    type: String,
    default: "",
    trim: true,
  },
  phone: {
    type: String,
    default: "",
    trim: true,
  },
  bio: {
    type: String,
    default: "",
  },
  avatar: {
    type: String, // Base64 data URI
    default: "",
  },
  location: {
    type: String,
    default: "",
    trim: true,
  },
  website: {
    type: String,
    default: "",
    trim: true,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

const AdminProfile = mongoose.model("AdminProfile", adminProfileSchema);

export default AdminProfile;
