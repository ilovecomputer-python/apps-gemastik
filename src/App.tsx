import { useCallback, useEffect, useState } from "react";
import "./App.css";
import type { BottomTab, View } from "./types";
import { useAuth } from "./context/AuthContext";
import { cartApi, lastActiveStore, wishlistApi } from "./lib/api";
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
import NewBrandsPage from "./pages/NewBrandsPage";
import AdminPage from "./pages/AdminPage";
import SellerCenterPage from "./pages/SellerCenterPage";
import VouchersPage from "./pages/VouchersPage";
import CommunityPage from "./pages/CommunityPage";
import QuizPage from "./pages/QuizPage";
import QuizResultPage from "./pages/QuizResultPage";
import OrderHistoryPage from "./pages/OrderHistoryPage";
import AddressesPage from "./pages/AddressesPage";

const ENTERED_KEY = "aura-entered";
const IDLE_LIMIT_MS = 30 * 60 * 1000;
const IDLE_EVENTS = ["mousemove", "mousedown", "keydown", "scroll", "touchstart"];

function App() {
  const { user, loading: authLoading, logout } = useAuth();
  const [view, setView] = useState<View>(() =>
    localStorage.getItem(ENTERED_KEY) === "1"
      ? { name: "home" }
      : { name: "landing" },
  );
  const [wishlistIds, setWishlistIds] = useState<Set<string>>(new Set());
  const [cartCount, setCartCount] = useState(0);
  const [darkMode, setDarkMode] = useState(
    () => localStorage.getItem("aura-theme") === "dark",
  );
  const [sessionExpired, setSessionExpired] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.theme = darkMode ? "dark" : "light";
    localStorage.setItem("aura-theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  useEffect(() => {
    if (!user) return;

    const goToExpiredLogin = () => {
      logout();
      setSessionExpired(true);
      setView({ name: "login" });
    };

    // A closed tab keeps no timers running, so idle time spent away from an
    // open tab is tracked through localStorage instead of only in memory -
    // otherwise reopening the tab would always grant a fresh 30 minutes.
    // AuthContext.login/register stamp this fresh on success, so this only
    // ever catches a *restored* session (valid token, tab reopened after
    // 30+ idle minutes) - never a login that just happened moments ago.
    const lastActive = lastActiveStore.get();
    if (lastActive && Date.now() - lastActive > IDLE_LIMIT_MS) {
      goToExpiredLogin();
      return;
    }

    let timer: ReturnType<typeof setTimeout>;
    const resetTimer = () => {
      lastActiveStore.markNow();
      clearTimeout(timer);
      timer = setTimeout(goToExpiredLogin, IDLE_LIMIT_MS);
    };

    resetTimer();
    IDLE_EVENTS.forEach((event) =>
      window.addEventListener(event, resetTimer, { passive: true }),
    );

    return () => {
      clearTimeout(timer);
      IDLE_EVENTS.forEach((event) =>
        window.removeEventListener(event, resetTimer),
      );
    };
  }, [user, logout]);

  useEffect(() => {
    // Once past the splash/login/register screens - whether logged in or
    // just browsing as a guest - a refresh should keep you inside the app
    // instead of bouncing back to the landing screen's "Masuk ke AURA" CTA,
    // which reads as a forced logout even though no session was lost.
    if (view.name !== "landing" && view.name !== "login" && view.name !== "register") {
      localStorage.setItem(ENTERED_KEY, "1");
    }
  }, [view.name]);

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
      case "brands":
        return "brands";
      case "account":
        return "account";
      default:
        return "home";
    }
  })();

  const goToTab = (tab: BottomTab) => {
    if (tab === "home") setView({ name: "home" });
    if (tab === "scan") setView({ name: "scan" });
    // Public, like the spotlight section it replaces on the tab bar - no
    // login needed to browse new brands.
    if (tab === "brands") setView({ name: "brands" });
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
            sessionExpired={sessionExpired}
            onSuccess={(destination) => {
              setSessionExpired(false);
              // Each destination is a distinct View member with no shared
              // shape, so it's picked explicitly rather than forwarded as a
              // generic { name: destination } object.
              if (destination === "admin") setView({ name: "admin" });
              else if (destination === "seller") setView({ name: "seller" });
              else setView({ name: "home" });
            }}
            onGoRegister={() => {
              setSessionExpired(false);
              setView({ name: "register" });
            }}
            onSkip={() => {
              setSessionExpired(false);
              setView({ name: "home" });
            }}
          />
        );
      case "register":
        return (
          <RegisterPage
            onSuccess={(destination) =>
              setView(destination === "seller" ? { name: "seller" } : { name: "home" })
            }
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
            onOpenBrands={() => setView({ name: "brands" })}
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
      case "brands":
        return (
          <NewBrandsPage
            onBack={() => setView({ name: "home" })}
            onOpenProduct={(id) => setView({ name: "product", id })}
            onApply={() => requireAuth({ name: "brand-onboarding" })}
            onRequireLogin={() => setView({ name: "login" })}
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
            onOpenOrders={() => requireAuth({ name: "orders" })}
            onOpenWishlist={() => requireAuth({ name: "wishlist" })}
            onOpenAddresses={() => requireAuth({ name: "addresses" })}
          />
        );
      case "orders":
        return <OrderHistoryPage onBack={() => setView({ name: "account" })} />;
      case "addresses":
        return <AddressesPage onBack={() => setView({ name: "account" })} />;
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
            onOpenBrands={() => setView({ name: "brands" })}
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
            onBrowseVouchers={() => setView({ name: "vouchers" })}
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
        <BottomNav active={activeTab} onSelect={goToTab} />
      )}
    </div>
  );
}

export default App;
