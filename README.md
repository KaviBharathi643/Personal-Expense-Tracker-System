# Spendy — Personal Expense Tracker

A simple, lightweight, and visually stunning Personal Expense Tracker. Built with a clean Node.js backend and a modern vanilla CSS light-themed frontend.

## Features
- **Summary Metrics**: Real-time totals, transaction counting, and top spending category detection.
- **Doughnut Visualization**: Programmatic category breakdowns drawn on HTML canvas.
- **Transaction Feed**: Easily add, edit, or delete transactions with filters and custom sorting.
- **Light Theme Design**: Curated HSL colors, responsive grid system, and micro-interactions.
- **Clean JSON DB**: Extremely lightweight file-based storage with zero setup required.

## Getting Started

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed (v16.0.0 or higher is recommended).

### Setup and Installation

1. **Clone the Repository**
   ```bash
   git clone <repository-url>
   cd Personal_Expense_Tracker
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Start the Application**
   ```bash
   npm start
   ```

4. **Access the App**
   Open your browser and navigate to **[http://localhost:3000](http://localhost:3000)**.

## Project Structure
```
Personal_Expense_Tracker/
├── backend/
│   ├── database.js     # Lightweight JSON database manager
│   └── server.js       # Express server API endpoints
├── frontend/
│   ├── index.html      # UI Structure
│   ├── style.css       # Custom design styles
│   └── app.js          # Interactive frontend logic & API client
├── data/
│   └── expenses.json   # Auto-created local data storage (git ignored)
├── .gitignore          # File exclusions
├── package.json        # Project metadata & dependency setup
└── README.md           # Getting started instructions
```
