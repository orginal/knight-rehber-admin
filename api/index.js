const express = require('express');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose'); // Mongoose eklendi

const app = express();

// MongoDB Bağlantısı Fonksiyonu
let isConnected = false;
const connectDB = async () => {
    if (isConnected) {
        console.log('✅ MongoDB zaten bağlı.');
        return;
    }
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 5000 // Bağlantı süresi 5 saniye
        });
        isConnected = true;
        console.log('✅ MongoDB bağlantısı başarılı.');
    } catch (error) {
        // Bu hata Vercel loglarında görünürse MONGODB_URI linkin yanlış demektir.
        console.error('❌ MongoDB bağlantı hatası:', error.message);
        throw new Error('Veritabanına bağlanılamadı.');
    }
};

// Mongoose Modelleri Tanımlandı
const UserSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    username: String,
    pushToken: String,
    platform: String,
    appVersion: String,
    lastActive: Date,
    createdAt: { type: Date, default: Date.now },
    isPremium: { type: Boolean, default: false }
});
const User = mongoose.models.User || mongoose.model('User', UserSchema);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..')));

// Basit veritabanı (Fallback - SADECE Geçici Veriler İçin)
let database = {
    notifications: [],
    updateNotes: [
        {
            id: 1,
            title: 'Hoş Geldiniz!',
            content: 'Knight Rehber uygulamasına hoş geldiniz. Yeni özellikler yakında eklenecek.',
            importance: 'normal',
            date: new Date().toLocaleDateString('tr-TR'),
            created_at: new Date().toISOString()
        }
    ],
    nostaljiPhotos: [
        {
            id: 'k1',
            title: 'Eski Knight Online',
            image_url: 'https://via.placeholder.com/300x200/FFD66B/0B0B0B?text=Knight+Rehber',
            created_at: new Date().toISOString()
        }
    ],
    appSettings: {
        app_status: 'active',
        maintenance_message: 'Uygulama bakım modundadır.',
        min_version: '1.0.0'
    }
};

// Mock Push Notification fonksiyonu (Şimdilik değiştirilmedi)
async function sendPushNotification(pushToken, title, message) {
    try {
        // ... (Kodun geri kalanı aynı)
        return true;
    } catch (error) {
        console.error('❌ Push notification hatası:', error);
        return false;
    }
}

// ROUTES

// HER İSTEKTEN ÖNCE VERİTABANINA BAĞLANMA
app.use(async (req, res, next) => {
    try {
        await connectDB();
        next();
    } catch (e) {
        res.status(503).json({ error: "Sunucu veritabanına bağlanamadı." });
    }
});


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

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, '../admin.html'));
});

// Admin giriş (Fallback)
app.post('/api/admin/login', (req, res) => {
    // ... (Kodun geri kalanı aynı)
});

// İstatistikler (MongoDB Kullanımı)
app.get('/api/admin/stats', async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        // Son 7 gün aktif olanları bulma
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const activeUsers = await User.countDocuments({ lastActive: { $gte: sevenDaysAgo } });
        const usersWithPushToken = await User.countDocuments({ pushToken: { $ne: null } });

        res.json({
            totalUsers: totalUsers,
            activeUsers: activeUsers,
            sentNotifications: database.notifications.length,
            usersWithPushToken: usersWithPushToken,
            appVersion: '1.0.0',
            appStatus: database.appSettings.app_status
        });
    } catch (error) {
        console.error('İstatistik hatası:', error);
        res.status(500).json({ error: 'İstatistikler alınırken hata oluştu.' });
    }
});

// Bildirim gönder (Fallback)
app.post('/api/admin/send-notification', async (req, res) => {
    // ... (Kodun geri kalanı aynı)
});

// Güncelleme notu ekle (Fallback)
app.post('/api/admin/add-update', (req, res) => {
    // ... (Kodun geri kalanı aynı)
});

// Nostalji fotoğrafı ekle (Fallback)
app.post('/api/admin/add-photo', (req, res) => {
    // ... (Kodun geri kalanı aynı)
});

// Uygulama durumunu güncelle (Fallback)
app.post('/api/admin/app-status', (req, res) => {
    // ... (Kodun geri kalanı aynı)
});

// Bildirimleri listele (Fallback)
app.get('/api/admin/notifications', (req, res) => {
    // ... (Kodun geri kalanı aynı)
});

// Güncelleme notlarını listele (Fallback)
app.get('/api/admin/updates', (req, res) => {
    // ... (Kodun geri kalanı aynı)
});

// Nostalji fotoğraflarını listele (Fallback)
app.get('/api/admin/photos', (req, res) => {
    // ... (Kodun geri kalanı aynı)
});

// MOBILE APP ROUTES
app.get('/api/app-status', (req, res) => {
    // ... (Kodun geri kalanı aynı)
});

app.get('/api/guncelleme-notlari', (req, res) => {
    // ... (Kodun geri kalanı aynı)
});

app.get('/api/nostalji-fotograflar', (req, res) => {
    // ... (Kodun geri kalanı aynı)
});

app.post('/api/stats', (req, res) => {
    // ... (Kodun geri kalanı aynı)
});

// Kullanıcı kaydı (MongoDB Kullanımı)
app.post('/api/notifications/register', async (req, res) => {
    const { userId, token, appVersion, platform, username } = req.body;

    console.log('📱 Kullanıcı kaydı:', { userId, token, username });

    try {
        const updateFields = {
            lastActive: new Date(),
            pushToken: token,
            platform: platform,
            appVersion: appVersion
        };
        if (username) updateFields.username = username;
        if (!userId) {
            return res.status(400).json({ error: 'userId gerekli' });
        }
        
        const existingUser = await User.findOneAndUpdate(
            { id: userId }, 
            { $set: updateFields },
            { new: true, upsert: true } // Eğer yoksa oluştur (upsert)
        );

        const totalUsers = await User.countDocuments();

        res.json({
            success: true,
            message: 'Kullanıcı başarıyla kaydedildi/güncellendi',
            totalUsers: totalUsers
        });
    } catch (error) {
        console.error('❌ Kullanıcı kayıt hatası:', error);
        res.status(500).json({ error: 'Kullanıcı kaydedilirken hata oluştu.' });
    }
});

// Kullanıcı listesi (MongoDB Kullanımı)
app.get('/api/admin/users', async (req, res) => {
    try {
        const users = await User.find({}).limit(20);
        const total = await User.countDocuments();
        const withPushToken = await User.countDocuments({ pushToken: { $ne: null } });

        res.json({
            users: users,
            total: total,
            withPushToken: withPushToken
        });
    } catch (error) {
        console.error('Kullanıcı listesi hatası:', error);
        res.status(500).json({ error: 'Kullanıcılar alınırken hata oluştu.' });
    }
});


module.exports = app;
