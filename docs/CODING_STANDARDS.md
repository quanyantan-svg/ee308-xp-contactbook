# 编码与协作规范

## 1. 适用范围与技术基线

本规范适用于 EE308 通讯录仓库的 Vue 组件、TypeScript、样式、测试、文档和 Git 协作。

当前技术基线以仓库配置为准：Vue 3、TypeScript、Vite、pnpm、Vitest、Vue Test Utils、jsdom、ExcelJS。未经双方讨论，不引入后端、状态管理框架、其他 UI 框架或功能重复的依赖。

## 2. TypeScript 规范

- 新增源代码使用 TypeScript；不使用无说明的 `any`，优先使用明确类型、泛型或 `unknown` 后缩小。
- 共享领域类型放在 `src/types/`，通过 `import type` 导入纯类型。
- `Contact`、`ContactMethod` 及序列化枚举值以 `src/types/contact.ts` 为稳定契约。影响持久化、Excel 或模块边界的修改必须双方评审并同步更新文档和测试。
- 保持当前严格编译约束，消除未使用的局部变量和参数，不用关闭 TypeScript 检查掩盖问题。
- 函数尽量单一职责；对外导出的函数和不直观的业务规则补充简短注释，避免复述代码的注释。
- 优先不可变数据更新。不得直接修改 props，也不得让工具函数意外改变调用方传入的数据。
- 时间使用 ISO 8601 字符串；不要把本地化显示文本作为持久化值。
- 标识符是字符串且在相应数据集合内唯一；不可用数组下标充当持久化标识符。

## 3. Vue 规范

- 单文件组件使用 Vue 3 Composition API 与 `<script setup lang="ts">`。
- Props 和 emits 必须具有 TypeScript 类型；双向绑定使用 Vue 约定的 `modelValue` / `update:modelValue`。
- Props 只读。需要编辑时创建本地草稿，或通过新的对象/数组向父组件发出更新。
- 计算派生状态优先使用 `computed`，副作用才使用 `watch`；避免保存可由其他状态推导出的重复状态。
- 组件保持边界清晰：展示/编辑组件不直接承担持久化或 Excel 读写，除非其模块职责明确要求。
- 列表渲染使用稳定业务 `id` 作为 `key`，不使用数组下标。
- 表单控件具有关联的 `label`、清晰校验反馈和键盘可见焦点；交互不能只依赖颜色或鼠标悬停。
- 组件样式默认使用 `scoped`；全局设计变量、重置和页面级通用规则集中在全局样式文件。

## 4. 文件与命名

| 内容 | 约定 | 示例 |
| --- | --- | --- |
| Vue 组件 | PascalCase | `ContactMethodsEditor.vue` |
| TypeScript 工具/模块 | camelCase | `contactValidation.ts` |
| 类型/接口 | PascalCase | `ContactMethod` |
| 变量/函数 | camelCase | `validateContactMethod` |
| 常量 | 语义化 camelCase；真正的全局常量可用 UPPER_SNAKE_CASE | `allowedMethodTypes` |
| 测试 | 与被测模块对应的 `.test.ts` | `contactValidation.test.ts` |
| Markdown 文档 | 仓库级文档使用 UPPER_SNAKE_CASE | `CODING_STANDARDS.md` |

- 目录按职责组织：`components/`、`types/`、`utils/`；后续如需持久化或 Excel 模块，应建立语义明确的目录/文件，而非堆入组件。
- 避免含义模糊的 `utils.ts`、`helpers.ts` 或超大组件；文件名应能说明领域职责。
- 导入顺序保持一致：第三方依赖、项目模块、样式；纯类型使用 `import type`。

## 5. 格式与代码质量

- 遵循现有代码风格：两个空格缩进、单引号、行尾不强制分号、尾随逗号用于多行结构。
- 不提交调试日志、注释掉的大段代码、构建产物或编辑器临时文件。
- 当前仓库尚未配置 ESLint/Prettier 脚本；在团队明确选择并配置前，不声称 lint 已通过，也不因个人编辑器设置造成全仓库无关格式变更。
- 每次提交聚焦单一目的，避免把重构、格式化与功能修改混在一起。

