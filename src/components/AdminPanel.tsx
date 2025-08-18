import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAdmin } from '@/hooks/useAdmin';
import { supabase } from '@/integrations/supabase/client';
import { Wrench, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface Service {
  id: string;
  service_type: string;
  status: string;
  created_at: string;
  scheduled_date: string | null;
  vehicle: {
    brand: string;
    model: string;
    plate: string;
  };
  profile: {
    full_name: string | null;
  };
}

const AdminPanel = () => {
  const { isAdmin, loading: adminLoading } = useAdmin();
  const { toast } = useToast();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isAdmin) {
      fetchServices();
    }
  }, [isAdmin]);

  const fetchServices = async () => {
    try {
      const { data, error } = await supabase
        .from('services')
        .select(`
          id,
          service_type,
          status,
          created_at,
          scheduled_date,
          vehicles:vehicle_id (
            brand,
            model,
            plate
          ),
          profiles:user_id (
            full_name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching services:', error);
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Não foi possível carregar os serviços.",
        });
      } else {
        // Transform data to match interface
        const transformedData = data?.map(service => ({
          ...service,
          vehicle: service.vehicles as any,
          profile: service.profiles as any
        })) || [];
        setServices(transformedData);
      }
    } catch (error) {
      console.error('Error fetching services:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateServiceStatus = async (serviceId: string, newStatus: string) => {
    try {
      const updateData: any = { status: newStatus };
      
      // If marking as completed, set the completed_date
      if (newStatus === 'completed') {
        updateData.completed_date = new Date().toISOString();
      }

      const { error } = await supabase
        .from('services')
        .update(updateData)
        .eq('id', serviceId);

      if (error) {
        console.error('Error updating service:', error);
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Não foi possível atualizar o status do serviço.",
        });
      } else {
        toast({
          title: "Status atualizado",
          description: "Status do serviço atualizado com sucesso.",
        });
        fetchServices(); // Refresh the list
      }
    } catch (error) {
      console.error('Error updating service:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'in_progress': return <Wrench className="h-4 w-4" />;
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'cancelled': return <XCircle className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'secondary';
      case 'in_progress': return 'default';
      case 'completed': return 'default';
      case 'cancelled': return 'destructive';
      default: return 'secondary';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Pendente';
      case 'in_progress': return 'Em Andamento';
      case 'completed': return 'Concluído';
      case 'cancelled': return 'Cancelado';
      default: return status;
    }
  };

  if (adminLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground">Acesso negado. Apenas administradores podem ver este painel.</p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wrench className="h-5 w-5" />
          Painel do Administrador
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {services.length === 0 ? (
            <p className="text-muted-foreground">Nenhum serviço encontrado.</p>
          ) : (
            services.map((service) => (
              <Card key={service.id} className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {getStatusIcon(service.status)}
                      <Badge variant={getStatusColor(service.status)}>
                        {getStatusText(service.status)}
                      </Badge>
                    </div>
                    <h3 className="font-semibold">{service.service_type}</h3>
                    <p className="text-sm text-muted-foreground">
                      {service.vehicle?.brand} {service.vehicle?.model} - {service.vehicle?.plate}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Cliente: {service.profile?.full_name || 'N/A'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Criado em: {new Date(service.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Select
                      value={service.status}
                      onValueChange={(value) => updateServiceStatus(service.id, value)}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pendente</SelectItem>
                        <SelectItem value="in_progress">Em Andamento</SelectItem>
                        <SelectItem value="completed">Concluído</SelectItem>
                        <SelectItem value="cancelled">Cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminPanel;