import React, { useState, useEffect, useMemo } from 'react';
import { Search, Plus, Package, TrendingUp, TrendingDown, AlertCircle, Eye, Lock, History } from 'lucide-react';
import { db } from './firebase';
import { collection, addDoc, updateDoc, doc, onSnapshot, query, orderBy, limit, serverTimestamp } from 'firebase/firestore';

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
  const [newProduct, setNewProduct] = useState({
    name: '',
    sku: '',
    category: 'Stemware',
    totalStock: 0,
    minStockLevel: 2,
    retailPrice: 0
  });

  // 从 Firebase 实时读取产品数据
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

  // 读取最近的交易记录
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

  // 计算可用库存
  const getAvailable = (product) => {
    return product.totalStock - (product.onHold || 0) - (product.onDisplay || 0);
  };

  // 搜索过滤
  const filteredProducts = useMemo(() => {
    return products.filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [products, searchTerm]);

  // 添加新产品
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

  // 打开操作弹窗
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

  // 关闭弹窗
  const closeModal = () => {
    setSelectedProduct(null);
    setModalType(null);
    setQuantity('');
    setNotes('');
  };

  // 处理库存操作
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
      // 更新产品库存
      const productRef = doc(db, 'products', selectedProduct.id);
      await updateDoc(productRef, {
        totalStock: Math.max(0, newTotal),
        updatedAt: serverTimestamp()
      });

      // 添加交易记录
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

  // 处理Hold/Display管理
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

      // 添加交易记录
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

  // 获取库存状态颜色
  const getStockStatus = (product) => {
    const available = getAvailable(product);
    if (available === 0) return 'text-red-600';
    if (available <= product.minStockLevel) return 'text-yellow-600';
    return 'text-green-600';
  };

  // 格式化时间
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    return date.toLocaleString('zh-CN', { 
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

        {/* 添加新产品按钮 */}
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

      {/* 添加产品弹窗 */}
      {showAddProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">添加新产品</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">产品名称 *</label>
                <input
                  type="text"
                  value={newProduct.name}
                  onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="例如: Lismore Diamond Red Wine Set"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">SKU *</label>
                <input
                  type="text"
                  value={newProduct.sku}
                  onChange={(e) => setNewProduct({...newProduct, sku: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="例如: L136242"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">分类</label>
                <select
                  value={newProduct.category}
                  onChange={(e) => setNewProduct({...newProduct, category: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Stemware">Stemware</option>
                  <option value="Barware">Barware</option>
                  <option value="Giftware">Giftware</option>
                  <option value="Home Décor">Home Décor</option>
                  <option value="Lighting">Lighting</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">初始库存</label>
                <input
                  type="number"
                  value={newProduct.totalStock}
                  onChange={(e) => setNewProduct({...newProduct, totalStock: parseInt(e.target.value) || 0})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">低库存预警值</label>
                <input
                  type="number"
                  value={newProduct.minStockLevel}
                  onChange={(e) => setNewProduct({...newProduct, minStockLevel: parseInt(e.target.value) || 0})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">零售价格 (€)</label>
                <input
                  type="number"
                  value={newProduct.retailPrice}
                  onChange={(e) => setNewProduct({...newProduct, retailPrice: parseFloat(e.target.value) || 0})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleAddProduct}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
              >
                添加产品
              </button>
              <button
                onClick={() => setShowAddProduct(false)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 交易历史弹窗 */}
      {showHistory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">交易历史</h2>
              <button onClick={() => setShowHistory(false)} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>
            
            {transactions.length === 0 ? (
              <p className="text-center text-gray-500 py-8">暂无交易记录</p>
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
                        {t.type === 'receive' ? '收货' : t.type === 'sell' ? '销售' : t.type === 'return' ? '退货' : '管理'}
                      </span>
                    </div>
                    <div className="mt-1 text-sm text-gray-600">
                      {t.type !== 'manage' && <p>数量: {t.quantity} ({t.quantityBefore} → {t.quantityAfter})</p>}
                      {t.notes && <p>备注: {t.notes}</p>}
                      <p className="text-xs text-gray-400 mt-1">{formatTime(t.timestamp)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 操作弹窗 */}
      {modalType && selectedProduct && modalType !== 'manage' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">
              {modalType === 'receive' && '收货'}
              {modalType === 'sell' && '销售'}
              {modalType === 'return' && '退货'}
            </h2>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-1">产品</p>
              <p className="font-medium">{selectedProduct.name}</p>
              <p className="text-sm text-gray-500">SKU: {selectedProduct.sku}</p>
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-1">当前库存</p>
              <p className="font-medium">
                总库存: {selectedProduct.totalStock} | 可用: {getAvailable(selectedProduct)}
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {modalType === 'receive' ? '收货' : modalType === 'sell' ? '销售' : '退货'}数量
              </label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="输入数量"
                min="1"
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                备注 (可选)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="订单号/快递单号"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleStockOperation}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
              >
                确认
              </button>
              <button
                onClick={closeModal}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hold/Display管理弹窗 */}
      {modalType === 'manage' && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">管理 Hold & Display</h2>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-1">产品</p>
              <p className="font-medium">{selectedProduct.name}</p>
            </div>

            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600">总库存</span>
                <span className="font-bold text-lg">{selectedProduct.totalStock}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">当前可用</span>
                <span className="font-semibold text-green-600">{getAvailable(selectedProduct)}</span>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Hold 数量</label>
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Display 数量</label>
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
                <span className="text-sm font-medium text-blue-900">新的可用库存</span>
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
                保存
              </button>
              <button
                onClick={closeModal}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;