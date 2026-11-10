import { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './lib/AuthContext';
import { FavoritesProvider } from './lib/FavoritesContext';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { ToastContainer } from './components/Toast';
import { HomePage } from './pages/HomePage';
import { DashboardPage } from './pages/DashboardPage';
import { SignInPage } from './pages/SignInPage';
import { SignUpPage } from './pages/SignUpPage';
import { ListingsPage } from './pages/ListingsPage';
import { ListingDetailPage } from './pages/ListingDetailPage';
import { PostListingPage } from './pages/PostListingPage';
import { EditListingPage } from './pages/EditListingPage';
import { FavoritesPage } from './pages/FavoritesPage';
import { SellerPage } from './pages/SellerPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { PrivacyPolicyPage } from './pages/PrivacyPolicyPage';
import { TermsOfUsePage } from './pages/TermsOfUsePage';
import { AboutPage } from './pages/AboutPage';
import { BlogListPage } from './pages/BlogListPage';
import { BlogPostPage } from './pages/BlogPostPage';
import { AnalyticsTracker } from './components/AnalyticsTracker';
import { CookieConsentBanner } from './components/CookieConsentBanner';
import { AdSenseLoader } from './components/AdSlot';

const AdminPage = lazy(() => import('./pages/AdminPage').then((m) => ({ default: m.AdminPage })));

function PageFallback() {
  return <div className="min-h-[50vh]" aria-busy="true" />;
}

function ScrollToTop() {
  const { pathname, search } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [pathname, search]);

  return null;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <FavoritesProvider>
        <div className="min-h-screen flex flex-col bg-[#f8faf9]">
          <ScrollToTop />
          <AnalyticsTracker />
          <AdSenseLoader />
          <Header />
          <main className="flex-1">
            <Suspense fallback={<PageFallback />}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/signin" element={<SignInPage />} />
              <Route path="/signup" element={<SignUpPage />} />
              <Route path="/listings" element={<ListingsPage />} />
              <Route path="/listing/:id" element={<ListingDetailPage />} />
              <Route path="/post-listing" element={<PostListingPage />} />
              <Route path="/edit-listing/:id" element={<EditListingPage />} />
              <Route path="/favorites" element={<FavoritesPage />} />
              <Route path="/seller/:id" element={<SellerPage />} />
              <Route path="/admin" element={<AdminPage />} />
              <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
              <Route path="/terms-of-use" element={<TermsOfUsePage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/blog" element={<BlogListPage />} />
              <Route path="/blog/:slug" element={<BlogPostPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
            </Suspense>
          </main>
          <Footer />
          <CookieConsentBanner />
          <ToastContainer />
        </div>
        </FavoritesProvider>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
