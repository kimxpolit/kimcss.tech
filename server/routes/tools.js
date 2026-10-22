/**
 * MMO Tools API Route - ShopClone 7
 * Check Live FB, 2FA, Icon Facebook, Random Face
 */

const express = require('express');
const router = express.Router();
const https = require('https');

function checkFacebookUID(uid) {
    return new Promise((resolve) => {
        const cleanUid = String(uid).trim().split('|')[0].trim();
        if (!cleanUid || !/^\d+$/.test(cleanUid)) {
            return resolve({ uid: cleanUid || uid, status: 'DIE', code: 400 });
        }

        const url = `https://graph.facebook.com/${cleanUid}/picture?type=normal`;
        const req = https.get(url, (res) => {
            // Facebook returns 302 redirect to avatar image if live, or 404/error if dead/checkpointed
            if (res.statusCode === 302 || res.statusCode === 200) {
                resolve({ uid: cleanUid, status: 'LIVE', code: res.statusCode });
            } else {
                resolve({ uid: cleanUid, status: 'DIE', code: res.statusCode });
            }
        });

        req.on('error', () => {
            resolve({ uid: cleanUid, status: 'DIE', code: 500 });
        });

        req.setTimeout(4000, () => {
            req.destroy();
            resolve({ uid: cleanUid, status: 'DIE', code: 408 });
        });
    });
}

/**
 * POST /api/tools/checklive-fb
 * Check batch of Facebook UIDs
 */
router.post('/checklive-fb', async (req, res) => {
    try {
        const { list_uids } = req.body;
        let uids = [];
        if (Array.isArray(list_uids)) {
            uids = list_uids;
        } else if (typeof list_uids === 'string') {
            uids = list_uids.split('\n').map(l => l.trim()).filter(Boolean);
        }

        if (uids.length === 0) {
            return res.status(400).json({ status: 'error', msg: 'Vui lòng cung cấp danh sách UID để kiểm tra!' });
        }

        // Limit batch size to 200 per request
        const batch = uids.slice(0, 200);
        const results = await Promise.all(batch.map(u => checkFacebookUID(u)));

        const liveList = results.filter(r => r.status === 'LIVE');
        const dieList = results.filter(r => r.status === 'DIE');

        return res.json({
            status: 'success',
            total: results.length,
            live_count: liveList.length,
            die_count: dieList.length,
            live_uids: liveList.map(r => r.uid),
            die_uids: dieList.map(r => r.uid),
            details: results
        });
    } catch (err) {
        return res.status(500).json({ status: 'error', msg: err.message });
    }
});

module.exports = router;
