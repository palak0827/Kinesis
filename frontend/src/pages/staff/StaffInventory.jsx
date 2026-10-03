import React, { useState, useEffect } from 'react';
import { supabase } from '@backend/services/supabaseClient.js';
import { getProductImage } from '../../utils/productImages.js';
import CurrentDate from '../../components/CurrentDate.jsx';

export default function StaffInventory() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Edit stock modal/inline state
  const [editingProduct, setEditingProduct] = useState(null);
  const [newStockQty, setNewStockQty] = useState('');
  const [newAvailability, setNewAvailability] = useState('AVAILABLE');
  const [saving, setSaving] = useState(false);

  // User feedback alerts
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const loadProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('id');

      if (error) throw error;
      setProducts(data || []);
    } catch (err) {
      console.error('Error loading inventory products:', err);
      setErrorMessage('Failed to load inventory. Please check database connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  // Quick helper to determine effective availability
  const getEffectiveStatus = (p) => {
    if (p.stock_quantity === 0) return 'OUT_OF_STOCK';
    if (p.availability_status) return p.availability_status;
    return 'AVAILABLE';
  };

  // Open Edit Dialog
  const handleOpenEdit = (product) => {
    setEditingProduct(product);
    setNewStockQty(product.stock_quantity.toString());
    setNewAvailability(product.availability_status || (product.stock_quantity === 0 ? 'OUT_OF_STOCK' : 'AVAILABLE'));
    setSuccessMessage('');
    setErrorMessage('');
  };

  const handleCloseEdit = () => {
    setEditingProduct(null);
    setNewStockQty('');
    setNewAvailability('AVAILABLE');
  };

  // Save updated stock & availability
  const handleSaveStock = async (e) => {
    e.preventDefault();
    if (!editingProduct) return;

    const parsedQty = parseInt(newStockQty, 10);
    if (isNaN(parsedQty) || parsedQty < 0) {
      setErrorMessage('Stock quantity must be a non-negative integer (0 or greater).');
      return;
    }

    setSaving(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      // Auto rule: stock = 0 forces OUT_OF_STOCK
      let finalAvailability = newAvailability;
      if (parsedQty === 0) {
        finalAvailability = 'OUT_OF_STOCK';
      } else if (finalAvailability === 'OUT_OF_STOCK' && parsedQty > 0) {
        // If stock is added back and it was OUT_OF_STOCK, switch to AVAILABLE
        finalAvailability = 'AVAILABLE';
      }

      // Try update with availability_status first
      const updatePayload = {
        stock_quantity: parsedQty,
        availability_status: finalAvailability
      };

      let { data, error } = await supabase
        .from('products')
        .update(updatePayload)
        .eq('id', editingProduct.id)
        .select();

      // Fallback if availability_status column not yet migrated in PostgreSQL:
      if (error && error.message?.includes('availability_status')) {
        const fallbackRes = await supabase
          .from('products')
          .update({ stock_quantity: parsedQty })
          .eq('id', editingProduct.id)
          .select();
        if (fallbackRes.error) throw fallbackRes.error;
        data = fallbackRes.data;
      } else if (error) {
        throw error;
      }

      // Optimistically update local list
      setProducts(prev =>
        prev.map(p =>
          p.id === editingProduct.id
            ? { ...p, stock_quantity: parsedQty, availability_status: finalAvailability }
            : p
        )
      );

      setSuccessMessage(`Successfully updated "${editingProduct.name}" — Stock: ${parsedQty} units (${finalAvailability}).`);
      handleCloseEdit();
    } catch (err) {
      console.error('Error updating product stock:', err);
      setErrorMessage(err.message || 'Failed to update stock. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Quick toggle between AVAILABLE and TEMPORARILY_UNAVAILABLE
  const handleQuickToggleAvailability = async (product) => {
    const currentStatus = getEffectiveStatus(product);
    if (product.stock_quantity === 0) {
      setErrorMessage('Cannot mark product with 0 stock as Available. Please replenish stock first.');
      return;
    }

    const nextStatus = currentStatus === 'TEMPORARILY_UNAVAILABLE' ? 'AVAILABLE' : 'TEMPORARILY_UNAVAILABLE';
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const { error } = await supabase
        .from('products')
        .update({ availability_status: nextStatus })
        .eq('id', product.id);

      if (error && !error.message?.includes('availability_status')) {
        throw error;
      }

      setProducts(prev =>
        prev.map(p => (p.id === product.id ? { ...p, availability_status: nextStatus } : p))
      );

      setSuccessMessage(`Availability for "${product.name}" changed to ${nextStatus}.`);
    } catch (err) {
      console.error('Error toggling availability:', err);
      setErrorMessage(err.message || 'Failed to update availability.');
    }
  };

  // Filter products
  const categories = ['ALL', ...new Set(products.map(p => p.category).filter(Boolean))];

  const filteredProducts = products.filter(p => {
    const matchesSearch = (p.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (p.category || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'ALL' || p.category === categoryFilter;
    const effectiveStatus = getEffectiveStatus(p);
    const matchesStatus = statusFilter === 'ALL' || effectiveStatus === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  if (loading) {
    return <div style={{ padding: '2rem', color: 'var(--text-muted)' }}>Loading inventory catalog...</div>;
  }

  return (
    <div style={{ maxWidth: '1200px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '2.2rem' }}>Staff Inventory Management</h1>
          <p style={{ margin: '0.4rem 0 0 0', color: 'var(--text-muted)' }}>
            Real-time stock control, replenishment thresholds, and item availability
          </p>
        </div>
        <CurrentDate />
      </div>

      {/* Notifications */}
      {successMessage && (
        <div style={{
          background: 'rgba(16, 185, 129, 0.1)',
          color: '#10b981',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          padding: '0.9rem 1.25rem',
          borderRadius: 'var(--radius-sm)',
          marginBottom: '1.5rem',
          fontWeight: 500,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>✓ {successMessage}</span>
          <button onClick={() => setSuccessMessage('')} style={{ background: 'none', border: 'none', color: '#10b981', cursor: 'pointer', fontWeight: 'bold' }}>×</button>
        </div>
      )}

      {errorMessage && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.1)',
          color: '#ef4444',
          border: '1px solid rgba(239, 68, 68, 0.25)',
          padding: '0.9rem 1.25rem',
          borderRadius: 'var(--radius-sm)',
          marginBottom: '1.5rem',
          fontWeight: 500,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>⚠️ {errorMessage}</span>
          <button onClick={() => setErrorMessage('')} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: 'bold' }}>×</button>
        </div>
      )}

      {/* Search and Filters Bar */}
      <div className="card" style={{ marginBottom: '2rem', padding: '1.25rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          
          <div style={{ flex: '1 1 280px' }}>
            <input
              type="text"
              placeholder="Search product by name or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-input"
              style={{ width: '100%', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Category:</span>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="form-input"
                style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}
              >
                {categories.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="form-input"
                style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}
              >
                <option value="ALL">All Statuses</option>
                <option value="AVAILABLE">Available</option>
                <option value="OUT_OF_STOCK">Out of Stock</option>
                <option value="TEMPORARILY_UNAVAILABLE">Temporarily Unavailable</option>
              </select>
            </div>
          </div>

        </div>
      </div>

      {/* Products Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {filteredProducts.length > 0 ? (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg-main)', borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                <th style={{ padding: '1rem', width: '60px' }}>Item</th>
                <th style={{ padding: '1rem' }}>Product Name</th>
                <th style={{ padding: '1rem' }}>Category</th>
                <th style={{ padding: '1rem' }}>Price</th>
                <th style={{ padding: '1rem', textAlign: 'center' }}>Stock Qty</th>
                <th style={{ padding: '1rem', textAlign: 'center' }}>Threshold</th>
                <th style={{ padding: '1rem' }}>Availability</th>
                <th style={{ padding: '1rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((p, idx) => {
                const effectiveStatus = getEffectiveStatus(p);
                const isOut = effectiveStatus === 'OUT_OF_STOCK';
                const isTempUnavail = effectiveStatus === 'TEMPORARILY_UNAVAILABLE';
                const isLow = !isOut && p.stock_quantity <= (p.low_stock_threshold || 5);

                const statusColor = isOut ? '#ef4444' : isTempUnavail ? '#8b5cf6' : isLow ? '#f59e0b' : '#10b981';
                const statusBg = isOut ? 'rgba(239, 68, 68, 0.1)' : isTempUnavail ? 'rgba(139, 92, 246, 0.1)' : isLow ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)';
                const statusLabel = isOut ? 'Out of Stock' : isTempUnavail ? 'Temp Unavailable' : isLow ? 'Low Stock' : 'Available';

                return (
                  <tr key={p.id} style={{ borderBottom: idx < filteredProducts.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <img
                        src={getProductImage(p)}
                        alt={p.name}
                        style={{
                          width: '48px',
                          height: '48px',
                          objectFit: 'cover',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border-subtle)'
                        }}
                      />
                    </td>
                    <td style={{ padding: '1rem', fontWeight: 600 }}>
                      {p.name}
                    </td>
                    <td style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                      {p.category}
                    </td>
                    <td style={{ padding: '1rem', fontWeight: 600 }}>
                      ₹{p.price}
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'center', fontWeight: 700, fontSize: '1.05rem', color: isOut ? '#ef4444' : isLow ? '#f59e0b' : 'inherit' }}>
                      {p.stock_quantity}
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                      {p.low_stock_threshold || 5}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{
                        fontSize: '0.75rem',
                        padding: '4px 10px',
                        borderRadius: '4px',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        background: statusBg,
                        color: statusColor,
                        display: 'inline-block'
                      }}>
                        {statusLabel}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(p)}
                          className="btn btn-primary"
                          style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                        >
                          Edit Stock
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuickToggleAvailability(p)}
                          disabled={p.stock_quantity === 0 && effectiveStatus !== 'TEMPORARILY_UNAVAILABLE'}
                          className="btn btn-secondary"
                          style={{
                            padding: '0.4rem 0.8rem',
                            fontSize: '0.8rem',
                            opacity: (p.stock_quantity === 0 && effectiveStatus !== 'TEMPORARILY_UNAVAILABLE') ? 0.4 : 1
                          }}
                          title={isTempUnavail ? 'Mark item Available' : 'Mark item Temporarily Unavailable'}
                        >
                          {isTempUnavail ? 'Mark Available' : 'Mark Unavailable'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            No products match the selected search or filter criteria.
          </div>
        )}
      </div>

      {/* Edit Stock Modal */}
      {editingProduct && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div className="card" style={{ maxWidth: '440px', width: '100%', padding: '2rem', borderRadius: 'var(--radius-md)', boxShadow: '0 10px 35px rgba(0, 0, 0, 0.25)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.4rem' }}>Update Product Stock</h2>
              <button onClick={handleCloseEdit} style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: 'var(--text-muted)' }}>×</button>
            </div>

            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem', background: 'var(--bg-main)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
              <img
                src={getProductImage(editingProduct)}
                alt={editingProduct.name}
                style={{ width: '56px', height: '56px', objectFit: 'cover', borderRadius: 'var(--radius-sm)' }}
              />
              <div>
                <h4 style={{ margin: '0 0 0.2rem 0' }}>{editingProduct.name}</h4>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{editingProduct.category} • ₹{editingProduct.price}</div>
              </div>
            </div>

            <form onSubmit={handleSaveStock} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                  Stock Quantity (Units)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={newStockQty}
                  onChange={(e) => setNewStockQty(e.target.value)}
                  required
                  className="form-input"
                  style={{ width: '100%', boxSizing: 'border-box', fontSize: '1rem' }}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
                  Low stock alert threshold is {editingProduct.low_stock_threshold || 5} units. Setting 0 will mark item Out of Stock.
                </span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                  Availability Status
                </label>
                <select
                  value={newAvailability}
                  onChange={(e) => setNewAvailability(e.target.value)}
                  className="form-input"
                  style={{ width: '100%', boxSizing: 'border-box' }}
                >
                  <option value="AVAILABLE">Available</option>
                  <option value="OUT_OF_STOCK">Out of Stock</option>
                  <option value="TEMPORARILY_UNAVAILABLE">Temporarily Unavailable</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={handleCloseEdit}
                  className="btn btn-secondary"
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving}
                  style={{ padding: '0.65rem 1.25rem' }}
                >
                  {saving ? 'Saving Changes...' : 'Save Stock'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
