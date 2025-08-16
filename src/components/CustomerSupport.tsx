import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  MessageCircle, 
  Clock, 
  User, 
  Car, 
  CheckCircle,
  Headphones,
  Phone,
  Mail,
  HelpCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const CustomerSupport = () => {
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    vehicle: "",
    subject: "",
    message: "",
    priority: "normal"
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showResponse, setShowResponse] = useState(false);
  const { toast } = useToast();

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const generateSupportResponse = () => {
    const responses = [
      {
        message: `Olá ${formData.name}! Recebemos sua solicitação sobre ${formData.subject.toLowerCase()}. Nossa equipe de suporte técnico entrará em contato em breve para ajudá-lo da melhor forma.`,
        responseTime: "15-30 minutos",
        ticketId: `#SUP${Math.random().toString().substr(2, 6)}`
      },
      {
        message: `Prezado(a) ${formData.name}, obrigado por entrar em contato! Sua questão sobre ${formData.subject.toLowerCase()} foi registrada e será tratada com prioridade. Você receberá retorno em breve.`,
        responseTime: "10-20 minutos",
        ticketId: `#SUP${Math.random().toString().substr(2, 6)}`
      }
    ];
    
    return responses[Math.floor(Math.random() * responses.length)];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone || !formData.subject || !formData.message) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos obrigatórios.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    
    // Simulate support processing
    setTimeout(() => {
      setShowResponse(true);
      setIsSubmitting(false);
      toast({
        title: "Solicitação enviada com sucesso! ✅",
        description: "Nossa equipe entrará em contato em breve.",
      });
    }, 1500);
  };

  const supportResponse = showResponse ? generateSupportResponse() : null;

  return (
    <section id="support" className="py-20 bg-gradient-to-br from-primary/5 to-accent/5">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <Badge variant="secondary" className="mb-4 px-4 py-2">
            <Headphones className="mr-2" size={16} />
            Suporte ao Cliente
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            <span className="text-foreground">Suporte </span>
            <span className="text-primary">Especializado</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Nossa equipe de especialistas está pronta para ajudar você com qualquer 
            dúvida ou problema relacionado ao seu veículo
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Formulário de Contato */}
            <Card className="bg-gradient-card shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MessageCircle className="text-accent" />
                  <span>Como podemos ajudar?</span>
                </CardTitle>
                <CardDescription>
                  Descreva sua necessidade e entraremos em contato rapidamente
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium flex items-center space-x-2">
                        <User size={16} />
                        <span>Nome completo *</span>
                      </label>
                      <Input
                        value={formData.name}
                        onChange={(e) => handleInputChange("name", e.target.value)}
                        placeholder="Seu nome"
                        className="border-border/50 focus:border-accent"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium flex items-center space-x-2">
                        <Phone size={16} />
                        <span>WhatsApp *</span>
                      </label>
                      <Input
                        value={formData.phone}
                        onChange={(e) => handleInputChange("phone", e.target.value)}
                        placeholder="(34) 9 9999-9999"
                        className="border-border/50 focus:border-accent"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center space-x-2">
                      <Mail size={16} />
                      <span>E-mail (opcional)</span>
                    </label>
                    <Input
                      value={formData.email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                      placeholder="seu@email.com"
                      type="email"
                      className="border-border/50 focus:border-accent"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center space-x-2">
                      <Car size={16} />
                      <span>Veículo (opcional)</span>
                    </label>
                    <Input
                      value={formData.vehicle}
                      onChange={(e) => handleInputChange("vehicle", e.target.value)}
                      placeholder="Ex: Honda Civic 2020"
                      className="border-border/50 focus:border-accent"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center space-x-2">
                      <HelpCircle size={16} />
                      <span>Assunto *</span>
                    </label>
                    <select
                      value={formData.subject}
                      onChange={(e) => handleInputChange("subject", e.target.value)}
                      className="w-full p-3 border border-border/50 rounded-lg focus:border-accent focus:outline-none"
                    >
                      <option value="">Selecione o assunto</option>
                      <option value="Dúvida Técnica">Dúvida Técnica</option>
                      <option value="Acompanhar Serviço">Acompanhar Serviço</option>
                      <option value="Orçamento">Solicitar Orçamento</option>
                      <option value="Agendamento">Reagendamento</option>
                      <option value="Garantia">Questões de Garantia</option>
                      <option value="Reclamação">Reclamação ou Sugestão</option>
                      <option value="Outros">Outros</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Sua mensagem *</label>
                    <Textarea
                      value={formData.message}
                      onChange={(e) => handleInputChange("message", e.target.value)}
                      placeholder="Descreva detalhadamente sua necessidade ou dúvida..."
                      rows={4}
                      className="border-border/50 focus:border-accent resize-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Prioridade</label>
                    <div className="flex gap-2">
                      {[
                        { value: "low", label: "Baixa", color: "bg-muted" },
                        { value: "normal", label: "Normal", color: "bg-primary" },
                        { value: "high", label: "Alta", color: "bg-accent text-accent-foreground" },
                        { value: "urgent", label: "Urgente", color: "bg-destructive" }
                      ].map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => handleInputChange("priority", option.value)}
                          className={`px-3 py-2 rounded-lg text-sm transition-all duration-smooth ${
                            formData.priority === option.value
                              ? `${option.color} text-white`
                              : "bg-muted text-muted-foreground hover:bg-muted/80"
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-gradient-primary shadow-glow hover:shadow-lg transition-all duration-smooth py-6"
                  >
                    {isSubmitting ? (
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Enviando solicitação...</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <MessageCircle size={20} />
                        <span>Enviar Solicitação</span>
                      </div>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Resposta do Suporte */}
            <Card className={`bg-gradient-glass border-accent/20 transition-all duration-slow ${showResponse ? 'opacity-100 scale-100' : 'opacity-30 scale-95'}`}>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Headphones className="text-accent" />
                  <span>Resposta do Suporte</span>
                  {showResponse && <CheckCircle className="text-success" size={20} />}
                </CardTitle>
                <CardDescription>
                  Status da sua solicitação de suporte
                </CardDescription>
              </CardHeader>
              <CardContent>
                {showResponse && supportResponse ? (
                  <div className="space-y-6">
                    <div className="p-4 bg-accent/10 rounded-lg border-l-4 border-accent">
                      <p className="text-sm leading-relaxed">{supportResponse.message}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2 text-muted-foreground">
                          <Clock size={14} />
                          <span>Tempo de resposta</span>
                        </div>
                        <p className="font-semibold">{supportResponse.responseTime}</p>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2 text-muted-foreground">
                          <span>🎫</span>
                          <span>Número do ticket</span>
                        </div>
                        <p className="font-semibold text-accent">{supportResponse.ticketId}</p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3">
                      <Button 
                        className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
                        onClick={() => window.open(`https://wa.me/553499866638?text=Olá! Preciso de suporte. Ticket: ${supportResponse.ticketId}`)}
                      >
                        <Phone size={16} className="mr-2" />
                        Contato Direto via WhatsApp
                      </Button>
                      <Button 
                        variant="outline"
                        className="w-full"
                        onClick={() => {
                          setShowResponse(false);
                          setFormData({
                            name: "",
                            phone: "",
                            email: "",
                            vehicle: "",
                            subject: "",
                            message: "",
                            priority: "normal"
                          });
                        }}
                      >
                        Nova Solicitação
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 space-y-4">
                    <Headphones size={48} className="text-muted-foreground/50 mx-auto" />
                    <p className="text-muted-foreground">
                      Preencha o formulário para receber suporte especializado
                    </p>
                    <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                      <div className="flex items-center justify-center space-x-2">
                        <Phone size={14} className="text-accent" />
                        <span>Suporte via WhatsApp</span>
                      </div>
                      <div className="flex items-center justify-center space-x-2">
                        <Clock size={14} className="text-accent" />
                        <span>Resposta rápida garantida</span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CustomerSupport;