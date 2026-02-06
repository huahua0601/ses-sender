"use client";

import React, { useState, useEffect, createContext, useContext, useCallback } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ========== Toast 通知系统 ==========
type ToastType = "success" | "error" | "info" | "warning";
interface ToastItem { id: number; type: ToastType; title: string; message: string; }
const ToastContext = createContext<{ toast: (type: ToastType, title: string, message?: string) => void }>({ toast: () => {} });
function useToast() { return useContext(ToastContext); }

function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const toast = useCallback((type: ToastType, title: string, message: string = "") => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, type, title, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);
  const remove = (id: number) => setToasts(prev => prev.filter(t => t.id !== id));

  const icons = {
    success: "✓", error: "✕", info: "ℹ", warning: "⚠",
  };
  const colors = {
    success: "bg-green-50 border-green-400 text-green-800",
    error: "bg-red-50 border-red-400 text-red-800",
    info: "bg-blue-50 border-blue-400 text-blue-800",
    warning: "bg-yellow-50 border-yellow-400 text-yellow-800",
  };
  const iconBg = {
    success: "bg-green-500", error: "bg-red-500", info: "bg-blue-500", warning: "bg-yellow-500",
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-3 w-96">
        {toasts.map(t => (
          <div key={t.id} className={`${colors[t.type]} border-l-4 rounded-lg shadow-lg p-4 animate-slide-in flex items-start gap-3`}>
            <span className={`${iconBg[t.type]} text-white rounded-full w-6 h-6 flex items-center justify-center text-sm flex-shrink-0 mt-0.5`}>{icons[t.type]}</span>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">{t.title}</p>
              {t.message && <p className="text-sm mt-1 opacity-80 whitespace-pre-line">{t.message}</p>}
            </div>
            <button onClick={() => remove(t.id)} className="text-current opacity-40 hover:opacity-100 text-lg leading-none">&times;</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// ========== 确认对话框 ==========
interface ConfirmState { open: boolean; title: string; message: string; onConfirm: () => void; }
const ConfirmContext = createContext<{ confirm: (title: string, message: string) => Promise<boolean> }>({ confirm: async () => false });
function useConfirm() { return useContext(ConfirmContext); }

function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ConfirmState>({ open: false, title: "", message: "", onConfirm: () => {} });
  const resolveRef = React.useRef<(v: boolean) => void>();

  const confirm = useCallback((title: string, message: string): Promise<boolean> => {
    return new Promise(resolve => {
      resolveRef.current = resolve;
      setState({ open: true, title, message, onConfirm: () => {} });
    });
  }, []);

  const handleConfirm = () => { resolveRef.current?.(true); setState(s => ({ ...s, open: false })); };
  const handleCancel = () => { resolveRef.current?.(false); setState(s => ({ ...s, open: false })); };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {state.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={handleCancel} />
          <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4 animate-scale-in">
            <h3 className="text-lg font-bold text-gray-900 mb-2">{state.title}</h3>
            <p className="text-gray-600 text-sm mb-6 whitespace-pre-line">{state.message}</p>
            <div className="flex justify-end gap-3">
              <button onClick={handleCancel} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">取消</button>
              <button onClick={handleConfirm} className="px-4 py-2 text-sm text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors">确认</button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

// ========== Auth Context ==========
const AuthContext = createContext(null);

function useAuth() {
  return useContext(AuthContext);
}

function authHeaders(token) {
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

// ========== Main App ==========
export default function Home() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("ses_token");
    const savedUser = localStorage.getItem("ses_user");
    if (saved && savedUser) {
      setToken(saved);
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const login = async (username, password) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "登录失败");
    }
    const data = await res.json();
    setToken(data.access_token);
    setUser(data.user);
    localStorage.setItem("ses_token", data.access_token);
    localStorage.setItem("ses_user", JSON.stringify(data.user));
  };

  const logout = () => {
    setToken("");
    setUser(null);
    localStorage.removeItem("ses_token");
    localStorage.removeItem("ses_user");
  };

  if (!user) return <ToastProvider><LoginPage onLogin={login} /></ToastProvider>;

  return (
    <ToastProvider>
      <ConfirmProvider>
        <AuthContext.Provider value={{ user, token, logout }}>
          {user.is_admin ? <AdminDashboard /> : <UserDashboard />}
        </AuthContext.Provider>
      </ConfirmProvider>
    </ToastProvider>
  );
}

// ========== Login Page ==========
function LoginPage({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await onLogin(username, password);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-blue-600">SES Sender</h1>
          <p className="text-gray-500 mt-2">邮件批量发送管理平台</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="bg-red-50 text-red-600 p-3 rounded text-sm">{error}</div>}
          <input
            type="text" placeholder="用户名" value={username}
            onChange={e => setUsername(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
          />
          <input
            type="password" placeholder="密码" value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
          />
          <button
            type="submit" disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-colors disabled:bg-gray-400"
          >
            {loading ? "登录中..." : "登录"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ========== Nav Bar ==========
function NavBar({ tabs, activeTab, setActiveTab }) {
  const { user, logout } = useAuth();
  return (
    <nav className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center font-bold text-xl text-blue-600">SES Sender</div>
            <div className="hidden sm:-my-px sm:ml-6 sm:flex sm:space-x-8">
              {tabs.map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`${activeTab === tab.id ? "border-blue-500 text-gray-900" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"} inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                >{tab.label}</button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">
              {user.display_name} {user.is_admin && <span className="bg-red-100 text-red-700 text-xs px-1.5 py-0.5 rounded">管理员</span>}
            </span>
            <button onClick={logout} className="text-sm text-gray-500 hover:text-red-500">退出</button>
          </div>
        </div>
      </div>
    </nav>
  );
}

// ========== Admin Dashboard ==========
function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("users");
  const tabs = [
    { id: "users", label: "用户管理" },
    { id: "identities", label: "发送实体" },
    { id: "templates", label: "邮件模版" },
    { id: "test", label: "测试邮件" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar tabs={tabs} activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {activeTab === "users" && <AdminUserManager />}
        {activeTab === "identities" && <AdminIdentities />}
        {activeTab === "templates" && <AdminTemplates />}
        {activeTab === "test" && <AdminTestEmail />}
      </main>
    </div>
  );
}

// --- Admin: User Management ---
function AdminUserManager() {
  const { token } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ username: "", display_name: "", password: "", email: "", is_admin: false });

  const fetchUsers = async () => {
    const res = await fetch(`${API_BASE}/admin/users`, { headers: authHeaders(token) });
    setUsers(await res.json());
  };
  useEffect(() => { fetchUsers(); }, []);

  const createUser = async () => {
    if (!form.username || !form.password || !form.email) return toast("warning", "请填写完整信息");
    const res = await fetch(`${API_BASE}/admin/users`, {
      method: "POST", headers: authHeaders(token), body: JSON.stringify(form)
    });
    if (res.ok) { toast("success", "用户创建成功"); setShowAdd(false); setForm({ username: "", display_name: "", password: "", email: "", is_admin: false }); fetchUsers(); }
    else { const err = await res.json(); toast("error", "创建失败", err.detail); }
  };

  const toggleActive = async (u) => {
    await fetch(`${API_BASE}/admin/users/${u.id}`, {
      method: "PUT", headers: authHeaders(token), body: JSON.stringify({ is_active: !u.is_active })
    });
    fetchUsers();
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-medium text-gray-800">用户管理</h2>
        <button onClick={() => setShowAdd(!showAdd)} className="bg-blue-600 text-white px-4 py-1.5 rounded text-sm hover:bg-blue-700">{showAdd ? "取消" : "+ 添加用户"}</button>
      </div>
      {showAdd && (
        <div className="mb-6 p-4 border rounded-lg bg-gray-50 grid grid-cols-1 md:grid-cols-2 gap-3">
          <input placeholder="用户名" className="border p-2 rounded text-gray-800" value={form.username} onChange={e => setForm({...form, username: e.target.value})} />
          <input placeholder="显示名称" className="border p-2 rounded text-gray-800" value={form.display_name} onChange={e => setForm({...form, display_name: e.target.value})} />
          <input type="password" placeholder="密码" className="border p-2 rounded text-gray-800" value={form.password} onChange={e => setForm({...form, password: e.target.value})} />
          <input placeholder="发送邮箱 (如 user@yourdomain.com)" className="border p-2 rounded text-gray-800" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={form.is_admin} onChange={e => setForm({...form, is_admin: e.target.checked})} /> 管理员权限
          </label>
          <button onClick={createUser} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">创建用户</button>
        </div>
      )}
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">用户名</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">显示名称</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">发送邮箱</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">角色</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {users.map(u => (
            <tr key={u.id}>
              <td className="px-4 py-3 text-sm text-gray-900">{u.username}</td>
              <td className="px-4 py-3 text-sm text-gray-600">{u.display_name}</td>
              <td className="px-4 py-3 text-sm text-gray-600">{u.email || "-"}</td>
              <td className="px-4 py-3 text-sm">
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${u.is_admin ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"}`}>
                  {u.is_admin ? "管理员" : "普通用户"}
                </span>
              </td>
              <td className="px-4 py-3 text-sm">
                <span className={`px-2 py-0.5 rounded text-xs ${u.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                  {u.is_active ? "启用" : "禁用"}
                </span>
              </td>
              <td className="px-4 py-3 text-sm">
                <button onClick={() => toggleActive(u)} className="text-blue-600 hover:underline text-xs">
                  {u.is_active ? "禁用" : "启用"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// --- Admin: Identities ---
function AdminIdentities() {
  const { token } = useAuth();
  const { toast } = useToast();
  const [identities, setIdentities] = useState([]);
  const [newEmail, setNewEmail] = useState("");
  const [newDomain, setNewDomain] = useState("");

  const fetch_ = async () => {
    const res = await fetch(`${API_BASE}/admin/identities`, { headers: authHeaders(token) });
    const data = await res.json();
    setIdentities(Array.isArray(data) ? data : []);
  };
  useEffect(() => { fetch_(); }, []);

  const verifyEmail = async () => {
    if (!newEmail) return;
    const res = await fetch(`${API_BASE}/admin/identities/verify-email?email=${newEmail}`, { method: "POST", headers: authHeaders(token) });
    if (res.ok) { toast("success", "验证邮件已发送", newEmail); setNewEmail(""); fetch_(); }
    else { const err = await res.json(); toast("error", "验证失败", err.detail); }
  };

  const verifyDomain = async () => {
    if (!newDomain) return;
    const res = await fetch(`${API_BASE}/admin/identities/verify-domain?domain=${newDomain}`, { method: "POST", headers: authHeaders(token) });
    const data = await res.json();
    if (res.ok) { toast("info", "请添加 TXT 记录", `_amazonses.${newDomain} -> ${data.token}`); setNewDomain(""); fetch_(); }
    else { toast("error", "验证失败", data.detail); }
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-lg font-medium mb-4 text-gray-800">发送实体管理</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="flex">
          <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="验证邮箱地址"
            className="flex-1 border rounded-l px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <button onClick={verifyEmail} className="bg-blue-600 text-white px-4 py-2 rounded-r hover:bg-blue-700">验证邮箱</button>
        </div>
        <div className="flex">
          <input value={newDomain} onChange={e => setNewDomain(e.target.value)} placeholder="验证域名 (如 example.com)"
            className="flex-1 border rounded-l px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <button onClick={verifyDomain} className="bg-indigo-600 text-white px-4 py-2 rounded-r hover:bg-indigo-700">验证域名</button>
        </div>
      </div>
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">实体名称</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">类型</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {identities.map(id => (
            <tr key={id.identity}>
              <td className="px-6 py-4 text-sm font-medium text-gray-900">{id.identity}</td>
              <td className="px-6 py-4 text-sm text-gray-500">{id.type === "EmailAddress" ? "邮箱" : "域名"}</td>
              <td className="px-6 py-4 text-sm">
                <span className={`px-2 py-0.5 rounded text-xs font-semibold ${id.verification_status === "Success" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}>
                  {id.verification_status === "Success" ? "已验证" : "验证中/失败"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// --- Admin: Templates ---
function AdminTemplates() {
  const { token } = useAuth();
  const { toast } = useToast();
  const { confirm: cfm } = useConfirm();
  const [templates, setTemplates] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newTpl, setNewTpl] = useState({ TemplateName: "", SubjectPart: "", HtmlPart: "" });

  const fetch_ = async () => {
    const res = await fetch(`${API_BASE}/admin/templates`, { headers: authHeaders(token) });
    const data = await res.json();
    setTemplates(Array.isArray(data) ? data : []);
  };
  useEffect(() => { fetch_(); }, []);

  const create = async () => {
    if (!newTpl.TemplateName || !newTpl.SubjectPart || !newTpl.HtmlPart) return toast("warning", "请填写完整信息");
    if (!/^[a-zA-Z0-9_-]+$/.test(newTpl.TemplateName)) return toast("warning", "模版名称格式错误", "只能包含英文字母、数字、下划线和连字符");
    const res = await fetch(`${API_BASE}/admin/templates`, { method: "POST", headers: authHeaders(token), body: JSON.stringify(newTpl) });
    if (res.ok) { toast("success", "模版创建成功"); setShowAdd(false); setNewTpl({ TemplateName: "", SubjectPart: "", HtmlPart: "" }); fetch_(); }
    else { const err = await res.json(); toast("error", "创建失败", err.detail); }
  };

  const del = async (name) => {
    const yes = await cfm(`删除模版`, `确定删除模版「${name}」吗？此操作不可恢复。`);
    if (!yes) return;
    const res = await fetch(`${API_BASE}/admin/templates/${name}`, { method: "DELETE", headers: authHeaders(token) });
    if (res.ok) { toast("success", "模版已删除"); fetch_(); }
    else { const err = await res.json(); toast("error", "删除失败", err.detail); }
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-medium text-gray-800">邮件模版管理</h2>
        <button onClick={() => setShowAdd(!showAdd)} className="bg-blue-600 text-white px-4 py-1.5 rounded text-sm hover:bg-blue-700">{showAdd ? "取消" : "+ 新建模版"}</button>
      </div>
      {showAdd && (
        <div className="mb-6 p-4 border rounded-lg bg-gray-50 space-y-3">
          <input placeholder="模版名称 (仅限英文、数字、下划线、连字符)" className="w-full border p-2 rounded text-gray-800" value={newTpl.TemplateName} onChange={e => setNewTpl({...newTpl, TemplateName: e.target.value})} />
          <input placeholder="邮件主题 (支持 {{name}} 变量)" className="w-full border p-2 rounded text-gray-800" value={newTpl.SubjectPart} onChange={e => setNewTpl({...newTpl, SubjectPart: e.target.value})} />
          <textarea placeholder="HTML 内容 (支持 {{name}} 变量)" className="w-full border p-2 rounded h-32 text-gray-800" value={newTpl.HtmlPart} onChange={e => setNewTpl({...newTpl, HtmlPart: e.target.value})} />
          <button onClick={create} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">保存模版</button>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map(tpl => (
          <div key={tpl.Name} className="border p-4 rounded-lg hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
              <h3 className="font-bold text-gray-900">{tpl.Name}</h3>
              <button onClick={() => del(tpl.Name)} className="text-red-500 hover:text-red-700 text-xs">删除</button>
            </div>
            <p className="text-xs text-gray-500 mt-1">创建时间: {new Date(tpl.CreatedTimestamp).toLocaleString()}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Admin: Test Email ---
function AdminTestEmail() {
  const { token } = useAuth();
  const { toast } = useToast();
  const [identities, setIdentities] = useState([]);
  const [form, setForm] = useState({ source: "", to: "", subject: "", html_body: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/admin/identities`, { headers: authHeaders(token) })
      .then(r => r.json()).then(data => setIdentities(Array.isArray(data) ? data.filter(x => x.verification_status === "Success") : []));
  }, []);

  const send = async () => {
    if (!form.source || !form.to || !form.subject || !form.html_body) return toast("warning", "请填写完整信息");
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin/test-email`, { method: "POST", headers: authHeaders(token), body: JSON.stringify(form) });
      const data = await res.json();
      if (res.ok) toast("success", "测试邮件发送成功", `MessageId: ${data.message_id}`);
      else toast("error", "发送失败", data.detail);
    } catch (e) { toast("error", "网络错误", e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="bg-white shadow rounded-lg p-6 max-w-2xl mx-auto">
      <h2 className="text-lg font-medium mb-6 text-gray-800">发送测试邮件</h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">发送者 (已验证实体)</label>
          <select className="w-full border rounded p-2 text-gray-800" value={form.source} onChange={e => setForm({...form, source: e.target.value})}>
            <option value="">选择发送邮箱/域名</option>
            {identities.map(id => <option key={id.identity} value={id.identity}>{id.identity}</option>)}
          </select>
        </div>
        <input placeholder="收件人邮箱" className="w-full border p-2 rounded text-gray-800" value={form.to} onChange={e => setForm({...form, to: e.target.value})} />
        <input placeholder="邮件主题" className="w-full border p-2 rounded text-gray-800" value={form.subject} onChange={e => setForm({...form, subject: e.target.value})} />
        <textarea placeholder="HTML 内容" className="w-full border p-2 rounded h-32 text-gray-800" value={form.html_body} onChange={e => setForm({...form, html_body: e.target.value})} />
        <button onClick={send} disabled={loading} className={`w-full py-3 rounded text-white font-bold ${loading ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"}`}>
          {loading ? "发送中..." : "发送测试邮件"}
        </button>
      </div>
    </div>
  );
}

// ========== User Dashboard ==========
function UserDashboard() {
  const [activeTab, setActiveTab] = useState("groups");
  const tabs = [
    { id: "groups", label: "客群管理" },
    { id: "send", label: "批量发送" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar tabs={tabs} activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {activeTab === "groups" && <UserGroupsManager />}
        {activeTab === "send" && <UserBulkSender />}
      </main>
    </div>
  );
}

// --- User: Groups Manager ---
function UserGroupsManager() {
  const { token } = useAuth();
  const { toast } = useToast();
  const { confirm: cfm } = useConfirm();
  const [groups, setGroups] = useState([]);
  const [newGroupName, setNewGroupName] = useState("");
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [newRows, setNewRows] = useState([{ name: "", email: "" }]);

  const fetchGroups = async () => {
    try {
      const res = await fetch(`${API_BASE}/groups`, { headers: authHeaders(token) });
      const data = await res.json();
      setGroups(Array.isArray(data) ? data : []);
    } catch (e) { console.error(e); setGroups([]); }
  };
  useEffect(() => { fetchGroups(); }, []);

  const createGroup = async () => {
    if (!newGroupName) return;
    await fetch(`${API_BASE}/groups`, { method: "POST", headers: authHeaders(token), body: JSON.stringify({ name: newGroupName }) });
    setNewGroupName("");
    fetchGroups();
  };

  const deleteGroup = async (id) => {
    const yes = await cfm("删除客群", "确定删除此客群及其所有联系人？此操作不可恢复。");
    if (!yes) return;
    await fetch(`${API_BASE}/groups/${id}`, { method: "DELETE", headers: authHeaders(token) });
    if (selectedGroup === id) { setSelectedGroup(null); setContacts([]); }
    fetchGroups();
  };

  const fetchContacts = async (groupId) => {
    const res = await fetch(`${API_BASE}/groups/${groupId}/contacts`, { headers: authHeaders(token) });
    setContacts(await res.json());
    setSelectedGroup(groupId);
  };

  const updateRow = (idx, field, value) => {
    const rows = [...newRows];
    rows[idx][field] = value;
    setNewRows(rows);
  };

  const addRow = () => {
    setNewRows([...newRows, { name: "", email: "" }]);
  };

  const removeRow = (idx) => {
    if (newRows.length <= 1) return;
    setNewRows(newRows.filter((_, i) => i !== idx));
  };

  const submitContacts = async () => {
    const validRows = newRows.filter(r => r.email.trim());
    if (validRows.length === 0) return toast("warning", "请至少填写一个邮箱");
    for (const row of validRows) {
      await fetch(`${API_BASE}/contacts`, {
        method: "POST", headers: authHeaders(token),
        body: JSON.stringify({ name: row.name.trim(), email: row.email.trim(), group_id: selectedGroup })
      });
    }
    setNewRows([{ name: "", email: "" }]);
    fetchContacts(selectedGroup);
  };

  const deleteContact = async (id) => {
    await fetch(`${API_BASE}/contacts/${id}`, { method: "DELETE", headers: authHeaders(token) });
    fetchContacts(selectedGroup);
  };

  const downloadTemplate = () => {
    window.open(`${API_BASE}/contacts/template/download?token=${token}`, "_blank");
  };

  const downloadContacts = () => {
    if (!selectedGroup) return;
    window.open(`${API_BASE}/groups/${selectedGroup}/contacts/download?token=${token}`, "_blank");
  };

  const uploadContacts = async (e) => {
    const file = e.target.files[0];
    if (!file || !selectedGroup) return;
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`${API_BASE}/groups/${selectedGroup}/contacts/upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData
    });
    const data = await res.json();
    if (res.ok) { toast("success", "导入成功", data.message); fetchContacts(selectedGroup); }
    else toast("error", "导入失败", data.detail);
    e.target.value = "";
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="bg-white shadow rounded-lg p-6 md:col-span-1">
        <h2 className="text-lg font-medium mb-4 text-gray-800">我的客群</h2>
        <div className="flex mb-4">
          <input value={newGroupName} onChange={e => setNewGroupName(e.target.value)} placeholder="新客群名称"
            className="flex-1 border rounded-l px-2 py-1.5 text-sm text-gray-800" />
          <button onClick={createGroup} className="bg-blue-600 text-white px-3 py-1.5 rounded-r text-sm hover:bg-blue-700">创建</button>
        </div>
        <ul className="space-y-1">
          {groups.map(g => (
            <li key={g.id} className={`flex justify-between items-center p-2 rounded cursor-pointer ${selectedGroup === g.id ? "bg-blue-50 text-blue-700 font-medium" : "hover:bg-gray-50 text-gray-700"}`}>
              <span onClick={() => fetchContacts(g.id)} className="flex-1">{g.name}</span>
              <button onClick={() => deleteGroup(g.id)} className="text-red-400 hover:text-red-600 text-xs ml-2">删除</button>
            </li>
          ))}
        </ul>
      </div>

      <div className="bg-white shadow rounded-lg p-6 md:col-span-2">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium text-gray-800">{selectedGroup ? "联系人管理" : "请选择一个客群"}</h2>
          {selectedGroup && (
            <div className="flex gap-2">
              <button onClick={downloadTemplate} className="text-xs text-blue-600 hover:underline">下载模版</button>
              <label className="text-xs text-green-600 hover:underline cursor-pointer">
                Excel导入
                <input type="file" accept=".xlsx,.xls" className="hidden" onChange={uploadContacts} />
              </label>
              <button onClick={downloadContacts} className="text-xs text-indigo-600 hover:underline">导出Excel</button>
            </div>
          )}
        </div>
        {selectedGroup && (
          <>
            <div className="mb-4 space-y-2">
              {newRows.map((row, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <input placeholder="姓名" className="flex-1 border rounded px-3 py-1.5 text-sm text-gray-800"
                    value={row.name} onChange={e => updateRow(idx, "name", e.target.value)} />
                  <input placeholder="邮箱" className="flex-1 border rounded px-3 py-1.5 text-sm text-gray-800"
                    value={row.email} onChange={e => updateRow(idx, "email", e.target.value)} />
                  {newRows.length > 1 && (
                    <button onClick={() => removeRow(idx)} className="text-red-400 hover:text-red-600 text-lg leading-none px-1">&times;</button>
                  )}
                </div>
              ))}
              <div className="flex gap-2">
                <button onClick={addRow} className="text-blue-600 text-sm hover:underline">+ 添加一行</button>
                <button onClick={submitContacts} className="bg-green-600 text-white px-4 py-1.5 rounded text-sm hover:bg-green-700">批量保存</button>
              </div>
            </div>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">姓名</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">邮箱</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {contacts.map(c => (
                  <tr key={c.id}>
                    <td className="px-4 py-2 text-sm text-gray-900">{c.name}</td>
                    <td className="px-4 py-2 text-sm text-gray-600">{c.email}</td>
                    <td className="px-4 py-2 text-sm">
                      <button onClick={() => deleteContact(c.id)} className="text-red-500 hover:underline text-xs">删除</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {contacts.length === 0 && <p className="text-center text-gray-400 py-6 text-sm">暂无联系人，手动添加或 Excel 导入</p>}
          </>
        )}
      </div>
    </div>
  );
}

// --- User: Bulk Sender ---
function UserBulkSender() {
  const { token, user } = useAuth();
  const { toast } = useToast();
  const [templates, setTemplates] = useState([]);
  const [groups, setGroups] = useState([]);
  const [form, setForm] = useState({ template: "", groupId: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`${API_BASE}/user/templates`, { headers: authHeaders(token) }).then(r => r.json()),
      fetch(`${API_BASE}/groups`, { headers: authHeaders(token) }).then(r => r.json())
    ]).then(([t, g]) => {
      setTemplates(Array.isArray(t) ? t : []);
      setGroups(Array.isArray(g) ? g : []);
    });
  }, []);

  const send = async () => {
    if (!form.template || !form.groupId) return toast("warning", "请选择模版和目标客群");
    if (!user.email) return toast("warning", "发送邮箱未配置", "请联系管理员配置您的发送邮箱");
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/send-bulk`, {
        method: "POST", headers: authHeaders(token),
        body: JSON.stringify({ Template: form.template, GroupId: parseInt(form.groupId) })
      });
      const data = await res.json();
      if (res.ok) toast("success", "发送成功", `发送邮箱: ${data.source}\n发送批次: ${data.batches}\n联系人数: ${data.total_contacts}`);
      else toast("error", "发送失败", data.detail);
    } catch (e) { toast("error", "网络错误", e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="bg-white shadow rounded-lg p-6 max-w-2xl mx-auto">
      <h2 className="text-lg font-medium mb-6 text-gray-800">批量发送邮件</h2>
      <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-6 text-sm text-blue-800">
        发送邮箱: <strong>{user.email || "未配置（请联系管理员）"}</strong>
      </div>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">邮件模版</label>
          <select className="w-full border rounded p-2 text-gray-800" value={form.template} onChange={e => setForm({...form, template: e.target.value})}>
            <option value="">选择邮件模版</option>
            {templates.map(t => <option key={t.Name} value={t.Name}>{t.Name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">目标客群</label>
          <select className="w-full border rounded p-2 text-gray-800" value={form.groupId} onChange={e => setForm({...form, groupId: e.target.value})}>
            <option value="">选择目标客群</option>
            {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </div>
        <button onClick={send} disabled={loading || !user.email}
          className={`w-full py-3 rounded text-white font-bold transition-colors ${loading || !user.email ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"}`}>
          {loading ? "发送中..." : "立即开始批量发送"}
        </button>
      </div>
    </div>
  );
}
