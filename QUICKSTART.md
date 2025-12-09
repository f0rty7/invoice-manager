# Quick Start Guide - Angular 21 & Local MongoDB

## 🚀 Get Started in 5 Minutes

### Prerequisites
- Node.js 20+ or 22+
- MongoDB installed and running locally
- npm

### Step 1: Check MongoDB

```bash
# Test MongoDB connection
mongosh mongodb://localhost:27017

# If MongoDB is not running, start it:
# Windows: Start "MongoDB Server" from Services
# Mac: brew services start mongodb-community
# Linux: sudo systemctl start mongod
```

### Step 2: Automated Setup

```bash
# Windows
setup.bat

# Linux/Mac
chmod +x setup.sh && ./setup.sh
```

### Step 3: Manual Setup (if needed)

```bash
# Install dependencies
npm install
cd shared && npm install && npm run build && cd ..
cd backend && npm install && cd ..
cd frontend && npm install && cd ..
```

### Step 4: Start Services

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
# Backend runs on http://localhost:3000
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm start
# Frontend runs on http://localhost:4200
```

### Step 5: Access Application

- **URL**: http://localhost:4200
- **Login**: `admin` / `admin123`

## 🆕 What's New in Angular 21

- ✅ **Zoneless by default** - No zone.js overhead
- ✅ **Improved signals** - Better reactivity
- ✅ **TypeScript 5.9** - Latest features
- ✅ **Better performance** - Faster change detection

## 📝 What's Working

### Backend ✅
- User registration & login with JWT
- PDF upload and parsing (Zepto & Blinkit)
- Invoice CRUD operations
- Multi-user support
- Admin access control
- Statistics and filtering
- Auto-deduplication by order_no

### Frontend ✅
- Login/Register pages
- JWT authentication
- Protected routes
- Auth interceptor
- Signal-based state management
- Upload component (drag-drop, multi-file)
- Filter bar (date, category, price, username)
- Invoice table (expandable, paginated)
- Stats cards
- Dashboard & Admin panel

## 🔨 What Changed from Docker

### Before (Docker):
```bash
docker-compose up -d  # Start MongoDB container
```

### Now (Local MongoDB):
```bash
mongosh mongodb://localhost:27017  # Check MongoDB is running
```

### Configuration Update:
- `backend/.env`: `MONGODB_URI=mongodb://localhost:27017/invoice_manager`
- No Docker Compose file needed
- MongoDB runs as a system service

## 🎯 Quick Test Workflow

1. **Start MongoDB** (if not running)
   ```bash
   # Check status
   mongosh
   ```

2. **Run setup script**
   ```bash
   setup.bat  # Windows
   ./setup.sh # Linux/Mac
   ```

3. **Start backend**
   ```bash
   cd backend && npm run dev
   ```

4. **Start frontend**
   ```bash
   cd frontend && npm start
   ```

5. **Test the app**
   - Login at http://localhost:4200
   - Upload a PDF (use sample files in project root)
   - View invoices
   - Apply filters
   - Check admin panel

## 🐛 Quick Troubleshooting

### MongoDB not connecting?
```bash
# Check if MongoDB is running
mongosh mongodb://localhost:27017

# Start MongoDB service
# Windows: Services → MongoDB Server → Start
# Mac: brew services start mongodb-community  
# Linux: sudo systemctl start mongod
```

### Frontend build errors?
```bash
cd frontend
rm -rf node_modules package-lock.json .angular
npm install
```

### Backend errors?
```bash
cd backend
rm -rf node_modules
npm install
```

### Create admin user manually (if needed):
```bash
mongosh mongodb://localhost:27017/invoice_manager

# In mongosh:
db.users.insertOne({
  username: "admin",
  password: "$2a$10$X8R.jZGqzH3R5Z9L9GzR1.5kZH5wY5qJY5Z9L9GzR1.5kZH5wY5qJe",
  role: "admin",
  created_at: new Date(),
  updated_at: new Date()
})
```

## 📦 MongoDB Database Structure

```javascript
// Database: invoice_manager

// Collections:
// 1. users - User accounts
// 2. invoices - Invoice data

// Indexes (created automatically):
db.invoices.createIndex({ order_no: 1 }, { unique: true })
db.invoices.createIndex({ user_id: 1, date: -1 })
db.invoices.createIndex({ "items.category": 1, date: -1 })
db.users.createIndex({ username: 1 }, { unique: true })
```

## 🎨 Angular 21 Features in Action

### Zoneless Change Detection
```typescript
// main.ts
import { provideExperimentalZonelessChangeDetection } from '@angular/core';

bootstrapApplication(AppComponent, {
  providers: [
    provideExperimentalZonelessChangeDetection(), // ← Zoneless!
    // ... other providers
  ]
})
```

### Signal-Based State
```typescript
// invoice-state.service.ts
private invoicesSignal = signal<Invoice[]>([]);
invoices = this.invoicesSignal.asReadonly();

// Component
invoices = this.invoiceState.invoices; // Auto-updates!
```

### OnPush with Signals
```typescript
@Component({
  selector: 'app-invoice-table',
  changeDetection: ChangeDetectionStrategy.OnPush // ← Optimized!
})
```

## 📊 Performance Improvements

Angular 21 + Signals + Zoneless = **Faster App!**

- ✅ No zone.js overhead
- ✅ More predictable change detection
- ✅ Better debugging
- ✅ Smaller bundle size
- ✅ Improved reactivity

## 🎊 You're Ready!

The application is fully functional with Angular 21 and local MongoDB. Start uploading invoices and enjoy the improved performance!

For detailed documentation, see:
- [README.md](README.md) - Complete documentation
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - Common issues
- [TESTING.md](TESTING.md) - Test scenarios
