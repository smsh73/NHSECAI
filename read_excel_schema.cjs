const XLSX = require('xlsx');

function readExcelSchema(filepath) {
  const workbook = XLSX.readFile(filepath);
  const result = {};
  
  workbook.SheetNames.forEach(sheetName => {
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
    result[sheetName] = data;
  });
  
  return result;
}

const files = [
  'attached_assets/nh-ai_bronze-delta_schema-v0_1760956779972.xlsx',
  'attached_assets/nh-ai_silver-delta_schema-v0_1760956779971.xlsx',
  'attached_assets/nh-ai_config-delta_schema-v0_1760956779972.xlsx'
];

const schemas = {};

files.forEach(file => {
  try {
    const schemaName = file.split('/').pop().split('_')[1]; // bronze, silver, config
    schemas[schemaName] = readExcelSchema(file);
    console.error(`✓ Loaded ${schemaName} schema`);
  } catch (err) {
    console.error(`✗ Error reading ${file}:`, err.message);
  }
});

console.log(JSON.stringify(schemas, null, 2));
