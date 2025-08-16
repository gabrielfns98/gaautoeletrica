import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Search, 
  Car, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Wrench,
  MapPin,
  Phone,
  Calendar,
  Activity
} from "lucide-react";

const VehicleTracking = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null);

  // Mock data para demonstração
  const vehicles = [
    {
      id: "OS001",
      client: "João Silva",
      vehicle: "Honda Civic 2020",
      plate: "ABC-1234",
      phone: "(11) 99999-1111",
      service: "Sistema Elétrico Completo",
      status: "in_progress",
      progress: 65,
      estimatedCompletion: "16:30 - Hoje",
      currentStep: "Teste de componentes",
      technician: "Carlos Santos",
      location: "Box 2",
      timeline: [
        { step: "Recepção", time: "08:30", completed: true },
        { step: "Diagnóstico inicial", time: "09:15", completed: true },
        { step: "Desmontagem", time: "10:00", completed: true },
        { step: "Teste de componentes", time: "13:00", completed: false, current: true },
        { step: "Reparo/Substituição", time: "14:30", completed: false },
        { step: "Testes finais", time: "15:45", completed: false },
        { step: "Entrega", time: "16:30", completed: false }
      ]
    },
    {
      id: "OS002",
      client: "Maria Oliveira",
      vehicle: "Toyota Corolla 2018",
      plate: "XYZ-5678",
      phone: "(11) 88888-2222",
      service: "Bateria e Alternador",
      status: "waiting_parts",
      progress: 40,
      estimatedCompletion: "10:00 - Amanhã",
      currentStep: "Aguardando peças",
      technician: "Roberto Lima",
      location: "Box 1",
      timeline: [
        { step: "Recepção", time: "14:00", completed: true },
        { step: "Diagnóstico inicial", time: "14:30", completed: true },
        { step: "Aguardando peças", time: "15:00", completed: false, current: true },
        { step: "Instalação", time: "09:00", completed: false },
        { step: "Testes", time: "09:30", completed: false },
        { step: "Entrega", time: "10:00", completed: false }
      ]
    },
    {
      id: "OS003",
      client: "Pedro Costa",
      vehicle: "VW Golf 2019",
      plate: "DEF-9012",
      phone: "(11) 77777-3333",
      service: "Injeção Eletrônica",
      status: "completed",
      progress: 100,
      estimatedCompletion: "Concluído",
      currentStep: "Pronto para retirada",
      technician: "Ana Carolina",
      location: "Área de entrega",
      timeline: [
        { step: "Recepção", time: "08:00", completed: true },
        { step: "Diagnóstico", time: "08:30", completed: true },
        { step: "Limpeza de bicos", time: "10:00", completed: true },
        { step: "Reprogramação ECU", time: "14:00", completed: true },
        { step: "Testes finais", time: "15:30", completed: true },
        { step: "Entrega", time: "16:00", completed: true, current: true }
      ]
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in_progress': return 'bg-primary text-primary-foreground';
      case 'waiting_parts': return 'bg-warning text-warning-foreground';
      case 'completed': return 'bg-success text-success-foreground';
      case 'delayed': return 'bg-destructive text-destructive-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'in_progress': return <Wrench size={16} />;
      case 'waiting_parts': return <AlertCircle size={16} />;
      case 'completed': return <CheckCircle size={16} />;
      default: return <Clock size={16} />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'in_progress': return 'Em Andamento';
      case 'waiting_parts': return 'Aguardando Peças';
      case 'completed': return 'Concluído';
      case 'delayed': return 'Atrasado';
      default: return 'Pendente';
    }
  };

  const filteredVehicles = vehicles.filter(vehicle =>
    vehicle.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vehicle.plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vehicle.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <section id="tracking" className="py-20 bg-gradient-to-br from-background to-secondary/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <Badge variant="secondary" className="mb-4 px-4 py-2">
            <Activity className="mr-2" size={16} />
            Acompanhamento em Tempo Real
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            <span className="text-foreground">Status do </span>
            <span className="text-primary">Seu Veículo</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Acompanhe cada etapa do serviço em tempo real com notificações 
            automáticas e transparência total do processo
          </p>
        </div>

        <div className="max-w-6xl mx-auto">
          {/* Busca */}
          <div className="mb-8">
            <div className="relative max-w-md mx-auto">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={20} />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por placa, nome ou OS..."
                className="pl-10 py-3 text-center"
              />
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Lista de veículos */}
            <div className="lg:col-span-1 space-y-4">
              <h3 className="font-semibold text-lg mb-4">Veículos em serviço</h3>
              {filteredVehicles.map((vehicle) => (
                <Card 
                  key={vehicle.id}
                  className={`cursor-pointer transition-all duration-smooth hover:shadow-lg ${
                    selectedVehicle?.id === vehicle.id ? 'ring-2 ring-primary shadow-glow' : ''
                  }`}
                  onClick={() => setSelectedVehicle(vehicle)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-semibold">OS {vehicle.id}</span>
                      <Badge className={getStatusColor(vehicle.status)}>
                        {getStatusIcon(vehicle.status)}
                        <span className="ml-1">{getStatusText(vehicle.status)}</span>
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2 text-sm">
                        <Car size={14} />
                        <span>{vehicle.vehicle}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                        <span className="font-mono">{vehicle.plate}</span>
                        <span>•</span>
                        <span>{vehicle.client}</span>
                      </div>
                      <div className="mt-3">
                        <div className="flex justify-between text-xs mb-1">
                          <span>Progresso</span>
                          <span>{vehicle.progress}%</span>
                        </div>
                        <Progress value={vehicle.progress} className="h-2" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Detalhes do veículo selecionado */}
            <div className="lg:col-span-2">
              {selectedVehicle ? (
                <Card className="bg-gradient-card shadow-lg">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-2xl">
                        OS {selectedVehicle.id} - {selectedVehicle.vehicle}
                      </CardTitle>
                      <Badge className={getStatusColor(selectedVehicle.status)} variant="secondary">
                        {getStatusIcon(selectedVehicle.status)}
                        <span className="ml-1">{getStatusText(selectedVehicle.status)}</span>
                      </Badge>
                    </div>
                    <CardDescription className="text-base">
                      {selectedVehicle.service} • {selectedVehicle.currentStep}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 gap-6 mb-8">
                      {/* Informações do cliente */}
                      <div className="space-y-4">
                        <h4 className="font-semibold">Informações do Cliente</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center space-x-2">
                            <span className="w-20 text-muted-foreground">Cliente:</span>
                            <span>{selectedVehicle.client}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Phone size={14} />
                            <span className="w-20 text-muted-foreground">Telefone:</span>
                            <span>{selectedVehicle.phone}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="w-20 text-muted-foreground">Placa:</span>
                            <span className="font-mono">{selectedVehicle.plate}</span>
                          </div>
                        </div>
                      </div>

                      {/* Informações do serviço */}
                      <div className="space-y-4">
                        <h4 className="font-semibold">Informações do Serviço</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center space-x-2">
                            <Wrench size={14} />
                            <span className="w-20 text-muted-foreground">Técnico:</span>
                            <span>{selectedVehicle.technician}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <MapPin size={14} />
                            <span className="w-20 text-muted-foreground">Local:</span>
                            <span>{selectedVehicle.location}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Clock size={14} />
                            <span className="w-20 text-muted-foreground">Previsão:</span>
                            <span>{selectedVehicle.estimatedCompletion}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Timeline do serviço */}
                    <div>
                      <h4 className="font-semibold mb-4">Timeline do Serviço</h4>
                      <div className="space-y-4">
                        {selectedVehicle.timeline.map((step: any, index: number) => (
                          <div key={index} className="flex items-center space-x-4">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-smooth ${
                              step.completed 
                                ? 'bg-success text-success-foreground' 
                                : step.current 
                                ? 'bg-primary text-primary-foreground animate-pulse' 
                                : 'bg-muted text-muted-foreground'
                            }`}>
                              {step.completed ? (
                                <CheckCircle size={20} />
                              ) : step.current ? (
                                <Clock size={20} />
                              ) : (
                                <span className="text-sm">{index + 1}</span>
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <span className={`font-medium ${step.current ? 'text-primary' : ''}`}>
                                  {step.step}
                                </span>
                                <span className="text-sm text-muted-foreground">
                                  {step.time}
                                </span>
                              </div>
                              {step.current && (
                                <p className="text-sm text-primary mt-1">
                                  Etapa atual - Em andamento
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-4 mt-8">
                      <Button 
                        className="flex-1"
                        onClick={() => window.open(`https://wa.me/${selectedVehicle.phone.replace(/\D/g, '')}`)}
                      >
                        <Phone size={16} className="mr-2" />
                        Entrar em Contato
                      </Button>
                      <Button variant="outline" className="flex-1">
                        <MapPin size={16} className="mr-2" />
                        Ver no Mapa
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="bg-gradient-glass">
                  <CardContent className="text-center py-12">
                    <Car size={48} className="text-muted-foreground/50 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold mb-2">Selecione um veículo</h3>
                    <p className="text-muted-foreground">
                      Escolha um veículo da lista para ver os detalhes completos do serviço
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default VehicleTracking;