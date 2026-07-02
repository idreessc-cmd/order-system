import React, { useState, useEffect } from 'react';
import { LogIn, Plus, Edit2, EyeOff, CheckCircle, XCircle, ShieldAlert, LogOut, AlertCircle } from 'lucide-react';

interface Subject {
  id: string;
  name: string;
  price: string;
  description: string;
  category: string;
  status: string; // active | disabled | hidden
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

interface PricingRule {
  category: string;
  printType: string;
  modelsCount: number;
  subjectsCount: number;
  price: number;
  status: string; // active | disabled
  updatedAt?: string;
}

interface AdminPanelProps {
  onBackToApp: () => void;
}

const formatPrice = (price: unknown): string => {
  if (price === null || price === undefined) return "";

  const cleaned = String(price)
    .replace("JD", "")
    .replace("دينار", "")
    .trim();

  if (!cleaned) return "";

  const numericPrice = Number(cleaned);

  if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
    return "";
  }

  return `${numericPrice.toFixed(2).replace(/\.?0+$/, "")} JD`;
};

const normalizeSubject = (subject: any): Subject => ({
  id: String(subject.id || ""),
  name: String(subject.name || ""),
  price: String(subject.price || ""),
  description: String(subject.description || ""),
  category: String(subject.category || ""),
  status: String(subject.status || "active"),
  sortOrder: Number(subject.sortOrder || 0),
  createdAt: String(subject.createdAt || ""),
  updatedAt: String(subject.updatedAt || "")
});

const normalizePricingRule = (rule: any): PricingRule => ({
  category: String(rule.category || ""),
  printType: String(rule.printType || ""),
  modelsCount: Number(rule.modelsCount || 0),
  subjectsCount: Number(rule.subjectsCount || 0),
  price: Number(rule.price || 0),
  status: String(rule.status || "active"),
  updatedAt: String(rule.updatedAt || "")
});

