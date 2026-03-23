# Privacy And Permission Draft

## Single Purpose
盯盘助手的单一用途是在浏览器中监控指数和股票价格，并在价格到达或穿过用户设定的目标价时发出提醒。

## Permissions Justification

### `storage`
用于保存用户关注的股票、目标价提醒、本地提醒状态和最近一次行情缓存。

### `notifications`
用于在价格触发目标价时向用户发送浏览器通知。

### `alarms`
用于按固定周期轮询行情数据，保证在弹窗关闭时仍能检测价格变化。

### `https://searchapi.eastmoney.com/*`
用于搜索股票代码和名称。

### `https://push2.eastmoney.com/*`
用于获取指数和股票实时行情。

## User Data Statement
- 扩展不会收集账号、密码、联系人、位置等个人身份数据。
- 扩展不会将用户自定义的关注列表或目标价上传到自建服务器。
- 扩展仅向行情提供方请求证券搜索和行情数据。
- 用户数据主要保存在浏览器本地存储中。

## Privacy Policy Notes
如果 Chrome Web Store 页面要求提供公开隐私政策 URL，建议发布一个简单静态页面，至少说明：
- 收集了什么数据：无个人身份数据，仅本地保存关注列表和提醒设置
- 数据如何使用：用于扩展自身提醒功能
- 是否共享：不与自建服务共享，仅请求第三方公开行情接口
- 联系方式：开发者邮箱
