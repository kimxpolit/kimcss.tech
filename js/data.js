/**
 * WEB1044 - Lập Trình Cơ Sở Với JavaScript
 * Mock Data Repository: Tối thiểu 20+ Sản phẩm, 5 Danh mục, Giỏ hàng mẫu 2 sản phẩm
 * Đảm bảo hệ thống chạy 100% độc lập trên Live Server kể cả khi không có Node.js / SQL Server
 */

// 1. Danh mục sản phẩm (Categories)
const MOCK_CATEGORIES = [
    {
        id: 1,
        name: "Tài Khoản Facebook",
        slug: "facebook",
        icon: "https://cdn-icons-png.flaticon.com/512/5968/5968764.png",
        image: "https://cdn-icons-png.flaticon.com/512/5968/5968764.png",
        description: "Clone, Via ngoại, Via cổ, Via XMDT chất lượng cao, bao live trâu"
    },
    {
        id: 2,
        name: "Gmail & Hotmail",
        slug: "gmail-hotmail",
        icon: "https://cdn-icons-png.flaticon.com/512/732/732200.png",
        image: "https://cdn-icons-png.flaticon.com/512/732/732200.png",
        description: "Gmail ngâm ngoại, Gmail cổ 2018-2022, Hotmail/Outlook live vĩnh viễn"
    },
    {
        id: 3,
        name: "Tài Khoản TikTok",
        slug: "tiktok",
        icon: "https://cdn-icons-png.flaticon.com/512/3046/3046121.png",
        image: "https://cdn-icons-png.flaticon.com/512/3046/3046121.png",
        description: "TikTok bật kiếm tiền (Beta Creator), TikTok Shop, TikTok ngâm tương tác"
    },
    {
        id: 4,
        name: "Discord & Telegram",
        slug: "discord-telegram",
        icon: "https://cdn-icons-png.flaticon.com/512/3670/3670157.png",
        image: "https://cdn-icons-png.flaticon.com/512/3670/3670157.png",
        description: "Tài khoản Telegram Session/Tdata, Discord Nitro, Discord ngâm năm 2021-2023"
    },
    {
        id: 5,
        name: "Proxy & Dịch Vụ Mạng",
        slug: "proxy-vpn",
        icon: "https://cdn-icons-png.flaticon.com/512/2885/2885417.png",
        image: "https://cdn-icons-png.flaticon.com/512/2885/2885417.png",
        description: "Proxy IPv4 riêng tư tĩnh, Proxy Dân Cư xoay IP, VPN tốc độ cao"
    }
];

