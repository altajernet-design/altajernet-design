import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Menu, X, Plus, LogOut, LayoutDashboard, ShieldCheck, Heart } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { BrandLogo } from './BrandLogo';

export function Header() {
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
    setMobileOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" aria-label="سوق السيارات الليبي">
            <BrandLogo />
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            <Link to="/" className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all">
              الرئيسية
            </Link>
            <Link to="/listings" className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-all">
              السيارات
            </Link>
            <Link to="/blog" className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all">
              المدونة
            </Link>
            {user && (
              <>
                <Link to="/favorites" className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all">
                  المفضلة
                </Link>
                <Link to="/dashboard" className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all">
                  لوحتي
                </Link>
                {isAdmin && (
                  <Link to="/admin" className="px-4 py-2 text-sm font-semibold text-red-500 hover:bg-red-50 rounded-lg transition-all flex items-center gap-1">
                    <ShieldCheck className="w-4 h-4" />
                    الإدارة
                  </Link>
                )}
              </>
            )}
          </nav>

          <div className="hidden md:flex items-center gap-2">
            <Link
              to="/post-listing"
              className="flex items-center gap-1.5 bg-accent-500 hover:bg-accent-600 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm"
            >
              <Plus className="w-4 h-4" />
              أضف إعلان
            </Link>
            {user ? (
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 text-gray-600 hover:text-red-500 px-3 py-2 rounded-xl text-sm font-semibold transition-all hover:bg-red-50"
              >
                <LogOut className="w-4 h-4" />
                خروج
              </button>
            ) : (
              <>
                <Link to="/signin" className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-primary-600 transition-all">
                  تسجيل الدخول
                </Link>
                <Link
                  to="/signup"
                  className="bg-primary-600 hover:bg-primary-700 text-white px-5 py-2 rounded-xl text-sm font-semibold transition-all shadow-sm hover:shadow-md"
                >
                  حساب جديد
                </Link>
              </>
            )}
          </div>

          <button
            className="md:hidden p-2 text-gray-600"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? 'إغلاق القائمة' : 'فتح القائمة'}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 animate-slide-up">
          <div className="px-4 py-3 space-y-1">
            <Link to="/" onClick={() => setMobileOpen(false)} className="block px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-primary-50 rounded-lg">
              الرئيسية
            </Link>
            <Link to="/listings" onClick={() => setMobileOpen(false)} className="block px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-primary-50 rounded-lg">
              السيارات
            </Link>
            <Link to="/blog" onClick={() => setMobileOpen(false)} className="block px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-primary-50 rounded-lg">
              المدونة
            </Link>
            <Link to="/post-listing" onClick={() => setMobileOpen(false)} className="flex items-center justify-center gap-2 bg-accent-500 text-white px-4 py-2.5 text-sm font-bold rounded-xl">
              <Plus className="w-4 h-4" /> أضف إعلان
            </Link>
            {user ? (
              <>
                <Link to="/favorites" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-primary-50 rounded-lg">
                  <Heart className="w-4 h-4" /> المفضلة
                </Link>
                <Link to="/dashboard" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-primary-50 rounded-lg">
                  <LayoutDashboard className="w-4 h-4" /> لوحتي
                </Link>
                {isAdmin && (
                  <Link to="/admin" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-red-500 hover:bg-red-50 rounded-lg">
                    <ShieldCheck className="w-4 h-4" /> الإدارة
                  </Link>
                )}
                <button onClick={handleSignOut} className="flex items-center gap-2 w-full px-4 py-2.5 text-sm font-semibold text-red-500 hover:bg-red-50 rounded-lg">
                  <LogOut className="w-4 h-4" /> خروج
                </button>
              </>
            ) : (
              <div className="pt-2 border-t border-gray-100 space-y-2">
                <Link to="/signin" onClick={() => setMobileOpen(false)} className="block px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-primary-50 rounded-lg text-center">
                  تسجيل الدخول
                </Link>
                <Link to="/signup" onClick={() => setMobileOpen(false)} className="block bg-primary-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold text-center">
                  حساب جديد
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
