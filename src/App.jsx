import React, { useState, useEffect, useMemo } from 'react';
import { Search, Plus, Package, TrendingUp, TrendingDown, AlertCircle, Eye, Lock, History, Edit2, Trash2, ChevronRight, Filter } from 'lucide-react';
import { db } from './firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, limit, serverTimestamp } from 'firebase/firestore';

// Waterford Collections Structure
const COLLECTIONS = {
  'Lismore': ['Lismore Diamond', 'Lismore Essence', 'Lismore Classic', 'Lismore Connoisseur'],
  'Elegance': ['Elegance Optic', 'Elegance Classic'],
  'Marquis': ['Marquis by Waterford'],
  'Wild Atlantic Way': ['Wild Atlantic Way'],
  'Gin Journeys': ['Gin Journeys'],
  'Mixology': ['Mixology Collection'],
  'Contemporary': ['Contemporary Designs'],
  'Other': ['Uncategorized']
};

const CATEGORIES = ['Stemware', 'Barware', 'Giftware', 'Home Décor', 'Lighting', 'Other'];

function App() {
  const [products, setProducts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [modalType, setModalType] = useState(null);
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');
  const [holdValue, setHoldValue] = useState(0);
  const [displayValue, setDisplayValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState('All');
  const [selectedSubCollection, setSelectedSubCollection] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [editingProduct, setEditingProduct] = useState(null);
  
  const [newProduct, setNewProduct] = useState({
    name: '',
    sku: '',
    collection: 'Lismore',
    subCollection: 'Lismore Diamond',
    category: 'Stemware',
    totalStock: 0,
    minStockLevel: 2,
    retailPrice: 0
  });

  // Load products from Firebase
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

  // Load transactions
  useEffect(() => {
    const q = query(collection(db, 'transactions'), orderBy('timestamp', 'desc'), limit(50));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const transactionsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTransactions(transactionsData);
    });
    return () => unsubscribe();
  }, []);

  const getAvailable = (product) => {
    return product.totalStock - (product.onHold || 0) - (product.onDisplay || 0);
  };

  // Filter and search products
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           p.sku.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCollection = selectedCollection === 'All' || p.collection === selectedCollection;
      const matchesSubCollection = selectedSubCollection === 'All' || p.subCollection === selectedSubCollection;
      const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
      
      return matchesSearch && matchesCollection && matchesSubCollection && matchesCategory;
    });
  }, [products, searchTerm, selectedCollection, selectedSubCollection, selectedCategory]);

  // Group products by collection
  const groupedProducts = useMemo(() => {
    const grouped = {};
    filteredProducts.forEach(product => {
      const key = `${product.collection} > ${product.subCollection}`;
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(product);
    });
    return grouped;
  }, [filteredProducts]);

  const handleAddProduct = async () => {
    if (!newProduct.name || !newProduct.sku) {
      alert('Please fill in Product Name and SKU');
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
      
      setShowAddProduct(false);
      setNewProduct({
        name: '',
        sku: '',
        collection: 'Lismore',
        subCollection: 'Lismore Diamond',
        category: 'Stemware',
        totalStock: 0,
        minStockLevel: 2,
        retailPrice: 0
      });
      
      alert('Product added successfully!');
    } catch (error) {
      console.error('Error adding product:', error);
      alert('Failed to add product');
    }
  };

  const handleEditProduct = async () => {
    if (!editingProduct.name || !editingProduct.sku) {
      alert('Please fill in Product Name and SKU');
      return;
    }
  
    try {
      const productRef = doc(db, 'products', editingProduct.id);
      
      // 准备更新数据，过滤掉 undefined 值
      const updateData = {
        name: editingProduct.name,
        sku: editingProduct.sku,
        collection: editingProduct.collection || 'Other',
        subCollection: editingProduct.subCollection || 'Uncategorized',
        category: editingProduct.category || 'Stemware',
        totalStock: editingProduct.totalStock || 0,
        minStockLevel: editingProduct.minStockLevel || 2,
        retailPrice: editingProduct.retailPrice || 0,
        updatedAt: serverTimestamp()
      };
  
      await updateDoc(productRef, updateData);
  
      setModalType(null);
      setEditingProduct(null);
      alert('Product updated successfully!');
    } catch (error) {
      console.error('Error updating product:', error);
      alert('Failed to update product: ' + error.message);
    }
  };

  const handleDeleteProduct = async (product) => {
    if (!confirm(`Are you sure you want to delete "${product.name}"?\n\nThis action cannot be undone.`)) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'products', product.id));
      alert('Product deleted successfully!');
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Failed to delete product');
    }
  };

  const openModal = (product, type) => {
    setSelectedProduct(product);
    setModalType(type);
    setQuantity('');
    setNotes('');
    if (type === 'manage') {
      setHoldValue(product.onHold || 0);
      setDisplayValue(product.onDisplay || 0);
    } else if (type === 'edit') {
      setEditingProduct({...product});
    }
  };

  const closeModal = () => {
    setSelectedProduct(null);
    setModalType(null);
    setQuantity('');
    setNotes('');
    setEditingProduct(null);
  };

  const handleStockOperation = async () => {
    if (!quantity || parseInt(quantity) <= 0) {
      alert('Please enter a valid quantity');
      return;
    }

    const qty = parseInt(quantity);
    let newTotal = selectedProduct.totalStock;
    
    switch(modalType) {
      case 'receive':
        newTotal += qty;
        break;
      case 'sell':
        if (getAvailable(selectedProduct) < qty) {
          alert('Insufficient available stock!');
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
      console.error('Operation failed:', error);
      alert('Operation failed');
    }
  };

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
      console.error('Operation failed:', error);
      alert('Operation failed');
    }
  };

  const getStockStatus = (product) => {
    const available = getAvailable(product);
    if (available === 0) return 'text-red-600';
    if (available <= product.minStockLevel) return 'text-yellow-600';
    return 'text-green-600';
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    return date.toLocaleString('en-IE', { 
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
            <p className="text-sm text-gray-500 mt-1">Brown Thomas Concession</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
            >
              <Filter className="w-4 h-4" />
              Filters
            </button>
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
            >
              <History className="w-4 h-4" />
              History
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Search Bar */}
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

        {/* Filters */}
        {showFilters && (
          <div className="mb-6 p-4 bg-white rounded-lg border border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Collection</label>
                <select
                  value={selectedCollection}
                  onChange={(e) => {
                    setSelectedCollection(e.target.value);
                    setSelectedSubCollection('All');
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="All">All Collections</option>
                  {Object.keys(COLLECTIONS).map(col => (
                    <option key={col} value={col}>{col}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Sub-Collection</label>
                <select
                  value={selectedSubCollection}
                  onChange={(e) => setSelectedSubCollection(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  disabled={selectedCollection === 'All'}
                >
                  <option value="All">All Sub-Collections</option>
                  {selectedCollection !== 'All' && COLLECTIONS[selectedCollection]?.map(sub => (
                    <option key={sub} value={sub}>{sub}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="All">All Categories</option>
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Low Stock Alert */}
        {products.some(p => getAvailable(p) <= p.minStockLevel && getAvailable(p) > 0) && (
          <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
            <div className="flex items-center">
              <AlertCircle className="text-yellow-600 w-5 h-5 mr-2" />
              <p className="text-yellow-800 font-medium">
                {products.filter(p => getAvailable(p) <= p.minStockLevel && getAvailable(p) > 0).length} product(s) running low on stock
              </p>
            </div>
          </div>
        )}

        {/* Products List - Grouped */}
        {products.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">No products added yet</p>
            <button
              onClick={() => setShowAddProduct(true)}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
            >
              Add First Product
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedProducts).map(([collectionName, products]) => (
              <div key={collectionName} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="bg-gray-50 px-5 py-3 border-b border-gray-200">
                  <div className="flex items-center gap-2">
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                    <h2 className="text-lg font-semibold text-gray-900">{collectionName}</h2>
                    <span className="ml-auto text-sm text-gray-500">{products.length} item(s)</span>
                  </div>
                </div>
                
                <div className="divide-y divide-gray-200">
                  {products.map(product => {
                    const available = getAvailable(product);
                    return (
                      <div key={product.id} className="p-5 hover:bg-gray-50 transition">
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-start justify-between">
                              <div>
                                <h3 className="text-lg font-semibold text-gray-900">{product.name}</h3>
                                <p className="text-sm text-gray-500 mt-1">
                                  SKU: {product.sku} | {product.category}
                                </p>
                              </div>
                              <div className="flex gap-1 ml-4">
                                <button
                                  onClick={() => openModal(product, 'edit')}
                                  className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                                  title="Edit Product"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteProduct(product)}
                                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition"
                                  title="Delete Product"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                            
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

                            {available <= product.minStockLevel && available > 0 && (
                              <div className="mt-2 text-sm text-yellow-600 flex items-center gap-1">
                                <AlertCircle className="w-4 h-4" />
                                <span>Low stock - reorder recommended</span>
                              </div>
                            )}
                            {available === 0 && (
                              <div className="mt-2 text-sm text-red-600 flex items-center gap-1 font-medium">
                                <AlertCircle className="w-4 h-4" />
                                <span>Out of stock!</span>
                              </div>
                            )}
                          </div>

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
              </div>
            ))}
          </div>
        )}

        {/* Add Product Button */}
        {products.length > 0 && (
          <button
            onClick={() => setShowAddProduct(true)}
            className="mt-6 w-full py-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-500 transition flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add New Product
          </button>
        )}
      </main>

      {/* Add/Edit Product Modal */}
      {(showAddProduct || modalType === 'edit') && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-md w-full p-6 my-8">
            <h2 className="text-xl font-bold mb-4">
              {modalType === 'edit' ? 'Edit Product' : 'Add New Product'}
            </h2>
            
            <div className="space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Product Name *</label>
                <input
                  type="text"
                  value={modalType === 'edit' ? editingProduct?.name : newProduct.name}
                  onChange={(e) => modalType === 'edit' 
                    ? setEditingProduct({...editingProduct, name: e.target.value})
                    : setNewProduct({...newProduct, name: e.target.value})
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Lismore Diamond Red Wine Set of 2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">SKU *</label>
                <input
                  type="text"
                  value={modalType === 'edit' ? editingProduct?.sku : newProduct.sku}
                  onChange={(e) => modalType === 'edit'
                    ? setEditingProduct({...editingProduct, sku: e.target.value})
                    : setNewProduct({...newProduct, sku: e.target.value})
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., L136242"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Collection</label>
                <select
                  value={modalType === 'edit' ? editingProduct?.collection : newProduct.collection}
                  onChange={(e) => {
                    const newColl = e.target.value;
                    const firstSub = COLLECTIONS[newColl][0];
                    if (modalType === 'edit') {
                      setEditingProduct({...editingProduct, collection: newColl, subCollection: firstSub});
                    } else {
                      setNewProduct({...newProduct, collection: newColl, subCollection: firstSub});
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {Object.keys(COLLECTIONS).map(col => (
                    <option key={col} value={col}>{col}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Sub-Collection</label>
                <select
                  value={modalType === 'edit' ? editingProduct?.subCollection : newProduct.subCollection}
                  onChange={(e) => modalType === 'edit'
                    ? setEditingProduct({...editingProduct, subCollection: e.target.value})
                    : setNewProduct({...newProduct, subCollection: e.target.value})
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {COLLECTIONS[modalType === 'edit' ? editingProduct?.collection : newProduct.collection]?.map(sub => (
                    <option key={sub} value={sub}>{sub}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <select
                  value={modalType === 'edit' ? editingProduct?.category : newProduct.category}
                  onChange={(e) => modalType === 'edit'
                    ? setEditingProduct({...editingProduct, category: e.target.value})
                    : setNewProduct({...newProduct, category: e.target.value})
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Total Stock</label>
                <input
                  type="number"
                  value={modalType === 'edit' ? editingProduct?.totalStock : newProduct.totalStock}
                  onChange={(e) => modalType === 'edit'
                    ? setEditingProduct({...editingProduct, totalStock: parseInt(e.target.value) || 0})
                    : setNewProduct({...newProduct, totalStock: parseInt(e.target.value) || 0})
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Min Stock Alert Level</label>
                <input
                  type="number"
                  value={modalType === 'edit' ? editingProduct?.minStockLevel : newProduct.minStockLevel}
                  onChange={(e) => modalType === 'edit'
                    ? setEditingProduct({...editingProduct, minStockLevel: parseInt(e.target.value) || 0})
                    : setNewProduct({...newProduct, minStockLevel: parseInt(e.target.value) || 0})
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Retail Price (€)</label>
                <input
                  type="number"
                  value={modalType === 'edit' ? editingProduct?.retailPrice : newProduct.retailPrice}
                  onChange={(e) => modalType === 'edit'
                    ? setEditingProduct({...editingProduct, retailPrice: parseFloat(e.target.value) || 0})
                    : setNewProduct({...newProduct, retailPrice: parseFloat(e.target.value) || 0})
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={modalType === 'edit' ? handleEditProduct : handleAddProduct}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
              >
                {modalType === 'edit' ? 'Update Product' : 'Add Product'}
              </button>
              <button
                onClick={() => {
                  setShowAddProduct(false);
                  setModalType(null);
                  setEditingProduct(null);
                }}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Transaction History Modal */}
      {showHistory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Transaction History</h2>
              <button onClick={() => setShowHistory(false)} className="text-gray-500 hover:text-gray-700 text-2xl">×</button>
            </div>
            
            {transactions.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No transactions yet</p>
            ) : (
              <div className="space-y-3">
                {transactions.map(t => (
                  <div key={t.id} className="border-b pb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-900">{t.productName}</p>
                        <p className="text-sm text-gray-500">SKU: {t.productSku}</p>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded ${
                        t.type === 'receive' ? 'bg-green-100 text-green-700' :
                        t.type === 'sell' ? 'bg-blue-100 text-blue-700' :
                        t.type === 'return' ? 'bg-purple-100 text-purple-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {t.type === 'receive' ? 'Receive' : t.type === 'sell' ? 'Sell' : t.type === 'return' ? 'Return' : 'Manage'}
                      </span>
                    </div>
                    <div className="mt-1 text-sm text-gray-600">
                      {t.type !== 'manage' && <p>Qty: {t.quantity} ({t.quantityBefore} → {t.quantityAfter})</p>}
                      {t.notes && <p>Notes: {t.notes}</p>}
                      <p className="text-xs text-gray-400 mt-1">{formatTime(t.timestamp)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      {/* Stock Operation Modal */}
      {modalType && selectedProduct && modalType !== 'manage' && modalType !== 'edit' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">
              {modalType === 'receive' && 'Receive Stock'}
              {modalType === 'sell' && 'Sell Product'}
              {modalType === 'return' && 'Return Product'}
            </h2>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-1">Product</p>
              <p className="font-medium">{selectedProduct.name}</p>
              <p className="text-sm text-gray-500">SKU: {selectedProduct.sku}</p>
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-1">Current Stock</p>
              <p className="font-medium">
                Total: {selectedProduct.totalStock} | Available: {getAvailable(selectedProduct)}
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quantity
              </label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Enter quantity"
                min="1"
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes (可以用中文)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Order number / Delivery note / 订单号"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleStockOperation}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
              >
                Confirm
              </button>
              <button
                onClick={closeModal}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Hold/Display Management Modal */}
      {modalType === 'manage' && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">Manage Hold & Display</h2>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-1">Product</p>
              <p className="font-medium">{selectedProduct.name}</p>
            </div>

            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600">Total Stock</span>
                <span className="font-bold text-lg">{selectedProduct.totalStock}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Current Available</span>
                <span className="font-semibold text-green-600">{getAvailable(selectedProduct)}</span>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Hold Quantity</label>
              <input
                type="number"
                value={holdValue}
                onChange={(e) => setHoldValue(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                min="0"
                max={selectedProduct.totalStock}
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Display Quantity</label>
              <input
                type="number"
                value={displayValue}
                onChange={(e) => setDisplayValue(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                min="0"
                max={selectedProduct.totalStock}
              />
            </div>

            <div className="mb-6 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-blue-900">New Available Stock</span>
                <span className="font-bold text-lg text-blue-600">
                  {selectedProduct.totalStock - holdValue - displayValue}
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleManageHoldDisplay}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
              >
                Save
              </button>
              <button
                onClick={closeModal}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;