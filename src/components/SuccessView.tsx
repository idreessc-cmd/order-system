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
      ? `السلام عليكم، تم تعديل طلبي بنجاح، رقم الطلب هو ${orderId}، والإجمالي المطلوب ${formattedTotal} دينار.`
      : `السلام عليكم، تم تسجيل طلبي بنجاح، رقم الطلب هو ${orderId}، والإجمالي المطلوب ${formattedTotal} دينار.`;
      
    const encodedText = encodeURIComponent(messageText);
    const whatsappUrl = `https://wa.me/${adminPhoneNumber}?text=${encodedText}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="form-card" style={{ padding: '24px' }}>
      {/* Google Purple Header Strip */}
      <div className="success-header-bar"></div>

      <h1 className="success-title-text" style={{ fontSize: '1.5rem', textAlign: 'center', color: 'var(--google-purple)' }}>
        {isEditMode ? 'تم تعديل طلبكم بنجاح ✅' : 'تم تسجيل طلبكم بنجاح ✅'}
      </h1>

      <div className="section-divider"></div>

      {/* Order ID & Price Box */}
      <div className="success-order-box" style={{ margin: '20px 0', border: '1px solid var(--border-color)', backgroundColor: '#fcfbfe' }}>
        <span className="success-order-label">رقم الطلب</span>
        <div className="success-order-id-row" style={{ marginBottom: '8px' }}>
          <span className="success-order-id-value" style={{ fontSize: '1.8rem', fontWeight: 800 }}>{orderId}</span>
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

        <div style={{ display: 'flex', gap: '6px', fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-color)' }}>
          <span>الإجمالي المطلوب:</span>
          <span style={{ color: 'var(--google-purple)' }}>{total.toFixed(2)} JD</span>
        </div>
      </div>

      <p className="success-body-text" style={{ color: 'var(--text-color)', fontSize: '0.95rem', textAlign: 'center', marginBottom: '24px', lineHeight: '1.6', fontWeight: 600 }}>
        {isEditMode ? (
          'تم حفظ التعديلات وسيتم اعتماد آخر بيانات قمت بإرسالها.'
        ) : (
          'يرجى الاحتفاظ برقم الطلب، وسيتم التواصل معكم لتأكيد التوصيل.'
        )}
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* WhatsApp Button */}
        <button 
          type="button" 
          onClick={handleWhatsAppRedirect} 
          className="btn-whatsapp-google"
          style={{ height: '48px', fontSize: '0.95rem' }}
        >
          <MessageSquare size={20} />
          <span>إرسال رقم الطلب على واتساب</span>
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
