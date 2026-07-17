# Aware — Personal Finance Workspace (PWA)

Aware is a premium, mobile-first Progressive Web App (PWA) designed to track expenses dynamically. It features a modern light theme following the Material Design 3 token system, structured project folders and files (similar to a document editor), interactive numeric keypad inputs, email verification for account recovery, and a local MySQL database.

---

## Key Features

- **Progressive Web App (PWA)**: Installable directly onto mobile home screens or desktops with offline service worker asset caching.
- **Hierarchical Sidebar Workspace**: Group your expense lists under custom folders (e.g., Projects, Trips, Archive) with smooth toggle accordion dropdowns.
- **Dynamic Wallet Budget Thresholds**: Define budget limit wallets for both folders and files. Watch active progress bars change color (green/yellow/red) based on target usage percentages.
- **Secure JWT Authentication**: Keep records private with password hashing via `bcryptjs` and token session tracking.
- **OTP Password Recovery**: Safe password resets using Gmail Transporter OTP verification codes.
- **Chat-Style Quick-Entry Bar**: Simply type expenses in the dashboard (e.g. `12.50 Starbucks Coffee`) to log them instantly.
- **Asymmetric Bento Grids**: Beautiful overview dashboards containing analytics, CSS donut charts, and spending breakdown statistics.

---

## Deployment Guide (Run in Browser)

Follow these steps to deploy and run the application on your local machine:

### 1. Prerequisites
Ensure you have the following installed on your system:
- **[Node.js](https://nodejs.org/)** (v16.0.0 or higher)
- **[MySQL Server](https://dev.mysql.com/downloads/installer/)**

---

### 2. MySQL Database Setup

The application stores data inside a local MySQL server instance.

1. Open your MySQL client (Command Line Client, Workbench, or terminal) and connect as root:
   ```sql
   mysql -u root -p
   ```
2. Create the database:
   ```sql
   CREATE DATABASE IF NOT EXISTS aware_tracker;
   ```
3. Run the schema creation queries to build the required tables (`users`, `folders`, `files`, `expenses`):
   ```sql
   USE aware_tracker;

   CREATE TABLE IF NOT EXISTS users (
     id VARCHAR(36) PRIMARY KEY,
     name VARCHAR(255) NOT NULL,
     email VARCHAR(255) UNIQUE NOT NULL,
     password_hash VARCHAR(255) NOT NULL,
     reset_token VARCHAR(6) NULL,
     reset_token_expiry DATETIME NULL,
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   );

   CREATE TABLE IF NOT EXISTS folders (
     id VARCHAR(36) PRIMARY KEY,
     user_id VARCHAR(36) NOT NULL,
     name VARCHAR(255) NOT NULL,
     wallet_limit DECIMAL(10, 2) NULL,
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
   );

   CREATE TABLE IF NOT EXISTS files (
     id VARCHAR(36) PRIMARY KEY,
     user_id VARCHAR(36) NOT NULL,
     folder_id VARCHAR(36) NULL,
     name VARCHAR(255) NOT NULL,
     wallet_limit DECIMAL(10, 2) NULL,
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
     FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE CASCADE
   );

   CREATE TABLE IF NOT EXISTS expenses (
     id VARCHAR(36) PRIMARY KEY,
     user_id VARCHAR(36) NOT NULL,
     file_id VARCHAR(36) NOT NULL,
     amount DECIMAL(10, 2) NOT NULL,
     description TEXT NULL,
     category VARCHAR(100) DEFAULT 'Other',
     date DATETIME NOT NULL,
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
     FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE
   );
   ```

---

### 3. Application Configuration

The database credentials and email settings are managed securely. 

- **Database Credentials** are pre-configured to connect to a local server using `root` and password `ihtarahbivaK@103535`.
- **OTP Recovery Mailer**: Configured to send 6-digit OTP verification codes via Nodemailer.

---

### 4. Install Dependencies & Launch

1. Navigate to the project root directory:
   ```bash
   cd Personal_Expense_Tracker
   ```
2. Install all required packages:
   ```bash
   npm install
   ```
3. Start the Express server:
   ```bash
   npm start
   ```
4. Access the application in your browser:
   Open **[http://localhost:3000](http://localhost:3000)**.

---

## How to Install as a PWA
When running the app in a mobile browser (Safari, Chrome) or desktop browser:
1. Tap the browser **Share** button (iOS) or the **More Options** (three dots) menu (Android/Desktop).
2. Select **"Add to Home Screen"** or **"Install Aware"**.
3. Launch Aware directly from your home screen as a standalone application.
