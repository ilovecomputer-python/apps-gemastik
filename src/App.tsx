import { useCallback, useEffect, useState } from "react";
import "./App.css";
import type { BottomTab, View } from "./types";
import { useAuth } from "./context/AuthContext";
import { cartApi, wishlistApi } from "./lib/api";
import BottomNav from "./components/BottomNav";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import HomePage from "./pages/HomePage";
import ScanPage from "./pages/ScanPage";
import ScanFlowPage from "./pages/ScanFlowPage";
import ScanResultPage from "./pages/ScanResultPage";
import ProductDetailPage from "./pages/ProductDetailPage";
import WishlistPage from "./pages/WishlistPage";
import AccountPage from "./pages/AccountPage";
import CartPage from "./pages/CartPage";
import CheckoutPage from "./pages/CheckoutPage";
import PaymentPage from "./pages/PaymentPage";
import OrderSuccessPage from "./pages/OrderSuccessPage";
import SubscriptionPage from "./pages/SubscriptionPage";
import BrandOnboardingPage from "./pages/BrandOnboardingPage";
import NewArrivalsPage from "./pages/NewArrivalsPage";
import AdminPage from "./pages/AdminPage";
import SellerCenterPage from "./pages/SellerCenterPage";
import VouchersPage from "./pages/VouchersPage";
import CommunityPage from "./pages/CommunityPage";
import QuizPage from "./pages/QuizPage";
import QuizResultPage from "./pages/QuizResultPage";

