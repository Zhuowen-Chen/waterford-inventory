// ==================== PART 1: IMPORTS & CONSTANTS ====================
// Copy this entire section first

import React, { useState, useEffect, useMemo } from 'react';
import { Search, Plus, Package, TrendingUp, TrendingDown, AlertCircle, Eye, Lock, History, Edit2, Trash2, ChevronRight, Filter, BarChart3, Home, ShoppingCart, PieChart, Calendar } from 'lucide-react';
import { db, auth } from './firebase';  
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, limit, serverTimestamp } from 'firebase/firestore';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';

// Waterford Collections Structure
const MAIN_CATEGORIES = {
  'Collections': [
    'Lismore Red', 
    'Lismore', 
    'Lismore Essence', 
    'Lismore Black', 
    'Lismore Diamond',
    'Lismore Arcus',
    'The Aran',
    'Heritage Mastercraft',
    'Irish Lace',
    'Copper Coast',
    'Celebration',
    'Connoisseur',
    'Elegance',
    'Elegance Optic',
    'Mixology',
    'Gin Journeys',
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

const COLLECTIONS = MAIN_CATEGORIES;
const CATEGORIES = ['Stemware', 'Barware', 'Giftware', 'Home Décor', 'Lighting', 'Other'];

const InventoryView = ({ 
  searchTerm, 
  setSearchTerm, 
  showFilters, 
  setShowFilters,
  selectedCollection,
  setSelectedCollection,
  selectedSubCollection,
  setSelectedSubCollection,
  filteredProducts,
  getAvailable,
  openModal,
  handleDeleteProduct
}) => (
  <div className="space-y-6">
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition flex items-center gap-2"
        >
          <Filter className="w-5 h-5" />
          Filter
        </button>
      </div>

      {showFilters && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t">
          <select
            value={selectedCollection}
            onChange={(e) => {
              setSelectedCollection(e.target.value);
              setSelectedSubCollection('All');
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg"
          >
            <option value="All">All Collections</option>
            {Object.keys(MAIN_CATEGORIES).map(col => (
              <option key={col} value={col}>{col}</option>
            ))}
          </select>
          <select
            value={selectedSubCollection}
            onChange={(e) => setSelectedSubCollection(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg"
            disabled={selectedCollection === 'All'}
          >
            <option value="All">All Sub-Collections</option>
            {selectedCollection !== 'All' && MAIN_CATEGORIES[selectedCollection]?.map(sub => (
              <option key={sub} value={sub}>{sub}</option>
            ))}
          </select>
        </div>
      )}
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {filteredProducts.map(product => {
        const available = getAvailable(product);
        return (
          <div key={product.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">{product.name}</h3>
                <p className="text-sm text-gray-500 mt-1">{product.sku} • {product.subCategory}</p>
              </div>
              <div className="flex gap-1">
                <button 
                  onClick={() => openModal(product, 'edit')}
                  className="p-2 text-gray-400 hover:text-blue-600 rounded"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => handleDeleteProduct(product)}
                  className="p-2 text-gray-400 hover:text-red-600 rounded"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-5 gap-2 mb-4">
              <div className="text-center p-2 bg-gray-50 rounded">
                <p className="text-xs text-gray-500">Total</p>
                <p className="font-bold text-gray-900">{product.totalStock}</p>
              </div>
              <div className="text-center p-2 bg-blue-50 rounded">
                <p className="text-xs text-blue-600">Hold</p>
                <p className="font-bold text-blue-900">{product.onHold}</p>
              </div>
              <div className="text-center p-2 bg-purple-50 rounded">
                <p className="text-xs text-purple-600">Display</p>
                <p className="font-bold text-purple-900">{product.onDisplay}</p>
              </div>
              <div className="text-center p-2 bg-red-50 rounded">
                <p className="text-xs text-red-600">Fault</p>
                <p className="font-bold text-red-900">{product.onFault || 0}</p>
              </div>
              <div className="text-center p-2 bg-green-50 rounded">
                <p className="text-xs text-green-600">Available</p>
                <p className={`font-bold ${available === 0 ? 'text-red-600' : available <= product.minStockLevel ? 'text-yellow-600' : 'text-green-600'}`}>
                  {available}
                </p>
              </div>
            </div>

            {available <= product.minStockLevel && (
              <div className={`mb-3 p-2 rounded text-sm flex items-center gap-2 ${
                available === 0 ? 'bg-red-50 text-red-700' : 'bg-yellow-50 text-yellow-700'
              }`}>
                <AlertCircle className="w-4 h-4" />
                {available === 0 ? 'Out of stock!' : 'Low stock - reorder recommended'}
              </div>
            )}

            <div className="flex gap-2 flex-wrap">
              <button 
                onClick={() => openModal(product, 'receive')}
                className="flex-1 min-w-[70px] px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm"
              >
                Receive
              </button>
              <button 
                onClick={() => openModal(product, 'sell')}
                className="flex-1 min-w-[70px] px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm disabled:opacity-50"
                disabled={available === 0}
              >
                Sell
              </button>
              <button 
                onClick={() => openModal(product, 'return')}
                className="flex-1 min-w-[70px] px-3 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 text-sm"
              >
                Return
              </button>
              <button 
                onClick={() => openModal(product, 'manage')}
                className="flex-1 min-w-[70px] px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm"
              >
                Manage
              </button>
            </div>
          </div>
        );
      })}
    </div>

    {filteredProducts.length === 0 && (
      <div className="text-center py-12">
        <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">No products found</p>
      </div>
    )}
  </div>
);

// ==================== PART 2 FIXED: COMPONENT START & STATE ====================
// Replace your Part 2 with this cleaned version

function App() {
  // Auth states
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // View states - NEW: Add currentView
  const [currentView, setCurrentView] = useState('dashboard');
  
  // Data states
  const [products, setProducts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  
  // UI states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [modalType, setModalType] = useState(null);
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');
  const [holdValue, setHoldValue] = useState(0);
  const [displayValue, setDisplayValue] = useState(0);
  const [faultValue, setFaultValue] = useState(0);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showLowStockList, setShowLowStockList] = useState(false);
  const [showOutOfStockList, setShowOutOfStockList] = useState(false);
  const [showSellDialog, setShowSellDialog] = useState(false);
  
  // Filter states
  const [selectedCollection, setSelectedCollection] = useState('All');
  const [selectedSubCollection, setSelectedSubCollection] = useState('All');
  
  // Edit states
  const [editingProduct, setEditingProduct] = useState(null);
  const [quickActionSku, setQuickActionSku] = useState('');
  
  // Sell breakdown state
  const [sellBreakdown, setSellBreakdown] = useState({
    fromFree: 0,
    fromHold: 0,
    fromDisplay: 0
  });

  const [newProduct, setNewProduct] = useState({
    name: '',
    sku: '',
    mainCategory: 'Collections',
    subCategory: MAIN_CATEGORIES['Collections']?.[0] || 'Mastercraft',
    totalStock: 0,
    minStockLevel: 2,
    retailPrice: 0
  });

// ==================== PART 3 FIXED: useEffect HOOKS & HELPER FUNCTIONS ====================
// Replace your Part 3 with this cleaned version

  // Check login status
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Login function
  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
    } catch (error) {
      alert('Login failed: ' + error.message);
    }
  };

  // Logout function
  const handleLogout = () => {
    signOut(auth);
  };

  // Load products from Firebase
  useEffect(() => {
    if (!user) return;

    const unsubscribe = onSnapshot(collection(db, 'products'), async (snapshot) => {
      const productsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Auto-add onFault field for old data
      for (const p of productsData) {
        if (p.onFault === undefined) {
          try {
            const productRef = doc(db, 'products', p.id);
            await updateDoc(productRef, { onFault: 0 });
          } catch (error) {
            console.error(`Failed to update product ${p.name}:`, error);
          }
        }
      }

      setProducts(productsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Load transactions
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'transactions'), orderBy('timestamp', 'desc'), limit(50));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const transactionsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTransactions(transactionsData);
    });
    return () => unsubscribe();
  }, [user]);

  // Helper function: Get available stock
  const getAvailable = (product) => {
    return Math.max(
      0,
      product.totalStock - (product.onHold || 0) - (product.onFault || 0)
    );
  };

  // Filter products
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products.length, searchTerm, selectedCollection, selectedSubCollection]);

  // Statistics - NEW for Dashboard
  const stats = useMemo(() => {
    const totalProducts = products.length;
    const lowStock = products.filter(p => getAvailable(p) > 0 && getAvailable(p) <= p.minStockLevel).length;
    const outOfStock = products.filter(p => getAvailable(p) === 0).length;
    const totalValue = products.reduce((sum, p) => sum + (p.totalStock * p.retailPrice), 0);
    
    return { totalProducts, lowStock, outOfStock, totalValue };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products.length]);

  // Check duplicate product
  const checkDuplicateProduct = (name, sku, excludeId = null) => {
    const duplicateBySku = products.find(p => 
      p.id !== excludeId && p.sku.toLowerCase() === sku.toLowerCase()
    );
    const duplicateByName = products.find(p => 
      p.id !== excludeId && p.name.toLowerCase() === name.toLowerCase()
    );
    
    if (duplicateBySku) {
      return `A product with Article Number "${sku}" already exists: ${duplicateBySku.name}`;
    }
    
    if (duplicateByName) {
      return `A product with name "${name}" already exists (Article No: ${duplicateByName.sku})`;
    }
    
    return null;
  };

  // Format timestamp for display
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

  // ==================== PART 4: PRODUCT OPERATION FUNCTIONS ====================
// Copy this section after Part 3

  // Add Product
  const handleAddProduct = async () => {
    if (!newProduct.name || !newProduct.sku) {
      alert('Please fill in Product Name and Article Number');
      return;
    }

    const duplicateError = checkDuplicateProduct(newProduct.name, newProduct.sku);
    if (duplicateError) {
      alert(duplicateError);
      return;
    }

    try {
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
        onFault: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
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

  // Edit Product
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

    const duplicateError = checkDuplicateProduct(editingProduct.name, editingProduct.sku, editingProduct.id);
    if (duplicateError) {
      alert(duplicateError);
      return;
    }

    try {
      const productRef = doc(db, 'products', editingProduct.id);
      
      await updateDoc(productRef, {
        name: editingProduct.name,
        sku: editingProduct.sku,
        mainCategory: editingProduct.mainCategory || 'Collections',
        subCategory: editingProduct.subCategory || 'Lismore Diamond',
        totalStock: editingProduct.totalStock || 0,
        minStockLevel: editingProduct.minStockLevel || 2,
        retailPrice: editingProduct.retailPrice || 0,
        updatedAt: serverTimestamp()
      });

      setModalType(null);
      setEditingProduct(null);
      alert('Product updated successfully!');
    } catch (error) {
      console.error('Error updating product:', error);
      alert('Failed to update product: ' + error.message);
    }
  };

  // Delete Product
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

  // Open Modal
  const openModal = (product, type) => {
    setSelectedProduct(product);
    setModalType(type);
    setQuantity('');
    setNotes('');
    setQuickActionSku('');
    
    if (type === 'manage') {
      setHoldValue(product.onHold || 0);
      setDisplayValue(product.onDisplay || 0);
      setFaultValue(product.onFault || 0);
    } else if (type === 'edit') {
      setEditingProduct({...product});
    } else if (type === 'sell') {
      setSellBreakdown({
        fromFree: 0,
        fromHold: 0,
        fromDisplay: 0
      });
      setShowSellDialog(false);
    }
  };

  // Close Modal
  const closeModal = () => {
    setSelectedProduct(null);
    setModalType(null);
    setQuantity('');
    setNotes('');
    setEditingProduct(null);
    setQuickActionSku('');
    setShowSellDialog(false);
    setSellBreakdown({ fromFree: 0, fromHold: 0, fromDisplay: 0 });
  };

  // ==================== PART 5: STOCK OPERATION FUNCTIONS ====================
// Copy this section after Part 4

  // Handle Stock Operations (Receive/Sell/Return)
  const handleStockOperation = async () => {
    // Quick actions from dashboard
    if (modalType === 'quick-receive' || modalType === 'quick-sell') {
      if (!quickActionSku || !quantity || parseInt(quantity) <= 0) {
        alert('Please fill in Article Number and Quantity');
        return;
      }

      const product = products.find(p => p.sku.toLowerCase() === quickActionSku.toLowerCase());
      if (!product) {
        alert(`Product with Article Number "${quickActionSku}" not found`);
        return;
      }

      const qty = parseInt(quantity);

      if (modalType === 'quick-receive') {
        const newTotal = product.totalStock + qty;
        try {
          const productRef = doc(db, 'products', product.id);
          await updateDoc(productRef, {
            totalStock: newTotal,
            updatedAt: serverTimestamp()
          });

          await addDoc(collection(db, 'transactions'), {
            productId: product.id,
            productName: product.name,
            productSku: product.sku,
            type: 'receive',
            quantity: qty,
            quantityBefore: product.totalStock,
            quantityAfter: newTotal,
            notes: notes || '',
            timestamp: serverTimestamp()
          });

          alert(`Received ${qty} units of ${product.name}`);
          closeModal();
        } catch (error) {
          console.error('Operation failed:', error);
          alert('Operation failed');
        }
      } else if (modalType === 'quick-sell') {
        if (qty > getAvailable(product)) {
          alert('Insufficient available stock!');
          return;
        }
        const newTotal = product.totalStock - qty;
        try {
          const productRef = doc(db, 'products', product.id);
          await updateDoc(productRef, {
            totalStock: newTotal,
            updatedAt: serverTimestamp()
          });

          await addDoc(collection(db, 'transactions'), {
            productId: product.id,
            productName: product.name,
            productSku: product.sku,
            type: 'sell',
            quantity: qty,
            quantityBefore: product.totalStock,
            quantityAfter: newTotal,
            notes: notes || '',
            timestamp: serverTimestamp()
          });

          alert(`Sold ${qty} units of ${product.name}`);
          closeModal();
        } catch (error) {
          console.error('Operation failed:', error);
          alert('Operation failed');
        }
      }
      return;
    }

    // Regular operations
    if (!quantity || parseInt(quantity) <= 0) {
      alert('Please enter a valid quantity');
      return;
    }

    const qty = parseInt(quantity);
    
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
        if (qty > selectedProduct.totalStock) {
          alert(`Sell quantity cannot exceed total stock (${selectedProduct.totalStock})`);
          return;
        }

        const onHold = selectedProduct.onHold || 0;
        const onDisplay = selectedProduct.onDisplay || 0;
        const onFault = selectedProduct.onFault || 0;
        const freeStock = selectedProduct.totalStock - onHold - onDisplay - onFault;

        const sources = [];
        if (freeStock > 0) sources.push('free');
        if (onHold > 0) sources.push('hold');
        if (onDisplay > 0) sources.push('display');

        // Single source - direct sale
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
        // Multiple sources - show dialog
        else {
          const fromDisplay = Math.min(qty, onDisplay);
          const remaining = qty - fromDisplay;
          const fromHold = Math.min(remaining, onHold);
          const fromFree = Math.min(remaining - fromHold, Math.max(0, freeStock));
          
          setSellBreakdown({
            fromFree,
            fromHold,
            fromDisplay
          });
          
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

  // Manage Hold/Display/Fault
  const handleManageHoldDisplay = async () => {
    let newHold = parseInt(holdValue);
    let newDisplay = parseInt(displayValue);
    let newFault = parseInt(faultValue) || 0;

    if (
      (selectedProduct.onFault || 0) >= selectedProduct.totalStock &&
      (newHold > (selectedProduct.onHold || 0) || newDisplay > (selectedProduct.onDisplay || 0))
    ) {
      alert("All items are faulty – cannot allocate new Hold or Display.");
      return;
    }

    if (newFault > selectedProduct.totalStock) {
      alert(`Fault quantity (${newFault}) cannot exceed Total Stock (${selectedProduct.totalStock}).`);
      return;
    }

    if (newHold + newDisplay + newFault > selectedProduct.totalStock) {
      alert(`Total allocation exceeds Total Stock (${selectedProduct.totalStock}). Please adjust your numbers.`);
      return;
    }

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
      } else if (choice === '2') {
        newDisplay = 0;
      } else if (choice === null || choice === '3') {
        return;
      } else {
        alert('Invalid choice');
        return;
      }
    }

    try {
      const productRef = doc(db, 'products', selectedProduct.id);
      await updateDoc(productRef, {
        onHold: newHold,
        onDisplay: newDisplay,
        onFault: newFault,
        updatedAt: serverTimestamp()
      });

      await addDoc(collection(db, 'transactions'), {
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        productSku: selectedProduct.sku,
        type: 'manage',
        quantity: 0,
        notes: `Hold: ${selectedProduct.onHold || 0} → ${newHold}, Display: ${selectedProduct.onDisplay || 0} → ${newDisplay}, Fault: ${selectedProduct.onFault || 0} → ${newFault}`,
        timestamp: serverTimestamp()
      });

      closeModal();
    } catch (error) {
      console.error('Operation failed:', error);
      alert('Operation failed');
    }
  };

  // ==================== PART 6: VIEW COMPONENTS ====================
// Copy this section after Part 5

  // ========== DASHBOARD VIEW ==========
  const DashboardView = () => (
    <div className="space-y-6">
      {/* Stats Cards - 响应式设计 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Products */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow-sm border border-blue-200 p-3 sm:p-4">
          <div className="flex flex-col items-center text-center">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-500 bg-opacity-20 rounded-xl flex items-center justify-center mb-2">
              <Package className="w-5 h-5 sm:w-6 sm:h-6 text-blue-700" />
            </div>
            <p className="text-xs text-blue-700 font-medium mb-1">Total Products</p>
            <p className="text-2xl sm:text-3xl font-bold text-blue-900 break-all">{stats.totalProducts}</p>
          </div>
        </div>

        {/* Total Inventory Value */}
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl shadow-sm border border-green-200 p-3 sm:p-4">
          <div className="flex flex-col items-center text-center">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-500 bg-opacity-20 rounded-xl flex items-center justify-center mb-2">
              <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-green-700" />
            </div>
            <p className="text-xs text-green-700 font-medium mb-1">Total Value</p>
            <p className={`font-bold text-green-900 break-all ${
              stats.totalValue >= 100000 
                ? 'text-lg sm:text-xl' 
                : stats.totalValue >= 10000 
                ? 'text-xl sm:text-2xl' 
                : 'text-2xl sm:text-3xl'
            }`}>
              €{stats.totalValue.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Low Stock Items - Clickable */}
        <div 
          onClick={() => setShowLowStockList(true)}
          className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl shadow-sm border border-yellow-200 p-3 sm:p-4 cursor-pointer hover:shadow-md transition"
        >
          <div className="flex flex-col items-center text-center">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-yellow-500 bg-opacity-20 rounded-xl flex items-center justify-center mb-2">
              <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-700" />
            </div>
            <p className="text-xs text-yellow-700 font-medium mb-1">Low Stock</p>
            <p className="text-2xl sm:text-3xl font-bold text-yellow-900 break-all">{stats.lowStock}</p>
            <p className="text-xs text-yellow-600 mt-1 underline">Click to view</p>
          </div>
        </div>

        {/* Out of Stock - Clickable */}
        <div 
          onClick={() => setShowOutOfStockList(true)}
          className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl shadow-sm border border-red-200 p-3 sm:p-4 cursor-pointer hover:shadow-md transition"
        >
          <div className="flex flex-col items-center text-center">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-red-500 bg-opacity-20 rounded-xl flex items-center justify-center mb-2">
              <TrendingDown className="w-5 h-5 sm:w-6 sm:h-6 text-red-700" />
            </div>
            <p className="text-xs text-red-700 font-medium mb-1">Out of Stock</p>
            <p className="text-2xl sm:text-3xl font-bold text-red-900 break-all">{stats.outOfStock}</p>
            <p className="text-xs text-red-600 mt-1 underline">Click to view</p>
          </div>
        </div>
      </div>

      {/* Recent Activity & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low Stock Alert */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="w-5 h-5 text-yellow-600" />
            <h3 className="text-lg font-semibold text-gray-900">Attention Required</h3>
          </div>
          <div className="space-y-3">
            {products.filter(p => getAvailable(p) <= p.minStockLevel).slice(0, 5).map(p => (
              <div key={p.id} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <div>
                  <p className="font-medium text-gray-900 text-sm">{p.name}</p>
                  <p className="text-xs text-gray-500">{p.sku}</p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-bold ${getAvailable(p) === 0 ? 'text-red-600' : 'text-yellow-600'}`}>
                    {getAvailable(p)} left
                  </p>
                  <p className="text-xs text-gray-500">Min: {p.minStockLevel}</p>
                </div>
              </div>
            ))}
            {products.filter(p => getAvailable(p) <= p.minStockLevel).length === 0 && (
              <p className="text-center text-gray-500 py-4">All products are sufficiently stocked</p>
            )}
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <History className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
          </div>
          <div className="space-y-3">
            {transactions.slice(0, 5).map(t => (
              <div key={t.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className={`p-2 rounded-full ${
                  t.type === 'sell' ? 'bg-blue-100' : 
                  t.type === 'receive' ? 'bg-green-100' : 
                  'bg-purple-100'
                }`}>
                  {t.type === 'sell' ? 
                    <TrendingDown className="w-4 h-4 text-blue-600" /> :
                    t.type === 'receive' ?
                    <TrendingUp className="w-4 h-4 text-green-600" /> :
                    <Package className="w-4 h-4 text-purple-600" />
                  }
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900 text-sm">{t.productName}</p>
                  <p className="text-xs text-gray-500">
                    {t.type === 'sell' ? 'Sold' : t.type === 'receive' ? 'Received' : 'Returned'} {t.quantity} units
                  </p>
                </div>
                <span className="text-xs text-gray-400">{formatTime(t.timestamp)}</span>
              </div>
            ))}
            {transactions.length === 0 && (
              <p className="text-center text-gray-500 py-4">No recent transactions</p>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button 
            onClick={() => setShowAddProduct(true)}
            className="p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition text-center group"
          >
            <Plus className="w-6 h-6 text-blue-600 mx-auto mb-2 group-hover:scale-110 transition" />
            <span className="text-sm font-medium text-blue-900">Add Product</span>
          </button>
          <button 
            onClick={() => {
              setModalType('quick-receive');
              setQuantity('');
              setQuickActionSku('');
            }}
            className="p-4 bg-green-50 hover:bg-green-100 rounded-lg transition text-center group"
          >
            <TrendingUp className="w-6 h-6 text-green-600 mx-auto mb-2 group-hover:scale-110 transition" />
            <span className="text-sm font-medium text-green-900">Receive Stock</span>
          </button>
          <button 
            onClick={() => {
              setModalType('quick-sell');
              setQuantity('');
              setQuickActionSku('');
            }}
            className="p-4 bg-purple-50 hover:bg-purple-100 rounded-lg transition text-center group"
          >
            <ShoppingCart className="w-6 h-6 text-purple-600 mx-auto mb-2 group-hover:scale-110 transition" />
            <span className="text-sm font-medium text-purple-900">Process Sale</span>
          </button>
          <button 
            onClick={() => setCurrentView('analytics')}
            className="p-4 bg-orange-50 hover:bg-orange-100 rounded-lg transition text-center group"
          >
            <BarChart3 className="w-6 h-6 text-orange-600 mx-auto mb-2 group-hover:scale-110 transition" />
            <span className="text-sm font-medium text-orange-900">View Analytics</span>
          </button>
        </div>
      </div>
    </div>
  );

  // ========== ANALYTICS VIEW ==========
  const AnalyticsView = () => {
    // 计算真实的销售数据
    const salesData = useMemo(() => {
      const productSales = {};
      
      // 统计每个产品的销售数量和金额
      transactions
        .filter(t => t.type === 'sell')
        .forEach(t => {
          if (!productSales[t.productId]) {
            const product = products.find(p => p.id === t.productId);
            productSales[t.productId] = {
              productId: t.productId,
              productName: t.productName,
              productSku: t.productSku,
              totalQuantity: 0,
              totalRevenue: 0,
              retailPrice: product?.retailPrice || 0
            };
          }
          productSales[t.productId].totalQuantity += t.quantity || 0;
          productSales[t.productId].totalRevenue += (t.quantity || 0) * (productSales[t.productId].retailPrice || 0);
        });
      
      // 转换为数组并按销售额排序
      return Object.values(productSales)
        .sort((a, b) => b.totalRevenue - a.totalRevenue);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [transactions.length, products.length]);

    const hasSalesData = salesData.length > 0;

    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Sales Analytics</h2>
            <select className="px-4 py-2 border border-gray-300 rounded-lg">
              <option>Last 7 days</option>
              <option>Last 30 days</option>
              <option>Last 3 months</option>
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-600 font-medium">Total Sales</p>
              <p className="text-2xl font-bold text-blue-900 mt-2">
                €{transactions
                  .filter(t => t.type === 'sell')
                  .reduce((sum, t) => {
                    const product = products.find(p => p.id === t.productId);
                    return sum + ((t.quantity || 0) * (product?.retailPrice || 0));
                  }, 0)
                  .toLocaleString()}
              </p>
              <p className="text-xs text-blue-600 mt-1">Based on transaction records</p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-green-600 font-medium">Units Sold</p>
              <p className="text-2xl font-bold text-green-900 mt-2">
                {transactions.filter(t => t.type === 'sell').reduce((sum, t) => sum + (t.quantity || 0), 0)}
              </p>
              <p className="text-xs text-green-600 mt-1">Total units</p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <p className="text-sm text-purple-600 font-medium">Transactions</p>
              <p className="text-2xl font-bold text-purple-900 mt-2">{transactions.length}</p>
              <p className="text-xs text-purple-600 mt-1">All activities</p>
            </div>
          </div>

          <div className="h-64 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
            <div className="text-center">
              <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500">Sales chart visualization</p>
              <p className="text-sm text-gray-400">Connect to Recharts for detailed analytics</p>
            </div>
          </div>
        </div>

        {/* 只在有销售数据时显示 Top Selling Products */}
        {hasSalesData && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Top Selling Products</h3>
              <button
                onClick={() => {
                  if (confirm('Clear all analytics history? This cannot be undone.')) {
                    alert('Analytics cleared (demo only)');
                  }
                }}
                className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition text-sm font-medium"
              >
                Clear History
              </button>
            </div>
            <div className="space-y-3">
              {salesData.slice(0, 10).map((item, i) => (
                <div key={item.productId} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-bold text-blue-600">#{i + 1}</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{item.productName}</p>
                    <p className="text-sm text-gray-500">{item.productSku}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">€{item.totalRevenue.toLocaleString()}</p>
                    <p className="text-sm text-gray-500">{item.totalQuantity} sold</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 如果没有销售数据，显示提示 */}
        {!hasSalesData && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12">
            <div className="text-center">
              <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Sales Data Yet</h3>
              <p className="text-gray-500">
                Start selling products to see your top selling items here.
              </p>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ==================== PART 7: MAIN RENDER & LOGIN SCREEN ====================
// Copy this section after Part 6

  // Loading state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Login screen
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
          <h1 className="text-2xl font-bold text-center mb-6">Waterford Crystal Inventory</h1>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition font-medium"
            >
              Login
            </button>
          </form>
        </div>
      </div>
    );
  }

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

  // Main App Layout
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Waterford Crystal</h1>
              <p className="text-sm text-gray-500">Brown Thomas Concession</p>
            </div>
            <button 
              onClick={handleLogout}
              className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="bg-white border-b sticky top-[73px] z-10">
        <div className="max-w-7xl mx-auto px-2 sm:px-4">
          <div className="flex gap-0">
            <button
              onClick={() => setCurrentView('dashboard')}
              className={`flex-1 px-2 sm:px-4 py-3 flex items-center justify-center gap-1 sm:gap-2 border-b-2 transition ${
                currentView === 'dashboard' 
                  ? 'border-blue-500 text-blue-600' 
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <Home className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="font-medium text-sm sm:text-base">Dashboard</span>
            </button>
            <button
              onClick={() => setCurrentView('inventory')}
              className={`flex-1 px-2 sm:px-4 py-3 flex items-center justify-center gap-1 sm:gap-2 border-b-2 transition ${
                currentView === 'inventory' 
                  ? 'border-blue-500 text-blue-600' 
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <Package className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="font-medium text-sm sm:text-base">Inventory</span>
            </button>
            <button
              onClick={() => setCurrentView('analytics')}
              className={`flex-1 px-2 sm:px-4 py-3 flex items-center justify-center gap-1 sm:gap-2 border-b-2 transition ${
                currentView === 'analytics' 
                  ? 'border-blue-500 text-blue-600' 
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="font-medium text-sm sm:text-base">Analytics</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {currentView === 'dashboard' && <DashboardView />}
        {currentView === 'inventory' && (
          <InventoryView 
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            showFilters={showFilters}
            setShowFilters={setShowFilters}
            selectedCollection={selectedCollection}
            setSelectedCollection={setSelectedCollection}
            selectedSubCollection={selectedSubCollection}
            setSelectedSubCollection={setSelectedSubCollection}
            filteredProducts={filteredProducts}
            getAvailable={getAvailable}
            openModal={openModal}
            handleDeleteProduct={handleDeleteProduct}
          />
        )}
        {currentView === 'analytics' && <AnalyticsView />}
      </main>

      {/* FAB - Floating Action Button */}
      <button
        onClick={() => setShowAddProduct(true)}
        className="fixed bottom-24 right-6 w-14 h-14 bg-blue-500 text-white rounded-full shadow-lg hover:bg-blue-600 hover:scale-110 transition-all flex items-center justify-center z-30"
        title="Add Product"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* // ==================== PART 8: MODALS - PART 1 ====================
    // Copy this section after Part 7 */}

      {/* Add/Edit Product Modal */}
      {(showAddProduct || modalType === 'edit') && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-md w-full p-6 my-8">
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
                  placeholder="e.g., Lismore Diamond Red Wine Set of 2"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                  placeholder="e.g., L136242"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Main Category</label>
                <select
                  value={modalType === 'edit' ? editingProduct?.mainCategory : newProduct.mainCategory}
                  onChange={(e) => {
                    const newCat = e.target.value;
                    const firstSub = MAIN_CATEGORIES[newCat][0];
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
                  setNewProduct({
                    name: '',
                    sku: '',
                    mainCategory: 'Collections',
                    subCategory: MAIN_CATEGORIES['Collections'][0],
                    totalStock: 0,
                    minStockLevel: 2,
                    retailPrice: 0
                  });
                }}
                className="flex-1 px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stock Operation Modal (Receive/Sell/Return) */}
      {modalType && selectedProduct && ['receive', 'sell', 'return'].includes(modalType) && (
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
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
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

      {/* Quick Action Modal (from Dashboard) */}
      {(modalType === 'quick-receive' || modalType === 'quick-sell') && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">
              {modalType === 'quick-receive' && 'Receive Stock'}
              {modalType === 'quick-sell' && 'Process Sale'}
            </h2>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Article Number *
              </label>
              <input
                type="text"
                value={quickActionSku}
                onChange={(e) => setQuickActionSku(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., L136242"
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quantity *
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

        {/* // ==================== PART 9: MODALS - PART 2 ====================
      // Copy this section after Part 8 */}

      {/* Manage Hold/Display/Fault Modal */}
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

      {/* Sell Breakdown Dialog */}
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
                {(selectedProduct.totalStock - (selectedProduct.onHold || 0) - (selectedProduct.onDisplay || 0) - (selectedProduct.onFault || 0)) > 0 && (
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
                          - (selectedProduct.onFault || 0);
                        setSellBreakdown({...sellBreakdown, fromFree: Math.min(val, maxFree)});
                      }}
                      className="w-16 px-2 py-1 border border-gray-300 rounded text-center"
                    />
                    <span className="text-gray-700">from Free Stock (max: {selectedProduct.totalStock - (selectedProduct.onHold || 0) - (selectedProduct.onDisplay || 0) - (selectedProduct.onFault || 0)})</span>
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

      {/* Low Stock List Modal */}
      {showLowStockList && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <AlertCircle className="w-6 h-6 text-yellow-600" />
                Low Stock Products
              </h2>
              <button 
                onClick={() => setShowLowStockList(false)} 
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
            
            {products.filter(p => getAvailable(p) > 0 && getAvailable(p) <= p.minStockLevel).length === 0 ? (
              <p className="text-center text-gray-500 py-8">No low stock products</p>
            ) : (
              <div className="space-y-3">
                {products.filter(p => getAvailable(p) > 0 && getAvailable(p) <= p.minStockLevel).map(p => (
                  <div key={p.id} className="border-b pb-3 flex justify-between items-center">
                    <div>
                      <p className="font-medium text-gray-900">{p.name}</p>
                      <p className="text-sm text-gray-500">Article No: {p.sku}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-yellow-600 font-semibold">Available: {getAvailable(p)}</p>
                      <p className="text-xs text-gray-500">Min Level: {p.minStockLevel}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Out of Stock List Modal */}
      {showOutOfStockList && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <TrendingDown className="w-6 h-6 text-red-600" />
                Out of Stock Products
              </h2>
              <button 
                onClick={() => setShowOutOfStockList(false)} 
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
            
            {products.filter(p => getAvailable(p) === 0).length === 0 ? (
              <p className="text-center text-gray-500 py-8">No out of stock products</p>
            ) : (
              <div className="space-y-3">
                {products.filter(p => getAvailable(p) === 0).map(p => (
                  <div key={p.id} className="border-b pb-3 flex justify-between items-center">
                    <div>
                      <p className="font-medium text-gray-900">{p.name}</p>
                      <p className="text-sm text-gray-500">Article No: {p.sku}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-red-600 font-semibold">OUT OF STOCK</p>
                      <p className="text-xs text-gray-500">Total: {p.totalStock}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;