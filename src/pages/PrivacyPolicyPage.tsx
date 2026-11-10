import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Shield, Loader2 } from 'lucide-react';
import { supabase, type SiteSettings } from '../lib/supabase';
import { useDocumentMeta } from '../lib/seo';

export function PrivacyPolicyPage() {
  useDocumentMeta({
    title: 'سياسة الخصوصية | سوق السيارات الليبي',
    description: 'سياسة الخصوصية وحماية البيانات في سوق السيارات الليبي.',
    path: '/privacy-policy',
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
            <Shield className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">سياسة الخصوصية</h1>
        </div>

        <div className="prose prose-sm max-w-none">
          {settings?.privacy_policy ? (
            <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{settings.privacy_policy}</p>
          ) : (
            <div className="space-y-4 text-gray-600 leading-relaxed">
              <p>
                نحن في سوق السيارات الليبي نحترم خصوصية مستخدمينا ونلتزم بحماية بياناتهم الشخصية. توضح هذه السياسة كيفية جمعنا واستخدامنا وحفظنا للمعلومات التي تقدمها عند استخدامك للموقع.
              </p>
              <h3 className="font-bold text-gray-800 mt-6 mb-2">المعلومات التي نجمعها</h3>
              <p>
                نقوم بجمع المعلومات التي تقدمها مباشرة عند إنشاء حساب أو نشر إعلان أو خدمة، مثل الاسم والبريد الإلكتروني ورقم الهاتف والمدينة. كما نجمع بعض المعلومات التقنية تلقائياً مثل نوع المتصفح ونظام التشغيل.
              </p>
              <h3 className="font-bold text-gray-800 mt-6 mb-2">كيفية استخدام المعلومات</h3>
              <p>
                نستخدم معلوماتك لتقديم خدماتنا وتحسين تجربتك في الموقع، وللتواصل معك بخصوص إعلاناتك وخدماتك، ولأغراض أمنية والتحقق من الهوية.
              </p>
              <h3 className="font-bold text-gray-800 mt-6 mb-2">ملفات تعريف الارتباط والتحليلات</h3>
              <p>
                نستخدم ملفات تعريف الارتباط (الكوكيز) للتحليلات وعرض الإعلانات بعد موافقتك عليها. الملفات الضرورية لتسجيل الدخول تعمل دائماً. يمكنك تغيير اختيارك في أي وقت من خلال رابط "إعدادات الكوكيز" في أسفل الصفحة.
              </p>
              <p>
                لقياس الزيارات نحدد المدينة التقريبية للزائر اعتماداً على عنوان الشبكة (IP) عبر خدمة خارجية، ولا نحفظ عنوان IP نفسه في قاعدة بياناتنا.
              </p>
              <h3 className="font-bold text-gray-800 mt-6 mb-2">حماية البيانات</h3>
              <p>
                نتخذ إجراءات أمنية مناسبة لحماية بياناتك من الوصول غير المصرح به. لا نشارك معلوماتك الشخصية مع أطراف ثالثة لأغراض تسويقية دون موافقتك.
              </p>
              <h3 className="font-bold text-gray-800 mt-6 mb-2">حقوقك</h3>
              <p>
                يحق لك الوصول إلى بياناتك الشخصية وتصحيحها أو حذفها. يمكنك التواصل معنا في أي وقت بخصوص أي استفسار حول خصوصية بياناتك.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
