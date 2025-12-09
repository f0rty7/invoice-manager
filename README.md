# PDF Invoice Manager

A full-stack monorepo application for parsing, storing, and managing Zepto/Blinkit invoice PDFs with multi-user support and admin panel.

## 🏗️ Architecture

- **Backend**: Hono.js + MongoDB + TypeScript
- **Frontend**: Angular 21 (Zoneless, Standalone Components) + Angular Material
- **Shared**: Common TypeScript types
- **Database**: MongoDB (Local installation)
- **Auth**: JWT-based authentication with role-based access control

## 🆕 Angular 21 Features Used

- ✅ **Zoneless Change Detection** - No zone.js for better performance
- ✅ **Signal-Based Reactivity** - Modern reactive programming
- ✅ **Standalone Components** - No NgModules needed
- ✅ **Latest TypeScript 5.9** - Enhanced type safety
- ✅ **OnPush Detection** - Optimized rendering

## 📁 Project Structure

```
pdf-extract/
├── backend/               # Hono.js API server
│   ├── src/
│   │   ├── config/       # Configuration
│   │   ├── db/           # MongoDB connection
│   │   ├── middleware/   # Auth, error handling
│   │   ├── parsers/      # Zepto & Blinkit PDF parsers
│   │   ├── routes/       # API routes
│   │   ├── services/     # Business logic
│   │   └── utils/        # JWT, password hashing
│   └── package.json
├── frontend/             # Angular 21 application
│   ├── src/
│   │   ├── app/
│   │   │   ├── components/  # Reusable components
│   │   │   ├── pages/       # Route pages
│   │   │   ├── services/    # HTTP & state services
│   │   │   ├── guards/      # Route guards
│   │   │   └── interceptors/# HTTP interceptors
│   │   └── styles.scss
│   └── package.json
├── shared/               # Shared TypeScript types
│   └── src/types.ts
└── package.json          # Root workspace
```

## ✅ Implemented Features

### Backend
- ✅ JWT authentication with role-based access (user/admin)
- ✅ Auto-detect PDF format (Zepto/Blinkit)
- ✅ Multi-file upload with deduplication
- ✅ Efficient MongoDB queries with indexes
- ✅ Pagination & filtering (date, category, price, user)
- ✅ Statistics aggregation
- ✅ CORS & compression middleware
- ✅ Error handling

### Frontend
- ✅ Signal-based reactive state management
- ✅ Login/Register with form validation
- ✅ Auth interceptor for JWT
- ✅ Route guards (auth & admin)
- ✅ Invoice service with observables
- ✅ Async pipes for declarative templates
- ✅ Upload component (drag-drop, multi-file, progress)
- ✅ Filter bar (date, category, price, username)
- ✅ Invoice table (expandable, OnPush, pagination)
- ✅ Stats cards with visualizations
- ✅ Dashboard & Admin panel

## 🚀 Getting Started

### Prerequisites
- Node.js 20+ or 22+
- MongoDB installed and running locally
- npm or yarn

### Installation

1. **Setup MongoDB**

Make sure MongoDB is installed and running:
```bash
# Check if MongoDB is running
mongosh mongodb://localhost:27017

# If not running, start MongoDB service
# Windows: Start MongoDB service from Services
# Mac: brew services start mongodb-community
# Linux: sudo systemctl start mongod
```

2. **Install Dependencies**
```bash
# Automated setup
./setup.sh      # Linux/Mac
setup.bat       # Windows

# Or manually:
npm install
cd shared && npm install && npm run build && cd ..
cd backend && npm install && cd ..
cd frontend && npm install && cd ..
```

3. **Configure Backend**

The backend is pre-configured for local MongoDB. If needed, update `backend/.env`:
```env
MONGODB_URI=mongodb://localhost:27017/invoice_manager
MONGODB_DB_NAME=invoice_manager
JWT_SECRET=your-secret-key-here
```

4. **Start Backend**
```bash
cd backend
npm run dev
# Server runs on http://localhost:3000
```

5. **Start Frontend**
```bash
cd frontend
npm start
# App runs on http://localhost:4200
```

### Default Credentials
- **Admin**: username: `admin`, password: `admin123`
- **User**: Register a new account

## 📋 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Invoices (Protected)
- `POST /api/invoices/upload` - Upload PDF files
- `GET /api/invoices` - List invoices with filters
- `GET /api/invoices/:id` - Get single invoice
- `DELETE /api/invoices/:id` - Delete invoice
- `GET /api/invoices/stats/summary` - Get statistics

