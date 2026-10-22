-- ============================================================================
-- DATABASE SCHEMA: SHOPCLONE 7 - MICROSOFT SQL SERVER (T-SQL)
-- 100% RELATIONAL SCHEMA WITH TRANSACTIONS, CONSTRAINTS & INITIAL SEED DATA
-- ============================================================================

-- 1. Create Database (Run if not exists)
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'ShopCloneDB')
BEGIN
    CREATE DATABASE [ShopCloneDB] COLLATE Latin1_General_100_CI_AS_SC_UTF8;
END
GO

USE [ShopCloneDB];
GO

-- 2. Drop Existing Tables in reverse FK order if re-running
IF OBJECT_ID(N'dbo.[ProductStock]', N'U') IS NOT NULL DROP TABLE dbo.[ProductStock];
IF OBJECT_ID(N'dbo.[Orders]', N'U') IS NOT NULL DROP TABLE dbo.[Orders];
IF OBJECT_ID(N'dbo.[Transactions]', N'U') IS NOT NULL DROP TABLE dbo.[Transactions];
IF OBJECT_ID(N'dbo.[Products]', N'U') IS NOT NULL DROP TABLE dbo.[Products];
IF OBJECT_ID(N'dbo.[Categories]', N'U') IS NOT NULL DROP TABLE dbo.[Categories];
IF OBJECT_ID(N'dbo.[BankAccounts]', N'U') IS NOT NULL DROP TABLE dbo.[BankAccounts];
IF OBJECT_ID(N'dbo.[Settings]', N'U') IS NOT NULL DROP TABLE dbo.[Settings];
IF OBJECT_ID(N'dbo.[Users]', N'U') IS NOT NULL DROP TABLE dbo.[Users];
GO

-- 3. Table: [Users]
CREATE TABLE dbo.[Users] (
    [id] INT IDENTITY(1,1) PRIMARY KEY,
    [username] NVARCHAR(50) NOT NULL UNIQUE,
    [password] NVARCHAR(255) NOT NULL,
    [email] NVARCHAR(100) NOT NULL UNIQUE,
    [phone] NVARCHAR(20) NULL,
    [fullname] NVARCHAR(100) NULL,
    [balance] BIGINT NOT NULL CONSTRAINT DF_Users_balance DEFAULT (0),
    [total_deposited] BIGINT NOT NULL CONSTRAINT DF_Users_total_deposited DEFAULT (0),
    [role] NVARCHAR(20) NOT NULL CONSTRAINT DF_Users_role DEFAULT ('user'), -- 'user', 'admin', 'ctv'
    [api_key] NVARCHAR(64) NULL,
    [status] BIT NOT NULL CONSTRAINT DF_Users_status DEFAULT (1),
    [created_at] DATETIME2 NOT NULL CONSTRAINT DF_Users_created_at DEFAULT (GETDATE()),
    [updated_at] DATETIME2 NOT NULL CONSTRAINT DF_Users_updated_at DEFAULT (GETDATE())
);
CREATE NONCLUSTERED INDEX IX_Users_username ON dbo.[Users]([username]);
CREATE NONCLUSTERED INDEX IX_Users_email ON dbo.[Users]([email]);
CREATE NONCLUSTERED INDEX IX_Users_api_key ON dbo.[Users]([api_key]);
GO

-- 4. Table: [Categories]
CREATE TABLE dbo.[Categories] (
    [id] INT IDENTITY(1,1) PRIMARY KEY,
    [name] NVARCHAR(100) NOT NULL,
    [slug] NVARCHAR(100) NOT NULL UNIQUE,
    [image] NVARCHAR(255) NULL,
    [status] BIT NOT NULL CONSTRAINT DF_Categories_status DEFAULT (1),
    [stt] INT NOT NULL CONSTRAINT DF_Categories_stt DEFAULT (0),
    [created_at] DATETIME2 NOT NULL CONSTRAINT DF_Categories_created_at DEFAULT (GETDATE())
);
CREATE NONCLUSTERED INDEX IX_Categories_slug ON dbo.[Categories]([slug]);
GO

