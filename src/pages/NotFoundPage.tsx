import { Link } from 'react-router-dom';
import { Home, Search } from 'lucide-react';
import { useDocumentMeta } from '../lib/seo';

export function NotFoundPage() {
  useDocumentMeta({
    title: 'الصفحة غير موجودة | سوق السيارات الليبي',
    description: 'الصفحة التي تبحث عنها غير موجودة.',
    path: '/404',
    noindex: true,
  });

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-4 py-16 text-center">
      <p className="text-6xl font-extrabold text-primary-600">404</p>
      <h1 className="mt-4 text-2xl font-bold text-gray-800">هذه الصفحة غير موجودة</h1>
      <p className="mt-2 text-gray-500">ربما حُذف الإعلان أو تغيّر الرابط. يمكنك البحث عن سيارتك من جديد.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link to="/" className="flex items-center gap-2 rounded-xl bg-primary-600 px-6 py-3 font-bold text-white hover:bg-primary-700">
          <Home className="h-5 w-5" />
          الرئيسية
        </Link>
        <Link to="/listings" className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-6 py-3 font-bold text-gray-700 hover:bg-gray-50">
          <Search className="h-5 w-5" />
          تصفح الإعلانات
        </Link>
      </div>
    </div>
  );
}