function App() {
  const { user, loading: authLoading, logout } = useAuth();
  const [view, setView] = useState<View>({ name: "landing" });
  const [wishlistIds, setWishlistIds] = useState<Set<string>>(new Set());
  const [cartCount, setCartCount] = useState(0);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.theme = darkMode ? "dark" : "light";
  }, [darkMode]);

  const refreshWishlist = useCallback(async () => {
    if (!user) {
      setWishlistIds(new Set());
      return;
    }
    const { products } = await wishlistApi.list();
    setWishlistIds(new Set(products.map((p) => p.id)));
  }, [user]);

  const refreshCart = useCallback(async () => {
    if (!user) {
      setCartCount(0);
      return;
    }
    const { items } = await cartApi.list();
    setCartCount(items.reduce((sum, i) => sum + i.quantity, 0));
  }, [user]);

  useEffect(() => {
    refreshWishlist();
    refreshCart();
  }, [refreshWishlist, refreshCart]);

  const requireAuth = (next: View) => {
    if (!user) {
      setView({ name: "login" });
      return;
    }
    setView(next);
  };

  const toggleWishlist = async (id: string) => {
    if (!user) {
      setView({ name: "login" });
      return;
    }
    const has = wishlistIds.has(id);
    setWishlistIds((prev) => {
      const next = new Set(prev);
      if (has) next.delete(id);
      else next.add(id);
      return next;
    });
    try {
      if (has) await wishlistApi.remove(id);
      else await wishlistApi.add(id);
    } catch {
      await refreshWishlist();
    }
  };

  const addToCart = async (id: string) => {
    if (!user) {
      setView({ name: "login" });
      return;
    }
    await cartApi.add(id);
    await refreshCart();
  };

  const activeTab: BottomTab = (() => {
    switch (view.name) {
      case "scan":
      case "scan-flow":
      case "scan-result":
      case "quiz":
      case "quiz-result":
        return "scan";
      case "wishlist":
        return "wishlist";
      case "account":
        return "account";
      default:
        return "home";
    }
  })();

  const goToTab = (tab: BottomTab) => {
    if (tab === "home") setView({ name: "home" });
    if (tab === "scan") setView({ name: "scan" });
    if (tab === "wishlist") requireAuth({ name: "wishlist" });
    if (tab === "account") setView({ name: "account" });
  };

  if (authLoading) {
    return (
      <div className="app-shell">
        <div className="boot-loading">Memuat…</div>
      </div>
    );
  }

  const renderView = () => {
    switch (view.name) {
      case "landing":
        return (
          <LandingPage
            onEnter={() => setView(user ? { name: "home" } : { name: "login" })}
            onOpenProfile={() => requireAuth({ name: "account" })}
          />
        );
      case "login":
        return (
          <LoginPage
            onSuccess={() => setView({ name: "home" })}
            onGoRegister={() => setView({ name: "register" })}
            onSkip={() => setView({ name: "home" })}
          />
        );
      case "register":
        return (
          <RegisterPage
            onSuccess={() => setView({ name: "home" })}
            onGoLogin={() => setView({ name: "login" })}
          />
        );
      case "home":
        return (
          <HomePage
            wishlist={wishlistIds}
            cartCount={cartCount}
            onOpenProduct={(id) => setView({ name: "product", id })}
            onToggleWishlist={toggleWishlist}
            onOpenScan={() => setView({ name: "scan" })}
            onOpenWishlist={() => requireAuth({ name: "wishlist" })}
            onOpenCart={() => requireAuth({ name: "cart" })}
            onOpenSettings={() => requireAuth({ name: "account" })}
            onRequireLogin={() => setView({ name: "login" })}
            onOpenNewArrivals={() => setView({ name: "new-arrivals" })}
            onOpenCommunity={() => setView({ name: "community" })}
            isLoggedIn={Boolean(user)}
          />
        );
      case "new-arrivals":
        return (
          <NewArrivalsPage
            wishlist={wishlistIds}
            onBack={() => setView({ name: "home" })}
            onOpenProduct={(id) => setView({ name: "product", id })}
            onToggleWishlist={toggleWishlist}
          />
        );
      case "scan":
        return (
          <ScanPage
            onBack={() => setView({ name: "home" })}
            onStartScan={() => setView({ name: "scan-flow" })}
            onOpenQuiz={() => requireAuth({ name: "quiz" })}
          />
        );
      case "quiz":
        return (
          <QuizPage
            onBack={() => setView({ name: "scan" })}
            onComplete={(profile, kit) =>
              setView({ name: "quiz-result", profile, kit })
            }
          />
        );
      case "quiz-result":
        return (
          <QuizResultPage
            profile={view.profile}
            kit={view.kit}
            onBack={() => setView({ name: "scan" })}
            onOpenProduct={(id) => setView({ name: "product", id })}
          />
        );
      case "scan-flow":
        return (
          <ScanFlowPage
            onBack={() => setView({ name: "scan" })}
            onAnalyzed={(result) => setView({ name: "scan-result", result })}
          />
        );
      case "scan-result":
        return (
          <ScanResultPage
            result={view.result}
            onBack={() => setView({ name: "scan" })}
            onOpenProduct={(id) => setView({ name: "product", id })}
          />
        );
      case "product":
        return (
          <ProductDetailPage
            id={view.id}
            wishlisted={wishlistIds.has(view.id)}
            onBack={() => setView({ name: "home" })}
            onToggleWishlist={toggleWishlist}
            onAddToCart={addToCart}
            onGoToCart={() => requireAuth({ name: "cart" })}
            onRequireLogin={() => setView({ name: "login" })}
          />
        );
      case "wishlist":
        return (
          <WishlistPage
            onBack={() => setView({ name: "home" })}
            onOpenProduct={(id) => setView({ name: "product", id })}
            onToggleWishlist={toggleWishlist}
          />
        );
      case "account":
        return (
          <AccountPage
            user={user}
            darkMode={darkMode}
            onToggleDarkMode={() => setDarkMode((d) => !d)}
            onLogin={() => setView({ name: "login" })}
            onLogout={() => {
              logout();
              setView({ name: "landing" });
            }}
            onOpenSubscription={() => requireAuth({ name: "subscription" })}
            onOpenBrandOnboarding={() => requireAuth({ name: "seller" })}
            onOpenAdmin={() => requireAuth({ name: "admin" })}
            onOpenVouchers={() => requireAuth({ name: "vouchers" })}
            onOpenCommunity={() => setView({ name: "community" })}
          />
        );
      case "admin":
        return <AdminPage onBack={() => setView({ name: "account" })} />;
      case "seller":
        return (
          <SellerCenterPage
            onBack={() => setView({ name: "account" })}
            onApply={() => setView({ name: "brand-onboarding" })}
            onOpenProduct={(id) => setView({ name: "product", id })}
          />
        );
      case "vouchers":
        return <VouchersPage onBack={() => setView({ name: "account" })} />;
      case "community":
        return (
          <CommunityPage
            onBack={() => setView({ name: "home" })}
            onOpenProduct={(id) => setView({ name: "product", id })}
            onOpenVouchers={() => requireAuth({ name: "vouchers" })}
            onRequireLogin={() => setView({ name: "login" })}
          />
        );
      case "subscription":
        return <SubscriptionPage onBack={() => setView({ name: "account" })} />;
      case "brand-onboarding":
        return (
          <BrandOnboardingPage onBack={() => setView({ name: "account" })} />
        );
      case "cart":
        return (
          <CartPage
            onBack={() => setView({ name: "home" })}
            onOpenScan={() => setView({ name: "scan" })}
            onCheckout={() => setView({ name: "checkout" })}
            onCartChanged={refreshCart}
          />
        );
      case "checkout":
        return (
          <CheckoutPage
            onBack={() => setView({ name: "cart" })}
            onPlaceOrder={(orderId, total) => {
              refreshCart();
              setView({ name: "order-success", orderId, total });
            }}
            onPayOnline={(session) => setView({ name: "payment", session })}
          />
        );
      case "payment":
        return (
          <PaymentPage
            session={view.session}
            onBack={() => setView({ name: "checkout" })}
            onPaid={(orderNumber, total) => {
              refreshCart();
              setView({ name: "order-success", orderId: orderNumber, total });
            }}
          />
        );
      case "order-success":
        return (
          <OrderSuccessPage
            orderId={view.orderId}
            total={view.total}
            onBackHome={() => setView({ name: "home" })}
          />
        );
      default:
        return null;
    }
  };

  if (view.name === "landing" || view.name === "login" || view.name === "register") {
    return <main className="app-shell app-shell-landing">{renderView()}</main>;
  }

  const hideNav =
    view.name === "checkout" ||
    view.name === "payment" ||
    view.name === "order-success";

  return (
    <div className="app-shell">
      {/* A <main> landmark is how a screen reader skips straight to the
          content instead of walking the whole page. */}
      <main className="app-scroll">{renderView()}</main>
      {!hideNav && (
        <BottomNav
          active={activeTab}
          onSelect={goToTab}
          wishlistCount={wishlistIds.size}
        />
      )}
    </div>
  );
}

export default App;
