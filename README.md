# 团购营销管理端

本仓库是团购营销平台的管理端，业务应用位于 `apps/web-antd`，使用 Vue 3、TypeScript、Vben、Ant Design Vue 和 pnpm。

## 当前能力

- 平台管理员管理公司、全局用户、活动审核、支付配置、支付异常、音乐库和运营总览。
- 公司管理员管理本公司资料、员工、门店、小程序、活动、客户、报名、订单、退款和业绩排行。
- 活动组长和组员按活动配置的本人、本组或全部范围查看数据。
- 移动端浏览器自动进入精简管理视图，可查看业绩、报名和订单，并进入活动运营工作台。
- 单个活动只使用 H5 或微信小程序其中一种渠道。
- 管理端只调用当前版本 API，不维护旧路由、旧字段或旧数据兼容分支。

## 本地启动

先启动相邻仓库 `group-biz` 及其 MySQL、Redis，再运行：

```sh
pnpm install
pnpm dev:antd
```

默认地址为 `http://localhost:5666`，开发代理将 `/api` 转发到 `http://127.0.0.1:8080`。

## 验证

```sh
pnpm --filter @vben/web-antd typecheck
pnpm exec vitest run apps/web-antd/src/api/__tests__
pnpm --filter @vben/web-antd build
```

具体业务说明、接口和部署配置见 [管理端说明](apps/web-antd/README.md)，列表页开发规范见 [AGENTS.md](AGENTS.md)。
