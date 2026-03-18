"""
routes/conversations.py – API cho lịch sử hội thoại.
"""

from fastapi import APIRouter, Query
from services import chat_service

router = APIRouter(prefix="/api/conversations", tags=["conversations"])


@router.get("")
async def lay_danh_sach(user_id: str = Query(default="guest")):
    return {"conversations": await chat_service.lay_danh_sach_hoi_thoai(user_id)}


@router.delete("/{session_id}")
async def xoa_mot(session_id: str):
    ok = await chat_service.xoa_hoi_thoai(session_id)
    return {"success": ok}


@router.delete("")
async def xoa_tat_ca():
    from core.database import get_db
    result = await get_db().conversations.delete_many({"user_id": "default"})
    return {"deleted": result.deleted_count}
