# MessageCounter - 网友消息统计应用

一个基于Electron的桌面应用，用于统计和管理网友消息中的数字和生肖数据。

## 用户文档

- 客户版入门手册（V5.0）：`docs/用户使用说明书-V5.0.md`

## 当前功能梳理（V3）

1. 消息录入与解析
   - 支持多行消息、灵活分隔符、中文金额（如“各二十”）
   - 支持数字、生肖、属性词混合识别
   - 解析前实时预览，错误定位到具体行
2. 数据统计与展示
   - 多用户统计、汇总排序、分地区（新奥/老奥/香港）查看
   - 生肖看板、号码榜单、原始消息列表联动
   - 支持原始消息编辑/删除后自动重算
3. 属性体系
   - 内置大批属性词（单双、波色、尾数、余数等）
   - 支持自定义属性新增/编辑/删除与布局调整
4. 效率工具
   - 消息弹窗内自动预览
   - 一键复制统计结果
   - OCR 图片识别（候选排序 + 风险提示）
   - 微信复制自动监听与同日重复拦截
5. 授权与安全
   - U 盘授权 + 本机离线授权（签名校验 + 指纹绑定）
   - 试用期与系统时间回拨检测
   - 授权实时监控，授权失效即退出

## 套餐版本与收费（永久授权）

| 套餐 | 价格 | 适用场景 | 核心能力 |
| --- | ---: | --- | --- |
| Plus | ¥1499 | 稳定录入与日常统计 | 录入提效、统计清晰、导出交付、规则可控，适合稳定业务长期使用 |
| Pro | ¥2999 | 高频业务与自动化 | 在 Plus 基础上提供 OCR 识别引擎、微信自动监听中枢、全链路自动化与持续更新，适合追求效率和规模化运营 |

### 套餐规则
- 试用期默认开放 Plus 能力（到期后需授权）
- Plus 核心价值：`录入提效`、`统计清晰`、`一键导出`、`一次买断`
- Pro 专属价值：`OCR 智能识别引擎`、`微信自动监听去重`、`全链路自动化`、`持续更新`
- 授权文件支持写入 `tier`（plus/pro）和 `billingCycle`（lifetime）
- 旧版仅年费授权文件会自动兼容为 Pro
- 升级客服 Telegram：`@Wffftttp`（链接：`https://t.me/Wffftttp`）
- 联系方式：
  - 方式一：扫码添加 Telegram 客服
  - 方式二：Telegram 搜索 `@Wffftttp`
- 详细步骤：
  - 第1步：安装并登录 Telegram（手机或电脑端）
  - 第2步：扫码二维码，或在搜索框输入 `@Wffftttp`
  - 第3步：进入客服主页后点击 `Start/开始`
  - 第4步：发送“升级 Plus”或“升级 Pro”
  - 第5步：补充客户ID、当前套餐、设备授权信息（可附截图）
  - 第6步：按客服回复的支付与授权更新步骤完成升级

### 发证脚本（新增参数）

> 私钥安全要求：私钥必须放在项目目录外（例如 `/secure/license-private.pem` 或 `D:\\secure\\license-private.pem`），并通过 `--private-key` 或环境变量 `MC_LICENSE_PRIVATE_KEY_PATH` 指定。

```bash
# 启动图形签发工具（推荐）
npm run license:studio

# 打包签发工具（当前系统）
npm run license:studio:dist

# macOS 打包 zip（内含 .app）
npm run license:studio:dist:mac

# macOS 打包 dmg（如环境支持）
npm run license:studio:dist:mac:dmg

# 仅做目录打包验证（不生成安装包）
npm run license:studio:dist:dir

# 查看本机指纹（仅源码环境客户机）
node scripts/license-tools.js machine-fingerprint

# 指定套餐签发（永久授权）
node scripts/license-tools.js issue-license \
  --private-key /path/private.pem \
  --customer-id C001 \
  --usb-fingerprint <fingerprint> \
  --expire-at 2027-12-31 \
  --output /tmp/license.dat \
  --tier plus \
  --billing-cycle lifetime

# 离线授权签发（绑定 machineFingerprint）
node scripts/license-tools.js issue-offline \
  --private-key /path/private.pem \
  --customer-id C001 \
  --machine-fingerprint <machineFingerprint> \
  --expire-at 2027-12-31 \
  --output /tmp/license.dat \
  --tier plus \
  --billing-cycle lifetime
```

