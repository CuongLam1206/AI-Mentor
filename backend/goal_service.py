"""
Learnify Tutor AI – Dịch vụ quản lý mục tiêu & lộ trình
CRUD cho learning_goals, learning_plans.
"""

import os
import uuid
from datetime import datetime, timezone
from typing import Optional

from motor.motor_asyncio import AsyncIOMotorClient

# Dùng chung kết nối MongoDB từ chat_service
_db = None


def set_db(db):
    """Nhận reference database từ chat_service."""
    global _db
    _db = db


# ===== GOALS =====

async def tao_muc_tieu(user_id: str, data: dict) -> dict:
    """Tạo mục tiêu học tập mới."""
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
    await _db.learning_goals.insert_one(goal)
    goal.pop("_id", None)
    return goal


async def lay_muc_tieu_user(user_id: str) -> list[dict]:
    """Lấy danh sách mục tiêu của user."""
    cursor = _db.learning_goals.find(
        {"user_id": user_id},
        {"_id": 0}
    ).sort("created_at", -1)
    return await cursor.to_list(length=50)


async def lay_muc_tieu(goal_id: str) -> Optional[dict]:
    """Lấy 1 mục tiêu theo ID."""
    return await _db.learning_goals.find_one(
        {"goal_id": goal_id}, {"_id": 0}
    )


async def cap_nhat_muc_tieu(goal_id: str, data: dict) -> bool:
    """Cập nhật mục tiêu."""
    data["updated_at"] = datetime.now(timezone.utc)
    result = await _db.learning_goals.update_one(
        {"goal_id": goal_id},
        {"$set": data}
    )
    return result.modified_count > 0


async def xoa_muc_tieu(goal_id: str) -> bool:
    """Xóa mục tiêu và lộ trình liên quan."""
    r1 = await _db.learning_goals.delete_one({"goal_id": goal_id})
    await _db.learning_plans.delete_many({"goal_id": goal_id})
    return r1.deleted_count > 0


# ===== LEARNING PLANS =====

async def luu_lo_trinh(goal_id: str, user_id: str, milestones: list) -> dict:
    """Lưu lộ trình học (do AI tạo) vào DB."""
    plan = {
        "plan_id": f"plan_{uuid.uuid4().hex[:8]}",
        "goal_id": goal_id,
        "user_id": user_id,
        "milestones": milestones,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }
    # Xóa plan cũ nếu có
    await _db.learning_plans.delete_many({"goal_id": goal_id})
    await _db.learning_plans.insert_one(plan)
    plan.pop("_id", None)
    return plan


async def lay_lo_trinh(goal_id: str) -> Optional[dict]:
    """Lấy lộ trình theo goal."""
    return await _db.learning_plans.find_one(
        {"goal_id": goal_id}, {"_id": 0}
    )


async def cap_nhat_tien_do_milestone(goal_id: str, milestone_id: str, data: dict) -> bool:
    """Cập nhật tiến độ 1 milestone."""
    result = await _db.learning_plans.update_one(
        {"goal_id": goal_id, "milestones.milestone_id": milestone_id},
        {"$set": {
            "milestones.$.status": data.get("status", "in_progress"),
            "milestones.$.progress_pct": data.get("progress_pct", 0),
            "updated_at": datetime.now(timezone.utc),
        }}
    )
    return result.modified_count > 0


# ===== COURSE PROGRESS (giả lập) =====

async def lay_tien_do_khoa_hoc(user_id: str) -> dict:
    """Lấy tiến độ các khóa học của user. Trả về {course_id: progress_pct}."""
    doc = await _db.course_progress.find_one(
        {"user_id": user_id}, {"_id": 0}
    )
    if doc:
        return doc.get("progress", {})
    return {}


async def cap_nhat_tien_do_khoa_hoc(user_id: str, course_id: str, progress_pct: int) -> None:
    """Cập nhật tiến độ 1 khóa học."""
    await _db.course_progress.update_one(
        {"user_id": user_id},
        {"$set": {f"progress.{course_id}": progress_pct}},
        upsert=True,
    )


