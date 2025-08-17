import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar, Phone, User, Car } from "lucide-react";
import { toast } from "sonner";

interface FormData {
  name: string;
  phone: string;
  vehicle: string;
  problem: string;
}

const AppointmentSection = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: "",
    phone: "",
    vehicle: "",
    problem: ""
  });

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const sendToWhatsApp = () => {
    if (!formData.name || !formData.phone || !formData.vehicle || !formData.problem) {
      toast.error("Por favor, preencha todos os campos!");
      return;
    }

    const message = `*Nova Solicitação de Agendamento*
    
*Nome:* ${formData.name}
*Telefone:* ${formData.phone}
*Veículo:* ${formData.vehicle}
*Problema:* ${formData.problem}

Enviado pelo site G.A Auto Elétrica`;

    const whatsappNumber = "5511999999999"; // Replace with actual WhatsApp number
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodedMessage}`;
    
    window.open(whatsappUrl, '_blank');
    
    // Reset form and close dialog
    setFormData({ name: "", phone: "", vehicle: "", problem: "" });
    setIsDialogOpen(false);
    toast.success("Redirecionando para WhatsApp...");
  };

  return (
    <section className="py-20 bg-gradient-to-br from-background to-secondary/20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Precisa de Atendimento?
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Agende seu serviço de forma rápida e prática
          </p>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                size="lg" 
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-8 py-3 rounded-lg shadow-lg"
              >
                <Calendar className="w-5 h-5 mr-2" />
                Agende Agora
              </Button>
            </DialogTrigger>
            
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold text-center">
                  Solicitação de Agendamento
                </DialogTitle>
              </DialogHeader>
              
              <Card className="border-0 shadow-none">
                <CardContent className="space-y-6 pt-6">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Nome Completo
                    </Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleInputChange("name", e.target.value)}
                      placeholder="Seu nome completo"
                      className="w-full"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      Telefone
                    </Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => handleInputChange("phone", e.target.value)}
                      placeholder="(11) 99999-9999"
                      className="w-full"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="vehicle" className="flex items-center gap-2">
                      <Car className="w-4 h-4" />
                      Veículo
                    </Label>
                    <Input
                      id="vehicle"
                      value={formData.vehicle}
                      onChange={(e) => handleInputChange("vehicle", e.target.value)}
                      placeholder="Ex: Honda Civic 2020"
                      className="w-full"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="problem">Descreva o Problema</Label>
                    <Textarea
                      id="problem"
                      value={formData.problem}
                      onChange={(e) => handleInputChange("problem", e.target.value)}
                      placeholder="Descreva detalhadamente o problema do seu veículo..."
                      className="w-full min-h-[120px] resize-none"
                    />
                  </div>
                  
                  <Button 
                    onClick={sendToWhatsApp}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3"
                  >
                    <Phone className="w-5 h-5 mr-2" />
                    Enviar via WhatsApp
                  </Button>
                </CardContent>
              </Card>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </section>
  );
};

export default AppointmentSection;