"""
services/goal_service.py – Quản lý mục tiêu & lộ trình học tập.
"""

import uuid
from datetime import datetime, timezone
from typing import Optional

from core.database import get_db


def _db():
    return get_db()


# ===== GOALS =====

async def tao_muc_tieu(user_id: str, data: dict) -> dict:
    goal = {
        "goal_id": f"goal_{uuid.uuid4().hex[:8]}",
        "user_id": user_id,
        "title": data.get("title", ""),
        "target_score": data.get("target_score"),
        "current_level": data.get("current_level", ""),
        "deadline": data.get("deadline", ""),
        "weekly_hours": data.get("weekly_hours", 10),
        "daily_hours": data.get("daily_hours", 2),
        "weak_skills": data.get("weak_skills", []),
        "status": "active",
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }
    await _db().learning_goals.insert_one(goal)
    goal.pop("_id", None)
    return goal


async def lay_muc_tieu_user(user_id: str) -> list:
    cursor = _db().learning_goals.find({"user_id": user_id}, {"_id": 0}).sort("created_at", -1)
    return await cursor.to_list(length=50)


async def lay_muc_tieu(goal_id: str) -> Optional[dict]:
    return await _db().learning_goals.find_one({"goal_id": goal_id}, {"_id": 0})


async def cap_nhat_muc_tieu(goal_id: str, data: dict) -> bool:
    data["updated_at"] = datetime.now(timezone.utc)
    result = await _db().learning_goals.update_one({"goal_id": goal_id}, {"$set": data})
    return result.modified_count > 0


async def xoa_muc_tieu(goal_id: str) -> bool:
    r1 = await _db().learning_goals.delete_one({"goal_id": goal_id})
    await _db().learning_plans.delete_many({"goal_id": goal_id})
    return r1.deleted_count > 0


# ===== LEARNING PLANS =====

async def luu_lo_trinh(goal_id: str, user_id: str, milestones: list) -> dict:
    plan = {
        "plan_id": f"plan_{uuid.uuid4().hex[:8]}",
        "goal_id": goal_id,
        "user_id": user_id,
        "milestones": milestones,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }
    await _db().learning_plans.delete_many({"goal_id": goal_id})
    await _db().learning_plans.insert_one(plan)
    plan.pop("_id", None)
    return plan


async def lay_lo_trinh(goal_id: str) -> Optional[dict]:
    return await _db().learning_plans.find_one({"goal_id": goal_id}, {"_id": 0})


async def cap_nhat_tien_do_milestone(goal_id: str, milestone_id: str, data: dict) -> bool:
    result = await _db().learning_plans.update_one(
        {"goal_id": goal_id, "milestones.milestone_id": milestone_id},
        {"$set": {
            "milestones.$.status": data.get("status", "in_progress"),
            "milestones.$.progress_pct": data.get("progress_pct", 0),
            "updated_at": datetime.now(timezone.utc),
        }}
    )
    return result.modified_count > 0


# ===== COURSE PROGRESS =====

async def lay_tien_do_khoa_hoc(user_id: str) -> dict:
    doc = await _db().course_progress.find_one({"user_id": user_id}, {"_id": 0})
    if doc:
        return doc.get("progress", {})
    return {}


async def cap_nhat_tien_do_khoa_hoc(user_id: str, course_id: str, progress_pct: int) -> None:
    await _db().course_progress.update_one(
        {"user_id": user_id},
        {"$set": {f"progress.{course_id}": progress_pct}},
        upsert=True,
    )


