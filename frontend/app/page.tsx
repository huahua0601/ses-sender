"use client";

import React, { useState, useEffect } from "react";

export default function Home() {
  const [activeTab, setActiveTab] = useState("identities");

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center font-bold text-xl text-blue-600">
                SES Sender
              </div>
              <div className="hidden sm:-my-px sm:ml-6 sm:flex sm:space-x-8">
                {[
                  { id: "identities", label: "发送实体" },
                  { id: "templates", label: "邮件模版" },
                  { id: "groups", label: "客群管理" },
                  { id: "send", label: "批量发送" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`${
                      activeTab === tab.id
                        ? "border-blue-500 text-gray-900"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {activeTab === "identities" && <IdentitiesManager />}
          {activeTab === "templates" && <TemplatesManager />}
          {activeTab === "groups" && <GroupsManager />}
          {activeTab === "send" && <BulkSender />}
        </div>
      </main>
    </div>
  );
}

const API_BASE = "http://localhost:8000";

function IdentitiesManager() {
  const [identities, setIdentities] = useState([]);
  const [newEmail, setNewEmail] = useState("");

  const fetchIdentities = async () => {
    try {
      const res = await fetch(`${API_BASE}/identities`);
      const data = await res.json();
      setIdentities(Array.isArray(data) ? data : []);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchIdentities(); }, []);

  const verifyEmail = async () => {
    if (!newEmail) return;
    await fetch(`${API_BASE}/identities/verify-email?email=${newEmail}`, { method: "POST" });
    setNewEmail("");
    alert("验证邮件已发送，请在邮箱中确认");
    fetchIdentities();
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-lg font-medium mb-4 text-gray-800">发送实体管理 (SES Identities)</h2>
      <div className="flex mb-6">
        <input
          type="email"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          placeholder="输入要验证的邮箱地址"
          className="flex-1 border border-gray-300 rounded-l px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
        />
        <button onClick={verifyEmail} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-r transition-colors">
          添加并验证
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">实体名称</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">类型</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {identities.map((id) => (
              <tr key={id.identity}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{id.identity}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{id.type === 'EmailAddress' ? '邮箱' : '域名'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    id.verification_status === 'Success' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {id.verification_status === 'Success' ? '已验证' : '验证中/失败'}
                  </span>
                </td>
              </tr>
            ))}
            {identities.length === 0 && (
              <tr>
                <td colSpan={3} className="px-6 py-4 text-center text-gray-500">暂无发送实体</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TemplatesManager() {
  const [templates, setTemplates] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newTpl, setNewTpl] = useState({ TemplateName: "", SubjectPart: "", HtmlPart: "" });

  const fetchTemplates = async () => {
    try {
      const res = await fetch(`${API_BASE}/templates`);
      const data = await res.json();
      setTemplates(Array.isArray(data) ? data : []);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchTemplates(); }, []);

  const createTemplate = async () => {
    if (!newTpl.TemplateName || !newTpl.SubjectPart || !newTpl.HtmlPart) {
      return alert("请填写完整的模版信息");
    }
    // 验证模版名称格式
    if (!/^[a-zA-Z0-9_-]+$/.test(newTpl.TemplateName)) {
      return alert("模版名称只能包含英文字母、数字、下划线(_)和连字符(-)，不能使用中文");
    }
    try {
      const res = await fetch(`${API_BASE}/templates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTpl)
      });
      if (res.ok) {
        alert("模版保存成功");
        setShowAdd(false);
        setNewTpl({ TemplateName: "", SubjectPart: "", HtmlPart: "" });
        fetchTemplates();
      } else {
        const error = await res.json();
        alert("保存失败: " + (error.detail || "未知错误"));
      }
    } catch (e) {
      console.error(e);
      alert("网络错误，请检查后端服务是否运行");
    }
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-medium text-gray-800">邮件模版管理</h2>
        <button onClick={() => setShowAdd(!showAdd)} className="text-blue-600 text-sm hover:underline">
          {showAdd ? "取消" : "+ 新建模版"}
        </button>
      </div>

      {showAdd && (
        <div className="mb-8 p-4 border rounded-lg bg-gray-50 space-y-4">
          <input
            placeholder="模版名称 (仅限英文、数字、下划线、连字符)"
            className="w-full border p-2 rounded text-gray-800"
            value={newTpl.TemplateName}
            onChange={e => setNewTpl({...newTpl, TemplateName: e.target.value})}
          />
          <input
            placeholder="邮件主题"
            className="w-full border p-2 rounded text-gray-800"
            value={newTpl.SubjectPart}
            onChange={e => setNewTpl({...newTpl, SubjectPart: e.target.value})}
          />
          <textarea
            placeholder="HTML 内容 (支持 {{name}} 变量)"
            className="w-full border p-2 rounded h-32 text-gray-800"
            value={newTpl.HtmlPart}
            onChange={e => setNewTpl({...newTpl, HtmlPart: e.target.value})}
          />
          <button onClick={createTemplate} className="bg-blue-600 text-white px-4 py-2 rounded">保存模版</button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map(tpl => (
          <div key={tpl.Name} className="border p-4 rounded-lg hover:shadow-md transition-shadow">
            <h3 className="font-bold text-gray-900">{tpl.Name}</h3>
            <p className="text-xs text-gray-500 mt-1">创建时间: {new Date(tpl.CreatedTimestamp).toLocaleString()}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function GroupsManager() {
  const [groups, setGroups] = useState([]);
  const [newGroupName, setNewGroupName] = useState("");
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [newContact, setNewContact] = useState({ email: "", name: "" });

  const fetchGroups = async () => {
    const res = await fetch(`${API_BASE}/groups`);
    setGroups(await res.json());
  };

  useEffect(() => { fetchGroups(); }, []);

  const createGroup = async () => {
    await fetch(`${API_BASE}/groups`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newGroupName })
    });
    setNewGroupName("");
    fetchGroups();
  };

  const fetchContacts = async (groupId) => {
    const res = await fetch(`${API_BASE}/groups/${groupId}/contacts`);
    setContacts(await res.json());
    setSelectedGroup(groupId);
  };

  const addContact = async () => {
    await fetch(`${API_BASE}/contacts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...newContact, group_id: selectedGroup })
    });
    setNewContact({ email: "", name: "" });
    fetchContacts(selectedGroup);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="bg-white shadow rounded-lg p-6 md:col-span-1">
        <h2 className="text-lg font-medium mb-4 text-gray-800">客群列表</h2>
        <div className="flex mb-4">
          <input
            value={newGroupName}
            onChange={e => setNewGroupName(e.target.value)}
            placeholder="新客群名称"
            className="flex-1 border rounded-l px-2 py-1 text-sm text-gray-800"
          />
          <button onClick={createGroup} className="bg-blue-600 text-white px-3 py-1 rounded-r text-sm">创建</button>
        </div>
        <ul className="space-y-2">
          {groups.map(g => (
            <li
              key={g.id}
              onClick={() => fetchContacts(g.id)}
              className={`p-2 rounded cursor-pointer transition-colors ${selectedGroup === g.id ? 'bg-blue-50 text-blue-700 font-medium' : 'hover:bg-gray-50 text-gray-700'}`}
            >
              {g.name}
            </li>
          ))}
        </ul>
      </div>

      <div className="bg-white shadow rounded-lg p-6 md:col-span-2">
        <h2 className="text-lg font-medium mb-4 text-gray-800">
          {selectedGroup ? `联系人管理` : "请选择一个客群"}
        </h2>
        {selectedGroup && (
          <>
            <div className="flex gap-2 mb-6">
              <input
                placeholder="邮箱"
                className="flex-1 border rounded px-3 py-1 text-sm text-gray-800"
                value={newContact.email}
                onChange={e => setNewContact({...newContact, email: e.target.value})}
              />
              <input
                placeholder="姓名"
                className="flex-1 border rounded px-3 py-1 text-sm text-gray-800"
                value={newContact.name}
                onChange={e => setNewContact({...newContact, name: e.target.value})}
              />
              <button onClick={addContact} className="bg-green-600 text-white px-4 py-1 rounded text-sm">添加</button>
            </div>
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">姓名</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">邮箱</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {contacts.map(c => (
                  <tr key={c.id}>
                    <td className="px-4 py-2 text-sm text-gray-900">{c.name}</td>
                    <td className="px-4 py-2 text-sm text-gray-600">{c.email}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  );
}

function BulkSender() {
  const [identities, setIdentities] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [groups, setGroups] = useState([]);
  const [form, setForm] = useState({ source: "", template: "", groupId: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      const [i, t, g] = await Promise.all([
        fetch(`${API_BASE}/identities`).then(r => r.json()),
        fetch(`${API_BASE}/templates`).then(r => r.json()),
        fetch(`${API_BASE}/groups`).then(r => r.json())
      ]);
      setIdentities(Array.isArray(i) ? i.filter(x => x.verification_status === 'Success') : []);
      setTemplates(Array.isArray(t) ? t : []);
      setGroups(Array.isArray(g) ? g : []);
    };
    loadData();
  }, []);

  const handleSend = async () => {
    if (!form.source || !form.template || !form.groupId) return alert("请填写完整信息");
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/send-bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          Source: form.source,
          Template: form.template,
          GroupId: parseInt(form.groupId)
        })
      });
      const result = await res.json();
      alert(`发送成功！共发送 ${result.batches} 个批次`);
    } catch (e) {
      alert("发送失败: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white shadow rounded-lg p-6 max-w-2xl mx-auto">
      <h2 className="text-lg font-medium mb-6 text-gray-800">批量发送邮件任务</h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">发送者 (已验证实体)</label>
          <select
            className="w-full border rounded p-2 text-gray-800"
            value={form.source}
            onChange={e => setForm({...form, source: e.target.value})}
          >
            <option value="">选择发送邮箱/域名</option>
            {identities.map(id => <option key={id.identity} value={id.identity}>{id.identity}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">邮件模版</label>
          <select
            className="w-full border rounded p-2 text-gray-800"
            value={form.template}
            onChange={e => setForm({...form, template: e.target.value})}
          >
            <option value="">选择邮件模版</option>
            {templates.map(t => <option key={t.Name} value={t.Name}>{t.Name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">目标客群</label>
          <select
            className="w-full border rounded p-2 text-gray-800"
            value={form.groupId}
            onChange={e => setForm({...form, groupId: e.target.value})}
          >
            <option value="">选择目标客群</option>
            {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </div>
        <button
          onClick={handleSend}
          disabled={loading}
          className={`w-full py-3 rounded text-white font-bold transition-colors ${loading ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'}`}
        >
          {loading ? "发送中..." : "立即开始批量发送"}
        </button>
      </div>
    </div>
  );
}
