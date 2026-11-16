# Phase C 集成测试报告

- 日期：2026-11-17
- 分支：`feature/core-and-excel`
- 开始时 HEAD：`5a19b82006203ab6398ddbd72cdeef7f12142a68`

## 1. 合并基线

- `origin/main`：`71ddc0903dbd143ad97390c9fd9a12a10a3060fa`
- `git merge-base HEAD origin/main` 返回 `71ddc0903dbd143ad97390c9fd9a12a10a3060fa`。
- `git merge-base --is-ancestor origin/main HEAD` 退出码为 0。
- PR #1 带来的 `ContactMethodsEditor.vue`、`contactValidation.ts` 及两组队友测试均存在于当前 HEAD。
- Phase C 没有修改上述队友所有的文件，也没有修改 `src/types/contact.ts` 或 Excel 列契约。

## 2. 集成范围

- `ContactForm.vue` 通过 `v-model="draft.methods"` 集成 `ContactMethodsEditor`。
- 联系人草稿在打开表单时深拷贝已有联系方式，取消整体表单不会修改原联系人或 localStorage。
- 基本字段 form 与编辑器内部的新增/编辑 form 是兄弟节点，不存在嵌套 form。
- 主保存按钮通过 `form="contact-core-form"` 关联基本字段 form；编辑器内部 Enter/提交不会触发联系人整体保存。
- 未确认的联系方式新增或编辑草稿会阻止联系人整体保存，并显示明确提示；只有编辑器已 emit 的有效 `ContactMethod[]` 才会进入联系人草稿。
- 表单容器为队友组件提供旧变量到 PairBook 主题变量的完整兼容映射，并使用可滚动内容区与固定操作区处理长列表。

## 3. 自动化覆盖

新增集成测试验证：

1. 新建联系人时添加两个 phone 和一个 email；
2. 子编辑器新增、编辑、删除不会触发联系人整体提交；
3. 联系人保存时提交全部已确认联系方式；
4. 重新打开联系人时完整回填；
5. 编辑后保持联系方式 id 和数组顺序；
6. 删除目标联系方式后保留其余记录；
7. 非法邮箱和电话不能进入有效列表；
8. 未确认的新增或编辑草稿阻止整体保存；
9. 取消整体编辑不改变 localStorage；
10. 保存后卸载并重新挂载应用可恢复全部联系方式；
11. 联系方式经 Excel 导出后重新导入保持完整；
12. DOM 中不存在嵌套 form。

原有测试继续覆盖联系人 CRUD、搜索、收藏、持久化、Excel 校验/冲突/往返，以及队友组件和校验工具的单元行为。

## 4. 实际执行结果

```text
pnpm install --frozen-lockfile
Already up to date
Done in 432ms using pnpm v11.24.0

pnpm exec vue-tsc -b
退出码 0

pnpm test
Test Files  7 passed (7)
Tests       69 passed (69)
退出码 0

pnpm build
构建成功，退出码 0
```

生产构建保留一个非阻塞警告：按需加载的 ExcelJS chunk 约 929.37 kB，超过 Vite 默认 500 kB 提示阈值。ExcelJS 不在首屏主包中；主包约 118.12 kB。

## 5. 待人工验收

当前环境没有可用的交互式浏览器控制器，以下项目未报告为已通过：

- 320 px、375 px、768 px 和桌面视口的实际视觉与滚动体验；
- 长联系方式列表下模态窗口、固定操作区和软键盘遮挡情况；
- 真实浏览器中的 Tab/Shift+Tab、Enter、Escape 与 focus-visible 路径；
- 鼠标和触摸下新增、编辑、删除、整体保存与取消的主观可用性；
- 真实文件选择器和下载行为。

这些是人工 UI 验收项；自动化测试、类型检查和生产构建目前没有已知阻塞失败。
