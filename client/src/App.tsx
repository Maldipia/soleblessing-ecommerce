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
import Header from "./components/Header";

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
      <Route path={"/order/:id"} component={OrderDetail} />
      <Route path={"/admin"} component={AdminDashboard} />
      <Route path={"/admin/products"} component={AdminProducts} />
      <Route path={"/admin/inquiries"} component={AdminInquiries} />
      <Route path={"/admin/raffles"} component={AdminRaffles} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
      </Switch>
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
