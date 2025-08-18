import Navigation from "@/components/Navigation";
import HeroSection from "@/components/HeroSection";
import ServicesSection from "@/components/ServicesSection";
import CustomerSupport from "@/components/CustomerSupport";
import VehicleTracking from "@/components/VehicleTracking";
import AdminPanel from "@/components/AdminPanel";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main>
        <HeroSection />
        <ServicesSection />
        <CustomerSupport />
        <VehicleTracking />
        <section className="py-20 px-4">
          <div className="max-w-4xl mx-auto">
            <AdminPanel />
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Index;
