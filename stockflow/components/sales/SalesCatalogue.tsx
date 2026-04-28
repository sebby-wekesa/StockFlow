"use client";

import { ShoppingCart, Search, Package, DollarSign, TrendingUp, Filter } from "lucide-react";
import { useState } from "react";

export function SalesCatalogue({ products }: { products: any[] }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("name");

  const filteredProducts = products
    .filter(p =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.code.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      switch (sortBy) {
        case "stock":
          return b.stock - a.stock;
        case "name":
        default:
          return a.name.localeCompare(b.name);
      }
    });

  // Mock pricing logic - in a real app this would come from the database
  const getPrice = (product: any) => {
    // Base price on unit weight with some variation
    const basePrice = product.unitWeight * 2.5;
    return Math.round(basePrice * 100) / 100;
  };

  const getStockStatus = (stock: number) => {
    if (stock === 0) return { label: "Out of Stock", class: "badge-red" };
    if (stock < 50) return { label: "Low Stock", class: "badge-amber" };
    return { label: "In Stock", class: "badge-green" };
  };

  return (
    <div className="space-y-6">
      {/* Controls Section */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-3 text-muted" size={18} />
            <input
              type="text"
              placeholder="Search products, descriptions, or codes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-surface border border-border rounded-xl p-3 pl-10 text-text focus:border-accent outline-none transition-all"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-muted" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text focus:border-accent outline-none"
            >
              <option value="name">Sort by Name</option>
              <option value="stock">Sort by Stock</option>
            </select>
          </div>
        </div>
        <div className="text-sm text-muted">
          Showing {filteredProducts.length} of {products.length} products
        </div>
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredProducts.map((product) => {
          const price = getPrice(product);
          const stockStatus = getStockStatus(product.stock);
          const totalValue = price * product.stock;

          return (
            <div key={product.id} className="bg-surface border border-border rounded-2xl overflow-hidden group hover:border-accent/30 transition-all hover:shadow-lg">
              <div className="p-6 space-y-4">
                {/* Header */}
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-surface2 rounded-xl text-accent">
                      <Package size={20} />
                    </div>
                    <div>
                      <div className="text-xs font-mono text-muted uppercase tracking-wider">
                        {product.code}
                      </div>
                      <div className={`badge ${stockStatus.class} text-xs mt-1`}>
                        {stockStatus.label}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-mono font-bold text-accent">
                      ${price.toFixed(2)}
                    </div>
                    <div className="text-xs text-muted">per unit</div>
                  </div>
                </div>

                {/* Product Info */}
                <div className="space-y-2">
                  <h3 className="font-head font-bold text-text leading-tight text-lg">
                    {product.name}
                  </h3>
                  <p className="text-sm text-muted leading-relaxed">
                    {product.description}
                  </p>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-2 gap-4 py-4 border-t border-border">
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-muted uppercase tracking-wider">
                      Available Stock
                    </div>
                    <div className="text-xl font-mono font-bold text-text">
                      {product.stock.toLocaleString()}
                    </div>
                    <div className="text-xs text-muted">units</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-muted uppercase tracking-wider flex items-center gap-1">
                      <TrendingUp size={12} />
                      Total Value
                    </div>
                    <div className="text-xl font-mono font-bold text-green">
                      ${(totalValue / 1000).toFixed(1)}k
                    </div>
                    <div className="text-xs text-muted">${totalValue.toLocaleString()}</div>
                  </div>
                </div>

                {/* Weight Info */}
                <div className="flex items-center justify-between text-xs text-muted bg-surface2 rounded-lg p-3">
                  <span>Unit Weight: {product.unitWeight}g</span>
                  <span>Total: {(product.kgProduced / 1000).toFixed(2)}kg produced</span>
                </div>

                {/* Action Button */}
                <button className="w-full flex items-center justify-center gap-2 p-3 bg-accent text-black rounded-xl hover:bg-accent2 transition-colors font-semibold shadow-lg shadow-accent/10 group-hover:shadow-accent/20">
                  <ShoppingCart size={18} />
                  Add to Order
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredProducts.length === 0 && (
        <div className="text-center py-12">
          <Package size={48} className="text-muted mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-text mb-2">No products found</h3>
          <p className="text-muted">Try adjusting your search terms or filters.</p>
        </div>
      )}
    </div>
  );
}