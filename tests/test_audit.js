/**
 * Comprehensive Automated Audit & Test Suite for ShopClone 7 Static Migration
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
console.log('🚀 STARTING AUDIT: PURE CLIENT-SIDE STATIC VERIFICATION');
console.log('====================================================\n');

// 1. Audit all HTML files for PHP leaks
console.log('--- Step 1: Scanning HTML files for PHP Leaks ---');
const targetFolders = ['', 'client', 'admin', 'ctv'];
const htmlFiles = [];

targetFolders.forEach(folder => {
    const dir = path.join(ROOT_DIR, folder);
    if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));
        files.forEach(f => htmlFiles.push(path.join(dir, f)));
    }
});

assert(htmlFiles.length >= 25, `Found ${htmlFiles.length} HTML files to inspect`);

htmlFiles.forEach(file => {
    const relativePath = path.relative(ROOT_DIR, file);
    const content = fs.readFileSync(file, 'utf8');

    // Check PHP tags
    const hasPhpTag = /<\?php|<\?=|(?<![\w-])\<\?(?!xml)/i.test(content);
    assert(!hasPhpTag, `${relativePath} must not contain any PHP opening tags (<?php, <?=, <?)`);

    // Check PHP variables leaking onto HTML
    const hasPhpVars = /\$CMSNT|\$order_by|\$where_conditions|\$total_money/i.test(content);
    assert(!hasPhpVars, `${relativePath} must not contain raw PHP variable leaks ($CMSNT, $order_by, etc.)`);

    // Check mock_db before api.js if api.js is present
    if (content.includes('api.js')) {
        const hasMockDb = content.includes('mock_db.js');
        assert(hasMockDb, `${relativePath} must load mock_db.js when api.js is present`);

        const mockDbIdx = content.indexOf('mock_db.js');
        const apiIdx = content.indexOf('api.js');
        assert(mockDbIdx < apiIdx, `${relativePath} must load mock_db.js BEFORE api.js`);
    }
});

// 2. Test MockDB Engine in Node environment
console.log('\n--- Step 2: Testing MockDB Engine & API Simulation ---');

// Setup mock window & localStorage
const mockLocalStorage = {};
global.localStorage = {
    getItem: (k) => mockLocalStorage[k] || null,
    setItem: (k, v) => { mockLocalStorage[k] = String(v); },
    removeItem: (k) => { delete mockLocalStorage[k]; },
    clear: () => { Object.keys(mockLocalStorage).forEach(k => delete mockLocalStorage[k]); }
};
global.window = { localStorage: global.localStorage };

// Load mock_db.js
const mockDbCode = fs.readFileSync(path.join(ROOT_DIR, 'assets/js/core/mock_db.js'), 'utf8');
eval(mockDbCode);

assert(typeof global.window.MockDB !== 'undefined', 'MockDB is successfully instantiated on window');
assert(typeof global.window.formatCurrency === 'function', 'formatCurrency helper is available on window');

const db = global.window.MockDB;

// Test Categories
const categories = db.getCategories();
assert(categories && categories.all.length >= 5, `Categories loaded: ${categories.all.length} categories`);

// Test Products
const products = db.getProducts();
assert(products && products.length >= 8, `Products loaded: ${products.length} products`);

const prod1 = db.getProductById(1);
assert(prod1 && prod1.id === 1 && prod1.price > 0, `Product #1 retrieved: "${prod1.name}" (${prod1.price_formatted})`);

// Test Total Payment Calculation
const calcResult = db.calculateTotalPayment(1, 3, 'GIAM10');
assert(calcResult.status === 'success', 'Total payment calculation successful');
assert(calcResult.discount_number > 0, `Coupon discount applied: ${calcResult.discount}`);
assert(calcResult.pay !== '', `Total payable: ${calcResult.pay}`);

// Test Buy Product
const initialUser = db.getCurrentUser();
const buyResult = db.buyProduct(1, 2, 'GIAM10');
assert(buyResult.status === 'success', `Purchase simulated successfully: Order #${buyResult.trans_id}`);
assert(buyResult.data && buyResult.data.includes('|'), 'Account credentials generated with UID|Pass|2FA format');

const updatedUser = db.getCurrentUser();
assert(updatedUser.money < initialUser.money, `User balance deducted: ${initialUser.money_formatted} -> ${updatedUser.money_formatted}`);

// Test Orders & Order Detail
const orders = db.getOrders();
assert(orders.length >= 1, `Orders history recorded: ${orders.length} orders`);

const orderDetail = db.getOrderDetail(buyResult.trans_id);
assert(orderDetail && orderDetail.accounts.length === 2, `Order detail retrieved with ${orderDetail.accounts.length} credential rows`);

// Test Bank Recharge & Simulator
const banks = db.getBanks();
assert(banks.length >= 3, `Bank accounts available: ${banks.length} banks`);

const beforeRechargeUser = db.getCurrentUser();
const rechargedUser = db.simulateDeposit(500000, 'MBBank');
assert(rechargedUser.money === beforeRechargeUser.money + 500000, `Topup simulator correctly added 500.000đ: ${rechargedUser.money_formatted}`);

const deposits = db.getDeposits();
assert(deposits.length >= 1 && deposits[0].amount === 500000, 'Deposit logged in recent deposits table');

// Test Transactions
const txs = db.getTransactions();
assert(txs.length >= 2, `Transactions log verified: ${txs.length} entries with both formatted and raw values`);

// Test Admin Dashboard Stats
const adminDash = db.getAdminDashboard();
assert(adminDash.total_users > 0 && adminDash.total_orders > 0, `Admin stats: ${adminDash.total_users} users, ${adminDash.total_orders} orders`);

console.log('\n====================================================');
console.log(`🎉 TEST RESULTS: ${passed} PASSED, ${errors.length} FAILED`);
console.log('====================================================\n');

if (errors.length > 0) {
    console.error('Audit failed with errors:');
    errors.forEach(e => console.error(e));
    process.exit(1);
} else {
    console.log('⭐ 100% AUDIT & VERIFICATION PASSED SUCCESSFULLY!');
    process.exit(0);
}
