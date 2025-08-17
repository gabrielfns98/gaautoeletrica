import { useState, useEffect } from "react";
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
  Activity,
  LogIn
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const VehicleTracking = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchUserVehicles();
    }
  }, [user]);

  const fetchUserVehicles = async () => {
    setLoading(true);
    try {
      // Fetch user's vehicles
      const { data: vehiclesData, error: vehiclesError } = await supabase
        .from('vehicles')
        .select('*')
        .eq('user_id', user?.id);

      if (vehiclesError) throw vehiclesError;

      // Fetch user's services with vehicle information
      const { data: servicesData, error: servicesError } = await supabase
        .from('services')
        .select(`
          *,
          vehicles (
            id,
            brand,
            model,
            year,
            plate,
            color
          )
        `)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (servicesError) throw servicesError;

      setVehicles(vehiclesData || []);
      setServices(servicesData || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar dados",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in_progress': return 'bg-primary text-primary-foreground';
      case 'pending': return 'bg-warning text-warning-foreground';
      case 'completed': return 'bg-success text-success-foreground';
      case 'cancelled': return 'bg-destructive text-destructive-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'in_progress': return <Wrench size={16} />;
      case 'pending': return <Clock size={16} />;
      case 'completed': return <CheckCircle size={16} />;
      case 'cancelled': return <AlertCircle size={16} />;
      default: return <Clock size={16} />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'in_progress': return 'Em Andamento';
      case 'pending': return 'Pendente';
      case 'completed': return 'Concluído';
      case 'cancelled': return 'Cancelado';
      default: return 'Pendente';
    }
  };

  const getProgressValue = (status: string) => {
    switch (status) {
      case 'pending': return 10;
      case 'in_progress': return 50;
      case 'completed': return 100;
      case 'cancelled': return 0;
      default: return 0;
    }
  };

  const filteredServices = services.filter(service =>
    service.vehicles?.plate?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    service.service_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    service.id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!user) {
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
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
              Acompanhe cada etapa do serviço em tempo real com notificações 
              automáticas e transparência total do processo
            </p>
          </div>

          <div className="max-w-md mx-auto">
            <Card className="bg-gradient-card shadow-lg">
              <CardContent className="text-center py-12">
                <LogIn size={48} className="text-muted-foreground/50 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Login Necessário</h3>
                <p className="text-muted-foreground mb-6">
                  Para acompanhar o status dos seus veículos, você precisa estar logado
                </p>
                <Button 
                  className="bg-gradient-primary shadow-glow hover:shadow-lg transition-all duration-smooth"
                  onClick={() => window.location.href = '/auth'}
                >
                  Fazer Login
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    );
  }

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
                placeholder="Buscar por placa ou tipo de serviço..."
                className="pl-10 py-3 text-center"
              />
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Carregando seus serviços...</p>
            </div>
          ) : filteredServices.length === 0 ? (
            <Card className="bg-gradient-glass">
              <CardContent className="text-center py-12">
                <Car size={48} className="text-muted-foreground/50 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Nenhum serviço encontrado</h3>
                <p className="text-muted-foreground">
                  {services.length === 0 
                    ? "Você ainda não possui serviços cadastrados. Entre em contato conosco para agendar um serviço."
                    : "Nenhum serviço encontrado com os termos de busca."
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Lista de serviços */}
              <div className="lg:col-span-1 space-y-4">
                <h3 className="font-semibold text-lg mb-4">Seus serviços</h3>
                {filteredServices.map((service) => (
                  <Card 
                    key={service.id}
                    className={`cursor-pointer transition-all duration-smooth hover:shadow-lg ${
                      selectedVehicle?.id === service.id ? 'ring-2 ring-primary shadow-glow' : ''
                    }`}
                    onClick={() => setSelectedVehicle(service)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-semibold text-sm">#{service.id.split('-')[0]}</span>
                        <Badge className={getStatusColor(service.status)}>
                          {getStatusIcon(service.status)}
                          <span className="ml-1">{getStatusText(service.status)}</span>
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2 text-sm">
                          <Car size={14} />
                          <span>
                            {service.vehicles?.brand} {service.vehicles?.model} {service.vehicles?.year}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                          <span className="font-mono">{service.vehicles?.plate}</span>
                          <span>•</span>
                          <span>{service.service_type}</span>
                        </div>
                        <div className="mt-3">
                          <div className="flex justify-between text-xs mb-1">
                            <span>Progresso</span>
                            <span>{getProgressValue(service.status)}%</span>
                          </div>
                          <Progress value={getProgressValue(service.status)} className="h-2" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Detalhes do serviço selecionado */}
              <div className="lg:col-span-2">
                {selectedVehicle ? (
                  <Card className="bg-gradient-card shadow-lg">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-2xl">
                          {selectedVehicle.vehicles?.brand} {selectedVehicle.vehicles?.model} {selectedVehicle.vehicles?.year}
                        </CardTitle>
                        <Badge className={getStatusColor(selectedVehicle.status)} variant="secondary">
                          {getStatusIcon(selectedVehicle.status)}
                          <span className="ml-1">{getStatusText(selectedVehicle.status)}</span>
                        </Badge>
                      </div>
                      <CardDescription className="text-base">
                        {selectedVehicle.service_type}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid md:grid-cols-2 gap-6 mb-8">
                        {/* Informações do veículo */}
                        <div className="space-y-4">
                          <h4 className="font-semibold">Informações do Veículo</h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center space-x-2">
                              <span className="w-20 text-muted-foreground">Placa:</span>
                              <span className="font-mono">{selectedVehicle.vehicles?.plate}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className="w-20 text-muted-foreground">Cor:</span>
                              <span>{selectedVehicle.vehicles?.color}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className="w-20 text-muted-foreground">Modelo:</span>
                              <span>
                                {selectedVehicle.vehicles?.brand} {selectedVehicle.vehicles?.model}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Informações do serviço */}
                        <div className="space-y-4">
                          <h4 className="font-semibold">Informações do Serviço</h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center space-x-2">
                              <span className="w-20 text-muted-foreground">Tipo:</span>
                              <span>{selectedVehicle.service_type}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className="w-20 text-muted-foreground">Agendado:</span>
                              <span>
                                {selectedVehicle.scheduled_date 
                                  ? new Date(selectedVehicle.scheduled_date).toLocaleDateString('pt-BR')
                                  : 'Não agendado'
                                }
                              </span>
                            </div>
                            {selectedVehicle.completed_date && (
                              <div className="flex items-center space-x-2">
                                <span className="w-20 text-muted-foreground">Concluído:</span>
                                <span>
                                  {new Date(selectedVehicle.completed_date).toLocaleDateString('pt-BR')}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Descrição do serviço */}
                      {selectedVehicle.description && (
                        <div className="mb-8">
                          <h4 className="font-semibold mb-2">Descrição</h4>
                          <p className="text-sm text-muted-foreground bg-muted/50 p-4 rounded-lg">
                            {selectedVehicle.description}
                          </p>
                        </div>
                      )}

                      <div className="flex gap-4 mt-8">
                        <Button 
                          className="flex-1"
                          onClick={() => document.getElementById("support")?.scrollIntoView({ behavior: "smooth" })}
                        >
                          <Phone size={16} className="mr-2" />
                          Entrar em Contato
                        </Button>
                        <Button variant="outline" className="flex-1">
                          <MapPin size={16} className="mr-2" />
                          Nossa Localização
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="bg-gradient-glass">
                    <CardContent className="text-center py-12">
                      <Car size={48} className="text-muted-foreground/50 mx-auto mb-4" />
                      <h3 className="text-xl font-semibold mb-2">Selecione um serviço</h3>
                      <p className="text-muted-foreground">
                        Escolha um serviço da lista para ver os detalhes completos
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default VehicleTracking;