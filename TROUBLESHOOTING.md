# 🔧 Troubleshooting Guide

## Common Issues and Solutions

### 🐛 Installation Issues

#### Problem: npm install fails
**Solution:**
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

#### Problem: Angular CLI not found
**Solution:**
```bash
npm install -g @angular/cli@20
```

### 🐳 Docker Issues

#### Problem: MongoDB won't start
**Solutions:**
```bash
# Check if Docker is running
docker ps

# Check MongoDB logs
docker logs pdf-invoice-mongodb

# Restart MongoDB
docker-compose down
docker-compose up -d

# Reset MongoDB (WARNING: deletes all data)
docker-compose down -v
docker-compose up -d
```

#### Problem: Port 27017 already in use
**Solution:**
```bash
# Check what's using the port
netstat -ano | findstr :27017  # Windows
lsof -i :27017                 # Linux/Mac

# Stop the conflicting service or change port in docker-compose.yml
```

### 🚀 Backend Issues

#### Problem: Backend won't start
**Solutions:**
1. Check if MongoDB is running: `docker ps`
2. Verify `.env` file exists in backend/
3. Check port 3000 is free: `netstat -ano | findstr :3000`
4. Check backend logs for errors

#### Problem: "Cannot connect to MongoDB"
**Solutions:**
```bash
# Verify MongoDB URI in backend/.env
MONGODB_URI=mongodb://admin:admin123@localhost:27017/invoice_manager?authSource=admin

# Test MongoDB connection
docker exec -it pdf-invoice-mongodb mongosh -u admin -p admin123

# Restart MongoDB
docker-compose restart
```

#### Problem: "JWT_SECRET not defined"
**Solution:**
Create or update `backend/.env`:
```env
JWT_SECRET=your-super-secret-key-here
JWT_EXPIRES_IN=7d
```

### 🎨 Frontend Issues

#### Problem: Frontend won't compile
**Solutions:**
```bash
# Delete node_modules and reinstall
cd frontend
rm -rf node_modules package-lock.json .angular
npm install

# Clear Angular cache
ng cache clean
```

#### Problem: "Cannot find module '@pdf-invoice/shared'"
**Solution:**
```bash
# Build shared types first
cd shared
npm install
npm run build
cd ../frontend
npm install
```

#### Problem: CORS errors in browser
**Solutions:**
1. Verify `proxy.conf.json` exists in frontend/
2. Check backend CORS settings in `backend/src/index.ts`
3. Restart both backend and frontend

#### Problem: Login fails with network error
**Solutions:**
1. Check backend is running on port 3000
2. Verify proxy configuration
3. Check browser console for errors
4. Verify API URL in services

### 📦 Build Issues

#### Problem: TypeScript errors
**Solutions:**
```bash
# Check TypeScript version matches
cd frontend
npx tsc --version  # Should be ~5.6.0

# Update TypeScript
npm install typescript@~5.6.0 --save-dev
```

#### Problem: Module resolution errors
**Solution:**
Update `tsconfig.json` with correct `moduleResolution`:
```json
{
  "compilerOptions": {
    "moduleResolution": "bundler"
  }
}
```

### 🔐 Authentication Issues

#### Problem: "Unauthorized" error after login
**Solutions:**
1. Check JWT token in localStorage (DevTools → Application → Local Storage)
2. Verify token format: `Bearer <token>`
3. Check token expiration
4. Clear localStorage and login again

#### Problem: Can't register new user
**Solutions:**
1. Check MongoDB is running
2. Verify database connection
3. Check if username already exists
4. Review backend logs for errors

### 📄 PDF Upload Issues

#### Problem: PDF upload fails
**Solutions:**
1. Check file is actual PDF (not renamed)
2. Verify file size < 10MB
3. Check if it's Zepto or Blinkit format
4. Review browser console for errors
5. Check backend logs

#### Problem: "Unsupported PDF format"
**Solution:**
The PDF must be either:
- Zepto invoice (has "Invoice No.:" header)
- Blinkit invoice (has "Tax Invoice" header)

Test with provided sample PDFs in project root.

#### Problem: Duplicate order_no error
**Expected Behavior:** This is working as designed. The system prevents duplicate invoices.

**Solution:** If you need to re-upload, delete the existing invoice first.

### 🗄️ Database Issues

