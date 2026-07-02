import React, { useState, useEffect } from 'react';
import { AlertCircle, ArrowLeft, ArrowRight, Receipt, Check } from 'lucide-react';

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
      message: "لا يوجد عرض متاح لهذا الاختيار، يرجى تعديل عدد المواد أو عدد النماذج."
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
  const [step, setStep] = useState<number>(1);
  const [sameWhatsapp, setSameWhatsapp] = useState<boolean>(false);

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
    printType: '', 
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
        const response = await fetch('/api/get-subjects');
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
      const mob = safeText(initialData.mobilePhone);
      const wa = safeText(initialData.whatsappPhone);
      setFormData({
        fullName: safeText(initialData.fullName),
        generation: safeText(initialData.generation),
        governorate: safeText(initialData.governorate),
        address: safeText(initialData.address),
        mobilePhone: mob,
        whatsappPhone: wa,
        otherPhone: safeText(initialData.otherPhone),
        subjects: Array.isArray(initialData.subjects) ? initialData.subjects : [],
        otherSubject: safeText(initialData.otherSubject),
        packagePrice: '',
        deliveryConfirm: safeText(initialData.deliveryConfirm),
        notes: safeText(initialData.notes),
        printType: safeText(initialData.printType),
        modelsCount: safeText(initialData.modelsCount)
      });
      if (mob && mob === wa) {
        setSameWhatsapp(true);
      }
    }
  }, [isEditMode, initialData]);

  // مزامنة الواتساب إذا تم تحديد خيار التطابق
  useEffect(() => {
    if (sameWhatsapp) {
      setFormData(prev => ({ ...prev, whatsappPhone: prev.mobilePhone }));
    }
  }, [formData.mobilePhone, sameWhatsapp]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name as keyof FormState]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleRadioSelect = (name: 'generation' | 'governorate' | 'deliveryConfirm' | 'printType' | 'modelsCount', value: string) => {
    if (name === 'generation') {
      setFormData(prev => ({
        ...prev,
        generation: value,
        subjects: [],
        printType: '',
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

  // التحقق للخطوة 1
  const validateStep1 = (): boolean => {
    const newErrors: Partial<Record<keyof FormState | 'subjectsList', string>> = {};
    if (!formData.generation) newErrors.generation = 'يرجى اختيار الصف / الجيل';
    if (formData.subjects.length === 0 && !safeText(formData.otherSubject)) {
      newErrors.subjectsList = 'يرجى اختيار مادة واحدة على الأقل';
    }
    if (formData.subjects.length > 0) {
      if (!formData.printType) newErrors.printType = 'يرجى تحديد نوع الطباعة';
      if (!formData.modelsCount) newErrors.modelsCount = 'يرجى تحديد عدد النماذج';
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return false;

    // التأكد من توفر عرض تسعير
    if (formData.subjects.length > 0) {
      const pricing = calculatePricing({
        generation: formData.generation,
        subjectsCount: formData.subjects.length,
        printType: formData.printType,
        modelsCount: Number(formData.modelsCount)
      });
      return pricing.available;
    }
    return true;
  };

  // التحقق للخطوة 2
  const validateStep2 = (): boolean => {
    const newErrors: Partial<Record<keyof FormState, string>> = {};
    if (!formData.governorate) newErrors.governorate = 'هذا الحقل مطلوب';
    if (!safeText(formData.address)) newErrors.address = 'يرجى إدخال المنطقة والعنوان بالتفصيل';
    if (!formData.deliveryConfirm) newErrors.deliveryConfirm = 'يرجى تأكيد سعر التوصيل';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // التحقق للخطوة 3
  const validateStep3 = (): boolean => {
    const newErrors: Partial<Record<keyof FormState, string>> = {};
    if (!safeText(formData.fullName)) newErrors.fullName = 'يرجى كتابة الاسم الكامل';
    
    const phoneRegex = /^07[789]\d{7}$/;
    const cleanedMobile = safeText(formData.mobilePhone);
    const cleanedWhatsapp = safeText(formData.whatsappPhone);
    const cleanedOther = safeText(formData.otherPhone);

    if (!cleanedMobile) {
      newErrors.mobilePhone = 'هذا الحقل مطلوب';
    } else if (!phoneRegex.test(cleanedMobile)) {
      newErrors.mobilePhone = 'رقم هاتف غير صحيح (مثال: 0791234567)';
    }

    if (!sameWhatsapp) {
      if (!cleanedWhatsapp) {
        newErrors.whatsappPhone = 'هذا الحقل مطلوب';
      } else if (!phoneRegex.test(cleanedWhatsapp)) {
        newErrors.whatsappPhone = 'رقم واتساب غير صحيح (مثال: 0791234567)';
      }
    }

    if (!cleanedOther) {
      newErrors.otherPhone = 'يرجى إدخال هاتف بديل للطوارئ';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
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
        printType: '',
        modelsCount: ''
      });
      setErrors({});
      setStep(1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleNextStep = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (step === 2 && validateStep2()) {
      setStep(3);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrevStep = () => {
    if (step > 1) {
      setStep(step - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateStep3()) {
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
        response = await fetch('/api/update-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderNumber: orderNumber,
            phone: editPhone,
            data: formData
          }),
        });
      } else {
        response = await fetch('/api/submit-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
      }

      if (!response.ok) {
        throw new Error(`فشل الاتصال بالخادم. رمز الحالة: ${response.status}`);
      }

      const result = await response.json();

      if (result.success && result.orderNumber) {
        onSubmitSuccess(result.orderNumber, result.pricing?.total || pricing.total);
      } else {
        throw new Error(result.message || 'فشل حفظ الطلب، يرجى المحاولة مرة أخرى.');
      }
    } catch (error: any) {
      console.error('Submission error:', error);
      setErrors(prev => ({
        ...prev,
        api: 'تعذر تسجيل الطلب، يرجى التحقق من اتصالك بالإنترنت ثم المحاولة مرة أخرى.'
      }));
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
    <div className={`form-container ${pricing.available ? 'has-sticky-bar' : ''}`}>
      
      {/* شريط تقدم الخطوات (Stepped Progress Bar) للمكتب/الشاشات الكبيرة */}
      <div className="wizard-progress">
        {[
          { num: 1, label: 'الامتحانات 📚' },
          { num: 2, label: 'بيانات التوصيل 📍' },
          { num: 3, label: 'التأكيد والإرسال 📞' }
        ].map(item => (
          <div 
            key={item.num} 
            className={`wizard-step ${step === item.num ? 'active' : step > item.num ? 'completed' : ''}`}
          >
            <div className="wizard-step-circle">
              {step > item.num ? <Check size={16} /> : item.num}
            </div>
            <span className="wizard-step-label">{item.label}</span>
          </div>
        ))}
      </div>

      {/* شريط حالة الخطوة للهواتف المحمولة */}
      <div className="wizard-mobile-status">
        <span className="wizard-mobile-status-text">
          {step === 1 && 'اختر الامتحانات المطلوبة 📚'}
          {step === 2 && 'بيانات التوصيل 📍'}
          {step === 3 && 'بيانات التواصل وتأكيد الطلب 📞'}
        </span>
        <span className="wizard-mobile-status-step">الخطوة {step} من 3</span>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        
        {errors.api && (
          <div className="global-error-alert" style={{ marginBottom: '12px' }}>
            <AlertCircle size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>{errors.api}</span>
          </div>
        )}

        {isEditMode && (
          <div className="form-card" style={{ borderTop: '5px solid var(--google-purple)', padding: '16px 24px', marginBottom: '12px' }}>
            <span className="question-title" style={{ color: 'var(--google-purple)', margin: 0 }}>
              أنت الآن تعدّل الطلب رقم: <strong>{orderNumber}</strong>
            </span>
          </div>
        )}

        {/* ========================================================
            الخطوة 1: اختيار الامتحانات
            ======================================================== */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            
            {/* اختيار الجيل */}
            <div className={`form-card ${errors.generation ? 'error-state' : ''}`}>
              <span className="question-title required">الصف / الجيل</span>
              <div className="selection-cards-grid">
                {[
                  { id: 'توجيهي 2009', label: 'توجيهي 2009', desc: 'باقة لطلاب جيل 2009' },
                  { id: 'بيتيك BTEC', label: 'بيتيك BTEC', desc: 'باقة لطلاب البيتك والمواد المهنية' },
                  { id: 'توجيهي 2008', label: 'توجيهي 2008', desc: 'باقة لطلاب المعيدين جيل 2008' }
                ].map(gen => (
                  <div 
                    key={gen.id} 
                    className={`large-selection-card ${formData.generation === gen.id ? 'selected' : ''}`}
                    onClick={() => handleRadioSelect('generation', gen.id)}
                  >
                    <span className="large-selection-card-title">{gen.label}</span>
                    <span className="large-selection-card-desc">{gen.desc}</span>
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

            {/* المواد المطلوبة */}
            <div className={`form-card ${errors.subjectsList ? 'error-state' : ''}`}>
              <span className="question-title required">المواد المطلوبة</span>
              <p className="question-description">يرجى اختيار مادة واحدة أو أكثر:</p>
              
              {!formData.generation ? (
                <div style={{ padding: '24px 0', color: 'var(--google-purple)', fontWeight: 600, textAlign: 'center' }}>
                  ⚠️ يرجى اختيار الصف / الجيل أولاً لعرض المواد المتاحة.
                </div>
              ) : loadingSubjects ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
                  <div className="google-spinner" style={{ borderColor: 'var(--google-purple)', borderTopColor: 'transparent' }}></div>
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
                        className={`option-row checkbox ${isSelected ? 'checked' : ''} ${isDisabled ? 'disabled' : ''}`}
                        onClick={() => !isDisabled && handleCheckboxSelect(subject.name)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '14px 16px',
                          border: isSelected ? '1px solid var(--google-purple)' : '1px solid var(--border-color)',
                          backgroundColor: isSelected ? 'var(--google-purple-light)' : (isDisabled ? '#f5f5f5' : '#fff'),
                          opacity: isDisabled ? 0.65 : 1,
                          borderRadius: '6px',
                          transition: 'all 0.2s',
                          cursor: isDisabled ? 'not-allowed' : 'pointer'
                        }}
                      >
                        <input 
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="option-input"
                          disabled={isDisabled}
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
                />
              </div>

              {errors.subjectsList && (
                <div className="card-error-msg">
                  <AlertCircle size={14} />
                  <span>{errors.subjectsList}</span>
                </div>
              )}
            </div>

            {/* نوع الطباعة */}
            {formData.subjects.length > 0 && (
              <div className={`form-card ${errors.printType ? 'error-state' : ''}`}>
                <span className="question-title required">نوع الطباعة</span>
                <div className="selection-cards-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                  {[
                    { key: 'black_white', label: 'أبيض وأسود', desc: 'طباعة كلاسيكية واضحة' },
                    { key: 'color', label: 'ملون 🌈', desc: 'ألوان كاملة ممتازة' }
                  ].map(option => (
                    <div 
                      key={option.key} 
                      className={`large-selection-card ${formData.printType === option.key ? 'selected' : ''}`}
                      onClick={() => handleRadioSelect('printType', option.key)}
                    >
                      <span className="large-selection-card-title">{option.label}</span>
                      <span className="large-selection-card-desc">{option.desc}</span>
                    </div>
                  ))}
                </div>
                {errors.printType && (
                  <div className="card-error-msg">
                    <AlertCircle size={14} />
                    <span>{errors.printType}</span>
                  </div>
                )}
              </div>
            )}

            {/* عدد النماذج لكل مادة */}
            {formData.subjects.length > 0 && formData.printType && (
              <div className={`form-card ${errors.modelsCount ? 'error-state' : ''}`}>
                <span className="question-title required">عدد النماذج لكل مادة</span>
                <p className="question-description">الخيارات المتاحة للخيارات المختارة:</p>
                
                {availableCounts.length === 0 ? (
                  <div style={{ color: '#d93025', fontWeight: 600, padding: '8px 0', fontSize: '0.92rem' }}>
                    {formData.generation.includes('BTEC') && formData.subjects.length === 2 ? (
                      '⚠️ لا يوجد عرض متاح لمادتين في بيتيك، يرجى اختيار مادة واحدة أو ثلاث مواد.'
                    ) : (
                      '⚠️ لا يوجد عرض متاح لهذا العدد من المواد، يرجى اختيار عدد مواد مختلف.'
                    )}
                  </div>
                ) : (
                  <div className="options-container">
                    {availableCounts.map(count => (
                      <div 
                        key={count} 
                        className={`option-row radio ${formData.modelsCount === String(count) ? 'checked' : ''}`}
                        onClick={() => handleRadioSelect('modelsCount', String(count))}
                      >
                        <input 
                          type="radio" 
                          name="modelsCount" 
                          value={String(count)} 
                          checked={formData.modelsCount === String(count)} 
                          onChange={() => {}}
                          className="option-input"
                        />
                        <span className="option-label">{count} نماذج</span>
                      </div>
                    ))}
                  </div>
                )}
                {errors.modelsCount && (
                  <div className="card-error-msg">
                    <AlertCircle size={14} />
                    <span>{errors.modelsCount}</span>
                  </div>
                )}
              </div>
            )}

            {/* عرض رسالة إذا كانت التوليفة غير متاحة */}
            {formData.subjects.length > 0 && formData.printType && formData.modelsCount && !pricing.available && (
              <div className="form-card" style={{ borderTop: '5px solid #d93025' }}>
                <div style={{ color: '#d93025', fontWeight: 600, padding: '8px 0', fontSize: '0.92rem' }}>
                  ⚠️ لا يوجد عرض متاح لهذا الاختيار، يرجى تعديل عدد المواد أو عدد النماذج.
                </div>
              </div>
            )}

            {/* ملخص السعر في خطوة 1 */}
            {pricing.available && (
              <div className="form-card" style={{ borderTop: '5px solid var(--google-purple)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <Receipt size={18} style={{ color: 'var(--google-purple)' }} />
                  <span className="question-title" style={{ margin: 0 }}>ملخص الفاتورة التقديري:</span>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.9rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>سعر المواد:</span>
                    <span style={{ fontWeight: 700 }}>{pricing.materialsPrice.toFixed(2)} JD</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>سعر التوصيل:</span>
                    <span style={{ fontWeight: 700 }}>{pricing.deliveryFee.toFixed(2)} JD</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #eee', paddingTop: '8px', fontSize: '1rem', fontWeight: 800 }}>
                    <span>المجموع الإجمالي:</span>
                    <span style={{ color: 'var(--google-purple)' }}>{pricing.total.toFixed(2)} JD</span>
                  </div>
                </div>
              </div>
            )}

            {/* زر الانتقال لـ 2 */}
            <div className="footer-row" style={{ gap: '12px' }}>
              <button 
                type="button" 
                onClick={isEditMode ? onBack : handleFormReset} 
                className="clear-form-link"
                style={{ flex: 1, border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
              >
                <span>{isEditMode ? 'إلغاء التعديل' : 'إخلاء النموذج'}</span>
              </button>
              
              <button 
                type="button" 
                onClick={handleNextStep} 
                className="btn-submit-google"
                disabled={!pricing.available}
                style={{ flex: 2, justifyContent: 'center', margin: 0 }}
              >
                <span>متابعة لبيانات التوصيل 🚚</span>
                <ArrowRight size={18} />
              </button>
            </div>

          </div>
        )}

        {/* ========================================================
            الخطوة 2: بيانات التوصيل
            ======================================================== */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            
            {/* المحافظة */}
            <div className={`form-card ${errors.governorate ? 'error-state' : ''}`}>
              <label htmlFor="gov" className="question-title required">المحافظة</label>
              <div style={{ marginTop: '12px' }}>
                <select
                  id="gov"
                  name="governorate"
                  value={formData.governorate}
                  onChange={handleInputChange}
                  className="input-select-field"
                  style={{ maxWidth: '100%' }}
                >
                  <option value="">اختيار المحافظة</option>
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

            {/* العنوان التفصيلي */}
            <div className={`form-card ${errors.address ? 'error-state' : ''}`}>
              <label htmlFor="addr" className="question-title required">المنطقة / العنوان التفصيلي</label>
              <p className="question-description">يرجى كتابة اسم المنطقة والشارع أو المعلم المقابل لضمان سرعة الوصول</p>
              <input
                id="addr"
                type="text"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                placeholder="مثال: ضاحية الياسمين، شارع المطار، بجانب سوبرماركت..."
                className="input-text-field"
              />
              {errors.address && (
                <div className="card-error-msg">
                  <AlertCircle size={14} />
                  <span>{errors.address}</span>
                </div>
              )}
            </div>

            {/* بطاقة تأكيد سعر التوصيل */}
            <div className={`form-card ${errors.deliveryConfirm ? 'error-state' : ''}`} style={{ borderLeft: '5px solid var(--google-purple)' }}>
              <span className="question-title required">تأكيد سعر التوصيل (1 JD)</span>
              <p className="question-description">توصيل الباقة إلى باب بيتك بقيمة دينار واحد فقط لكافة المحافظات.</p>
              <div className="options-container">
                <div 
                  className={`option-row radio ${formData.deliveryConfirm === 'تم ✅' ? 'checked' : ''}`}
                  onClick={() => handleRadioSelect('deliveryConfirm', 'تم ✅')}
                >
                  <input 
                    type="radio" 
                    name="deliveryConfirm" 
                    value="تم ✅" 
                    checked={formData.deliveryConfirm === 'تم ✅'} 
                    onChange={() => {}}
                    className="option-input"
                  />
                  <span className="option-label">تأكيد التوصيل (تم ✅)</span>
                </div>
              </div>
              {errors.deliveryConfirm && (
                <div className="card-error-msg">
                  <AlertCircle size={14} />
                  <span>{errors.deliveryConfirm}</span>
                </div>
              )}
            </div>

            {/* أزرار خطوة 2 */}
            <div className="footer-row" style={{ gap: '12px' }}>
              <button 
                type="button" 
                onClick={handlePrevStep} 
                className="clear-form-link"
                style={{ flex: 1, border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}
              >
                <ArrowLeft size={16} />
                <span>تعديل الامتحانات</span>
              </button>
              
              <button 
                type="button" 
                onClick={handleNextStep} 
                className="btn-submit-google"
                style={{ flex: 2, justifyContent: 'center', margin: 0 }}
                disabled={!formData.governorate || !safeText(formData.address) || !formData.deliveryConfirm}
              >
                <span>متابعة لبيانات التواصل 📞</span>
                <ArrowRight size={18} />
              </button>
            </div>

          </div>
        )}

        {/* ========================================================
            الخطوة 3: بيانات التواصل وتأكيد الطلب
            ======================================================== */}
        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            
            {/* الاسم الكامل */}
            <div className={`form-card ${errors.fullName ? 'error-state' : ''}`}>
              <label htmlFor="fullname" className="question-title required">الاسم الكامل للطالب</label>
              <input
                id="fullname"
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleInputChange}
                placeholder="الاسم الثلاثي أو الرباعي"
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

            {/* رقم الموبايل للتواصل */}
            <div className={`form-card ${errors.mobilePhone ? 'error-state' : ''}`}>
              <label htmlFor="mob-phone" className="question-title required">رقم موبايل للتواصل</label>
              <p className="question-description">سيتصل بك مندوب التوصيل على هذا الرقم</p>
              <input
                id="mob-phone"
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

            {/* رقم الواتساب وتحديد التطابق */}
            <div className={`form-card ${errors.whatsappPhone ? 'error-state' : ''}`}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label htmlFor="wa-phone" className="question-title required" style={{ margin: 0 }}>رقم واتساب للتواصل</label>
                
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', color: 'var(--google-purple)', fontWeight: 700, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={sameWhatsapp}
                    onChange={(e) => setSameWhatsapp(e.target.checked)}
                    style={{ cursor: 'pointer' }}
                  />
                  <span>نفس رقم الموبايل</span>
                </label>
              </div>

              {!sameWhatsapp ? (
                <input
                  id="wa-phone"
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
              ) : (
                <div style={{ padding: '10px 12px', backgroundColor: '#f9f9f9', borderRadius: '4px', fontSize: '0.9rem', color: 'var(--text-muted)', direction: 'ltr', textAlign: 'right' }}>
                  {formData.mobilePhone || 'لم يتم إدخال رقم الموبايل بعد'}
                </div>
              )}

              {errors.whatsappPhone && !sameWhatsapp && (
                <div className="card-error-msg">
                  <AlertCircle size={14} />
                  <span>{errors.whatsappPhone}</span>
                </div>
              )}
            </div>

            {/* رقم هاتف بديل للطوارئ */}
            <div className={`form-card ${errors.otherPhone ? 'error-state' : ''}`}>
              <label htmlFor="alt-phone" className="question-title required">رقم هاتف بديل (عند عدم الرد)</label>
              <p className="question-description">رقم هاتف الأب أو الأم أو رقم آخر احتياطي</p>
              <input
                id="alt-phone"
                type="tel"
                name="otherPhone"
                value={formData.otherPhone}
                onChange={handleInputChange}
                placeholder="رقم هاتف بديل للتواصل الفوري"
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

            {/* ملاحظات أخرى */}
            <div className="form-card">
              <label htmlFor="usr-notes" className="question-title">ملاحظات أخرى</label>
              <textarea
                id="usr-notes"
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                placeholder="أي ملاحظات إضافية تخص التوصيل أو المواد..."
                className="input-textarea-field"
                disabled={isSubmitting}
              />
            </div>

            {/* مراجعة الطلب قبل الإرسال (Order Review Card) */}
            <div className="form-card" style={{ border: '2px solid var(--google-purple)', backgroundColor: '#faf9fc' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <Receipt size={20} style={{ color: 'var(--google-purple)' }} />
                <span className="question-title" style={{ margin: 0, fontWeight: 800 }}>راجع طلبك قبل الإرسال 📋</span>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.9rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eee', paddingBottom: '6px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>الاسم:</span>
                  <span style={{ fontWeight: 700 }}>{formData.fullName || '—'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eee', paddingBottom: '6px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>الجيل / الصف:</span>
                  <span style={{ fontWeight: 700 }}>{formData.generation}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', borderBottom: '1px solid #eee', paddingBottom: '6px', gap: '2px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>المواد المطلوبة:</span>
                  <span style={{ fontWeight: 700, color: 'var(--text-color)' }}>{formData.subjects.join(', ') || '—'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eee', paddingBottom: '6px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>نوع الطباعة:</span>
                  <span style={{ fontWeight: 700 }}>{formData.printType === 'black_white' ? 'أبيض وأسود' : 'ملون'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eee', paddingBottom: '6px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>عدد النماذج:</span>
                  <span style={{ fontWeight: 700 }}>{formData.modelsCount} نماذج</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eee', paddingBottom: '6px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>العنوان:</span>
                  <span style={{ fontWeight: 700 }}>{formData.governorate} — {formData.address || '—'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #ccc', paddingBottom: '6px', marginTop: '4px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>سعر المواد:</span>
                  <span style={{ fontWeight: 700 }}>{pricing.materialsPrice.toFixed(2)} JD</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #ccc', paddingBottom: '6px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>التوصيل:</span>
                  <span style={{ fontWeight: 700 }}>{pricing.deliveryFee.toFixed(2)} JD</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.05rem', fontWeight: 800, marginTop: '4px' }}>
                  <span>الإجمالي النهائي:</span>
                  <span style={{ color: 'var(--google-purple)', fontSize: '1.2rem' }}>{pricing.total.toFixed(2)} JD</span>
                </div>
              </div>
            </div>

            {/* تنبيه نهائي */}
            <div className="warning-box">
              <span className="warning-title">⚠️ تأكيد أخير</span>
              <span className="warning-item">
                <span>⭕</span>
                <span>تأكد من صحة أرقام الهواتف المدخلة ليتواصل معك المندوب بشكل سليم.</span>
              </span>
            </div>

            {/* أزرار خطوة 3 */}
            <div className="footer-row" style={{ gap: '12px' }}>
              <button 
                type="button" 
                onClick={handlePrevStep} 
                className="clear-form-link"
                style={{ flex: 1, border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}
                disabled={isSubmitting}
              >
                <ArrowLeft size={16} />
                <span>تعديل العنوان</span>
              </button>
              
              <button 
                type="submit" 
                className="btn-submit-google"
                style={{ flex: 2, justifyContent: 'center', margin: 0 }}
                disabled={isSubmitting || !formData.fullName || !formData.mobilePhone || (!sameWhatsapp && !formData.whatsappPhone) || !formData.otherPhone}
              >
                {isSubmitting ? (
                  <>
                    <div className="google-spinner"></div>
                    <span>جاري إرسال الطلب...</span>
                  </>
                ) : (
                  <>
                    <span>تأكيد وإرسال الطلب VIP 🥇</span>
                  </>
                )}
              </button>
            </div>

          </div>
        )}

      </form>

      {/* شريط الإجمالي الثابت بالأسفل للهواتف المحمولة */}
      {pricing.available && !isSubmitting && (
        <div className="sticky-bottom-bar">
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span className="sticky-bar-price-label">المبلغ الإجمالي المطلوب</span>
            <span className="sticky-bar-price-value">{pricing.total.toFixed(2)} JD</span>
          </div>

          {step === 1 && (
            <button 
              type="button" 
              onClick={handleNextStep} 
              className="sticky-bar-btn"
              disabled={!pricing.available}
            >
              متابعة
            </button>
          )}

          {step === 2 && (
            <button 
              type="button" 
              onClick={handleNextStep} 
              className="sticky-bar-btn"
              disabled={!formData.governorate || !safeText(formData.address) || !formData.deliveryConfirm}
            >
              متابعة
            </button>
          )}

          {step === 3 && (
            <button 
              type="button" 
              onClick={handleSubmit} 
              className="sticky-bar-btn"
              style={{ backgroundColor: 'var(--success-color)' }}
              disabled={isSubmitting || !formData.fullName || !formData.mobilePhone || (!sameWhatsapp && !formData.whatsappPhone) || !formData.otherPhone}
            >
              تأكيد وإرسال
            </button>
          )}
        </div>
      )}

    </div>
  );
};
