import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Products from "./pages/Products";
import ProductDetail from "./pages/ProductDetail";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import Raffles from "./pages/Raffles";
import SaleEvents from "./pages/SaleEvents";
import Profile from "./pages/Profile";
import OrderDetail from "./pages/OrderDetail";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminProducts from "./pages/admin/Products";
import AdminInquiries from "./pages/admin/Inquiries";
import AdminRaffles from "./pages/admin/Raffles";
import AdminChat from "./pages/admin/Chat";
import AdminOrders from "./pages/admin/Orders";
import Wishlist from "./pages/Wishlist";
import LoyaltyProgram from "./pages/LoyaltyProgram";
import ShippingPolicy from "./pages/ShippingPolicy";
import ReturnsPolicy from "./pages/ReturnsPolicy";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import Header from "./components/Header";
import Footer from "./components/Footer";
import ChatWidget from "./components/ChatWidget";

function Router() {
  return (
    <>
      <Header />
      <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/products"} component={Products} />
      <Route path={"/product/:id"} component={ProductDetail} />
      <Route path={"/cart"} component={Cart} />
      <Route path={"/checkout"} component={Checkout} />
      <Route path={"/raffles"} component={Raffles} />
      <Route path={"/sale-events"} component={SaleEvents} />
      <Route path={"/profile"} component={Profile} />
      <Route path={"/wishlist"} component={Wishlist} />
      <Route path={"/loyalty"} component={LoyaltyProgram} />
      <Route path={"/order/:id"} component={OrderDetail} />
      <Route path={"/admin"} component={AdminDashboard} />
      <Route path={"/admin/products"} component={AdminProducts} />
      <Route path={"/admin/inquiries"} component={AdminInquiries} />
      <Route path={"/admin/raffles"} component={AdminRaffles} />
      <Route path={"/admin/chat"} component={AdminChat} />
      <Route path={"/admin/orders"} component={AdminOrders} />
      <Route path={"/shipping-policy"} component={ShippingPolicy} />
      <Route path={"/returns-policy"} component={ReturnsPolicy} />
      <Route path={"/privacy-policy"} component={PrivacyPolicy} />
      <Route path={"/terms-of-service"} component={TermsOfService} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
      </Switch>
      <Footer />
      <ChatWidget />
    </>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
