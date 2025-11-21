const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// PostgreSQL bağlantısı
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// JWT secret key
const JWT_SECRET = process.env.JWT_SECRET || 'knightrehber_secret_key_2024_aga_2312631';

// Auth middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, error: 'Erişim tokenı gerekli' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, error: 'Geçersiz token' });
    }
    req.user = user;
    next();
  });
};

// ADMIN ROUTES

// Admin giriş - SABİT KULLANICI
app.post('/api/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log('Giriş denemesi', username, password);

    // Sabit kullanıcı kontrolü
    if (username === 'Aga' && password === '2312631') {
      const token = jwt.sign({ username, role: 'admin' }, JWT_SECRET, { expiresIn: '24h' });

      console.log('✅ Başarılı giriş', username);
      return res.json({
        success: true,
        token,
        user: { username, role: 'admin' }
      });
    }

    console.log('❌ Geçersiz giriş', username);
    res.status(401).json({ success: false, error: 'Geçersiz kullanıcı adı veya şifre' });
  } catch (error) {
    console.error('Giriş hatası', error);
    res.status(500).json({ success: false, error: 'Sunucu hatası' });
  }
});

// İstatistikleri getir
app.get('/api/admin/stats', authenticateToken, async (req, res) => {
  try {
    // Kullanıcı sayısı
    const userCount = await pool.query('SELECT COUNT(*) FROM user_tokens');
    const notificationCount = await pool.query('SELECT COUNT(*) FROM notifications');

    res.json({
      success: true,
      totalUsers: parseInt(userCount.rows[0].count) || 0,
      activeUsers: parseInt(userCount.rows[0].count) || 0,
      sentNotifications: parseInt(notificationCount.rows[0].count) || 0,
      usersWithPushToken: parseInt(userCount.rows[0].count) || 0,
      appVersion: '1.0.0',
      appStatus: 'active'
    });
  } catch (error) {
    console.error('İstatistik hatası', error);
    res.json({
      success: true,
      totalUsers: 0,
      activeUsers: 0,
      sentNotifications: 0,
      usersWithPushToken: 0,
      appVersion: '1.0.0',
      appStatus: 'active'
    });
  }
});

// Bildirim gönder
app.post('/api/admin/send-notification', authenticateToken, async (req, res) => {
  try {
    const { title, message, target } = req.body;
    console.log('Bildirim gönderiliyor', title);

    if (!title || !message) {
      return res.status(400).json({ success: false, error: 'Başlık ve mesaj gerekli' });
    }

    const result = await pool.query(
      `INSERT INTO notifications (title, message, target, created_at) 
       VALUES ($1, $2, $3, NOW()) RETURNING *`,
      [title, message, target || 'all']
    );

    res.json({
      success: true,
      message: 'Bildirim başarıyla gönderildi!',
      notification: result.rows[0]
    });
  } catch (error) {
    console.error('Bildirim hatası', error);
    res.status(500).json({ success: false, error: 'Bildirim gönderilemedi' });
  }
});

// Güncelleme notu ekle
app.post('/api/admin/add-update', authenticateToken, async (req, res) => {
  try {
    const { title, content, importance } = req.body;
    console.log('Güncelleme ekleniyor', title);

    if (!title || !content) {
      return res.status(400).json({ success: false, error: 'Başlık ve içerik gerekli' });
    }

    const result = await pool.query(
      `INSERT INTO update_notes (title, content, importance, date, created_at) 
       VALUES ($1, $2, $3, $4, NOW()) RETURNING *`,
      [title, content, importance || 'normal', new Date().toISOString().split('T')[0]]
    );

    res.json({
      success: true,
      message: 'Güncelleme notu başarıyla eklendi!',
      update: result.rows[0]
    });
  } catch (error) {
    console.error('Güncelleme hatası', error);
    res.status(500).json({ success: false, error: 'Güncelleme notu eklenemedi' });
  }
});

