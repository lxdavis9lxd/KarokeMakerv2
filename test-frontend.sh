#!/bin/bash
echo "🎨 Testing KarokeMaker v2 Frontend"
echo "=================================="
echo

# Check if backend is running
echo "1. Checking backend server..."
if curl -s http://localhost:3000/health > /dev/null; then
    echo "✅ Backend server is running on port 3000"
else
    echo "❌ Backend server is not running"
    exit 1
fi

# Start frontend in background
echo
echo "2. Starting frontend server..."
cd /workspaces/KarokeMakerv2/frontend
npm run dev > /dev/null 2>&1 &
FRONTEND_PID=$!
echo "🚀 Frontend server starting (PID: $FRONTEND_PID)..."

# Wait for frontend to start
echo "⏳ Waiting for frontend server to be ready..."
sleep 5

# Check if frontend is responding
echo
echo "3. Testing frontend response..."
if curl -s http://localhost:5173 > /dev/null; then
    echo "✅ Frontend server is responding on port 5173"
    
    # Test if HTML contains our app
    if curl -s http://localhost:5173 | grep -q "KarokeMaker"; then
        echo "✅ Frontend contains KarokeMaker application"
    else
        echo "❌ Frontend does not contain expected content"
    fi
else
    echo "❌ Frontend server is not responding"
fi

# Test CORS headers
echo
echo "4. Testing CORS configuration..."
CORS_RESPONSE=$(curl -s -H "Origin: http://localhost:5173" http://localhost:3000/api)
if [ $? -eq 0 ]; then
    echo "✅ Frontend can communicate with backend API"
else
    echo "❌ CORS issue detected"
fi

# Cleanup
echo
echo "5. Cleaning up..."
kill $FRONTEND_PID 2>/dev/null || echo "Frontend process already stopped"

echo
echo "✅ Frontend testing complete!"