-- 5. Table: [Products]
CREATE TABLE dbo.[Products] (
    [id] INT IDENTITY(1,1) PRIMARY KEY,
    [category_id] INT NOT NULL,
    [name] NVARCHAR(255) NOT NULL,
    [slug] NVARCHAR(255) NULL,
    [price] BIGINT NOT NULL CONSTRAINT DF_Products_price DEFAULT (0),
    [cost] BIGINT NOT NULL CONSTRAINT DF_Products_cost DEFAULT (0),
    [discount] INT NOT NULL CONSTRAINT DF_Products_discount DEFAULT (0), -- % discount
    [description] NVARCHAR(MAX) NULL,
    [preview_image] NVARCHAR(255) NULL,
    [status] BIT NOT NULL CONSTRAINT DF_Products_status DEFAULT (1),
    [stt] INT NOT NULL CONSTRAINT DF_Products_stt DEFAULT (0),
    [created_at] DATETIME2 NOT NULL CONSTRAINT DF_Products_created_at DEFAULT (GETDATE()),
    [updated_at] DATETIME2 NOT NULL CONSTRAINT DF_Products_updated_at DEFAULT (GETDATE()),
    CONSTRAINT FK_Products_Categories FOREIGN KEY ([category_id]) REFERENCES dbo.[Categories]([id]) ON DELETE CASCADE
);
CREATE NONCLUSTERED INDEX IX_Products_category_id ON dbo.[Products]([category_id]);
GO

-- 6. Table: [Orders]
CREATE TABLE dbo.[Orders] (
    [id] INT IDENTITY(1,1) PRIMARY KEY,
    [user_id] INT NOT NULL,
    [order_code] NVARCHAR(50) NOT NULL UNIQUE,
    [product_id] INT NOT NULL,
    [product_name] NVARCHAR(255) NOT NULL,
    [quantity] INT NOT NULL,
    [unit_price] BIGINT NOT NULL,
    [total_price] BIGINT NOT NULL,
    [account_details] NVARCHAR(MAX) NOT NULL, -- Store actual credentials for historical record
    [status] NVARCHAR(20) NOT NULL CONSTRAINT DF_Orders_status DEFAULT ('completed'),
    [created_at] DATETIME2 NOT NULL CONSTRAINT DF_Orders_created_at DEFAULT (GETDATE()),
    CONSTRAINT FK_Orders_Users FOREIGN KEY ([user_id]) REFERENCES dbo.[Users]([id])
);
CREATE NONCLUSTERED INDEX IX_Orders_user_id ON dbo.[Orders]([user_id]);
CREATE NONCLUSTERED INDEX IX_Orders_order_code ON dbo.[Orders]([order_code]);
GO

-- 7. Table: [ProductStock] (Inventory items: clone/via accounts line-by-line)
CREATE TABLE dbo.[ProductStock] (
    [id] INT IDENTITY(1,1) PRIMARY KEY,
    [product_id] INT NOT NULL,
    [account_data] NVARCHAR(MAX) NOT NULL, -- Format: UID|Pass|2FA|Mail|PassMail
    [is_sold] BIT NOT NULL CONSTRAINT DF_ProductStock_is_sold DEFAULT (0),
    [order_id] INT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT DF_ProductStock_created_at DEFAULT (GETDATE()),
    [sold_at] DATETIME2 NULL,
    CONSTRAINT FK_ProductStock_Products FOREIGN KEY ([product_id]) REFERENCES dbo.[Products]([id]) ON DELETE CASCADE,
    CONSTRAINT FK_ProductStock_Orders FOREIGN KEY ([order_id]) REFERENCES dbo.[Orders]([id])
);
CREATE NONCLUSTERED INDEX IX_ProductStock_product_is_sold ON dbo.[ProductStock]([product_id], [is_sold]);
GO

-- 8. Table: [Transactions]
CREATE TABLE dbo.[Transactions] (
    [id] INT IDENTITY(1,1) PRIMARY KEY,
    [user_id] INT NOT NULL,
    [trans_code] NVARCHAR(50) NOT NULL UNIQUE,
    [type] NVARCHAR(50) NOT NULL, -- 'recharge', 'purchase', 'refund', 'admin_adjustment'
    [amount] BIGINT NOT NULL,     -- Positive for recharge, negative for purchase
    [balance_before] BIGINT NOT NULL,
    [balance_after] BIGINT NOT NULL,
    [note] NVARCHAR(MAX) NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT DF_Transactions_created_at DEFAULT (GETDATE()),
    CONSTRAINT FK_Transactions_Users FOREIGN KEY ([user_id]) REFERENCES dbo.[Users]([id])
);
CREATE NONCLUSTERED INDEX IX_Transactions_user_id ON dbo.[Transactions]([user_id]);
CREATE NONCLUSTERED INDEX IX_Transactions_trans_code ON dbo.[Transactions]([trans_code]);
GO

