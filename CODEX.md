# CODEX.md — 项目级指令

## 文件编码

本项目所有源文件使用 UTF-8 编码（含中文）。读取文件时务必使用 UTF-8 编码：

```powershell
# 每次读文件前设置默认编码
$PSDefaultParameterValues['Get-Content:Encoding'] = 'utf8'
```

否则中文会显示为乱码。

## 项目概述

- 项目名：轻淘 (QingTao)
- 定位：郑州轻工业大学校园二手交易 + 社区平台
- 前端：`qing-tao-campus/` (React 19 + Vite 8 + Tailwind CSS 4)
- 后端：`qingtao-server/` (Express 4 + Prisma 5 + SQLite)
- 详细文档：见根目录 `PROJECT.md`

## 约定

- 前端端口：5175
- 后端端口：3000
- 包管理：npm
- 数据库：SQLite (WAL mode)，文件位于 `qingtao-server/prisma/dev.db`