async def seed_tien_do_mau(user_id: str = "default"):
    """Tạo dữ liệu mẫu: 1 học viên đang học 3 môn (Toán, IELTS, Python)."""

    # Kiểm tra đã seed chưa (data mới có > 15 khóa)
    existing = await _db.course_progress.find_one({"user_id": user_id})
    if existing and len(existing.get("progress", {})) > 15:
        return  # Đã seed rồi, không seed lại

    # ===== TIẾN ĐỘ KHÓA HỌC =====
    mock_progress = {
        # Toán – đang học tốt
        "math_basic": 100,
        "math_geometry": 75,
        "math_algebra2": 40,
        "math_probability": 15,
        "math_calculus": 0,
        "math_exam_prep": 0,
        # IELTS – đang học trung bình
        "ielts_reading_basic": 90,
        "ielts_reading_strategies": 35,
        "ielts_listening_basic": 65,
        "ielts_listening_strategies": 10,
        "ielts_vocab_65": 55,
        "ielts_grammar": 40,
        "ielts_writing_task1": 0,
        "ielts_writing_task2": 0,
        "ielts_speaking": 20,
        "ielts_mock_tests": 0,
        # Python – mới bắt đầu
        "python_intro": 60,
        "python_data_structures": 15,
        "python_oop": 0,
        "python_web": 0,
        "python_data_science": 0,
        "python_ml_intro": 0,
        "python_projects": 0,
    }
    await _db.course_progress.update_one(
        {"user_id": user_id},
        {"$set": {"progress": mock_progress, "user_id": user_id}},
        upsert=True,
    )

    # ===== XÓA GOALS/PLANS CŨ =====
    await _db.learning_goals.delete_many({"user_id": user_id})
    await _db.learning_plans.delete_many({"user_id": user_id})

    # ===== TẠO 3 MỤC TIÊU =====
    now = datetime.now(timezone.utc)

    # Goal 1: Toán
    goal_math = {
        "goal_id": "goal_math_001",
        "user_id": user_id,
        "title": "Đạt 8+ điểm Toán thi Đại Học",
        "target_score": 8.0,
        "current_level": "6.5/10",
        "deadline": "2026-06-15",
        "weekly_hours": 8,
        "daily_hours": 1.5,
        "weak_skills": ["calculus", "probability"],
        "status": "active",
        "created_at": now,
        "updated_at": now,
    }

    # Goal 2: IELTS
    goal_ielts = {
        "goal_id": "goal_ielts_001",
        "user_id": user_id,
        "title": "Đạt IELTS 6.5",
        "target_score": 6.5,
        "current_level": "5.0",
        "deadline": "2026-09-01",
        "weekly_hours": 10,
        "daily_hours": 2,
        "weak_skills": ["writing", "speaking"],
        "status": "active",
        "created_at": now,
        "updated_at": now,
    }

    # Goal 3: Python
    goal_python = {
        "goal_id": "goal_python_001",
        "user_id": user_id,
        "title": "Thành thạo Python để làm Data Science",
        "target_score": None,
        "current_level": "Beginner",
        "deadline": "2026-12-31",
        "weekly_hours": 6,
        "daily_hours": 1,
        "weak_skills": ["data_structures", "oop"],
        "status": "active",
        "created_at": now,
        "updated_at": now,
    }

    await _db.learning_goals.insert_many([goal_math, goal_ielts, goal_python])

    # ===== TẠO 3 LỘ TRÌNH =====

    # Plan Toán
    plan_math = {
        "plan_id": "plan_math_001",
        "goal_id": "goal_math_001",
        "user_id": user_id,
        "milestones": [
            {
                "milestone_id": "ms_math_01",
                "title": "Nền tảng Đại Số & Hình Học",
                "month": 1,
                "courses": [
                    {"course_id": "math_basic", "priority": 1},
                    {"course_id": "math_geometry", "priority": 2},
                ],
                "target": "Hoàn thành 2 khóa nền tảng",
                "status": "in_progress",
                "progress_pct": 88,
            },
            {
                "milestone_id": "ms_math_02",
                "title": "Đại Số Nâng Cao & Xác Suất",
                "month": 2,
                "courses": [
                    {"course_id": "math_algebra2", "priority": 1},
                    {"course_id": "math_probability", "priority": 2},
                ],
                "target": "Nắm vững hàm số, đồ thị, xác suất",
                "status": "in_progress",
                "progress_pct": 28,
            },
            {
                "milestone_id": "ms_math_03",
                "title": "Giải Tích",
                "month": 4,
                "courses": [
                    {"course_id": "math_calculus", "priority": 1},
                ],
                "target": "Đạo hàm, tích phân thành thạo",
                "status": "pending",
                "progress_pct": 0,
            },
            {
                "milestone_id": "ms_math_04",
                "title": "Luyện Đề Thi",
                "month": 5,
                "courses": [
                    {"course_id": "math_exam_prep", "priority": 1},
                ],
                "target": "≥ 8 điểm ở 80% đề thi thử",
                "status": "pending",
                "progress_pct": 0,
            },
        ],
        "created_at": now,
        "updated_at": now,
    }

    # Plan IELTS
    plan_ielts = {
        "plan_id": "plan_ielts_001",
        "goal_id": "goal_ielts_001",
        "user_id": user_id,
        "milestones": [
            {
                "milestone_id": "ms_ielts_01",
                "title": "Nền tảng Reading & Listening + Vocab",
                "month": 1,
                "courses": [
                    {"course_id": "ielts_reading_basic", "priority": 1},
                    {"course_id": "ielts_listening_basic", "priority": 2},
                    {"course_id": "ielts_vocab_65", "priority": 3},
                    {"course_id": "ielts_grammar", "priority": 4},
                ],
                "target": "Hoàn thành 4 khóa nền tảng",
                "status": "in_progress",
                "progress_pct": 63,
            },
            {
                "milestone_id": "ms_ielts_02",
                "title": "Chiến thuật Reading & Listening",
                "month": 3,
                "courses": [
                    {"course_id": "ielts_reading_strategies", "priority": 1},
                    {"course_id": "ielts_listening_strategies", "priority": 2},
                ],
                "target": "Nắm chiến thuật, đạt 6.5 R&L",
                "status": "in_progress",
                "progress_pct": 23,
            },
            {
                "milestone_id": "ms_ielts_03",
                "title": "Writing & Speaking",
                "month": 4,
                "courses": [
                    {"course_id": "ielts_writing_task1", "priority": 1},
                    {"course_id": "ielts_writing_task2", "priority": 2},
                    {"course_id": "ielts_speaking", "priority": 3},
                ],
                "target": "Đạt 6.0 Writing & Speaking",
                "status": "pending",
                "progress_pct": 7,
            },
            {
                "milestone_id": "ms_ielts_04",
                "title": "Mock Test & Sprint Cuối",
                "month": 6,
                "courses": [
                    {"course_id": "ielts_mock_tests", "priority": 1},
                ],
                "target": "≥ 6.5 overall ở mock test",
                "status": "pending",
                "progress_pct": 0,
            },
        ],
        "created_at": now,
        "updated_at": now,
    }

    # Plan Python
    plan_python = {
        "plan_id": "plan_python_001",
        "goal_id": "goal_python_001",
        "user_id": user_id,
        "milestones": [
            {
                "milestone_id": "ms_python_01",
                "title": "Python Cơ Bản",
                "month": 1,
                "courses": [
                    {"course_id": "python_intro", "priority": 1},
                ],
                "target": "Biến, hàm, vòng lặp, I/O",
                "status": "in_progress",
                "progress_pct": 60,
            },
            {
                "milestone_id": "ms_python_02",
                "title": "Cấu Trúc Dữ Liệu & OOP",
                "month": 3,
                "courses": [
                    {"course_id": "python_data_structures", "priority": 1},
                    {"course_id": "python_oop", "priority": 2},
                ],
                "target": "DS, thuật toán, Class/Object",
                "status": "in_progress",
                "progress_pct": 8,
            },
            {
                "milestone_id": "ms_python_03",
                "title": "Dự Án Thực Tế & Web",
                "month": 5,
                "courses": [
                    {"course_id": "python_web", "priority": 1},
                    {"course_id": "python_projects", "priority": 2},
                ],
                "target": "Build được web app + 2 projects",
                "status": "pending",
                "progress_pct": 0,
            },
            {
                "milestone_id": "ms_python_04",
                "title": "Data Science & ML",
                "month": 8,
                "courses": [
                    {"course_id": "python_data_science", "priority": 1},
                    {"course_id": "python_ml_intro", "priority": 2},
                ],
                "target": "Phân tích dữ liệu, train model cơ bản",
                "status": "pending",
                "progress_pct": 0,
            },
        ],
        "created_at": now,
        "updated_at": now,
    }

    await _db.learning_plans.insert_many([plan_math, plan_ielts, plan_python])
    print(f"✅ Đã seed dữ liệu mẫu cho học viên: {user_id} (3 môn: Toán, IELTS, Python)")


