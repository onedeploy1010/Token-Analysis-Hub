# QuickNode Streams · RUNE 配置文档

> 把 BSC 链上 RUNE 合约（`Community.EventAddReferrer` + `NodePresell.EventNodePresell`）通过 **QuickNode Streams push 到 Supabase Edge Function**，写入 `rune_referrers` / `rune_members` / `rune_purchases` 三张表。
>
> Plan: **Build $49/mo**（够用，详见决策附注）
> 版本：v2 · 2026-05-01（已验证 Receipts dataset payload 形态、双 secret、双 Edge Function URL）

---

## 现状（已就绪）

| 项 | 主网 | 测试网 |
|---|---|---|
| Supabase project | `mefjuecwawmjfmeofnck` | `tqexhkajljyecsacmyyy` (preview branch) |
| Edge Function URL | `https://mefjuecwawmjfmeofnck.supabase.co/functions/v1/quicknode-stream-webhook` ✅ | `https://tqexhkajljyecsacmyyy.supabase.co/functions/v1/quicknode-stream-webhook` ✅ |
| 函数验证 | `curl -X GET <URL>` → HTTP 405（只接 POST，正常） | 同 ✅ |
| `QUICKNODE_WEBHOOK_SECRET` | `52cd98c8656e8d7a0896770276aa6eaae93d79377445b0bd03a58292926ecdd6` | `d5db3c6ab64e4d5a60e0b0be44f2987a418607d4b3d0aa1fe22f5fe910349740` |

> ⚠ 主网/测试网的 secret **必须不同**，QuickNode HMAC 字段也填各自的，否则跨网 replay 攻击窗口存在。

---

## 你要做的（QuickNode 控制台 · 2 条 Stream）

打开 [https://dashboard.quicknode.com/streams](https://dashboard.quicknode.com/streams) → Create Stream → 按下方 2 份 JSON 配置**逐字段填**：

| 配置文件 | 用途 |
|---|---|
| **`runeapi 3/quicknode-stream-mainnet.json`** | BSC mainnet 56 → 主网 Supabase |
| **`runeapi 3/quicknode-stream-testnet.json`** | BSC testnet 97 → 测试网 Supabase preview branch |

每份 JSON 字段完整对应控制台表单的每一项，包括：
- `network` / `dataset` / `start.block` / `batch.blocks_per_message` / `compression`
- `filter.code`（粘到 "Modify the stream payload → Customize your payload"）
- `destination.url` / `headers` / `hmac.{secret, header_name, algorithm}`

---

## 关键确认（避免再来一轮）

### 1. Dataset 是 Receipts 不是 Logs

QuickNode 控制台 UI 标签可能写 "Logs"，但你那个样本（`BNBCHAIN_MAINNET-LOGS-95678691.raw.json`）payload 形态实际是 **Receipts**：每条 entry 含 `status / gasUsed / cumulativeGasUsed / logs[]`，是 receipt 包装。

Filter 已按 Receipts 真实形态写好（`Object.values(entry)` 处理 numeric-key object）。

### 2. 测试块要选有事件的

`block 95678691` 没有 RUNE 事件——绝大多数 BSC 块都没有。在控制台 "Test on a specific block" 输入：

| 网络 | 已知有事件的块号 |
|---|---|
| 主网 | `95643887` 附近（2026-04-27 12:42 那笔 0xEA9D…E04C 绑定） |
| 测试网 | 用 `psql` 查 `SELECT max(block_number) FROM rune_referrers WHERE chain_id=97;` 拿最近一个 |

### 3. Filter 返回 null 不是错

filter 的 `return out.length > 0 ? out : null;` —— 空 payload 返回 null 让 Stream **跳过 destination 调用**，省 webhook 配额。控制台会提示 "Your filter did not return any data" 这是**预期**，不是 bug。

---

## Edge Function 行为速记

`supabase/functions/quicknode-stream-webhook/index.ts`：

1. 验 `x-qn-signature` HMAC（与 `QUICKNODE_WEBHOOK_SECRET` 对比）→ 401 if mismatch
2. 解析 payload 的 logs 数组
3. 按 topic0 分发到 `decodeEventLog(eventAddReferrer)` 或 `decodeEventLog(eventNodePresell)`
4. UPSERT 到 `rune_referrers + rune_members`（或 `rune_purchases`）
5. `onConflict: ignoreDuplicates: true` 保幂等
6. 返回 `{ok:true, ingested:{referrers,members,purchases}, skipped}`

与现有 Railway indexer 共存：两边写同一张表，唯一索引保证不会重复。

---

## 切换路线（Phase 2c · Streams 跑稳后下线 Railway indexer）

**确认 Streams 7×24 稳定 1–2 周** 后：

```ts
// artifacts/api-server/src/index.ts
// startRuneIndexer();   // ← 注释这一行
```

Railway 重部署后只剩 `/api/admin/login` + `/api/graphql` 两个 endpoint。等前端+admin 都切完 Supabase SDK 直读，Railway 可彻底关。

---

## 故障应急

| 现象 | 排查 |
|---|---|
| Stream Logs 全是 401 | secret 不一致：`supabase secrets list --project-ref <ref>` 对比 QuickNode HMAC 字段 |
| Stream Logs 全是 500 | `supabase functions logs quicknode-stream-webhook --project-ref <ref> --tail` |
| filter 测试 "did not return any data" | 块号确实没有 RUNE 事件——换块测，见上方"测试块要选有事件的" |
| 数据库行数不增但 Stream 200 | 检查 webhook response body：`{ingested:{...}, skipped:N}`，看 skipped 是不是命中 |
| 想重灌历史 | QuickNode 控制台改 Stream 的 "Start block" → 重启即可，Edge Function 幂等 |

---

## 安全 / 注意事项

- 主网 / 测试网 secret 必须**绝对不同**
- 每个 Edge Function 部署都用 `--no-verify-jwt`（鉴权 100% 靠 HMAC）
- `service_role` key 由 Supabase Edge runtime 自动注入，不要在任何前端 bundle 出现
- Filter 里的合约地址必须**全小写**，QuickNode 不做 normalization
- 合约升级如果改了 event 字段（增/减/改顺序），**topic0 会变**，必须重算（命令见下方）

```sh
node -e "import('viem').then(({keccak256,toBytes})=>{
  console.log(keccak256(toBytes('EventAddReferrer(address,address)')));
  console.log(keccak256(toBytes('EventNodePresell(address,address,uint256,uint256,uint256,uint256)')));
});"
# 当前: 0x157b... AddReferrer / 0xdd5b... NodePresell
```

---

## 决策记录

| 决策 | 时间 | 来源 |
|---|---|---|
| Plan 选 Build $49 | 2026-05-01 | 事件量低 + WSS 兜底已就绪，不需要 Accelerate $249 的 12h SLA |
| 切走 Railway indexer 长期路线 | 2026-05-01 | Railway 数据延迟问题，QuickNode push 模式根除 |
| 双部署而非共享函数 | 2026-05-01 | 测试网/主网数据隔离要求 |
| HMAC 而非 Bearer | 2026-05-01 | QuickNode webhook 不带 JWT；HMAC 防 replay |
