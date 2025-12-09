#!/bin/bash

echo "🚀 PDF Invoice Manager - Setup Script (Angular 21)"
echo "=================================================="

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 20+ first."
    exit 1
fi

NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    echo "❌ Node.js version must be 20 or higher. Current: $(node --version)"
    exit 1
fi

echo "✅ Node.js $(node --version) detected"

# Check for MongoDB
if ! command -v mongod &> /dev/null; then
    echo "⚠️  MongoDB not found in PATH. Make sure it's installed and running."
    echo "    You can check if MongoDB is running with: mongosh"
fi

# Create backend .env if it doesn't exist
if [ ! -f backend/.env ]; then
    echo ""
    echo "📝 Creating backend .env file..."
    if [ -f backend/.env.example ]; then
        cp backend/.env.example backend/.env
    else
        cat > backend/.env << EOF
MONGODB_URI=mongodb://localhost:27017/invoice_manager
MONGODB_DB_NAME=invoice_manager
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:4200
EOF
    fi
fi

# Install root dependencies
echo ""
echo "📦 Installing root dependencies..."
npm install --legacy-peer-deps

# Install shared dependencies
echo ""
echo "📦 Installing shared dependencies..."
cd shared && npm install --legacy-peer-deps && cd ..

# Build shared types
echo ""
echo "🔨 Building shared types..."
cd shared && npm run build && cd ..

# Install backend dependencies
echo ""
echo "📦 Installing backend dependencies..."
cd backend && npm install --legacy-peer-deps && cd ..

# Install frontend dependencies
echo ""
echo "📦 Installing frontend dependencies (Angular 21)..."
cd frontend && npm install --legacy-peer-deps && cd ..

echo ""
echo "✅ Setup complete!"
echo ""
echo "📝 Next steps:"
echo "1. Make sure MongoDB is running on localhost:27017"
echo "   - Check: mongosh mongodb://localhost:27017"
echo "   - If not running, start MongoDB service"
echo "   - Mac: brew services start mongodb-community"
echo "   - Linux: sudo systemctl start mongod"
echo ""
echo "2. Start backend:  cd backend && npm run dev"
echo "3. Start frontend: cd frontend && npm start"
echo "4. Open browser:   http://localhost:4200"
echo "5. Login with:     admin / admin123"
echo ""
echo "📚 Read README.md for more information"