export const AdminPanel: React.FC<AdminPanelProps> = ({ onBackToApp }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [token, setToken] = useState('');
  
  // Tabs State
  const [activeTab, setActiveTab] = useState<'subjects' | 'pricing'>('subjects');

  // Subjects state
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loginError, setLoginError] = useState('');

  // Subject Modal State
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [subjectModalMode, setSubjectModalMode] = useState<'add' | 'edit'>('add');
  const [currentSubject, setCurrentSubject] = useState<Partial<Subject>>({
    id: '',
    name: '',
    price: '',
    description: '',
    category: '2009',
    status: 'active',
    sortOrder: 1
  });
  const [subjectModalError, setSubjectModalError] = useState('');
  const [savingSubject, setSavingSubject] = useState(false);

  // Pricing state
  const [pricingRules, setPricingRules] = useState<PricingRule[]>([]);
  const [loadingPricing, setLoadingPricing] = useState(false);

  // Pricing Modal State
  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);
  const [pricingModalMode, setPricingModalMode] = useState<'add' | 'edit'>('add');
  const [currentPricing, setCurrentPricing] = useState<Partial<PricingRule>>({
    category: '2009',
    printType: 'black_white',
    modelsCount: 2,
    subjectsCount: 1,
    price: 3.5,
    status: 'active'
  });
  const [pricingModalError, setPricingModalError] = useState('');
  const [savingPricing, setSavingPricing] = useState(false);

  // Check if token exists in localStorage on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('adminToken');
    if (savedToken) {
      setToken(savedToken);
      setIsAuthenticated(true);
    }
  }, []);

  // Fetch data once authenticated
  useEffect(() => {
    if (isAuthenticated && token) {
      if (activeTab === 'subjects') {
        fetchSubjects();
      } else {
        fetchPricingRules();
      }
    }
  }, [isAuthenticated, token, activeTab]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoading(true);

    try {
      const response = await fetch('/api/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });

      const result = await response.json();

      if (response.ok && result.success && result.token) {
        localStorage.setItem('adminToken', result.token);
        setToken(result.token);
        setIsAuthenticated(true);
      } else {
        setLoginError(result.message || 'فشل تسجيل الدخول، يرجى المحاولة مرة أخرى.');
      }
    } catch (err) {
      setLoginError('تعذر الاتصال بالسيرفر للتحقق من كلمة المرور.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    setToken('');
    setIsAuthenticated(false);
    setSubjects([]);
    setPricingRules([]);
  };

  /* ========================================================
     Subjects Functions
     ======================================================== */

  const fetchSubjects = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/admin-get-subjects', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json();

      if (response.ok && result.success) {
        const normalized = (result.subjects || []).map(normalizeSubject);
        setSubjects(normalized);
      } else {
        if (response.status === 401) {
          handleLogout();
        }
        setError(result.message || 'فشل جلب المواد من السيرفر.');
      }
    } catch (err) {
      setError('فشل تحميل المواد، يرجى التحقق من اتصال الإنترنت.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubjectModalError('');

    if (!currentSubject.name || !currentSubject.category || !currentSubject.status) {
      setSubjectModalError('الاسم والتصنيف والحالة حقول مطلوبة.');
      return;
    }

    setSavingSubject(true);
    try {
      const response = await fetch('/api/admin-save-subject', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(currentSubject)
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setIsSubjectModalOpen(false);
        fetchSubjects();
      } else {
        setSubjectModalError(result.message || 'فشل حفظ المادة.');
      }
    } catch (err) {
      setSubjectModalError('تعذر الاتصال بالسيرفر لحفظ التعديلات.');
    } finally {
      setSavingSubject(false);
    }
  };

  const handleToggleSubjectStatus = async (subject: Subject, newStatus: string) => {
    try {
      const response = await fetch('/api/admin-save-subject', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...subject,
          status: newStatus
        })
      });

      if (response.ok) {
        fetchSubjects();
      } else {
        alert('فشل تحديث حالة المادة.');
      }
    } catch (err) {
      alert('فشل الاتصال لتحديث الحالة.');
    }
  };

  const handleDeleteSubject = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من رغبتك في إخفاء هذه المادة بالكامل؟ لن تظهر للطلاب نهائياً.')) {
      return;
    }

    try {
      const response = await fetch('/api/admin-delete-subject', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ id })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        fetchSubjects();
      } else {
        alert(result.message || 'فشل إخفاء المادة.');
      }
    } catch (err) {
      alert('تعذر الاتصال لحذف المادة.');
    }
  };

  const openAddSubjectModal = () => {
    setSubjectModalMode('add');
    setCurrentSubject({
      id: '',
      name: '',
      price: '',
      description: '',
      category: '2009',
      status: 'active',
      sortOrder: (subjects.length + 1)
    });
    setSubjectModalError('');
    setIsSubjectModalOpen(true);
  };

  const openEditSubjectModal = (subject: Subject) => {
    setSubjectModalMode('edit');
    setCurrentSubject(subject);
    setSubjectModalError('');
    setIsSubjectModalOpen(true);
  };

  /* ========================================================
     Pricing Functions
     ======================================================== */

  const fetchPricingRules = async () => {
    setLoadingPricing(true);
    setError('');
    try {
      const response = await fetch('/api/admin-get-pricing', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json();

      if (response.ok && result.success) {
        const normalized = (result.pricing || []).map(normalizePricingRule);
        setPricingRules(normalized);
      } else {
        if (response.status === 401) {
          handleLogout();
        }
        setError(result.message || 'فشل جلب الأسعار من السيرفر.');
      }
    } catch (err) {
      setError('فشل تحميل الأسعار، يرجى التحقق من اتصال الإنترنت.');
    } finally {
      setLoadingPricing(false);
    }
  };

  const handleSavePricing = async (e: React.FormEvent) => {
    e.preventDefault();
    setPricingModalError('');

    const priceNum = Number(currentPricing.price);
    if (isNaN(priceNum) || priceNum < 0) {
      setPricingModalError('يرجى إدخال سعر مالي صحيح.');
      return;
    }

    setSavingPricing(true);
    try {
      const response = await fetch('/api/admin-save-pricing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(currentPricing)
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setIsPricingModalOpen(false);
        fetchPricingRules();
      } else {
        setPricingModalError(result.message || 'فشل حفظ السعر.');
      }
    } catch (err) {
      setPricingModalError('تعذر الاتصال بالسيرفر لحفظ التعديلات.');
    } finally {
      setSavingPricing(false);
    }
  };

  const handleDisablePricing = async (rule: PricingRule) => {
    if (!window.confirm('هل أنت متأكد من رغبتك في تعطيل قاعدة التسعير هذه؟ لن تتوفر للطلاب في الحاسبة.')) {
      return;
    }

    try {
      const response = await fetch('/api/admin-disable-pricing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(rule)
      });

      const result = await response.json();

      if (response.ok && result.success) {
        fetchPricingRules();
      } else {
        alert(result.message || 'فشل تعطيل قاعدة التسعير.');
      }
    } catch (err) {
      alert('تعذر الاتصال لتعطيل السعر.');
    }
  };

  const openAddPricingModal = () => {
    setPricingModalMode('add');
    setCurrentPricing({
      category: '2009',
      printType: 'black_white',
      modelsCount: 2,
      subjectsCount: 1,
      price: 3.5,
      status: 'active'
    });
    setPricingModalError('');
    setIsPricingModalOpen(true);
  };

  const openEditPricingModal = (rule: PricingRule) => {
    setPricingModalMode('edit');
    setCurrentPricing(rule);
    setPricingModalError('');
    setIsPricingModalOpen(true);
  };

  // Render Login View
  if (!isAuthenticated) {
    return (
      <div className="form-card" style={{ maxWidth: '450px', margin: '40px auto', padding: '32px 24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '24px' }}>
          <div style={{ padding: '12px', backgroundColor: 'var(--google-purple-light)', borderRadius: '50%', marginBottom: '12px' }}>
            <ShieldAlert size={36} style={{ color: 'var(--google-purple)' }} />
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0, color: 'var(--text-color)' }}>لوحة تحكم المشرف</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '6px' }}>
            يرجى إدخال كلمة المرور المعتمدة للدخول إلى لوحة إدارة المواد والأسعار.
          </p>
        </div>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label htmlFor="admin-pass" className="question-title" style={{ fontSize: '0.9rem', marginBottom: '6px' }}>كلمة المرور</label>
            <input
              id="admin-pass"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="input-text-field"
              style={{ textAlign: 'center', letterSpacing: '2px' }}
              disabled={loading}
              required
            />
          </div>

          {loginError && (
            <div className="card-error-msg" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <XCircle size={16} />
              <span>{loginError}</span>
            </div>
          )}

          <button 
            type="submit" 
            className="btn-submit-google" 
            style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '8px' }}
            disabled={loading}
          >
            {loading ? (
              <div className="google-spinner"></div>
            ) : (
              <>
                <LogIn size={18} />
                <span>دخول النظام</span>
              </>
            )}
          </button>

          <button 
            type="button" 
            onClick={onBackToApp} 
            className="clear-form-link"
            style={{ alignSelf: 'center', marginTop: '6px' }}
          >
            العودة لصفحة الطلاب
          </button>
        </form>
      </div>
    );
  }

  // Render Admin Dashboard
  return (
    <div style={{ width: '100%', paddingBottom: '40px' }}>
      
      {/* Header bar */}
      <div className="form-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', marginBottom: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>إدارة المواد والأسعار 🛠️</h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>تحديث فوري لنموذج الطلاب من السحابة.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            type="button" 
            onClick={onBackToApp} 
            className="clear-form-link"
            style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '0.85rem' }}
          >
            شكل الطلاب
          </button>
          <button 
            type="button" 
            onClick={handleLogout} 
            className="clear-form-link" 
            style={{ color: '#d93025', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem' }}
          >
            <LogOut size={16} />
            <span>خروج</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="global-error-alert" style={{ marginBottom: '16px' }}>
          <ShieldAlert size={20} />
          <span>{error}</span>
        </div>
      )}

      {/* التبويبات (Tabs Layout) */}
      <div className="admin-tabs-container">
        <button 
          type="button" 
          onClick={() => setActiveTab('subjects')} 
          className={`admin-tab-btn ${activeTab === 'subjects' ? 'active' : ''}`}
        >
          إدارة المواد 📚
        </button>
        <button 
          type="button" 
          onClick={() => setActiveTab('pricing')} 
          className={`admin-tab-btn ${activeTab === 'pricing' ? 'active' : ''}`}
        >
          إدارة الأسعار 💰
        </button>
      </div>

      {/* ========================================================
          تبويب إدارة المواد
          ======================================================== */}
      {activeTab === 'subjects' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-color)', fontWeight: 600 }}>
              المواد الحالية في شيت Subjects ({subjects.length} مواد)
            </span>
            <button 
              type="button" 
              onClick={openAddSubjectModal} 
              className="btn-submit-google" 
              style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.88rem', margin: 0 }}
            >
              <Plus size={18} />
              <span>إضافة مادة جديدة</span>
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {loading && subjects.length === 0 ? (
              <div className="form-card" style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
                <div className="google-spinner" style={{ borderColor: 'var(--google-purple)', borderTopColor: 'transparent' }}></div>
              </div>
            ) : subjects.length === 0 ? (
              <div className="form-card" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                لا توجد مواد مضافة حالياً في شيت Subjects.
              </div>
            ) : (
              subjects.map(subject => {
                const priceLabel = formatPrice(subject.price);
                
                return (
                  <div 
                    key={subject.id} 
                    className="form-card"
                    style={{
                      padding: '16px 20px',
                      borderLeft: subject.status === 'active' 
                        ? '5px solid #1e8e3e' 
                        : subject.status === 'disabled' 
                          ? '5px solid #f9ab00' 
                          : '5px solid #d93025',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                      marginBottom: 0
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-color)' }}>
                            {subject.name}
                          </span>
                          <span style={{
                            fontSize: '0.75rem',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            fontWeight: 600,
                            backgroundColor: subject.category === '2009' ? '#e8f0fe' : subject.category === '2008' ? '#f3e8fd' : '#fce8e6',
                            color: subject.category === '2009' ? '#1a73e8' : subject.category === '2008' ? 'var(--google-purple)' : '#c5221f'
                          }}>
                            {subject.category}
                          </span>
                        </div>
                        {subject.description && (
                          <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            {subject.description}
                          </p>
                        )}
                      </div>
                      
                      <div style={{ textAlign: 'left', fontWeight: 800, color: 'var(--google-purple)', fontSize: '1.1rem' }}>
                        {priceLabel || 'يُحدد لاحقاً'}
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #eee', paddingTop: '12px', marginTop: '4px' }}>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>الترتيب: <strong>{subject.sortOrder}</strong></span>
                        <span style={{ color: '#eee' }}>|</span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          الحالة: 
                          <strong style={{ 
                            color: subject.status === 'active' ? '#1e8e3e' : subject.status === 'disabled' ? '#f9ab00' : '#d93025',
                            marginRight: '4px'
                          }}>
                            {subject.status === 'active' ? 'نشطة' : subject.status === 'disabled' ? 'معطلة' : 'مخفية'}
                          </strong>
                        </span>
                      </div>

                      {/* Actions row */}
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                          type="button" 
                          onClick={() => openEditSubjectModal(subject)}
                          className="clear-form-link"
                          style={{ padding: '4px 8px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '4px', border: '1px solid #ddd', borderRadius: '4px' }}
                        >
                          <Edit2 size={14} />
                          <span>تعديل</span>
                        </button>

                        {subject.status !== 'active' && (
                          <button 
                            type="button" 
                            onClick={() => handleToggleSubjectStatus(subject, 'active')}
                            className="clear-form-link"
                            style={{ color: '#1e8e3e', padding: '4px 8px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '4px', border: '1px solid #1e8e3e', borderRadius: '4px' }}
                          >
                            <CheckCircle size={14} />
                            <span>تفعيل</span>
                          </button>
                        )}

                        {subject.status === 'active' && (
                          <button 
                            type="button" 
                            onClick={() => handleToggleSubjectStatus(subject, 'disabled')}
                            className="clear-form-link"
                            style={{ color: '#f9ab00', padding: '4px 8px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '4px', border: '1px solid #f9ab00', borderRadius: '4px' }}
                          >
                            <XCircle size={14} />
                            <span>تعطيل</span>
                          </button>
                        )}

                        {subject.status !== 'hidden' && (
                          <button 
                            type="button" 
                            onClick={() => handleDeleteSubject(subject.id)}
                            className="clear-form-link"
                            style={{ color: '#d93025', padding: '4px 8px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '4px', border: '1px solid #d93025', borderRadius: '4px' }}
                          >
                            <EyeOff size={14} />
                            <span>إخفاء</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {/* ========================================================
          تبويب إدارة الأسعار
          ======================================================== */}
      {activeTab === 'pricing' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-color)', fontWeight: 600 }}>
              قواعد التسعير في شيت Pricing ({pricingRules.length} قاعدة)
            </span>
            <button 
              type="button" 
              onClick={openAddPricingModal} 
              className="btn-submit-google" 
              style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.88rem', margin: 0 }}
            >
              <Plus size={18} />
              <span>إضافة سعر جديد</span>
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {loadingPricing && pricingRules.length === 0 ? (
              <div className="form-card" style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
                <div className="google-spinner" style={{ borderColor: 'var(--google-purple)', borderTopColor: 'transparent' }}></div>
              </div>
            ) : pricingRules.length === 0 ? (
              <div className="form-card" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                لا توجد أسعار مضافة حالياً في شيت Pricing.
              </div>
            ) : (
              pricingRules.map((rule, index) => {
                const key = `${rule.category}-${rule.printType}-${rule.modelsCount}-${rule.subjectsCount}-${index}`;
                return (
                  <div 
                    key={key} 
                    className="form-card"
                    style={{
                      padding: '16px 20px',
                      borderLeft: rule.status === 'active' 
                        ? '5px solid #1e8e3e' 
                        : '5px solid #d93025',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                      marginBottom: 0
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-color)' }}>
                            {rule.category === '2008' ? 'سعر المادة للـ 2008' : `باقة ${rule.subjectsCount} مواد`}
                          </span>
                          <span style={{
                            fontSize: '0.75rem',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            fontWeight: 600,
                            backgroundColor: rule.category === '2009' ? '#e8f0fe' : rule.category === '2008' ? '#f3e8fd' : '#fce8e6',
                            color: rule.category === '2009' ? '#1a73e8' : rule.category === '2008' ? 'var(--google-purple)' : '#c5221f'
                          }}>
                            {rule.category}
                          </span>
                          <span style={{
                            fontSize: '0.75rem',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            fontWeight: 600,
                            backgroundColor: rule.printType === 'color' ? '#fff2f2' : '#f1f3f4',
                            color: rule.printType === 'color' ? '#d149ff' : '#5f6368',
                            border: rule.printType === 'color' ? '1px solid #e066ff' : '1px solid #ccc'
                          }}>
                            {rule.printType === 'color' ? 'ملون' : 'أبيض وأسود'}
                          </span>
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                            ({rule.modelsCount} نماذج)
                          </span>
                        </div>
                      </div>
                      
                      <div style={{ textAlign: 'left', fontWeight: 800, color: 'var(--google-purple)', fontSize: '1.25rem' }}>
                        {rule.price.toFixed(2)} JD
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #eee', paddingTop: '12px', marginTop: '4px' }}>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          الحالة: 
                          <strong style={{ 
                            color: rule.status === 'active' ? '#1e8e3e' : '#d93025',
                            marginRight: '4px'
                          }}>
                            {rule.status === 'active' ? 'نشطة' : 'معطلة'}
                          </strong>
                        </span>
                      </div>

                      {/* Actions row */}
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                          type="button" 
                          onClick={() => openEditPricingModal(rule)}
                          className="clear-form-link"
                          style={{ padding: '4px 8px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '4px', border: '1px solid #ddd', borderRadius: '4px' }}
                        >
                          <Edit2 size={14} />
                          <span>تعديل السعر</span>
                        </button>

                        {rule.status === 'active' && (
                          <button 
                            type="button" 
                            onClick={() => handleDisablePricing(rule)}
                            className="clear-form-link"
                            style={{ color: '#d93025', padding: '4px 8px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '4px', border: '1px solid #d93025', borderRadius: '4px' }}
                          >
                            <XCircle size={14} />
                            <span>تعطيل</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {/* Add/Edit Subject Modal */}
      {isSubjectModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          padding: '16px'
        }}>
          <div className="form-card" style={{ width: '100%', maxWidth: '500px', margin: 0, padding: '24px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1.2rem', fontWeight: 700 }}>
              {subjectModalMode === 'add' ? 'إضافة مادة جديدة ➕' : 'تعديل بيانات المادة ✏️'}
            </h3>

            <form onSubmit={handleSaveSubject} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              
              <div>
                <label className="question-title" style={{ fontSize: '0.85rem', marginBottom: '4px' }}>رمز المعرف الفريد (ID)</label>
                <input
                  type="text"
                  placeholder="مثال: math-2008 (اختياري سيتم توليده لو فارغ)"
                  value={currentSubject.id || ''}
                  onChange={(e) => setCurrentSubject(prev => ({ ...prev, id: e.target.value }))}
                  className="input-text-field"
                  disabled={subjectModalMode === 'edit' || savingSubject}
                />
              </div>

              <div>
                <label className="question-title required" style={{ fontSize: '0.85rem', marginBottom: '4px' }}>اسم المادة</label>
                <input
                  type="text"
                  placeholder="مثال: امتحانات كيمياء"
                  value={currentSubject.name || ''}
                  onChange={(e) => setCurrentSubject(prev => ({ ...prev, name: e.target.value }))}
                  className="input-text-field"
                  disabled={savingSubject}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label className="question-title" style={{ fontSize: '0.85rem', marginBottom: '4px' }}>السعر (JD) - للتوافق</label>
                  <input
                    type="text"
                    placeholder="مثال: 4.5"
                    value={currentSubject.price || ''}
                    onChange={(e) => setCurrentSubject(prev => ({ ...prev, price: e.target.value }))}
                    className="input-text-field"
                    disabled={savingSubject}
                  />
                </div>

                <div style={{ flex: 1 }}>
                  <label className="question-title required" style={{ fontSize: '0.85rem', marginBottom: '4px' }}>الترتيب</label>
                  <input
                    type="number"
                    placeholder="مثال: 1"
                    value={currentSubject.sortOrder || ''}
                    onChange={(e) => setCurrentSubject(prev => ({ ...prev, sortOrder: parseInt(e.target.value, 10) || 1 }))}
                    className="input-text-field"
                    disabled={savingSubject}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="question-title" style={{ fontSize: '0.85rem', marginBottom: '4px' }}>الوصف أو موعد التوصيل (يظهر لغير BTEC)</label>
                <input
                  type="text"
                  placeholder="مثال: التوصيل يوم الأربعاء 1/7"
                  value={currentSubject.description || ''}
                  onChange={(e) => setCurrentSubject(prev => ({ ...prev, description: e.target.value }))}
                  className="input-text-field"
                  disabled={savingSubject}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label className="question-title required" style={{ fontSize: '0.85rem', marginBottom: '4px' }}>التصنيف</label>
                  <select
                    value={currentSubject.category || '2009'}
                    onChange={(e) => setCurrentSubject(prev => ({ ...prev, category: e.target.value }))}
                    className="input-select-field"
                    style={{ maxWidth: '100%' }}
                    disabled={savingSubject}
                    required
                  >
                    <option value="2009">توجيهي 2009</option>
                    <option value="2008">توجيهي 2008</option>
                    <option value="BTEC">بيتيك BTEC</option>
                    <option value="closed">منتهية / مغلقة</option>
                  </select>
                </div>

                <div style={{ flex: 1 }}>
                  <label className="question-title required" style={{ fontSize: '0.85rem', marginBottom: '4px' }}>الحالة</label>
                  <select
                    value={currentSubject.status || 'active'}
                    onChange={(e) => setCurrentSubject(prev => ({ ...prev, status: e.target.value }))}
                    className="input-select-field"
                    style={{ maxWidth: '100%' }}
                    disabled={savingSubject}
                    required
                  >
                    <option value="active">نشطة (تظهر وقابلة للاختيار)</option>
                    <option value="disabled">معطلة (تظهر وغير قابلة للاختيار)</option>
                    <option value="hidden">مخفية (لا تظهر نهائياً)</option>
                  </select>
                </div>
              </div>

              {subjectModalError && (
                <div className="card-error-msg" style={{ margin: '4px 0 0 0' }}>
                  <AlertCircle size={14} />
                  <span>{subjectModalError}</span>
                </div>
              )}

              <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                <button 
                  type="submit" 
                  className="btn-submit-google" 
                  style={{ flex: 1, margin: 0 }}
                  disabled={savingSubject}
                >
                  {savingSubject ? 'جاري الحفظ...' : 'حفظ المادة'}
                </button>
                <button 
                  type="button" 
                  onClick={() => setIsSubjectModalOpen(false)}
                  className="clear-form-link"
                  style={{ border: '1px solid #ddd', borderRadius: '6px', padding: '8px 16px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                  disabled={savingSubject}
                >
                  إلغاء
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Add/Edit Pricing Modal */}
      {isPricingModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          padding: '16px'
        }}>
          <div className="form-card" style={{ width: '100%', maxWidth: '500px', margin: 0, padding: '24px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1.2rem', fontWeight: 700 }}>
              {pricingModalMode === 'add' ? 'إضافة قاعدة تسعير جديدة ➕' : 'تعديل السعر 💰'}
            </h3>

            <form onSubmit={handleSavePricing} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label className="question-title required" style={{ fontSize: '0.85rem', marginBottom: '4px' }}>التصنيف / الجيل</label>
                  <select
                    value={currentPricing.category || '2009'}
                    onChange={(e) => setCurrentPricing(prev => ({ ...prev, category: e.target.value }))}
                    className="input-select-field"
                    style={{ maxWidth: '100%' }}
                    disabled={pricingModalMode === 'edit' || savingPricing}
                    required
                  >
                    <option value="2009">2009</option>
                    <option value="BTEC">BTEC</option>
                    <option value="2008">2008</option>
                  </select>
                </div>

                <div style={{ flex: 1 }}>
                  <label className="question-title required" style={{ fontSize: '0.85rem', marginBottom: '4px' }}>نوع الطباعة</label>
                  <select
                    value={currentPricing.printType || 'black_white'}
                    onChange={(e) => setCurrentPricing(prev => ({ ...prev, printType: e.target.value }))}
                    className="input-select-field"
                    style={{ maxWidth: '100%' }}
                    disabled={pricingModalMode === 'edit' || savingPricing}
                    required
                  >
                    <option value="black_white">أبيض وأسود</option>
                    <option value="color">ملون</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label className="question-title required" style={{ fontSize: '0.85rem', marginBottom: '4px' }}>عدد النماذج</label>
                  <input
                    type="number"
                    value={currentPricing.modelsCount || 2}
                    onChange={(e) => setCurrentPricing(prev => ({ ...prev, modelsCount: parseInt(e.target.value, 10) || 2 }))}
                    className="input-text-field"
                    disabled={pricingModalMode === 'edit' || savingPricing}
                    required
                  />
                </div>

                <div style={{ flex: 1 }}>
                  <label className="question-title required" style={{ fontSize: '0.85rem', marginBottom: '4px' }}>
                    {currentPricing.category === '2008' ? 'عدد المواد (افتراضي 1)' : 'عدد المواد'}
                  </label>
                  <input
                    type="number"
                    value={currentPricing.subjectsCount || 1}
                    onChange={(e) => setCurrentPricing(prev => ({ ...prev, subjectsCount: parseInt(e.target.value, 10) || 1 }))}
                    className="input-text-field"
                    disabled={(pricingModalMode === 'edit' || currentPricing.category === '2008') || savingPricing}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="question-title required" style={{ fontSize: '0.85rem', marginBottom: '4px' }}>السعر المطلوب (JD)</label>
                <input
                  type="text"
                  placeholder="مثال: 8.5"
                  value={currentPricing.price || ''}
                  onChange={(e) => setCurrentPricing(prev => ({ ...prev, price: Number(e.target.value) || 0 }))}
                  className="input-text-field"
                  disabled={savingPricing}
                  required
                />
              </div>

              <div>
                <label className="question-title required" style={{ fontSize: '0.85rem', marginBottom: '4px' }}>الحالة</label>
                <select
                  value={currentPricing.status || 'active'}
                  onChange={(e) => setCurrentPricing(prev => ({ ...prev, status: e.target.value }))}
                  className="input-select-field"
                  style={{ maxWidth: '100%' }}
                  disabled={savingPricing}
                  required
                >
                  <option value="active">نشطة (متاحة للطلاب)</option>
                  <option value="disabled">معطلة (غير متاحة)</option>
                </select>
              </div>

              {pricingModalError && (
                <div className="card-error-msg" style={{ margin: '4px 0 0 0' }}>
                  <AlertCircle size={14} />
                  <span>{pricingModalError}</span>
                </div>
              )}

              <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                <button 
                  type="submit" 
                  className="btn-submit-google" 
                  style={{ flex: 1, margin: 0 }}
                  disabled={savingPricing}
                >
                  {savingPricing ? 'جاري الحفظ...' : 'حفظ السعر'}
                </button>
                <button 
                  type="button" 
                  onClick={() => setIsPricingModalOpen(false)}
                  className="clear-form-link"
                  style={{ border: '1px solid #ddd', borderRadius: '6px', padding: '8px 16px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                  disabled={savingPricing}
                >
                  إلغاء
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};
