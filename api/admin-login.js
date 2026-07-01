import crypto from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ success: false, message: 'Method Not Allowed. Only POST is supported.' });
  }

  try {
    const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { password } = payload;

    const adminPassword = process.env.ADMIN_PASSWORD;
    const adminSecret = process.env.ADMIN_SECRET;

    if (!adminPassword || !adminSecret) {
      return res.status(500).json({
        success: false,
        message: 'خطأ في النظام: متغيرات البيئة ADMIN_PASSWORD أو ADMIN_SECRET غير معرفة.'
      });
    }

    if (password !== adminPassword) {
      return res.status(401).json({ success: false, message: 'كلمة المرور غير صحيحة.' });
    }

    // إنشاء توكن مشفر باستخدام HMAC-SHA256
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const payloadData = Buffer.from(JSON.stringify({
      user: 'admin',
      exp: Date.now() + 24 * 60 * 60 * 1000 // صالح لمدة 24 ساعة
    })).toString('base64url');
    
    const signature = crypto.createHmac('sha256', adminSecret)
      .update(`${header}.${payloadData}`)
      .digest('base64url');

    const token = `${header}.${payloadData}.${signature}`;

    return res.status(200).json({ success: true, token });

  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, message: 'حدث خطأ في عملية تسجيل الدخول.' });
  }
}
