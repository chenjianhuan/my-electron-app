# MessageCounter 消息定义 V1.1

## 1. 文档目标
本文件用于统一消息解析与规则配置口径，先定义数据模型和行为，再进入实现。

当前阶段约束：
1. 本文档是设计基线，不代表代码已全部实现。
2. 所有字段定义、优先级、交互流程以本文为准。

## 2. 核心结论（已确认）
1. 规则层级：`网友专属 > 全局 > 系统默认`。
2. 新网友默认继承全局规则。
3. 网友专属规则支持一键恢复全局。
4. 歧义策略默认是弹窗确认。
5. 默认地区是新奥，标准化输出必须显式带地区前缀（包括默认地区）。
6. 锚点语义与分配策略支持增删改查（CRUD）。
7. 属性词叠加策略可配置（交集/并集/兜底/确认）。

## 3. 消息拆解模型
原始消息在解析后拆为多个 `BetEntry`。一段消息可能对应多个 `BetEntry`。

### 3.1 BetEntry
```json
{
  "region": "new_ao | old_ao | hongkong",
  "numbers": [9, 21, 33, 45],
  "amount": 10,
  "targetResolve": "number | animal | attribute | mixed",
  "amountDistribute": "per_number | per_target_equal_split | per_entry_equal_split",
  "attributeCombinePolicy": "intersection | union | intersection_then_union_fallback | confirm",
  "ruleSource": "system | global | client | confirmed_once",
  "rawSegment": "原始片段文本"
}
```

字段说明：
1. `region`：最终地区，必填，值域为 `new_ao/old_ao/hongkong`。
2. `numbers`：最终入账号码集合，范围 `1-49`。
3. `amount`：本段金额（正数）。
4. `targetResolve`：目标来源类型（纯数字/生肖/属性词/混合）。
5. `amountDistribute`：本段金额分配策略。
6. `attributeCombinePolicy`：本段实际使用的属性叠加策略。
7. `ruleSource`：命中的规则层来源。
8. `rawSegment`：原始片段，便于审计和回放。

## 4. 地区规则
1. 地区作用域为“从当前地区标记到下一个地区标记”。
2. 地区词在像地区的位置生效（通常写在片段开头）。
3. 未写地区时默认 `new_ao`。
4. 标准化输出必须显式带地区：
   - `新奥09.21.33各10`
   - `老奥09.21各20`
   - `香港11.22各5`

## 5. 分配策略定义（amountDistribute）
1. `per_number`
   - 含义：每个命中号码都下 `amount`。
   - 示例：`09.21各10` => 09 和 21 各 10。
2. `per_target_equal_split`
   - 含义：每个目标组下 `amount`，组内平码。
   - 示例：`每肖10` => 每个命中的生肖组金额 10，分到该肖所有号码。
3. `per_entry_equal_split`
   - 含义：整段总额均分到本段所有命中号码。
   - 说明：预留扩展策略。

## 6. 属性词叠加策略（attributeCombinePolicy）
1. `intersection`：交集。
2. `union`：并集。
3. `intersection_then_union_fallback`：先交集，若空则并集。
4. `confirm`：弹窗让用户选择。

## 7. 三层规则结构

### 7.1 RuleContainer
```json
{
  "systemRules": { "...RuleProfile..." },
  "globalRules": { "...RuleProfile..." },
  "clientRules": {
    "client_张三": { "...RuleProfile..." }
  }
}
```

字段说明：
1. `systemRules`：系统内置规则（开箱即用）。
2. `globalRules`：全局规则（对所有网友生效）。
3. `clientRules`：网友专属规则（仅该网友生效）。

### 7.2 RuleProfile
```json
{
  "version": "v1.1",
  "anchorSemantics": {
    "各": { "amountDistribute": "per_number", "enabled": true },
    "每肖": { "amountDistribute": "per_target_equal_split", "enabled": true }
  },
  "attributeCombinePolicy": "intersection_then_union_fallback",
  "symbolPolicy": {
    "#": "noise",
    "井": "noise",
    "*": "noise"
  },
  "ambiguityPolicy": "confirm",
  "regionPolicy": {
    "defaultRegion": "new_ao",
    "canonicalAlwaysShowRegion": true
  }
}
```

字段说明：
1. `version`：规则版本号，便于升级迁移。
2. `anchorSemantics`：锚点词语义映射表。
3. `attributeCombinePolicy`：属性词叠加策略。
4. `symbolPolicy`：符号处理策略。
5. `ambiguityPolicy`：歧义处理策略。
6. `regionPolicy`：地区默认与标准化输出策略。