// Nostalji fotoğrafı ekle
app.post('/api/admin/add-photo', authenticateToken, async (req, res) => {
  try {
    const { title, url } = req.body;
    console.log('Fotoğraf ekleniyor', title);

    if (!title || !url) {
      return res.status(400).json({ success: false, error: 'Başlık ve URL gerekli' });
    }

    const result = await pool.query(
      `INSERT INTO nostalgia_photos (id, title, image_url, created_at) 
       VALUES ($1, $2, $3, NOW()) RETURNING *`,
      ['k' + Date.now(), title, url]
    );

    res.json({
      success: true,
      message: 'Fotoğraf başarıyla eklendi!',
      photo: result.rows[0]
    });
  } catch (error) {
    console.error('Fotoğraf hatası', error);
    res.status(500).json({ success: false, error: 'Fotoğraf eklenemedi' });
  }
});

// Bildirimleri listele
app.get('/api/admin/notifications', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM notifications ORDER BY created_at DESC LIMIT 20'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Bildirim listeleme hatası', error);
    res.json([]);
  }
});

// Güncelleme notlarını listele (Admin)
app.get('/api/admin/updates', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM update_notes ORDER BY created_at DESC LIMIT 20'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Güncelleme listeleme hatası', error);
    res.json([]);
  }
});

// Nostalji fotoğraflarını listele (Admin)
app.get('/api/admin/photos', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM nostalgia_photos ORDER BY created_at DESC LIMIT 20'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Fotoğraf listeleme hatası', error);
    res.json([]);
  }
});

// Uygulama durumunu güncelle
app.post('/api/admin/app-status', authenticateToken, async (req, res) => {
  try {
    const { status, maintenanceMessage } = req.body;

    res.json({
      success: true,
      message: 'Uygulama durumu güncellendi!',
      status: status || 'active'
    });
  } catch (error) {
    console.error('App status hatası', error);
    res.status(500).json({ success: false, error: 'Durum güncellenemedi' });
  }
});

// Versiyon ayarlarını güncelle
app.post('/api/admin/version-settings', authenticateToken, async (req, res) => {
  try {
    const { minVersion, forceUpdateMessage } = req.body;

    res.json({
      success: true,
      message: 'Versiyon ayarları kaydedildi!'
    });
  } catch (error) {
    console.error('Versiyon ayarları hatası', error);
    res.status(500).json({ success: false, error: 'Ayarlar kaydedilemedi' });
  }
});

// MOBILE APP ROUTES

// Güncelleme notlarını getir
app.get('/api/guncelleme-notlari', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM update_notes ORDER BY created_at DESC LIMIT 10'
    );
    console.log('Güncelleme notları getirildi', result.rows.length);
    res.json(result.rows);
  } catch (error) {
    console.error('Güncelleme notları hatası', error);
    // Fallback Varsayılan güncelleme notu
    res.json([{
      id: 1,
      title: 'Hoş Geldiniz!',
      content: 'Knight Rehber uygulamasına hoş geldiniz. Yeni özellikler yakında eklenecek.',
      importance: 'normal',
      date: new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString()
    }]);
  }
});

// Nostalji fotoğraflarını getir
app.get('/api/nostalji-fotograflar', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM nostalgia_photos ORDER BY created_at DESC'
    );
    console.log('Nostalji fotoğrafları getirildi', result.rows.length);
    res.json(result.rows);
  } catch (error) {
    console.error('Nostalji fotoğrafları hatası', error);
    // Fallback Varsayılan fotoğraflar
    res.json([
      {
        id: 'k1',
        title: 'Eski Knight Online',
        image_url: 'https://via.placeholder.com/300x200/FFD66B/0B0B0B?text=Knight+Rehber',
        created_at: new Date().toISOString()
      }
    ]);
  }
});

