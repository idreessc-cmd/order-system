import crypto from 'crypto';

export const handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: false, message: 'Method Not Allowed. Only POST is supported.' })
    };
  }

  try {
    const { password } = JSON.parse(event.body);

    const adminPassword = process.env.ADMIN_PASSWORD;
    const adminSecret = process.env.ADMIN_SECRET;

    if (!adminPassword || !adminSecret) {
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: false,
          message: 'خطأ في النظام: متغيرات البيئة ADMIN_PASSWORD أو ADMIN_SECRET غير معرفة.'
        })
      };
    }

    if (password !== adminPassword) {
      return {
        statusCode: 401,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: false, message: 'كلمة المرور غير صحيحة.' })
      };
    }

    // إنشاء توكن مشفر باستخدام HMAC-SHA256
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({
      user: 'admin',
      exp: Date.now() + 24 * 60 * 60 * 1000 // صالح لمدة 24 ساعة
    })).toString('base64url');
    
    const signature = crypto.createHmac('sha256', adminSecret)
      .update(`${header}.${payload}`)
      .digest('base64url');

    const token = `${header}.${payload}.${signature}`;

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, token })
    };

  } catch (error) {
    console.error('Login error:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: false, message: 'حدث خطأ في عملية تسجيل الدخول.' })
    };
  }
};
