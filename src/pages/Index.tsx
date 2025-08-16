import Navigation from "@/components/Navigation";
import HeroSection from "@/components/HeroSection";
import ServicesSection from "@/components/ServicesSection";
import CustomerSupport from "@/components/CustomerSupport";
import VehicleTracking from "@/components/VehicleTracking";
import InventoryControl from "@/components/InventoryControl";
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
        <InventoryControl />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
