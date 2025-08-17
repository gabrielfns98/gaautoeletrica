import Navigation from "@/components/Navigation";
import HeroSection from "@/components/HeroSection";
import ServicesSection from "@/components/ServicesSection";
import AppointmentSection from "@/components/AppointmentSection";
import CustomerSupport from "@/components/CustomerSupport";
import VehicleTracking from "@/components/VehicleTracking";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main>
        <HeroSection />
        <ServicesSection />
        <AppointmentSection />
        <CustomerSupport />
        <VehicleTracking />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
