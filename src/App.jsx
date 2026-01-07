// ==================== PART 1: IMPORTS & CONSTANTS ====================

import React, { useState, useEffect, useMemo } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Search, Plus, Package, TrendingUp, TrendingDown, AlertCircle, Eye, Lock, History, Edit2, Trash2, ChevronRight, Filter, BarChart3, Home, ShoppingCart, PieChart, Calendar, RefreshCw, Users } from 'lucide-react';
import { db, auth } from './firebase';  
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, orderBy, limit, serverTimestamp, where } from 'firebase/firestore';
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
    'Opulence',
    'Connoisseur',
    'Elegance',
    'Elegance Optic',
    'Mixology',
    'Gin Journeys',
    'Giftology',
    'Firework, New Year',
    'Marquis',
    'Waterford × Elton John'
  ],
  'Christmas': [
    'Holiday Heirlooms',
    'Christmas Mastercraft',
    'Christmas Ornaments',
    'Crystal Ornaments',
    'Festive Accessories',
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
  handleDeleteProduct,
  openDropdown,
  setOpenDropdown
}) => {
  return (
    <div className="space-y-6">
      {/* Search and Filter Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoComplete="off" 
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

      {/* Table View */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Collection</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock Level</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredProducts.map(product => {
                const available = getAvailable(product);
                const isLowStock = available > 0 && available <= product.minStockLevel;
                const isOutOfStock = available === 0;
                
                return (
                  <tr key={product.id} className="hover:bg-gray-50 transition">
                    {/* Product */}
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900">{product.name}</p>
                        <p className="text-sm text-gray-500">Article No: {product.sku}</p>
                      </div>
                    </td>
                    
                    {/* Collection */}
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-700">{product.subCategory}</span>
                    </td>
                    
                    {/* Price */}
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-gray-900">€{product.retailPrice.toFixed(2)}</span>
                    </td>
                    
                    {/* Stock Level */}
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <p className="font-semibold text-gray-900">
                          Total: {product.totalStock} 
                          <span className="text-gray-400 mx-1">|</span>
                          Available: <span className={available === 0 ? 'text-red-600' : available <= product.minStockLevel ? 'text-yellow-600' : 'text-green-600'}>
                            {available}
                          </span>
                        </p>
                        {(product.onHold > 0 || product.onDisplay > 0 || product.onFault > 0) && (
                          <p className="text-gray-500 text-xs mt-1">
                            {product.onHold > 0 && `Hold: ${product.onHold}`}
                            {product.onHold > 0 && product.onDisplay > 0 && ', '}
                            {product.onDisplay > 0 && `Display: ${product.onDisplay}`}
                            {(product.onHold > 0 || product.onDisplay > 0) && product.onFault > 0 && ', '}
                            {product.onFault > 0 && `Fault: ${product.onFault}`}
                          </p>
                        )}
                      </div>
                    </td>
                    
                    {/* Status */}
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        isOutOfStock ? 'bg-red-100 text-red-800' :
                        isLowStock ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {isOutOfStock ? '⚠️ Out of Stock' : isLowStock ? '⚠️ Low Stock' : '✓ Healthy'}
                      </span>
                    </td>
                    
                    {/* Actions */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openModal(product, 'sell')}
                          disabled={available === 0}
                          className="px-3 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          SELL
                        </button>
                        
                        {/* Dropdown Menu */}
                        <div className="relative">
                          <button
                            onClick={() => setOpenDropdown(openDropdown === product.id ? null : product.id)}
                            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                          >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                            </svg>
                          </button>
                          
                          {openDropdown === product.id && (
                            <>
                              {/* Backdrop */}
                              <div 
                                className="fixed inset-0 z-10" 
                                onClick={() => setOpenDropdown(null)}
                              />
                              
                              {/* Dropdown */}
                              <div className="absolute right-0 mt-2 w-48 rounded-lg shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-20">
                                <div className="py-1">
                                  <button
                                    onClick={() => {
                                      openModal(product, 'receive');
                                      setOpenDropdown(null);
                                    }}
                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                                  >
                                    <TrendingUp className="w-4 h-4 text-green-600" />
                                    Receive Stock
                                  </button>
                                  <button
                                    onClick={() => {
                                      openModal(product, 'return');
                                      setOpenDropdown(null);
                                    }}
                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                                  >
                                    <TrendingDown className="w-4 h-4 text-purple-600" />
                                    Return
                                  </button>
                                  <button
                                    onClick={() => {
                                      openModal(product, 'exchange');
                                      setOpenDropdown(null);
                                    }}
                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                                  >
                                    <RefreshCw className="w-4 h-4 text-orange-600" />
                                    Exchange
                                  </button>
                                  <button
                                    onClick={() => {
                                      openModal(product, 'manage');
                                      setOpenDropdown(null);
                                    }}
                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                                  >
                                    <Package className="w-4 h-4 text-gray-600" />
                                    Manage Hold/Display
                                  </button>
                                  <div className="border-t border-gray-100 my-1"></div>
                                  <button
                                    onClick={() => {
                                      openModal(product, 'edit');
                                      setOpenDropdown(null);
                                    }}
                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                                  >
                                    <Edit2 className="w-4 h-4 text-blue-600" />
                                    Edit Product
                                  </button>
                                  <button
                                    onClick={() => {
                                      handleDeleteProduct(product);
                                      setOpenDropdown(null);
                                    }}
                                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                    Delete Product
                                  </button>
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center py-12">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No products found</p>
          </div>
        )}
      </div>
    </div>
  );
};

// ==================== PART 2 FIXED: COMPONENT START & STATE ====================

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
  const [footfallRecords, setFootfallRecords] = useState([]);
  
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
  const [discount, setDiscount] = useState(0);
  
  // Modal states
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showFootfallModal, setShowFootfallModal] = useState(false);
  const [showLowStockList, setShowLowStockList] = useState(false);
  const [showOutOfStockList, setShowOutOfStockList] = useState(false);
  const [showSellDialog, setShowSellDialog] = useState(false);
  
  // Filter states
  const [selectedCollection, setSelectedCollection] = useState('All');
  const [selectedSubCollection, setSelectedSubCollection] = useState('All');
  
  // Edit states
  const [editingProduct, setEditingProduct] = useState(null);
  const [quickActionSku, setQuickActionSku] = useState('');

  // footfall count
  const [footfallCount, setFootfallCount] = useState('');
  
  // Sell breakdown state
  const [sellBreakdown, setSellBreakdown] = useState({
    fromFree: 0,
    fromHold: 0,
    fromDisplay: 0
  });

  // Dropdown menu state
  const [openDropdown, setOpenDropdown] = useState(null);

  // Custom timestamp for historical data entry
  const [customTimestamp, setCustomTimestamp] = useState('');
  const [useCustomTime, setUseCustomTime] = useState(false);

  const [newProduct, setNewProduct] = useState({
    name: '',
    sku: '',
    mainCategory: 'Collections',
    subCategory: MAIN_CATEGORIES['Collections']?.[0] || 'Mastercraft',
    category: 'Stemware', // 添加这一行
    totalStock: 0,
    minStockLevel: 2,
    retailPrice: 0
  });

// ==================== PART 3 FIXED: useEffect HOOKS & HELPER FUNCTIONS ====================

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

  // Load products from Firebase (manual load only)
  const loadProducts = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(db, 'products'));
      const productsData = snapshot.docs.map(doc => ({
        id: doc.id,
        onFault: 0, // 默认值，不写入数据库
        ...doc.data()
      }));
      
      setProducts(productsData);
    } catch (error) {
      console.error('Failed to load products:', error);
      alert('Failed to load products. Please check your internet connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Load transactions (manual load only)
  const loadTransactions = async () => {
    if (!user) return;
    
    try {
      const q = query(collection(db, 'transactions'), orderBy('timestamp', 'desc'), limit(50));
      const snapshot = await getDocs(q);
      const transactionsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTransactions(transactionsData);
    } catch (error) {
      console.error('Failed to load transactions:', error);
    }
  };

  // Loading people flow records
  const loadFootfallRecords = async () => {
    if (!user) return;
    
    try {
      const q = query(
        collection(db, 'footfall'), 
        orderBy('timestamp', 'desc'), 
        limit(100)
      );
      const snapshot = await getDocs(q);
      const footfallData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setFootfallRecords(footfallData);
    } catch (error) {
      console.error('Failed to load footfall records:', error);
    }
  };

  useEffect(() => {
    loadTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Save flow records
  const handleSaveFootfall = async (count) => {
    if (!count || count <= 0) {
      alert('Please enter a valid count');
      return;
    }

    try {
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0]; // "2024-11-23"
      const hour = now.getHours(); // 0-23

      await addDoc(collection(db, 'footfall'), {
        date: dateStr,
        hour: hour,
        count: parseInt(count),
        timestamp: serverTimestamp()
      });

      await loadFootfallRecords();
      
      setShowFootfallModal(false);
      setFootfallCount('');
      alert(`Recorded ${count} visitors`);

    } catch (error) {
      console.error('Failed to save footfall:', error);
      alert('Failed to save footfall record');
    }
  };

  // Get the total number of people in the current hour
  const getCurrentHourFootfall = () => {
    const now = new Date();
    const currentHour = now.getHours();
    const today = now.toISOString().split('T')[0];
    
    return footfallRecords
      .filter(r => {
        if (!r.timestamp) return false;
        const recordDate = r.timestamp.toDate();
        const recordDateStr = recordDate.toISOString().split('T')[0];
        return recordDateStr === today && r.hour === currentHour;
      })
      .reduce((sum, r) => sum + (r.count || 0), 0);
  };

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
      // Split search term into keywords
      const keywords = searchTerm.toLowerCase().trim().split(/\s+/).filter(k => k.length > 0);
      
      // If no keywords, match all (or just check collection filters)
      if (keywords.length === 0) {
        const mainCat = p.mainCategory || 'Collections';
        const subCat = p.subCategory || 'Other';
        const matchesMain = selectedCollection === 'All' || mainCat === selectedCollection;
        const matchesSub = selectedSubCollection === 'All' || subCat === selectedSubCollection;
        return matchesMain && matchesSub;
      }
      
      // Check if all keywords appear in name or SKU (in any order)
      const productText = (p.name + ' ' + p.sku).toLowerCase();
      const matchesSearch = keywords.every(keyword => productText.includes(keyword));
      
      const mainCat = p.mainCategory || 'Collections';
      const subCat = p.subCategory || 'Other';
      
      const matchesMain = selectedCollection === 'All' || mainCat === selectedCollection;
      const matchesSub = selectedSubCollection === 'All' || subCat === selectedSubCollection;
      
      return matchesSearch && matchesMain && matchesSub;
    });
  }, [products, searchTerm, selectedCollection, selectedSubCollection]);

  // Statistics - NEW for Dashboard - Total value and Total Project
  const stats = {
    totalProducts: products.length,
    totalStockCount: products.reduce((sum, p) => sum + p.totalStock, 0),  // 新增这一行
    lowStock: products.filter(p => getAvailable(p) > 0 && getAvailable(p) <= p.minStockLevel).length,
    outOfStock: products.filter(p => getAvailable(p) === 0).length,
    totalValue: products.reduce((sum, p) => sum + (p.totalStock * p.retailPrice), 0)
  };

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

  // ==================== PART 4: PRODUCT OPERATION FUNCTIONS ====================

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
        category: newProduct.category || 'Stemware',
        totalStock: newProduct.totalStock,
        minStockLevel: newProduct.minStockLevel,
        retailPrice: newProduct.retailPrice,
        onHold: 0,
        onDisplay: 0,
        onFault: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    
      await loadProducts(); // Don't delete

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
        category: editingProduct.category || 'Stemware',
        totalStock: editingProduct.totalStock || 0,
        minStockLevel: editingProduct.minStockLevel || 2,
        retailPrice: editingProduct.retailPrice || 0,
        updatedAt: serverTimestamp()
      });
  
      setProducts(prevProducts => 
        prevProducts.map(p => 
          p.id === editingProduct.id ? { ...editingProduct } : p
        )
      );
  
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

      await loadProducts(); // Don't delete

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
    setDiscount(0);
    setQuickActionSku('');
    setUseCustomTime(false);
    setCustomTimestamp(''); 
    
    if (type === 'manage') {
      setHoldValue(product.onHold || 0);
      setDisplayValue(product.onDisplay || 0);
      setFaultValue(product.onFault || 0);
    } else if (type === 'edit') {
      setEditingProduct({
        ...product,
        category: product.category || 'Stemware'
      });
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
    setDiscount(0);
    setUseCustomTime(false);
    setCustomTimestamp('');
  };

  // ==================== PART 5: STOCK OPERATION FUNCTIONS ====================
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
            timestamp: useCustomTime && customTimestamp 
              ? new Date(customTimestamp) 
              : serverTimestamp()
          });

          setProducts(prevProducts => 
            prevProducts.map(p => 
              p.id === product.id 
                ? { ...p, totalStock: newTotal }
                : p
            )
          );

          alert(`Received ${qty} units of ${product.name}`);
          closeModal();

          await loadTransactions();

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
        
        // Calculate price with discount
        const originalPrice = product.retailPrice * qty;
        const discountAmount = originalPrice * (discount / 100);
        const finalPrice = originalPrice - discountAmount;
        
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
            discount: discount,
            originalPrice: originalPrice,
            finalPrice: finalPrice, 
            notes: notes || '',
            timestamp: useCustomTime && customTimestamp 
              ? new Date(customTimestamp) 
              : serverTimestamp()
          });

          setProducts(prevProducts => 
            prevProducts.map(p => 
              p.id === product.id 
                ? { ...p, totalStock: newTotal }
                : p
            )
          );

          alert(`Sold ${qty} units of ${product.name}`);
          closeModal();

          await loadTransactions();

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
            timestamp: useCustomTime && customTimestamp 
              ? new Date(customTimestamp) 
              : serverTimestamp()
          });

          setProducts(prevProducts => 
            prevProducts.map(p => 
              p.id === selectedProduct.id 
                ? { ...p, totalStock: newTotal }
                : p
            )
          );

          closeModal();

          await loadTransactions();

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

        // Calculate sale price with discount
        const originalPrice = selectedProduct.retailPrice * qty;
        const discountAmount = originalPrice * (discount / 100);
        const finalPrice = originalPrice - discountAmount;

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
              discount: discount,
              originalPrice: originalPrice,
              finalPrice: finalPrice,
              notes: notes || (holdToReduce > 0 || displayToReduce > 0 
                ? `Reduced Hold by ${holdToReduce}, Display by ${displayToReduce}${discount > 0 ? `, Discount: ${discount}%` : ''}`
                : discount > 0 ? `Discount: ${discount}%` : ''),
              timestamp: useCustomTime && customTimestamp 
                ? new Date(customTimestamp) 
                : serverTimestamp()
            });

            setProducts(prevProducts => 
              prevProducts.map(p => 
                p.id === selectedProduct.id 
                  ? { ...p, totalStock: Math.max(0, newTotal), onHold: Math.max(0, newHold), onDisplay: Math.max(0, newDisplay) }
                  : p
              )
            );

            closeModal();

            await loadTransactions();

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
        const returnValue = selectedProduct.retailPrice * qty;
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
            returnValue: returnValue,
            notes: notes || '',
            timestamp: useCustomTime && customTimestamp 
              ? new Date(customTimestamp) 
              : serverTimestamp()
          });

          setProducts(prevProducts => 
            prevProducts.map(p => 
              p.id === selectedProduct.id 
                ? { ...p, totalStock: newTotal }
                : p
            )
          );

          closeModal();

          await loadTransactions();

        } catch (error) {
          console.error('Operation failed:', error);
          alert('Operation failed');
        }
        break;
      }

      case 'exchange': {
        // Exchange doesn't change total stock, just records the transaction
        try {
          await addDoc(collection(db, 'transactions'), {
            productId: selectedProduct.id,
            productName: selectedProduct.name,
            productSku: selectedProduct.sku,
            type: 'exchange',
            quantity: qty,
            notes: notes || 'Exchange transaction',
            timestamp: useCustomTime && customTimestamp 
              ? new Date(customTimestamp) 
              : serverTimestamp()
          });
      
          closeModal();
          await loadTransactions();
          alert(`Exchange recorded for ${qty} unit(s) of ${selectedProduct.name}`);
      
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

      setProducts(prevProducts => 
        prevProducts.map(p => 
          p.id === selectedProduct.id 
            ? { ...p, onHold: newHold, onDisplay: newDisplay, onFault: newFault }
            : p
        )
      );

      closeModal();

    } catch (error) {
      console.error('Operation failed:', error);
      alert('Operation failed');
    }
  };

  // ==================== PART 6: VIEW COMPONENTS ====================

  // ========== DASHBOARD VIEW ==========
  const DashboardView = () => (
    <div className="space-y-6">
      {/* Stats Cards - responsive design */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
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

        {/* Total Stock Count */}
        <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl shadow-sm border border-indigo-200 p-3 sm:p-4">
          <div className="flex flex-col items-center text-center">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-indigo-500 bg-opacity-20 rounded-xl flex items-center justify-center mb-2">
              <Package className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-700" />
            </div>
            <p className="text-xs text-indigo-700 font-medium mb-1">Total Stock</p>
            <p className="text-2xl sm:text-3xl font-bold text-indigo-900 break-all">{stats.totalStockCount}</p>
            <p className="text-xs text-indigo-600 mt-1">units</p>
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
            onClick={() => setShowFootfallModal(true)}
            className="p-4 bg-pink-50 hover:bg-pink-100 rounded-lg transition text-center group"
          >
            <Users className="w-6 h-6 text-pink-600 mx-auto mb-2 group-hover:scale-110 transition" />
            <span className="text-sm font-medium text-pink-900">Record Footfall</span>
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

    // 添加日期范围状态
    const [dateRange, setDateRange] = useState('7'); // '1', '7', '30', '180', '365', 'custom'
    const [customStartDate, setCustomStartDate] = useState('');
    const [customEndDate, setCustomEndDate] = useState('');

    // 获取日期范围
    const getDateRange = () => {
      const now = new Date();
      
      if (dateRange === 'custom') {
        if (customStartDate && customEndDate) {
          return {
            start: new Date(customStartDate + 'T00:00:00'),
            end: new Date(customEndDate + 'T23:59:59')
          };
        }
        // 如果custom未填完，返回最近7天
        return {
          start: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
          end: now
        };
      }
      
      const days = parseInt(dateRange);
      return {
        start: new Date(now.getTime() - days * 24 * 60 * 60 * 1000),
        end: now
      };
    };

    // 计算日期范围的销售数据(按天聚合)
    const chartData = useMemo(() => {
      const { start: startDate, end: endDate } = getDateRange();
      
      // 计算天数
      const days = Math.ceil((endDate - startDate) / (24 * 60 * 60 * 1000));
      
      const dateMap = {};
      for (let i = 0; i <= days; i++) {
        const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
        const dateStr = date.toLocaleDateString('en-IE', { month: 'short', day: 'numeric' });
        dateMap[dateStr] = { date: dateStr, revenue: 0, quantity: 0 };
      }
      
      // 聚合销售和退货数据 - 添加更严格的验证
      transactions
        .filter(t => {
          // 严格验证数据
          if (!t || (t.type !== 'sell' && t.type !== 'return') || !t.timestamp) return false;
          
          try {
            // 确保timestamp可以转换为日期
            if (typeof t.timestamp.toDate !== 'function') return false;
            const transDate = t.timestamp.toDate();
            if (!(transDate instanceof Date) || isNaN(transDate.getTime())) return false;
            
            return transDate >= startDate && transDate <= endDate;
          } catch (e) {
            console.warn('Invalid transaction timestamp:', t.id, e);
            return false;
          }
        })
        .forEach(t => {
          try {
            const transDate = t.timestamp.toDate();
            const dateStr = transDate.toLocaleDateString('en-IE', { month: 'short', day: 'numeric' });
            
            if (dateMap[dateStr]) {
              if (t.type === 'sell') {
                const revenue = t.finalPrice !== undefined 
                  ? t.finalPrice 
                  : (t.quantity || 0) * (products.find(p => p.id === t.productId)?.retailPrice || 0);
                
                dateMap[dateStr].revenue += revenue;
                dateMap[dateStr].quantity += t.quantity || 0;
              } else if (t.type === 'return') {
                const returnValue = t.returnValue || 
                  ((t.quantity || 0) * (products.find(p => p.id === t.productId)?.retailPrice || 0));
                
                dateMap[dateStr].revenue -= returnValue;
                dateMap[dateStr].quantity -= t.quantity || 0;
              }
            }
          } catch (e) {
            console.warn('Error processing transaction:', t.id, e);
          }
        });
      
      return Object.values(dateMap);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dateRange, customStartDate, customEndDate, transactions, products]);

    // Calculate real sales data
    const salesData = useMemo(() => {
      const productSales = {};
      
      transactions.forEach(t => {
        if (t.type === 'sell' || t.type === 'return') {
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
          
          if (t.type === 'sell') {
            const revenue = t.finalPrice !== undefined 
              ? t.finalPrice 
              : (t.quantity || 0) * (productSales[t.productId].retailPrice || 0);
            
            productSales[t.productId].totalQuantity += t.quantity || 0;
            productSales[t.productId].totalRevenue += revenue;
          } else if (t.type === 'return') {
            const returnValue = t.returnValue || 
              ((t.quantity || 0) * (productSales[t.productId].retailPrice || 0));
            
            productSales[t.productId].totalQuantity -= t.quantity || 0;
            productSales[t.productId].totalRevenue -= returnValue;
          }
        }
      });
      
      return Object.values(productSales)
        .filter(p => p.totalRevenue > 0)
        .sort((a, b) => b.totalRevenue - a.totalRevenue);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [transactions]);

    const hasSalesData = salesData.length > 0;

    // Clear all sales transactions
    const handleClearHistory = async () => {
      if (!confirm('Clear all sales history? This will permanently delete all sales transaction records. This action cannot be undone.')) {
        return;
      }

      try {
        // Query all sell transactions
        const q = query(collection(db, 'transactions'), where('type', '==', 'sell'));
        const snapshot = await getDocs(q);
        
        // Delete all sell transactions
        const deletePromises = snapshot.docs.map(docSnapshot => 
          deleteDoc(doc(db, 'transactions', docSnapshot.id))
        );
        
        await Promise.all(deletePromises);
        
        // Reload transactions to update UI
        await loadTransactions();
        
        alert(`Successfully cleared ${snapshot.docs.length} sales records`);
      } catch (error) {
        console.error('Failed to clear history:', error);
        alert('Failed to clear sales history. Please try again.');
      }
    };

    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-3">
            <h2 className="text-xl font-bold text-gray-900">Sales Analytics</h2>
            
            <div className="flex flex-wrap items-center gap-3">
              <select 
                value={dateRange}
                onChange={(e) => {
                  setDateRange(e.target.value);
                  if (e.target.value !== 'custom') {
                    setCustomStartDate('');
                    setCustomEndDate('');
                  }
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg"
              >
                <option value="1">Last 24 hours</option>
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="180">Last 6 months</option>
                <option value="365">Last year</option>
                <option value="custom">Custom Range</option>
              </select>
              
              {dateRange === 'custom' && (
                <>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    max={customEndDate || new Date().toISOString().split('T')[0]}
                  />
                  <span className="text-gray-500 text-sm">to</span>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    min={customStartDate}
                    max={new Date().toISOString().split('T')[0]}
                  />
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {/* Total Footfall */}
            <div className="p-4 bg-pink-50 rounded-lg">
              <p className="text-sm text-pink-600 font-medium">Total Footfall</p>
              <p className="text-2xl font-bold text-pink-900 mt-2">
                {(() => {
                  const { start: startDate, end: endDate } = getDateRange();
                  
                  return footfallRecords
                    .filter(r => {
                      if (!r.timestamp) return false;
                      const recordDate = r.timestamp.toDate();
                      return recordDate >= startDate && recordDate <= endDate;
                    })
                    .reduce((sum, r) => sum + (r.count || 0), 0);
                })()}
              </p>
              <p className="text-xs text-pink-600 mt-1">Visitors in period</p>
            </div>
            
            {/* Conversion Rate - 修复版 */}
            <div className="p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-green-600 font-medium">Conversion Rate</p>
              <p className="text-2xl font-bold text-green-900 mt-2">
                {(() => {
                  const { start: startDate, end: endDate } = getDateRange();
                  
                  // 计算人流
                  const totalFootfall = footfallRecords
                    .filter(r => {
                      if (!r.timestamp) return false;
                      const recordDate = r.timestamp.toDate();
                      return recordDate >= startDate && recordDate <= endDate;
                    })
                    .reduce((sum, r) => sum + (r.count || 0), 0);
                  
                  // 计算销售笔数（假设每笔是不同客户）
                  const totalSales = transactions
                    .filter(t => {
                      if (t.type !== 'sell' || !t.timestamp) return false;
                      const transDate = t.timestamp.toDate();
                      return transDate >= startDate && transDate <= endDate;
                    })
                    .length;
                  
                  if (totalFootfall === 0) return '0.00';
                  
                  // 转化率最高100%（如果销售笔数 > 访客数，说明有回头客或一个客户多次购买）
                  const rate = (totalSales / totalFootfall) * 100;
                  return Math.min(100, rate).toFixed(2);
                })()}%
              </p>
              <p className="text-xs text-green-600 mt-1">
                {(() => {
                  const { start: startDate, end: endDate } = getDateRange();
                  const totalSales = transactions
                    .filter(t => {
                      if (t.type !== 'sell' || !t.timestamp) return false;
                      const transDate = t.timestamp.toDate();
                      return transDate >= startDate && transDate <= endDate;
                    })
                    .length;
                  return `${totalSales} sales / visitors`;
                })()}
              </p>
            </div>
            
            {/* Avg Sale per Visitor - 修复版 */}
            <div className="p-4 bg-orange-50 rounded-lg">
              <p className="text-sm text-orange-600 font-medium">Avg Sale/Visitor</p>
              <p className="text-2xl font-bold text-orange-900 mt-2">
                €{(() => {
                  const { start: startDate, end: endDate } = getDateRange();
                  
                  // 计算人流
                  const totalFootfall = footfallRecords
                    .filter(r => {
                      if (!r.timestamp) return false;
                      const recordDate = r.timestamp.toDate();
                      return recordDate >= startDate && recordDate <= endDate;
                    })
                    .reduce((sum, r) => sum + (r.count || 0), 0);
                  
                  // 计算净销售额（销售 - 退货）
                  const totalRevenue = transactions
                    .filter(t => {
                      if (!t.timestamp) return false;
                      const transDate = t.timestamp.toDate();
                      return transDate >= startDate && transDate <= endDate;
                    })
                    .reduce((sum, t) => {
                      if (t.type === 'sell') {
                        // 使用 finalPrice（含折扣）或计算原价
                        const revenue = t.finalPrice !== undefined 
                          ? t.finalPrice 
                          : (t.quantity || 0) * (products.find(p => p.id === t.productId)?.retailPrice || 0);
                        return sum + revenue;
                      } else if (t.type === 'return') {
                        // 退货减少营收
                        const returnValue = t.returnValue || 
                          ((t.quantity || 0) * (products.find(p => p.id === t.productId)?.retailPrice || 0));
                        return sum - returnValue;
                      }
                      return sum;
                    }, 0);
                  
                  if (totalFootfall === 0) return '0.00';
                  
                  return (totalRevenue / totalFootfall).toFixed(2);
                })()}
              </p>
              <p className="text-xs text-orange-600 mt-1">Revenue / Visitor</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-600 font-medium">Total Sales</p>
              <p className="text-2xl font-bold text-blue-900 mt-2">
                €{(() => {
                  const { start: startDate, end: endDate } = getDateRange();
                  
                  return transactions
                    .filter(t => {
                      if (!t.timestamp) return false;
                      const transDate = t.timestamp.toDate();
                      return transDate >= startDate && transDate <= endDate;
                    })
                    .reduce((sum, t) => {
                      if (t.type === 'sell') {
                        const revenue = t.finalPrice !== undefined 
                          ? t.finalPrice 
                          : (t.quantity || 0) * (products.find(p => p.id === t.productId)?.retailPrice || 0);
                        return sum + revenue;
                      } else if (t.type === 'return') {
                        const returnValue = t.returnValue || 
                          ((t.quantity || 0) * (products.find(p => p.id === t.productId)?.retailPrice || 0));
                        return sum - returnValue;
                      }
                      return sum;
                    }, 0)
                    .toLocaleString();
                })()}
              </p>
              <p className="text-xs text-blue-600 mt-1">In selected period</p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-green-600 font-medium">Net Units Sold</p>
              <p className="text-2xl font-bold text-green-900 mt-2">
                {(() => {
                  const { start: startDate, end: endDate } = getDateRange();
                  
                  return transactions
                    .filter(t => {
                      if (!t.timestamp) return false;
                      const transDate = t.timestamp.toDate();
                      return transDate >= startDate && transDate <= endDate;
                    })
                    .reduce((sum, t) => {
                      if (t.type === 'sell') return sum + (t.quantity || 0);
                      if (t.type === 'return') return sum - (t.quantity || 0);
                      return sum;
                    }, 0);
                })()}
              </p>
              <p className="text-xs text-green-600 mt-1">In selected period</p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <p className="text-sm text-purple-600 font-medium">Transactions</p>
              <p className="text-2xl font-bold text-purple-900 mt-2">
                {(() => {
                  const { start: startDate, end: endDate } = getDateRange();
                  
                  return transactions.filter(t => {
                    if (!t.timestamp) return false;
                    const transDate = t.timestamp.toDate();
                    return transDate >= startDate && transDate <= endDate;
                  }).length;
                })()}
              </p>
              <p className="text-xs text-purple-600 mt-1">In selected period</p>
            </div>
          </div>

          {chartData.length > 0 && chartData.some(d => d.revenue > 0) ? (
            <div className="space-y-6">
              {/* 营收图表 */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">Daily Revenue (€)</h4>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip 
                      formatter={(value) => `€${value.toLocaleString()}`}
                      labelStyle={{ color: '#000' }}
                    />
                    <Bar dataKey="revenue" fill="#3b82f6" name="Revenue" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              
              {/* 销量图表 */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">Daily Units Sold</h4>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip labelStyle={{ color: '#000' }} />
                    <Line 
                      type="monotone" 
                      dataKey="quantity" 
                      stroke="#10b981" 
                      strokeWidth={2}
                      name="Units Sold"
                      dot={{ fill: '#10b981' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <div className="h-64 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
              <div className="text-center">
                <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500">No sales data in selected period</p>
                <p className="text-sm text-gray-400">Start selling to see charts here</p>
              </div>
            </div>
          )}
        </div>

        {/* Only display when sales data is available. Top Selling Products */}
        {hasSalesData && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Top Selling Products</h3>
              <button
                onClick={handleClearHistory}
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

        {/* If there is no sales data, display a message. */}
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
            <div className="flex items-center gap-3">
              <button 
                onClick={() => {
                  loadProducts();
                  loadTransactions();
                  loadFootfallRecords();
                }}
                className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 text-sm flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
              <button 
                onClick={handleLogout}
                className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm"
              >
                Logout
              </button>
            </div>
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
            openDropdown={openDropdown}
            setOpenDropdown={setOpenDropdown}
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
                  autoComplete="off"
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
                  autoComplete="off"
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
                  autoComplete="off"
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
                  autoComplete="off"
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
                  autoComplete="off"
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
                    category: 'Stemware',
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
      {modalType && selectedProduct && ['receive', 'sell', 'return', 'exchange'].includes(modalType) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">
              {modalType === 'receive' && 'Receive Stock'}
              {modalType === 'sell' && 'Sell Product'}
              {modalType === 'return' && 'Return Product'}
              {modalType === 'exchange' && 'Exchange Product'}
            </h2>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-1">Product</p>
              <p className="font-medium">{selectedProduct.name}</p>
              <p className="text-sm text-gray-500">Article No: {selectedProduct.sku}</p>
            </div>

            {modalType !== 'exchange' && (
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-1">Current Stock</p>
                <p className="font-medium">
                  Total: {selectedProduct.totalStock} | Available: {getAvailable(selectedProduct)}
                </p>
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                autoComplete="off"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Enter quantity"
                min="1"
              />
            </div>

            {modalType === 'sell' && (
              <>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Discount</label>
                  <select
                    value={discount}
                    onChange={(e) => setDiscount(parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="0">No Discount</option>
                    <option value="5">5% Off</option>
                    <option value="10">10% Off</option>
                    <option value="15">15% Off</option>
                    <option value="20">20% Off</option>
                    <option value="25">25% Off</option>
                    <option value="30">30% Off</option>
                    <option value="40">40% Off</option>
                    <option value="50">50% Off</option>
                    <option value="60">60% Off</option>
                  </select>
                </div>
                
                {quantity && parseInt(quantity) > 0 && (
                  <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700">Original Price:</span>
                      <span className="font-medium">€{(selectedProduct.retailPrice * parseInt(quantity)).toFixed(2)}</span>
                    </div>
                    {discount > 0 && (
                      <>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-700">Discount ({discount}%):</span>
                          <span className="font-medium text-red-600">-€{((selectedProduct.retailPrice * parseInt(quantity)) * (discount / 100)).toFixed(2)}</span>
                        </div>
                        <div className="border-t border-blue-300 my-2"></div>
                      </>
                    )}
                    <div className="flex justify-between">
                      <span className="text-blue-900 font-semibold">Final Price:</span>
                      <span className="text-lg font-bold text-blue-900">
                        €{((selectedProduct.retailPrice * parseInt(quantity)) * (1 - discount / 100)).toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}
              </>
            )}
          
            {/* Custom Timestamp Option */}
            <div className="mb-4">
              <label className="flex items-center gap-2 mb-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useCustomTime}
                  onChange={(e) => setUseCustomTime(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-sm font-medium text-gray-700">Use custom date/time</span>
              </label>
              
              {useCustomTime && (
                <input
                  type="datetime-local"
                  value={customTimestamp}
                  onChange={(e) => setCustomTimestamp(e.target.value)}
                  max={new Date().toISOString().slice(0, 16)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              )}
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder={modalType === 'exchange' ? 'Exchange details...' : 'Delivery note / Till Number...'}
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
                autoComplete="off"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., L136242"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quantity *
              </label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                autoComplete="off"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Enter quantity"
                min="1"
              />
            </div>

            {/* Custom Timestamp Option */}
            <div className="mb-4">
              <label className="flex items-center gap-2 mb-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useCustomTime}
                  onChange={(e) => setUseCustomTime(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-sm font-medium text-gray-700">Use custom date/time</span>
              </label>
              
              {useCustomTime && (
                <input
                  type="datetime-local"
                  value={customTimestamp}
                  onChange={(e) => setCustomTimestamp(e.target.value)}
                  max={new Date().toISOString().slice(0, 16)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              )}
            </div>

            {modalType === 'quick-sell' && (
              <>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Discount
                  </label>
                  <select
                    value={discount}
                    onChange={(e) => setDiscount(parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="0">No Discount</option>
                    <option value="5">5% Off</option>
                    <option value="10">10% Off</option>
                    <option value="15">15% Off</option>
                    <option value="20">20% Off</option>
                    <option value="25">25% Off</option>
                    <option value="30">30% Off</option>
                    <option value="40">40% Off</option>
                    <option value="50">50% Off</option>
                    <option value="60">60% Off</option>
                  </select>
                </div>
                
                {quantity && parseInt(quantity) > 0 && quickActionSku && (() => {
                  const product = products.find(p => p.sku.toLowerCase() === quickActionSku.toLowerCase());
                  if (!product) return null;
                  
                  return (
                    <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-700">Original Price:</span>
                        <span className="font-medium">€{(product.retailPrice * parseInt(quantity)).toFixed(2)}</span>
                      </div>
                      {discount > 0 && (
                        <>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-700">Discount ({discount}%):</span>
                            <span className="font-medium text-red-600">-€{((product.retailPrice * parseInt(quantity)) * (discount / 100)).toFixed(2)}</span>
                          </div>
                          <div className="border-t border-blue-300 my-2"></div>
                        </>
                      )}
                      <div className="flex justify-between">
                        <span className="text-blue-900 font-semibold">Final Price:</span>
                        <span className="text-lg font-bold text-blue-900">
                          €{((product.retailPrice * parseInt(quantity)) * (1 - discount / 100)).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </>
            )}

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
                autoComplete="off"
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
                autoComplete="off"
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
                autoComplete="off"
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
                      autoComplete="off"
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
                      autoComplete="off"
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
                      autoComplete="off"
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
                  const originalPrice = selectedProduct.retailPrice * parseInt(quantity);
                  const discountAmount = originalPrice * (discount / 100);
                  const finalPrice = originalPrice - discountAmount;

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
                      discount: discount,
                      originalPrice: originalPrice,
                      finalPrice: finalPrice, 
                      notes: notes || `From: Free=${sellBreakdown.fromFree}, Hold=${sellBreakdown.fromHold}, Display=${sellBreakdown.fromDisplay}${discount > 0 ? `, Discount: ${discount}%` : ''}`,
                      timestamp: useCustomTime && customTimestamp 
                        ? new Date(customTimestamp) 
                        : serverTimestamp()
                    });

                    setProducts(prevProducts => 
                      prevProducts.map(p => 
                        p.id === selectedProduct.id 
                          ? { ...p, totalStock: Math.max(0, newTotal), onHold: Math.max(0, newHold), onDisplay: Math.max(0, newDisplay) }
                          : p
                      )
                    );

                    setShowSellDialog(false);
                    closeModal();

                    await loadTransactions();

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

      {/* Footfall Modal - 添加在所有 Modal 的最后 */}
      {showFootfallModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Users className="w-6 h-6 text-pink-600" />
              Record Footfall
            </h2>
            
            {/* 快速按钮 */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              <button 
                onClick={() => handleSaveFootfall(1)}
                className="px-4 py-3 bg-pink-50 rounded-lg hover:bg-pink-100 transition"
              >
                <p className="text-2xl font-bold text-pink-600">+1</p>
              </button>
              <button 
                onClick={() => handleSaveFootfall(5)}
                className="px-4 py-3 bg-pink-50 rounded-lg hover:bg-pink-100 transition"
              >
                <p className="text-2xl font-bold text-pink-600">+5</p>
              </button>
              <button 
                onClick={() => handleSaveFootfall(10)}
                className="px-4 py-3 bg-pink-50 rounded-lg hover:bg-pink-100 transition"
              >
                <p className="text-2xl font-bold text-pink-600">+10</p>
              </button>
            </div>
            
            {/* 自定义输入 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Custom Count
              </label>
              <input
                type="number"
                value={footfallCount}
                onChange={(e) => setFootfallCount(e.target.value)}
                min="1"
                autoComplete="off"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500"
                placeholder="Enter footfall count..."
              />
            </div>
            
            {/* 当前小时统计 */}
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Current Hour Total</p>
              <p className="text-2xl font-bold text-gray-900">{getCurrentHourFootfall()}</p>
              <p className="text-xs text-gray-500">
                {new Date().toLocaleTimeString('en-IE', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => handleSaveFootfall(footfallCount)}
                disabled={!footfallCount || parseInt(footfallCount) <= 0}
                className="flex-1 px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setShowFootfallModal(false);
                  setFootfallCount('');
                }}
                className="flex-1 px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition"
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