// 2. Mảng sản phẩm (Products) - Gồm 25 sản phẩm đối tượng chi tiết (Vượt tiêu chuẩn >= 20 sản phẩm của môn học)
const MOCK_PRODUCTS = [
    // --- DANH MỤC 1: TÀI KHOẢN FACEBOOK ---
    {
        id: 1,
        code: "FB-001",
        name: "Clone Facebook 50-500 bạn bè, 2FA, Live trâu, Avatar + Cover đầy đủ",
        slug: "clone-fb-50-500-ban-be",
        price: 6000,
        original_price: 8000,
        discount: 25,
        preview_image: "mod/img/icon-facebook.png",
        description: "Định dạng UID|Pass|2FA|Mail|PassMail. Đã có ảnh đại diện, ảnh bìa, ngâm trên 14 ngày. Bảo hành login 1-1 trong 24h.",
        category_id: 1,
        category_name: "Tài Khoản Facebook",
        category_icon: "https://cdn-icons-png.flaticon.com/512/5968/5968764.png",
        stock: 1250,
        sold: 8430
    },
    {
        id: 2,
        code: "FB-002",
        name: "Via Facebook Ngoại Cổ (2015 - 2020), Siêu trâu, Có Marketplace, Đã Test Ads",
        slug: "via-facebook-ngoai-co",
        price: 75000,
        original_price: 90000,
        discount: 16,
        preview_image: "mod/img/icon-facebook.png",
        description: "Định dạng UID|Pass|2FA|Cookie|Mail|PassMail. Kháng spam cực tốt, phù hợp chạy quảng cáo Facebook Ads hoặc spam tin nhắn bán hàng.",
        category_id: 1,
        category_name: "Tài Khoản Facebook",
        category_icon: "https://cdn-icons-png.flaticon.com/512/5968/5968764.png",
        stock: 320,
        sold: 2190
    },
    {
        id: 3,
        code: "FB-003",
        name: "Via Facebook XMDT (Xác minh danh tính), Tích xanh QC, Đã ngâm > 30 ngày",
        slug: "via-facebook-xmdt",
        price: 120000,
        original_price: 150000,
        discount: 20,
        preview_image: "mod/img/icon-facebook.png",
        description: "Đã có tích xanh quảng cáo, phôi thẻ CCCD chuẩn nét, bao back 1-1 nếu tụt tích xác minh trong vòng 48h.",
        category_id: 1,
        category_name: "Tài Khoản Facebook",
        category_icon: "https://cdn-icons-png.flaticon.com/512/5968/5968764.png",
        stock: 85,
        sold: 1450
    },
    {
        id: 4,
        code: "FB-004",
        name: "Clone Facebook Kháng Spam Nuôi Bằng Tool, Đã Kết Bạn Tự Động 1000 Friends",
        slug: "clone-fb-nuoi-tool",
        price: 15000,
        original_price: 20000,
        discount: 25,
        preview_image: "mod/img/icon-facebook.png",
        description: "Tài khoản nuôi tương tác thật, lướt newfeed hàng ngày, phù hợp làm seeding fanpage, group.",
        category_id: 1,
        category_name: "Tài Khoản Facebook",
        category_icon: "https://cdn-icons-png.flaticon.com/512/5968/5968764.png",
        stock: 500,
        sold: 3820
    },
    {
        id: 5,
        code: "FB-005",
        name: "Via Facebook Việt Cổ 2012 - 2018, Tương Tác Thật, Chưa Từng Chạy Ads",
        slug: "via-facebook-viet-co",
        price: 95000,
        original_price: 110000,
        discount: 13,
        preview_image: "mod/img/icon-facebook.png",
        description: "Acc Việt cổ cực hiếm, độ trust tối đa, bao login mượt mà trên mọi dải IP Việt Nam.",
        category_id: 1,
        category_name: "Tài Khoản Facebook",
        category_icon: "https://cdn-icons-png.flaticon.com/512/5968/5968764.png",
        stock: 64,
        sold: 980
    },

    // --- DANH MỤC 2: GMAIL & HOTMAIL ---
    {
        id: 6,
        code: "GM-001",
        name: "Gmail New 2026 ngâm 7 ngày, Chưa liên kết SĐT, IP Việt Nam sạch 100%",
        slug: "gmail-new-2026",
        price: 3500,
        original_price: 5000,
        discount: 30,
        preview_image: "https://cdn-icons-png.flaticon.com/512/732/732200.png",
        description: "Định dạng Email|Password|RecoveryEmail. Chưa gắn SĐT, đăng nhập không bắt checkpoint, hỗ trợ đa thiết bị.",
        category_id: 2,
        category_name: "Gmail & Hotmail",
        category_icon: "https://cdn-icons-png.flaticon.com/512/732/732200.png",
        stock: 4500,
        sold: 29400
    },
    {
        id: 7,
        code: "GM-002",
        name: "Gmail Cổ (2018 - 2022), Độ Trust cao, Dùng liên kết TikTok Shop, Google Ads",
        slug: "gmail-co-2018-2022",
        price: 28000,
        original_price: 35000,
        discount: 20,
        preview_image: "https://cdn-icons-png.flaticon.com/512/732/732200.png",
        description: "Gmail cổ tuổi đời trên 4 năm, nhận thư OTP mượt mà không bị limit, phù hợp tạo tài khoản MMO giá trị cao.",
        category_id: 2,
        category_name: "Gmail & Hotmail",
        category_icon: "https://cdn-icons-png.flaticon.com/512/732/732200.png",
        stock: 410,
        sold: 5600
    },
    {
        id: 8,
        code: "GM-003",
        name: "Gmail US (IP Mỹ), Đã Xác Minh Số Điện Thoại US, Chuyên Dụng Mua App & Game",
        slug: "gmail-us-ip-my",
        price: 18000,
        original_price: 25000,
        discount: 28,
        preview_image: "https://cdn-icons-png.flaticon.com/512/732/732200.png",
        description: "Tạo trên dải IP Resident USA, có sẵn mail khôi phục, đổi pass và info thoải mái.",
        category_id: 2,
        category_name: "Gmail & Hotmail",
        category_icon: "https://cdn-icons-png.flaticon.com/512/732/732200.png",
        stock: 890,
        sold: 7200
    },
    {
        id: 9,
        code: "GM-004",
        name: "Hotmail / Outlook Live vĩnh viễn, Tự động mở khóa, Đọc thư qua POP3/IMAP",
        slug: "hotmail-outlook-live",
        price: 1200,
        original_price: 2000,
        discount: 40,
        preview_image: "https://cdn-icons-png.flaticon.com/512/732/732221.png",
        description: "Định dạng Mail|Pass. Có thể dùng làm mail khôi phục hoặc nhận OTP đăng ký tài khoản tự động.",
        category_id: 2,
        category_name: "Gmail & Hotmail",
        category_icon: "https://cdn-icons-png.flaticon.com/512/732/732200.png",
        stock: 9500,
        sold: 84000
    },
    {
        id: 10,
        code: "GM-005",
        name: "Gmail Kèm Kênh YouTube Trắng Có Tuổi Đời 1 - 2 Năm, Sẵn Sàng Đăng Video",
        slug: "gmail-kem-kenh-youtube",
        price: 45000,
        original_price: 60000,
        discount: 25,
        preview_image: "https://cdn-icons-png.flaticon.com/512/732/732200.png",
        description: "Kênh YouTube cổ sạch, không gậy vi phạm cộng đồng, thuật toán đề xuất cực kỳ mạnh.",
        category_id: 2,
        category_name: "Gmail & Hotmail",
        category_icon: "https://cdn-icons-png.flaticon.com/512/732/732200.png",
        stock: 120,
        sold: 890
    },

    // --- DANH MỤC 3: TÀI KHOẢN TIKTOK ---
    {
        id: 11,
        code: "TT-001",
        name: "TikTok Pháp / Mỹ Bật Kiếm Tiền (Beta Creator), Đã Có 10K Follow, Đủ ĐK Rút Tiền",
        slug: "tiktok-beta-creator",
        price: 350000,
        original_price: 420000,
        discount: 16,
        preview_image: "https://cdn-icons-png.flaticon.com/512/3046/3046121.png",
        description: "Kênh TikTok US/FR chuẩn chỉ, đã đạt 10.000 Follower và 100.000 view trong 30 ngày. Bật quỹ sáng tạo nhận tiền hàng tháng.",
        category_id: 3,
        category_name: "Tài Khoản TikTok",
        category_icon: "https://cdn-icons-png.flaticon.com/512/3046/3046121.png",
        stock: 28,
        sold: 340
    },
    {
        id: 12,
        code: "TT-002",
        name: "TikTok Shop Mở Luồng Tiếp Thị Liên Kết (Affiliate), 1.000 Follower Thật",
        slug: "tiktok-shop-affiliate",
        price: 180000,
        original_price: 220000,
        discount: 18,
        preview_image: "https://cdn-icons-png.flaticon.com/512/3046/3046121.png",
        description: "Đã mở sẵn tính năng giỏ hàng Showcase (TikTok Shop), thêm link sản phẩm ăn hoa hồng ngay lập tức.",
        category_id: 3,
        category_name: "Tài Khoản TikTok",
        category_icon: "https://cdn-icons-png.flaticon.com/512/3046/3046121.png",
        stock: 45,
        sold: 870
    },
    {
        id: 13,
        code: "TT-003",
        name: "TikTok Trắng Ngâm 30 Ngày, IP Việt Nam, Đã Đăng 1 Video Test Lên Xu Hướng",
        slug: "tiktok-ngam-30-ngay",
        price: 25000,
        original_price: 35000,
        discount: 28,
        preview_image: "https://cdn-icons-png.flaticon.com/512/3046/3046121.png",
        description: "Tài khoản TikTok Việt sạch sẽ, đăng video ăn đề xuất tự nhiên, phù hợp tự xây kênh cá nhân.",
        category_id: 3,
        category_name: "Tài Khoản TikTok",
        category_icon: "https://cdn-icons-png.flaticon.com/512/3046/3046121.png",
        stock: 210,
        sold: 2150
    },
    {
        id: 14,
        code: "TT-004",
        name: "TikTok Kênh Âm Nhạc / Giải Trí 50.000 Followers Tự Nhiên, Không Tụt Follow",
        slug: "tiktok-50k-followers",
        price: 950000,
        original_price: 1200000,
        discount: 20,
        preview_image: "https://cdn-icons-png.flaticon.com/512/3046/3046121.png",
        description: "Kênh view triệu views, tệp khán giả trẻ tương tác cao, thích hợp livestream bán hàng hoặc xây dựng thương hiệu.",
        category_id: 3,
        category_name: "Tài Khoản TikTok",
        category_icon: "https://cdn-icons-png.flaticon.com/512/3046/3046121.png",
        stock: 12,
        sold: 95
    },
    {
        id: 15,
        code: "TT-005",
        name: "TikTok Ads Agency Đã Nạp Tiền Thử Nghiệm, Kháng Thuế, Hạn Mức Tiêu Tiền Cao",
        slug: "tiktok-ads-agency",
        price: 490000,
        original_price: 600000,
        discount: 18,
        preview_image: "https://cdn-icons-png.flaticon.com/512/3046/3046121.png",
        description: "Tài khoản quảng cáo TikTok doanh nghiệp, cắn tiền siêu mượt, hỗ trợ setup pixel và chiến dịch ads.",
        category_id: 3,
        category_name: "Tài Khoản TikTok",
        category_icon: "https://cdn-icons-png.flaticon.com/512/3046/3046121.png",
        stock: 35,
        sold: 280
    },

    // --- DANH MỤC 4: DISCORD & TELEGRAM ---
    {
        id: 16,
        code: "TG-001",
        name: "Tài Khoản Telegram Định Dạng Tdata / Session, Đã Ngâm > 60 Ngày",
        slug: "telegram-tdata-session",
        price: 18000,
        original_price: 25000,
        discount: 28,
        preview_image: "https://cdn-icons-png.flaticon.com/512/3670/3670157.png",
        description: "File Tdata giải nén dùng ngay trên Telegram Portable máy tính. Dùng cho tool kéo mem, gửi tin nhắn tự động.",
        category_id: 4,
        category_name: "Discord & Telegram",
        category_icon: "https://cdn-icons-png.flaticon.com/512/3670/3670157.png",
        stock: 1400,
        sold: 15600
    },
    {
        id: 17,
        code: "DC-001",
        name: "Tài Khoản Discord Cổ (2018 - 2021), Có Huy Hiệu HypeSquad, Đã Xác Minh Phone",
        slug: "discord-co-2018-2021",
        price: 45000,
        original_price: 55000,
        discount: 18,
        preview_image: "https://cdn-icons-png.flaticon.com/512/3670/3670157.png",
        description: "Account Discord cổ ngâm nhiều năm, chống raid, chống ban cực mạnh khi tham gia các server crypto/gaming.",
        category_id: 4,
        category_name: "Discord & Telegram",
        category_icon: "https://cdn-icons-png.flaticon.com/512/3670/3670157.png",
        stock: 310,
        sold: 2400
    },
    {
        id: 18,
        code: "TG-002",
        name: "Tài Khoản Telegram Số Mỹ (+1), Đã Bật 2FA, Chuyên Cày Airdrop & Nhận Code",
        slug: "telegram-so-my",
        price: 22000,
        original_price: 30000,
        discount: 26,
        preview_image: "https://cdn-icons-png.flaticon.com/512/3670/3670157.png",
        description: "Đăng nhập bằng mã code hoặc phiên bản Session. Bao login 1-1 nếu bị khóa trong 3 ngày đầu.",
        category_id: 4,
        category_name: "Discord & Telegram",
        category_icon: "https://cdn-icons-png.flaticon.com/512/3670/3670157.png",
        stock: 670,
        sold: 4300
    },
    {
        id: 19,
        code: "DC-002",
        name: "Gói Kích Hoạt Discord Nitro 3 Tháng Full Tính Năng + 2 Boost Server",
        slug: "discord-nitro-3-thang",
        price: 85000,
        original_price: 120000,
        discount: 29,
        preview_image: "https://cdn-icons-png.flaticon.com/512/3670/3670157.png",
        description: "Link kích hoạt Nitro chính hãng, sử dụng emoji mọi nơi, stream HD 1080p 60fps và tăng 2 boost cho server cá nhân.",
        category_id: 4,
        category_name: "Discord & Telegram",
        category_icon: "https://cdn-icons-png.flaticon.com/512/3670/3670157.png",
        stock: 150,
        sold: 1890
    },
    {
        id: 20,
        code: "TG-003",
        name: "Telegram Premium Chính Hãng Gói 6 Tháng (Nâng Cấp Trực Tiếp Trên Nick Của Bạn)",
        slug: "telegram-premium-6-thang",
        price: 280000,
        original_price: 350000,
        discount: 20,
        preview_image: "https://cdn-icons-png.flaticon.com/512/3670/3670157.png",
        description: "Tăng gấp đôi dung lượng gửi file (4GB), chuyển giọng nói thành văn bản, huy hiệu ngôi sao xanh nổi bật.",
        category_id: 4,
        category_name: "Discord & Telegram",
        category_icon: "https://cdn-icons-png.flaticon.com/512/3670/3670157.png",
        stock: 90,
        sold: 620
    },

    // --- DANH MỤC 5: PROXY & DỊCH VỤ MẠNG ---
    {
        id: 21,
        code: "PRX-001",
        name: "Proxy Dân Cư IPv4 Việt Nam (Viettel / VNPT / FPT) Tĩnh Dùng Riêng 30 Ngày",
        slug: "proxy-dan-cu-vietnam",
        price: 45000,
        original_price: 60000,
        discount: 25,
        preview_image: "https://cdn-icons-png.flaticon.com/512/2885/2885417.png",
        description: "Giao thức HTTP/SOCKS5, băng thông không giới hạn, độ trễ Ping thấp dưới 30ms, chuyên nuôi acc Facebook, Shopee.",
        category_id: 5,
        category_name: "Proxy & Dịch Vụ Mạng",
        category_icon: "https://cdn-icons-png.flaticon.com/512/2885/2885417.png",
        stock: 820,
        sold: 6540
    },
    {
        id: 22,
        code: "PRX-002",
        name: "Proxy Xoay Dân Cư Toàn Cầu (USA / UK / VN) - Gói 5GB Băng Thông Không Hết Hạn",
        slug: "proxy-xoay-dan-cu-5gb",
        price: 110000,
        original_price: 140000,
        discount: 21,
        preview_image: "https://cdn-icons-png.flaticon.com/512/2885/2885417.png",
        description: "Hơn 50 triệu địa chỉ IP sạch toàn thế giới, tự động đổi IP sau mỗi request hoặc giữ IP 10 - 30 phút.",
        category_id: 5,
        category_name: "Proxy & Dịch Vụ Mạng",
        category_icon: "https://cdn-icons-png.flaticon.com/512/2885/2885417.png",
        stock: 350,
        sold: 3120
    },
    {
        id: 23,
        code: "PRX-003",
        name: "Proxy Datacenter US IPv4 Tốc Độ Cao 1Gbps, Chuyên Dụng Cào Dữ Liệu Web",
        slug: "proxy-datacenter-us-ipv4",
        price: 25000,
        original_price: 35000,
        discount: 28,
        preview_image: "https://cdn-icons-png.flaticon.com/512/2885/2885417.png",
        description: "IP Mỹ đặt tại trung tâm dữ liệu chuẩn Tier 3, tốc độ download/upload cực nhanh, uptime cam kết 99.9%.",
        category_id: 5,
        category_name: "Proxy & Dịch Vụ Mạng",
        category_icon: "https://cdn-icons-png.flaticon.com/512/2885/2885417.png",
        stock: 1200,
        sold: 9400
    },
    {
        id: 24,
        code: "PRX-004",
        name: "Tài Khoản NordVPN / Surfshark VPN Bản Quyền 1 Năm, Dùng Đồng Thời 6 Thiết Bị",
        slug: "vpn-ban-quyen-1-nam",
        price: 195000,
        original_price: 250000,
        discount: 22,
        preview_image: "https://cdn-icons-png.flaticon.com/512/2885/2885417.png",
        description: "Bảo mật mã hóa cấp độ quân sự, vượt mọi rào cản kiểm duyệt, fake IP sang 60+ quốc gia một chạm.",
        category_id: 5,
        category_name: "Proxy & Dịch Vụ Mạng",
        category_icon: "https://cdn-icons-png.flaticon.com/512/2885/2885417.png",
        stock: 80,
        sold: 760
    },
    {
        id: 25,
        code: "PRX-005",
        name: "Proxy 4G/5G Di Động Việt Nam Xoay Không Giới Hạn Qua API, Nhà Mạng Viettel",
        slug: "proxy-4g-di-dong-xoay",
        price: 350000,
        original_price: 450000,
        discount: 22,
        preview_image: "https://cdn-icons-png.flaticon.com/512/2885/2885417.png",
        description: "Cổng USB 4G vật lý cắm trực tiếp tại Việt Nam, đổi IP tự động bằng link API URL, bao sạch vượt mọi checkpoint.",
        category_id: 5,
        category_name: "Proxy & Dịch Vụ Mạng",
        category_icon: "https://cdn-icons-png.flaticon.com/512/2885/2885417.png",
        stock: 50,
        sold: 430
    }
];

