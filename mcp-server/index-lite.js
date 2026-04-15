#!/usr/bin/env node

/**
 * SES Sender MCP Server — 精简版（单工具路由模式）
 * 
 * 只注册 1 个 MCP tool，通过 action 参数路由到不同 API，
 * 避免 15 个工具定义膨胀上下文窗口。
 * 
 * AI 通过 Skill 文档了解可用操作，通过这个单一工具执行。
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const BASE_URL = process.env.SES_SENDER_URL || "http://localhost:3000/api";
let AUTH_TOKEN = "";

async function api(method, path, body) {
  const headers = { "Content-Type": "application/json" };
  if (AUTH_TOKEN) headers["Authorization"] = `Bearer ${AUTH_TOKEN}`;
  const opts = { method, headers };
  if (body && method !== "GET") opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE_URL}${path}`, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`);
  return data;
}

const ACTIONS = {
  login:              { method: "POST", path: "/auth/login",          desc: "登录" },
  dashboard:          { method: "GET",  path: "/user/dashboard",      desc: "数据概览" },
  quota:              { method: "GET",  path: "/user/daily-quota",    desc: "今日配额" },
  groups:             { method: "GET",  path: "/groups",              desc: "客群列表" },
  contacts:           { method: "GET",  path: "/groups/{group_id}/contacts", desc: "联系人" },
  templates:          { method: "GET",  path: "/user/templates",      desc: "模版列表" },
  send:               { method: "POST", path: "/send-bulk",           desc: "发送邮件" },
  progress:           { method: "GET",  path: "/sending-jobs/{batch_id}/progress", desc: "发送进度" },
  history:            { method: "GET",  path: "/sending-jobs",        desc: "发送历史" },
  metrics:            { method: "GET",  path: "/sending-jobs/{batch_id}/metrics", desc: "批次指标" },
  email_details:      { method: "GET",  path: "/email-details",       desc: "邮件明细" },
  scheduled_list:     { method: "GET",  path: "/scheduled-jobs",      desc: "定时任务列表" },
  scheduled_create:   { method: "POST", path: "/scheduled-jobs",      desc: "创建定时任务" },
  scheduled_toggle:   { method: "PUT",  path: "/scheduled-jobs/{job_id}", desc: "暂停/恢复任务" },
  scheduled_delete:   { method: "DELETE",path:"/scheduled-jobs/{job_id}", desc: "删除任务" },
  unsubscribes:       { method: "GET",  path: "/unsubscribe-list",    desc: "退订列表" },
};

const server = new McpServer({ name: "ses-sender", version: "2.0.0" });

server.tool(
  "ses",
  `操作 SES 邮件发送平台。action 可选值: ${Object.keys(ACTIONS).join(", ")}。params 为 JSON 对象，包含该操作需要的参数。详见项目 Skill 文档。`,
  {
    action: z.string().describe("操作名称"),
    params: z.string().optional().describe("操作参数（JSON 字符串）"),
  },
  async ({ action, params: paramsStr }) => {
    let params = {};
    if (paramsStr) {
      try { params = JSON.parse(paramsStr); } catch { params = {}; }
    }
    const act = ACTIONS[action];
    if (!act) {
      return { content: [{ type: "text", text: `未知操作: ${action}\n可用操作: ${Object.entries(ACTIONS).map(([k,v]) => `${k}(${v.desc})`).join(", ")}` }] };
    }

    let path = act.path;
    for (const [key, val] of Object.entries(params)) {
      if (path.includes(`{${key}}`)) {
        path = path.replace(`{${key}}`, encodeURIComponent(String(val)));
        delete params[key];
      }
    }

    if (act.method === "GET" && Object.keys(params).length > 0) {
      const qs = new URLSearchParams();
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== null && v !== "") qs.set(k, String(v));
      }
      path += `?${qs}`;
    }

    const body = act.method !== "GET" ? params : undefined;

    if (action === "login") {
      const data = await api("POST", path, body);
      AUTH_TOKEN = data.access_token;
      return { content: [{ type: "text", text: `登录成功！${data.user.display_name}（${data.user.is_admin ? "管理员" : "用户"}）发送邮箱: ${data.user.email || "未配置"} 每日限额: ${data.user.daily_send_limit || 1000}` }] };
    }

    if (action === "send") {
      const data = await api("POST", path, { TemplateId: params.template_id, GroupId: params.group_id });
      return { content: [{ type: "text", text: `发送任务已创建！批次: ${data.batch_id} 联系人: ${data.total_contacts} 状态: ${data.status}` }] };
    }

    const data = await api(act.method, path, body);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
main().catch(console.error);
