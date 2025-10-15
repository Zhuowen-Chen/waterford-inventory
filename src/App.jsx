import React, { useState, useEffect, useMemo } from 'react';
import { Search, Plus, Package, TrendingUp, TrendingDown, AlertCircle, Eye, Lock, History } from 'lucide-react';
import { db } from './firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, limit, serverTimestamp } from 'firebase/firestore';

function App() {
  // ---------- 状态管理 ----------
  const [products, setProducts] = useState([]); // 产品列表
  const [transactions, setTransactions] = useState([]); // 交易记录
  const [searchTerm, setSearchTerm] = useState(''); // 搜索关键字
  const [selectedProduct, setSelectedProduct] = useState(null); // 当前操作的产品
  const [modalType, setModalType] = useState(null); // 弹窗类型: receive/sell/return/manage/edit/delete
  const [quantity, setQuantity] = useState(''); // 收货/销售/退货数量
  const [notes, setNotes] = useState(''); // 操作备注
  const [holdValue, setHoldValue] = useState(0); // Hold 数量
  const [displayValue, setDisplayValue] = useState(0); // Display 数量
  const [loading, setLoading] = useState(true); // 加载状态
  const [showHistory, setShowHistory] = useState(false); // 是否显示交易历史
  const [newProduct, setNewProduct] = useState({
    name: '',
    sku: '',
    category: 'Stemware',
    totalStock: 0,
    minStockLevel: 2,
    retailPrice: 0
  }); // 新增产品信息

  // ---------- 从 Firebase 实时读取产品数据 ----------
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'products'), (snapshot) => {
      const productsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setProducts(productsData);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // ---------- 读取最近交易记录 ----------
  useEffect(() => {
    const q = query(collection(db, 'transactions'), orderBy('timestamp', 'desc'), limit(20));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const transactionsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTransactions(transactionsData);
    });
    return () => unsubscribe();
  }, []);

  // ---------- 计算可用库存 ----------
  const getAvailable = (product) => {
    return product.totalStock - (product.onHold || 0) - (product.onDisplay || 0);
  };

  // ---------- 搜索过滤 ----------
  const filteredProducts = useMemo(() => {
    return products.filter(p =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [products, searchTerm]);

  // ---------- 添加新产品 ----------
  const addProduct = async () => {
    if (!newProduct.name || !newProduct.sku) {
      alert('Please enter product name and SKU');
      return;
    }
    try {
      await addDoc(collection(db, 'products'), {
        ...newProduct,
        onHold: 0,
        onDisplay: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      setNewProduct({
        name: '',
        sku: '',
        category: 'Stemware',
        totalStock: 0,
        minStockLevel: 2,
        retailPrice: 0
      });
      setModalType(null);
      alert('Product added successfully!');
    } catch (error) {
      console.error('Add product failed:', error);
      alert('Failed to add product');
    }
  };

  // ---------- 打开操作弹窗 ----------
  const openModal = (product, type) => {
    setSelectedProduct(product);
    setModalType(type);
    setQuantity('');
    setNotes('');
    if (type === 'manage') {
      setHoldValue(product.onHold || 0);
      setDisplayValue(product.onDisplay || 0);
    }
  };

  // ---------- 关闭弹窗 ----------
  const closeModal = () => {
    setSelectedProduct(null);
    setModalType(null);
    setQuantity('');
    setNotes('');
  };

  // ---------- 处理库存操作 ----------
  const handleStockOperation = async () => {
    const qty = parseInt(quantity);
    if (!qty || qty <= 0) {
      alert('Please enter a valid quantity');
      return;
    }
    let newTotal = selectedProduct.totalStock;
    switch(modalType) {
      case 'receive':
        newTotal += qty;
        break;
      case 'sell':
        if (getAvailable(selectedProduct) < qty) {
          alert('Not enough available stock!');
          return;
        }
        newTotal -= qty;
        break;
      case 'return':
        newTotal += qty;
        break;
      default:
        return;
    }

    try {
      const productRef = doc(db, 'products', selectedProduct.id);
      await updateDoc(productRef, {
        totalStock: Math.max(0, newTotal),
        updatedAt: serverTimestamp()
      });
      await addDoc(collection(db, 'transactions'), {
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        productSku: selectedProduct.sku,
        type: modalType,
        quantity: qty,
        quantityBefore: selectedProduct.totalStock,
        quantityAfter: newTotal,
        notes: notes || '',
        timestamp: serverTimestamp()
      });
      closeModal();
    } catch (error) {
      console.error('Stock operation failed:', error);
      alert('Operation failed');
    }
  };

  // ---------- 处理 Hold/Display ----------
  const handleManageHoldDisplay = async () => {
    const newHold = parseInt(holdValue);
    const newDisplay = parseInt(displayValue);
    if (newHold + newDisplay > selectedProduct.totalStock) {
      alert('Hold + Display cannot exceed total stock!');
      return;
    }
    try {
      const productRef = doc(db, 'products', selectedProduct.id);
      await updateDoc(productRef, {
        onHold: newHold,
        onDisplay: newDisplay,
        updatedAt: serverTimestamp()
      });
      await addDoc(collection(db, 'transactions'), {
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        productSku: selectedProduct.sku,
        type: 'manage',
        quantity: 0,
        notes: `Hold: ${selectedProduct.onHold || 0} → ${newHold}, Display: ${selectedProduct.onDisplay || 0} → ${newDisplay}`,
        timestamp: serverTimestamp()
      });
      closeModal();
    } catch (error) {
      console.error('Manage Hold/Display failed:', error);
      alert('Operation failed');
    }
  };

  // ---------- 编辑产品 ----------
  const handleEditProduct = async (updatedProduct) => {
    try {
      const productRef = doc(db, 'products', selectedProduct.id);
      await updateDoc(productRef, {
        ...updatedProduct,
        updatedAt: serverTimestamp()
      });
      closeModal();
    } catch (error) {
      console.error('Edit product failed:', error);
      alert('Failed to edit product');
    }
  };

  // ---------- 删除产品 ----------
  const handleDeleteProduct = async () => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    try {
      await deleteDoc(doc(db, 'products', selectedProduct.id));
      closeModal();
    } catch (error) {
      console.error('Delete product failed:', error);
      alert('Failed to delete product');
    }
  };

  // ---------- 获取库存状态颜色 ----------
  const getStockStatus = (product) => {
    const available = getAvailable(product);
    if (available === 0) return 'text-red-600';
    if (available <= product.minStockLevel) return 'text-yellow-600';
    return 'text-green-600';
  };

  // ---------- 格式化时间 ----------
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Waterford Crystal Inventory</h1>
            <p className="text-sm text-gray-500 mt-1">Brown Thomas Counter</p>
          </div>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
          >
            <History className="w-4 h-4" />
            Transaction History
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by product name or SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Low stock alert */}
        {products.some(p => getAvailable(p) <= p.minStockLevel && getAvailable(p) > 0) && (
          <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
            <div className="flex items-center">
              <AlertCircle className="text-yellow-600 w-5 h-5 mr-2" />
              <p className="text-yellow-800 font-medium">
                {products.filter(p => getAvailable(p) <= p.minStockLevel && getAvailable(p) > 0).length} products are low in stock
              </p>
            </div>
          </div>
        )}

        {/* Product List */}
        {products.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">No products added yet</p>
            <button
              onClick={() => setModalType('add')}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
            >
              Add First Product
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredProducts.map(product => {
              const available = getAvailable(product);
              return (
                <div key={product.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 relative">
                  {/* Edit/Delete buttons */}
                  <div className="absolute top-3 right-3 flex gap-2">
                    <button
                      className="text-blue-500 hover:underline text-sm"
                      onClick={() => openModal(product, 'edit')}
                    >
                      Edit
                    </button>
                    <button
                      className="text-red-500 font-bold"
                      onClick={() => openModal(product, 'delete')}
                    >
                      ×
                    </button>
                  </div>

                  {/* Product Info */}
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">{product.name}</h3>
                      <p className="text-sm text-gray-500 mt-1">SKU: {product.sku} | {product.category}</p>

                      <div className="flex flex-wrap gap-4 mt-3">
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-600">Total:</span>
                          <span className="font-semibold text-gray-900">{product.totalStock}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Lock className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-600">Hold:</span>
                          <span className="font-semibold text-gray-900">{product.onHold || 0}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Eye className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-600">Display:</span>
                          <span className="font-semibold text-gray-900">{product.onDisplay || 0}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-600">Available:</span>
                          <span className={`font-bold ${getStockStatus(product)}`}>{available}</span>
                        </div>
                      </div>
                    </div>

                    {/* Operation Buttons */}
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => openModal(product, 'receive')}
                        className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition flex items-center gap-1"
                      >
                        <TrendingUp className="w-4 h-4" />
                        Receive
                      </button>
                      <button
                        onClick={() => openModal(product, 'sell')}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={available === 0}
                      >
                        <TrendingDown className="w-4 h-4" />
                        Sell
                      </button>
                      <button
                        onClick={() => openModal(product, 'return')}
                        className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition"
                      >
                        Return
                      </button>
                      <button
                        onClick={() => openModal(product, 'manage')}
                        className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
                      >
                        Manage H/D
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Add Product Button */}
        {products.length > 0 && (
          <button
            onClick={() => setModalType('add')}
            className="mt-6 w-full py-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-500 transition flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add New Product
          </button>
        )}
      </main>

      {/* ---------- Modals ---------- */}
      {modalType === 'add' && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-20">
          <div className="bg-white rounded-lg shadow-lg w-96 p-6 relative">
            <h2 className="text-xl font-bold mb-4">Add New Product</h2>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Product Name"
                value={newProduct.name}
                onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                className="w-full border px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                placeholder="SKU"
                value={newProduct.sku}
                onChange={(e) => setNewProduct({ ...newProduct, sku: e.target.value })}
                className="w-full border px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                placeholder="Category"
                value={newProduct.category}
                onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                className="w-full border px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="number"
                placeholder="Total Stock"
                value={newProduct.totalStock}
                onChange={(e) => setNewProduct({ ...newProduct, totalStock: parseInt(e.target.value) })}
                className="w-full border px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="number"
                placeholder="Minimum Stock Level"
                value={newProduct.minStockLevel}
                onChange={(e) => setNewProduct({ ...newProduct, minStockLevel: parseInt(e.target.value) })}
                className="w-full border px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="number"
                placeholder="Retail Price"
                value={newProduct.retailPrice}
                onChange={(e) => setNewProduct({ ...newProduct, retailPrice: parseFloat(e.target.value) })}
                className="w-full border px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={closeModal}
                className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 transition"
              >
                Cancel
              </button>
              <button
                onClick={addProduct}
                className="px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      {modalType === 'edit' && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-20">
          <div className="bg-white rounded-lg shadow-lg w-96 p-6 relative">
            <h2 className="text-xl font-bold mb-4">Edit Product</h2>
            <div className="space-y-3">
              <input
                type="text"
                value={selectedProduct.name}
                onChange={(e) => setSelectedProduct({ ...selectedProduct, name: e.target.value })}
                className="w-full border px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                value={selectedProduct.sku}
                onChange={(e) => setSelectedProduct({ ...selectedProduct, sku: e.target.value })}
                className="w-full border px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                value={selectedProduct.category}
                onChange={(e) => setSelectedProduct({ ...selectedProduct, category: e.target.value })}
                className="w-full border px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="number"
                value={selectedProduct.totalStock}
                onChange={(e) => setSelectedProduct({ ...selectedProduct, totalStock: parseInt(e.target.value) })}
                className="w-full border px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="number"
                value={selectedProduct.minStockLevel}
                onChange={(e) => setSelectedProduct({ ...selectedProduct, minStockLevel: parseInt(e.target.value) })}
                className="w-full border px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="number"
                value={selectedProduct.retailPrice}
                onChange={(e) => setSelectedProduct({ ...selectedProduct, retailPrice: parseFloat(e.target.value) })}
                className="w-full border px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={closeModal}
                className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => handleEditProduct(selectedProduct)}
                className="px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {modalType === 'delete' && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-20">
          <div className="bg-white rounded-lg shadow-lg w-80 p-6 relative">
            <h2 className="text-lg font-bold mb-4">Delete Product</h2>
            <p>Are you sure you want to delete <strong>{selectedProduct.name}</strong>?</p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={closeModal}
                className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteProduct}
                className="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {['receive', 'sell', 'return'].includes(modalType) && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-20">
          <div className="bg-white rounded-lg shadow-lg w-80 p-6 relative">
            <h2 className="text-lg font-bold mb-4">{modalType.charAt(0).toUpperCase() + modalType.slice(1)} Stock</h2>
            <p className="text-sm text-gray-600 mb-2">Product: {selectedProduct.name}</p>
            <input
              type="number"
              placeholder="Quantity"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full border px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
            />
            <textarea
              placeholder="Notes (optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full border px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={closeModal}
                className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleStockOperation}
                className={`px-4 py-2 rounded-lg text-white transition ${modalType==='receive'?'bg-green-500 hover:bg-green-600':'bg-blue-500 hover:bg-blue-600'}`}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {modalType === 'manage' && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-20">
          <div className="bg-white rounded-lg shadow-lg w-80 p-6 relative">
            <h2 className="text-lg font-bold mb-4">Manage Hold/Display</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium">Hold</label>
                <input
                  type="number"
                  value={holdValue}
                  onChange={(e) => setHoldValue(e.target.value)}
                  className="w-24 border px-2 py-1 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium">Display</label>
                <input
                  type="number"
                  value={displayValue}
                  onChange={(e) => setDisplayValue(e.target.value)}
                  className="w-24 border px-2 py-1 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={closeModal}
                className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleManageHoldDisplay}
                className="px-4 py-2 rounded-lg bg-gray-600 text-white hover:bg-gray-700 transition"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
