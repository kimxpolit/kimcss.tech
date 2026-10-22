/**
 * Database Connection Pool: Microsoft SQL Server (MSSQL / T-SQL)
 */

const path = require('path');
const sql = require('mssql');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const dbConfig = {
    server: process.env.DB_SERVER || 'localhost',
    port: parseInt(process.env.DB_PORT) || 1433,
    database: process.env.DB_NAME || 'ShopCloneDB',
    user: process.env.DB_USER || 'sa',
    password: process.env.DB_PASSWORD || 'YourPassword123!',
    options: {
        encrypt: process.env.DB_ENCRYPT === 'true',
        trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE !== 'false',
        enableArithAbort: true,
        connectTimeout: 15000,
        requestTimeout: 30000
    },
    pool: {
        max: 20,
        min: 2,
        idleTimeoutMillis: 30000
    }
};

let pool = null;
let isConnecting = false;

async function getPool() {
    if (pool && pool.connected) {
        return pool;
    }

    if (isConnecting) {
        // Wait briefly for current connection attempt
        await new Promise(resolve => setTimeout(resolve, 500));
        if (pool && pool.connected) return pool;
    }

    try {
        isConnecting = true;
        console.log(`[SQL Server] Connecting to ${dbConfig.server}:${dbConfig.port}, Database: ${dbConfig.database}...`);
        pool = await new sql.ConnectionPool(dbConfig).connect();
        isConnecting = false;
        console.log('✅ [SQL Server] Connected successfully to Microsoft SQL Server!');

        pool.on('error', err => {
            console.error('❌ [SQL Server Pool Error]:', err.message);
        });

        return pool;
    } catch (err) {
        isConnecting = false;
        console.error('❌ [SQL Server Connection Failed]:', err.message);
        console.warn('⚠️ [SQL Server Note]: Please verify that SQL Server is running, TCP/IP is enabled on port 1433, and credentials in .env are correct.');
        throw err;
    }
}

/**
 * Execute an atomic transaction callback
 * @param {function(transaction, sql): Promise<any>} callback
 */
async function executeTransaction(callback) {
    const p = await getPool();
    const transaction = new sql.Transaction(p);
    await transaction.begin();

    try {
        const result = await callback(transaction, sql);
        await transaction.commit();
        return result;
    } catch (err) {
        await transaction.rollback();
        throw err;
    }
}

module.exports = {
    sql,
    dbConfig,
    getPool,
    executeTransaction
};
