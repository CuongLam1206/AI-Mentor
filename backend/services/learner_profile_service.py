"""
services/learner_profile_service.py – Quản lý hồ sơ học viên.
"""

from datetime import datetime, timezone
from typing import Optional
from core.database import get_db


def _col():
    return get_db().learner_profiles


async def upsert_profile(user_id: str, data: dict) -> dict:
    """Tạo hoặc cập nhật profile học viên."""
    now = datetime.now(timezone.utc)
    update_data = {
        "user_id": user_id,
        "name": data.get("name", ""),
        "level": data.get("level", "Beginner"),
        "target": data.get("target", ""),
        "target_score": data.get("target_score"),
        "current_score": data.get("current_score"),
        "deadline": data.get("deadline", ""),
        "daily_hours": data.get("daily_hours", 2),
        "weak_skills": data.get("weak_skills", []),
        "strong_skills": data.get("strong_skills", []),
        "interests": data.get("interests", []),
        "learning_style": data.get("learning_style", ""),
        "notes": data.get("notes", ""),
        "updated_at": now,
    }
    existing = await _col().find_one({"user_id": user_id})
    if not existing:
        update_data["created_at"] = now
    await _col().update_one({"user_id": user_id}, {"$set": update_data}, upsert=True)
    return await _col().find_one({"user_id": user_id}, {"_id": 0})


async def get_profile(user_id: str) -> Optional[dict]:
    """Lấy profile học viên."""
    return await _col().find_one({"user_id": user_id}, {"_id": 0})


async def build_context(user_id: str) -> str:
    """Tổng hợp profile → context string cho system prompt."""
    profile = await get_profile(user_id)
    if not profile or not profile.get("name"):
        return "[Learner Profile]\nHọc viên chưa thiết lập hồ sơ. Hãy gợi ý họ vào Cài đặt → Hồ sơ học viên.\n[End Profile]"
    lines = ["[Learner Profile]"]
    lines.append(f"- Tên: {profile['name']}")
    lines.append(f"- Trình độ: {profile.get('level', 'Chưa xác định')}")
    if profile.get("target"):      lines.append(f"- Mục tiêu: {profile['target']}")
    if profile.get("target_score"): lines.append(f"- Điểm mục tiêu: {profile['target_score']}")
    if profile.get("current_score"): lines.append(f"- Điểm hiện tại: {profile['current_score']}")
    if profile.get("deadline"):    lines.append(f"- Deadline: {profile['deadline']}")
    if profile.get("daily_hours"): lines.append(f"- Thời gian học: {profile['daily_hours']}h/ngày")
    if profile.get("weak_skills"): lines.append(f"- Kỹ năng yếu: {', '.join(profile['weak_skills'])}")
    if profile.get("strong_skills"): lines.append(f"- Kỹ năng mạnh: {', '.join(profile['strong_skills'])}")
    if profile.get("notes"):       lines.append(f"- Ghi chú: {profile['notes']}")
    lines.append("[End Profile]")
    return "\n".join(lines)
