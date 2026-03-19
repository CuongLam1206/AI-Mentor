"""
routes/websocket.py – WebSocket endpoint + AI function calling logic.
"""

import json
import uuid
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from google.genai import types

from core.ai_client import get_client
import services.chat_service as chat_service
import services.goal_service as goal_service
import services.learner_profile_service as learner_profile_service

router = APIRouter()

SYSTEM_PROMPT_BASE = chat_service.SYSTEM_PROMPT


def _build_tools():
    return [{
        "function_declarations": [{
            "name": "tao_muc_tieu_va_lo_trinh",
            "description": "Tạo mục tiêu học tập và lộ trình (milestones) cho học viên. Gọi khi học viên yêu cầu lập kế hoạch/lộ trình học.",
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {"type": "string", "description": "Tiêu đề mục tiêu"},
                    "target_score": {"type": "number", "description": "Điểm mục tiêu"},
                    "current_level": {"type": "string", "description": "Trình độ hiện tại"},
                    "deadline": {"type": "string", "description": "Hạn chật YYYY-MM-DD"},
                    "weak_skills": {"type": "array", "items": {"type": "string"}, "description": "Kỹ năng yếu"},
                    "milestones": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "title": {"type": "string", "description": "Tên milestone"},
                                "month": {"type": "integer", "description": "Tháng thực hiện"},
                                "target": {"type": "string", "description": "Mục tiêu cụ thể của milestone"},
                                "topics": {
                                    "type": "array",
                                    "items": {"type": "string"},
                                    "description": "Danh sách chủ đề/kỹ năng cần học trong milestone này"
                                },
                                "activities": {
                                    "type": "array",
                                    "items": {"type": "string"},
                                    "description": "Các hoạt động học tập (VD: đọc sách, làm bài tập, nghe podcast)"
                                },
                                "resources": {
                                    "type": "array",
                                    "items": {
                                        "type": "object",
                                        "properties": {
                                            "name": {"type": "string", "description": "Tên tài liệu / khóa học / website"},
                                            "type": {"type": "string", "description": "Loại tài liệu: book | website | video | app | course | tool"},
                                            "url": {"type": "string", "description": "Link hoặc nơi tìm thấy (có thể để trống)"},
                                            "description": {"type": "string", "description": "Tóm tắt tài liệu dạy gì, phù hợp học viên như thế nào"},
                                            "skills": {
                                                "type": "array",
                                                "items": {"type": "string"},
                                                "description": "Kỹ năng cụ thể đạt được sau khi học xong tài liệu này"
                                            }
                                        },
                                        "required": ["name", "description"]
                                    },
                                    "description": "Tài nguyên học cụ thể kèm mô tả chi tiết"
                                }
                            },
                            "required": ["title", "month", "target"]
                        }
                    }
                },
                "required": ["title", "milestones"]
            }
        }]
    }]


def _build_page_context_text(page_context: dict | None) -> str:
    """Chuyển page_context thành đoạn text cho system prompt."""
    if not page_context:
        return ""
    parts = []
    page = page_context.get("page", "")
    if page:
        page_names = {
            "chat": "Màn hình chat",
            "goals": "Màn Mục tiêu & Lộ trình",
            "profile": "Màn Hồ sơ học viên",
            "roadmap": "Màn Lộ trình chi tiết",
        }
        parts.append(f"📍 Đang ở: {page_names.get(page, page)}")
    course_id = page_context.get("course_id", "")
    course_name = page_context.get("course_name", "")
    course_pct = page_context.get("progress", "")
    if course_id:
        course_str = f"Khóa học: {course_name or course_id}"
        if course_pct != "":
            course_str += f" (tiến độ: {course_pct}%)"
        parts.append(course_str)
    return "\n".join(parts) if parts else ""


