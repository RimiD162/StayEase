# Stayandaman 🏨🏔️🏠

Welcome to **Stayandaman**, a modern, premium travel and tourism web application that features sections for Hotels, Lodges, and Rentals, along with a full-featured, secure, and beautiful Admin Dashboard.

## Features

### Public Portal
- **Interactive Home Page**: Dynamic listings showcasing hand-picked accommodations.
- **Dedicated Categories**: Separate sections for **Hotels**, **Lodges**, and **Rentals**.
- **Responsive Layout**: Designed to look stunning on both mobile devices and wide-screen desktops.

### Admin Dashboard (Single-Page App UI)
- **Secure Session-Based Login**: Dedicated authentication page for admin access.
- **Comprehensive Statistics**: High-level stats showing listing numbers and recent additions.
- **Dynamic CRUD Operations**: Add, view, edit, and delete listings with real-time feedback (toasts).
- **Listing Fields**:
  - Name, category selection, location/address, price per night
  - Interactive star rating (1–5 stars)
  - Toggle switch for availability status
  - Multi-select checkbox grid for amenities (WiFi, Parking, AC, Pool, Breakfast)
  - Interactive image upload area with preview before saving
- **Admin Profile Management**: 
  - Edit displayName, email, phone, location, website, bio, and upload an avatar photo.
  - Sidebar and topbar elements dynamically reflect updated avatar and display name.
  - Quick-reset button to discard unsaved edits.
  - Dedicated log-out capability that invalidates the session.

---

## Technical Stack & Architecture

- **Frontend**: HTML5, EJS templates, and custom modern CSS with glassmorphism, HSL tailored variables, and micro-animations.
- **Backend**: Node.js and Express.
- **Database Layer (`dbService.js`)**: A custom-built, resilient data access layer with dual-mode storage:
  - **Mongoose / MongoDB Mode**: Standard mode that stores documents in MongoDB database (`stayandaman`).
  - **Auto-Fallback JSON Database (`db.json`)**: If the database URL contains the placeholder (`xxxxx`) or the connection fails/times out, the application automatically flags and switches to a local file-based JSON database. This ensures the app is 100% testable out-of-the-box without manual database configuration.
- **Image Processing**: Base64 data URIs for listing images and admin avatars, enabling inline previews and database persistence.
- **Authentication**: Session-based auth via `express-session`.

---

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v16 or higher recommended)
- Optional: A running instance of MongoDB or MongoDB Atlas cluster

### Installation

1. Clone the repository and navigate to the project directory:
   ```bash
   cd Stayandaman
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables in the `.env` file at the root:
   ```env
   mongodb_url = mongodb+srv://<username>:<password>@cluster0.yourcluster.mongodb.net/
   ```
   *Note: If left blank or left with the placeholder `xxxxx`, the application will use the local `db.json` database automatically.*

### Running the Application

Start the local server:
```bash
node index.js
```
The application will listen on port **8080**.

Open your browser and visit:
- **Public Portal**: [http://localhost:8080/home](http://localhost:8080/home)
- **Admin Login**: [http://localhost:8080/admin/login](http://localhost:8080/admin/login)



## Project Structure

```text
Stayandaman/
├── models/
│   ├── AdminProfile.js   # Mongoose Schema for admin profiles
│   └── Listing.js        # Mongoose Schema for travel listings
├── public/
│   ├── admin.css         # Main stylesheet for the Admin Dashboard
│   └── (other css/assets)
├── views/
│   ├── adminDashboard.ejs# Main dashboard EJS template (Single-page app)
│   ├── adminLogin.ejs    # Login page template
│   ├── hotel.ejs         # Public hotel grid page
│   ├── Lodges.ejs        # Public lodge grid page
│   ├── Rentals.ejs       # Public rental grid page
│   └── home.ejs          # Home landing page template
├── dbService.js          # Hybrid data controller with MongoDB / JSON fallback
├── db.json               # Auto-generated JSON database (used in fallback mode)
├── index.js              # Express app initialization, routing, and server config
├── package.json          # Dependency definition
└── README.md             # This file
```
