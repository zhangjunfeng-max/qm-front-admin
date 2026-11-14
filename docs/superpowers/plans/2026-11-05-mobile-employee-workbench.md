# Mobile Employee Workbench Implementation Plan

> 历史实施计划：保留业务设计与实施记录，后续变更使用 OpenSpec 工作流；保留已有未提交工作。

**Goal:** 手机员工可查看本人业绩、参与活动、跟进报名订单、查看榜单并分享推广。
**Architecture:** 管理端新增独立移动布局和动态授权路由，复用公司生命周期和业务API；后端补充期间/本人查询及安全的员工分享签名。
**Tech Stack:** Vue 3, Ant Design Vue, Vben, Go/Gin/Gorm, Redis.
**Spec:** docs/superpowers/specs/2026-11-05-mobile-employee-workbench.md

## Global Constraints
- 不兼容旧模型、不改数据库结构、不重置数据；保留已有未提交工作。
- 后端控制公司及活动权限；设备只影响展示。
- 不提交密钥；不制造线上订单；复用已有部署授权。

## Review Focus
- 公司切换/退出后迟到响应不可展示。
- 平台身份不能成为销售，手机不能绕过活动数据权限。
- 已报名、待支付、待报名及真实收款统计必须一致。
- 刷新移动深链和切换电脑版不循环、不丢身份。
- 微信分享失败可复制短链，签名不能签任意域名。

### Task 1: Backend contracts
- [x] 测试今日边界、个人待跟进、公司隔离、自身筛选、签名域名拒绝；先运行确认失败。
- [x] overview增加period，personal补充collected/pending；orders支持onlySelf/period/event，用户从token取。员工签名单独接口验证活动身份及配置管理端URL，重用票据缓存。
- [x] go tests + vet，集成测试使用已有本地测试库。

### Task 2: Mobile routing and views
- [x] 路由策略测试：窄屏非平台转工作台，深链映射、电脑偏好、平台保留；运行确认失败。
- [x] mobile路由noBasicLayout，四栏布局、公司切换、返回；带上下文取消的请求hook。
- [x] 工作台、活动列表/操作页、订单列表/详情、我的；compact样式，错误/空/分页完整。

### Task 3: Rankings and sharing
- [x] 用已有performance feed+30秒生命周期，移动排名列表/组展开/零业绩/本人高亮。
- [x] 员工短链/二维码分享面板，微信JS-SDK配置失败降级复制；上下文变化清理。

### Task 4: Verification and deployment
- [x] 全部相关测试/typecheck/lint/build；浏览器390/375/820/1280，移动登录/深链/筛选/切换验证。
- [x] 一个独立最终审查，修复重要问题。
- [x] 本地构建Linux API及管理端，备份当前release目录，替换并验证线上；不重置数据。

## Execution record
按用户已批准范围直接执行，不再增加方案确认。现有dirty workspace内精准改动，不创建分离旧代码的worktree，不自动提交累积变更。


## 验证记录
- 前端 41 个测试文件、165 项测试通过；typecheck、所改文件 ESLint 和移动样式 Stylelint 通过。
- Go make check 通过；独立 MySQL 测试库执行个人/公司统计、订单期间与权限、活动推广及员工签名测试通过。
- 浏览器生产构建验证 375/390/820/1280，无页面异常和横向溢出；覆盖登录深链、订单下钻/返回、分享归属、零业绩、分组展开、微信签名失败降级、公司切换和电脑版偏好。
- 独立审查发现微信原生菜单保留旧活动元数据，已通过先失败后通过的测试验证并修复；分享销毁时隐藏菜单，仅当前签名和元数据成功后启用。
- 手动浏览器测试仅使用隔离模拟数据；线上验证使用已有平台账号，不新增客户、订单或员工记录。
- 已部署 mobile-20261105-004127。真实线上验证通过：公司切换、期间总览及个人字段、活动个人统计、本人订单筛选、非法期间拒绝、平台手机入口保留管理后台、公众号校验文件、就绪检查、原客户活动链接均正常，浏览器无脚本异常。记录位于 deploy/build-20261105-mobile/live-verification.json。
- 微信原生分享仍需服务号 JS 接口安全域名包含 admin.zjfyun.cn，并使用真实微信完成验证；复制短链和二维码不依赖此配置。
