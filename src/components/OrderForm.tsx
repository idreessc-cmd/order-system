import React, { useState, useRef, useEffect } from 'react';
import { AlertCircle, ArrowLeft, Receipt } from 'lucide-react';

interface OrderFormProps {
  onSubmitSuccess: (orderId: string, total: number) => void;
  onBack: () => void;
  initialData?: FormState;
  orderNumber?: string;
  editPhone?: string;
  isEditMode?: boolean;
}

export interface FormState {
  fullName: string;
  generation: string;
  governorate: string;
  address: string;
  mobilePhone: string;
  whatsappPhone: string;
  otherPhone: string;
  subjects: string[];
  otherSubject: string;
  packagePrice: string; // محتفظ بها لتوافق البنية
  deliveryConfirm: string; // "تم ✅" or ""
  notes: string;
  printType: string;
  modelsCount: string;
}

interface Subject {
  id: string;
  name: string;
  price: string;
  description: string;
  category: string;
  status: string; // active | disabled
  sortOrder: number;
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

export const PRICING_TABLE: Record<string, Record<string, Record<number, Record<number, number>>>> = {
  "2009": {
    black_white: {
      2: { 4: 3.5 },
      4: { 4: 5.5 },
      6: { 4: 7.5 },
      8: { 1: 3.5, 2: 5.5, 3: 7.5, 4: 8.5 },
      10: { 4: 9.5 }
    },
    color: {
      2: { 4: 4.5 },
      4: { 4: 7 },
      6: { 4: 9.5 },
      8: { 1: 4.5, 2: 7, 3: 9.5, 4: 11 },
      10: { 4: 13 }
    }
  },
  "BTEC": {
    black_white: {
      2: { 3: 3.5 },
      4: { 3: 5 },
      6: { 3: 6 },
      8: { 1: 3.5, 3: 7 }
    },
    color: {
      2: { 3: 4.5 },
      4: { 3: 6.5 },
      6: { 3: 8 },
      8: { 1: 4.5, 3: 9.5 }
    }
  },
  "2008": {
    black_white: {
      4: { 1: 2.5 },
      8: { 1: 4 },
      10: { 1: 5 }
    },
    color: {
      4: { 1: 3.5 },
      8: { 1: 5.5 },
      10: { 1: 7 }
    }
  }
};

const safeText = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  return String(value).trim();
};

const normalizeSubject = (subject: any): Subject => ({
  id: String(subject.id || ""),
  name: String(subject.name || ""),
  price: String(subject.price || ""),
  description: String(subject.description || ""),
  category: String(subject.category || ""),
  status: String(subject.status || "active"),
  sortOrder: Number(subject.sortOrder || 0)
});

// دالة تحليل اسم المادة لاستخراج العنوان وموعد التوصيل بشكل منفصل
const parseSubjectName = (subject: string) => {
  const match = subject.match(/(.+?)\s*\((.+?)\)/);
  if (match) {
    return {
      title: match[1].trim(),
      details: match[2].trim()
    };
  }
  return {
    title: subject,
    details: ''
  };
};

// دالة تصفية المواد حسب الجيل المختار للطلاب
const filterSubjectsByGeneration = (list: Subject[], gen: string): Subject[] => {
  if (!gen) return [];
  
  return list.filter(sub => {
    const name = sub.name.toLowerCase();
    const cat = sub.category.toLowerCase();
    
    if (gen.includes('2009')) {
      return cat.includes('2009') || name.includes('2009') || 
             sub.id === 'geography' || sub.id === 'psychology';
    }
    if (gen.includes('BTEC') || gen.includes('بيتيك')) {
      return cat.includes('btec') || name.includes('btec') || name.includes('بيتيك') ||
             sub.id === 'business-math';
    }
    if (gen.includes('2008')) {
      return cat.includes('2008') || name.includes('2008') ||
             sub.id === 'islamic-special-2008';
    }
    return false;
  });
};

