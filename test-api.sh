#!/bin/bash
echo "🎤 Testing KarokeMaker v2 API"
echo "================================"
echo

# Test health endpoint
echo "1. Testing health endpoint..."
curl -s -X GET http://localhost:3000/health | jq '.' || echo "Health endpoint failed"
echo

# Test CORS preflight
echo "2. Testing CORS preflight..."
curl -s -X OPTIONS http://localhost:3000/api/upload \
  -H "Origin: http://localhost:5173" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  | head -5 || echo "CORS preflight failed"
echo

# Test upload endpoint with no file (should return error)
echo "3. Testing upload endpoint (no file - should return error)..."
curl -s -X POST http://localhost:3000/api/upload | jq '.' || echo "Upload endpoint failed"
echo

# Test job status endpoint with fake ID (should return error)
echo "4. Testing job status endpoint (fake ID)..."
curl -s -X GET http://localhost:3000/api/jobs/fake-id/status | jq '.' || echo "Job status endpoint failed"
echo

echo "✅ API testing complete!"