-- 9. Table: [BankAccounts]
CREATE TABLE dbo.[BankAccounts] (
    [id] INT IDENTITY(1,1) PRIMARY KEY,
    [bank_id] NVARCHAR(50) NOT NULL,       -- e.g. 'VCB', 'MB', 'TCB', 'MOMO'
    [bank_name] NVARCHAR(100) NOT NULL,     -- Full name: Vietcombank, MB Bank, etc.
    [account_number] NVARCHAR(50) NOT NULL,
    [account_name] NVARCHAR(100) NOT NULL,
    [branch] NVARCHAR(100) NULL,
    [icon] NVARCHAR(255) NULL,
    [status] BIT NOT NULL CONSTRAINT DF_BankAccounts_status DEFAULT (1)
);
GO

-- 10. Table: [Settings]
CREATE TABLE dbo.[Settings] (
    [name] NVARCHAR(100) PRIMARY KEY,
    [value] NVARCHAR(MAX) NOT NULL,
    [updated_at] DATETIME2 NOT NULL CONSTRAINT DF_Settings_updated_at DEFAULT (GETDATE()),
    [site_logo] NVARCHAR(500) NULL,
    [logo_height] INT NULL CONSTRAINT DF_Settings_logo_height DEFAULT (54),
    [primary_color] VARCHAR(50) NULL CONSTRAINT DF_Settings_primary_color DEFAULT ('#2563eb'),
    [accent_color] VARCHAR(50) NULL CONSTRAINT DF_Settings_accent_color DEFAULT ('#d4af37'),
    [navbar_bg] VARCHAR(50) NULL CONSTRAINT DF_Settings_navbar_bg DEFAULT ('#ffffff'),
    [welcome_popup_status] BIT NULL CONSTRAINT DF_Settings_welcome_popup_status DEFAULT (1),
    [welcome_popup_content] NVARCHAR(MAX) NULL,
    [show_recent_orders] BIT NULL CONSTRAINT DF_Settings_show_recent_orders DEFAULT (1),
    [site_hotline] VARCHAR(50) NULL CONSTRAINT DF_Settings_site_hotline DEFAULT ('0947.838.128'),
    [site_email] VARCHAR(100) NULL CONSTRAINT DF_Settings_site_email DEFAULT ('hotro@kimcss.tech'),
    [site_zalo] VARCHAR(255) NULL,
    [site_telegram] VARCHAR(255) NULL,
    [marquee_notice] NVARCHAR(MAX) NULL
);
GO

-- ============================================================================
-- SEED DATA (INITIAL REAL CONFIGURATION & SYSTEM DATA)
-- ============================================================================

-- A. Default System Settings
INSERT INTO dbo.[Settings] ([name], [value]) VALUES
('site_title', N'ShopClone 7 - Hệ thống Dịch vụ MMO & Tài khoản Tự động 24/7'),
('site_description', N'Hệ thống cung cấp sỉ lẻ tài khoản Clone Facebook, Via Facebook, Gmail, Proxy tốc độ cao tự động.'),
('site_keywords', N'shop clone, via facebook, mua clone fb, gmail ngoai, proxy ipv4'),
('site_notice_home', N'🔥 Chào mừng bạn đến với ShopClone 7! Nạp tiền tự động qua VietQR duyệt trong 3 giây. Hỗ trợ 24/7.'),
('hotline', N'0947.838.128'),
('telegram', N'@shopclone7_support'),
('deposit_syntax_prefix', N'NAPTIEN'),
('currency', N'VND');
GO