### 授权交付流程（按原 U 盘教程方式）

优先建议：发证方使用 `npm run license:studio` 打开图形工具，按界面填写并点击签发。
命令行步骤保留给自动化或批量处理。

#### A. U 盘授权交付（客户侧无需命令）

1) 发证方在项目目录执行：

```bash
cd /Users/wangci/my-electron-app
npm run license:list-usb
```

2) 确认目标 U 盘路径后，签发并写入 U 盘根目录：

macOS 发证示例：

```bash
cd /Users/wangci/my-electron-app
npm run license:issue-to-usb -- \
  --private-key /secure/license-private.pem \
  --customer-id C001 \
  --mount-path "/Volumes/你的U盘名" \
  --expire-at 2027-12-31 \
  --grace-days 3 \
  --tier pro \
  --billing-cycle lifetime
```

Windows 发证示例（在 Windows 终端执行）：

```powershell
cd C:\path\to\my-electron-app
npm run license:issue-to-usb -- --private-key D:\secure\license-private.pem --customer-id C001 --mount-path "E:\" --expire-at 2027-12-31 --grace-days 3 --tier pro --billing-cycle lifetime
```

3) 将该 U 盘交付客户。客户使用方式：
- 插上这只授权 U 盘；
- 启动应用；
- 在“授权管理”确认状态为有效。

4) 到期/升级时重复第2步，覆盖 U 盘内 `license.dat` 即可。

#### B. 离线授权交付（不插 U 盘）

1) 先获取客户机器指纹：
- 安装包客户（无源码）：直接启动应用，未授权弹窗会显示 `本机指纹`；
- 源码环境客户：在项目目录执行 `npm run license:machine-fingerprint`。

2) 发证方按该指纹签发：

```bash
cd /Users/wangci/my-electron-app
npm run license:issue-offline -- \
  --private-key /secure/license-private.pem \
  --customer-id C001 \
  --machine-fingerprint <客户指纹> \
  --expire-at 2027-12-31 \
  --output /tmp/license.dat \
  --grace-days 3 \
  --tier plus \
  --billing-cycle lifetime
```

3) 将生成的 `license.dat` 发送给客户。

4) 客户把文件放到本机授权目录：
- Windows: `C:\Users\用户名\AppData\Roaming\messagecounter\license.dat`
- macOS: `/Users/用户名/Library/Application Support/messagecounter/license.dat`

5) 客户重启应用，在“授权管理”看到“授权来源 = 离线授权”即交付完成。

### 常见问题

- 报错 `ENOENT package.json`：当前目录不对。先 `cd /Users/wangci/my-electron-app` 再执行 `npm run ...`。
- 文件名错误：确保是 `license.dat`，不要变成 `license.dat.txt`。
- 路径错误：Windows 使用 `%APPDATA%\messagecounter`，macOS 使用 `~/Library/Application Support/messagecounter`。

## 主要功能

### 1. 消息识别与处理
- 支持格式：`数字.数字.数字...～各数字`
- 自动识别数字对应的生肖
- 实时预览解析结果
- 批量处理消息

### 2. 用户管理
- 添加、删除、切换用户
- 用户数据独立管理
- 用户排行榜显示

### 3. 数据统计
- 实时统计每个数字和生肖的累计值
- 支持汇总模式查看所有用户数据
- 数据排序和筛选

### 4. 数据导出
- 复制统计结果到剪贴板
- 支持数据导入导出
- 数据备份和恢复

### 5. 试用期管理
- 3天试用期限制（默认 Plus 能力）
- 试用期提醒
- 系统时间回拨检测