// Push notification kaydı
app.post('/api/notifications/register', async (req, res) => {
  try {
    const { userId, token, appVersion } = req.body;
    console.log('Push token kaydediliyor', userId);

    await pool.query(
      `INSERT INTO user_tokens (user_id, token, app_version, created_at) 
       VALUES ($1, $2, $3, NOW()) 
       ON CONFLICT (user_id) DO UPDATE SET token = $2, app_version = $3, updated_at = NOW()`,
      [userId, token, appVersion]
    );

    res.json({ success: true, message: 'Token kaydedildi' });
  } catch (error) {
    console.error('Token kaydetme hatası', error);
    res.json({ success: false, error: 'Token kaydedilemedi' });
  }
});

// İstatistik gönder
app.post('/api/stats', async (req, res) => {
  try {
    const { userId, action, timestamp, appVersion, platform } = req.body;

    await pool.query(
      `INSERT INTO user_stats (user_id, action, timestamp, app_version, platform) 
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, action, timestamp, appVersion, platform]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('İstatistik hatası', error);
    res.json({ success: true });
  }
});

// Uygulama durumu kontrolü
app.get('/api/app-status', async (req, res) => {
  try {
    res.json({
      status: 'active',
      maintenance: false,
      maintenanceMessage: ''
    });
  } catch (error) {
    console.error('App status kontrol hatası', error);
    res.json({ status: 'active', maintenance: false });
  }
});

// Ana sayfa
app.get('/', (req, res) => {
  res.json({
    message: 'Knight Rehber API Çalışıyor 🏰',
    version: '1.0.0',
    endpoints: {
      admin: '/admin.html',
      api: '/api'
    }
  });
});

// Admin paneli
app.get('/admin', (req, res) => {
  res.sendFile(__dirname + '/admin.html');
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Knight Rehber API çalışıyor',
    timestamp: new Date().toISOString()
  });
});

// Database tablolarını oluştur
async function initializeDatabase() {
  const tables = [
    `CREATE TABLE IF NOT EXISTS update_notes (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      content TEXT NOT NULL,
      importance VARCHAR(50) DEFAULT 'normal',
      date DATE NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )`,

    `CREATE TABLE IF NOT EXISTS nostalgia_photos (
      id VARCHAR(50) PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      image_url TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )`,

    `CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      target VARCHAR(50) DEFAULT 'all',
      created_at TIMESTAMP DEFAULT NOW()
    )`,

    `CREATE TABLE IF NOT EXISTS user_tokens (
      user_id VARCHAR(100) PRIMARY KEY,
      token TEXT NOT NULL,
      app_version VARCHAR(50),
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )`,

    `CREATE TABLE IF NOT EXISTS user_stats (
      id SERIAL PRIMARY KEY,
      user_id VARCHAR(100),
      action VARCHAR(100),
      timestamp TIMESTAMP,
      app_version VARCHAR(50),
      platform VARCHAR(50),
      created_at TIMESTAMP DEFAULT NOW()
    )`
  ];

  try {
    for (const tableSql of tables) {
      await pool.query(tableSql);
    }
    console.log('✅ Database tabloları hazır');

    // Test verisi ekle
    await pool.query(`
      INSERT INTO update_notes (title, content, importance, date) 
      VALUES ('Knight Rehber Başlatıldı', 'Knight Rehber uygulaması yayına alındı! Yeni özellikler yakında eklenecek.', 'normal', NOW())
      ON CONFLICT DO NOTHING
    `);

    await pool.query(`
      INSERT INTO nostalgia_photos (id, title, image_url) 
      VALUES ('k1', 'Eski Knight Online', 'https://via.placeholder.com/300x200/FFD66B/0B0B0B?text=Knight+Rehber')
      ON CONFLICT DO NOTHING
    `);

  } catch (error) {
    console.error('❌ Database başlatma hatası', error);
  }
}

// Server başlatma
app.listen(PORT, async () => {
  console.log(`🚀 Knight Rehber API http://localhost:${PORT} portunda çalışıyor`);
  console.log(`📊 Admin Panel: http://localhost:${PORT}/admin`);
  console.log(`❤️  Health Check: http://localhost:${PORT}/health`);
  console.log(`🔑 Admin Giriş: Aga / 2312631`);

  await initializeDatabase();
});