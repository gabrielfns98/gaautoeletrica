import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Zap, 
  Battery, 
  Settings, 
  Cpu, 
  Shield, 
  Wrench,
  Clock,
  Star
} from "lucide-react";

const ServicesSection = () => {
  const services = [
    {
      icon: Zap,
      title: "Sistema Elétrico Completo",
      description: "Diagnóstico e reparo completo do sistema elétrico automotivo",
      features: ["Diagnóstico por scanner", "Reparo de chicotes", "Instalação de acessórios"],
      rating: 4.9,
      color: "text-accent"
    },
    {
      icon: Battery,
      title: "Bateria e Alternador",
      description: "Teste, manutenção e substituição de baterias e alternadores",
      features: ["Teste de carga", "Limpeza de terminais", "Troca de alternador"],
      rating: 4.8,
      color: "text-primary"
    },
    {
      icon: Cpu,
      title: "Injeção Eletrônica",
      description: "Diagnóstico e reparo de sistemas de injeção eletrônica",
      features: ["Scanner automotivo", "Limpeza de bicos", "Reprogramação ECU"],
      rating: 4.9,
      color: "text-success"
    },
    {
      icon: Settings,
      title: "Sistema de Ignição",
      description: "Manutenção completa do sistema de ignição do veículo",
      features: ["Troca de velas", "Bobinas de ignição", "Cabos de vela"],
      rating: 4.7,
      color: "text-warning"
    },
    {
      icon: Shield,
      title: "Alarmes e Travas",
      description: "Instalação e manutenção de sistemas de segurança",
      features: ["Alarmes automotivos", "Travas elétricas", "Vidros elétricos"],
      rating: 4.8,
      color: "text-destructive"
    },
    {
      icon: Wrench,
      title: "Manutenção Preventiva",
      description: "Check-up completo dos sistemas elétricos do veículo",
      features: ["Inspeção geral", "Limpeza de componentes", "Relatório detalhado"],
      rating: 4.9,
      color: "text-muted-foreground"
    }
  ];

  return (
    <section id="services" className="py-20 bg-gradient-to-br from-background to-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <Badge variant="secondary" className="mb-4 px-4 py-2">
            <Wrench className="mr-2" size={16} />
            Nossos Serviços
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            <span className="text-foreground">Serviços </span>
            <span className="text-primary">Especializados</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Oferecemos soluções completas em auto elétrica com tecnologia de ponta 
            e atendimento personalizado para seu veículo
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((service, index) => {
            const IconComponent = service.icon;
            return (
              <Card 
                key={index} 
                className="group hover:shadow-glow transition-all duration-smooth transform hover:-translate-y-2 bg-gradient-card border-border/50"
              >
                <CardHeader>
                  <div className="flex items-center justify-between mb-4">
                    <div className={`p-3 rounded-xl bg-gradient-primary/10 ${service.color}`}>
                      <IconComponent size={32} />
                    </div>
                    <div className="flex items-center space-x-1">
                      <Star size={16} className="text-warning fill-warning" />
                      <span className="font-semibold text-sm">{service.rating}</span>
                    </div>
                  </div>
                  <CardTitle className="text-xl">{service.title}</CardTitle>
                  <CardDescription className="text-base">
                    {service.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <ul className="space-y-2">
                      {service.features.map((feature, idx) => (
                        <li key={idx} className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-primary rounded-full"></div>
                          <span className="text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="pt-4 border-t border-border flex items-center justify-between">
                      <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                        <Clock size={14} />
                        <span>Agendamento rápido</span>
                      </div>
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="hover:bg-primary hover:text-primary-foreground"
                        onClick={() => document.getElementById("support")?.scrollIntoView({ behavior: "smooth" })}
                      >
                        Solicitar Orçamento
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

      </div>
    </section>
  );
};

export default ServicesSection;