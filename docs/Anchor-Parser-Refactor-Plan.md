# Anchor Parser Refactor Plan

## 1. 目标

本计划用于把当前“文字锚点 + 正则匹配”的消息解析器，升级为“统一锚点规则系统”。

改造目标：

1. 同时支持文字锚点、纯符号锚点、混合锚点。
2. 保持现有三层规则优先级：`client > global > system`。
3. 保持现有对外接口稳定：`parseMessage()`、`previewMessage()`、`processMessageForUser()` 不改调用方式。
4. 把锚点识别从“单条正则命中”升级为“扫描器 + 组段 + 语义求值”。
5. 让规则编辑器能够配置锚点类型、位置、优先级和启用状态。

非目标：

1. 本阶段不改业务统计口径。
2. 本阶段不重做整套 UI 视觉，只补充必要配置项。
3. 本阶段不引入后端存储迁移脚本，优先做前端兼容读取。

## 2. 当前问题

现状代码的主要问题：

1. 纯符号锚点无法新增。`upsertAnchorRule()` 要求 token 必须包含中文或英文。
2. 锚点识别核心依赖 `buildAmountAnchorRegex()`，对文字锚点有效，但不适合符号锚点、复杂边界和优先级控制。
3. `anchorSemantics` 和 `symbolPolicy` 是两套平行概念，没有统一成一个解析模型。
4. `normalizeSegmentText()`、`isIgnorableResidualSegment()` 会在早期把部分符号清掉，不利于符号锚点。
5. 设计文档中的完整 `BetEntry` 尚未在运行时完全落地，当前解析结果字段偏少。

涉及的当前核心函数：

1. `/Users/wangci/my-electron-app/public/messageProcessor.js`
2. `parseMessage()`
3. `parseEntries()`
4. `buildAmountAnchorRegex()`
5. `buildEntriesFromPendingSegments()`
6. `buildEntriesFromSegment()`
7. `normalizeAnchorAliasToken()`
8. `upsertAnchorRule()`
9. `sanitizeRuleProfile()`
10. `normalizeSegmentText()`

## 3. 目标结构

建议把现有 `anchorSemantics` 扩展为统一锚点规则对象。

### 3.1 统一锚点规则

```json
{
  "token": "#",
  "tokenType": "word | symbol | mixed",
  "matchMode": "exact",
  "position": "before_amount | after_target | standalone",
  "boundary": "strict | soft",
  "amountDistribute": "per_number | per_target_equal_split | per_entry_equal_split | undetermined",
  "enabled": true,
  "priority": 100,
  "odds": 47
}
```

字段说明：

1. `token`: 锚点原文。
2. `tokenType`: `word` 表示文字锚点，`symbol` 表示纯符号锚点，`mixed` 表示混合锚点。
3. `matchMode`: 先固定为 `exact`，后续如有需要再扩展。
4. `position`: 锚点允许出现的位置。
5. `boundary`: `strict` 表示必须满足严格边界，`soft` 表示允许宽松相邻匹配。
6. `amountDistribute`: 现有金额分配模式，兼容当前实现。
7. `enabled`: 是否启用。
8. `priority`: 多个锚点冲突时的优先级，数值越大越先匹配。
9. `odds`: 锚点专属倍率，兼容现有逻辑。

### 3.2 兼容旧结构

旧配置：

```json
{
  "anchorSemantics": {
    "各": { "amountDistribute": "per_number", "enabled": true }
  }
}
```

兼容转换原则：

1. 没有 `tokenType` 时，自动推断：
   - 全中文/英文：`word`
   - 全符号：`symbol`
   - 混合：`mixed`
2. 没有 `position` 时默认 `before_amount`
3. 没有 `boundary` 时默认 `strict`
4. 没有 `priority` 时默认 `100`

## 4. 解析流程重构

目标解析链路：

1. 预处理
2. 词法扫描
3. 语法组段
4. 语义求值
5. 标准化输出

### 4.1 预处理

保留现有归一化能力，但调整策略：

1. 继续做全角转半角、异体字统一、分隔符标准化。
2. 不再提前清掉可能参与锚点识别的活跃符号。
3. `symbolPolicy` 只负责普通符号的保留/清洗，不再隐式决定锚点语义。

建议改动函数：

1. `normalizeMessage()`
2. `normalizeSegmentText()`
3. `isIgnorableResidualSegment()`

### 4.2 词法扫描

新增扫描器，把整段文本转换为 token 序列。

建议新增函数：

