const express = require('express');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Basit veritabanı (gerçek projede database kullanın)
let database = {
  users: [
    { id: 'guest_123', username: 'Misafir', lastActive: new Date().toISOString() }
  ],
  notifications: [],
  updateNotes: [
    {
      id: 1,
      title: 'Hoş Geldiniz!',
      content: 'Knight Rehber uygulamasına hoş geldiniz. Yeni özellikler yakında eklenecek.',
      importance: 'normal',
      date: '19.11.2024'
    }
  ],
  nostaljiPhotos: [
    {
      id: 'k1',
      title: 'Eski Knight Online 1',
      image_url: '/ko1.jpg'
    }
  ],
  appSettings: {
    app_status: 'active',
    maintenance_message: 'Uygulama bakım modundadır.',
    min_version: '1.0.0'
  }
};

// 🔐 ADMIN GİRİŞ
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;

  // Basit auth - production'da daha güvenli yapın
  const adminUsername = 'admin';
  const adminPassword = 'knight123'; // Bunu sonradan değiştirin!

  if (username === adminUsername && password === adminPassword) {
    res.json({
      success: true,
      token: 'admin-token-2024',
      user: { username: adminUsername }
    });
  } else {
    res.status(401).json({ error: 'Geçersiz kullanıcı adı veya şifre' });
  }
});

// 📊 İSTATİSTİKLER
app.get('/api/admin/stats', (req, res) => {
  res.json({
    totalUsers: database.users.length,
    activeUsers: database.users.filter(u => {
      const lastActive = new Date(u.lastActive);
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return lastActive > sevenDaysAgo;
    }).length,
    sentNotifications: database.notifications.length,
    appVersion: '1.0.0',
    appStatus: database.appSettings.app_status
  });
});

// 📢 BİLDİRİM GÖNDER
app.post('/api/admin/send-notification', (req, res) => {
  const { title, message, target } = req.body;

  if (!title || !message) {
    return res.status(400).json({ error: 'Başlık ve mesaj gerekli' });
  }

  const newNotification = {
    id: Date.now(),
    title,
    message,
    target: target || 'all',
    sent_count: database.users.length,
    created_at: new Date().toISOString()
  };

  database.notifications.unshift(newNotification);

  console.log(`📢 Bildirim gönderildi: "${title}" - ${database.users.length} kullanıcıya`);

  res.json({
    success: true,
    message: 'Bildirim başarıyla gönderildi',
    notification: newNotification
  });
});

// 📝 GÜNCELLEME NOTU EKLE
app.post('/api/admin/add-update', (req, res) => {
  const { title, content, importance } = req.body;

  if (!title || !content) {
    return res.status(400).json({ error: 'Başlık ve içerik gerekli' });
  }

  const newUpdate = {
    id: Date.now(),
    title,
    content,
    importance: importance || 'normal',
    date: new Date().toLocaleDateString('tr-TR'),
    created_at: new Date().toISOString()
  };

  database.updateNotes.unshift(newUpdate);

  res.json({
    success: true,
    message: 'Güncelleme notu eklendi',
    update: newUpdate
  });
});

// 🖼️ NOSTALJİ FOTOĞRAFI EKLE
app.post('/api/admin/add-photo', (req, res) => {
  const { title, url } = req.body;

  if (!title || !url) {
    return res.status(400).json({ error: 'Başlık ve URL gerekli' });
  }

  const newPhoto = {
    id: 'k' + (database.nostaljiPhotos.length + 1),
    title,
    image_url: url,
    created_at: new Date().toISOString()
  };

  database.nostaljiPhotos.unshift(newPhoto);

  res.json({
    success: true,
    message: 'Fotoğraf eklendi',
    photo: newPhoto
  });
});

// ⚙️ UYGULAMA DURUMUNU GÜNCELLE
app.post('/api/admin/app-status', (req, res) => {
  const { status, maintenanceMessage } = req.body;

  database.appSettings.app_status = status || 'active';
  database.appSettings.maintenance_message = maintenanceMessage || 'Uygulama bakım modundadır.';

  res.json({
    success: true,
    message: 'Uygulama durumu güncellendi',
    settings: database.appSettings
  });
});

// 📱 MOBİL UYGULAMA İÇİN API'LER

// Uygulama durumunu getir
app.get('/api/app-status', (req, res) => {
  res.json({
    status: database.appSettings.app_status,
    maintenance: database.appSettings.app_status === 'maintenance',
    maintenanceMessage: database.appSettings.maintenance_message
  });
});

// Güncelleme notlarını getir
app.get('/api/guncelleme-notlari', (req, res) => {
  res.json(database.updateNotes.slice(0, 10));
});

// Nostalji fotoğraflarını getir
app.get('/api/nostalji-fotograflar', (req, res) => {
  res.json(database.nostaljiPhotos);
});

// Kullanıcı kaydı
app.post('/api/notifications/register', (req, res) => {
  const { userId, token, appVersion, platform } = req.body;

  // Kullanıcıyı kaydet veya güncelle
  const existingUser = database.users.find(u => u.id === userId);
  if (existingUser) {
    existingUser.lastActive = new Date().toISOString();
    existingUser.pushToken = token;
  } else {
    database.users.push({
      id: userId,
      username: 'Kullanıcı-' + Date.now(),
      pushToken: token,
      platform: platform,
      appVersion: appVersion,
      lastActive: new Date().toISOString(),
      createdAt: new Date().toISOString()
    });
  }

  res.json({ success: true });
});

// İstatistik gönder
app.post('/api/stats', (req, res) => {
  const { userId, action } = req.body;

  console.log(`📊 İstatistik: ${userId} - ${action}`);
  res.json({ success: true });
});

// Bildirimleri getir
app.get('/api/admin/notifications', (req, res) => {
  res.json(database.notifications.slice(0, 20));
});

// Ana sayfa
app.get('/', (req, res) => {
  res.json({
    message: 'Knight Rehber API Çalışıyor 🏰',
    version: '1.0.0',
    endpoints: {
      admin: '/admin',
      api: '/api'
    }
  });
});

// Vercel için export
module.exports = app;