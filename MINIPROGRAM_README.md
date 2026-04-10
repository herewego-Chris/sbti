# 微信小程序版说明（结果图保存 + 图片转发）

## 已完成内容
- 不保存本机历史（已移除历史存储逻辑）。
- 结果页支持“保存测试结果”到系统相册。
- 结果页支持“转发给朋友”发送结果图片（微信支持时可直接发图，不支持时提示先保存再发送）。
- 结果图包含：人格图片、类型名、匹配度、人格分析、15维度评分与说明、友情提示。

## 关键文件
- `miniprogram/pages/index/index.js`
- `miniprogram/pages/index/index.wxml`
- `miniprogram/pages/index/index.wxss`
- `miniprogram/pages/index/index.json`（已开启页面分享）
- `miniprogram/utils/type-images.js`（人格码 -> 图片路径映射）
- `miniprogram/assets/types/*.jpg`（人格图片资源）

## 运行方式
1. 打开微信开发者工具。
2. 导入目录：`D:/sbti`。
3. 编译运行。

## 说明
- 右上角菜单分享仍是小程序卡片。
- 结果页按钮“转发给朋友”是分享图片（你要的方案）。
- 如果真机提示权限问题，请在微信设置中允许“保存到相册”。