async def seed_tien_do_mau(user_id: str = "default"):
    """Tạo dữ liệu mẫu cho học viên mới — chỉ seed nếu chưa có dữ liệu thật."""
    # Course progress: seed nếu chưa có đủ data
    existing = await _db().course_progress.find_one({"user_id": user_id})
    if not (existing and len(existing.get("progress", {})) > 15):
        mock_progress = {
            "math_basic": 100, "math_geometry": 75, "math_algebra2": 40,
            "math_probability": 15, "math_calculus": 0, "math_exam_prep": 0,
            "ielts_reading_basic": 90, "ielts_reading_strategies": 35,
            "ielts_listening_basic": 65, "ielts_listening_strategies": 10,
            "ielts_vocab_65": 55, "ielts_grammar": 40,
            "ielts_writing_task1": 0, "ielts_writing_task2": 0,
            "ielts_speaking": 20, "ielts_mock_tests": 0,
            "python_intro": 60, "python_data_structures": 15,
            "python_oop": 0, "python_web": 0,
            "python_data_science": 0, "python_ml_intro": 0, "python_projects": 0,
        }
        await _db().course_progress.update_one(
            {"user_id": user_id},
            {"$set": {"progress": mock_progress, "user_id": user_id}},
            upsert=True,
        )

    # Goals & plans: CHỈ seed nếu user chưa có mục tiêu nào trong DB
    existing_goals_count = await _db().learning_goals.count_documents({"user_id": user_id})
    if existing_goals_count > 0:
        print(f"ℹ️ User '{user_id}' đã có {existing_goals_count} mục tiêu — bỏ qua seed goals.")
        return

    now = datetime.now(timezone.utc)
    goal_math = {"goal_id": "goal_math_001", "user_id": user_id, "title": "Đạt 8+ điểm Toán thi Đại Học", "target_score": 8.0, "current_level": "6.5/10", "deadline": "2026-06-15", "weekly_hours": 8, "daily_hours": 1.5, "weak_skills": ["calculus", "probability"], "status": "active", "created_at": now, "updated_at": now}
    goal_ielts = {"goal_id": "goal_ielts_001", "user_id": user_id, "title": "Đạt IELTS 6.5", "target_score": 6.5, "current_level": "5.0", "deadline": "2026-09-01", "weekly_hours": 10, "daily_hours": 2, "weak_skills": ["writing", "speaking"], "status": "active", "created_at": now, "updated_at": now}
    goal_python = {"goal_id": "goal_python_001", "user_id": user_id, "title": "Thành thạo Python để làm Data Science", "target_score": None, "current_level": "Beginner", "deadline": "2026-12-31", "weekly_hours": 6, "daily_hours": 1, "weak_skills": ["data_structures", "oop"], "status": "active", "created_at": now, "updated_at": now}
    await _db().learning_goals.insert_many([goal_math, goal_ielts, goal_python])

    plan_math = {"plan_id": "plan_math_001", "goal_id": "goal_math_001", "user_id": user_id, "milestones": [{"milestone_id": "ms_math_01", "title": "Nền tảng Đại Số & Hình Học", "month": 1, "courses": [{"course_id": "math_basic", "priority": 1}, {"course_id": "math_geometry", "priority": 2}], "target": "Hoàn thành 2 khóa nền tảng", "status": "in_progress", "progress_pct": 88}, {"milestone_id": "ms_math_02", "title": "Đại Số Nâng Cao & Xác Suất", "month": 2, "courses": [{"course_id": "math_algebra2", "priority": 1}, {"course_id": "math_probability", "priority": 2}], "target": "Nắm vững hàm số, đồ thị, xác suất", "status": "in_progress", "progress_pct": 28}, {"milestone_id": "ms_math_03", "title": "Giải Tích", "month": 4, "courses": [{"course_id": "math_calculus", "priority": 1}], "target": "Đạo hàm, tích phân thành thạo", "status": "pending", "progress_pct": 0}, {"milestone_id": "ms_math_04", "title": "Luyện Đề Thi", "month": 5, "courses": [{"course_id": "math_exam_prep", "priority": 1}], "target": "≥ 8 điểm ở 80% đề thi thử", "status": "pending", "progress_pct": 0}], "created_at": now, "updated_at": now}
    plan_ielts = {"plan_id": "plan_ielts_001", "goal_id": "goal_ielts_001", "user_id": user_id, "milestones": [{"milestone_id": "ms_ielts_01", "title": "Nền tảng Reading & Listening + Vocab", "month": 1, "courses": [{"course_id": "ielts_reading_basic", "priority": 1}, {"course_id": "ielts_listening_basic", "priority": 2}, {"course_id": "ielts_vocab_65", "priority": 3}, {"course_id": "ielts_grammar", "priority": 4}], "target": "Hoàn thành 4 khóa nền tảng", "status": "in_progress", "progress_pct": 63}, {"milestone_id": "ms_ielts_02", "title": "Chiến thuật Reading & Listening", "month": 3, "courses": [{"course_id": "ielts_reading_strategies", "priority": 1}, {"course_id": "ielts_listening_strategies", "priority": 2}], "target": "Nắm chiến thuật, đạt 6.5 R&L", "status": "in_progress", "progress_pct": 23}, {"milestone_id": "ms_ielts_03", "title": "Writing & Speaking", "month": 4, "courses": [{"course_id": "ielts_writing_task1", "priority": 1}, {"course_id": "ielts_writing_task2", "priority": 2}, {"course_id": "ielts_speaking", "priority": 3}], "target": "Đạt 6.0 Writing & Speaking", "status": "pending", "progress_pct": 7}, {"milestone_id": "ms_ielts_04", "title": "Mock Test & Sprint Cuối", "month": 6, "courses": [{"course_id": "ielts_mock_tests", "priority": 1}], "target": "≥ 6.5 overall ở mock test", "status": "pending", "progress_pct": 0}], "created_at": now, "updated_at": now}
    plan_python = {"plan_id": "plan_python_001", "goal_id": "goal_python_001", "user_id": user_id, "milestones": [{"milestone_id": "ms_python_01", "title": "Python Cơ Bản", "month": 1, "courses": [{"course_id": "python_intro", "priority": 1}], "target": "Biến, hàm, vòng lặp, I/O", "status": "in_progress", "progress_pct": 60}, {"milestone_id": "ms_python_02", "title": "Cấu Trúc Dữ Liệu & OOP", "month": 3, "courses": [{"course_id": "python_data_structures", "priority": 1}, {"course_id": "python_oop", "priority": 2}], "target": "DS, thuật toán, Class/Object", "status": "in_progress", "progress_pct": 8}, {"milestone_id": "ms_python_03", "title": "Dự Án Thực Tế & Web", "month": 5, "courses": [{"course_id": "python_web", "priority": 1}, {"course_id": "python_projects", "priority": 2}], "target": "Build được web app + 2 projects", "status": "pending", "progress_pct": 0}, {"milestone_id": "ms_python_04", "title": "Data Science & ML", "month": 8, "courses": [{"course_id": "python_data_science", "priority": 1}, {"course_id": "python_ml_intro", "priority": 2}], "target": "Phân tích dữ liệu, train model cơ bản", "status": "pending", "progress_pct": 0}], "created_at": now, "updated_at": now}
    await _db().learning_plans.insert_many([plan_math, plan_ielts, plan_python])
    print(f"✅ Đã seed dữ liệu mẫu cho: {user_id}")