#### Problem: Invoices not appearing
**Solutions:**
```bash
# Check database
docker exec -it pdf-invoice-mongodb mongosh -u admin -p admin123
use invoice_manager
db.invoices.find().limit(5)

# Check indexes
db.invoices.getIndexes()

# Count documents
db.invoices.countDocuments()
```

#### Problem: Slow queries
**Solutions:**
1. Verify indexes are created: Check backend startup logs
2. Run index creation manually:
```javascript
db.invoices.createIndex({ order_no: 1 }, { unique: true })
db.invoices.createIndex({ user_id: 1, date: -1 })
db.invoices.createIndex({ "items.category": 1, date: -1 })
```

### 🎯 Performance Issues

#### Problem: Slow page load
**Solutions:**
1. Enable production mode in Angular
2. Check network tab for slow API calls
3. Verify MongoDB indexes
4. Check pagination settings

#### Problem: High memory usage
**Solutions:**
1. Reduce pagination limit
2. Clear browser cache
3. Check for memory leaks (DevTools → Memory)
4. Restart backend

### 🔄 State Management Issues

#### Problem: Data not updating
**Solutions:**
1. Check signal updates in DevTools
2. Verify OnPush detection strategy
3. Manually trigger refresh
4. Check if filters are applied

#### Problem: Filters not working
**Solutions:**
1. Clear all filters and try again
2. Check browser console for errors
3. Verify filter values are correct format
4. Check debounce timeout (300ms)

### 🌐 Browser Issues

#### Problem: Works in Chrome, fails in other browsers
**Solutions:**
1. Clear browser cache
2. Disable browser extensions
3. Check browser console for errors
4. Verify browser supports ES2022

#### Problem: Material icons not loading
**Solution:**
Verify in `index.html`:
```html
<link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
```

### 🐞 Debug Mode

#### Enable Detailed Logging

**Backend:**
```typescript
// In backend/src/index.ts
console.log('Request:', c.req.url, c.req.method)
```

**Frontend:**
```typescript
// In any component
console.log('State:', this.invoices())
```

**MongoDB:**
```bash
# Enable MongoDB logging
docker exec -it pdf-invoice-mongodb mongosh -u admin -p admin123
db.setLogLevel(1)
```

### 🆘 Getting Help

If none of these solutions work:

1. **Check Logs:**
   - Backend: Terminal running `npm run dev`
   - Frontend: Browser console (F12)
   - MongoDB: `docker logs pdf-invoice-mongodb`

2. **Verify Versions:**
   ```bash
   node --version    # Should be 20+
   npm --version     # Should be 10+
   ng version        # Should be 20
   ```

3. **Clean Restart:**
   ```bash
   # Stop everything
   docker-compose down
   
   # Clean install
   rm -rf node_modules package-lock.json
   npm install
   cd backend && rm -rf node_modules && npm install && cd ..
   cd frontend && rm -rf node_modules && npm install && cd ..
   cd shared && rm -rf node_modules && npm install && cd ..
   
   # Restart
   docker-compose up -d
   cd backend && npm run dev &
   cd frontend && npm start
   ```

4. **Reset Database:**
   ```bash
   docker-compose down -v
   docker-compose up -d
   # Wait 10 seconds for MongoDB to initialize
   # Admin user will be recreated automatically
   ```

### ✅ Verification Checklist

Use this to verify everything is working:

- [ ] Docker Desktop is running
- [ ] MongoDB container is up: `docker ps`
- [ ] Backend starts without errors
- [ ] Frontend compiles successfully
- [ ] Can access http://localhost:4200
- [ ] Can login with admin/admin123
- [ ] Can register new user
- [ ] Can upload PDF
- [ ] Can see invoices in table
- [ ] Can filter invoices
- [ ] Can delete invoice
- [ ] Stats cards show data
- [ ] Admin panel accessible (as admin)

### 📞 Support

For issues not covered here:
1. Check [README.md](README.md) for documentation
2. Review [FINAL_SUMMARY.md](FINAL_SUMMARY.md) for features
3. Check GitHub issues (if repository exists)
4. Review backend/frontend logs for error messages

---

**Quick Fix:** 90% of issues are resolved by:
1. Restarting Docker
2. Clearing node_modules and reinstalling
3. Checking MongoDB connection
4. Verifying environment variables