### 7.3 anchorSemantics 结构
```json
{
  "每个数": {
    "amountDistribute": "per_number",
    "enabled": true,
    "notes": "客户A习惯"
  }
}
```

字段说明：
1. `amountDistribute`：锚点命中时采用的分配策略。
2. `enabled`：是否启用；`false` 等价忽略该词。
3. `notes`：备注，不参与计算。

### 7.4 symbolPolicy 值域
1. `noise`：噪音，忽略。
2. `unit`：单位符号，参与金额识别。
3. `marker`：仅保留标记，不参与计算。
4. `error`：视为错误，触发确认或拦截。

### 7.5 ambiguityPolicy 值域
1. `confirm`：弹窗确认。
2. `auto`：按当前命中规则自动处理。
3. `error`：直接报错，不入账。

## 8. 规则合并与生效
同名字段的生效顺序固定为：
1. 先读取 `systemRules`。
2. 再叠加 `globalRules`。
3. 最后叠加 `clientRules[clientId]`。

最终优先级：`client > global > system`。

## 9. 歧义弹窗模型

### 9.1 DisambiguationPrompt（弹窗输入）
```json
{
  "promptId": "dp_20260225_xxx",
  "clientId": "client_张三",
  "lineNo": 3,
  "segmentNo": 2,
  "rawSegment": "猪狗鸡虎每个数20",
  "questionType": "anchor_semantics | attribute_combine | symbol_policy | unknown_token",
  "context": {
    "region": "new_ao",
    "tokens": ["每个数"],
    "symbols": ["#"],
    "resolvedNumbersPreview": [8, 20, 32, 44]
  },
  "candidates": [
    {
      "candidateId": "c1",
      "label": "按号码",
      "patch": {
        "anchorSemantics": { "每个数": { "amountDistribute": "per_number", "enabled": true } }
      },
      "preview": "每个号码都下20"
    }
  ]
}
```

### 9.2 DisambiguationDecision（用户决策）
```json
{
  "promptId": "dp_20260225_xxx",
  "candidateId": "c1",
  "applyScope": "once | client | global",
  "remember": true,
  "operator": "current_user",
  "decidedAt": "2026-02-25T14:23:00+08:00"
}
```

字段说明：
1. `applyScope=once`：仅本次解析生效，不落盘。
2. `applyScope=client`：写入网友规则。
3. `applyScope=global`：写入全局规则。

### 9.3 RulePatch（规则补丁）
```json
{
  "scope": "client",
  "clientId": "client_张三",
  "patch": {
    "anchorSemantics": {
      "每个数": { "amountDistribute": "per_target_equal_split", "enabled": true }
    }
  }
}
```

### 9.4 DisambiguationAuditLog（审计记录）
```json
{
  "logId": "dl_20260225_xxx",
  "promptId": "dp_20260225_xxx",
  "clientId": "client_张三",
  "rawSegment": "猪狗鸡虎每个数20",
  "decision": { "candidateId": "c1", "applyScope": "client" },
  "ruleSourceAfterApply": "client",
  "beforePreview": "解释A",
  "afterPreview": "解释B",
  "createdAt": "2026-02-25T14:23:01+08:00"
}
```

## 10. 锚点与分配策略 CRUD 要求
锚点规则必须支持完整 CRUD：
1. 新增：新增锚点词并绑定分配策略。
2. 查询：可按层查看，显示最终生效值和来源。
3. 修改：调整分配策略、启用状态、备注。
4. 删除：
   - 删除自定义锚点：物理删除该层配置。
   - 删除系统锚点：通过该层覆盖为 `enabled=false`（逻辑禁用）。

扩展动作：
1. 单词恢复默认。
2. 网友规则一键恢复全局。
3. 全局规则复制到网友。
4. 网友规则回推全局（需确认）。

## 11. 默认建议值（系统级）
```json
{
  "attributeCombinePolicy": "intersection_then_union_fallback",
  "ambiguityPolicy": "confirm",
  "regionPolicy": {
    "defaultRegion": "new_ao",
    "canonicalAlwaysShowRegion": true
  },
  "symbolPolicy": {
    "#": "noise",
    "井": "noise",
    "*": "noise"
  }
}
```

## 12. 验收口径（文档阶段）
1. 任一解析结果都可说明 `ruleSource`。
2. 默认地区在标准化输出中显式出现“新奥”。
3. 歧义场景可触发弹窗并选择作用域（本次/网友/全局）。
4. 锚点规则可完成增删改查且可回滚到全局/默认。

