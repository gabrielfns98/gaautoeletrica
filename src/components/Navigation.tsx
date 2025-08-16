import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X, Phone, Clock, User, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import logo from "@/assets/logo.png";

const Navigation = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, signOut, isAdmin } = useAuth();
  const navigate = useNavigate();

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setIsMenuOpen(false);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const handleAuthClick = () => {
    if (user) {
      handleSignOut();
    } else {
      navigate('/auth');
    }
  };

  return (
    <nav className="fixed top-0 w-full z-50 bg-gradient-glass backdrop-blur-lg border-b border-border/50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <img src={logo} alt="G.A Auto Elétrica" className="h-12 w-12" />
            <div>
              <h2 className="font-bold text-xl text-primary">G.A Auto Elétrica</h2>
              <p className="text-sm text-muted-foreground">Especialistas em Auto Elétrica</p>
            </div>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-8">
            <Button variant="ghost" onClick={() => scrollToSection("services")}>
              Serviços
            </Button>
            {user && (
              <Button variant="ghost" onClick={() => scrollToSection("tracking")}>
                Meus Veículos
              </Button>
            )}
            {user && isAdmin && (
              <Button variant="ghost" onClick={() => scrollToSection("inventory")}>
                Estoque
              </Button>
            )}
            <Button variant="ghost" onClick={() => scrollToSection("support")}>
              Suporte
            </Button>
            <Button 
              className="bg-gradient-primary shadow-glow hover:shadow-lg transition-all duration-smooth"
              onClick={handleAuthClick}
            >
              {user ? (
                <>
                  <LogOut size={16} className="mr-2" />
                  Sair
                </>
              ) : (
                <>
                  <User size={16} className="mr-2" />
                  Entrar
                </>
              )}
            </Button>
          </div>

          {/* Contact Info Desktop */}
          <div className="hidden lg:flex items-center space-x-6 text-sm">
            <div className="flex items-center space-x-2">
              <Phone size={16} className="text-accent" />
              <span>(34) 9 9866-7638</span>
            </div>
            <div className="flex items-center space-x-2">
              <Clock size={16} className="text-accent" />
              <span>Seg-Sex: 8h-18h</span>
            </div>
          </div>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden"
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </Button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden mt-4 pb-4 space-y-3">
            <Button 
              variant="ghost" 
              className="w-full justify-start"
              onClick={() => scrollToSection("services")}
            >
              Serviços
            </Button>
            {user && (
              <Button 
                variant="ghost" 
                className="w-full justify-start"
                onClick={() => scrollToSection("tracking")}
              >
                Meus Veículos
              </Button>
            )}
            {user && isAdmin && (
              <Button 
                variant="ghost" 
                className="w-full justify-start"
                onClick={() => scrollToSection("inventory")}
              >
                Estoque
              </Button>
            )}
            <Button 
              variant="ghost" 
              className="w-full justify-start"
              onClick={() => scrollToSection("support")}
            >
              Suporte
            </Button>
            <Button 
              className="w-full bg-gradient-primary shadow-glow"
              onClick={handleAuthClick}
            >
              {user ? (
                <>
                  <LogOut size={16} className="mr-2" />
                  Sair
                </>
              ) : (
                <>
                  <User size={16} className="mr-2" />
                  Entrar
                </>
              )}
            </Button>
            <div className="pt-4 space-y-2 border-t border-border">
              <div className="flex items-center space-x-2 text-sm">
                <Phone size={16} className="text-accent" />
                <span>(34) 9 9866-7638</span>
              </div>
              <div className="flex items-center space-x-2 text-sm">
                <Clock size={16} className="text-accent" />
                <span>Seg-Sex: 8h às 18h</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navigation;