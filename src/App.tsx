import { useState } from 'react';
import { OrderForm } from './components/OrderForm';
import type { FormState } from './components/OrderForm';
import { SuccessView } from './components/SuccessView';
import { EditOrderLookup } from './components/EditOrderLookup';
import { PlusCircle, Edit3, GraduationCap } from 'lucide-react';

type AppView = 'home' | 'newOrder' | 'editLookup' | 'editForm' | 'successNew' | 'successEdit';

function App() {
  const [view, setView] = useState<AppView>('home');
  const [orderId, setOrderId] = useState<string>('');
  const [editPhone, setEditPhone] = useState<string>('');
  const [fetchedOrderData, setFetchedOrderData] = useState<FormState | undefined>(undefined);

  const handleNewOrderSuccess = (id: string) => {
    setOrderId(id);
    setView('successNew');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEditOrderSuccess = (id: string) => {
    setOrderId(id);
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
    setFetchedOrderData(undefined);
    setView('home');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="form-container">
      
      {/* 1. الصفحة الرئيسية (Home View) */}
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

      {/* 2. تسجيل طلب جديد (New Order Flow) */}
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

      {/* 3. التحقق لتعديل طلب سابق (Lookup Flow) */}
      {view === 'editLookup' && (
        <EditOrderLookup 
          onBack={handleGoHome}
          onOrderFound={handleOrderFound}
        />
      )}

      {/* 4. نموذج التعديل (Edit Form Flow) */}
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

      {/* 5. نجاح طلب جديد (Success New View) */}
      {view === 'successNew' && (
        <SuccessView 
          orderId={orderId} 
          isEditMode={false} 
          onGoHome={handleGoHome}
        />
      )}

      {/* 6. نجاح التعديل (Success Edit View) */}
      {view === 'successEdit' && (
        <SuccessView 
          orderId={orderId} 
          isEditMode={true} 
          onGoHome={handleGoHome}
        />
      )}

    </div>
  );
}

export default App;
