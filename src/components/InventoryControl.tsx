import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Package, 
  Search, 
  Plus, 
  Minus, 
  AlertTriangle, 
  CheckCircle,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Filter
} from "lucide-react";

const InventoryControl = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  // Mock data para demonstração
  const inventoryItems = [
    {
      id: 1,
      name: "Bateria 60Ah",
      category: "Baterias",
      stock: 12,
      minStock: 5,
      maxStock: 20,
      price: 280.00,
      supplier: "Bosch",
      lastEntry: "2024-01-15",
      lastExit: "2024-01-16",
      status: "ok"
    },
    {
      id: 2,
      name: "Alternador Civic",
      category: "Alternadores",
      stock: 2,
      minStock: 3,
      maxStock: 8,
      price: 450.00,
      supplier: "Denso",
      lastEntry: "2024-01-10",
      lastExit: "2024-01-16",
      status: "low"
    },
    {
      id: 3,
      name: "Kit Ignição Corolla",
      category: "Ignição",
      stock: 8,
      minStock: 4,
      maxStock: 15,
      price: 120.00,
      supplier: "NGK",
      lastEntry: "2024-01-14",
      lastExit: "2024-01-15",
      status: "ok"
    },
    {
      id: 4,
      name: "Bobina Individual",
      category: "Ignição",
      stock: 15,
      minStock: 10,
      maxStock: 30,
      price: 85.00,
      supplier: "Bosch",
      lastEntry: "2024-01-12",
      lastExit: "2024-01-16",
      status: "ok"
    },
    {
      id: 5,
      name: "Sensor MAP",
      category: "Sensores",
      stock: 1,
      minStock: 3,
      maxStock: 10,
      price: 95.00,
      supplier: "Magneti Marelli",
      lastEntry: "2024-01-08",
      lastExit: "2024-01-16",
      status: "critical"
    },
    {
      id: 6,
      name: "Chicote Elétrico",
      category: "Chicotes",
      stock: 25,
      minStock: 8,
      maxStock: 40,
      price: 65.00,
      supplier: "National",
      lastEntry: "2024-01-16",
      lastExit: "2024-01-14",
      status: "high"
    }
  ];

  const categories = ["all", "Baterias", "Alternadores", "Ignição", "Sensores", "Chicotes"];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'critical': return 'bg-destructive text-destructive-foreground';
      case 'low': return 'bg-warning text-warning-foreground';
      case 'ok': return 'bg-success text-success-foreground';
      case 'high': return 'bg-primary text-primary-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'critical': return 'Crítico';
      case 'low': return 'Baixo';
      case 'ok': return 'Normal';
      case 'high': return 'Alto';
      default: return 'Normal';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'critical': return <AlertTriangle size={14} />;
      case 'low': return <TrendingDown size={14} />;
      case 'ok': return <CheckCircle size={14} />;
      case 'high': return <TrendingUp size={14} />;
      default: return <CheckCircle size={14} />;
    }
  };

  const filteredItems = inventoryItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.supplier.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const totalItems = inventoryItems.reduce((sum, item) => sum + item.stock, 0);
  const lowStockItems = inventoryItems.filter(item => item.status === 'critical' || item.status === 'low').length;
  const totalValue = inventoryItems.reduce((sum, item) => sum + (item.stock * item.price), 0);

  return (
    <section id="inventory" className="py-20 bg-gradient-to-br from-muted/20 to-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <Badge variant="secondary" className="mb-4 px-4 py-2">
            <Package className="mr-2" size={16} />
            Controle Inteligente
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            <span className="text-foreground">Gestão de </span>
            <span className="text-primary">Estoque</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Sistema completo de controle de entrada e saída de peças com 
            alertas automáticos e relatórios em tempo real
          </p>
        </div>

        <div className="max-w-7xl mx-auto">
          {/* Cards de resumo */}
          <div className="grid md:grid-cols-4 gap-6 mb-8">
            <Card className="bg-gradient-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total de Itens</p>
                    <p className="text-3xl font-bold text-primary">{totalItems}</p>
                  </div>
                  <Package size={32} className="text-primary" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Estoque Baixo</p>
                    <p className="text-3xl font-bold text-warning">{lowStockItems}</p>
                  </div>
                  <AlertTriangle size={32} className="text-warning" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Valor Total</p>
                    <p className="text-3xl font-bold text-success">R$ {totalValue.toLocaleString('pt-BR')}</p>
                  </div>
                  <BarChart3 size={32} className="text-success" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Categorias</p>
                    <p className="text-3xl font-bold text-accent">{categories.length - 1}</p>
                  </div>
                  <Filter size={32} className="text-accent" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filtros */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Search size={20} />
                <span>Filtros e Busca</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <Input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar por nome, categoria ou fornecedor..."
                    className="w-full"
                  />
                </div>
                <div className="flex gap-2 flex-wrap">
                  {categories.map((category) => (
                    <Button
                      key={category}
                      variant={selectedCategory === category ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedCategory(category)}
                      className="capitalize"
                    >
                      {category === "all" ? "Todas" : category}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Lista de itens */}
          <Card>
            <CardHeader>
              <CardTitle>Itens do Estoque</CardTitle>
              <CardDescription>
                {filteredItems.length} item(ns) encontrado(s)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-2">Item</th>
                      <th className="text-left py-3 px-2">Categoria</th>
                      <th className="text-center py-3 px-2">Estoque</th>
                      <th className="text-center py-3 px-2">Status</th>
                      <th className="text-right py-3 px-2">Preço Unit.</th>
                      <th className="text-center py-3 px-2">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map((item) => (
                      <tr key={item.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                        <td className="py-4 px-2">
                          <div>
                            <div className="font-semibold">{item.name}</div>
                            <div className="text-sm text-muted-foreground">
                              Fornecedor: {item.supplier}
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-2">
                          <Badge variant="outline">{item.category}</Badge>
                        </td>
                        <td className="py-4 px-2 text-center">
                          <div className="space-y-1">
                            <div className="font-semibold text-lg">{item.stock}</div>
                            <div className="text-xs text-muted-foreground">
                              Min: {item.minStock} | Máx: {item.maxStock}
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-2 text-center">
                          <Badge className={getStatusColor(item.status)}>
                            {getStatusIcon(item.status)}
                            <span className="ml-1">{getStatusText(item.status)}</span>
                          </Badge>
                        </td>
                        <td className="py-4 px-2 text-right">
                          <div className="font-semibold">
                            R$ {item.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Total: R$ {(item.stock * item.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </div>
                        </td>
                        <td className="py-4 px-2">
                          <div className="flex items-center justify-center space-x-1">
                            <Button size="sm" variant="outline" className="p-2">
                              <Minus size={14} />
                            </Button>
                            <span className="w-8 text-center text-sm font-medium">{item.stock}</span>
                            <Button size="sm" variant="outline" className="p-2">
                              <Plus size={14} />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Alertas de estoque baixo */}
          {lowStockItems > 0 && (
            <Card className="mt-8 border-warning bg-warning/5">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-warning">
                  <AlertTriangle size={20} />
                  <span>Alertas de Estoque</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {inventoryItems
                    .filter(item => item.status === 'critical' || item.status === 'low')
                    .map((item) => (
                      <div
                        key={item.id}
                        className="p-4 rounded-lg border border-warning/20 bg-warning/5"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold">{item.name}</span>
                          <Badge className={getStatusColor(item.status)}>
                            {item.status === 'critical' ? 'CRÍTICO' : 'BAIXO'}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Estoque atual: {item.stock} | Mínimo: {item.minStock}
                        </div>
                        <Button size="sm" className="w-full mt-3" variant="outline">
                          Solicitar Reposição
                        </Button>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </section>
  );
};

export default InventoryControl;