import React, { useState, useEffect } from 'react';
import {
  ShoppingBag,
  PlusCircle,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle,
  Tag,
  DollarSign,
  TrendingDown,
  Layers,
  Receipt,
  Edit2,
  PackageCheck
} from 'lucide-react';
import Modal from '../components/Modal.jsx';
import {
  getProducts,
  createProduct,
  updateProduct,
  recordSale,
  getSalesHistory
} from '@backend/services/inventoryService.js';
import { getMembers } from '@backend/services/memberService.js';

export default function Inventory() {
  const [products, setProducts] = useState([]);
  const [salesHistory, setSalesHistory] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & Tabs
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('products'); // 'products' | 'sales'

  // POS Sale Modal
  const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);
  const [saleForm, setSaleForm] = useState({
    productId: '',
    memberId: '',
    quantity: 1
  });
  const [saleError, setSaleError] = useState('');

  // Add/Edit Product Modal
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isEditingProduct, setIsEditingProduct] = useState(false);
  const [productForm, setProductForm] = useState({
    id: null,
    name: '',
    category: 'Rackets',
    price: '',
    stock_quantity: 10,
    low_stock_threshold: 5
  });
  const [productError, setProductError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const categories = [
    'All Categories',
    'Rackets',
    'Balls',
    'Apparel',
    'Accessories',
    'Drinks & Nutrition'
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [productsData, salesData, membersData] = await Promise.all([
        getProducts(),
        getSalesHistory(30),
        getMembers()
      ]);
      setProducts(productsData);
      setSalesHistory(salesData);
      setMembers(membersData);
    } catch (err) {
      console.error('Error fetching inventory data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Open POS Modal
  const handleOpenSaleModal = (preselectedProductId = null) => {
    setSaleError('');
    const targetProduct = preselectedProductId
      ? products.find((p) => p.id === Number(preselectedProductId))
      : products.find((p) => Number(p.stock_quantity) > 0) || products[0];

    setSaleForm({
      productId: targetProduct ? targetProduct.id : '',
      memberId: '',
      quantity: 1
    });
    setIsSaleModalOpen(true);
  };

  // Open Add Product Modal
  const handleOpenAddProduct = () => {
    setProductError('');
    setIsEditingProduct(false);
    setProductForm({
      id: null,
      name: '',
      category: 'Rackets',
      price: '',
      stock_quantity: 10,
      low_stock_threshold: 5
    });
    setIsProductModalOpen(true);
  };

  // Open Edit Product Modal
  const handleOpenEditProduct = (product) => {
    setProductError('');
    setIsEditingProduct(true);
    setProductForm({
      id: product.id,
      name: product.name,
      category: product.category,
      price: product.price,
      stock_quantity: product.stock_quantity,
      low_stock_threshold: product.low_stock_threshold
    });
    setIsProductModalOpen(true);
  };

  // Submit Sale
  const handleRecordSaleSubmit = async (e) => {
    e.preventDefault();
    setSaleError('');
    setSubmitting(true);

    try {
      await recordSale({
        productId: saleForm.productId,
        memberId: saleForm.memberId || null,
        quantity: saleForm.quantity
      });

      setIsSaleModalOpen(false);
      await loadData();
    } catch (err) {
      setSaleError(err.message || 'Sale could not be processed');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Product Create or Update
  const handleProductSubmit = async (e) => {
    e.preventDefault();
    setProductError('');
    setSubmitting(true);

    try {
      if (isEditingProduct) {
        await updateProduct(productForm.id, {
          name: productForm.name,
          category: productForm.category,
          price: productForm.price,
          stock_quantity: productForm.stock_quantity,
          low_stock_threshold: productForm.low_stock_threshold
        });
      } else {
        await createProduct(productForm);
      }

      setIsProductModalOpen(false);
      await loadData();
    } catch (err) {
      setProductError(err.message || 'Failed to save product');
    } finally {
      setSubmitting(false);
    }
  };

  // Filter products
  const filteredProducts = products.filter((p) => {
    const matchesCat =
      selectedCategory === 'all' ||
      selectedCategory === 'All Categories' ||
      p.category.toLowerCase() === selectedCategory.toLowerCase();

    const matchesSearch =
      searchQuery === '' ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesCat && matchesSearch;
  });

  // Calculate live POS sale details
  const selectedProductObj = products.find((p) => p.id === Number(saleForm.productId));
  const selectedMemberObj = members.find((m) => m.id === Number(saleForm.memberId));

  let discountPct = 0;
  if (selectedMemberObj && selectedMemberObj.status === 'active' && selectedMemberObj.membership_plans) {
    discountPct = Number(selectedMemberObj.membership_plans.shop_discount) || 0;
  }

  const baseUnitPrice = selectedProductObj ? Number(selectedProductObj.price) : 0;
  const discountPerUnit = Number(((baseUnitPrice * discountPct) / 100).toFixed(2));
  const effectiveUnitPrice = Math.max(0, baseUnitPrice - discountPerUnit);
  const totalAmount = Number((effectiveUnitPrice * Number(saleForm.quantity || 1)).toFixed(2));

  return (
    <div className="page-wrapper animate-fade-in">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <ShoppingBag size={26} color="#10b981" />
            <span>Pro Shop & Inventory</span>
          </h1>
          <p className="page-subtitle">
            Manage sports gear, equipment stock alerts, and point-of-sale transactions with tier discounts.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary" onClick={handleOpenAddProduct}>
            <PlusCircle size={16} />
            <span>Add Stock Item</span>
          </button>
          <button className="btn btn-primary" onClick={() => handleOpenSaleModal()}>
            <Receipt size={16} />
            <span>New POS Checkout</span>
          </button>
        </div>
      </div>

      {/* View Switcher: Inventory Items vs Sales History */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
        <button
          onClick={() => setActiveTab('products')}
          className={`btn ${activeTab === 'products' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ fontSize: '13px', padding: '8px 16px' }}
        >
          <PackageCheck size={16} />
          <span>Inventory Catalog ({products.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('sales')}
          className={`btn ${activeTab === 'sales' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ fontSize: '13px', padding: '8px 16px' }}
        >
          <Receipt size={16} />
          <span>Sales & Transactions History ({salesHistory.length})</span>
        </button>
      </div>

      {/* INVENTORY CATALOG TAB */}
      {activeTab === 'products' && (
        <>
          {/* Filter Bar */}
          <div className="card" style={{ padding: '16px 20px', marginBottom: '22px' }}>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
              <div className="input-with-icon" style={{ flex: 1, minWidth: '260px' }}>
                <Search size={16} />
                <input
                  type="text"
                  className="form-input"
                  placeholder="Search products by title or category..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '12.5px', color: 'var(--text-dim)', fontWeight: 600 }}>Category:</span>
                <select
                  className="form-select"
                  style={{ width: 'auto', padding: '8px 12px', fontSize: '13px' }}
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                >
                  {categories.map((c) => (
                    <option key={c} value={c === 'All Categories' ? 'all' : c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Products Table */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Category</th>
                    <th>Unit Price</th>
                    <th>In Stock</th>
                    <th>Stock Health</th>
                    <th>Low Threshold</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-dim)' }}>
                        No inventory products found matching the criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((p) => {
                      const stock = Number(p.stock_quantity);
                      const threshold = Number(p.low_stock_threshold);
                      const isOutOfStock = stock <= 0;
                      const isLowStock = !isOutOfStock && stock <= threshold;

                      return (
                        <tr key={p.id}>
                          <td>
                            <div style={{ fontWeight: 700, color: '#fff', fontSize: '14px' }}>
                              {p.name}
                            </div>
                            <div style={{ fontSize: '11.5px', color: 'var(--text-dim)' }}>
                              SKU #KNS-{String(p.id).padStart(4, '0')}
                            </div>
                          </td>

                          <td>
                            <span style={{ color: 'var(--text-muted)' }}>{p.category}</span>
                          </td>

                          <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#fff' }}>
                            ${Number(p.price).toFixed(2)}
                          </td>

                          <td>
                            <span
                              style={{
                                fontFamily: 'var(--font-mono)',
                                fontWeight: 800,
                                fontSize: '14px',
                                color: isOutOfStock ? '#f43f5e' : isLowStock ? '#f59e0b' : '#10b981'
                              }}
                            >
                              {stock} units
                            </span>
                          </td>

                          <td>
                            {isOutOfStock ? (
                              <span className="badge badge-expired">Out of Stock</span>
                            ) : isLowStock ? (
                              <span className="badge badge-warning">
                                <AlertTriangle size={11} />
                                Low Stock ({stock} left)
                              </span>
                            ) : (
                              <span className="badge badge-active">
                                <CheckCircle size={11} />
                                In Stock
                              </span>
                            )}
                          </td>

                          <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', fontSize: '13px' }}>
                            &le; {threshold}
                          </td>

                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: '8px' }}>
                              <button
                                className="btn btn-primary btn-sm"
                                disabled={isOutOfStock}
                                onClick={() => handleOpenSaleModal(p.id)}
                                title="Sell Item"
                                style={{ padding: '5px 10px', fontSize: '12px' }}
                              >
                                <span>Sell</span>
                              </button>
                              <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => handleOpenEditProduct(p)}
                                title="Edit Stock / Price"
                                style={{ padding: '5px 8px' }}
                              >
                                <Edit2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* SALES & TRANSACTIONS HISTORY TAB */}
      {activeTab === 'sales' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Receipt #</th>
                  <th>Item Sold</th>
                  <th>Customer / Member</th>
                  <th>Quantity</th>
                  <th>Unit Rate</th>
                  <th>Total Charged</th>
                  <th>Date & Time</th>
                </tr>
              </thead>
              <tbody>
                {salesHistory.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-dim)' }}>
                      No sales recorded yet.
                    </td>
                  </tr>
                ) : (
                  salesHistory.map((s) => (
                    <tr key={s.id}>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-dim)' }}>
                        #POS-{String(s.id).padStart(5, '0')}
                      </td>
                      <td style={{ fontWeight: 600, color: '#fff' }}>
                        {s.products?.name || `Product #${s.product_id}`}
                      </td>
                      <td>
                        {s.members ? (
                          <div>
                            <span style={{ fontWeight: 600 }}>{s.members.name}</span>
                            <span className="badge badge-active" style={{ fontSize: '9px', marginLeft: '6px' }}>
                              Member
                            </span>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-dim)', fontStyle: 'italic' }}>Guest / Walk-in</span>
                        )}
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>{s.quantity}x</td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>${Number(s.unit_price).toFixed(2)}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: '#10b981' }}>
                        ${Number(s.total).toFixed(2)}
                      </td>
                      <td style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
                        {new Date(s.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: New POS Sale Checkout */}
      <Modal
        isOpen={isSaleModalOpen}
        onClose={() => setIsSaleModalOpen(false)}
        title="Pro Shop POS Checkout"
      >
        <form onSubmit={handleRecordSaleSubmit}>
          {saleError && (
            <div
              style={{
                padding: '12px 14px',
                borderRadius: '8px',
                backgroundColor: 'rgba(244, 63, 94, 0.15)',
                border: '1px solid rgba(244, 63, 94, 0.3)',
                color: '#fb7185',
                fontSize: '13px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <AlertTriangle size={18} />
              <span>{saleError}</span>
            </div>
          )}

          {/* Product Select */}
          <div className="form-group">
            <label className="form-label">Select Product *</label>
            <select
              className="form-select"
              required
              value={saleForm.productId}
              onChange={(e) => setSaleForm({ ...saleForm, productId: Number(e.target.value) })}
            >
              {products.map((p) => (
                <option key={p.id} value={p.id} disabled={Number(p.stock_quantity) <= 0}>
                  {p.name} - ${p.price} ({p.stock_quantity} in stock) {Number(p.stock_quantity) <= 0 ? '[OUT OF STOCK]' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Member Select (Optional) */}
          <div className="form-group">
            <label className="form-label">Customer / Member (For Shop Discount)</label>
            <select
              className="form-select"
              value={saleForm.memberId}
              onChange={(e) => setSaleForm({ ...saleForm, memberId: e.target.value })}
            >
              <option value="">Guest / Walk-In Customer (0% Discount)</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.membership_plans?.name || 'Standard'} Tier: {m.membership_plans?.shop_discount || 0}% off)
                </option>
              ))}
            </select>
          </div>

          {/* Quantity */}
          <div className="form-group">
            <label className="form-label">Quantity to Purchase *</label>
            <input
              type="number"
              min="1"
              max={selectedProductObj ? selectedProductObj.stock_quantity : 99}
              required
              className="form-input"
              value={saleForm.quantity}
              onChange={(e) => setSaleForm({ ...saleForm, quantity: Math.max(1, parseInt(e.target.value, 10) || 1) })}
            />
            {selectedProductObj && (
              <span style={{ fontSize: '11.5px', color: 'var(--text-dim)', marginTop: '4px' }}>
                Maximum available in stock: {selectedProductObj.stock_quantity} units
              </span>
            )}
          </div>

          {/* Receipt Breakdown */}
          {selectedProductObj && (
            <div
              style={{
                padding: '16px',
                borderRadius: '12px',
                backgroundColor: '#080d1a',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                marginBottom: '20px',
                marginTop: '16px'
              }}
            >
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '10px' }}>
                Transaction Summary
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                <span>Item: {selectedProductObj.name}</span>
                <span style={{ fontFamily: 'var(--font-mono)' }}>${baseUnitPrice.toFixed(2)} ea</span>
              </div>

              {discountPct > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#06b6d4', marginBottom: '6px' }}>
                  <span>{selectedMemberObj?.membership_plans?.name} Discount ({discountPct}%):</span>
                  <span style={{ fontFamily: 'var(--font-mono)' }}>-${(discountPerUnit * saleForm.quantity).toFixed(2)}</span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                <span>Units Purchased:</span>
                <span style={{ fontFamily: 'var(--font-mono)' }}>{saleForm.quantity}x</span>
              </div>

              <div style={{ height: '1px', backgroundColor: 'rgba(255, 255, 255, 0.08)', margin: '8px 0' }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 800, color: '#fff' }}>
                <span>Total Due:</span>
                <span style={{ color: '#10b981', fontFamily: 'var(--font-mono)' }}>
                  ${totalAmount.toFixed(2)}
                </span>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsSaleModalOpen(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting || !selectedProductObj || selectedProductObj.stock_quantity < saleForm.quantity}
            >
              {submitting ? 'Recording Sale...' : 'Complete Sale & Deduct Stock'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Add / Edit Product */}
      <Modal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        title={isEditingProduct ? 'Update Inventory Product' : 'Add New Pro Shop Product'}
      >
        <form onSubmit={handleProductSubmit}>
          {productError && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '8px',
                backgroundColor: 'rgba(244, 63, 94, 0.15)',
                color: '#fb7185',
                fontSize: '13px',
                marginBottom: '16px'
              }}
            >
              {productError}
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Product Name *</label>
            <input
              type="text"
              required
              className="form-input"
              placeholder="e.g. Wilson Clash 100 Pro"
              value={productForm.name}
              onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Category *</label>
            <select
              className="form-select"
              value={productForm.category}
              onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
            >
              <option value="Rackets">Rackets</option>
              <option value="Balls">Balls</option>
              <option value="Apparel">Apparel</option>
              <option value="Accessories">Accessories</option>
              <option value="Drinks & Nutrition">Drinks & Nutrition</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Retail Price ($ USD) *</label>
            <input
              type="number"
              step="0.01"
              min="0"
              required
              className="form-input"
              placeholder="e.g. 19.99"
              value={productForm.price}
              onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div className="form-group">
              <label className="form-label">Stock Quantity *</label>
              <input
                type="number"
                min="0"
                required
                className="form-input"
                value={productForm.stock_quantity}
                onChange={(e) => setProductForm({ ...productForm, stock_quantity: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Low Stock Alert Threshold *</label>
              <input
                type="number"
                min="1"
                required
                className="form-input"
                value={productForm.low_stock_threshold}
                onChange={(e) => setProductForm({ ...productForm, low_stock_threshold: e.target.value })}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsProductModalOpen(false)}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Saving...' : isEditingProduct ? 'Update Product' : 'Add to Catalog'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
