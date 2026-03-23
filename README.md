# 盯盘助手（Chrome 扩展）

轻量股票盯盘扩展：查看指数、搜索股票、设置多个目标价提醒，并在价格到达或穿过目标价时通过浏览器通知和扩展角标提醒。

## 当前功能
- 展示上证、深证、创业板指数实时行情。
- 搜索 A 股、港股、美股等证券代码并加入关注。
- 为单只股票设置多个目标价提醒。
- 价格到达或穿过目标价时触发浏览器通知。
- 扩展图标右上角显示待处理提醒角标，打开弹窗后清除。

## 数据来源
- 搜索接口：东方财富 `searchapi.eastmoney.com`
- 行情接口：东方财富 `push2.eastmoney.com`

## 本地安装
1. 打开 `chrome://extensions/`
2. 开启右上角“开发者模式”
3. 点击“加载已解压的扩展程序”
4. 选择目录 `/Users/zhangxumeng/Desktop/盯盘`

## 项目文件
- `manifest.json`: 扩展声明
- `background.js`: 后台轮询、通知、角标逻辑
- `popup.html`: 弹窗结构
- `popup.js`: 弹窗交互和渲染
- `popup.css`: 弹窗样式
- `assets/`: 图标资源

## Chrome Web Store 说明
仓库内已准备上架辅助材料，见：
- `store/LISTING.md`
- `store/PRIVACY.md`
- `store/SUBMISSION_CHECKLIST.md`
