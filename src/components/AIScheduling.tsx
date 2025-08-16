import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  Bot, 
  Calendar, 
  Clock, 
  User, 
  Car, 
  MessageSquare,
  CheckCircle,
  Sparkles
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const AIScheduling = () => {
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    vehicle: "",
    service: "",
    description: "",
    urgency: "normal"
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAIResponse, setShowAIResponse] = useState(false);
  const { toast } = useToast();

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const generateAIResponse = () => {
    const responses = [
      {
        message: `Olá ${formData.name}! Analisei seu ${formData.vehicle} e identifiquei que o problema de ${formData.service.toLowerCase()} pode ser relacionado ao sistema elétrico principal. Recomendo um diagnóstico completo.`,
        timeSlots: ["14:00 - Hoje", "09:30 - Amanhã", "16:00 - Amanhã"],
        estimatedTime: "2-3 horas",
        estimatedCost: "R$ 120 - R$ 200"
      },
      {
        message: `Perfeito ${formData.name}! Para seu ${formData.vehicle}, o serviço de ${formData.service.toLowerCase()} é uma especialidade nossa. Com base na descrição, posso agilizar seu atendimento.`,
        timeSlots: ["10:00 - Hoje", "13:45 - Hoje", "08:30 - Amanhã"],
        estimatedTime: "1-2 horas",
        estimatedCost: "R$ 80 - R$ 150"
      }
    ];
    
    return responses[Math.floor(Math.random() * responses.length)];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone || !formData.vehicle || !formData.service) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos obrigatórios.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    
    // Simulate AI processing
    setTimeout(() => {
      setShowAIResponse(true);
      setIsSubmitting(false);
      toast({
        title: "IA processou sua solicitação!",
        description: "Análise concluída com recomendações personalizadas.",
      });
    }, 2000);
  };

  const confirmScheduling = (timeSlot: string) => {
    toast({
      title: "Agendamento confirmado! ✅",
      description: `Seu horário ${timeSlot} foi reservado. Enviamos confirmação por WhatsApp.`,
    });
    setShowAIResponse(false);
    setFormData({
      name: "",
      phone: "",
      vehicle: "",
      service: "",
      description: "",
      urgency: "normal"
    });
  };

  const aiResponse = showAIResponse ? generateAIResponse() : null;

  return (
    <section id="schedule" className="py-20 bg-gradient-to-br from-primary/5 to-accent/5">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <Badge variant="secondary" className="mb-4 px-4 py-2">
            <Bot className="mr-2" size={16} />
            Agendamento Inteligente
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            <span className="text-foreground">Agende com </span>
            <span className="text-primary">Nossa IA</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Nossa inteligência artificial analisa seu problema e sugere o melhor 
            horário e serviço para seu veículo em tempo real
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Formulário */}
            <Card className="bg-gradient-card shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MessageSquare className="text-primary" />
                  <span>Conte-nos sobre seu veículo</span>
                </CardTitle>
                <CardDescription>
                  Nossa IA analisará e sugerirá a melhor solução
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
                        className="border-border/50 focus:border-primary"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">WhatsApp *</label>
                      <Input
                        value={formData.phone}
                        onChange={(e) => handleInputChange("phone", e.target.value)}
                        placeholder="(11) 99999-9999"
                        className="border-border/50 focus:border-primary"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center space-x-2">
                      <Car size={16} />
                      <span>Veículo (marca/modelo/ano) *</span>
                    </label>
                    <Input
                      value={formData.vehicle}
                      onChange={(e) => handleInputChange("vehicle", e.target.value)}
                      placeholder="Ex: Honda Civic 2020"
                      className="border-border/50 focus:border-primary"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Tipo de serviço *</label>
                    <select
                      value={formData.service}
                      onChange={(e) => handleInputChange("service", e.target.value)}
                      className="w-full p-3 border border-border/50 rounded-lg focus:border-primary focus:outline-none"
                    >
                      <option value="">Selecione o serviço</option>
                      <option value="Sistema Elétrico">Sistema Elétrico Completo</option>
                      <option value="Bateria">Bateria e Alternador</option>
                      <option value="Injeção Eletrônica">Injeção Eletrônica</option>
                      <option value="Sistema de Ignição">Sistema de Ignição</option>
                      <option value="Alarmes">Alarmes e Travas</option>
                      <option value="Manutenção">Manutenção Preventiva</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Descreva o problema</label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) => handleInputChange("description", e.target.value)}
                      placeholder="Descreva os sintomas ou o que está acontecendo com seu veículo..."
                      rows={4}
                      className="border-border/50 focus:border-primary resize-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Urgência</label>
                    <div className="flex gap-2">
                      {[
                        { value: "low", label: "Posso aguardar", color: "bg-muted" },
                        { value: "normal", label: "Normal", color: "bg-primary" },
                        { value: "high", label: "Urgente", color: "bg-destructive" }
                      ].map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => handleInputChange("urgency", option.value)}
                          className={`px-4 py-2 rounded-lg text-sm transition-all duration-smooth ${
                            formData.urgency === option.value
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
                        <span>IA analisando...</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <Sparkles size={20} />
                        <span>Analisar com IA</span>
                      </div>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Resposta da IA */}
            <Card className={`bg-gradient-glass border-primary/20 transition-all duration-slow ${showAIResponse ? 'opacity-100 scale-100' : 'opacity-30 scale-95'}`}>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Bot className="text-accent" />
                  <span>Análise da IA</span>
                  {showAIResponse && <CheckCircle className="text-success" size={20} />}
                </CardTitle>
                <CardDescription>
                  Resultado da análise inteligente do seu problema
                </CardDescription>
              </CardHeader>
              <CardContent>
                {showAIResponse && aiResponse ? (
                  <div className="space-y-6">
                    <div className="p-4 bg-primary/10 rounded-lg border-l-4 border-primary">
                      <p className="text-sm leading-relaxed">{aiResponse.message}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2 text-muted-foreground">
                          <Clock size={14} />
                          <span>Tempo estimado</span>
                        </div>
                        <p className="font-semibold">{aiResponse.estimatedTime}</p>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2 text-muted-foreground">
                          <span>💰</span>
                          <span>Custo estimado</span>
                        </div>
                        <p className="font-semibold text-primary">{aiResponse.estimatedCost}</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-semibold flex items-center space-x-2">
                        <Calendar size={16} />
                        <span>Horários disponíveis:</span>
                      </h4>
                      <div className="grid gap-2">
                        {aiResponse.timeSlots.map((slot, index) => (
                          <Button
                            key={index}
                            variant="outline"
                            className="justify-between hover:bg-primary hover:text-primary-foreground"
                            onClick={() => confirmScheduling(slot)}
                          >
                            <span>{slot}</span>
                            <CheckCircle size={16} />
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 space-y-4">
                    <Bot size={48} className="text-muted-foreground/50 mx-auto" />
                    <p className="text-muted-foreground">
                      Preencha o formulário para receber análise personalizada da IA
                    </p>
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

export default AIScheduling;