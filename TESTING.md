# 🔑 Test Credentials & Sample Data

## Default Admin Account

**Pre-configured admin account (created automatically):**
- **Username**: `admin`
- **Password**: `admin123`
- **Role**: Administrator
- **Access**: Full system access including admin panel

## Sample User Accounts

**Create your own test users by registering:**
1. Go to http://localhost:4200/register
2. Fill in: username, password, optional email
3. Login with new credentials
4. Each user sees only their own invoices

## Sample PDF Files

The project root contains sample invoices for testing:

### 1. Zepto Invoice
- **File**: `14-nov-2.pdf`
- **Format**: Zepto
- **Features**: Multiple items, standard format
- **Expected Parse**: Success with all items categorized

### 2. Blinkit Invoice
- **File**: `ForwardInvoice_ORD63610386301.pdf`
- **Format**: Blinkit
- **Features**: Multiple tax invoices, convenience charge
- **Expected Parse**: Success with merged items

## Testing Workflow

### 1. Admin Testing
```
1. Login as admin/admin123
2. Upload sample PDFs
3. View invoices in dashboard
4. Apply filters (date, category, price)
5. Navigate to Admin Panel
6. View statistics
7. Test user filter
8. Delete test invoices
```

### 2. Regular User Testing
```
1. Register new user (e.g., testuser/test123)
2. Login with new credentials
3. Upload PDFs
4. Verify only own invoices visible
5. Test filters
6. View statistics
7. Delete own invoices
8. Logout
```

### 3. Multi-User Testing
```
1. Create multiple user accounts
2. Login as User A, upload PDFs
3. Logout, login as User B
4. Verify User B doesn't see User A's invoices
5. Login as admin
6. Verify admin sees all invoices
7. Filter by specific username
```

## API Testing with Thunder Client / Postman

### 1. Register User
```http
POST http://localhost:3000/api/auth/register
Content-Type: application/json

{
  "username": "testuser",
  "password": "test123",
  "email": "test@example.com"
}
```

### 2. Login
```http
POST http://localhost:3000/api/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123"
}

Response:
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "...",
      "username": "admin",
      "role": "admin"
    }
  }
}
```

### 3. Upload PDF
```http
POST http://localhost:3000/api/invoices/upload
Authorization: Bearer <your-jwt-token>
Content-Type: multipart/form-data

files: [select PDF files]
```

### 4. Get Invoices
```http
GET http://localhost:3000/api/invoices?page=1&limit=20
Authorization: Bearer <your-jwt-token>
```

### 5. Get Statistics
```http
GET http://localhost:3000/api/invoices/stats/summary
Authorization: Bearer <your-jwt-token>
```

### 6. Delete Invoice
```http
DELETE http://localhost:3000/api/invoices/<invoice-id>
Authorization: Bearer <your-jwt-token>
```

## Test Scenarios

### Scenario 1: New User Registration
1. ✅ Valid registration (username, password)
2. ✅ Invalid: username too short (< 3 chars)
3. ✅ Invalid: password too short (< 6 chars)
4. ✅ Invalid: duplicate username
5. ✅ Optional email field works

### Scenario 2: Authentication
1. ✅ Valid login credentials
2. ✅ Invalid credentials rejected
3. ✅ JWT token stored in localStorage
4. ✅ Token included in subsequent requests
5. ✅ Protected routes require authentication
6. ✅ Logout clears token

### Scenario 3: PDF Upload
1. ✅ Single PDF upload
2. ✅ Multiple PDF upload
3. ✅ Drag and drop works
4. ✅ File validation (PDF only, max 10MB)
5. ✅ Progress indicators display
6. ✅ Parse results shown
7. ✅ Duplicate order_no prevented

### Scenario 4: Invoice Viewing
1. ✅ User sees only own invoices
2. ✅ Admin sees all invoices
3. ✅ Pagination works
4. ✅ Expandable rows show items
5. ✅ Item categories displayed
6. ✅ Totals calculated correctly

