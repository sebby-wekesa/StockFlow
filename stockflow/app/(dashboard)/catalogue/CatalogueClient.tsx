"use client";

import { useState } from "react";
import { SalesOrderForm } from "@/components/SalesOrderForm";

export default function CatalogueClient({ products }: { products: any[] }) {
  const [showOrderForm, setShowOrderForm] = useState(false);

  const formattedProducts = products.map(p => ({
    id: p.id,
    name: p.design.name,
    code: p.design.code,
    availableQty: p.quantity,
    kgProduced: p.kgProduced,
    price: p.price || 0, // Default price if not set
    createdAt: p.createdAt
  }));

  if (showOrderForm) {
    return (
      <div>
        <div className="mb-6">
          <button
            onClick={() => setShowOrderForm(false)}
            className="btn btn-secondary"
          >
            ← Back to Catalogue
          </button>
        </div>
        <SalesOrderForm
          products={formattedProducts}
          onOrderPlaced={() => setShowOrderForm(false)}
        />
      </div>
    );
  }

  return (
    <div>
      <div className="section-header mb-16">
        <div><div className="section-title">Available stock</div><div className="section-sub">Finished goods ready to order</div></div>
        <button className="btn btn-primary" onClick={() => setShowOrderForm(true)}>
          Place Sales Order
        </button>
      </div>
      <div className="product-grid">
        {products.map(p => (
          <div key={p.id} className="product-card">
            <div className="product-name">{p.design.name}</div>
            <div className="product-code">{p.design.code}</div>
            <div style={{fontSize:'12px',color:'var(--muted)'}}>{p.design.description || 'Standard finish'}</div>
            <div className="product-stock">
              <div><div className="product-kg">{p.kgProduced.toFixed(2)} kg</div><div className="product-unit">{p.quantity} units in stock</div></div>
              <div className="text-sm text-gray-600">${p.price?.toFixed(2) || 'TBD'}</div>
            </div>
          </div>
        ))}
        {products.length === 0 && (
          <div style={{ color: 'var(--muted)', padding: '20px' }}>No finished goods available in catalogue.</div>
        )}
      </div>
    </div>
  );
}
