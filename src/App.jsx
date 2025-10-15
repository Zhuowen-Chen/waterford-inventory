import React, { useState, useEffect } from "react";
import { db } from "./firebase"; // Firebase 配置文件
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
} from "firebase/firestore";

// ---------------------------
// 🧩 主组件开始
// ---------------------------
export default function App() {
  // ---------------------------
  // 🧠 定义状态（state）
  // ---------------------------
  const [products, setProducts] = useState([]); // 存储所有商品
  const [loading, setLoading] = useState(true); // 加载状态
  const [newProduct, setNewProduct] = useState({
    name: "",
    sku: "",
    categoryMain: "",
    categorySub1: "",
    categorySub2: "",
    totalStock: 0,
    onHold: 0,
    onDisplay: 0,
    retailPrice: 0,
  }); // 新增商品表单
  const [editingProduct, setEditingProduct] = useState(null); // 当前正在编辑的商品
  const [selectedMain, setSelectedMain] = useState(""); // 当前选择的大类
  const [selectedSub1, setSelectedSub1] = useState(""); // 当前选择的子类
  const [selectedSub2, setSelectedSub2] = useState(""); // 当前选择的子子类

  // ---------------------------
  // 🔄 从 Firestore 获取商品数据
  // ---------------------------
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      const querySnapshot = await getDocs(collection(db, "products"));
      const productList = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setProducts(productList);
      setLoading(false);
    };

    fetchProducts();
  }, []);

  // ---------------------------
  // ➕ 添加商品
  // ---------------------------
  const addProduct = async () => {
    if (!newProduct.name || !newProduct.sku) {
      alert("请填写完整商品名称和 SKU");
      return;
    }

    await addDoc(collection(db, "products"), newProduct);
    setNewProduct({
      name: "",
      sku: "",
      categoryMain: "",
      categorySub1: "",
      categorySub2: "",
      totalStock: 0,
      onHold: 0,
      onDisplay: 0,
      retailPrice: 0,
    });
    alert("✅ 已添加商品！");
  };

  // ---------------------------
  // ✏️ 修改商品（进入编辑模式）
  // ---------------------------
  const handleEdit = (product) => {
    setEditingProduct(product);
  };

  // ---------------------------
  // 💾 保存编辑修改
  // ---------------------------
  const saveEdit = async () => {
    if (!editingProduct) return;
    const productRef = doc(db, "products", editingProduct.id);
    await updateDoc(productRef, editingProduct);
    setEditingProduct(null);
    alert("✅ 修改成功！");
  };

  // ---------------------------
  // ❌ 删除商品
  // ---------------------------
  const deleteProduct = async (id) => {
    const confirmDelete = window.confirm("确定要删除该商品吗？");
    if (!confirmDelete) return;

    await deleteDoc(doc(db, "products", id));
    setProducts(products.filter((p) => p.id !== id));
    alert("🗑️ 已删除该商品");
  };

  // ---------------------------
  // 🧮 根据分类筛选商品
  // ---------------------------
  const filteredProducts = products.filter((p) => {
    if (selectedMain && p.categoryMain !== selectedMain) return false;
    if (selectedSub1 && p.categorySub1 !== selectedSub1) return false;
    if (selectedSub2 && p.categorySub2 !== selectedSub2) return false;
    return true;
  });

  // ---------------------------
  // 🧾 获取所有分类选项
  // ---------------------------
  const mainCategories = [...new Set(products.map((p) => p.categoryMain))];
  const subCategories1 = [
    ...new Set(
      products
        .filter((p) => p.categoryMain === selectedMain)
        .map((p) => p.categorySub1)
    ),
  ];
  const subCategories2 = [
    ...new Set(
      products
        .filter((p) => p.categorySub1 === selectedSub1)
        .map((p) => p.categorySub2)
    ),
  ];

  // ---------------------------
  // 🖥️ 页面 UI 渲染
  // ---------------------------
  if (loading) return <div>Loading...</div>;

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">
        🏷️ Waterford Crystal Inventory System
      </h1>

      {/* ---------------------- 添加商品表单 ---------------------- */}
      <div className="bg-gray-100 p-4 rounded-lg mb-6">
        <h2 className="text-lg font-semibold mb-2">➕ Add New Product</h2>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="text"
            placeholder="Product Name"
            value={newProduct.name}
            onChange={(e) =>
              setNewProduct({ ...newProduct, name: e.target.value })
            }
            className="border p-2 rounded"
          />
          <input
            type="text"
            placeholder="SKU"
            value={newProduct.sku}
            onChange={(e) =>
              setNewProduct({ ...newProduct, sku: e.target.value })
            }
            className="border p-2 rounded"
          />
          <input
            type="text"
            placeholder="Main Category"
            value={newProduct.categoryMain}
            onChange={(e) =>
              setNewProduct({ ...newProduct, categoryMain: e.target.value })
            }
            className="border p-2 rounded"
          />
          <input
            type="text"
            placeholder="Sub Category 1"
            value={newProduct.categorySub1}
            onChange={(e) =>
              setNewProduct({ ...newProduct, categorySub1: e.target.value })
            }
            className="border p-2 rounded"
          />
          <input
            type="text"
            placeholder="Sub Category 2"
            value={newProduct.categorySub2}
            onChange={(e) =>
              setNewProduct({ ...newProduct, categorySub2: e.target.value })
            }
            className="border p-2 rounded"
          />
          <input
            type="number"
            placeholder="Total Stock"
            value={newProduct.totalStock}
            onChange={(e) =>
              setNewProduct({
                ...newProduct,
                totalStock: Number(e.target.value),
              })
            }
            className="border p-2 rounded"
          />
        </div>
        <button
          onClick={addProduct}
          className="mt-3 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Add Product
        </button>
      </div>

      {/* ---------------------- 分类筛选 ---------------------- */}
      <div className="flex space-x-4 mb-6">
        <select
          value={selectedMain}
          onChange={(e) => {
            setSelectedMain(e.target.value);
            setSelectedSub1("");
            setSelectedSub2("");
          }}
          className="border p-2 rounded"
        >
          <option value="">All Main Categories</option>
          {mainCategories.map((cat) => (
            <option key={cat}>{cat}</option>
          ))}
        </select>

        {selectedMain && (
          <select
            value={selectedSub1}
            onChange={(e) => {
              setSelectedSub1(e.target.value);
              setSelectedSub2("");
            }}
            className="border p-2 rounded"
          >
            <option value="">All Sub Categories 1</option>
            {subCategories1.map((cat) => (
              <option key={cat}>{cat}</option>
            ))}
          </select>
        )}

        {selectedSub1 && (
          <select
            value={selectedSub2}
            onChange={(e) => setSelectedSub2(e.target.value)}
            className="border p-2 rounded"
          >
            <option value="">All Sub Categories 2</option>
            {subCategories2.map((cat) => (
              <option key={cat}>{cat}</option>
            ))}
          </select>
        )}
      </div>

      {/* ---------------------- 商品列表 ---------------------- */}
      <table className="w-full border-collapse border">
        <thead>
          <tr className="bg-gray-200 text-left">
            <th className="p-2 border">Product Name</th>
            <th className="p-2 border">SKU</th>
            <th className="p-2 border">Total</th>
            <th className="p-2 border">Hold</th>
            <th className="p-2 border">Display</th>
            <th className="p-2 border">Category</th>
            <th className="p-2 border">Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredProducts.map((p) => (
            <tr key={p.id} className="border-t">
              <td className="p-2 border">{p.name}</td>
              <td className="p-2 border">{p.sku}</td>
              <td className="p-2 border">{p.totalStock}</td>
              <td className="p-2 border">{p.onHold}</td>
              <td className="p-2 border">{p.onDisplay}</td>
              <td className="p-2 border">
                {p.categoryMain} → {p.categorySub1} → {p.categorySub2}
              </td>
              <td className="p-2 border space-x-2">
                <button
                  onClick={() => handleEdit(p)}
                  className="px-2 py-1 bg-yellow-400 rounded"
                >
                  Edit
                </button>
                <button
                  onClick={() => deleteProduct(p.id)}
                  className="px-2 py-1 bg-red-500 text-white rounded"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ---------------------- 编辑弹窗 ---------------------- */}
      {editingProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
          <div className="bg-white p-6 rounded shadow-md w-96">
            <h2 className="text-lg font-bold mb-2">✏️ Edit Product</h2>
            <input
              type="text"
              value={editingProduct.name}
              onChange={(e) =>
                setEditingProduct({ ...editingProduct, name: e.target.value })
              }
              className="border p-2 w-full mb-2 rounded"
            />
            <input
              type="text"
              value={editingProduct.sku}
              onChange={(e) =>
                setEditingProduct({ ...editingProduct, sku: e.target.value })
              }
              className="border p-2 w-full mb-2 rounded"
            />
            <input
              type="number"
              value={editingProduct.totalStock}
              onChange={(e) =>
                setEditingProduct({
                  ...editingProduct,
                  totalStock: Number(e.target.value),
                })
              }
              className="border p-2 w-full mb-2 rounded"
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setEditingProduct(null)}
                className="px-3 py-1 bg-gray-300 rounded"
              >
                Cancel
              </button>
              <button
                onClick={saveEdit}
                className="px-3 py-1 bg-green-500 text-white rounded"
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
