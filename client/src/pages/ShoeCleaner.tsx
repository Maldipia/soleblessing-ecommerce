import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Sparkles, 
  Shield, 
  Droplets, 
  CheckCircle2, 
  Star, 
  MessageCircle,
  Package,
  Brush,
  SprayCan,
  Shirt
} from "lucide-react";
import { Link } from "wouter";
import { APP_LOGO } from "@/const";

export default function ShoeCleaner() {
  const features = [
    { icon: Shield, title: "Safe for All Materials", desc: "Works on white shoes, mesh, suede, leather & rubber soles" },
    { icon: Droplets, title: "No Water Soak", desc: "Dry foam cleaning - no damage, no color fade" },
    { icon: Sparkles, title: "Anti-Yellowing", desc: "Keeps your white shoes bright and clean" },
    { icon: CheckCircle2, title: "No Repaint Needed", desc: "Restores original color without harsh chemicals" },
  ];

  const testimonials = [
    { text: "Ang solid talaga dito!", rating: 5 },
    { text: "Sobrang legit! Bumalik pagka-white in 10 minutes!", rating: 5 },
    { text: "Mas ok pa kaysa mall cleaner.", rating: 5 },
    { text: "Better than expensive brands!", rating: 5 },
  ];

  const kitContents = [
    { icon: SprayCan, name: "Premium Cleaner", desc: "100ml foaming formula" },
    { icon: Brush, name: "Premium Brush", desc: "Soft bristles for all materials" },
    { icon: Shirt, name: "Microfiber Towel", desc: "Lint-free drying cloth" },
    { icon: Package, name: "Magic Sponge", desc: "For stubborn stains" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950">
      {/* Navigation */}
      <header className="sticky top-0 z-50 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <img src={APP_LOGO} alt="SoleBlessing" className="h-8 w-8" />
            <span className="text-xl font-bold text-white">SoleBlessing</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/products" className="text-zinc-400 hover:text-white transition-colors">
              Sneakers
            </Link>
            <Link href="/shoe-cleaner" className="text-orange-500 font-semibold">
              Shoe Cleaner
            </Link>
            <Link href="/clearance" className="text-zinc-400 hover:text-white transition-colors">
              Clearance
            </Link>
          </nav>
          <Button 
            className="bg-orange-500 hover:bg-orange-600 text-white"
            onClick={() => window.open("https://m.me/soleblessingofficial", "_blank")}
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            Order Now
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 to-transparent" />
        <div className="container mx-auto px-4 relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 px-4 py-1">
                🔥 Best Seller in Philippines
              </Badge>
              <h1 className="text-4xl md:text-6xl font-bold text-white leading-tight">
                Revive Your Shoes.
                <span className="text-orange-500"> Revive Your Confidence.</span>
              </h1>
              <p className="text-xl text-zinc-400 max-w-lg">
                The national white-shoe cleaner trusted by Filipinos. Affordable, effective, and safe for all materials.
              </p>
              <div className="flex flex-wrap gap-4">
                <Button 
                  size="lg" 
                  className="bg-orange-500 hover:bg-orange-600 text-white text-lg px-8"
                  onClick={() => window.open("https://m.me/soleblessingofficial", "_blank")}
                >
                  <MessageCircle className="w-5 h-5 mr-2" />
                  Comment "CLEAN" to Order
                </Button>
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="border-zinc-700 text-white hover:bg-zinc-800"
                  onClick={() => document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  View Products
                </Button>
              </div>
              <div className="flex items-center gap-4 pt-4">
                <div className="flex -space-x-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 border-2 border-zinc-900 flex items-center justify-center">
                      <Star className="w-4 h-4 text-white fill-white" />
                    </div>
                  ))}
                </div>
                <div>
                  <p className="text-white font-semibold">4.8/5 Rating</p>
                  <p className="text-zinc-500 text-sm">312+ Shopee Reviews</p>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-r from-orange-500/20 to-yellow-500/20 rounded-3xl blur-3xl" />
              <img 
                src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663209569700/mRBOimITgtbKDVee.jpg" 
                alt="Clean White Sneakers"
                className="relative rounded-2xl shadow-2xl w-full max-w-md mx-auto"
              />
              <div className="absolute -bottom-6 -right-6 bg-zinc-900 border border-zinc-800 rounded-xl p-4 shadow-xl">
                <p className="text-orange-500 font-bold text-2xl">₱199</p>
                <p className="text-zinc-400 text-sm">Starting Price</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-zinc-900/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Why Filipinos Choose SoleBlessing
            </h2>
            <p className="text-zinc-400 max-w-2xl mx-auto">
              Proven results, affordable price, and safe for all shoe materials
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="bg-zinc-800/50 border-zinc-700 hover:border-orange-500/50 transition-colors">
                <CardContent className="p-6 text-center">
                  <div className="w-14 h-14 rounded-full bg-orange-500/20 flex items-center justify-center mx-auto mb-4">
                    <feature.icon className="w-7 h-7 text-orange-500" />
                  </div>
                  <h3 className="text-white font-semibold mb-2">{feature.title}</h3>
                  <p className="text-zinc-400 text-sm">{feature.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Products Section */}
      <section id="products" className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Choose Your Shoe Care Solution
            </h2>
            <p className="text-zinc-400">
              From quick cleans to complete restoration
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Solo Cleaner */}
            <Card className="bg-gradient-to-br from-zinc-800 to-zinc-900 border-zinc-700 overflow-hidden group hover:border-orange-500/50 transition-all">
              <div className="relative h-64 bg-gradient-to-br from-orange-500/10 to-transparent flex items-center justify-center">
                <img 
                  src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663209569700/yAENPyxWqtPDQbUy.jpg" 
                  alt="Solo Cleaner"
                  className="h-48 object-contain group-hover:scale-105 transition-transform"
                />
                <Badge className="absolute top-4 right-4 bg-green-500 text-white">
                  Best Seller
                </Badge>
              </div>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-2xl font-bold text-white">Solo Cleaner</h3>
                    <p className="text-zinc-400">100ml Premium Formula</p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-orange-500">₱199</p>
                    <p className="text-zinc-500 text-sm line-through">₱350</p>
                  </div>
                </div>
                <ul className="space-y-2 mb-6">
                  <li className="flex items-center gap-2 text-zinc-300">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    Perfect for daily cleaning
                  </li>
                  <li className="flex items-center gap-2 text-zinc-300">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    Strong foaming action
                  </li>
                  <li className="flex items-center gap-2 text-zinc-300">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    Ideal for students & daily users
                  </li>
                </ul>
                <Button 
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                  onClick={() => window.open("https://m.me/soleblessingofficial?text=CLEAN", "_blank")}
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Order Solo Cleaner
                </Button>
              </CardContent>
            </Card>

            {/* Complete Kit */}
            <Card className="bg-gradient-to-br from-zinc-800 to-zinc-900 border-orange-500/50 overflow-hidden group relative">
              <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-orange-500 to-yellow-500 text-white text-center py-2 font-semibold">
                🏆 BEST VALUE - Save ₱400+
              </div>
              <div className="relative h-64 bg-gradient-to-br from-orange-500/20 to-transparent flex items-center justify-center mt-8">
                <img 
                  src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663209569700/OJrvyvLgbrtIurQx.jpg" 
                  alt="Complete Kit"
                  className="h-48 object-contain group-hover:scale-105 transition-transform"
                />
              </div>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-2xl font-bold text-white">Complete Kit</h3>
                    <p className="text-zinc-400">Everything You Need</p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-orange-500">₱599</p>
                    <p className="text-zinc-500 text-sm line-through">₱999</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-6">
                  {kitContents.map((item, index) => (
                    <div key={index} className="flex items-center gap-2 text-zinc-300 text-sm">
                      <item.icon className="w-4 h-4 text-orange-500" />
                      {item.name}
                    </div>
                  ))}
                </div>
                <Button 
                  className="w-full bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white"
                  onClick={() => window.open("https://m.me/soleblessingofficial?text=KIT", "_blank")}
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Order Complete Kit
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Before/After Section */}
      <section className="py-20 bg-zinc-900/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Real Results, Real Customers
            </h2>
            <p className="text-zinc-400">
              See the transformation for yourself
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              { before: "Dirty white sneakers", after: "Brand new look" },
              { before: "Yellowed rubber soles", after: "Restored white" },
              { before: "Stained mesh fabric", after: "Clean & fresh" },
            ].map((item, index) => (
              <Card key={index} className="bg-zinc-800/50 border-zinc-700 overflow-hidden">
                <div className="relative h-48 bg-gradient-to-r from-zinc-700 to-zinc-600 flex items-center justify-center">
                  <div className="absolute inset-0 flex">
                    <div className="w-1/2 bg-zinc-800 flex items-center justify-center border-r border-zinc-600">
                      <span className="text-zinc-500 text-sm">BEFORE</span>
                    </div>
                    <div className="w-1/2 bg-gradient-to-br from-orange-500/20 to-transparent flex items-center justify-center">
                      <span className="text-orange-400 text-sm">AFTER</span>
                    </div>
                  </div>
                </div>
                <CardContent className="p-4 text-center">
                  <p className="text-zinc-300">{item.before} → {item.after}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              What Customers Say
            </h2>
            <p className="text-zinc-400">
              4.8 stars from 312+ Shopee reviews
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="bg-zinc-800/50 border-zinc-700">
                <CardContent className="p-6">
                  <div className="flex gap-1 mb-3">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                    ))}
                  </div>
                  <p className="text-zinc-300 italic">"{testimonial.text}"</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-orange-500/20 to-yellow-500/20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Revive Your Shoes?
          </h2>
          <p className="text-zinc-300 mb-8 max-w-2xl mx-auto">
            Comment "CLEAN" for Solo Cleaner (₱199) or "KIT" for Complete Kit (₱599). 
            We'll message you right away!
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button 
              size="lg" 
              className="bg-orange-500 hover:bg-orange-600 text-white text-lg px-8"
              onClick={() => window.open("https://m.me/soleblessingofficial", "_blank")}
            >
              <MessageCircle className="w-5 h-5 mr-2" />
              Message Us on Facebook
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="border-white text-white hover:bg-white/10"
              onClick={() => window.open("https://shopee.ph/soleblessingofficial", "_blank")}
            >
              Shop on Shopee
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-zinc-800">
        <div className="container mx-auto px-4 text-center">
          <Link href="/" className="flex items-center justify-center gap-2 mb-4">
            <img src={APP_LOGO} alt="SoleBlessing" className="h-8 w-8" />
            <span className="text-xl font-bold text-white">SoleBlessing</span>
          </Link>
          <p className="text-zinc-500 text-sm">
            © 2025 SoleBlessing. The National White-Shoe Cleaner.
          </p>
        </div>
      </footer>
    </div>
  );
}