async def _build_enhanced_prompt(user_id: str, page_context: dict | None = None) -> str:
    """Tổng hợp system prompt động từ profile + goals + page context."""
    learner_context = await learner_profile_service.build_context(user_id)
    student_context = await goal_service.xay_dung_context_hoc_vien(user_id)
    page_ctx_text = _build_page_context_text(page_context)

    prompt = f"""{SYSTEM_PROMPT_BASE}

## Hồ sơ học viên
{learner_context}

## Mục tiêu & Tiến độ
{student_context}
"""
    if page_ctx_text:
        prompt += f"\n## Ngữ cảnh hiện tại\n{page_ctx_text}\n"

    prompt += """
## Quan trọng
- Luôn gọi tên học viên nếu biết.
- Nếu học viên chưa có hồ sơ, gợi ý vào ⚙️ Cài đặt → Hồ sơ học viên.
- Khi học viên yêu cầu tạo lộ trình, PHẢI gọi function tao_muc_tieu_va_lo_trinh.
- Lộ trình gồm các milestone rõ ràng: topics cụ thể, activities thực tế, resources thực tế (sách/website/app).
- Sau khi tạo, nhắc học viên vào 🎯 Mục tiêu & Lộ trình để xem.
- KHI HỊC VIÊN HỎi "hôm nay học gì" hoặc "kế hoạch hôm nay": ĐỌC NGAY phần "Mục tiêu & Tiến độ" và đề xuất cụ thể dựa trên milestone đang in_progress.
"""
    return prompt


async def tao_phan_hoi_ai(
    tin_nhan_user: str,
    lich_su: list,
    user_id: str = "default",
    page_context: dict | None = None,
) -> str:
    """Tạo phản hồi AI có inject context đầy đủ + function calling."""
    gemini_client = get_client()
    if not gemini_client:
        return f'🤖 **[Chế độ test]** Bạn vừa nói: "{tin_nhan_user}"\n\nChưa cấu hình `GEMINI_API_KEY`.'

    enhanced_prompt = await _build_enhanced_prompt(user_id, page_context)

    contents = [
        {"role": "user", "parts": [{"text": f"[System]\n{enhanced_prompt}\n[/System]\n\nChào học viên."}]},
        {"role": "model", "parts": [{"text": "Xin chào! 👋 Tôi là Learnify Tutor AI. Bạn cần tôi giúp gì hôm nay? 😊"}]},
    ]
    for msg in lich_su[-10:]:
        contents.append({"role": "user" if msg["role"] == "user" else "model", "parts": [{"text": msg["content"]}]})
    contents.append({"role": "user", "parts": [{"text": tin_nhan_user}]})

    try:
        response = get_client().models.generate_content(
            model="gemini-2.0-flash",
            contents=contents,
            config={"tools": _build_tools()},
        )
        part = response.candidates[0].content.parts[0]

        if hasattr(part, "function_call") and part.function_call:
            fc = part.function_call
            if fc.name == "tao_muc_tieu_va_lo_trinh":
                args = dict(fc.args)
                print(f"🎯 Function call: {fc.name}")
                goal = await goal_service.tao_muc_tieu(user_id, {
                    "title": args.get("title", ""),
                    "target_score": args.get("target_score"),
                    "current_level": args.get("current_level", ""),
                    "deadline": args.get("deadline", ""),
                    "weak_skills": args.get("weak_skills", []),
                    "daily_hours": 2,
                })
                milestones_data = args.get("milestones", [])
                for ms in milestones_data:
                    ms["milestone_id"] = f"ms_{uuid.uuid4().hex[:6]}"
                    ms.setdefault("status", "pending")
                    ms.setdefault("progress_pct", 0)
                    ms.setdefault("topics", [])
                    ms.setdefault("activities", [])
                    ms.setdefault("resources", [])
                    # Backward compat: keep empty courses field
                    ms.setdefault("courses", [])
                plan = await goal_service.luu_lo_trinh(goal["goal_id"], user_id, milestones_data)
                function_response_part = types.Part.from_function_response(
                    name=fc.name,
                    response={
                        "goal_id": goal["goal_id"],
                        "plan_id": plan["plan_id"],
                        "total_milestones": len(milestones_data),
                        "status": "success",
                        "message": f"Đã tạo mục tiêu '{args.get('title')}' với {len(milestones_data)} milestones.",
                    }
                )
                contents.append(response.candidates[0].content)
                contents.append(types.Content(role="user", parts=[function_response_part]))
                response2 = get_client().models.generate_content(model="gemini-2.0-flash", contents=contents)
                return response2.text

        return response.text

    except Exception as e:
        print(f"❌ Lỗi Gemini: {e}")
        return f"⚠️ Xin lỗi, tôi gặp sự cố. Vui lòng thử lại! (Lỗi: {str(e)[:100]})"


