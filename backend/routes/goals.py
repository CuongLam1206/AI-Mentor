"""
routes/goals.py – API cho mục tiêu & lộ trình.
"""

from fastapi import APIRouter
from services import goal_service

router = APIRouter(prefix="/api/goals", tags=["goals"])


@router.get("")
async def lay_danh_sach(user_id: str = "default"):
    goals = await goal_service.lay_muc_tieu_user(user_id)
    for g in goals:
        for key in ("created_at", "updated_at"):
            if key in g and g[key]:
                g[key] = str(g[key])
    return {"goals": goals}


@router.get("/{goal_id}")
async def lay_chi_tiet(goal_id: str):
    goal = await goal_service.lay_muc_tieu(goal_id)
    plan = await goal_service.lay_lo_trinh(goal_id)
    for obj in [goal, plan]:
        if obj:
            for key in ("created_at", "updated_at"):
                if key in obj and obj[key]:
                    obj[key] = str(obj[key])
    return {"goal": goal, "plan": plan}


@router.delete("/{goal_id}")
async def xoa_goal(goal_id: str):
    ok = await goal_service.xoa_muc_tieu(goal_id)
    return {"success": ok}
