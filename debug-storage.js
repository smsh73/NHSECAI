const { db } = require('./server/db.ts');
const { storage } = require('./server/storage.ts');

async function testStorageMethods() {
  try {
    console.log('Testing DatabaseStorage methods...');
    
    console.log('\n1. Testing getAiServiceProviders...');
    const providers = await storage.getAiServiceProviders();
    console.log('AI Service Providers count:', providers.length);
    console.log('First provider:', providers[0]);
    
    console.log('\n2. Testing getApiCategories...');
    const categories = await storage.getApiCategories();
    console.log('API Categories count:', categories.length);
    console.log('First category:', categories[0]);
    
    console.log('\n3. Testing getApiTemplates...');
    const templates = await storage.getApiTemplates();
    console.log('API Templates count:', templates.length);
    console.log('First template:', templates[0]);
    
    console.log('\n4. Testing getApiCalls...');
    const apiCalls = await storage.getApiCalls();
    console.log('API Calls count:', apiCalls.length);
    
    console.log('\nAll tests completed successfully!');
    
  } catch (error) {
    console.error('Error testing storage methods:', error);
    console.error('Stack trace:', error.stack);
  } finally {
    process.exit();
  }
}

testStorageMethods();