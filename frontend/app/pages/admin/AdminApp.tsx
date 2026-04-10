"use client";
import React, { useState } from "react";
import { Sidebar } from "../../components/shared";
import AdminStats from "./AdminStats";
import AdminUsers from "./AdminUsers";
import AdminIdentities from "./AdminIdentities";
import AdminTestEmail from "./AdminTestEmail";
import TemplateManager from "../shared/TemplateManager";
import EmailDetails from "../shared/EmailDetails";
import UnsubscribeList from "../shared/UnsubscribeList";

export default function AdminApp() {
  const [tab,setTab]=useState("stats");
  const titles: Record<string,string> = {stats:"发送统计",users:"用户管理",identities:"发送实体",templates:"邮件模版",test:"测试邮件",details:"邮件明细",unsub:"退订管理"};
  return <div className="min-h-screen flex">
    <Sidebar menus={[{id:"stats",icon:"📊",label:"发送统计"},{id:"users",icon:"👤",label:"用户管理"},{id:"identities",icon:"🔐",label:"发送实体"},{id:"templates",icon:"📋",label:"邮件模版"},{id:"test",icon:"📧",label:"测试邮件"},{id:"details",icon:"📬",label:"邮件明细"},{id:"unsub",icon:"🚫",label:"退订管理"}]} active={tab} setActive={setTab}/>
    <div className="flex-1 flex flex-col min-w-0">
      <header className="h-16 flex items-center px-6 bg-white border-b border-gray-100 shadow-sm flex-shrink-0"><h2 className="text-lg font-semibold text-gray-800">{titles[tab]}</h2></header>
      <main className="flex-1 p-6 overflow-auto">
        {tab==="stats"&&<AdminStats/>}
        {tab==="users"&&<AdminUsers/>}
        {tab==="identities"&&<AdminIdentities/>}
        {tab==="templates"&&<TemplateManager apiPrefix="/admin/templates"/>}
        {tab==="test"&&<AdminTestEmail/>}
        {tab==="details"&&<EmailDetails/>}
        {tab==="unsub"&&<UnsubscribeList/>}
      </main>
    </div>
  </div>;
}
