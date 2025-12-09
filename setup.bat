@echo off
echo 🚀 PDF Invoice Manager - Setup Script (Angular 21)
echo ==================================================

REM Check for Node.js
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Node.js is not installed. Please install Node.js 20+ first.
    exit /b 1
)

echo ✅ Node.js detected

REM Check for MongoDB
where mongod >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ⚠️  MongoDB not found in PATH. Make sure it's installed and running.
    echo     You can check if MongoDB is running with: mongosh
)

REM Create backend .env if it doesn't exist
if not exist backend\.env (
    echo.
    echo 📝 Creating backend .env file...
    if exist backend\.env.example (
        copy backend\.env.example backend\.env
    ) else (
        echo MONGODB_URI=mongodb://localhost:27017/invoice_manager > backend\.env
        echo MONGODB_DB_NAME=invoice_manager >> backend\.env
        echo JWT_SECRET=your-super-secret-jwt-key-change-in-production >> backend\.env
        echo JWT_EXPIRES_IN=7d >> backend\.env
        echo PORT=3000 >> backend\.env
        echo NODE_ENV=development >> backend\.env
        echo FRONTEND_URL=http://localhost:4200 >> backend\.env
    )
)

REM Install root dependencies
echo.
echo 📦 Installing root dependencies...
call npm install --legacy-peer-deps

REM Install shared dependencies
echo.
echo 📦 Installing shared dependencies...
cd shared
call npm install --legacy-peer-deps
cd ..

REM Build shared types
echo.
echo 🔨 Building shared types...
cd shared
call npm run build
cd ..

REM Install backend dependencies
echo.
echo 📦 Installing backend dependencies...
cd backend
call npm install --legacy-peer-deps
cd ..

REM Install frontend dependencies
echo.
echo 📦 Installing frontend dependencies (Angular 21)...
cd frontend
call npm install --legacy-peer-deps
cd ..

echo.
echo ✅ Setup complete!
echo.
echo 📝 Next steps:
echo 1. Make sure MongoDB is running on localhost:27017
echo    - Check: mongosh mongodb://localhost:27017
echo    - If not running, start MongoDB service from Windows Services
echo.
echo 2. Start backend:  cd backend ^&^& npm run dev
echo 3. Start frontend: cd frontend ^&^& npm start
echo 4. Open browser:   http://localhost:4200
echo 5. Login with:     admin / admin123
echo.
echo 📚 Read README.md for more information
pause
