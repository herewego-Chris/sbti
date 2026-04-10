# SBTI 计分与人格匹配规则（复刻版）

## 1. 总体结构
- 常规题：`30` 题。
- 维度：`15` 个维度，每个维度 `2` 题。
- 每题分值：`1 / 2 / 3`。
- 额外分支题：`drink_gate_q1`，若选到饮酒分支再出现 `drink_gate_q2`。

## 2. 维度分数与等级
- 每个维度总分范围：`2~6`（两题相加）。
- 映射规则：
  - `<=3` => `L`
  - `==4` => `M`
  - `>=5` => `H`

## 3. 题号到维度
- `q1,q2 -> S1`
- `q3,q4 -> S2`
- `q5,q6 -> S3`
- `q7,q8 -> E1`
- `q9,q10 -> E2`
- `q11,q12 -> E3`
- `q13,q14 -> A1`
- `q15,q16 -> A2`
- `q17,q18 -> A3`
- `q19,q20 -> Ac1`
- `q21,q22 -> Ac2`
- `q23,q24 -> Ac3`
- `q25,q26 -> So1`
- `q27,q28 -> So2`
- `q29,q30 -> So3`

维度顺序（用于人格模板比对）：
`S1,S2,S3,E1,E2,E3,A1,A2,A3,Ac1,Ac2,Ac3,So1,So2,So3`

## 4. 人格匹配算法
- 将用户维度等级转为数值向量：`L=1, M=2, H=3`。
- 对每个标准人格模板（`25` 个）计算曼哈顿距离：
  - `distance = Σ |user_i - type_i|`
- 计算相似度：
  - `similarity = round((1 - distance/30) * 100)`，最小截断到 `0`。
- 排序规则：
  - 先比 `distance`（小优先）
  - 再比 `exact`（完全命中的维度数，多优先）
  - 再比 `similarity`（高优先）

## 5. 特殊分支
- `DRUNK`（酒鬼）触发条件：
  - `drink_gate_q1 = 3`（爱好选“饮酒”）
  - 且 `drink_gate_q2 = 2`
  - 触发后直接覆盖常规人格结果。
- `HHHH`（傻乐者）触发条件：
  - 常规最佳人格 `similarity < 60%`。

## 6. 常规人格模板（25个）

| Code | Pattern |
|---|---|
| CTRL | HHH-HMH-MHH-HHH-MHM |
| ATM-er | HHH-HHM-HHH-HMH-MHL |
| Dior-s | MHM-MMH-MHM-HMH-LHL |
| BOSS | HHH-HMH-MMH-HHH-LHL |
| THAN-K | MHM-HMM-HHM-MMH-MHL |
| OH-NO | HHL-LMH-LHH-HHM-LHL |
| GOGO | HHM-HMH-MMH-HHH-MHM |
| SEXY | HMH-HHL-HMM-HMM-HLH |
| LOVE-R | MLH-LHL-HLH-MLM-MLH |
| MUM | MMH-MHL-HMM-LMM-HLL |
| FAKE | HLM-MML-MLM-MLM-HLH |
| OJBK | MMH-MMM-HML-LMM-MML |
| MALO | MLH-MHM-MLH-MLH-LMH |
| JOKE-R | LLH-LHL-LML-LLL-MLM |
| WOC! | HHL-HMH-MMH-HHM-LHH |
| THIN-K | HHL-HMH-MLH-MHM-LHH |
| SHIT | HHL-HLH-LMM-HHM-LHH |
| ZZZZ | MHL-MLH-LML-MML-LHM |
| POOR | HHL-MLH-LMH-HHH-LHL |
| MONK | HHL-LLH-LLM-MML-LHM |
| IMSB | LLM-LMM-LLL-LLL-MLM |
| SOLO | LML-LLH-LHL-LML-LHM |
| FUCK | MLL-LHL-LLM-MLL-HLH |
| DEAD | LLL-LLM-LML-LLL-LHM |
| IMFW | LLH-LHL-LML-LLL-MLL |

## 7. “怎么选会导向哪个人格”
- 本质不是“固定某几题”，而是让 `15` 个维度最终落在对应模板的 `L/M/H`。
- 一维有两题，典型组合：
  - 目标 `L`：优先选低分（常见组合 `1+1`）
  - 目标 `M`：中间分（常见组合 `2+2` 或 `1+3`）
  - 目标 `H`：高分（常见组合 `3+3`）
- 如果你要直接反推一组可行答案，可用 `predict_type.py --generate <TYPE_CODE>`。