## 6. 测试要求

- 单元测试使用 Vitest；Vue 组件测试使用 Vue Test Utils，需 DOM 时使用 jsdom。
- 测试文件命名为 `*.test.ts`，放在约定的 `tests/` 目录或与模块一致的测试目录；同一项目内保持统一。
- 核心业务规则至少覆盖成功路径、失败路径、边界值和输入不变性。
- 测试应确定、隔离且可重复，不依赖网络、真实时间、随机顺序或浏览器残留存储；需要时使用固定数据、mock 和测试前后清理。
- 修复缺陷时先添加能复现问题的测试，再完成修复。
- 当前 `package.json` 未定义 `test` 脚本，在脚本补充前可用 `pnpm exec vitest run` 执行；正式功能合并前应提供统一的 `pnpm test` 脚本。
- 合并前至少运行：

```sh
pnpm exec vue-tsc -b
pnpm exec vitest run
pnpm build
```

`pnpm build` 已包含 TypeScript 构建检查，但单独执行类型检查有助于快速定位问题。若某命令因当前阶段尚无测试或配置缺失而不能运行，PR 必须如实说明，不得写成通过。

## 7. Git 分支规范

- `main` 保持可构建，仅通过已审查的 PR 合入功能；A0 共享契约应先进入 `main`，再开始依赖它的并行工作。
- 开始任务前从最新 `main` 创建短生命周期分支，不在双方长期共享的同一功能分支上直接开发。
- 分支命名：`feature/<简短主题>`、`fix/<简短主题>`、`docs/<简短主题>`、`test/<简短主题>`。
- 示例：`docs/phase-a0-contracts`、`feature/contact-methods-editor`。
- 每日开始工作和提交 PR 前同步 `main`，尽早解决冲突；不得使用强制推送覆盖队友工作。
- 遵循模块所有权。需要改动队友负责的文件时，先沟通并在 PR 中说明。

## 8. Conventional Commits

提交消息格式：

```text
<type>(<scope>): <imperative summary>
```

常用 `type`：

- `feat`：新增用户可见功能；
- `fix`：修复缺陷；
- `docs`：仅文档；
- `test`：新增或调整测试；
- `refactor`：不改变行为的重构；
- `chore`：工具、依赖或维护；
- `style`：不影响逻辑的格式修改。

示例：

```text
docs(contract): define contact method ownership
feat(contacts): add favorite filtering
test(validation): cover invalid email methods
```

主题行简洁、使用祈使语气且描述结果。破坏共享契约的修改必须在正文说明迁移影响，并使用 `BREAKING CHANGE:` 标记；此类修改必须双方先行评审。

## 9. Pull Request 流程

1. 从最新 `main` 创建职责明确的分支。
2. 小步实现并以可理解的 Conventional Commits 提交。
3. 自审 diff，确认没有密钥、构建产物、临时文件或越出模块所有权的改动。
4. 运行适用的类型检查、测试和构建，记录实际命令与结果。
5. 创建 PR，说明目的、范围、主要设计选择、测试证据、截图（若有 UI 变化）、已知限制及共享契约影响。
6. 由另一位成员审查。未解决的阻塞性意见不得合并；作者负责回应并补充验证。
7. 检查通过且获得批准后合并；合并后删除功能分支，并让后续分支同步最新 `main`。

禁止把“计划运行”“本地未执行”描述为“已通过”。课程结对过程中的实际协作记录应由参与者按事实填写，不在代码或文档中虚构。

## 10. 完成定义

一次变更可合并的最低条件是：

- 实现范围符合需求和模块契约，没有混入未授权的下一阶段功能；
- 新增或改变的行为有相称的自动化测试；
- 类型检查、相关测试和生产构建实际通过；
- 文档与代码一致，共享契约变更已获双方评审；
- PR 已由队友审查，反馈已处理，提交历史能够说明变更目的。