1. `tokenizeLine(line, context)`
2. `scanRegionToken()`
3. `scanAnchorToken()`
4. `scanAmountToken()`
5. `scanTargetToken()`
6. `scanSeparatorToken()`

建议 token 类型：

```json
{
  "type": "region | anchor | amount | unit | target_number | target_animal | target_attribute | separator | noise",
  "text": "#",
  "value": "#",
  "start": 4,
  "end": 5,
  "meta": {}
}
```

### 4.3 语法组段

扫描后按“目标段 + 锚点 + 金额”组装语义片段。

建议新增函数：

1. `buildParseSegments(tokens, context)`
2. `finalizeSegment(segment, context)`
3. `resolveAnchorCandidates(tokens, index, context)`

需要支持的句式：

1. `14.21.33各20`
2. `猴蛇狗#10`
3. `红波大平摊10`
4. 宽松模式下 `猴蛇狗10 -> 猴蛇狗各10`

### 4.4 语义求值

把语法片段转成运行时 entry。

建议复用或调整的函数：

1. `extractNumbers()`
2. `extractTargetGroups()`
3. `buildEntriesFromSegment()`
4. `buildEntriesFromPendingSegments()`

建议新增 entry 字段：

```json
{
  "regionKey": "new_ao",
  "numbers": [11, 23, 35, 47],
  "amount": 10,
  "lineNo": 1,
  "segmentNo": 1,
  "anchorToken": "#",
  "anchorMode": "per_number",
  "anchorType": "symbol",
  "ruleSource": "global",
  "rawSegment": "猴蛇狗#10",
  "odds": 47
}
```

其中：

1. `anchorType`、`ruleSource`、`rawSegment` 为新增字段。
2. 现有统计逻辑仍然可只依赖 `regionKey/numbers/amount/odds`。

## 5. 规则系统改造清单

### 阶段 A：规则模型兼容升级

目标：

1. 先让配置层支持统一锚点规则字段。
2. 不改对外接口。
3. 旧配置可读、可写、可回退。

改动文件：

1. `/Users/wangci/my-electron-app/public/messageProcessor.js`

改动函数：

1. `sanitizeRuleProfile()`
2. `sanitizeAnchorRuleItem()`
3. `getSystemRuleProfile()`
4. `getDefaultGlobalRuleProfile()`
5. `mergeRuleProfiles()`
6. `getEffectiveRuleProfile()`
7. `normalizeAnchorAliasToken()`
8. `upsertAnchorRule()`
9. `getAnchorAliasRows()`

任务：

1. 扩展锚点规则字段校验：支持 `tokenType`、`position`、`boundary`、`priority`。
2. 将“必须包含中文或英文”改为“必须包含至少一个非空可见字符”，并限制危险 token。
3. 增加规则标准化函数：
   - `inferAnchorTokenType(token)`
   - `normalizeAnchorPosition(value)`
   - `normalizeAnchorBoundary(value)`
   - `normalizeAnchorPriority(value)`
4. 对旧配置做自动补字段。

验收标准：

1. 现有文字锚点配置不报错。
2. 纯符号 token 可以进入配置层。
3. 旧数据读取后依然能正常预览和保存。

### 阶段 B：扫描器替换正则主链路

目标：

1. 不再让 `buildAmountAnchorRegex()` 决定主流程。
2. 解析改成“扫描器 + 组段器”。

改动文件：

1. `/Users/wangci/my-electron-app/public/messageProcessor.js`

重点函数：

1. `parseEntries()`
2. `containsConfiguredAnchor()`
3. `buildAnchorTokenPattern()`
4. `buildAmountAnchorRegex()`
5. `rewriteImplicitAmountLine()`
6. `containsAmountUnitWithoutAnchor()`

任务：

1. 保留旧函数作为过渡，但让 `parseEntries()` 走新扫描流程。
2. 新增 token 扫描和组段函数。
3. 支持最长匹配优先。
4. 支持同位置按 `priority` 决策。
5. 保持跨行歧义和宽松模式能力。

验收标准：

1. 原有示例全部兼容：
   - `14.21.13各20`
   - `猴蛇狗各20`
   - `010203各10`
   - `新奥09.21 老奥33各10`
2. 新增符号锚点示例可解析：
   - `猴蛇狗#10`
   - `01.02*5`
3. `各肖`、`平摊` 等未定模式仍能弹歧义。

### 阶段 C：符号策略与锚点策略分层

目标：