## 🔑 Environment Variables

### Backend (.env)
```env
MONGODB_URI=mongodb://localhost:27017/invoice_manager
MONGODB_DB_NAME=invoice_manager
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:4200
```

## 🎯 Key Features

### Multi-User Support
- Each user sees only their own invoices
- Admin can view all users' data
- Username automatically tagged to uploaded invoices

### PDF Parsing
- Auto-detects Zepto or Blinkit format
- Extracts invoice details, items, and categories
- Handles multiple invoices per PDF (Blinkit)

### Performance Optimizations
- **Backend**:
  - Compound MongoDB indexes for fast queries
  - Connection pooling
  - Compression middleware
  - Bulk insert operations
- **Frontend**:
  - Zoneless Angular 21 (no zone.js overhead)
  - OnPush change detection strategy
  - Signal-based reactivity
  - Lazy-loaded routes
  - Async pipes (no manual subscriptions)

### Data Management
- **Deduplication**: order_no is unique key
- **Check before insert**: Prevents duplicates
- **Efficient filtering**: Date, category, price range, user
- **Pagination**: Cursor-based for better performance

## 📊 Data Flow

```
User Upload PDF → Frontend → Backend API → PDF Parser (Auto-detect) 
→ Parse Result → Check Duplicate → Insert to MongoDB → Return Result
```

## 🔒 Security Features
- JWT token authentication
- Password hashing with bcrypt
- Role-based access control
- HTTP-only auth flow
- Protected routes with guards

## 🎨 UI Features

### Components:
1. **Upload Component** - Drag & drop, multi-file, progress
2. **Filter Bar** - Date picker, category dropdown, price slider
3. **Invoice Table** - Sortable, expandable rows, pagination
4. **Stats Cards** - Total invoices, amount, category breakdown
5. **Dashboard Page** - Combine all components
6. **Admin Page** - View all users' data with user filter

### Material Components Used:
- MatCard, MatTable, MatPaginator, MatFormField
- MatDatepicker, MatSelect, MatSlider
- MatChip, MatDialog, MatButton, MatIcon

## 🧪 Testing

### Backend
```bash
cd backend
npm test
```

### Frontend
```bash
cd frontend
npm test
```

## 📦 Building for Production

### Backend
```bash
cd backend
npm run build
npm start
```

### Frontend
```bash
cd frontend
npm run build
# Output in frontend/dist
```

## 🎓 SOLID Principles Applied

- **Single Responsibility**: Each service handles one domain
- **Open/Closed**: Parser interface allows adding new formats
- **Liskov Substitution**: ZeptoParser & BlinkitParser implement PDFParser
- **Interface Segregation**: Separate auth, invoice, stats interfaces
- **Dependency Inversion**: Services depend on abstractions (interfaces)

## 📈 Performance Metrics

### Database Indexes
- `{ order_no: 1 }` - Unique, O(log n) lookup
- `{ user_id: 1, date: -1 }` - Compound for user queries
- `{ 'items.category': 1, date: -1 }` - Category filtering
- `{ items_total: 1 }` - Price range queries

### Time Complexity
- Invoice lookup: O(log n)
- Filter queries: O(log n + k) where k is result size
- Bulk insert: O(n log n)
- Category matching: O(1) with regex precompilation

## 🐛 Troubleshooting

### MongoDB Connection Issues
- Check if MongoDB is running: `mongosh mongodb://localhost:27017`
- Start MongoDB service if not running
- Verify connection string in backend/.env

### Frontend Build Errors
- Clear cache: `rm -rf node_modules package-lock.json && npm install`
- Check Angular version: `ng version` (should be 21)
- Update Angular: `ng update @angular/core@21 @angular/cli@21`

### CORS Errors
- Verify FRONTEND_URL in backend/.env matches frontend URL
- Check proxy.conf.json in frontend

## 📝 Next Steps

1. Upload sample PDFs (14-nov-2.pdf, ForwardInvoice_ORD63610386301.pdf)
2. Test filtering and pagination
3. Try admin panel features
4. Add more users and test multi-user scenarios
5. Customize categories or add new PDF parsers

## 📄 License

MIT

## 👥 Contributing

Contributions welcome! Please read the contribution guidelines first.

## 📖 Documentation

- [QUICKSTART.md](QUICKSTART.md) - Quick setup guide
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - Common issues and solutions
- [TESTING.md](TESTING.md) - Test credentials and scenarios
- [FINAL_SUMMARY.md](FINAL_SUMMARY.md) - Implementation summary
