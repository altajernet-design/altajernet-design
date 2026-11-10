import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, FileText, Loader2 } from 'lucide-react';
import { supabase, type SiteSettings } from '../lib/supabase';
import { useDocumentMeta } from '../lib/seo';

export function TermsOfUsePage() {
  useDocumentMeta({
    title: 'شروط الاستخدام | سوق السيارات الليبي',
    description: 'شروط استخدام سوق السيارات الليبي.',
    path: '/terms-of-use',
  });

  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('site_settings')
      .select('*')
      .eq('id', 1)
      .maybeSingle()
      .then(({ data }) => {
        setSettings(data);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link to="/" className="flex items-center gap-1 text-sm text-gray-500 hover:text-primary-600 mb-6">
        <ArrowRight className="w-4 h-4" />
        العودة للرئيسية
      </Link>

      <div className="bg-white rounded-2xl border border-gray-100 p-8 md:p-10 animate-fade-in">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-primary-500 flex items-center justify-center">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">شروط الاستخدام</h1>
        </div>

        <div className="prose prose-sm max-w-none">
          {settings?.terms_of_use ? (
            <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{settings.terms_of_use}</p>
          ) : (
            <div className="space-y-4 text-gray-600 leading-relaxed">
              <p>
                باستخدامك لسوق السيارات الليبي فإنك توافق على الشروط والأحكام التالية. يرجى قراءتها بعناية قبل استخدام الموقع.
              </p>
              <h3 className="font-bold text-gray-800 mt-6 mb-2">قبول الشروط</h3>
              <p>
                استخدامك لهذا الموقع يعني موافقتك على هذه الشروط. إذا كنت لا توافق على أي جزء منها، فيجب عليك التوقف عن استخدام الموقع.
              </p>
              <h3 className="font-bold text-gray-800 mt-6 mb-2">استخدام المنصة</h3>
              <p>
                يُسمح باستخدام المنصة للأغراض المشروعة فقط. يُحظر نشر محتوى مخالف للقانون أو مضلل أو مخل بالآداب. يُحظر استخدام الموقع لأي نشاط احتيالي أو ضار.
              </p>
              <h3 className="font-bold text-gray-800 mt-6 mb-2">مسؤولية المستخدم</h3>
              <p>
                أنت مسؤول عن صحة المعلومات التي تقدمها في إعلاناتك وخدماتك. أنت مسؤول عن أي تفاعل أو معاملة تتم بينك وبين المستخدمين الآخرين عبر المنصة.
              </p>
              <h3 className="font-bold text-gray-800 mt-6 mb-2">مراجعة الإعلانات</h3>
                <p>
                تحتفظ إدارة الموقع بحق مراجعة وقبول أو رفض أو حذف أي إعلان أو خدمة دون إبداء أسباب. يتم مراجعة جميع الإعلانات قبل نشرها لضمان جودة المحتوى.
              </p>
              <h3 className="font-bold text-gray-800 mt-6 mb-2">حدود المسؤولية</h3>
              <p>
                لا يتحمل سوق السيارات الليبي أي مسؤولية عن أي ضرر ناتج عن استخدام الموقع أو عن المعاملات بين المستخدمين. المنصة تعمل كوسيط لنشر الإعلانات والخدمات فقط.
              </p>
              <h3 className="font-bold text-gray-800 mt-6 mb-2">تعديل الشروط</h3>
              <p>
                تحتفظ إدارة الموقع بحق تعديل هذه الشروط في أي وقت. استمرارك في استخدام الموقع بعد التعديل يعني موافقتك على الشروط المعدلة.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