1. 明确 `anchorRules` 和 `symbolPolicy` 的职责边界。
2. 避免活跃符号在预处理阶段被误删。

改动文件：

1. `/Users/wangci/my-electron-app/public/messageProcessor.js`

任务：

1. 约定优先级：`anchorRules > symbolPolicy > noise cleanup`
2. 在 `normalizeSegmentText()` 和 `isIgnorableResidualSegment()` 中跳过活跃符号锚点。
3. 为普通符号保留 `noise/unit/marker/error`，但不再把它们混进锚点匹配正则。

验收标准：

1. 配置成锚点的 `#` 不会被清洗。
2. 未配置成锚点的 `#` 继续按 `symbolPolicy` 行为处理。

### 阶段 D：UI 规则编辑器补齐

目标：

1. 让规则编辑器能编辑完整锚点元数据。
2. 维持旧 UI 操作路径不变。

改动文件：

1. `/Users/wangci/my-electron-app/public/index.html`
2. `/Users/wangci/my-electron-app/public/renderer-optimized.js`

可能新增字段：

1. 锚点类型
2. 位置
3. 边界模式
4. 优先级

重点函数：

1. `openAnchorRuleDrawer()`
2. `saveAnchorRuleFromDrawer()`
3. `computeAnchorRuleDrawerPreviewPair()`
4. `renderAnchorAliasList()`

任务：

1. 抽屉中增加规则字段输入。
2. 保存时把新增字段写入 `upsertAnchorRule()`。
3. 预演逻辑带上新增字段。
4. 列表中展示来源、类型、位置、优先级。

验收标准：

1. 可以手工新增 `#` 这类纯符号锚点。
2. 可视化预演结果与实际解析一致。

### 阶段 E：测试与回归

目标：

1. 补足当前缺失的解析器回归样例。
2. 确保新老行为可控。

建议新增测试集：

1. 文字锚点兼容
2. 纯符号锚点
3. 混合锚点
4. 地区切换
5. 宽松模式补锚点
6. 跨行歧义
7. 属性词交并集策略
8. `undetermined` 策略确认
9. 旧配置兼容

建议测试载体：

1. 新增解析器样例脚本，如 `/Users/wangci/my-electron-app/test.js` 扩展或拆分成专用测试文件。
2. 若后续引入正式测试框架，可迁移为单元测试。

## 6. 需要新增的辅助函数

建议在 `public/messageProcessor.js` 中新增以下辅助函数：

1. `inferAnchorTokenType(token)`
2. `normalizeAnchorPosition(value)`
3. `normalizeAnchorBoundary(value)`
4. `normalizeAnchorPriority(value)`
5. `getActiveAnchorRules(clientId)`
6. `getSortedAnchorRules(clientId)`
7. `tokenizeLine(line, context)`
8. `classifyTextSlice(slice, context)`
9. `resolveAnchorCandidates(line, cursor, context)`
10. `buildParseSegments(tokens, context)`
11. `buildEntriesFromParseSegments(segments, context)`

## 7. 风险与处理

风险点：

1. 解析器主链路替换容易引入老格式回归。
2. UI 预演与实际保存逻辑可能出现双轨不一致。
3. 活跃符号锚点与地区/金额/分隔符边界冲突时，容易产生隐性误判。
4. 现有 OCR 产物中包含大量杂质符号，放开纯符号锚点后误命中风险会上升。

处理策略：

1. 阶段 B 前先建立样例回归集。
2. 先支持少量纯符号锚点，如 `#`、`*`，不要一开始全开放。
3. 默认符号锚点使用 `strict` 边界。
4. 所有 `undetermined` 和冲突情况继续复用现有歧义机制。

## 8. 建议实施顺序

推荐执行顺序：

1. 先做阶段 A，补齐规则模型和兼容层。
2. 再做阶段 B，切换解析主链路。
3. 再做阶段 C，处理符号清洗与锚点优先级。
4. 最后做阶段 D 和阶段 E。

原因：

1. 先稳定配置层，才能保证后续解析器和 UI 都有统一输入。
2. 先替换解析主链路，才能真正支持符号锚点。
3. UI 改造应放在核心行为稳定后进行，避免调试成本失控。

## 9. 最小可交付版本

第一阶段最小可交付目标：

1. 允许保存纯符号锚点 `#`
2. 能解析 `猴蛇狗#10`
3. 原有 `各/买/各肖/平摊` 行为不回归
4. UI 中可以创建和预演 `#`

达到以上 4 点后，再继续扩展更多符号和更多位置规则。