### Scenario 5: Filtering
1. ✅ Filter by date range
2. ✅ Filter by category
3. ✅ Filter by price range
4. ✅ Filter by username (admin only)
5. ✅ Combined filters work
6. ✅ Clear filters resets view
7. ✅ Debounced updates (300ms)

### Scenario 6: Statistics
1. ✅ Total invoices count
2. ✅ Total amount sum
3. ✅ Top categories calculated
4. ✅ All-time stats (admin)
5. ✅ User-specific stats
6. ✅ Real-time updates after upload

### Scenario 7: Admin Panel
1. ✅ Only admin can access
2. ✅ Regular users redirected
3. ✅ View all users' invoices
4. ✅ Filter by username
5. ✅ Delete any invoice
6. ✅ Global statistics visible

### Scenario 8: Error Handling
1. ✅ Invalid PDF format error
2. ✅ Network error handling
3. ✅ Unauthorized access blocked
4. ✅ Duplicate invoice prevented
5. ✅ Form validation errors
6. ✅ Loading states shown

## Sample Test Data

### Expected Categories
- Tobacco
- Snacks & Munchies
- Savories | Sweet Tooth
- Dairy
- Beverages
- Groceries
- Others

### Sample Invoice Data (Zepto)
```json
{
  "invoice_no": "ZEP/2024/12345",
  "order_no": "ORD123456",
  "date": "14-11-2024",
  "delivery_partner": {
    "known_name": "Zepto"
  },
  "items": [
    {
      "sr": 1,
      "description": "Product Name",
      "qty": 1,
      "unit_price": 50.00,
      "price": 50.00,
      "category": "Groceries"
    }
  ],
  "items_total": 50.00
}
```

## Performance Testing

### Load Test Data
- Upload 100+ PDFs
- Create 10+ user accounts
- Filter with various criteria
- Test pagination with large datasets
- Measure response times

### Expected Performance
- Login: < 500ms
- Upload PDF: < 2s per file
- List invoices: < 300ms
- Filter update: < 200ms (after debounce)
- Statistics: < 500ms
- Delete invoice: < 200ms

## Database Verification

### Check Data in MongoDB
```bash
# Connect to MongoDB
docker exec -it pdf-invoice-mongodb mongosh -u admin -p admin123

# Switch to database
use invoice_manager

# Count users
db.users.countDocuments()

# Count invoices
db.invoices.countDocuments()

# View sample invoice
db.invoices.findOne()

# View indexes
db.invoices.getIndexes()

# Find invoices by user
db.invoices.find({ username: "admin" })

# Check for duplicates
db.invoices.aggregate([
  { $group: { _id: "$order_no", count: { $sum: 1 } } },
  { $match: { count: { $gt: 1 } } }
])
```

## Clean Test Data

### Reset Everything
```bash
# Stop and remove all data
docker-compose down -v

# Restart
docker-compose up -d

# Wait for MongoDB to initialize (10 seconds)
# Admin user will be recreated automatically
```

### Delete Test Users (MongoDB)
```javascript
use invoice_manager
db.users.deleteMany({ username: { $ne: "admin" } })
db.invoices.deleteMany({ username: { $ne: "admin" } })
```

## Automated Testing

### Backend Tests (To be added)
```bash
cd backend
npm test
```

### Frontend Tests (To be added)
```bash
cd frontend
npm test        # Unit tests
npm run e2e     # E2E tests
```

## Security Testing

### Test Security Features
1. ✅ Access API without token → 401 Unauthorized
2. ✅ Access admin route as user → 403 Forbidden
3. ✅ View other user's invoice → Not found
4. ✅ SQL injection attempts → Prevented (MongoDB)
5. ✅ XSS attempts → Sanitized
6. ✅ CSRF → Protected with tokens

## Continuous Testing

### During Development
1. Keep backend running with hot reload
2. Keep frontend running with live reload
3. Upload test PDFs regularly
4. Test both user and admin views
5. Verify filters and pagination
6. Check browser console for errors
7. Monitor backend logs

---

**Quick Test**: Login as `admin`/`admin123`, upload a PDF, view in table, apply filters, check stats, switch to admin panel, logout. Done! ✅

