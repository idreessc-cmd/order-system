import React, { useState } from 'react';
import { Check, Copy, MessageSquare, Home } from 'lucide-react';

interface SuccessViewProps {
  orderId: string;
  total: number; // إجمالي قيمة الطلب
  isEditMode?: boolean;
  onGoHome: () => void;
}

export const SuccessView: React.FC<SuccessViewProps> = ({ 
  orderId, 
  total,
  isEditMode = false,
  onGoHome
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(orderId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const handleWhatsAppRedirect = () => {
    const adminPhoneNumber = '962782496144';
    const formattedTotal = total.toFixed(2);
    const messageText = isEditMode 
      ? `السلام عليكم، تم تعديل طلبي بنجاح، رقم الطلب هو ${orderId}، والإجمالي ${formattedTotal} دينار.`
      : `السلام عليكم، تم تسجيل طلبي بنجاح، رقم الطلب هو ${orderId}، والإجمالي ${formattedTotal} دينار.`;
      
    const encodedText = encodeURIComponent(messageText);
    const whatsappUrl = `https://wa.me/${adminPhoneNumber}?text=${encodedText}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="form-card" style={{ padding: '24px' }}>
      {/* Google Purple Header Strip */}
      <div className="success-header-bar"></div>

      <h1 className="success-title-text">
        {isEditMode ? 'تعديل طلب سابق - امتحانات النجاح VIP' : 'طلب نماذج امتحانات النجاح المتوقعة VIP'}
      </h1>

      <div className="section-divider"></div>

      <p className="success-body-text" style={{ color: 'var(--text-color)', fontWeight: 600, fontSize: '1.1rem' }}>
        {isEditMode ? 'تم تعديل طلبكم بنجاح ✅' : 'تم تسجيل طلبكم بنجاح ✅'}
      </p>

      {/* Order ID & Price Box */}
      <div className="success-order-box">
        <span className="success-order-label">رقم الطلب الخاص بك</span>
        <div className="success-order-id-row" style={{ marginBottom: '8px' }}>
          <span className="success-order-id-value">{orderId}</span>
          <button 
            type="button" 
            onClick={handleCopy} 
            className="success-copy-btn" 
            title="نسخ رقم الطلب"
            aria-label="نسخ رقم الطلب"
          >
            {copied ? (
              <span style={{ color: 'var(--success-color)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '2px' }}>
                <Check size={16} /> تم النسخ
              </span>
            ) : (
              <Copy size={20} />
            )}
          </button>
        </div>
        
        <div style={{ display: 'flex', gap: '6px', fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-color)' }}>
          <span>الإجمالي:</span>
          <span style={{ color: 'var(--google-purple)' }}>{total.toFixed(2)} JD</span>
        </div>
      </div>

      <p className="success-body-text" style={{ color: 'var(--text-muted)', fontSize: '0.92rem', marginBottom: '24px', lineHeight: '1.6' }}>
        {isEditMode ? (
          'تم حفظ التعديلات وسيتم اعتماد آخر بيانات قمت بإرسالها. يرجى الاحتفاظ برقم الطلب هذا.'
        ) : (
          'يرجى الاحتفاظ برقم الطلب، وسيتم استخدامه عند التواصل معكم.'
        )}
        {' '}لتأكيد طلبك وتفعيله لدى الدعم الفني مباشرة، يرجى الضغط على زر الواتساب بالأسفل لإرسال الرقم فوراً.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* WhatsApp Button */}
        <button 
          type="button" 
          onClick={handleWhatsAppRedirect} 
          className="btn-whatsapp-google"
        >
          <MessageSquare size={20} />
          <span>إرسال رقم الطلب عبر واتساب</span>
        </button>

        {/* Home Button */}
        <button 
          type="button" 
          onClick={onGoHome} 
          className="clear-form-link"
          style={{ alignSelf: 'center', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px' }}
        >
          <Home size={16} />
          <span>العودة للصفحة الرئيسية</span>
        </button>
      </div>

      {/* Toast Notification */}
      <div className={`toast-msg ${copied ? 'show' : ''}`}>
        تم نسخ رقم الطلب بنجاح 📋
      </div>
    </div>
  );
};