-- B. Default Admin & Customer Accounts
-- Password for 'admin': 'admin123'
-- Password for 'khachhang': '123456'
INSERT INTO dbo.[Users] ([username], [password], [email], [fullname], [balance], [total_deposited], [role], [status])
VALUES
(N'admin', N'$2a$10$FW4ebEsTML/J11tlx7YAneU4lcT50.wHVD3NwN0Gg8niRo8Uz/5CK', N'admin@shopclone.vn', N'Quản trị viên', 10000000, 10000000, N'admin', 1),
(N'khachhang', N'$2a$10$NOQhpzt9KIWjCmCqB6V1Eu5z43czYXvLGtzMYicoH86Nn9xILidAO', N'khachhang@shopclone.vn', N'Khách Hàng', 500000, 500000, N'user', 1);
GO

-- C. Bank Accounts for VietQR Top-Up
INSERT INTO dbo.[BankAccounts] ([bank_id], [bank_name], [account_number], [account_name], [branch], [icon], [status])
VALUES
(N'VCB', N'Vietcombank', N'0071001234567', N'CTY TNHH CONG NGHE SHOPCLONE', N'Hồ Chí Minh', N'https://api.vietqr.io/img/VCB.png', 1),
(N'MB', N'MB Bank (Quân Đội)', N'0947838128999', N'CTY TNHH CONG NGHE SHOPCLONE', N'Hà Nội', N'https://api.vietqr.io/img/MB.png', 1),
(N'TCB', N'Techcombank', N'190366882299', N'CTY TNHH CONG NGHE SHOPCLONE', N'Hồ Chí Minh', N'https://api.vietqr.io/img/TCB.png', 1),
(N'MOMO', N'Ví Điện Tử MoMo', N'0947838128', N'NGUYEN VAN QUYEN (ADMIN SHOPCLONE)', N'Ví MoMo 24/7', N'https://developers.momo.vn/v3/assets/images/logo.png', 1);
GO

-- D. Initial Categories
INSERT INTO dbo.[Categories] ([name], [slug], [image], [status], [stt])
VALUES
(N'Tài Khoản Facebook', N'facebook', N'https://cdn-icons-png.flaticon.com/512/5968/5968764.png', 1, 1),
(N'Gmail & Hotmail', N'gmail-hotmail', N'https://cdn-icons-png.flaticon.com/512/732/732200.png', 1, 2),
(N'Tài Khoản TikTok', N'tiktok', N'https://cdn-icons-png.flaticon.com/512/3046/3046121.png', 1, 3),
(N'Discord & Telegram', N'discord-telegram', N'https://cdn-icons-png.flaticon.com/512/3670/3670157.png', 1, 4),
(N'Proxy & Dịch Vụ Mạng', N'proxy-vpn', N'https://cdn-icons-png.flaticon.com/512/2885/2885417.png', 1, 5);
GO

