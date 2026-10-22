/**
 * Automated Verification & Audit for ShopClone 7 Full-Stack Node.js & SQL Server Architecture
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
let errors = [];
let passed = 0;

function assert(condition, message) {
    if (!condition) {
        errors.push(`[FAIL] ${message}`);
        console.error(`❌ FAIL: ${message}`);
    } else {
        passed++;
        console.log(`✅ PASS: ${message}`);
    }
}

console.log('====================================================');
console.log('🚀 TESTING FULL-STACK NODE.JS + SQL SERVER ARCHITECTURE');
console.log('====================================================\n');

// 1. Verify SQL Schema File
console.log('--- Step 1: SQL Server Schema Script Audit ---');
const schemaPath = path.join(ROOT_DIR, 'database', 'schema_mssql.sql');
assert(fs.existsSync(schemaPath), 'database/schema_mssql.sql exists');

const schemaContent = fs.readFileSync(schemaPath, 'utf8');
const requiredTables = [
    'Users', 'Categories', 'Products', 'ProductStock',
    'Orders', 'Transactions', 'BankAccounts', 'Settings'
];

requiredTables.forEach(t => {
    assert(schemaContent.includes(`CREATE TABLE dbo.[${t}]`), `T-SQL script defines table [${t}]`);
});

assert(schemaContent.includes('CREATE DATABASE [ShopCloneDB]'), 'Schema contains CREATE DATABASE ShopCloneDB');
assert(schemaContent.includes("INSERT INTO dbo.[Users]"), 'Schema contains initial admin seed user');
assert(schemaContent.includes("INSERT INTO dbo.[BankAccounts]"), 'Schema contains BankAccounts seed data');
assert(schemaContent.includes("INSERT INTO dbo.[ProductStock]"), 'Schema contains ProductStock real inventory rows');

// 2. Verify Backend Modules & Syntax
console.log('\n--- Step 2: Backend Node.js & Express Modules Verification ---');
try {
    const db = require('../server/config/db');
    assert(typeof db.getPool === 'function', 'server/config/db.js exports getPool()');
    assert(typeof db.executeTransaction === 'function', 'server/config/db.js exports executeTransaction()');
} catch (e) {
    assert(false, 'server/config/db.js failed to load: ' + e.message);
}

try {
    const auth = require('../server/middleware/auth');
    assert(typeof auth.verifyToken === 'function', 'server/middleware/auth.js exports verifyToken');
    assert(typeof auth.verifyAdmin === 'function', 'server/middleware/auth.js exports verifyAdmin');
} catch (e) {
    assert(false, 'server/middleware/auth.js failed to load: ' + e.message);
}

const routes = ['auth', 'products', 'orders', 'recharge', 'admin'];
routes.forEach(r => {
    try {
        const routeModule = require(`../server/routes/${r}`);
        assert(typeof routeModule === 'function', `server/routes/${r}.js is a valid Express Router`);
    } catch (e) {
        assert(false, `server/routes/${r}.js failed to load: ${e.message}`);
    }
});

// 3. Verify Frontend Static HTML5 / CSS3 / JS in public/
console.log('\n--- Step 3: Frontend HTML5 / CSS3 / JS Audit in public/ ---');
const expectedPublicFiles = [
    'index.html',
    'product.html',
    'recharge.html',
    'orders.html',
    'transactions.html',
    'profile.html',
    'login.html',
    'register.html',
    'admin/index.html',
    'admin/products.html',
    'admin/stock.html',
    'admin/users.html',
    'admin/orders.html',
    'js/api.js',
    'js/auth.js',
    'js/home.js',
    'js/product.js',
    'js/recharge.js',
    'js/orders.js',
    'js/admin.js'
];

expectedPublicFiles.forEach(relPath => {
    const fullPath = path.join(ROOT_DIR, 'public', relPath);
    assert(fs.existsSync(fullPath), `public/${relPath} exists`);

    if (relPath.endsWith('.html')) {
        const content = fs.readFileSync(fullPath, 'utf8');
        const hasPhp = /<\?php|<\?=|(?<![\w-])\<\?(?!xml)/i.test(content);
        assert(!hasPhp, `public/${relPath} has 0 PHP tags`);

        const hasPhpVars = /\$CMSNT|\$order_by|\$where_conditions/i.test(content);
        assert(!hasPhpVars, `public/${relPath} has 0 PHP variable leaks`);

        const hasApiJs = content.includes('api.js');
        assert(hasApiJs, `public/${relPath} links to api.js`);
    }
});

console.log('\n====================================================');
console.log(`🎉 TEST RESULTS: ${passed} PASSED, ${errors.length} FAILED`);
console.log('====================================================\n');

if (errors.length > 0) {
    console.error('Audit failed with errors:');
    errors.forEach(e => console.error(e));
    process.exit(1);
} else {
    console.log('⭐ 100% NODE.JS + SQL SERVER AUDIT PASSED!');
    process.exit(0);
}