async def tao_loi_chao_proactive(user_id: str, page_context: dict | None = None) -> str:
    """Tạo lời chào proactive khi user mở chat lần đầu trong session."""
    gemini_client = get_client()
    if not gemini_client:
        return "Xin chào! 👋 Tôi là Learnify Tutor AI. Hôm nay bạn muốn học gì? 😊"

    enhanced_prompt = await _build_enhanced_prompt(user_id, page_context)
    page_ctx_text = _build_page_context_text(page_context)

    greeting_instruction = (
        "Hãy chào học viên một cách thân thiện, ngắn gọn (2-3 câu). "
        "Dựa vào tiến độ học tập, đề xuất 1 hành động cụ thể cho hôm nay "
        "(ví dụ: tiếp tục milestone đang dở, ôn khóa có % thấp...). "
        "Không hỏi lại, không giải thích dài. Kết bằng emoji phù hợp."
    )
    if page_ctx_text:
        greeting_instruction += f"\nNgữ cảnh hiện tại: {page_ctx_text}"

    try:
        response = gemini_client.models.generate_content(
            model="gemini-2.0-flash",
            contents=[
                {"role": "user", "parts": [{"text": f"[System]\n{enhanced_prompt}\n[/System]\n\n{greeting_instruction}"}]},
            ],
        )
        return response.text
    except Exception as e:
        print(f"❌ Lỗi greeting: {e}")
        return "Xin chào! 👋 Hôm nay bạn muốn học gì? 😊"


def _chia_doan(van_ban: str, kich_thuoc: int = 20) -> list:
    if not van_ban:
        return [""]
    return [van_ban[i:i + kich_thuoc] for i in range(0, len(van_ban), kich_thuoc)]


@router.websocket("/ws/chat/{session_id}")
async def websocket_chat(websocket: WebSocket, session_id: str, user_id: str = "guest"):
    """WebSocket endpoint cho chat real-time."""
    await websocket.accept()
    print(f"🔗 WS kết nối: {session_id}, user={user_id}")

    hoi_thoai = await chat_service.lay_hoi_thoai(session_id)
    if not hoi_thoai:
        hoi_thoai = await chat_service.tao_hoi_thoai(user_id, session_id)

    # Track page context across messages in session
    current_page_context: dict | None = None

    try:
        while True:
            du_lieu = await websocket.receive_json()
            loai = du_lieu.get("type", "message")

            # Cập nhật page context nếu client gửi kèm
            if "page_context" in du_lieu:
                current_page_context = du_lieu["page_context"]

            if loai == "greet":
                # Proactive greeting khi mở chat mới
                msg_id = f"greet_{uuid.uuid4().hex[:8]}"
                await websocket.send_json({"type": "stream_start", "message_id": msg_id})
                loi_chao = await tao_loi_chao_proactive(user_id, current_page_context)
                for doan in _chia_doan(loi_chao):
                    await websocket.send_json({"type": "stream_chunk", "message_id": msg_id, "content": doan})
                await websocket.send_json({"type": "stream_end", "message_id": msg_id, "content": loi_chao})
                # Lưu greeting vào lịch sử để AI nhớ
                await chat_service.luu_tin_nhan(session_id, "assistant", loi_chao)

            elif loai == "message":
                noi_dung = du_lieu.get("content", "").strip()
                if not noi_dung:
                    continue
                await chat_service.luu_tin_nhan(session_id, "user", noi_dung)
                lich_su = await chat_service.lay_lich_su_tin_nhan(session_id)
                msg_id = f"msg_{uuid.uuid4().hex[:8]}"

                await websocket.send_json({"type": "stream_start", "message_id": msg_id})
                phan_hoi = await tao_phan_hoi_ai(
                    noi_dung,
                    lich_su[:-1],
                    user_id=user_id,
                    page_context=current_page_context,
                )
                for doan in _chia_doan(phan_hoi):
                    await websocket.send_json({"type": "stream_chunk", "message_id": msg_id, "content": doan})
                await websocket.send_json({"type": "stream_end", "message_id": msg_id, "content": phan_hoi})
                await chat_service.luu_tin_nhan(session_id, "assistant", phan_hoi)

    except WebSocketDisconnect:
        print(f"🔌 WS ngắt: {session_id}")
    except Exception as e:
        print(f"❌ WS lỗi: {e}")
        try:
            await websocket.send_json({"type": "error", "content": f"Lỗi: {str(e)[:200]}"})
        except Exception:
            pass