-- E. Initial Products
INSERT INTO dbo.[Products] ([category_id], [name], [slug], [price], [cost], [discount], [description], [preview_image], [status], [stt])
VALUES
(1, N'Clone Facebook 50-500 bạn bè, 2FA, Live trâu, Avatar + Cover đầy đủ', N'clone-facebook-2fa-live-trau', 6000, 3000, 0, N'Định dạng: UID|Pass|2FA|Mail|PassMail. Bao login lần đầu 24h.', N'mod/img/icon-facebook.png', 1, 1),
(1, N'Via Facebook Ngoại Cổ (2015 - 2020), Siêu trâu, Có Marketplace, Đã Test Ads', N'via-facebook-ngoai-co-2015-2020', 75000, 45000, 10, N'Định dạng: UID|Pass|2FA|Cookie|Mail|PassMail. Kháng spam cực tốt.', N'mod/img/icon-facebook.png', 1, 2),
(1, N'Via Facebook XMDT (Xác minh danh tính), Tích xanh QC, Đã ngâm > 30 ngày', N'via-facebook-xmdt-quang-cao', 120000, 80000, 5, N'Đã có tích xanh quảng cáo, bao back 1-1 nếu tụt tích trong 48h.', N'mod/img/icon-facebook.png', 1, 3),
(2, N'Gmail New 2026 ngâm 7 ngày, Chưa liên kết SĐT, IP Việt Nam sạch 100%', N'gmail-new-2026-ngam-7-ngay', 3500, 1500, 0, N'Định dạng: Email|Password|RecoveryEmail. Login toàn cầu.', N'https://cdn-icons-png.flaticon.com/512/732/732200.png', 1, 4),
(2, N'Gmail Cổ (2018 - 2022), Độ Trust cao, Dùng liên kết TikTok Shop, Google Ads', N'gmail-co-2018-2022', 28000, 16000, 0, N'Gmail cổ tuổi đời > 4 năm, nhận thư OTP mượt mà không bị limit.', N'https://cdn-icons-png.flaticon.com/512/732/732200.png', 1, 5),
(3, N'TikTok Việt Nam > 1.000 Follower, Đã mở tính năng Live Stream và Giỏ hàng', N'tiktok-viet-nam-1000-follow-live', 150000, 95000, 0, N'Định dạng: User|Pass|Mail|PassMail. Đã bật Live Studio trên PC.', N'https://cdn-icons-png.flaticon.com/512/3046/3046121.png', 1, 6),
(4, N'Telegram Account Session + Json ngâm 30 ngày, IP sạch, Kháng quét', N'telegram-session-json-ngam-30-ngay', 18000, 9000, 0, N'Dùng cho các phần mềm kéo mem, gửi tin nhắn tự động.', N'https://cdn-icons-png.flaticon.com/512/3670/3670157.png', 1, 7),
(5, N'Proxy IPv4 Dân Cư Tĩnh (Việt Nam) - Băng thông không giới hạn, Tốc độ 100Mbps', N'proxy-ipv4-dan-cu-tinh-vn', 45000, 25000, 0, N'Định dạng: IP:Port:User:Pass. Thời hạn sử dụng 30 ngày.', N'https://cdn-icons-png.flaticon.com/512/2885/2885417.png', 1, 8);
GO

-- F. Initial Real Stock for Products
INSERT INTO dbo.[ProductStock] ([product_id], [account_data], [is_sold]) VALUES
(1, N'100089283748291|PassWord123|JBSWY3DPEHPK3PXP|mailclone1@hotmail.com|MailPass1', 0),
(1, N'100089283748292|PassWord456|JBSWY3DPEHPK3PXQ|mailclone2@hotmail.com|MailPass2', 0),
(1, N'100089283748293|PassWord789|JBSWY3DPEHPK3PXR|mailclone3@hotmail.com|MailPass3', 0),
(1, N'100089283748294|PassWordABC|JBSWY3DPEHPK3PXS|mailclone4@hotmail.com|MailPass4', 0),
(1, N'100089283748295|PassWordDEF|JBSWY3DPEHPK3PXT|mailclone5@hotmail.com|MailPass5', 0),
(2, N'100012948192011|SecurePass2015|JBSWY3DPEHPK3PXA|via_us_2015@gmail.com|ViaMail1', 0),
(2, N'100012948192012|SecurePass2016|JBSWY3DPEHPK3PXB|via_us_2016@gmail.com|ViaMail2', 0),
(3, N'100099887766551|PassXmdt991|JBSWY3DPEHPK3PXC|via_xmdt1@live.com|XmdtMail1', 0),
(4, N'mmo.user01@gmail.com|GooglePass01|rec01@outlook.com', 0),
(4, N'mmo.user02@gmail.com|GooglePass02|rec02@outlook.com', 0),
(4, N'mmo.user03@gmail.com|GooglePass03|rec03@outlook.com', 0),
(4, N'mmo.user04@gmail.com|GooglePass04|rec04@outlook.com', 0),
(5, N'oldmail2019_01@gmail.com|OldPass19_01|recold01@yahoo.com', 0),
(6, N'tiktok_shop_vn01|TkPass991|tiktok01@gmail.com|MailTk01', 0),
(7, N'telegram_sess_01.session|phone:+84988112233|2FA:123456', 0),
(8, N'103.149.28.101:8080:proxyuser01:proxypass01', 0),
(8, N'103.149.28.102:8080:proxyuser02:proxypass02', 0);
GO

PRINT N'===========================================================';
PRINT N'SHOPCLONE 7 - SQL SERVER DATABASE INITIALIZED SUCCESSFULLY!';
PRINT N'Admin: admin / admin123';
PRINT N'Customer: khachhang / 123456';
PRINT N'===========================================================';
GO
