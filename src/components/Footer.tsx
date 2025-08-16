import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Phone, 
  Mail, 
  MapPin, 
  Clock, 
  Facebook, 
  Instagram, 
  MessageCircle,
  Zap,
  Bot
} from "lucide-react";
import logo from "@/assets/logo.png";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gradient-to-br from-primary/5 to-primary/10 border-t border-border/50">
      <div className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Informações da empresa */}
          <div className="lg:col-span-1">
            <div className="flex items-center space-x-3 mb-6">
              <img src={logo} alt="G.A Auto Elétrica" className="h-12 w-12" />
              <div>
                <h3 className="font-bold text-xl text-primary">G.A Auto Elétrica</h3>
                <p className="text-sm text-muted-foreground">Especialistas em Auto Elétrica</p>
              </div>
            </div>
            <p className="text-muted-foreground mb-6 leading-relaxed">
              Mais de 15 anos oferecendo soluções completas em sistemas elétricos automotivos 
              com tecnologia de ponta e atendimento personalizado.
            </p>
            <div className="flex items-center space-x-2 mb-4">
              <Badge variant="secondary" className="bg-accent/10 text-accent">
                <Bot size={14} className="mr-1" />
                IA 24/7
              </Badge>
              <Badge variant="secondary" className="bg-success/10 text-success">
                <Zap size={14} className="mr-1" />
                Diagnóstico Avançado
              </Badge>
            </div>
            <div className="flex space-x-3">
              <Button size="sm" variant="outline" className="p-2">
                <Facebook size={16} />
              </Button>
              <Button size="sm" variant="outline" className="p-2">
                <Instagram size={16} />
              </Button>
              <Button size="sm" variant="outline" className="p-2">
                <MessageCircle size={16} />
              </Button>
            </div>
          </div>

          {/* Serviços */}
          <div>
            <h4 className="font-semibold text-lg mb-6 text-primary">Nossos Serviços</h4>
            <ul className="space-y-3 text-muted-foreground">
              <li className="hover:text-primary transition-colors cursor-pointer">
                Sistema Elétrico Completo
              </li>
              <li className="hover:text-primary transition-colors cursor-pointer">
                Bateria e Alternador
              </li>
              <li className="hover:text-primary transition-colors cursor-pointer">
                Injeção Eletrônica
              </li>
              <li className="hover:text-primary transition-colors cursor-pointer">
                Sistema de Ignição
              </li>
              <li className="hover:text-primary transition-colors cursor-pointer">
                Alarmes e Travas
              </li>
              <li className="hover:text-primary transition-colors cursor-pointer">
                Manutenção Preventiva
              </li>
            </ul>
          </div>

          {/* Links úteis */}
          <div>
            <h4 className="font-semibold text-lg mb-6 text-primary">Acesso Rápido</h4>
            <ul className="space-y-3 text-muted-foreground">
              <li>
                <button 
                  className="hover:text-primary transition-colors"
                  onClick={() => document.getElementById("services")?.scrollIntoView({ behavior: "smooth" })}
                >
                  Nossos Serviços
                </button>
              </li>
              <li>
                <button 
                  className="hover:text-primary transition-colors"
                  onClick={() => document.getElementById("support")?.scrollIntoView({ behavior: "smooth" })}
                >
                  Suporte ao Cliente
                </button>
              </li>
              <li>
                <button 
                  className="hover:text-primary transition-colors"
                  onClick={() => document.getElementById("tracking")?.scrollIntoView({ behavior: "smooth" })}
                >
                  Acompanhar Veículo
                </button>
              </li>
              <li>
                <button 
                  className="hover:text-primary transition-colors"
                  onClick={() => document.getElementById("inventory")?.scrollIntoView({ behavior: "smooth" })}
                >
                  Controle de Estoque
                </button>
              </li>
              <li className="hover:text-primary transition-colors cursor-pointer">
                Política de Privacidade
              </li>
              <li className="hover:text-primary transition-colors cursor-pointer">
                Termos de Serviço
              </li>
            </ul>
          </div>

          {/* Contato */}
          <div>
            <h4 className="font-semibold text-lg mb-6 text-primary">Contato</h4>
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <MapPin size={20} className="text-accent mt-1" />
                <div>
                  <p className="font-medium">Endereço</p>
                  <p className="text-sm text-muted-foreground">
                    Rua Carlos Finholdt Júnior, 156<br />
                    Res. Guilherme Borges de Oliveira<br />
                    CEP: 38035-280
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <Phone size={20} className="text-accent mt-1" />
                <div>
                  <p className="font-medium">Telefones</p>
                  <p className="text-sm text-muted-foreground">
                    (34) 9 9866-7638<br />
                    (34) 9 9763-0033
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <Mail size={20} className="text-primary mt-1" />
                <div>
                  <p className="font-medium">E-mail</p>
                  <p className="text-sm text-muted-foreground">
                    contato@gaautoeletrica.com.br
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <Clock size={20} className="text-accent mt-1" />
                <div>
                  <p className="font-medium">Horário de Funcionamento</p>
                  <p className="text-sm text-muted-foreground">
                    Segunda a Sexta: 8h às 18h<br />
                    <span className="text-accent font-medium">Suporte ao Cliente 24/7</span>
                  </p>
                </div>
              </div>
            </div>

            <Button 
              className="w-full mt-6 bg-gradient-primary shadow-glow hover:shadow-lg transition-all duration-smooth"
              onClick={() => window.open("https://wa.me/553499866638")}
            >
              <MessageCircle size={16} className="mr-2" />
              WhatsApp
            </Button>
          </div>
        </div>

        {/* Linha divisória */}
        <div className="border-t border-border/50 mt-12 pt-8">
          <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
            <div className="flex items-center space-x-4">
              <p className="text-sm text-muted-foreground">
                © {currentYear} G.A Auto Elétrica. Todos os direitos reservados.
              </p>
            </div>
            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
              <span>Desenvolvido com ❤️ usando tecnologia de ponta</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;