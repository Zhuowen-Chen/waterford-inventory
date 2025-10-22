import React, { useState, useEffect, useMemo } from 'react';
import { Search, Plus, Package, TrendingUp, TrendingDown, AlertCircle, Eye, Lock, History, Edit2, Trash2, ChevronRight, Filter } from 'lucide-react';
import { db } from './firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, limit, serverTimestamp } from 'firebase/firestore';

// Waterford Collections Structure - Simplified
const MAIN_CATEGORIES = {
  'Collections': [
    'Mastercraft', 
    'Lismore Red', 
    'Lismore', 
    'Lismore Essence', 
    'Lismore Arcus', 
    'Lismore Tall', 
    'Lismore Black', 
    'Lismore Diamond',
    'Connoisseur',
    'Elegance',
    'Elegance Optic',
    'Mixology',
    'Gin Journeys',
    'Craft Brew',
    'Marquis',
    'Waterford × Elton John'
  ],
  'Christmas': [
    'Holiday Heirlooms',
    'Winter Wonders',
    'Christmas Mastercraft',
    'Christmas Ornaments',
    'Crystal Ornaments',
    'Festive Accessories',
    'Christmas Drinkware',
    'Christmas Gifts'
  ]
};

// Keep for backward compatibility
const COLLECTIONS = MAIN_CATEGORIES;

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
  const [faultValue, setFaultValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showFaultList, setShowFaultList] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState('All');
  const [selectedSubCollection, setSelectedSubCollection] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [editingProduct, setEditingProduct] = useState(null);
  const [showSellDialog, setShowSellDialog] = useState(false);
  const [sellBreakdown, setSellBreakdown] = useState({
    fromFree: 0,
    fromHold: 0,
    fromDisplay: 0
  });

  const [newProduct, setNewProduct] = useState({
    name: '',
    sku: '',
    mainCategory: 'Collections',
    subCategory: MAIN_CATEGORIES['Collections']?.[0] || 'Mastercraft',  // 👈 动态获取第一个
    totalStock: 0,
    minStockLevel: 2,
    retailPrice: 0
  });

  // Load products from Firebase
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'products'), async (snapshot) => {
      const productsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // ✅ 自动为旧数据添加 onFault 字段（只添加一次）
      for (const p of productsData) {
        if (p.onFault === undefined) {
          try {
            const productRef = doc(db, 'products', p.id);
            await updateDoc(productRef, { onFault: 0 });
            console.log(`✅ Added onFault field to product: ${p.name}`);
          } catch (error) {
            console.error(`❌ Failed to update product ${p.name}:`, error);
          }
        }
      }

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
    return Math.max(
      0,
      product.totalStock - (product.onHold || 0) - (product.onFault || 0)
    );  
    // available = total - hold，available里包含display和其他
  };

  // Filter and search products
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.sku.toLowerCase().includes(searchTerm.toLowerCase());
      const mainCat = p.mainCategory || 'Collections';
      const subCat = p.subCategory || 'Other';
      
      const matchesMain = selectedCollection === 'All' || mainCat === selectedCollection;
      const matchesSub = selectedSubCollection === 'All' || subCat === selectedSubCollection;
      
      return matchesSearch && matchesMain && matchesSub;
    });
  }, [products, searchTerm, selectedCollection, selectedSubCollection]);

  // Group products by category
  const groupedProducts = useMemo(() => {
    const grouped = {};
    filteredProducts.forEach(product => {
      const mainCat = product.mainCategory || 'Collections';
      const subCat = product.subCategory || 'Other';
      const key = `${mainCat} > ${subCat}`;
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(product);
    });
    return grouped;
  }, [filteredProducts]);

  // Check if product already exists
  const checkDuplicateProduct = (name, sku) => {
    const duplicateBySku = products.find(p => p.sku.toLowerCase() === sku.toLowerCase());
    const duplicateByName = products.find(p => p.name.toLowerCase() === name.toLowerCase());
    
    if (duplicateBySku) {
      return `A product with Article Number "${sku}" already exists: ${duplicateBySku.name}`;
    }
    
    if (duplicateByName) {
      return `A product with name "${name}" already exists (Article No: ${duplicateByName.sku})`;
    }
    
    return null;
  };


  const handleAddProduct = async () => {
    if (!newProduct.name || !newProduct.sku) {
      alert('Please fill in Product Name and Article Number');
      return;
    }
  
    // Check for duplicates
    const duplicateError = checkDuplicateProduct(newProduct.name, newProduct.sku);
    if (duplicateError) {
      alert(duplicateError);
      return;
    }
  
    try {
      // 添加调试
      console.log('Adding product with data:', {
        name: newProduct.name,
        sku: newProduct.sku,
        mainCategory: newProduct.mainCategory,
        subCategory: newProduct.subCategory,
        totalStock: newProduct.totalStock,
      });

      await addDoc(collection(db, 'products'), {
        name: newProduct.name,
        sku: newProduct.sku,
        mainCategory: newProduct.mainCategory,
        subCategory: newProduct.subCategory,
        totalStock: newProduct.totalStock,
        minStockLevel: newProduct.minStockLevel,
        retailPrice: newProduct.retailPrice,
        onHold: 0,
        onDisplay: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // 添加调试
      console.log('Product added successfully to Firebase');
      
      setShowAddProduct(false);
      setNewProduct({
        name: '',
        sku: '',
        mainCategory: 'Collections',
        subCategory: MAIN_CATEGORIES['Collections'][0],
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
      alert('Please fill in Product Name and Article Number');
      return;
    }

    const onHold = editingProduct.onHold || 0;
    const onDisplay = editingProduct.onDisplay || 0;
    if (editingProduct.totalStock < onHold + onDisplay) {
      alert(`Cannot reduce Total below Hold + Display quantity. 
  Currently: Hold=${onHold}, Display=${onDisplay}, Total must be at least ${onHold + onDisplay}`);
      return;
    }

    // Check for duplicates (excluding current product)
    const duplicateBySku = products.find(p => 
      p.id !== editingProduct.id && 
      p.sku.toLowerCase() === editingProduct.sku.toLowerCase()
    );
    
    const duplicateByName = products.find(p => 
      p.id !== editingProduct.id && 
      p.name.toLowerCase() === editingProduct.name.toLowerCase()
    );
    
    if (duplicateBySku) {
      alert(`A product with Article Number "${editingProduct.sku}" already exists: ${duplicateBySku.name}`);
      return;
    }
    
    if (duplicateByName) {
      alert(`A product with name "${editingProduct.name}" already exists (Article No: ${duplicateByName.sku})`);
      return;
    }

    try {
      const productRef = doc(db, 'products', editingProduct.id);
      
      const updateData = {
        name: editingProduct.name,
        sku: editingProduct.sku,
        mainCategory: editingProduct.mainCategory || 'Collections',
        subCategory: editingProduct.subCategory || 'Lismore Diamond',
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
      setFaultValue(product.onFault || 0);
    } else if (type === 'edit') {
      setEditingProduct({...product});
    } else if (type === 'sell') {
      // ✅ 在打开Sell modal时，初始化 sellBreakdown
      setSellBreakdown({
        fromFree: 0,
        fromHold: 0,
        fromDisplay: 0
      });
      setShowSellDialog(false); // 确保弹窗一开始是关闭的
    }
  };

  const closeModal = () => {
    setSelectedProduct(null);
    setModalType(null);
    setQuantity('');
    setNotes('');
    setEditingProduct(null);
    setShowSellDialog(false); 
    setSellBreakdown({ fromFree: 0, fromHold: 0, fromDisplay: 0 }); 
  };

  const handleStockOperation = async () => {
    if (!quantity || parseInt(quantity) <= 0) {
      alert('Please enter a valid quantity');
      return;
    }
  
    const qty = parseInt(quantity);
    // const onHold = selectedProduct.onHold || 0;
    // const onDisplay = selectedProduct.onDisplay || 0;
    // const available = getAvailable(selectedProduct);
    
    switch(modalType) {
      case 'receive': {
        const newTotal = selectedProduct.totalStock + qty;
        try {
          const productRef = doc(db, 'products', selectedProduct.id);
          await updateDoc(productRef, {
            totalStock: newTotal,
            updatedAt: serverTimestamp()
          });
  
          await addDoc(collection(db, 'transactions'), {
            productId: selectedProduct.id,
            productName: selectedProduct.name,
            productSku: selectedProduct.sku,
            type: 'receive',
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
        break;
      }
      
      case 'sell': {
        if (!quantity || parseInt(quantity) <= 0) {
          alert('Please enter a valid quantity');
          return;
        }
      
        const qty = parseInt(quantity);
        
        if (qty > selectedProduct.totalStock) {
          alert(`Sell quantity cannot exceed total stock (${selectedProduct.totalStock})`);
          return;
        }
      
        const onHold = selectedProduct.onHold || 0;
        const onDisplay = selectedProduct.onDisplay || 0;
        const onFault = selectedProduct.onFault || 0;
        const freeStock = selectedProduct.totalStock - onHold - onDisplay - onFault; // ← 新        
      
        const sources = [];
        if (freeStock > 0) sources.push('free');
        if (onHold > 0) sources.push('hold');
        if (onDisplay > 0) sources.push('display');
      
        // 情况1：只有一个来源 → 直接销售
        if (sources.length <= 1) {
          let holdToReduce = 0;
          let displayToReduce = 0;
      
          if (freeStock >= qty) {
            holdToReduce = 0;
            displayToReduce = 0;
          } else if (onHold >= qty) {
            holdToReduce = qty;
            displayToReduce = 0;
          } else if (onDisplay >= qty) {
            holdToReduce = 0;
            displayToReduce = qty;
          } else {
            alert('Insufficient stock!');
            return;
          }
      
          const newTotal = selectedProduct.totalStock - qty;
          const newHold = onHold - holdToReduce;
          const newDisplay = onDisplay - displayToReduce;
          
          try {
            const productRef = doc(db, 'products', selectedProduct.id);
            await updateDoc(productRef, {
              totalStock: Math.max(0, newTotal),
              onHold: Math.max(0, newHold),
              onDisplay: Math.max(0, newDisplay),
              onFault: parseInt(faultValue) || 0,
              updatedAt: serverTimestamp()
            });
      
            await addDoc(collection(db, 'transactions'), {
              productId: selectedProduct.id,
              productName: selectedProduct.name,
              productSku: selectedProduct.sku,
              type: 'sell',
              quantity: qty,
              quantityBefore: selectedProduct.totalStock,
              quantityAfter: newTotal,
              notes: notes || (holdToReduce > 0 || displayToReduce > 0 
                ? `Reduced Hold by ${holdToReduce}, Display by ${displayToReduce}`
                : ''),
              timestamp: serverTimestamp()
            });
      
            closeModal();
          } catch (error) {
            console.error('Operation failed:', error);
            alert('Operation failed');
          }
        } 
        // 情况2：有多个来源 → 显示弹窗
        else {
          // ✅ 初始化默认分配
          const fromDisplay = Math.min(qty, onDisplay);
          const remaining = qty - fromDisplay;
          const fromHold = Math.min(remaining, onHold);
          const freeStock = selectedProduct.totalStock - onHold - onDisplay - (selectedProduct.onFault || 0);
          const fromFree = Math.min(remaining - fromHold, Math.max(0, freeStock));
          
          setSellBreakdown({
            fromFree,
            fromHold,
            fromDisplay
          });          
      
          // ✅ 在这里设置初始值
          setSellBreakdown({
            fromFree: fromFree,
            fromHold: fromHold,
            fromDisplay: fromDisplay
          });
      
          // ✅ 然后立即打开弹窗
          setShowSellDialog(true);
        }
        break;
      }
      
      case 'return': {
        const newTotal = selectedProduct.totalStock + qty;
        try {
          const productRef = doc(db, 'products', selectedProduct.id);
          await updateDoc(productRef, {
            totalStock: newTotal,
            updatedAt: serverTimestamp()
          });
  
          await addDoc(collection(db, 'transactions'), {
            productId: selectedProduct.id,
            productName: selectedProduct.name,
            productSku: selectedProduct.sku,
            type: 'return',
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
        break;
      }
      
      default:
        return;
    }
  };

  const handleManageHoldDisplay = async () => {
    let newHold = parseInt(holdValue);
    let newDisplay = parseInt(displayValue);
    let newFault = parseInt(faultValue) || 0;
  
    // 🧱 新增：检查是否所有库存都是 Fault
    if (
      (selectedProduct.onFault || 0) >= selectedProduct.totalStock &&
      (newHold > (selectedProduct.onHold || 0) || newDisplay > (selectedProduct.onDisplay || 0))
    ) {
      alert("All items are faulty — cannot allocate new Hold or Display.");
      return;
    }
  
    // 🧱 新增：防止 Fault 超过总库存
    if (newFault > selectedProduct.totalStock) {
      alert(`Fault quantity (${newFault}) cannot exceed Total Stock (${selectedProduct.totalStock}).`);
      return;
    }

    // 🧱 防止 Hold + Display + Fault 超过总库存
    if (newHold + newDisplay + newFault > selectedProduct.totalStock) {
      alert(`Total allocation exceeds Total Stock (${selectedProduct.totalStock}). Please adjust your numbers.`);
      return;
    }

    // ✅ 原有逻辑（保留）
    if (newHold + newDisplay > selectedProduct.totalStock) {
      const choice = prompt(
        `Hold (${newHold}) + Display (${newDisplay}) = ${newHold + newDisplay} exceeds Total (${selectedProduct.totalStock}).\n\n` +
        `Options:\n` +
        `1. Keep Display only (Hold=0, Display=${newDisplay})\n` +
        `2. Keep Hold only (Hold=${newHold}, Display=0)\n` +
        `3. Cancel`,
        '1'
      );
      
      if (choice === '1') {
        newHold = 0;
        // newDisplay 保持不变
      } else if (choice === '2') {
        newDisplay = 0;
        // newHold 保持不变
      } else if (choice === null || choice === '3') {
        return; // 用户取消
      } else {
        alert('Invalid choice');
        return;
      }
    }
  
    // ✅ 原有保存逻辑，轻微增加 onFault 的更新和 note 的记录
    try {
      const productRef = doc(db, 'products', selectedProduct.id);
      await updateDoc(productRef, {
        onHold: newHold,
        onDisplay: newDisplay,
        onFault: newFault,  // 👈 新增字段
        updatedAt: serverTimestamp()
      });
  
      await addDoc(collection(db, 'transactions'), {
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        productSku: selectedProduct.sku,
        type: 'manage',
        quantity: 0,
        notes: `Hold: ${selectedProduct.onHold || 0} → ${newHold}, Display: ${selectedProduct.onDisplay || 0} → ${newDisplay}, Fault: ${selectedProduct.onFault || 0} → ${newFault}`, // 👈 这里也更新日志
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
            <button
              onClick={() => setShowFaultList(!showFaultList)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
            >
              <AlertCircle className="w-4 h-4" />
              Fault List
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
              placeholder="Search by product name or article number..."
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
                                  Article No: {product.sku} | {product.subCategory || 'N/A'}
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
                                <AlertCircle className="w-4 h-4 text-gray-400" />
                                <span className="text-sm text-gray-600">Fault:</span>
                                <span className="font-semibold text-gray-900">{product.onFault || 0}</span>
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
                              disabled={product.totalStock === 0 || (product.totalStock - (product.onFault || 0)) === 0}
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
                <label className="block text-sm font-medium text-gray-700 mb-2">Product Article Number *</label>
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
                <label className="block text-sm font-medium text-gray-700 mb-2">Main Category</label>
                <select
                  value={modalType === 'edit' ? editingProduct?.mainCategory : newProduct.mainCategory}
                  onChange={(e) => {
                    const newCat = e.target.value;
                    const firstSub = MAIN_CATEGORIES[newCat][0];  // 👈 获取第一个子分类
                    if (modalType === 'edit') {
                      setEditingProduct({...editingProduct, mainCategory: newCat, subCategory: firstSub});
                    } else {
                      setNewProduct({...newProduct, mainCategory: newCat, subCategory: firstSub});
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {Object.keys(MAIN_CATEGORIES).map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Sub-Collection</label>
                <select
                  value={modalType === 'edit' ? editingProduct?.subCategory : newProduct.subCategory}
                  onChange={(e) => modalType === 'edit'
                    ? setEditingProduct({...editingProduct, subCategory: e.target.value})
                    : setNewProduct({...newProduct, subCategory: e.target.value})
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {MAIN_CATEGORIES[modalType === 'edit' ? editingProduct?.mainCategory : newProduct.mainCategory]?.map(sub => (
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
                        <p className="text-sm text-gray-500">Article No: {t.productSku}</p>
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
      {/* Fault List Modal */}
      {showFaultList && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Fault Products</h2>
              <button onClick={() => setShowFaultList(false)} className="text-gray-500 hover:text-gray-700 text-2xl">×</button>
            </div>
            {products.filter(p => (p.onFault || 0) > 0).length === 0 ? (
              <p className="text-center text-gray-500 py-8">No faulty products</p>
            ) : (
              <div className="space-y-3">
                {products.filter(p => (p.onFault || 0) > 0).map(p => (
                  <div key={p.id} className="border-b pb-3">
                    <p className="font-medium text-gray-900">{p.name}</p>
                    <p className="text-sm text-gray-500">Article No: {p.sku}</p>
                    <p className="text-sm text-red-600 font-semibold mt-1">Fault: {p.onFault}</p>
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
              <p className="text-sm text-gray-500">Article No: {selectedProduct.sku}</p>
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-1">Current Stock</p>
              <p className="font-medium">
                Total: {selectedProduct.totalStock} | Available: {getAvailable(selectedProduct)}
              </p>
              {modalType === 'sell' && (
                <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded">
                  <p className="text-xs text-blue-800 font-medium">
                    Stock Details:
                  </p>
                  <p className="text-xs text-blue-700 mt-1">
                    • Total: {selectedProduct.totalStock} | Hold: {selectedProduct.onHold || 0} | Display: {selectedProduct.onDisplay || 0}
                  </p>
                  <p className="text-xs text-blue-700">
                    • Available (free stock): {getAvailable(selectedProduct)}
                  </p>
                  {getAvailable(selectedProduct) === 0 && selectedProduct.totalStock > 0 && (
                    <p className="text-xs text-yellow-800 mt-1 font-medium">
                      ⚠️ All items are on Hold/Display. You will be prompted to choose which to sell from.
                    </p>
                  )}
                </div>
              )}
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
                Notes
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Delivery note / Till Number..."
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

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Fault Quantity</label>
              <input
                type="number"
                value={faultValue}
                onChange={(e) => setFaultValue(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                min="0"
                max={selectedProduct.totalStock}
              />
            </div>

            <div className="mb-6 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-blue-900">New Available Stock</span>
                <span className="font-bold text-lg text-blue-600">
                  {selectedProduct.totalStock - holdValue - displayValue - faultValue}
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

      {/* Sell分配选择弹窗 */}
      {showSellDialog && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">Choose Sales Source</h2>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-1">Product</p>
              <p className="font-medium">{selectedProduct.name}</p>
            </div>

            <div className="mb-6 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-700 mb-3">Total to Sell: {quantity}</p>
              
              <div className="space-y-3 text-sm">
                {/* Free Stock Input */}
                {(selectedProduct.totalStock - (selectedProduct.onHold || 0) - (selectedProduct.onDisplay || 0)) > 0 && (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      value={sellBreakdown.fromFree}
                      onChange={(e) => {
                        const val = Math.max(0, parseInt(e.target.value) || 0);
                        const maxFree = selectedProduct.totalStock
                          - (selectedProduct.onHold || 0)
                          - (selectedProduct.onDisplay || 0)
                          - (selectedProduct.onFault || 0); // ← 新
                        console.log('fromFree changed:', val, 'max:', maxFree);
                        setSellBreakdown({...sellBreakdown, fromFree: Math.min(val, maxFree)});
                      }}
                      className="w-16 px-2 py-1 border border-gray-300 rounded text-center"
                    />
                    <span className="text-gray-700">from Free Stock (max: {selectedProduct.totalStock - (selectedProduct.onHold || 0) - (selectedProduct.onDisplay || 0)})</span>
                  </div>
                )}
                
                {/* Hold Input */}
                {(selectedProduct.onHold || 0) > 0 && (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      max={selectedProduct.onHold || 0}
                      value={sellBreakdown.fromHold}
                      onChange={(e) => {
                        const val = Math.max(0, parseInt(e.target.value) || 0);
                        setSellBreakdown({...sellBreakdown, fromHold: Math.min(val, selectedProduct.onHold || 0)});
                      }}
                      className="w-16 px-2 py-1 border border-gray-300 rounded text-center"
                    />
                    <span className="text-gray-700">from Hold (max: {selectedProduct.onHold || 0})</span>
                  </div>
                )}
                
                {/* Display Input */}
                {(selectedProduct.onDisplay || 0) > 0 && (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      max={selectedProduct.onDisplay || 0}
                      value={sellBreakdown.fromDisplay}
                      onChange={(e) => {
                        const val = Math.max(0, parseInt(e.target.value) || 0);
                        setSellBreakdown({...sellBreakdown, fromDisplay: Math.min(val, selectedProduct.onDisplay || 0)});
                      }}
                      className="w-16 px-2 py-1 border border-gray-300 rounded text-center"
                    />
                    <span className="text-gray-700">from Display (max: {selectedProduct.onDisplay || 0})</span>
                  </div>
                )}
              </div>
            </div>

            {/* Validation Status */}
            <div className="mb-4 p-3 bg-blue-50 rounded border border-blue-200">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-blue-900">Total Selected:</span>
                <span className="text-sm font-bold text-blue-600">
                  {sellBreakdown.fromFree + sellBreakdown.fromHold + sellBreakdown.fromDisplay}
                </span>
              </div>
              <p className="text-xs text-blue-700">
                {sellBreakdown.fromFree + sellBreakdown.fromHold + sellBreakdown.fromDisplay === parseInt(quantity)
                  ? '✅ Selection valid - Ready to confirm'
                  : sellBreakdown.fromFree + sellBreakdown.fromHold + sellBreakdown.fromDisplay > parseInt(quantity)
                  ? '❌ Total exceeds quantity needed'
                  : `⚠️ Need ${parseInt(quantity) - (sellBreakdown.fromFree + sellBreakdown.fromHold + sellBreakdown.fromDisplay)} more`
                }
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={async () => {
                  const total = sellBreakdown.fromFree + sellBreakdown.fromHold + sellBreakdown.fromDisplay;
                  if (total !== parseInt(quantity)) {
                    alert(`Total must equal ${quantity}. Currently selected: ${total}`);
                    return;
                  }

                  // 执行销售
                  const newTotal = selectedProduct.totalStock - parseInt(quantity);
                  const newHold = (selectedProduct.onHold || 0) - sellBreakdown.fromHold;
                  const newDisplay = (selectedProduct.onDisplay || 0) - sellBreakdown.fromDisplay;

                  try {
                    const productRef = doc(db, 'products', selectedProduct.id);
                    await updateDoc(productRef, {
                      totalStock: Math.max(0, newTotal),
                      onHold: Math.max(0, newHold),
                      onDisplay: Math.max(0, newDisplay),
                      updatedAt: serverTimestamp()
                    });

                    await addDoc(collection(db, 'transactions'), {
                      productId: selectedProduct.id,
                      productName: selectedProduct.name,
                      productSku: selectedProduct.sku,
                      type: 'sell',
                      quantity: parseInt(quantity),
                      quantityBefore: selectedProduct.totalStock,
                      quantityAfter: newTotal,
                      notes: notes || `From: Free=${sellBreakdown.fromFree}, Hold=${sellBreakdown.fromHold}, Display=${sellBreakdown.fromDisplay}`,
                      timestamp: serverTimestamp()
                    });

                    setShowSellDialog(false);
                    closeModal();
                  } catch (error) {
                    console.error('Operation failed:', error);
                    alert('Operation failed');
                  }
                }}
                disabled={sellBreakdown.fromFree + sellBreakdown.fromHold + sellBreakdown.fromDisplay !== parseInt(quantity)}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirm
              </button>
              <button
                onClick={() => {
                  setShowSellDialog(false);
                  setSellBreakdown({ fromFree: 0, fromHold: 0, fromDisplay: 0 });
                }}
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