# ===== CONTEXT BUILDER =====

async def xay_dung_context_hoc_vien(user_id: str) -> str:
    goals = await lay_muc_tieu_user(user_id)

    if not goals:
        return "[Mục tiêu & Tiến độ]\nHọc viên chưa có mục tiêu học tập nào.\n[End]"

    lines = ["[Mục tiêu & Tiến độ học viên]"]
    lines.append(f"Tổng số mục tiêu: {len(goals)}")

    for idx, goal in enumerate(goals, 1):
        lines.append(f"\n--- Mục tiêu {idx}: {goal['title']} ---")
        if goal.get("target_score"):  lines.append(f"  • Target: {goal['target_score']}")
        if goal.get("current_level"): lines.append(f"  • Trình độ hiện tại: {goal['current_level']}")
        if goal.get("deadline"):      lines.append(f"  • Deadline: {goal['deadline']}")
        if goal.get("daily_hours"):   lines.append(f"  • Thời gian: {goal['daily_hours']}h/ngày")
        if goal.get("weak_skills"):   lines.append(f"  • Kỹ năng yếu: {', '.join(goal['weak_skills'])}")

        plan = await lay_lo_trinh(goal["goal_id"])
        if plan and plan.get("milestones"):
            milestones = plan["milestones"]
            total = len(milestones)
            done = sum(1 for m in milestones if m.get("status") == "completed")
            in_progress = [m for m in milestones if m.get("status") == "in_progress"]

            lines.append(f"  • Milestones: {done}/{total} hoàn thành")

            # Chi tiết milestones đang học — bao gồm resource completion
            for ms in in_progress:
                ms_pct = ms.get("progress_pct", 0)
                lines.append(f"  • [Đang học] {ms['title']} ({ms_pct}%)")
                resources = ms.get("resources", [])
                if resources:
                    for r in resources:
                        if isinstance(r, dict):
                            name = r.get("name", "?")
                            done_flag = "✅" if r.get("completed") else "⭕"
                            skills = r.get("skills", [])
                            skills_str = f" → {', '.join(skills[:2])}" if skills else ""
                            lines.append(f"    {done_flag} {name}{skills_str}")
                        else:
                            lines.append(f"    ⭕ {r}")
                if ms.get("topics"):
                    lines.append(f"    📚 Chủ đề: {', '.join(ms['topics'][:3])}")

            # Milestone tiếp theo
            pending = next((m for m in milestones if m.get("status") == "pending"), None)
            if pending:
                lines.append(f"  • [Tiếp theo] {pending['title']}: {pending.get('target','')}")
        else:
            lines.append("  • Chưa có lộ trình chi tiết")

    lines.append("\n[End]")
    return "\n".join(lines)
