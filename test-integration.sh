#!/bin/bash
echo "🎵 Testing Frontend-Backend Integration"
echo "======================================"
echo

# Test 1: Check if frontend is serving
echo "1. Testing frontend server..."
if curl -s http://localhost:5174/ > /dev/null; then
    echo "✅ Frontend server responding on port 5174"
else
    echo "❌ Frontend server not responding"
fi
echo

# Test 2: Check if backend is serving
echo "2. Testing backend server..."
if curl -s http://localhost:3000/health > /dev/null; then
    echo "✅ Backend server responding on port 3000"
else
    echo "❌ Backend server not responding"
fi
echo

# Test 3: Test CORS configuration
echo "3. Testing CORS configuration..."
cors_response=$(curl -s -X OPTIONS http://localhost:3000/api/upload \
  -H "Origin: http://localhost:5174" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -w "%{http_code}")

if [[ "$cors_response" == *"200"* ]] || [[ "$cors_response" == *"204"* ]]; then
    echo "✅ CORS configured correctly for frontend-backend communication"
else
    echo "⚠️  CORS response: $cors_response"
fi
echo

# Test 4: Test API endpoints that frontend would use
echo "4. Testing API endpoints..."

# Health check
health_response=$(curl -s http://localhost:3000/health)
if echo "$health_response" | grep -q "OK"; then
    echo "✅ Health endpoint working"
else
    echo "❌ Health endpoint failed"
fi

# API info
api_response=$(curl -s http://localhost:3000/api)
if echo "$api_response" | grep -q "KarokeMaker"; then
    echo "✅ API info endpoint working"
else
    echo "❌ API info endpoint failed"
fi

# Upload endpoint (no file - should return error)
upload_response=$(curl -s -X POST http://localhost:3000/api/upload)
if echo "$upload_response" | grep -q "No file provided"; then
    echo "✅ Upload endpoint working (correctly rejects empty requests)"
else
    echo "❌ Upload endpoint failed"
fi

echo
echo "🎉 Frontend-Backend Integration Test Complete!"
echo "Frontend URL: http://localhost:5174"
echo "Backend URL: http://localhost:3000"