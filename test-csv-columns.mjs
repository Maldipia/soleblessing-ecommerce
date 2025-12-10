const SPREADSHEET_ID = '1WZttK5ZsPhnBz91JmBb-V4GCs-42uXjTUXz67V5sSDI';
const SHEET_GID = '631652219';

async function testColumns() {
  try {
    const csvUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=${SHEET_GID}`;
    
    const response = await fetch(csvUrl);
    const csvText = await response.text();
    const lines = csvText.split('\n');
    
    // Show header
    console.log('=== HEADER ROW ===');
    const headers = lines[0].split(',');
    headers.forEach((h, i) => {
      const letter = String.fromCharCode(65 + i); // A=65
      console.log(`${letter} (${i}): ${h}`);
    });
    
    // Show first data row
    console.log('\n=== FIRST DATA ROW ===');
    const firstRow = lines[1];
    console.log('Raw:', firstRow.substring(0, 300));
    
    const parts = firstRow.split(',');
    console.log('\nParsed columns:');
    parts.forEach((p, i) => {
      const letter = String.fromCharCode(65 + i);
      console.log(`${letter} (${i}): ${p.substring(0, 50)}`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testColumns();
