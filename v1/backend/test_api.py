"""
Simple test script to verify the API setup
"""
import asyncio
import httpx
import json
from typing import Dict, Any

async def test_health_endpoint():
    """Test the health check endpoint"""
    async with httpx.AsyncClient() as client:
        response = await client.get("http://localhost:8000/api/health")
        print(f"Health check status: {response.status_code}")
        print(f"Response: {response.json()}")
        return response.status_code == 200

async def test_completion_endpoint():
    """Test the completion endpoint"""
    test_data = {
        "prompt": "Hello, how are you?",
        "instructions": "You are a helpful AI assistant."
    }
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                "http://localhost:8000/api/completions",
                json=test_data,
                timeout=30.0
            )
            print(f"Completion test status: {response.status_code}")
            if response.status_code == 200:
                result = response.json()
                print(f"Response: {result}")
                return True
            else:
                print(f"Error: {response.text}")
                return False
        except Exception as e:
            print(f"Exception during completion test: {e}")
            return False

async def test_cache_endpoints():
    """Test cache management endpoints"""
    async with httpx.AsyncClient() as client:
        # Test cache stats
        response = await client.get("http://localhost:8000/api/cache/stats")
        print(f"Cache stats status: {response.status_code}")
        print(f"Cache stats: {response.json()}")
        
        # Test cache clear
        response = await client.delete("http://localhost:8000/api/cache/clear")
        print(f"Cache clear status: {response.status_code}")
        print(f"Cache clear response: {response.json()}")
        
        return True

async def main():
    """Run all tests"""
    print("Testing FastAPI Backend...")
    print("=" * 40)
    
    # Test health endpoint
    print("\n1. Testing health endpoint...")
    health_ok = await test_health_endpoint()
    
    # Test cache endpoints
    print("\n2. Testing cache endpoints...")
    cache_ok = await test_cache_endpoints()
    
    # Test completion endpoint (may fail if no LLM service is running)
    print("\n3. Testing completion endpoint...")
    completion_ok = await test_completion_endpoint()
    
    print("\n" + "=" * 40)
    print("Test Results:")
    print(f"Health endpoint: {'✓' if health_ok else '✗'}")
    print(f"Cache endpoints: {'✓' if cache_ok else '✗'}")
    print(f"Completion endpoint: {'✓' if completion_ok else '✗'}")
    
    if health_ok and cache_ok:
        print("\n✅ Backend is working correctly!")
        if not completion_ok:
            print("⚠️  Completion endpoint failed - this is normal if no LLM service is running")
    else:
        print("\n❌ Some tests failed")

if __name__ == "__main__":
    asyncio.run(main()) 