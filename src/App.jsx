import React, { useState, useEffect, useMemo } from 'react';
import { Search, Plus, Package, TrendingUp, TrendingDown, AlertCircle, Eye, Lock, History } from 'lucide-react';
import { db } from './firebase';
import { collection, addDoc, updateDoc, doc, onSnapshot, query, orderBy, limit, serverTimestamp } from 'firebase/firestore';

function App() {
  // 产品列表
  const [products, setProducts] = useState([]);
  // 最近交易记录
  const [transactions, setTransactions] = useState([]);
  // 搜索关键词
  const [searchTerm, setSearchTerm] = useState('');
  // 当前操作的产品
  const [selectedProduct, setSelectedProduct] = useState(null);
  // 弹窗类型：receive/sell/return/manage
  const [modalType, setModalType] = useState(null);
  // 收货/销售/退货数量
  const [quantity, setQuantity] = useState('');
  // 操作备注
  const [notes, setNotes] = useState('');
  // Hold数量
  const [holdValue, setHoldValue] = useState(0);
  // Display数量
  const [displayValue, setDisplayValue] = useState(0);
  // 页面加载状态
  const [loading, setLoading] = useState(true);
  // 控制“添加产品弹窗”
  const [showAddProduct, setShowAddProduct] = useState(false);
  // 控制“交易历史弹窗”
  const [showHistory, setShowHistory] = useState(false);
  // 新产品信息
  const [newProduct, setNewProduct] = useState({
    name: '',
    sku: '',
    category: 'Stemware',
    totalStock: 0,
    minStockLevel: 2,
    retailPrice: 0
  });

  /** 
   * 从 Firebase 实时获取产品列表
   */
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'products'), snapshot => {
      const productsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProducts(productsData);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  /**
   * 获取最近 20 条交易记录
   */
  useEffect(() => {
    const q = query(collection(db, 'transactions'), orderBy('timestamp', 'desc'), limit(20));
    const unsubscribe = onSnapshot(q, snapshot => {
      const transactionsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTransactions(transactionsData);
    });
    return () => unsubscribe();
  }, []);

  /**
   * 计算产品可用库存
   */
  const getAvailable = (product) => {
    return product.totalStock - (product.onHold || 0) - (product.onDisplay || 0);
  };

  /**
   * 搜索过滤产品
   */
  const filteredProducts = useMemo(() => {
    return products.filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [products, searchTerm]);

  /**
   * 添加新产品
   */
  const handleAddProduct = async () => {
    if (!newProduct.name || !newProduct.sku) {
      alert('请填写产品名称和SKU');
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
        category: 'Stemware',
        totalStock: 0,
        minStockLevel: 2,
        retailPrice: 0
      });
      alert('产品添加成功！');
    } catch (error) {
      console.error('添加产品失败:', error);
      alert('添加失败，请重试');
    }
  };

  /**
   * 打开操作弹窗
   */
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

  /**
   * 关闭弹窗
   */
  const closeModal = () => {
    setSelectedProduct(null);
    setModalType(null);
    setQuantity('');
    setNotes('');
  };

  /**
   * 执行收货/销售/退货操作
   */
  const handleStockOperation = async () => {
    if (!quantity || parseInt(quantity) <= 0) {
      alert('请输入有效数量');
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
          alert('可用库存不足！');
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
      console.error('操作失败:', error);
      alert('操作失败，请重试');
    }
  };

  /**
   * 管理 Hold / Display
   */
  const handleManageHoldDisplay = async () => {
    const newHold = parseInt(holdValue);
    const newDisplay = parseInt(displayValue);

    if (newHold + newDisplay > selectedProduct.totalStock) {
      alert('Hold + Display 不能超过总库存！');
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
      console.error('操作失败:', error);
      alert('操作失败，请重试');
    }
  };

  /**
   * 根据可用库存获取颜色
   */
  const getStockStatus = (product) => {
    const available = getAvailable(product);
    if (available === 0) return 'text-red-600';
    if (available <= product.minStockLevel) return 'text-yellow-600';
    return 'text-green-600';
  };

  /**
   * 格式化时间
   */
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    return date.toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 头部 */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Waterford Crystal 库存管理</h1>
            <p className="text-sm text-gray-500 mt-1">Brown Thomas 专柜</p>
          </div>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
          >
            <History className="w-4 h-4" />
            交易历史
          </button>
        </div>
      </header>

      {/* 主要内容 */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* 搜索栏 */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="搜索产品名称或SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* 低库存提醒 */}
        {products.some(p => getAvailable(p) <= p.minStockLevel && getAvailable(p) > 0) && (
          <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
            <div className="flex items-center">
              <AlertCircle className="text-yellow-600 w-5 h-5 mr-2" />
              <p className="text-yellow-800 font-medium">
                有 {products.filter(p => getAvailable(p) <= p.minStockLevel && getAvailable(p) > 0).length} 件产品库存偏低，请及时补货
              </p>
            </div>
          </div>
        )}

        {/* 产品列表 */}
        {products.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">还没有添加任何产品</p>
            <button
              onClick={() => setShowAddProduct(true)}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
            >
              添加第一个产品
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredProducts.map(product => {
              const available = getAvailable(product);
              return (
                <div key={product.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    {/* 产品信息 */}
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">{product.name}</h3>
                      <p className="text-sm text-gray-500 mt-1">SKU: {product.sku} | {product.category}</p>

                      {/* 库存信息 */}
                      <div className="flex flex-wrap gap-4 mt-3">
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-600">总库存:</span>
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
                          <span className="text-sm text-gray-600">可用:</span>
                          <span className={`font-bold ${getStockStatus(product)}`}>{available}</span>
                        </div>
                      </div>

                      {/* 低库存警告 */}
                      {available <= product.minStockLevel && available > 0 && (
                        <div className="mt-2 text-sm text-yellow-600 flex items-center gap-1">
                          <AlertCircle className="w-4 h-4" />
                          <span>库存偏低，建议补货</span>
                        </div>
                      )}
                      {available === 0 && (
                        <div className="mt-2 text-sm text-red-600 flex items-center gap-1 font-medium">
                          <AlertCircle className="w-4 h-4" />
                          <span>无可用库存！</span>
                        </div>
                      )}
                    </div>

                    {/* 操作按钮 */}
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => openModal(product, 'receive')}
                        className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition flex items-center gap-1"
                      >
                        <TrendingUp className="w-4 h-4" />
                        收货
                      </button>
                      <button
                        onClick={() => openModal(product, 'sell')}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={available === 0}
                      >
                        <TrendingDown className="w-4 h-4" />
                        销售
                      </button>
                      <button
                        onClick={() => openModal(product, 'return')}
                        className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition"
                      >
                        退货
                      </button>
                      <button
                        onClick={() => openModal(product, 'manage')}
                        className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
                      >
                        管理H/D
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 添加产品按钮 */}
        {products.length > 0 && (
          <button
            onClick={() => setShowAddProduct(true)}
            className="mt-6 w-full py-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-500 transition flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            添加新产品
          </button>
        )}
      </main>

      {/* 弹窗部分省略，可继续使用原始设计，并绑定 handleAddProduct / handleStockOperation / handleManageHoldDisplay / formatTime */}

    </div>
  );
}

export default App;
