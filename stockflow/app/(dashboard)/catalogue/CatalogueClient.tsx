"use client";

import { useState } from "react";
import { Modal } from "@/components/Modal";

export default function CatalogueClient({ products }: { products: any[] }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  const handleOrder = (p: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedProduct(p);
    setModalOpen(true);
  };

  return (
    <div>
      <div className="section-header mb-16">
        <div><div className="section-title">Available stock</div><div className="section-sub">Finished goods ready to order</div></div>
      </div>
      <div className="product-grid">
        {products.map(p => (
          <div key={p.id} className="product-card" onClick={(e) => handleOrder(p, e)}>
            <div className="product-name">{p.design.name}</div>
            <div className="product-code">{p.design.code}</div>
            <div style={{fontSize:'12px',color:'var(--muted)'}}>{p.design.description || 'Standard finish'}</div>
            <div className="product-stock">
              <div><div className="product-kg">{p.kgProduced.toFixed(2)} kg</div><div className="product-unit">{p.quantity} units in stock</div></div>
              <button className="btn btn-teal btn-sm" onClick={(e) => handleOrder(p, e)}>Order</button>
            </div>
          </div>
        ))}
        {products.length === 0 && (
          <div style={{ color: 'var(--muted)', padding: '20px' }}>No finished goods available in catalogue.</div>
        )}
      </div>

      <Modal isOpen={modalOpen} onClose={() => { setModalOpen(false); setSelectedProduct(null); }}>
        <div>
          <div className="modal-title">Place sale order</div>
          <div className="modal-sub">
            {selectedProduct 
              ? `${selectedProduct.design.name} — ${selectedProduct.quantity} units / ${selectedProduct.kgProduced.toFixed(2)} kg available`
              : 'Loading product details...'}
          </div>
          <form action={async () => { 'use server'; console.log("Order bypassed"); setModalOpen(false); }}>
            <div className="form-row">
              <div className="form-group"><label className="form-label">Quantity (units)</label><input className="form-input" type="number" placeholder={`max ${selectedProduct?.quantity}`}/></div>
              <div className="form-group"><label className="form-label">Client</label><input className="form-input" placeholder="Client name"/></div>
            </div>
            <div className="form-group mb-16"><label className="form-label">Notes</label><input className="form-input" placeholder="Optional delivery notes"/></div>
            <button type="submit" className="btn btn-teal">Place order → packaging</button>
          </form>
        </div>
      </Modal>
    </div>
  );
}
