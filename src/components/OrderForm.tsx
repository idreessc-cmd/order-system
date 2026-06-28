import React, { useState, useRef, useEffect } from 'react';
import { AlertCircle, ArrowLeft } from 'lucide-react';

interface OrderFormProps {
  onSubmitSuccess: (orderId: string) => void;
  onBack: () => void;
  initialData?: FormState;
  orderNumber?: string;
  editPhone?: string;
  isEditMode?: boolean;
}

export interface FormState {
  fullName: string;
  generation: string; // توجيهي 2008, إلخ.
  governorate: string;
  address: string;
  mobilePhone: string;
  whatsappPhone: string;
  otherPhone: string;
  subjects: string[];
  otherSubject: string;
  packagePrice: string;
  deliveryConfirm: string; // "تم ✅" or ""
  notes: string;
}

const GOVERNORATES = [
  'عمان',
  'الزرقاء',
  'إربد',
  'البلقاء',
  'مأدبا',
  'جرش',
  'عجلون',
  'المفرق',
  'الكرك',
  'الطفيلة',
  'معان',
  'العقبة'
];

const SUBJECTS_LIST = [
  'امتحانات لغة عربية',
  'امتحانات إنجليزي',
  'امتحانات تاريخ الأردن',
  'امتحانات تربية إسلامية',
  'امتحانات تربية إسلامية تخصص 2008 (انتهى موعد التقديم)',
  'امتحانات جغرافيا (سيتم توفيرها داخل قروباتنا)',
  'امتحانات رياضيات هندسي (التوصيل يوم الأربعاء 1/7)',
  'امتحانات ثقافة مالية (التوصيل يوم الجمعة 3/7)',
  'امتحانات إنجليزي متقدم 2008 (التوصيل يوم الأحد 5/7)',
  'امتحانات فيزياء (التوصيل يوم الثلاثاء 7/7)',
  'امتحانات كيمياء (التوصيل يوم الجمعة 10/7)',
  'امتحانات تاريخ 2008 (التوصيل يوم الجمعة 10/7)',
  'امتحانات علوم الأرض (التوصيل يوم الإثنين 13/7)',
  'امتحانات فلسفة (التوصيل يوم الإثنين 13/7)',
  'امتحانات لغة عربية 2008 (التوصيل يوم الأربعاء 15/7)',
  'امتحانات علوم حياتية (التوصيل يوم الجمعة 17/7)',
  'امتحانات إنجليزي بيتيك (التوصيل يوم الأحد 5/7)',
  'امتحانات لغة عربية بيتيك (التوصيل يوم الثلاثاء 7/7)',
  'امتحانات تاريخ الأردن بيتيك (التوصيل يوم الأربعاء 15/7)',
  'امتحانات تربية إسلامية بيتيك (التوصيل يوم الجمعة 17/7)',
  'امتحانات رياضيات أعمال',
  'امتحانات علم النفس والاجتماع'
];

// دالة آمنة لتحويل القيمة إلى نص مع إزالة الفراغات لتجنب خطأ trim is not a function
const safeText = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  return String(value).trim();
};

