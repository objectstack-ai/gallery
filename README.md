# ObjectStack Gallery

**Enterprise apps written by an AI agent on ObjectStack, each one verified before it is shown.**

Every app here starts from a scenario card: a business requirement plus the checks a correct app must pass. An AI coding agent builds the app from the requirement alone. Code, not a person, then checks the result:

- **Structure:** the objects, relationships and navigation the requirement implies.
- **Data questions (问数):** 8–10 business questions per app, answered by an agent connected over MCP. Each answer is compared with a truth computed from the seed data. The same question is asked as different roles, so a role must never see what it is not allowed to see.
- **Write operations:** entries, edits and workflow steps the agent performs for a user. Irreversible actions must wait for a human to confirm. An overstep must be refused, and a write that breaks a validation rule must be rejected.
- **One change request:** a one-sentence customization, applied and re-checked.

Only apps that pass appear here. The whole gallery is rebuilt on every ObjectStack release, so nothing shown is pinned to an old version.

> **Status:** empty. The first verified apps arrive when the scenario pipeline lands (tracked in objectstack-ai/objectstack#30349).

## What you will find (once populated)

| Path | What it is |
|---|---|
| `apps/<scenario>/` | One verified app: its metadata source, run record and scorecard, screenshots, and the data-question transcript for each role. |
| `index.json` | A machine-readable index of every app: function, title, screenshots, question count, framework version, run date. Landing pages on objectos.ai are built from it. |

The apps are general business functions, not industry verticals: sales, service, procurement and supply chain, finance, HR, admin, projects and legal.

## Use an app

- **Read it.** Each app's metadata is plain TypeScript and JSON. It is small enough to review as a diff, which is the point: the AI writes it, and you review it and sign off.
- **Run it locally.** Start a project with `npm create objectstack` and copy the app's metadata in. Run `os validate` and `os verify`, then start it with `os dev`.
- **Try it in ObjectOS cloud.** A one-click trial is planned.

## How content arrives

The content is generated. The normal path is a pull request opened by the scheduled export task after each ObjectStack release, which the maintainer reviews and merges. Every pull request must pass the gallery check (`.github/workflows/gallery-check.yml`), which fails on an `index.json` that does not match the exporter's schema, an incomplete or unlisted app directory, a stray `.env` file, `node_modules` directory or local path, or a framework version that is not a published release. Hand edits belong in `apps/README.md` only.

## What this repository is not

- Not hand-maintained. Every file under `apps/` and `index.json` is generated, and a hand edit is overwritten on the next release.
- Not a template catalogue with an upgrade promise. A starter template that graduates to the ObjectStack marketplace installs **unmanaged**: the copy becomes yours.

## License

Apache-2.0. See [LICENSE](./LICENSE).

---

# ObjectStack 应用画廊

**由 AI 在 ObjectStack 上写出的企业应用，每一个都先验证、再展示。**

每个应用都从一张场景卡开始：一段业务需求，加上一个正确的应用必须通过的检查。AI 编程助手只凭需求把应用搭出来，然后由代码（不是人）检查结果：

- **结构**：需求所隐含的对象、关联和导航。
- **问数**：每个应用 8–10 个业务问题，由通过 MCP 接入的 agent 回答。每个答案都和根据种子数据算出的标准答案比对。同一个问题会换不同角色再问，确保角色看不到无权看的数据。
- **写入操作**：agent 代用户做的录入、修改和流程操作。不可逆的操作必须等人确认，越权的操作必须被拒绝，违反校验的写入必须被拦下。
- **一句话改需求**：做一次小改动，改完再验一遍。

只有全部通过的应用才会出现在这里。每次 ObjectStack 发版，整个画廊都会重新生成，所以展示的内容不会停留在旧版本上。

> **现状：** 目前为空。场景产线落地后，第一批验证通过的应用就会出现在这里（进度见 objectstack-ai/objectstack#30349）。

覆盖的是通用职能场景，暂不按行业细分：销售、客服、采购与供应链、财务、人事、行政、项目、法务。

本仓库的内容全部由产线生成，手工修改会在下次发版时被覆盖。正常的更新途径是：每次 ObjectStack 发版后由定时导出任务开一个 PR，维护者审阅后合并。每个 PR 都必须通过画廊检查（`.github/workflows/gallery-check.yml`）。手工修改只放在 `apps/README.md`。毕业到应用市场的入门模板以**非受管**方式安装：装上之后，那份应用归你所有。
