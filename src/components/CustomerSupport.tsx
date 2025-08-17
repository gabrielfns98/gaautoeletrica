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
  const { toast } = useToast();

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const sendToWhatsApp = () => {
    const message = `*Nova Solicitação de Suporte*
    
*Nome:* ${formData.name}
*Telefone:* ${formData.phone}
${formData.email ? `*Email:* ${formData.email}` : ''}
${formData.vehicle ? `*Veículo:* ${formData.vehicle}` : ''}
*Assunto:* ${formData.subject}
*Prioridade:* ${formData.priority === 'low' ? 'Baixa' : formData.priority === 'normal' ? 'Normal' : formData.priority === 'high' ? 'Alta' : 'Urgente'}
*Mensagem:* ${formData.message}

Enviado pelo site G.A Auto Elétrica`;

    const whatsappNumber = "5534998866638";
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodedMessage}`;
    
    window.open(whatsappUrl, '_blank');
    
    toast({
      title: "Redirecionando para WhatsApp ✅",
      description: "Sua mensagem será enviada via WhatsApp.",
    });

    // Reset form
    setFormData({
      name: "",
      phone: "",
      email: "",
      vehicle: "",
      subject: "",
      message: "",
      priority: "normal"
    });
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

    sendToWhatsApp();
  };

  

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
            <span className="text-primary">Online</span>
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
                    className="w-full bg-green-600 hover:bg-green-700 text-white shadow-lg py-6"
                  >
                    <div className="flex items-center space-x-2">
                      <Phone size={20} />
                      <span>Enviar via WhatsApp</span>
                    </div>
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Informações de Contato */}
            <Card className="bg-gradient-glass border-accent/20">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Headphones className="text-accent" />
                  <span>Suporte Online</span>
                </CardTitle>
                <CardDescription>
                  Nossos canais de atendimento
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="text-center py-4">
                    <Headphones size={48} className="text-accent mx-auto mb-4" />
                    <p className="text-foreground mb-2">
                      Atendimento personalizado via WhatsApp
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Resposta rápida e suporte especializado
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center space-x-3 p-3 bg-accent/10 rounded-lg">
                      <Phone size={20} className="text-accent" />
                      <div>
                        <p className="font-medium">WhatsApp</p>
                        <p className="text-sm text-muted-foreground">(34) 9 9886-6638</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3 p-3 bg-accent/10 rounded-lg">
                      <Clock size={20} className="text-accent" />
                      <div>
                        <p className="font-medium">Horário de Atendimento</p>
                        <p className="text-sm text-muted-foreground">Segunda a Sexta: 8h às 18h</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 p-3 bg-accent/10 rounded-lg">
                      <CheckCircle size={20} className="text-accent" />
                      <div>
                        <p className="font-medium">Resposta Rápida</p>
                        <p className="text-sm text-muted-foreground">Até 30 minutos</p>
                      </div>
                    </div>
                  </div>

                  <Button 
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => window.open('https://wa.me/5534998866638?text=Olá! Preciso de suporte da G.A Auto Elétrica.')}
                  >
                    <Phone size={16} className="mr-2" />
                    Contato Direto via WhatsApp
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CustomerSupport;