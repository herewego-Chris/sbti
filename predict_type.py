#!/usr/bin/env python3
"""SBTI 结果预测与反推工具（基于 main.js 计分逻辑复刻）。"""

from __future__ import annotations

import argparse
from dataclasses import dataclass


DIMENSION_ORDER = [
    "S1",
    "S2",
    "S3",
    "E1",
    "E2",
    "E3",
    "A1",
    "A2",
    "A3",
    "Ac1",
    "Ac2",
    "Ac3",
    "So1",
    "So2",
    "So3",
]

QUESTION_TO_DIM = {
    1: "S1",
    2: "S1",
    3: "S2",
    4: "S2",
    5: "S3",
    6: "S3",
    7: "E1",
    8: "E1",
    9: "E2",
    10: "E2",
    11: "E3",
    12: "E3",
    13: "A1",
    14: "A1",
    15: "A2",
    16: "A2",
    17: "A3",
    18: "A3",
    19: "Ac1",
    20: "Ac1",
    21: "Ac2",
    22: "Ac2",
    23: "Ac3",
    24: "Ac3",
    25: "So1",
    26: "So1",
    27: "So2",
    28: "So2",
    29: "So3",
    30: "So3",
}

DIM_TO_QUESTIONS = {
    dim: [q for q, d in QUESTION_TO_DIM.items() if d == dim] for dim in DIMENSION_ORDER
}

NORMAL_TYPES = {
    "CTRL": "HHH-HMH-MHH-HHH-MHM",
    "ATM-er": "HHH-HHM-HHH-HMH-MHL",
    "Dior-s": "MHM-MMH-MHM-HMH-LHL",
    "BOSS": "HHH-HMH-MMH-HHH-LHL",
    "THAN-K": "MHM-HMM-HHM-MMH-MHL",
    "OH-NO": "HHL-LMH-LHH-HHM-LHL",
    "GOGO": "HHM-HMH-MMH-HHH-MHM",
    "SEXY": "HMH-HHL-HMM-HMM-HLH",
    "LOVE-R": "MLH-LHL-HLH-MLM-MLH",
    "MUM": "MMH-MHL-HMM-LMM-HLL",
    "FAKE": "HLM-MML-MLM-MLM-HLH",
    "OJBK": "MMH-MMM-HML-LMM-MML",
    "MALO": "MLH-MHM-MLH-MLH-LMH",
    "JOKE-R": "LLH-LHL-LML-LLL-MLM",
    "WOC!": "HHL-HMH-MMH-HHM-LHH",
    "THIN-K": "HHL-HMH-MLH-MHM-LHH",
    "SHIT": "HHL-HLH-LMM-HHM-LHH",
    "ZZZZ": "MHL-MLH-LML-MML-LHM",
    "POOR": "HHL-MLH-LMH-HHH-LHL",
    "MONK": "HHL-LLH-LLM-MML-LHM",
    "IMSB": "LLM-LMM-LLL-LLL-MLM",
    "SOLO": "LML-LLH-LHL-LML-LHM",
    "FUCK": "MLL-LHL-LLM-MLL-HLH",
    "DEAD": "LLL-LLM-LML-LLL-LHM",
    "IMFW": "LLH-LHL-LML-LLL-MLL",
}

SPECIAL_TYPES = {"DRUNK", "HHHH"}


@dataclass
class RankResult:
    code: str
    distance: int
    exact: int
    similarity: int


def level_num(level: str) -> int:
    return {"L": 1, "M": 2, "H": 3}[level]


def score_to_level(score: int) -> str:
    if score <= 3:
        return "L"
    if score == 4:
        return "M"
    return "H"


def parse_pattern(pattern: str) -> list[str]:
    return [x for x in pattern if x in {"L", "M", "H"}]


def score_dimensions(answers: list[int]) -> tuple[dict[str, int], dict[str, str]]:
    raw = {dim: 0 for dim in DIMENSION_ORDER}
    for qid, val in enumerate(answers, start=1):
        raw[QUESTION_TO_DIM[qid]] += val
    levels = {dim: score_to_level(raw[dim]) for dim in DIMENSION_ORDER}
    return raw, levels


