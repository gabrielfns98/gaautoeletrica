import { Button } from "@/components/ui/button";
import { Bot, Calendar, CheckCircle, Zap } from "lucide-react";
import heroImage from "@/assets/hero-bg.jpg";

const HeroSection = () => {
  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section 
      id="hero" 
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
      style={{
        background: `linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.4)), url(${heroImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      <div className="absolute inset-0 bg-gradient-hero opacity-80"></div>
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center max-w-4xl mx-auto">
          <div className="flex items-center justify-center space-x-2 mb-6">
            <Zap className="text-accent" size={32} />
            <span className="text-accent font-semibold text-lg">
              Atendimento IA 24/7
            </span>
            <Bot className="text-accent" size={28} />
          </div>
          
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6">
            <span className="block">G.A Auto</span>
            <span className="text-accent">Elétrica</span>
          </h1>
          
          <p className="text-xl md:text-2xl text-white/90 mb-8 max-w-2xl mx-auto leading-relaxed">
            Tecnologia de ponta em serviços automotivos com acompanhamento em tempo real 
            e atendimento inteligente por IA
          </p>
          
          <div className="grid md:grid-cols-3 gap-4 mb-10 max-w-3xl mx-auto">
            <div className="flex items-center justify-center space-x-2 bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <CheckCircle className="text-success" size={20} />
              <span className="text-white font-medium">Diagnóstico IA</span>
            </div>
            <div className="flex items-center justify-center space-x-2 bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <Calendar className="text-accent" size={20} />
              <span className="text-white font-medium">Agendamento Automático</span>
            </div>
            <div className="flex items-center justify-center space-x-2 bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <Bot className="text-primary-light" size={20} />
              <span className="text-white font-medium">Status em Tempo Real</span>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button 
              size="lg"
              className="bg-accent hover:bg-accent/90 text-accent-foreground px-8 py-4 text-lg font-semibold shadow-xl hover:shadow-2xl transition-all duration-smooth transform hover:scale-105"
              onClick={() => scrollToSection("schedule")}
            >
              <Bot className="mr-2" size={20} />
              Fale com Nossa IA Agora
            </Button>
            
            <Button 
              variant="outline" 
              size="lg"
              className="border-white/30 text-white hover:bg-white/20 px-8 py-4 text-lg backdrop-blur-sm"
              onClick={() => scrollToSection("services")}
            >
              Conhecer Serviços
            </Button>
          </div>
          
          <div className="mt-12 text-white/70">
            <p className="text-sm">
              ⭐ Nota 4.9/5 - Mais de 1000 clientes atendidos
            </p>
          </div>
        </div>
      </div>
      
      {/* Floating particles effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-accent rounded-full animate-bounce delay-0"></div>
        <div className="absolute top-1/3 right-1/3 w-1 h-1 bg-primary-light rounded-full animate-bounce delay-100"></div>
        <div className="absolute bottom-1/4 right-1/4 w-3 h-3 bg-white/30 rounded-full animate-bounce delay-200"></div>
      </div>
    </section>
  );
};

export default HeroSection;