export const OrderForm: React.FC<OrderFormProps> = ({ 
  onSubmitSuccess, 
  onBack,
  initialData,
  orderNumber,
  editPhone,
  isEditMode = false
}) => {
  const [formData, setFormData] = useState<FormState>({
    fullName: '',
    generation: '',
    governorate: '',
    address: '',
    mobilePhone: '',
    whatsappPhone: '',
    otherPhone: '',
    subjects: [],
    otherSubject: '',
    packagePrice: '',
    deliveryConfirm: '',
    notes: ''
  });

  const [errors, setErrors] = useState<Partial<Record<keyof FormState | 'api' | 'subjectsList', string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form data securely if in edit mode
  useEffect(() => {
    if (isEditMode && initialData) {
      setFormData({
        fullName: safeText(initialData.fullName),
        generation: safeText(initialData.generation),
        governorate: safeText(initialData.governorate),
        address: safeText(initialData.address),
        mobilePhone: safeText(initialData.mobilePhone),
        whatsappPhone: safeText(initialData.whatsappPhone),
        otherPhone: safeText(initialData.otherPhone),
        subjects: Array.isArray(initialData.subjects) ? initialData.subjects : [],
        otherSubject: safeText(initialData.otherSubject),
        packagePrice: safeText(initialData.packagePrice),
        deliveryConfirm: safeText(initialData.deliveryConfirm),
        notes: safeText(initialData.notes)
      });
    }
  }, [isEditMode, initialData]);

  // Refs for scrolling to the first error card
  const cardRefs = {
    fullName: useRef<HTMLDivElement>(null),
    generation: useRef<HTMLDivElement>(null),
    governorate: useRef<HTMLDivElement>(null),
    address: useRef<HTMLDivElement>(null),
    mobilePhone: useRef<HTMLDivElement>(null),
    whatsappPhone: useRef<HTMLDivElement>(null),
    otherPhone: useRef<HTMLDivElement>(null),
    subjectsList: useRef<HTMLDivElement>(null),
    packagePrice: useRef<HTMLDivElement>(null),
    deliveryConfirm: useRef<HTMLDivElement>(null)
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name as keyof FormState]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleRadioSelect = (name: 'generation' | 'governorate' | 'packagePrice' | 'deliveryConfirm', value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleCheckboxSelect = (subject: string) => {
    setFormData(prev => {
      const isSelected = prev.subjects.includes(subject);
      let newSubjects: string[];
      if (isSelected) {
        newSubjects = prev.subjects.filter(s => s !== subject);
      } else {
        newSubjects = [...prev.subjects, subject];
      }
      return { ...prev, subjects: newSubjects };
    });

    if (errors.subjectsList) {
      setErrors(prev => ({ ...prev, subjectsList: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof FormState | 'subjectsList', string>> = {};

    if (!safeText(formData.fullName)) {
      newErrors.fullName = 'هذا السؤال مطلوب إجباريًا';
    }

    if (!formData.generation) {
      newErrors.generation = 'هذا السؤال مطلوب إجباريًا';
    }

    if (!formData.governorate) {
      newErrors.governorate = 'هذا السؤال مطلوب إجباريًا';
    }

    if (!safeText(formData.address)) {
      newErrors.address = 'هذا السؤال مطلوب إجباريًا';
    }

    // Phone number validation: 10 digits starting with 077, 078, 079
    const phoneRegex = /^07[789]\d{7}$/;
    const cleanedMobile = safeText(formData.mobilePhone);
    const cleanedWhatsapp = safeText(formData.whatsappPhone);
    const cleanedOther = safeText(formData.otherPhone);

    if (!cleanedMobile) {
      newErrors.mobilePhone = 'هذا السؤال مطلوب إجباريًا';
    } else if (!phoneRegex.test(cleanedMobile)) {
      newErrors.mobilePhone = 'يرجى إدخال رقم هاتف أردني صحيح يتكون من 10 أرقام (مثال: 0791234567)';
    }

    if (!cleanedWhatsapp) {
      newErrors.whatsappPhone = 'هذا السؤال مطلوب إجباريًا';
    } else if (!phoneRegex.test(cleanedWhatsapp)) {
      newErrors.whatsappPhone = 'يرجى إدخال رقم واتساب صحيح يتكون من 10 أرقام (مثال: 0791234567)';
    }

    if (!cleanedOther) {
      newErrors.otherPhone = 'هذا السؤال مطلوب إجباريًا';
    }

    // Must select at least one subject or fill other subjects
    if (formData.subjects.length === 0 && !safeText(formData.otherSubject)) {
      newErrors.subjectsList = 'يرجى اختيار مادة واحدة على الأقل أو كتابة مواد أخرى في الحقل المخصص';
    }

    if (!formData.packagePrice) {
      newErrors.packagePrice = 'هذا السؤال مطلوب إجباريًا';
    }

    if (!formData.deliveryConfirm) {
      newErrors.deliveryConfirm = 'يرجى تأكيد قيمة التوصيل لإكمال الطلب';
    }

    setErrors(newErrors);

    // Scroll to first error card
    const errorKeys = Object.keys(newErrors) as Array<keyof typeof cardRefs>;
    if (errorKeys.length > 0) {
      const firstErrorKey = errorKeys[0];
      const ref = cardRefs[firstErrorKey];
      if (ref && ref.current) {
        ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return false;
    }

    return true;
  };

  const handleFormReset = () => {
    if (window.confirm('هل أنت متأكد من رغبتك في إخلاء النموذج وإعادة كتابته؟')) {
      setFormData({
        fullName: '',
        generation: '',
        governorate: '',
        address: '',
        mobilePhone: '',
        whatsappPhone: '',
        otherPhone: '',
        subjects: [],
        otherSubject: '',
        packagePrice: '',
        deliveryConfirm: '',
        notes: ''
      });
      setErrors({});
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      let response;
      
      if (isEditMode) {
        // Edit mode - send to update-order function
        response = await fetch('/.netlify/functions/update-order', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            orderNumber: orderNumber,
            phone: editPhone,
            data: formData
          }),
        });
      } else {
        // Create mode - send to submit-order function
        response = await fetch('/.netlify/functions/submit-order', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        });
      }

      if (!response.ok) {
        throw new Error(`فشل الاتصال بالخادم. رمز الحالة: ${response.status}`);
      }

      const result = await response.json();

      if (result.success && result.orderNumber) {
        onSubmitSuccess(result.orderNumber);
      } else {
        throw new Error(result.message || 'فشل حفظ الطلب، يرجى المحاولة مرة أخرى.');
      }
    } catch (error: any) {
      console.error('Submission error:', error);
      // تجنب إظهار أي رسالة خطأ برمجية للطالب وعرض رسالة عامة بسيطة ومفهومة
      setErrors(prev => ({
        ...prev,
        api: 'تعذر تسجيل الطلب، يرجى التحقق من اتصالك بالإنترنت ثم المحاولة مرة أخرى.'
      }));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="form-container" noValidate>
      
      {errors.api && (
        <div className="global-error-alert">
          <AlertCircle size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
          <span>{errors.api}</span>
        </div>
      )}

      {isEditMode && (
        <div className="form-card" style={{ borderTop: '5px solid var(--google-purple)', padding: '16px 24px' }}>
          <span className="question-title" style={{ color: 'var(--google-purple)', margin: 0 }}>
            أنت الآن تعدّل الطلب رقم: <strong>{orderNumber}</strong>
          </span>
        </div>
      )}

      {/* 1. الاسم الكامل */}
      <div 
        ref={cardRefs.fullName} 
        className={`form-card ${errors.fullName ? 'error-state' : ''}`}
      >
        <label htmlFor="fullName" className="question-title required">الاسم الكامل</label>
        <input
          id="fullName"
          type="text"
          name="fullName"
          value={formData.fullName}
          onChange={handleInputChange}
          placeholder="إجابتك"
          className="input-text-field"
          disabled={isSubmitting}
        />
        {errors.fullName && (
          <div className="card-error-msg">
            <AlertCircle size={14} />
            <span>{errors.fullName}</span>
          </div>
        )}
      </div>

      {/* 2. الصف / الجيل */}
      <div 
        ref={cardRefs.generation} 
        className={`form-card ${errors.generation ? 'error-state' : ''}`}
      >
        <span className="question-title required">الصف / الجيل</span>
        <div className="options-container">
          {['توجيهي 2008', 'توجيهي 2009', 'بيتيك BTEC'].map(option => (
            <div 
              key={option} 
              className={`option-row radio ${formData.generation === option ? 'checked' : ''} ${isSubmitting ? 'disabled' : ''}`}
              onClick={() => !isSubmitting && handleRadioSelect('generation', option)}
            >
              <input 
                type="radio" 
                name="generation" 
                value={option} 
                checked={formData.generation === option} 
                onChange={() => {}}
                className="option-input"
                disabled={isSubmitting}
              />
              <span className="option-label">{option}</span>
            </div>
          ))}
        </div>
        {errors.generation && (
          <div className="card-error-msg">
            <AlertCircle size={14} />
            <span>{errors.generation}</span>
          </div>
        )}
      </div>

      {/* 3. المحافظة */}
      <div 
        ref={cardRefs.governorate} 
        className={`form-card ${errors.governorate ? 'error-state' : ''}`}
      >
        <label htmlFor="governorate" className="question-title required">المحافظة</label>
        <div style={{ marginTop: '12px' }}>
          <select
            id="governorate"
            name="governorate"
            value={formData.governorate}
            onChange={handleInputChange}
            className="input-select-field"
            disabled={isSubmitting}
          >
            <option value="">اختيار</option>
            {GOVERNORATES.map(gov => (
              <option key={gov} value={gov}>{gov}</option>
            ))}
          </select>
        </div>
        {errors.governorate && (
          <div className="card-error-msg">
            <AlertCircle size={14} />
            <span>{errors.governorate}</span>
          </div>
        )}
      </div>

      {/* 4. المنطقة / العنوان التفصيلي */}
      <div 
        ref={cardRefs.address} 
        className={`form-card ${errors.address ? 'error-state' : ''}`}
      >
        <label htmlFor="address" className="question-title required">المنطقة / العنوان التفصيلي</label>
        <input
          id="address"
          type="text"
          name="address"
          value={formData.address}
          onChange={handleInputChange}
          placeholder="اكتب اسم المنطقة والشارع أو معلم قريب"
          className="input-text-field"
          disabled={isSubmitting}
        />
        {errors.address && (
          <div className="card-error-msg">
            <AlertCircle size={14} />
            <span>{errors.address}</span>
          </div>
        )}
      </div>

      {/* 5. رقم موبايل للتواصل */}
      <div 
        ref={cardRefs.mobilePhone} 
        className={`form-card ${errors.mobilePhone ? 'error-state' : ''}`}
      >
        <label htmlFor="mobilePhone" className="question-title required">رقم موبايل للتواصل</label>
        <p className="question-description">يفضل أن يكون فعال ونشط</p>
        <input
          id="mobilePhone"
          type="tel"
          name="mobilePhone"
          value={formData.mobilePhone}
          onChange={handleInputChange}
          placeholder="مثال: 0791234567"
          maxLength={10}
          className="input-text-field"
          style={{ direction: 'ltr', textAlign: 'right' }}
          disabled={isSubmitting}
        />
        {errors.mobilePhone && (
          <div className="card-error-msg">
            <AlertCircle size={14} />
            <span>{errors.mobilePhone}</span>
          </div>
        )}
      </div>

      {/* 6. رقم واتساب للتواصل */}
      <div 
        ref={cardRefs.whatsappPhone} 
        className={`form-card ${errors.whatsappPhone ? 'error-state' : ''}`}
      >
        <label htmlFor="whatsappPhone" className="question-title required">رقم واتساب للتواصل</label>
        <p className="question-description">يفضل أن يكون فعال ومتصل بالإنترنت</p>
        <input
          id="whatsappPhone"
          type="tel"
          name="whatsappPhone"
          value={formData.whatsappPhone}
          onChange={handleInputChange}
          placeholder="مثال: 0791234567"
          maxLength={10}
          className="input-text-field"
          style={{ direction: 'ltr', textAlign: 'right' }}
          disabled={isSubmitting}
        />
        {errors.whatsappPhone && (
          <div className="card-error-msg">
            <AlertCircle size={14} />
            <span>{errors.whatsappPhone}</span>
          </div>
        )}
      </div>

      {/* 7. رقم هاتف آخر */}
      <div 
        ref={cardRefs.otherPhone} 
        className={`form-card ${errors.otherPhone ? 'error-state' : ''}`}
      >
        <label htmlFor="otherPhone" className="question-title required">رقم هاتف آخر</label>
        <input
          id="otherPhone"
          type="tel"
          name="otherPhone"
          value={formData.otherPhone}
          onChange={handleInputChange}
          placeholder="رقم هاتف الأب أو الأم أو رقم بديل"
          className="input-text-field"
          style={{ direction: 'ltr', textAlign: 'right' }}
          disabled={isSubmitting}
        />
        {errors.otherPhone && (
          <div className="card-error-msg">
            <AlertCircle size={14} />
            <span>{errors.otherPhone}</span>
          </div>
        )}
      </div>

      {/* 8. المادة المطلوبة */}
      <div 
        ref={cardRefs.subjectsList} 
        className={`form-card ${errors.subjectsList ? 'error-state' : ''}`}
      >
        <span className="question-title">المادة المطلوبة</span>
        <p className="question-description">يمكنك اختيار مادة واحدة أو عدة مواد مطلوبة:</p>
        <div className="options-container">
          {SUBJECTS_LIST.map(subject => {
            const isSelected = formData.subjects.includes(subject);
            return (
              <div 
                key={subject}
                className={`option-row checkbox ${isSelected ? 'checked' : ''} ${isSubmitting ? 'disabled' : ''}`}
                onClick={() => !isSubmitting && handleCheckboxSelect(subject)}
              >
                <input 
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => {}}
                  className="option-input"
                  disabled={isSubmitting}
                />
                <span className="option-label">{subject}</span>
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: '20px' }}>
          <label htmlFor="otherSubject" className="question-title" style={{ fontSize: '0.9rem' }}>
            أو إذا اخترت مواد أخرى، اكتبها هنا
          </label>
          <input
            id="otherSubject"
            type="text"
            name="otherSubject"
            value={formData.otherSubject}
            onChange={handleInputChange}
            placeholder="اكتب أسماء المواد الإضافية هنا..."
            className="input-text-field other-subject-input"
            disabled={isSubmitting}
          />
        </div>

        {errors.subjectsList && (
          <div className="card-error-msg">
            <AlertCircle size={14} />
            <span>{errors.subjectsList}</span>
          </div>
        )}
      </div>

      {/* 9. سعر بكج امتحانات المادة الواحدة */}
      <div 
        ref={cardRefs.packagePrice} 
        className={`form-card ${errors.packagePrice ? 'error-state' : ''}`}
      >
        <span className="question-title required">سعر بكج امتحانات المادة الواحدة</span>
        <div className="options-container">
          {['(أبيض وأسود) 2.5 JD', '(ملون) 3.5 JD'].map(option => (
            <div 
              key={option} 
              className={`option-row radio ${formData.packagePrice === option ? 'checked' : ''} ${isSubmitting ? 'disabled' : ''}`}
              onClick={() => !isSubmitting && handleRadioSelect('packagePrice', option)}
            >
              <input 
                type="radio" 
                name="packagePrice" 
                value={option} 
                checked={formData.packagePrice === option} 
                onChange={() => {}}
                className="option-input"
                disabled={isSubmitting}
              />
              <span className="option-label">{option}</span>
            </div>
          ))}
        </div>
        {errors.packagePrice && (
          <div className="card-error-msg">
            <AlertCircle size={14} />
            <span>{errors.packagePrice}</span>
          </div>
        )}
      </div>

      {/* 10. سعر التوصيل دينار واحد فقط 1JD */}
      <div 
        ref={cardRefs.deliveryConfirm} 
        className={`form-card ${errors.deliveryConfirm ? 'error-state' : ''}`}
      >
        <span className="question-title required">سعر التوصيل دينار واحد فقط 1JD</span>
        <div className="options-container">
          <div 
            className={`option-row radio ${formData.deliveryConfirm === 'تم ✅' ? 'checked' : ''} ${isSubmitting ? 'disabled' : ''}`}
            onClick={() => !isSubmitting && handleRadioSelect('deliveryConfirm', 'تم ✅')}
          >
            <input 
              type="radio" 
              name="deliveryConfirm" 
              value="تم ✅" 
              checked={formData.deliveryConfirm === 'تم ✅'} 
              onChange={() => {}}
              className="option-input"
              disabled={isSubmitting}
            />
            <span className="option-label">تم ✅</span>
          </div>
        </div>
        {errors.deliveryConfirm && (
          <div className="card-error-msg">
            <AlertCircle size={14} />
            <span>{errors.deliveryConfirm}</span>
          </div>
        )}
      </div>

      {/* 11. ملاحظات أخرى */}
      <div className="form-card">
        <label htmlFor="notes" className="question-title">ملاحظات أخرى</label>
        <textarea
          id="notes"
          name="notes"
          value={formData.notes}
          onChange={handleInputChange}
          placeholder="إجابتك"
          className="input-textarea-field"
          disabled={isSubmitting}
        />
      </div>

      {/* تنبيه قبل الإرسال */}
      <div className="warning-box">
        <span className="warning-title">⚠️ ملاحظة</span>
        <span className="warning-item">
          <span>⭕</span>
          <span>يتم إرسال وتوصيل كل مادة على حدة قبل موعد الامتحان.</span>
        </span>
        <span className="warning-item">
          <span>⭕</span>
          <span>تأكد من صحة المعلومات قبل إرسال الطلب.</span>
        </span>
      </div>

      {/* أزرار التحكم والتقديم */}
      <div className="footer-row">
        <button 
          type="submit" 
          className="btn-submit-google"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <div className="google-spinner"></div>
              <span>{isEditMode ? 'جاري حفظ التعديلات...' : 'جاري تسجيل الطلب...'}</span>
            </>
          ) : (
            <span>{isEditMode ? 'حفظ التعديلات ✅' : 'تثبيت الطلب'}</span>
          )}
        </button>
        
        <button 
          type="button" 
          onClick={isEditMode ? onBack : handleFormReset} 
          className="clear-form-link"
          disabled={isSubmitting}
        >
          {isEditMode ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <ArrowLeft size={16} /> إلغاء التعديل
            </span>
          ) : 'إخلاء النموذج'}
        </button>
      </div>

    </form>
  );
};
