import React, { useState } from 'react';
import { AlertCircle, Search, ArrowLeft } from 'lucide-react';
import type { FormState } from './OrderForm';

interface EditOrderLookupProps {
  onBack: () => void;
  onOrderFound: (orderNumber: string, phone: string, orderData: FormState) => void;
}

export const EditOrderLookup: React.FC<EditOrderLookupProps> = ({ onBack, onOrderFound }) => {
  const [orderNumber, setOrderNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedOrder = orderNumber.trim().toUpperCase();
    const trimmedPhone = phone.trim();

    if (!trimmedOrder) {
      setError('يرجى إدخال رقم الطلب (مثال: VIP-100001)');
      return;
    }

    if (!trimmedPhone) {
      setError('يرجى إدخال رقم الهاتف المستخدم عند التسجيل');
      return;
    }

    setIsSearching(true);

    try {
      const response = await fetch('/.netlify/functions/find-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderNumber: trimmedOrder,
          phone: trimmedPhone,
        }),
      });

      const result = await response.json();

      if (response.ok && result.success && result.order) {
        // Map Google Sheet subjects (comma separated) back to array
        const fetchedOrder = result.order as FormState;
        
        onOrderFound(trimmedOrder, trimmedPhone, fetchedOrder);
      } else {
        setError(result.message || 'لم يتم العثور على طلب مطابق. تأكد من رقم الطلب ورقم الهاتف.');
      }
    } catch (err: any) {
      console.error('Lookup error:', err);
      setError('حدث خطأ في الاتصال بالخادم. يرجى التحقق من شبكة الإنترنت والمحاولة مرة أخرى.');
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="form-card">
      {/* Header bar */}
      <div className="success-header-bar"></div>

      <h1 className="form-title" style={{ fontSize: '1.5rem', marginBottom: '8px' }}>تعديل طلب سابق</h1>
      <p className="form-subtitle" style={{ color: 'var(--text-muted)' }}>
        أدخل رقم الطلب ورقم الهاتف الذي استخدمته عند التسجيل لفتح الطلب وتعديله.
      </p>

      <div className="section-divider"></div>

      {error && (
        <div className="global-error-alert" style={{ marginBottom: '20px' }}>
          <AlertCircle size={20} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* حقل رقم الطلب */}
        <div>
          <label htmlFor="lookupOrder" className="question-title required">رقم الطلب</label>
          <input
            id="lookupOrder"
            type="text"
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            placeholder="مثال: VIP-100001"
            className="input-text-field"
            style={{ direction: 'ltr', textAlign: 'right', fontWeight: 'bold' }}
            disabled={isSearching}
          />
        </div>

        {/* حقل رقم الهاتف */}
        <div>
          <label htmlFor="lookupPhone" className="question-title required">رقم الهاتف</label>
          <input
            id="lookupPhone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="مثال: 0791234567"
            maxLength={10}
            className="input-text-field"
            style={{ direction: 'ltr', textAlign: 'right' }}
            disabled={isSearching}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
          {/* زر التحقق */}
          <button
            type="submit"
            className="btn-submit-google"
            disabled={isSearching}
            style={{ width: '100%', justifyContent: 'center' }}
          >
            {isSearching ? (
              <>
                <div className="google-spinner"></div>
                <span>جاري التحقق من الطلب...</span>
              </>
            ) : (
              <>
                <Search size={18} />
                <span>التحقق من الطلب</span>
              </>
            )}
          </button>

          {/* زر العودة */}
          <button
            type="button"
            onClick={onBack}
            className="clear-form-link"
            disabled={isSearching}
            style={{ alignSelf: 'center' }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <ArrowLeft size={16} />
              العودة للرئيسية
            </span>
          </button>
        </div>

      </form>
    </div>
  );
};
