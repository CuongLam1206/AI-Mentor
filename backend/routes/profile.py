"""
routes/profile.py – API cho hồ sơ học viên.
"""

from fastapi import APIRouter
from services import learner_profile_service

router = APIRouter(prefix="/api/profile", tags=["profile"])


@router.get("/{user_id}")
async def lay_profile(user_id: str):
    profile = await learner_profile_service.get_profile(user_id)
    return {"profile": profile}


@router.put("/{user_id}")
async def cap_nhat_profile(user_id: str, data: dict):
    profile = await learner_profile_service.upsert_profile(user_id, data)
    return {"profile": profile, "message": "Đã lưu hồ sơ thành công"}