# ===== CONTEXT BUILDER (Cho AI) =====

async def xay_dung_context_hoc_vien(user_id: str) -> str:
    """Xây dựng context string để inject vào AI prompt."""
    goals = await lay_muc_tieu_user(user_id)
    progress = await lay_tien_do_khoa_hoc(user_id)

    if not goals:
        return "[Student Context]\nHọc viên chưa có mục tiêu học tập nào. Hãy hỏi họ muốn đạt được gì.\n[End Context]"

    goal = goals[0]  # Lấy goal active mới nhất
    plan = await lay_lo_trinh(goal["goal_id"])

    lines = ["[Student Context]"]
    lines.append(f"- Mục tiêu: {goal['title']}")
    if goal.get("target_score"):
        lines.append(f"- Điểm target: {goal['target_score']}")
    if goal.get("current_level"):
        lines.append(f"- Trình độ hiện tại: {goal['current_level']}")
    if goal.get("deadline"):
        lines.append(f"- Deadline: {goal['deadline']}")
    lines.append(f"- Thời gian: {goal.get('weekly_hours', '?')}h/tuần, {goal.get('daily_hours', '?')}h/ngày")
    if goal.get("weak_skills"):
        lines.append(f"- Kỹ năng yếu: {', '.join(goal['weak_skills'])}")

    if plan and plan.get("milestones"):
        current_ms = None
        for ms in plan["milestones"]:
            if ms.get("status") == "in_progress":
                current_ms = ms
                break
        if not current_ms:
            # Tìm milestone pending đầu tiên
            for ms in plan["milestones"]:
                if ms.get("status") in ("pending", None):
                    current_ms = ms
                    break

        if current_ms:
            lines.append(f"- Milestone hiện tại: {current_ms['title']} ({current_ms.get('progress_pct', 0)}%)")
            course_ids = [c["course_id"] for c in current_ms.get("courses", [])]
            lines.append(f"- Khóa đang trong milestone: {', '.join(course_ids)}")

        # Tổng tiến độ
        total = len(plan["milestones"])
        completed = sum(1 for ms in plan["milestones"] if ms.get("status") == "completed")
        lines.append(f"- Tiến độ milestones: {completed}/{total}")

    if progress:
        prog_lines = []
        for cid, pct in progress.items():
            prog_lines.append(f"  {cid}: {pct}%")
        lines.append("- Tiến độ khóa học:\n" + "\n".join(prog_lines))

    lines.append("[End Context]")
    return "\n".join(lines)