// 3. Mảng Giỏ hàng mẫu mặc định (Default Cart) - Chứa sẵn tối thiểu 2 sản phẩm mẫu theo yêu cầu Giai đoạn 1
const DEFAULT_CART_ITEMS = [
    {
        id: 1,
        code: "FB-001",
        name: "Clone Facebook 50-500 bạn bè, 2FA, Live trâu, Avatar + Cover đầy đủ",
        price: 6000,
        original_price: 8000,
        preview_image: "mod/img/icon-facebook.png",
        quantity: 2,
        category_name: "Tài Khoản Facebook"
    },
    {
        id: 6,
        code: "GM-001",
        name: "Gmail New 2026 ngâm 7 ngày, Chưa liên kết SĐT, IP Việt Nam sạch 100%",
        price: 3500,
        original_price: 5000,
        preview_image: "https://cdn-icons-png.flaticon.com/512/732/732200.png",
        quantity: 5,
        category_name: "Gmail & Hotmail"
    }
];

// Gắn toàn bộ vào biến toàn cục Window để các trang và script khác dễ dàng gọi
if (typeof window !== 'undefined') {
    window.MOCK_CATEGORIES = MOCK_CATEGORIES;
    window.MOCK_PRODUCTS = MOCK_PRODUCTS;
    window.DEFAULT_CART_ITEMS = DEFAULT_CART_ITEMS;
}

// Hỗ trợ export nếu dùng môi trường Node.js kiểm thử
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        MOCK_CATEGORIES,
        MOCK_PRODUCTS,
        DEFAULT_CART_ITEMS
    };
}
