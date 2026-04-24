"use client";
import React, { useState } from "react";
import { Sidebar } from "../../components/shared";
import UserDashboard from "./UserDashboard";
import UserGroups from "./UserGroups";
import UserSend from "./UserSend";
import UserSchedule from "./UserSchedule";
import SendingHistory from "./SendingHistory";
import TemplateManager from "../shared/TemplateManager";
import EmailDetails from "../shared/EmailDetails";
import UnsubscribeManager from "../shared/UnsubscribeManager";

export default function UserApp() {
  const [tab,setTab]=useState("dashboard");
  const titles: Record<string,string> = {dashboard:"数据概览",groups:"客群管理",templates:"邮件模版",send:"批量发送",schedule:"定时发送",history:"发送历史",details:"邮件明细",unsub:"退订管理"};
  return <div className="min-h-screen flex">
    <Sidebar menus={[{id:"dashboard",icon:"📈",label:"数据概览"},{id:"groups",icon:"📁",label:"客群管理"},{id:"templates",icon:"📋",label:"邮件模版"},{id:"send",icon:"🚀",label:"批量发送"},{id:"schedule",icon:"⏰",label:"定时发送"},{id:"history",icon:"📊",label:"发送历史"},{id:"details",icon:"📧",label:"邮件明细"},{id:"unsub",icon:"🚫",label:"退订管理"}]} active={tab} setActive={setTab}/>
    <div className="flex-1 flex flex-col min-w-0">
      <header className="h-16 flex items-center px-6 bg-white border-b border-gray-100 shadow-sm flex-shrink-0"><h2 className="text-lg font-semibold text-gray-800">{titles[tab]}</h2></header>
      <main className="flex-1 p-6 overflow-auto">
        {tab==="dashboard"&&<UserDashboard/>}
        {tab==="groups"&&<UserGroups/>}
        {tab==="templates"&&<TemplateManager apiPrefix="/user/templates"/>}
        {tab==="send"&&<UserSend/>}
        {tab==="schedule"&&<UserSchedule/>}
        {tab==="history"&&<SendingHistory/>}
        {tab==="details"&&<EmailDetails/>}
        {tab==="unsub"&&<UnsubscribeManager/>}
      </main>
    </div>
  </div>;
}
