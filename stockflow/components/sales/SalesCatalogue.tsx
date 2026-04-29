"use client";

import { ShoppingCart, Search, Package, DollarSign, TrendingUp, Filter, X } from "lucide-react";
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
      <div className="bg-surface border border-border rounded-2xl p-6 space-y-4">
        <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center flex-1">
            {/* Enhanced Search Bar */}
            <div className="relative flex-1 max-w-lg">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted" size={20} />
              <input
                type="text"
                placeholder="Search products, descriptions, or codes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-surface2 border border-border2 rounded-xl py-3 pl-12 pr-10 text-text placeholder-muted focus:border-accent focus:bg-surface focus:shadow-lg focus:shadow-accent/10 outline-none transition-all duration-200 text-sm"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted hover:text-text transition-colors"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Filter and Sort */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Filter size={16} className="text-muted" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-surface2 border border-border2 rounded-lg px-4 py-2.5 text-sm text-text focus:border-accent focus:bg-surface outline-none transition-all duration-200 min-w-[140px]"
                >
                  <option value="name">Sort by Name</option>
                  <option value="stock">Sort by Stock</option>
                </select>
              </div>
            </div>
          </div>

          {/* Results Counter */}
          <div className="flex items-center gap-2 text-sm">
            <div className="bg-accent/10 text-accent px-3 py-1.5 rounded-lg font-medium">
              {filteredProducts.length.toLocaleString()}
            </div>
            <span className="text-muted">of {products.length.toLocaleString()} products</span>
          </div>
        </div>

        {/* Search Suggestions/Info */}
        {searchTerm && (
          <div className="flex items-center gap-2 text-xs text-muted">
            <span>Searching for:</span>
            <span className="bg-accent/10 text-accent px-2 py-1 rounded font-medium">"{searchTerm}"</span>
          </div>
        )}
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredProducts.map((product) => {
          const price = getPrice(product);
          const stockStatus = getStockStatus(product.stock);
          const totalValue = price * product.stock;

          return (
            <div key={product.id} className="bg-surface border border-border rounded-2xl overflow-hidden group hover:border-accent/40 hover:shadow-xl hover:shadow-accent/5 transition-all duration-300 hover:-translate-y-1">
              <div className="p-6 space-y-5">
                {/* Header */}
                <div className="flex justify-between items-start">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="p-3 bg-gradient-to-br from-accent/10 to-accent/5 rounded-xl border border-accent/20">
                      <Package className="text-accent" size={20} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-mono text-muted uppercase tracking-wider font-semibold">
                        {product.code}
                      </div>
                      <div className={`badge ${stockStatus.class} text-xs mt-2 inline-block`}>
                        {stockStatus.label}
                      </div>
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <div className="text-lg font-mono font-bold text-accent">
                      ${price.toFixed(2)}
                    </div>
                    <div className="text-xs text-muted">per unit</div>
                  </div>
                </div>

                {/* Product Info */}
                <div className="space-y-3">
                  <h3 className="font-head font-bold text-text leading-tight text-lg line-clamp-2">
                    {product.name}
                  </h3>
                  <p className="text-sm text-muted leading-relaxed line-clamp-2">
                    {product.description}
                  </p>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-2 gap-4 py-4 border-t border-border2">
                  <div className="space-y-2">
                    <div className="text-xs font-bold text-muted uppercase tracking-wider">
                      Available Stock
                    </div>
                    <div className="text-2xl font-mono font-bold text-text">
                      {product.stock.toLocaleString()}
                    </div>
                    <div className="text-xs text-muted">units</div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-xs font-bold text-muted uppercase tracking-wider flex items-center gap-1">
                      <TrendingUp size={12} />
                      Total Value
                    </div>
                    <div className="text-2xl font-mono font-bold text-green">
                      ${(totalValue / 1000).toFixed(1)}k
                    </div>
                    <div className="text-xs text-muted">${totalValue.toLocaleString()}</div>
                  </div>
                </div>

                {/* Weight Info */}
                <div className="bg-gradient-to-r from-surface2 to-surface border border-border2 rounded-xl p-4">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-accent rounded-full"></div>
                      <span className="text-muted">Unit: <span className="font-mono text-text">{product.unitWeight}g</span></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-teal rounded-full"></div>
                      <span className="text-muted">Total: <span className="font-mono text-text">{(product.kgProduced / 1000).toFixed(2)}kg</span></span>
                    </div>
                  </div>
                </div>

                {/* Action Button */}
                <button className="w-full flex items-center justify-center gap-3 p-4 bg-gradient-to-r from-accent to-accent2 text-black rounded-xl hover:shadow-lg hover:shadow-accent/20 transition-all duration-200 font-semibold group-hover:scale-[1.02] active:scale-[0.98]">
                  <ShoppingCart size={18} />
                  Add to Order
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredProducts.length === 0 && (
        <div className="text-center py-16">
          <div className="relative inline-block mb-6">
            <div className="p-6 bg-surface2 border border-border2 rounded-2xl">
              <Package size={48} className="text-muted" />
            </div>
            <div className="absolute -top-1 -right-1 w-6 h-6 bg-accent rounded-full flex items-center justify-center">
              <Search size={12} className="text-black" />
            </div>
          </div>
          <h3 className="text-xl font-head font-bold text-text mb-3">
            {searchTerm ? "No products match your search" : "No products available"}
          </h3>
          <p className="text-muted max-w-md mx-auto">
            {searchTerm
              ? `We couldn't find any products matching "${searchTerm}". Try different keywords or clear your search.`
              : "There are currently no products available in your catalogue."
            }
          </p>
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="mt-6 px-6 py-2 bg-accent text-black rounded-lg hover:bg-accent2 transition-colors font-medium"
            >
              Clear Search
            </button>
          )}
        </div>
      )}
    </div>
  );
}