export const getAvailableModelsCounts = (
  generation: string,
  subjectsCount: number,
  printType: string
): number[] => {
  if (!generation || subjectsCount <= 0 || !printType) return [];
  const genKey = generation.includes('2009') ? '2009' : (generation.includes('BTEC') || generation.includes('بيتيك') ? 'BTEC' : '2008');
  const printTypeTable = PRICING_TABLE[genKey]?.[printType];
  if (!printTypeTable) return [];
  
  return Object.keys(printTypeTable)
    .map(Number)
    .filter(modelsCount => {
      const modelsTable = printTypeTable[modelsCount];
      if (!modelsTable) return false;
      if (genKey === '2008') {
        return modelsTable[1] !== undefined;
      } else {
        return modelsTable[subjectsCount] !== undefined;
      }
    });
};

interface PricingResult {
  available: boolean;
  materialsPrice: number;
  deliveryFee: number;
  total: number;
  message: string;
}

export const calculatePricing = ({
  generation,
  subjectsCount,
  printType,
  modelsCount
}: {
  generation: string;
  subjectsCount: number;
  printType: string;
  modelsCount: number;
}): PricingResult => {
  if (!generation || subjectsCount <= 0 || !printType || !modelsCount) {
    return { available: false, materialsPrice: 0, deliveryFee: 0, total: 0, message: "يرجى اختيار المواد ونوع الطباعة وعدد النماذج." };
  }
  
  const genKey = generation.includes('2009') ? '2009' : (generation.includes('BTEC') || generation.includes('بيتيك') ? 'BTEC' : '2008');
  
  const printTypeTable = PRICING_TABLE[genKey]?.[printType];
  if (!printTypeTable) {
    return { available: false, materialsPrice: 0, deliveryFee: 0, total: 0, message: "خيارات الطباعة غير متوفرة." };
  }
  
  const modelsTable = printTypeTable[modelsCount];
  if (!modelsTable) {
    return { available: false, materialsPrice: 0, deliveryFee: 0, total: 0, message: "هذا العرض غير متوفر لهذا الجيل." };
  }
  
  let materialsPrice = 0;
  let available = false;
  
  if (genKey === '2008') {
    const pricePerSubject = modelsTable[1];
    if (pricePerSubject !== undefined) {
      materialsPrice = pricePerSubject * subjectsCount;
      available = true;
    }
  } else {
    const price = modelsTable[subjectsCount];
    if (price !== undefined) {
      materialsPrice = price;
      available = true;
    }
  }
  
  if (!available) {
    return {
      available: false,
      materialsPrice: 0,
      deliveryFee: 0,
      total: 0,
      message: "لا يوجد عرض متاح لهذا العدد من المواد، يرجى اختيار عدد مواد مختلف."
    };
  }
  
  const deliveryFee = 1.0;
  const total = materialsPrice + deliveryFee;
  
  return {
    available: true,
    materialsPrice,
    deliveryFee,
    total,
    message: ""
  };
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
    notes: '',
    printType: 'black_white', // القيمة الافتراضية
    modelsCount: ''
  });

  const [allSubjects, setAllSubjects] = useState<Subject[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [subjectsError, setSubjectsError] = useState('');

  const [errors, setErrors] = useState<Partial<Record<keyof FormState | 'api' | 'subjectsList', string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // جلب المواد من السيرفر عند التحميل
  useEffect(() => {
    const loadSubjects = async () => {
      try {
        const response = await fetch('/.netlify/functions/get-subjects');
        const result = await response.json();
        
        if (response.ok && result.success) {
          const normalized = (result.subjects || []).map(normalizeSubject);
          setAllSubjects(normalized);
        } else {
          setSubjectsError(result.message || 'تعذر تحميل المواد، يرجى تحديث الصفحة أو المحاولة لاحقًا.');
        }
      } catch (err) {
        setSubjectsError('تعذر تحميل المواد، يرجى تحديث الصفحة أو المحاولة لاحقًا.');
      } finally {
        setLoadingSubjects(false);
      }
    };
    loadSubjects();
  }, []);

  // تهيئة البيانات عند التعديل
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
        packagePrice: '',
        deliveryConfirm: safeText(initialData.deliveryConfirm),
        notes: safeText(initialData.notes),
        printType: safeText(initialData.printType) || 'black_white',
        modelsCount: safeText(initialData.modelsCount)
      });
    }
  }, [isEditMode, initialData]);

  // Refs للتحرك للأخطاء
  const cardRefs = {
    fullName: useRef<HTMLDivElement>(null),
    generation: useRef<HTMLDivElement>(null),
    governorate: useRef<HTMLDivElement>(null),
    address: useRef<HTMLDivElement>(null),
    mobilePhone: useRef<HTMLDivElement>(null),
    whatsappPhone: useRef<HTMLDivElement>(null),
    otherPhone: useRef<HTMLDivElement>(null),
    subjectsList: useRef<HTMLDivElement>(null),
    deliveryConfirm: useRef<HTMLDivElement>(null)
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name as keyof FormState]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleRadioSelect = (name: 'generation' | 'governorate' | 'deliveryConfirm' | 'printType' | 'modelsCount', value: string) => {
    if (name === 'generation') {
      // تفريغ المواد والخيارات والأسعار عند تغيير الجيل
      setFormData(prev => ({
        ...prev,
        generation: value,
        subjects: [],
        printType: 'black_white',
        modelsCount: ''
      }));
    } else if (name === 'printType') {
      setFormData(prev => {
        const availableCounts = getAvailableModelsCounts(prev.generation, prev.subjects.length, value);
        let nextModelsCount = prev.modelsCount;
        if (nextModelsCount && !availableCounts.includes(Number(nextModelsCount))) {
          nextModelsCount = '';
        }
        return {
          ...prev,
          printType: value,
          modelsCount: nextModelsCount
        };
      });
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    
    if (errors[name as keyof FormState]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleCheckboxSelect = (subjectName: string) => {
    setFormData(prev => {
      const isSelected = prev.subjects.includes(subjectName);
      let newSubjects: string[];
      if (isSelected) {
        newSubjects = prev.subjects.filter(s => s !== subjectName);
      } else {
        newSubjects = [...prev.subjects, subjectName];
      }

      // تصفية عدد النماذج المتوفرة للعدد الجديد من المواد
      const availableCounts = getAvailableModelsCounts(prev.generation, newSubjects.length, prev.printType);
      let nextModelsCount = prev.modelsCount;
      if (nextModelsCount && !availableCounts.includes(Number(nextModelsCount))) {
        nextModelsCount = '';
      }

      return {
        ...prev,
        subjects: newSubjects,
        modelsCount: nextModelsCount
      };
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

    if (formData.subjects.length === 0 && !safeText(formData.otherSubject)) {
      newErrors.subjectsList = 'يرجى اختيار مادة واحدة على الأقل أو كتابة مواد أخرى في الحقل المخصص';
    }

    if (formData.subjects.length > 0) {
      if (!formData.printType) {
        newErrors.printType = 'يرجى اختيار نوع الطباعة';
      }
      if (!formData.modelsCount) {
        newErrors.modelsCount = 'يرجى اختيار عدد النماذج المطلوبة';
      }
    }

    if (!formData.deliveryConfirm) {
      newErrors.deliveryConfirm = 'يرجى تأكيد قيمة التوصيل لإكمال الطلب';
    }

    setErrors(newErrors);

    const errorKeys = Object.keys(newErrors) as Array<keyof typeof cardRefs>;
    if (errorKeys.length > 0) {
      const firstErrorKey = errorKeys[0];
      const ref = cardRefs[firstErrorKey];
      if (ref && ref.current) {
        ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return false;
    }

    // التحقق من توافر عرض تسعير
    if (formData.subjects.length > 0) {
      const pricing = calculatePricing({
        generation: formData.generation,
        subjectsCount: formData.subjects.length,
        printType: formData.printType,
        modelsCount: Number(formData.modelsCount)
      });
      if (!pricing.available) {
        alert("لا يوجد عرض تسعير متاح للخيارات المحددة حالياً. يرجى تعديل عدد المواد أو اختيار خيارات متاحة.");
        return false;
      }
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
        notes: '',
        printType: 'black_white',
        modelsCount: ''
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

    const pricing = calculatePricing({
      generation: formData.generation,
      subjectsCount: formData.subjects.length,
      printType: formData.printType,
      modelsCount: Number(formData.modelsCount)
    });

    try {
      let response;
      
      if (isEditMode) {
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
        onSubmitSuccess(result.orderNumber, result.total || pricing.total);
      } else {
        throw new Error(result.message || 'فشل حفظ الطلب، يرجى المحاولة مرة أخرى.');
      }
    } catch (error: any) {
      console.error('Submission error:', error);
      setErrors(prev => ({
        ...prev,
        api: 'تعذر تسجيل الطلب، يرجى التحقق من اتصالك بالإنترنت ثم المحاولة مرة أخرى.'
      }));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // تصفية المواد حسب الجيل المختار
  const filteredSubjects = filterSubjectsByGeneration(allSubjects, formData.generation);

  // حساب أرقام النماذج المتوفرة للخيارات الحالية
  const availableCounts = getAvailableModelsCounts(
    formData.generation,
    formData.subjects.length,
    formData.printType
  );

  // حساب التسعير التلقائي الفوري للملخص
  const pricing = calculatePricing({
    generation: formData.generation,
    subjectsCount: formData.subjects.length,
    printType: formData.printType,
    modelsCount: Number(formData.modelsCount)
  });

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
          {['توجيهي 2009', 'بيتيك BTEC', 'توجيهي 2008'].map(option => (
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
        <label className="question-title required">المادة المطلوبة</label>
        <p className="question-description">يرجى اختيار مادة واحدة أو أكثر:</p>
        
        {!formData.generation ? (
          <div style={{ padding: '16px 0', color: 'var(--google-purple)', fontWeight: 600, textAlign: 'center' }}>
            ⚠️ يرجى اختيار الصف / الجيل أولاً لعرض المواد المتاحة.
          </div>
        ) : loadingSubjects ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
            <div className="google-spinner"></div>
          </div>
        ) : subjectsError ? (
          <div className="card-error-msg" style={{ margin: '8px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <AlertCircle size={16} />
            <span>{subjectsError}</span>
          </div>
        ) : filteredSubjects.length === 0 ? (
          <div style={{ padding: '16px 0', color: 'var(--text-muted)', textAlign: 'center' }}>
            لا توجد مواد متاحة حاليًا لهذا الجيل.
          </div>
        ) : (
          <div className="options-container" style={{ gap: '8px' }}>
            {filteredSubjects.map(subject => {
              const isSelected = formData.subjects.includes(subject.name);
              const isDisabled = subject.status === 'disabled';
              const { title, details } = parseSubjectName(subject.name);

              return (
                <div 
                  key={subject.id}
                  className={`option-row checkbox ${isSelected ? 'checked' : ''} ${(isSubmitting || isDisabled) ? 'disabled' : ''}`}
                  onClick={() => !isSubmitting && !isDisabled && handleCheckboxSelect(subject.name)}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 16px',
                    border: isSelected ? '1px solid var(--google-purple)' : '1px solid var(--border-color)',
                    backgroundColor: isSelected ? 'var(--google-purple-light)' : (isDisabled ? '#f5f5f5' : '#fff'),
                    opacity: isDisabled ? 0.65 : 1,
                    borderRadius: '6px',
                    transition: 'all 0.2s',
                    cursor: isDisabled ? 'not-allowed' : 'pointer'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexGrow: 1 }}>
                    <input 
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}}
                      className="option-input"
                      disabled={isSubmitting || isDisabled}
                    />
                    <div className="option-label" style={{ paddingRight: '28px' }}>
                      <div style={{ fontWeight: 600, color: isDisabled ? 'var(--text-muted)' : 'var(--text-color)' }}>
                        {title}
                        {isDisabled && <span style={{ marginRight: '8px', fontSize: '0.8rem', color: '#d93025', fontWeight: 700 }}>(انتهى التقديم)</span>}
                      </div>
                      {(subject.description || details) && (
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px', fontWeight: 400 }}>
                          {subject.description || details}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

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

      {/* خيارات الطباعة وعدد النماذج - تظهر بعد اختيار مادة واحدة على الأقل */}
      {formData.subjects.length > 0 && (
        <>
          {/* نوع الطباعة */}
          <div className="form-card">
            <span className="question-title required">نوع الطباعة</span>
            <div className="options-container">
              {[
                { key: 'black_white', label: 'أبيض وأسود' },
                { key: 'color', label: 'ملون' }
              ].map(option => (
                <div 
                  key={option.key} 
                  className={`option-row radio ${formData.printType === option.key ? 'checked' : ''} ${isSubmitting ? 'disabled' : ''}`}
                  onClick={() => !isSubmitting && handleRadioSelect('printType', option.key)}
                >
                  <input 
                    type="radio" 
                    name="printType" 
                    value={option.key} 
                    checked={formData.printType === option.key} 
                    onChange={() => {}}
                    className="option-input"
                    disabled={isSubmitting}
                  />
                  <span className="option-label">{option.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* عدد النماذج لكل مادة */}
          <div className="form-card">
            <span className="question-title required">عدد النماذج لكل مادة</span>
            <p className="question-description">الخيارات المتاحة لعدد المواد المختار:</p>
            
            {availableCounts.length === 0 ? (
              <div style={{ color: '#d93025', fontWeight: 600, padding: '8px 0', fontSize: '0.92rem' }}>
                ⚠️ لا يوجد عرض متاح لهذا العدد من المواد، يرجى اختيار عدد مواد مختلف.
              </div>
            ) : (
              <div className="options-container">
                {availableCounts.map(count => (
                  <div 
                    key={count} 
                    className={`option-row radio ${formData.modelsCount === String(count) ? 'checked' : ''} ${isSubmitting ? 'disabled' : ''}`}
                    onClick={() => !isSubmitting && handleRadioSelect('modelsCount', String(count))}
                  >
                    <input 
                      type="radio" 
                      name="modelsCount" 
                      value={String(count)} 
                      checked={formData.modelsCount === String(count)} 
                      onChange={() => {}}
                      className="option-input"
                      disabled={isSubmitting}
                    />
                    <span className="option-label">{count} نماذج</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

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

      {/* بطاقة ملخص السعر التلقائي للفاتورة */}
      {pricing.available && (
        <div className="form-card" style={{ borderTop: '5px solid var(--google-purple)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Receipt size={20} style={{ color: 'var(--google-purple)' }} />
            <span className="question-title" style={{ margin: 0 }}>ملخص الطلب:</span>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.95rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #eee', paddingBottom: '6px' }}>
              <span style={{ color: 'var(--text-muted)' }}>الجيل:</span>
              <span style={{ fontWeight: 700 }}>{formData.generation}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #eee', paddingBottom: '6px' }}>
              <span style={{ color: 'var(--text-muted)' }}>عدد المواد:</span>
              <span style={{ fontWeight: 700 }}>{formData.subjects.length} مواد</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #eee', paddingBottom: '6px' }}>
              <span style={{ color: 'var(--text-muted)' }}>عدد النماذج لكل مادة:</span>
              <span style={{ fontWeight: 700 }}>{formData.modelsCount} نماذج</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #eee', paddingBottom: '6px' }}>
              <span style={{ color: 'var(--text-muted)' }}>نوع الطباعة:</span>
              <span style={{ fontWeight: 700 }}>{formData.printType === 'black_white' ? 'أبيض وأسود' : 'ملون'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
              <span style={{ color: 'var(--text-muted)' }}>سعر المواد:</span>
              <span style={{ fontWeight: 700, color: 'var(--google-purple)' }}>{pricing.materialsPrice.toFixed(2)} JD</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #ddd', paddingBottom: '8px' }}>
              <span style={{ color: 'var(--text-muted)' }}>التوصيل:</span>
              <span style={{ fontWeight: 700 }}>{pricing.deliveryFee.toFixed(2)} JD</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', fontWeight: 800, marginTop: '4px' }}>
              <span style={{ color: 'var(--text-color)' }}>الإجمالي المطلوب:</span>
              <span style={{ color: 'var(--google-purple)' }}>{pricing.total.toFixed(2)} JD</span>
            </div>
          </div>
        </div>
      )}

      {/* تنبيه قبل الإرسال */}
      <div className="warning-box">
        <span className="warning-title">⚠️ ملاحظة</span>
        <span className="warning-item">
          <span>⭕</span>
          <span>سيتم إرسال وتوصيل كل مادة على حدة قبل موعد الامتحان.</span>
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
          disabled={isSubmitting || loadingSubjects || (formData.subjects.length > 0 && !pricing.available)}
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
