# PairBook

PairBook 是 EE308 Extreme Programming 双人课程项目，一个使用 Vue 3、TypeScript 和 Vite 构建的轻量级本地通讯录。

## 当前状态

Phase A 核心应用与 Phase B Excel 数据交换已实现：

- 新增、编辑和删除联系人；
- 按姓名、公司及已有联系方式搜索；
- 收藏、取消收藏和收藏筛选；
- 使用浏览器 `localStorage` 持久化数据；
- 表单校验、删除确认、操作成功/失败反馈；
- 空通讯录、无搜索结果和损坏存储数据的安全降级状态；
- 适配手机与桌面端的响应式界面；
- 核心业务、持久化和基础表单测试；
- Excel `.xlsx` 动态列导出、标准模板下载；
- Excel 导入校验、错误定位、ID 冲突预览和原子批量应用；
- 导出后再导入的完整数据往返测试。

尚未完成：

- 队友负责的多联系方式编辑器及其校验模块；
- 联系方式编辑器合并后的最终集成测试。

当前表单会完整保留联系人已有的 `ContactMethod[]`，但在队友模块合并前不提供联系方式新增或编辑入口。项目没有账号、后端、MySQL 或多用户同步功能。

## 技术栈

- Vue 3 + Composition API
- TypeScript
- Vite
- Vitest + Vue Test Utils + jsdom
- lucide-vue-next
- ExcelJS

## 本地运行

需要 Node.js 和 pnpm。

```sh
pnpm install
pnpm dev
```

Vite 会输出本地开发地址。联系人数据仅保存在当前浏览器的 `localStorage` 中，不会上传到服务器。

Excel 的实际操作步骤、固定列和冲突策略见 `docs/EXCEL_USER_GUIDE.md`。

## 检查与测试

```sh
pnpm exec vue-tsc -b
pnpm test
pnpm build
```

- `pnpm test` 以单次运行模式执行 Vitest。
- `pnpm build` 先运行 TypeScript 构建检查，再生成生产构建到被 Git 忽略的 `dist/`。

## 项目结构

```text
src/
├─ components/     # 页面组件、联系人卡片与表单
├─ composables/    # Vue 状态编排
├─ services/       # 核心联系人规则与 localStorage 仓储
└─ types/          # 冻结的共享数据契约
tests/             # Phase A 核心自动化测试
docs/              # 需求、模块契约与协作规范
```

## 协作约束

正式需求与协作边界见：

- `docs/REQUIREMENTS.md`
- `docs/CONTACT_METHODS_CONTRACT.md`
- `docs/CODING_STANDARDS.md`

`src/components/ContactMethodsEditor.vue`、`src/utils/contactValidation.ts` 和 `tests/contactValidation.test.ts` 由队友独立负责，Phase A 核心实现不创建或修改这些文件。
