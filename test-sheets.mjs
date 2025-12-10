const SPREADSHEET_ID = '1WZttK5ZsPhnBz91JmBb-V4GCs-42uXjTUXz67V5sSDI';
const SHEET_GID = '631652219'; // GID for 2025 tab

async function testReadSheet() {
  try {
    console.log('Testing Google Sheets CSV export...');
    console.log('Spreadsheet ID:', SPREADSHEET_ID);
    console.log('Sheet GID:', SHEET_GID);
    
    const csvUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=${SHEET_GID}`;
    console.log('CSV URL:', csvUrl);
    
    const response = await fetch(csvUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
    }
    
    const csvText = await response.text();
    const lines = csvText.split('\n');
    
    console.log('\n✅ Successfully read', lines.length, 'lines from Google Sheets!');
    console.log('\nHeader row:', lines[0].substring(0, 200) + '...');
    console.log('\nFirst product:', lines[1].substring(0, 200) + '...');
    
    // Count AVAILABLE products
    let availableCount = 0;
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;
      
      // Column G (index 6) is STATUS
      const parts = line.split(',');
      if (parts[6]?.toUpperCase().includes('AVAILABLE')) {
        availableCount++;
      }
    }
    
    console.log('\n📊 Available products:', availableCount);
    console.log('\n🎉 Google Sheets integration working!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testReadSheet();
