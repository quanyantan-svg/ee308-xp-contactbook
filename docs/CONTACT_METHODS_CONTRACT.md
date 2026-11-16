# 联系方式编辑模块协作契约

## 1. 目的与所有权

本文件定义第二位成员独立开发的联系方式编辑模块边界，供主应用集成。本文是开发契约，不表示组件、校验工具或测试已经实现。

第二位成员独占负责以下文件：

- `src/components/ContactMethodsEditor.vue`
- `src/utils/contactValidation.ts`
- `tests/contactValidation.test.ts`

第一位成员在该模块分支合并前不修改以上文件；第二位成员也不修改主应用页面、联系人存储、Excel 导入导出或其他非本模块文件。若发现必须调整共享契约，应先提出变更并由双方评审，不在个人分支中单方面修改 `src/types/contact.ts`。

## 2. 共享数据契约

组件和校验工具必须从 `src/types/contact.ts` 使用 `ContactMethod` 与 `ContactMethodType`，不得复制一份结构相似的本地类型。

```ts
export type ContactMethodType =
  | 'phone'
  | 'email'
  | 'social'
  | 'address'
  | 'other'

export interface ContactMethod {
  id: string
  type: ContactMethodType
  label: string
  value: string
}
```

这些序列化值会同时用于表单、持久化和 Excel 往返。需要改变字段或类型枚举时，必须先更新共享契约、需求文档和相关测试并由双方评审。

## 3. 组件接口

实现文件：`src/components/ContactMethodsEditor.vue`，使用 Vue 3、TypeScript 和 `<script setup lang="ts">`。

### Props

| 名称 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `modelValue` | `ContactMethod[]` | 是 | 当前联系人的联系方式列表 |
| `disabled` | `boolean` | 否 | 为 `true` 时禁用新增、编辑和删除；默认 `false` |

### Events

| 事件 | 载荷 | 触发时机 |
| --- | --- | --- |
| `update:modelValue` | `ContactMethod[]` | 任一有效的新增、编辑或删除使列表发生变化时 |

组件必须支持标准 `v-model`。每次更新都应发送新的数组；编辑已有项时还应创建新的条目对象。不得 `push`、`splice` 或直接改写 `props.modelValue` 及其中的对象。

组件不负责保存整个 `Contact`，也不负责写入浏览器存储或读写 Excel。

## 4. 交互行为

1. 支持 `phone`、`email`、`social`、`address`、`other` 五种类型。
2. 同一联系人可添加任意多个同类型或不同类型条目。
3. 用户可动态新增、编辑和删除条目；删除入口必须能明确对应目标条目。
4. 接收到已有 `modelValue` 时完整回填类型、标签和值，并保持数组顺序。
5. 新增条目生成非空且在当前列表中唯一的字符串 `id`；编辑不得更改已有条目的 `id`。
6. `disabled` 为 `true` 时不得发出由用户编辑导致的更新事件。
7. 控件应具有关联标签、清晰的错误信息和可见键盘焦点，窄屏下仍可完成全部操作。

## 5. 校验工具契约

实现文件：`src/utils/contactValidation.ts`。校验函数保持纯函数特性，不修改参数，不依赖 DOM、网络、当前语言环境或浏览器存储。

模块至少导出：

```ts
import type { ContactMethod } from '../types/contact'

export interface ContactMethodValidationErrors {
  type?: string
  label?: string
  value?: string
}

export function validateContactMethod(
  method: ContactMethod,
): ContactMethodValidationErrors

export function isContactMethodValid(method: ContactMethod): boolean
```

校验规则：

- `type` 必须是共享契约允许的五种值之一。
- `label.trim()` 必须非空。
- `value.trim()` 必须非空。
- `email` 类型必须是形如 `local@domain` 的合理邮箱格式；无需尝试完整实现所有 RFC 边界情况。
- `phone` 类型允许常见的数字、空格、`+`、`-`、圆括号等显示字符，但必须包含足够识别号码的数字；具体最小数字数由测试固定并在错误文案中说明。
- `social`、`address` 和 `other` 只要求非空，不强制其为 URL 或特定地址格式。
- 校验时可忽略首尾空白，但不得在校验函数中原地修改输入值。
- 错误对象只包含未通过字段的消息；无错误时返回空对象。

组件可以按字段失焦或提交尝试展示校验，但不得在条目无效时把该无效结果作为有效列表提交给父组件。

## 6. 验收标准

模块只有满足以下条件才可交付集成：

1. 严格使用共享 `ContactMethod` 类型，`vue-tsc` 无类型错误。
2. `v-model` 能正确接收初值并发出 `update:modelValue`。
3. 可添加多个相同/不同类型的联系方式，并可编辑、删除任意一项。
4. 编辑模式完整回填现有条目，保存后保持该条目 `id` 及列表顺序。
5. 所有更新均采用不可变方式；测试证明 props 数组及其条目对象未被直接修改。
6. 空标签、空值、非法邮箱、非法电话号码和未知类型均被拒绝并显示合理错误。
7. 有效的电话、邮箱、社交账号、地址和其他联系方式均可通过。
8. `disabled` 状态下所有编辑操作不可用，且不发出更新。
9. `tests/contactValidation.test.ts` 至少覆盖每条校验规则、有效/无效边界和输入不变性；使用项目已安装的 Vitest。
10. 测试、类型检查与生产构建全部通过，且未修改本节“所有权”之外的实现文件。

## 7. 集成示例

父组件拥有草稿状态并将数组通过 `v-model` 传入：

```vue
<script setup lang="ts">
import { ref } from 'vue'
import ContactMethodsEditor from './components/ContactMethodsEditor.vue'
import type { ContactMethod } from './types/contact'

const methods = ref<ContactMethod[]>([])
</script>

<template>
  <ContactMethodsEditor v-model="methods" />
</template>
```

集成方在保存联系人时将 `methods.value` 组装进 `Contact.methods`。父组件仍负责整张联系人表单的提交、取消、持久化和错误汇总。

## 8. 协作与交付顺序

1. 先将 `src/types/contact.ts` 与本契约文档合并到 `main`。
2. 第二位成员从包含上述契约的最新 `main` 创建功能分支。
3. 第二位成员只实现本模块所有权范围，并提交 PR。
4. 第一位成员根据本契约完成父组件集成；若并行开发，可先使用相同 props/events 的临时边界，但不得占用本模块三个文件。
5. PR 评审重点检查共享类型、不可变更新、校验边界、测试证据和未越界修改。