def rank_normal_types(levels: dict[str, str]) -> list[RankResult]:
    user_vec = [level_num(levels[dim]) for dim in DIMENSION_ORDER]
    ranks: list[RankResult] = []
    for code, pat in NORMAL_TYPES.items():
        vec = [level_num(x) for x in parse_pattern(pat)]
        distance = 0
        exact = 0
        for a, b in zip(user_vec, vec):
            diff = abs(a - b)
            distance += diff
            if diff == 0:
                exact += 1
        similarity = max(0, round((1 - distance / 30) * 100))
        ranks.append(RankResult(code=code, distance=distance, exact=exact, similarity=similarity))
    ranks.sort(key=lambda x: (x.distance, -x.exact, -x.similarity))
    return ranks


def compute_final_type(
    answers: list[int], drink_hobby: int | None = None, drink_attitude: int | None = None
) -> tuple[str, RankResult, dict[str, int], dict[str, str]]:
    raw, levels = score_dimensions(answers)
    ranks = rank_normal_types(levels)
    best = ranks[0]
    drunk_triggered = drink_hobby == 3 and drink_attitude == 2
    if drunk_triggered:
        return "DRUNK", best, raw, levels
    if best.similarity < 60:
        return "HHHH", best, raw, levels
    return best.code, best, raw, levels


def canonical_answers_for_type(type_code: str) -> list[int]:
    if type_code not in NORMAL_TYPES:
        raise ValueError(f"仅支持 NORMAL_TYPES 反推，当前不支持: {type_code}")
    pattern = parse_pattern(NORMAL_TYPES[type_code])
    pair_val = {"L": [1, 1], "M": [2, 2], "H": [3, 3]}
    answers = [0] * 30
    for dim, level in zip(DIMENSION_ORDER, pattern):
        q1, q2 = DIM_TO_QUESTIONS[dim]
        v1, v2 = pair_val[level]
        answers[q1 - 1] = v1
        answers[q2 - 1] = v2
    return answers


def parse_answers(raw: str) -> list[int]:
    vals = [int(x.strip()) for x in raw.split(",") if x.strip()]
    if len(vals) != 30:
        raise ValueError(f"--answers 需要 30 个值，当前为 {len(vals)}")
    if any(v not in (1, 2, 3) for v in vals):
        raise ValueError("--answers 只能包含 1/2/3")
    return vals


def main() -> None:
    parser = argparse.ArgumentParser(description="SBTI 类型预测/反推")
    parser.add_argument(
        "--answers",
        help="30题答案（逗号分隔，仅1/2/3），例如: 1,2,3,...",
    )
    parser.add_argument("--drink-hobby", type=int, choices=[1, 2, 3, 4], help="饮酒分支Q1答案")
    parser.add_argument("--drink-attitude", type=int, choices=[1, 2], help="饮酒分支Q2答案")
    parser.add_argument(
        "--generate",
        help="按人格模板生成一组“典型答案”（仅NORMAL_TYPES）。",
    )
    args = parser.parse_args()

    if args.generate:
        code = args.generate.strip()
        if code in SPECIAL_TYPES:
            if code == "DRUNK":
                print("DRUNK 触发条件：drink_gate_q1=3 且 drink_gate_q2=2（与30题常规答案无关）。")
                return
            print("HHHH 触发条件：最佳常规人格 similarity < 60%。")
            return
        vals = canonical_answers_for_type(code)
        print(f"{code} 典型答案（Q1..Q30）:")
        print(",".join(map(str, vals)))
        return

    if not args.answers:
        parser.error("请提供 --answers，或使用 --generate")

    answers = parse_answers(args.answers)
    final_code, best, raw, levels = compute_final_type(
        answers=answers,
        drink_hobby=args.drink_hobby,
        drink_attitude=args.drink_attitude,
    )

    print(f"Final: {final_code}")
    print(f"Best normal: {best.code} (similarity={best.similarity}%, distance={best.distance}, exact={best.exact}/15)")
    print("Dimension levels:")
    print(" ".join(f"{d}:{levels[d]}({raw[d]})" for d in DIMENSION_ORDER))


if __name__ == "__main__":
    main()