## 优化内容

### 1. 代码结构优化
- **模块化设计**：将功能分离为独立模块
  - `userManager.js` - 用户管理模块
  - `messageProcessor.js` - 消息处理模块
  - `trialManager.js` - 试用期管理模块
- **MVC架构**：采用Model-View-Controller模式
  - `UserModel.js` - 数据模型
  - `MainController.js` - 主控制器

### 2. 试用期管理优化
- 统一试用期为3天
- 增加试用期提醒功能
- 优化试用期检测逻辑
- 增加 U 盘授权或离线授权后自动切换正式套餐

### 3. 错误处理优化
- 完善的异常捕获机制
- 用户友好的错误提示
- 数据验证和恢复机制
- 自动备份和恢复功能

### 4. 性能优化
- 减少DOM操作频率
- 优化渲染性能
- 模块化加载
- 内存使用优化

### 5. 数据管理优化
- 数据格式验证
- 自动备份机制
- 数据导入导出功能
- 数据清理功能

### 6. 用户体验优化
- 更好的UI反馈
- 操作确认机制
- 加载状态提示
- 键盘快捷键支持

## 技术栈

- **Electron** - 桌面应用框架
- **Node.js** - 后端运行环境
- **HTML/CSS/JavaScript** - 前端技术
- **文件系统** - 本地数据存储

## 安装和运行

### 开发环境
```bash
# 安装依赖
npm install

# 启动开发模式
npm start
```

### 构建应用
```bash
# 构建应用
npm run dist
```

### 本地免费 AI 语义修正（可选）

应用已内置中文小模型 `Qwen2.5-0.5B-Instruct`（`q4f16`），用于免费离线的语义纠错和 OCR 文本修正；不需要单独安装 `Ollama` 或配置云端 API。

```bash
# 直接启动应用
npm start
```

说明：
- 内置模型资源位于 `assets/ai/models/Mozilla/Qwen2.5-0.5B-Instruct`
- 打包后会随安装包一起进入 `resources/ai/`
- 首次调用“本地AI修正”时会加载模型，速度会比后续调用慢一些

## 项目结构

```
my-electron-app/
├── main.js                 # 主进程文件
├── package.json            # 项目配置
├── public/                 # 前端资源
│   ├── index.html         # 主页面
│   ├── styles.css         # 样式文件
│   ├── trialManager.js    # 试用期管理
│   ├── userManager.js     # 用户管理模块
│   ├── messageProcessor.js # 消息处理模块
│   └── renderer.js        # 渲染进程文件
├── src/                   # 源代码
│   ├── controllers/       # 控制器
│   │   └── MainController.js
│   └── models/           # 数据模型
│       └── UserModel.js
└── README.md             # 项目说明
```

## 使用说明

### 1. 添加用户
- 在左侧用户列表输入用户名
- 点击"添加网友"按钮

### 2. 识别消息
- 点击"识别网友消息"按钮
- 输入消息格式：`14.21.13.39.38.30.26.18.33～各20`
- 点击"识别"预览结果
- 点击"确认"保存数据

### 3. 查看统计
- 选择用户查看个人统计
- 点击"所有网友消息汇总"查看汇总数据
- 点击"复制网友统计消息"导出数据

### 4. 编辑数据
- 点击数字单元格编辑数值
- 支持批量编辑多个用户

## 注意事项

1. **试用期限制**：应用有3天试用期，过期后需插入有效授权U盘或导入离线授权文件
2. **数据备份**：重要数据建议定期备份
3. **格式要求**：消息必须严格按照指定格式输入
4. **系统兼容**：支持Windows和macOS系统

## 开发说明

### 添加新功能
1. 在相应模块中添加功能
2. 更新UI界面
3. 添加错误处理
4. 更新文档

### 调试模式
开发环境下会自动打开开发者工具，方便调试。

### 数据格式
用户数据以JSON格式存储，包含用户信息、统计数据、原始数据等。

## 许可证

本软件仅供学习和娱乐使用，请遵守相关法律法规。 
