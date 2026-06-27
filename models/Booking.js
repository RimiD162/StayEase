import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema({
  bookingId: {
    type: String,
    required: true,
    unique: true,
  },
  listingId: {
    type: String,
    required: true,
  },
  listingName: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    required: true,
    enum: ["Hotel", "Lodge", "Rental"],
  },
  location: {
    type: String,
    required: true,
  },
  listingImage: {
    type: String,
    default: "",
  },

  // Guest Details
  guestName: {
    type: String,
    required: true,
  },
  guestEmail: {
    type: String,
    required: true,
  },
  guestPhone: {
    type: String,
    required: true,
  },
  userId: {
    type: String, // Stored if user is logged in
    default: null,
  },

  // Stay Details
  checkIn: {
    type: Date,
    required: true,
  },
  checkOut: {
    type: Date,
    required: true,
  },
  nights: {
    type: Number,
    required: true,
    min: 1,
  },
  guests: {
    type: Number,
    required: true,
    min: 1,
    max: 10,
  },
  roomType: {
    type: String,
    required: true,
    enum: ["Standard", "Deluxe", "Suite"],
  },

  // Payment Breakdown
  pricePerNight: {
    type: Number,
    required: true,
    min: 0,
  },
  subtotal: {
    type: Number,
    required: true,
    min: 0,
  },
  tax: {
    type: Number,
    required: true,
    min: 0,
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0,
  },
  paymentMethod: {
    type: String,
    required: true,
  },
  specialRequests: {
    type: String,
    default: "",
  },

  // Status
  status: {
    type: String,
    enum: ["Pending", "Confirmed", "Cancelled"],
    default: "Confirmed",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Booking = mongoose.model("Booking", bookingSchema);

export default Booking;
