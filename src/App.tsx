import { useState, useEffect } from 'react';
import { OrderForm } from './components/OrderForm';
import type { FormState } from './components/OrderForm';
import { SuccessView } from './components/SuccessView';
import { EditOrderLookup } from './components/EditOrderLookup';
import { AdminPanel } from './components/AdminPanel';
import { PlusCircle, Edit3, GraduationCap } from 'lucide-react';

type AppView = 'home' | 'newOrder' | 'editLookup' | 'editForm' | 'successNew' | 'successEdit' | 'admin';

function App() {
  const [view, setView] = useState<AppView>('home');
  const [orderId, setOrderId] = useState<string>('');
  const [editPhone, setEditPhone] = useState<string>('');
  const [orderTotal, setOrderTotal] = useState<number>(0);
  const [fetchedOrderData, setFetchedOrderData] = useState<FormState | undefined>(undefined);

  // الكشف عن الدخول لصفحة لوحة التحكم /admin عند التحميل
  useEffect(() => {
    if (window.location.pathname === '/admin') {
      setView('admin');
    }
  }, []);

  const handleNewOrderSuccess = (id: string, total: number) => {
    setOrderId(id);
    setOrderTotal(total);
    setView('successNew');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEditOrderSuccess = (id: string, total: number) => {
    setOrderId(id);
    setOrderTotal(total);
    setView('successEdit');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOrderFound = (id: string, phone: string, data: FormState) => {
    setOrderId(id);
    setEditPhone(phone);
    setFetchedOrderData(data);
    setView('editForm');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleGoHome = () => {
    setOrderId('');
    setEditPhone('');
    setOrderTotal(0);
    setFetchedOrderData(undefined);
    setView('home');
    if (window.location.pathname !== '/') {
      window.history.pushState({}, '', '/');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="form-container">
      
      {/* 1. لوحة تحكم الإدارة (Admin Panel View) */}
      {view === 'admin' && (
        <AdminPanel onBackToApp={handleGoHome} />
      )}

      {/* 2. الصفحة الرئيسية (Home View) */}
      {view === 'home' && (
        <>
          <div className="form-card header-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <GraduationCap size={24} style={{ color: 'var(--google-purple)' }} />
              <h1 className="form-title" style={{ margin: 0 }}>امتحانات النجاح المتوقعة VIP 🥇</h1>
            </div>
            <p className="form-subtitle">
              أهلاً بكم في نظام تسجيل طلبات نماذج الامتحانات لطلاب التوجيهي والأول ثانوي. يرجى اختيار الإجراء المطلوب للمتابعة:
            </p>
          </div>

          <div className="form-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* خيار تسجيل طلب جديد */}
            <div 
              className="home-option-card"
              onClick={() => setView('newOrder')}
            >
              <div className="home-option-icon new">
                <PlusCircle size={28} />
              </div>
              <div className="home-option-details">
                <h3 className="home-option-title">تسجيل طلب جديد</h3>
                <p className="home-option-desc">تقديم طلب لأول مرة وتوليد رقم طلب مميز VIP.</p>
              </div>
            </div>

            {/* خيار تعديل طلب سابق */}
            <div 
              className="home-option-card"
              onClick={() => setView('editLookup')}
            >
              <div className="home-option-icon edit">
                <Edit3 size={28} />
              </div>
              <div className="home-option-details">
                <h3 className="home-option-title">تعديل طلب سابق</h3>
                <p className="home-option-desc">تحديث المواد أو بيانات التوصيل لطلب قمت بتسجيله مسبقاً.</p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* 3. تسجيل طلب جديد (New Order Flow) */}
      {view === 'newOrder' && (
        <>
          <div className="form-card header-card">
            <h1 className="form-title">طلب نماذج امتحانات النجاح المتوقعة VIP</h1>
            <p className="form-subtitle">يرجى تعبئة البيانات كاملة لتأكيد الطلب.</p>
            <div className="section-divider"></div>
            <div className="section-title">
              <span>امتحانات النجاح المتوقعة VIP 🥇</span>
            </div>
            <p className="required-notice">* تشير إلى سؤال مطلوب</p>
          </div>

          <OrderForm 
            onSubmitSuccess={handleNewOrderSuccess} 
            onBack={handleGoHome}
          />
        </>
      )}

      {/* 4. التحقق لتعديل طلب سابق (Lookup Flow) */}
      {view === 'editLookup' && (
        <EditOrderLookup 
          onBack={handleGoHome}
          onOrderFound={handleOrderFound}
        />
      )}

      {/* 5. نموذج التعديل (Edit Form Flow) */}
      {view === 'editForm' && (
        <>
          <div className="form-card header-card">
            <h1 className="form-title">تعديل طلب امتحانات النجاح المتوقعة VIP</h1>
            <p className="form-subtitle">يرجى مراجعة وتعديل بياناتك بالأسفل ثم الضغط على حفظ التعديلات.</p>
            <div className="section-divider"></div>
            <div className="section-title">
              <span>تعديل الطلب: {orderId} 🥇</span>
            </div>
            <p className="required-notice">* تشير إلى سؤال مطلوب</p>
          </div>

          <OrderForm 
            onSubmitSuccess={handleEditOrderSuccess} 
            onBack={() => setView('editLookup')}
            initialData={fetchedOrderData}
            orderNumber={orderId}
            editPhone={editPhone}
            isEditMode={true}
          />
        </>
      )}

      {/* 6. نجاح طلب جديد (Success New View) */}
      {view === 'successNew' && (
        <SuccessView 
          orderId={orderId} 
          total={orderTotal}
          isEditMode={false} 
          onGoHome={handleGoHome}
        />
      )}

      {/* 7. نجاح التعديل (Success Edit View) */}
      {view === 'successEdit' && (
        <SuccessView 
          orderId={orderId} 
          total={orderTotal}
          isEditMode={true} 
          onGoHome={handleGoHome}
        />
      )}

    </div>
  );
}

export default App;
