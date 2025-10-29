# Waterford Crystal Inventory Management System

A modern, real-time inventory management system designed specifically for Waterford Crystal retail operations at Brown Thomas Concession. Built with React and Firebase to streamline stock tracking, sales processing, and inventory analytics.

![React](https://img.shields.io/badge/React-18.x-61DAFB?style=flat&logo=react)
![Firebase](https://img.shields.io/badge/Firebase-10.x-FFCA28?style=flat&logo=firebase)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.x-38B2AC?style=flat&logo=tailwind-css)
![Vite](https://img.shields.io/badge/Vite-5.x-646CFF?style=flat&logo=vite)

---

## Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Usage](#-usage)
- [Database Schema](#-database-schema)
- [Roadmap](#-roadmap)
- [Contributing](#-contributing)
- [License](#-license)

---

## Features

### Core Functionality

- **Real-time Dashboard**
  - Live inventory statistics
  - Low stock alerts
  - Out of stock warnings
  - Recent transaction activity
  - Total inventory value tracking

- **Inventory Management**
  - Add, edit, and delete products
  - Track total stock, hold, display, and faulty items
  - SKU-based product search
  - Collection and sub-collection categorization
  - Min stock level alerts

- **Stock Operations**
  - Receive stock with delivery notes
  - Process sales with multi-source allocation
  - Handle customer returns
  - Manage hold and display quantities
  - Track faulty inventory

- **Analytics & Reporting**
  - Sales performance tracking
  - Top selling products
  - Revenue analytics
  - Transaction history (last 50 records)

- **Authentication**
  - Secure Firebase Authentication
  - Email/password login
  - Session management

### Product Organization

The system supports Waterford's complete product catalog:

- **Collections**: Lismore Red, Lismore Diamond, Heritage Mastercraft, Irish Lace, Copper Coast, and more
- **Christmas**: Holiday Heirlooms, Winter Wonders, Christmas Ornaments, Festive Accessories
- **Categories**: Stemware, Barware, Giftware, Home Décor, Lighting

---

## Tech Stack

### Frontend
- **React 18** - UI framework
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Utility-first styling
- **Lucide React** - Icon library

### Backend
- **Firebase Firestore** - Real-time NoSQL database
- **Firebase Authentication** - User authentication
- **Firebase Hosting** - Deployment (optional)

### Development
- **ESLint** - Code linting
- **PostCSS** - CSS processing

---

## Project Structure

```
waterford-crystal-inventory/
├── public/
│   └── vite.svg
├── src/
│   ├── assets/          # Static assets
│   ├── App.jsx          # Main application component
│   ├── firebase.js      # Firebase configuration
│   ├── index.css        # Global styles
│   └── main.jsx         # Application entry point
├── .gitignore
├── eslint.config.js
├── index.html
├── package.json
├── postcss.config.js
├── tailwind.config.js
├── vite.config.js
└── README.md
```

---

## Installation

### Prerequisites

- Node.js 18+ and npm/yarn
- Firebase account
- Git

### Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/waterford-crystal-inventory.git
   cd waterford-crystal-inventory
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Configure Firebase** (see [Configuration](#-configuration))

4. **Start development server**
   ```bash
   npm run dev
   # or
   yarn dev
   ```

5. **Build for production**
   ```bash
   npm run build
   # or
   yarn build
   ```

---

## Configuration

### Firebase Setup

1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)

2. Enable **Firestore Database** and **Authentication** (Email/Password)

3. Update `src/firebase.js` with your Firebase configuration:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
  measurementId: "YOUR_MEASUREMENT_ID"
};
```

4. **Firestore Security Rules** (recommended for production):

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /products/{document=**} {
      allow read, write: if request.auth != null;
    }
    match /transactions/{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

5. Create a user account in Firebase Authentication

---

## Usage

### Login
- Use the credentials created in Firebase Authentication
- Email and password required

### Adding Products
1. Click the **"+ Add Product"** button or floating action button
2. Fill in product details:
   - Product name
   - Article number (SKU)
   - Main category and sub-collection
   - Initial stock quantity
   - Min stock alert level
   - Retail price
3. Click **"Add Product"**

### Stock Operations

**Receiving Stock:**
- Click **"Receive"** on a product
- Enter quantity and delivery notes
- Confirms and updates total stock

**Processing Sales:**
- Click **"Sell"** on a product
- System automatically allocates from available sources:
  - Free stock (priority)
  - Hold stock (if needed)
  - Display stock (if needed)
- For multiple sources, breakdown selection dialog appears

**Managing Hold/Display:**
- Click **"Manage"** on a product
- Adjust hold, display, and fault quantities
- System validates against total stock

**Returns:**
- Click **"Return"** on a product
- Enter returned quantity
- Stock automatically added back

### Viewing Analytics
- Navigate to **"Analytics"** tab
- View total sales, units sold, and top products
- Filter by time period (7 days, 30 days, 3 months)

---

## Database Schema

### Products Collection

| Field | Type | Description |
|-------|------|-------------|
| `id` | Auto ID | Firestore document ID |
| `name` | String | Product name |
| `sku` | String | Article number (unique) |
| `mainCategory` | String | Main category (Collections/Christmas) |
| `subCategory` | String | Sub-collection (e.g., Lismore Diamond) |
| `totalStock` | Number | Total inventory quantity |
| `onHold` | Number | Quantity reserved for customers |
| `onDisplay` | Number | Quantity on display floor |
| `onFault` | Number | Faulty items quantity |
| `minStockLevel` | Number | Low stock alert threshold |
| `retailPrice` | Number | Retail price in EUR |
| `createdAt` | Timestamp | Creation timestamp |
| `updatedAt` | Timestamp | Last update timestamp |

### Transactions Collection

| Field | Type | Description |
|-------|------|-------------|
| `id` | Auto ID | Firestore document ID |
| `productId` | String | Reference to product |
| `productName` | String | Product name (denormalized) |
| `productSku` | String | Article number (denormalized) |
| `type` | String | `receive`, `sell`, `return`, `manage` |
| `quantity` | Number | Transaction quantity |
| `quantityBefore` | Number | Stock before transaction |
| `quantityAfter` | Number | Stock after transaction |
| `notes` | String | Transaction notes |
| `timestamp` | Timestamp | Transaction timestamp |

---

## Roadmap

### Planned Features

- [ ] **OCR Integration** - Auto-process delivery notes via photo upload
- [ ] **Shipment Tracking** - Track deliveries from headquarters
- [ ] **Advanced Forecasting** - AI-based stock prediction
- [ ] **Multi-user Support** - Role-based permissions
- [ ] **Export Reports** - Generate Excel/PDF reports
- [ ] **Barcode Scanning** - Quick product lookup
- [ ] **Push Notifications** - Low stock alerts
- [ ] **Mobile Apps** - iOS and Android versions
- [ ] **Batch Operations** - Bulk stock updates
- [ ] **Product Images** - Visual product catalog

### Future Enhancements

- Integration with local courier APIs
- Historical sales trend analysis
- Automated reorder suggestions
- Multi-location support
- Customer hold request system

---

**Made with ❤️ for Waterford Crystal**