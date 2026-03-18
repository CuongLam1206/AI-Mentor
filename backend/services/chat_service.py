"""
services/chat_service.py – Quản lý lịch sử hội thoại.
"""

from datetime import datetime, timezone
from typing import Optional
from core.database import get_db

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

## Hướng dẫn về Lộ trình học tập (Roadmap)
Khi học viên hỏi về lộ trình học, muốn tạo lộ trình, hoặc muốn xem lộ trình của mình, hãy:
1. Đề xuất tên lộ trình cụ thể, ví dụ: "**Chinh phục TOEIC 750+**", "**Thành thạo Python cơ bản**", "**Đạt IELTS 6.5 trong 6 tháng**"
2. Hướng dẫn học viên tìm lộ trình:
   - Nhấn vào biểu tượng **⚙️ "Cài đặt và trợ giúp"** ở góc dưới bên trái thanh sidebar
   - Chọn **"🎯 Mục tiêu & Lộ trình"**
   - Tại đây học viên có thể **xem, thêm, sửa** các lộ trình của mình
3. Nếu học viên muốn tạo lộ trình mới qua chat, hãy hỏi các thông tin:
   - Mục tiêu cụ thể (điểm số / kỹ năng cần đạt)
   - Mức độ hiện tại
   - Thời hạn mong muốn
   - Số giờ học/tuần
   Rồi đề xuất tên lộ trình và bảo học viên vào **Mục tiêu & Lộ trình** để tạo chính thức.
"""


def _col():
    return get_db().conversations


async def tao_hoi_thoai(user_id: str, session_id: str) -> dict:
    hoi_thoai = {
        "user_id": user_id,
        "session_id": session_id,
        "title": "Cuộc trò chuyện mới",
        "messages": [],
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }
    ket_qua = await _col().insert_one(hoi_thoai)
    hoi_thoai["_id"] = str(ket_qua.inserted_id)
    return hoi_thoai


async def lay_hoi_thoai(session_id: str) -> Optional[dict]:
    return await _col().find_one({"session_id": session_id})


async def luu_tin_nhan(session_id: str, role: str, content: str) -> None:
    tin_nhan = {
        "role": role,
        "content": content,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    await _col().update_one(
        {"session_id": session_id},
        {
            "$push": {"messages": tin_nhan},
            "$set": {"updated_at": datetime.now(timezone.utc)},
        },
    )
    if role == "user":
        hoi_thoai = await lay_hoi_thoai(session_id)
        if hoi_thoai and hoi_thoai.get("title") == "Cuộc trò chuyện mới":
            tieu_de = content[:50] + ("..." if len(content) > 50 else "")
            await _col().update_one({"session_id": session_id}, {"$set": {"title": tieu_de}})


async def lay_lich_su_tin_nhan(session_id: str, gioi_han: int = 20) -> list:
    hoi_thoai = await lay_hoi_thoai(session_id)
    if not hoi_thoai:
        return []
    return hoi_thoai.get("messages", [])[-gioi_han:]


async def lay_danh_sach_hoi_thoai(user_id: str = "default") -> list:
    cursor = _col().find(
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
    ket_qua = await _col().delete_one({"session_id": session_id})
    return ket_qua.deleted_count > 0
