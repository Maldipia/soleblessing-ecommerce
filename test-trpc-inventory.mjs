// Test the tRPC inventory endpoint
const API_URL = 'http://localhost:3000/api/trpc/inventory.list';

async function testInventoryEndpoint() {
  try {
    console.log('Testing tRPC inventory endpoint...');
    console.log('URL:', API_URL);
    
    const response = await fetch(API_URL);
    
    console.log('Status:', response.status, response.statusText);
    
    if (!response.ok) {
      const text = await response.text();
      console.error('Error response:', text);
      return;
    }
    
    const data = await response.json();
    console.log('\n✅ Success!');
    console.log('Response:', JSON.stringify(data, null, 2).substring(0, 500));
    
    if (data.result?.data) {
      console.log(`\n📦 Found ${data.result.data.length} products`);
      if (data.result.data.length > 0) {
        console.log('\nFirst product:', JSON.stringify(data.result.data[0], null, 2));
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testInventoryEndpoint();
