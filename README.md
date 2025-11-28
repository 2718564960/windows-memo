# Windows 备忘录

一款 Mac 风格的 Windows 备忘录应用，使用 Electron 构建。

## 应用截图

![应用截图](ScreenShot_2025-11-28_112222_998.png)

## 功能特性

- 📝 创建、编辑、删除备忘录
- 📁 文件夹分类管理
- 🔍 快速搜索
- 💾 自动保存
- 🎨 现代化深色主题界面

## 安装与运行

```bash
# 安装依赖
npm install

# 运行应用
npm start
```

## 打包发布

```bash
# 构建 Windows 安装包
npm run build
```

## 技术栈

- Electron
- HTML5 / CSS3 / JavaScript
- 本地 JSON 文件存储

## 快捷键

- `Ctrl + N` - 新建备忘录（计划中）
- `Esc` - 关闭弹窗

## 数据存储

备忘录数据保存在用户数据目录：
`%APPDATA%/windows-memo/notes.json`

