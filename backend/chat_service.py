"""
Learnify Tutor AI – Dịch vụ quản lý lịch sử chat
Sử dụng MongoDB (motor async) để lưu trữ hội thoại.
"""

import os
from datetime import datetime, timezone
from typing import Optional

from motor.motor_asyncio import AsyncIOMotorClient

# ===== Kết nối MongoDB =====

_client: Optional[AsyncIOMotorClient] = None
_db = None


async def ket_noi_mongodb():
    """Khởi tạo kết nối MongoDB."""
    global _client, _db
    uri = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
    db_name = os.getenv("MONGODB_DATABASE") or os.getenv("MONGODB_DB_NAME", "learnify_tutor")
    _client = AsyncIOMotorClient(uri)
    _db = _client[db_name]

    # Tạo index
    await _db.conversations.create_index("user_id")
    await _db.conversations.create_index("updated_at")
    print(f"✅ Đã kết nối MongoDB: {db_name}")


async def dong_ket_noi_mongodb():
    """Đóng kết nối MongoDB."""
    global _client
    if _client:
        _client.close()
        print("🔌 Đã đóng kết nối MongoDB")


def lay_collection():
    """Lấy collection conversations."""
    return _db.conversations


# ===== System Prompt =====

SYSTEM_PROMPT = """Bạn là **Learnify Tutor AI** – gia sư cá nhân thông minh trong nền tảng học trực tuyến Learnify.

## Vai trò của bạn
- Bạn là một gia sư tận tâm, KHÔNG phải chatbot thông thường.
- Bạn giúp học viên lên kế hoạch học tập, theo dõi tiến độ, giải đáp thắc mắc.
- Khi học viên hỏi bài: hãy gợi ý hướng suy nghĩ (phương pháp Socratic), đặt câu hỏi dẫn dắt thay vì đưa đáp án trực tiếp.

## Phong cách giao tiếp
- Thân thiện, động viên, chuyên nghiệp
- Trả lời bằng tiếng Việt
- Ngắn gọn, rõ ràng, dễ hiểu
- Sử dụng emoji phù hợp để tăng tương tác
- Kết thúc mỗi lượt trả lời bằng 1 câu hỏi hoặc gợi ý hành động tiếp theo

## Khả năng
- Trả lời câu hỏi về mọi chủ đề học tập
- Giải thích khái niệm phức tạp một cách đơn giản
- Gợi ý phương pháp học hiệu quả
- Động viên và khích lệ học viên
"""


# ===== Các hàm quản lý hội thoại =====

async def tao_hoi_thoai(user_id: str, session_id: str) -> dict:
    """Tạo hội thoại mới."""
    hoi_thoai = {
        "user_id": user_id,
        "session_id": session_id,
        "title": "Cuộc trò chuyện mới",
        "messages": [],
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }
    ket_qua = await lay_collection().insert_one(hoi_thoai)
    hoi_thoai["_id"] = str(ket_qua.inserted_id)
    return hoi_thoai


async def lay_hoi_thoai(session_id: str) -> Optional[dict]:
    """Lấy hội thoại theo session_id."""
    return await lay_collection().find_one({"session_id": session_id})


async def luu_tin_nhan(session_id: str, role: str, content: str) -> None:
    """Lưu tin nhắn vào hội thoại."""
    tin_nhan = {
        "role": role,
        "content": content,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

    await lay_collection().update_one(
        {"session_id": session_id},
        {
            "$push": {"messages": tin_nhan},
            "$set": {"updated_at": datetime.now(timezone.utc)},
        },
    )

    # Tự động đặt tiêu đề từ tin nhắn đầu tiên của user
    if role == "user":
        hoi_thoai = await lay_hoi_thoai(session_id)
        if hoi_thoai and hoi_thoai.get("title") == "Cuộc trò chuyện mới":
            tieu_de = content[:50] + ("..." if len(content) > 50 else "")
            await lay_collection().update_one(
                {"session_id": session_id},
                {"$set": {"title": tieu_de}},
            )


async def lay_lich_su_tin_nhan(session_id: str, gioi_han: int = 20) -> list:
    """Lấy lịch sử tin nhắn gần nhất."""
    hoi_thoai = await lay_hoi_thoai(session_id)
    if not hoi_thoai:
        return []
    tin_nhan = hoi_thoai.get("messages", [])
    return tin_nhan[-gioi_han:]


async def lay_danh_sach_hoi_thoai(user_id: str = "default") -> list:
    """Lấy danh sách hội thoại có tin nhắn, mới nhất trước."""
    cursor = lay_collection().find(
        {"user_id": user_id, "messages": {"$exists": True, "$ne": []}},
        {"messages": {"$slice": -1}, "title": 1, "updated_at": 1, "session_id": 1, "starred": 1},
    ).sort("updated_at", -1)

    danh_sach = []
    async for doc in cursor:
        danh_sach.append({
            "id": str(doc["_id"]),
            "session_id": doc.get("session_id", ""),
            "title": doc.get("title", "Cuộc trò chuyện mới"),
            "last_message": doc["messages"][-1]["content"][:80] if doc.get("messages") else "",
            "updated_at": doc.get("updated_at", "").isoformat() if doc.get("updated_at") else "",
            "starred": doc.get("starred", False),
        })
    return danh_sach


async def xoa_hoi_thoai(session_id: str) -> bool:
    """Xóa hội thoại."""
    ket_qua = await lay_collection().delete_one({"session_id": session_id})
    return ket_qua.deleted_count > 0
