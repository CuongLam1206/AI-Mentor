"""
Learnify Tutor AI – Server chính
FastAPI WebSocket server tích hợp Gemini AI cho chat real-time.
"""

import json
import os
import uuid
from contextlib import asynccontextmanager

import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from google import genai
from google.genai import types

import chat_service
import goal_service
import course_catalog
import learner_profile_service

# Đọc biến môi trường
load_dotenv()


# ===== Vòng đời ứng dụng =====

@asynccontextmanager
async def vong_doi_app(app: FastAPI):
    """Khởi tạo và dọn dẹp tài nguyên."""
    # Khởi tạo
    await chat_service.ket_noi_mongodb()
    # Chia sẻ DB cho goal_service + learner_profile_service
    goal_service.set_db(chat_service._db)
    learner_profile_service.set_db(chat_service._db)
    # Seed dữ liệu mẫu tiến độ
    await goal_service.seed_tien_do_mau()
    # Dọn conversations trống
    if chat_service._db is not None:
        r = await chat_service.lay_collection().delete_many({"messages": {"$size": 0}})
        if r.deleted_count > 0:
            print(f"🧹 Đã xóa {r.deleted_count} conversation trống")
    print("🚀 Learnify Tutor AI Backend đã khởi động!")
    yield
    # Dọn dẹp
    await chat_service.dong_ket_noi_mongodb()


# ===== Khởi tạo FastAPI =====

app = FastAPI(
    title="Learnify Tutor AI",
    description="Backend cho AI Tutor Chat Panel",
    version="1.0.0",
    lifespan=vong_doi_app,
)

# CORS – cho phép frontend truy cập từ mọi domain
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ===== Gemini AI Client =====

def tao_gemini_client():
    """Tạo Gemini client."""
    api_key = os.getenv("GEMINI_API_KEY", "")
    if not api_key:
        print("⚠️  Chưa cấu hình GEMINI_API_KEY – sẽ dùng chế độ echo")
        return None
    client = genai.Client(api_key=api_key)
    return client


gemini_client = tao_gemini_client()


async def tao_phan_hoi_ai(tin_nhan_user: str, lich_su: list, user_id: str = "default") -> str:
    """Tạo phản hồi AI từ Gemini, có inject student context + function calling."""
    if not gemini_client:
        return f'🤖 **[Chế độ test]** Bạn vừa nói: "{tin_nhan_user}"\n\nĐây là chế độ test – hãy cấu hình `GEMINI_API_KEY` để kích hoạt AI thật.'

    # Lấy profile học viên
    learner_context = await learner_profile_service.build_context(user_id)

    # Lấy context mục tiêu từ DB
    student_context = await goal_service.xay_dung_context_hoc_vien(user_id)

    # Lấy danh mục khóa học Learnify
    all_courses = course_catalog.lay_tat_ca_khoa_hoc()
    course_list = "\n".join([f"- {c['course_id']}: {c['title']} ({c['category']}, {c['level']}, {c['duration_hours']}h)" for c in all_courses])

    # Lấy dữ liệu streak & thói quen học tập
    streak_context = ""
    try:
        from datetime import datetime, timedelta, timezone
        db = chat_service._db
        if db is not None:
            today = datetime.now(timezone.utc).date()
            seven_days = [(today - timedelta(days=6-i)).isoformat() for i in range(7)]
            day_labels = ["Th 7", "CN", "Th 2", "Th 3", "Th 4", "Th 5", "Th 6"]
            pipeline = [
                {"$match": {"user_id": user_id, "messages": {"$exists": True, "$ne": []}}},
                {"$unwind": "$messages"},
                {"$match": {"messages.role": "user"}},
                {"$addFields": {"msg_date": {"$substr": ["$messages.timestamp", 0, 10]}}},
                {"$match": {"msg_date": {"$in": seven_days}}},
                {"$group": {"_id": "$msg_date", "count": {"$sum": 1}}},
            ]
            cursor = db.conversations.aggregate(pipeline)
            msg_per_day: dict = {}
            async for doc in cursor:
                msg_per_day[doc["_id"]] = doc["count"]

            weekly = [msg_per_day.get(d, 0) for d in seven_days]
            total_msgs = sum(weekly)
            active_days = sum(1 for v in weekly if v > 0)
            streak = 0
            check = today
            while True:
                if msg_per_day.get(check.isoformat(), 0) > 0:
                    streak += 1
                    check -= timedelta(days=1)
                else:
                    break
            peak_day = day_labels[weekly.index(max(weekly))] if any(weekly) else "chưa có"
            activity_str = " | ".join([f"{day_labels[i]}: {weekly[i]} tin" for i in range(7)])
            streak_context = f"""
## Thói quen học tập (7 ngày gần nhất)
- Streak hiện tại: {streak} ngày liên tiếp
- Số ngày học: {active_days}/7
- Tổng tin nhắn: {total_msgs}
- Ngày học nhiều nhất: {peak_day}
- Chi tiết: {activity_str}

Hướng dẫn khai thác:
- Nếu streak >= 3: khen ngợi và động viên duy trì.
- Nếu hôm nay chưa có tin (weekly[-1] == 0): nhắc nhẹ nhàng bắt đầu học.
- Nếu active_days <= 2: gợi ý xây thói quen học đều đặn.
- Nếu streak == 0 nhưng có học trước đó: khuyến khích comeback.
- Đề xuất học vào ngày giờ peak nếu relevant.
"""
    except Exception:
        streak_context = ""

    # Lấy điểm yếu từ lịch sử quiz
    quiz_weak_context = ""
    try:
        db_q = chat_service._db
        if db_q is not None:
            topic_map: dict = {}
            async for doc in db_q.quiz_results.find({"user_id": user_id}, {"_id": 0}):
                key = doc.get("course_id") or doc.get("goal_title") or ""
                label = doc.get("course_title") or doc.get("goal_title") or key
                if key:
                    topic_map.setdefault(key, {"label": label, "scores": []})
                    topic_map[key]["scores"].append(doc.get("percentage", 0))
            if topic_map:
                lines = []
                for k, v in topic_map.items():
                    avg = round(sum(v["scores"]) / len(v["scores"]))
                    mark = "⚠️ yếu" if avg < 60 else ("✅ ổn" if avg >= 80 else "📈 trung bình")
                    lines.append(f"- {v['label']}: trung bình {avg}% ({len(v['scores'])} lần) {mark}")
                quiz_weak_context = (
                    "\n## Kết quả Quiz (dùng để coaching)\n"
                    + "\n".join(lines)
                    + "\nHướng dẫn: Nếu học viên có môn avg < 60%, chủ động gợi ý ôn lại. "
                    + "Nếu avg ≥ 80%, khen ngợi và thách thức thêm.\n"
                )
    except Exception:
        quiz_weak_context = ""

    # Xây dựng system prompt mở rộng
    enhanced_prompt = f"""{chat_service.SYSTEM_PROMPT}

## Hồ sơ học viên
{learner_context}

## Mục tiêu & Tiến độ
{student_context}
{streak_context}{quiz_weak_context}
## Danh mục khóa học Learnify
{course_list}

## Quan trọng
- Luôn gọi tên học viên nếu biết.
- Trả lời dựa trên hồ sơ, mục tiêu, và tiến độ hiện tại.
- Nếu học viên chưa có hồ sơ, gợi ý họ vào ⚙️ Cài đặt → Hồ sơ học viên.
- Tạo lộ trình cho BẤT KỲ chủ đề nào học viên yêu cầu (lập trình, ngoại ngữ, âm nhạc, thể thao, v.v.) — KHÔNG giới hạn vào danh mục Learnify. Resources từ Internet (sách, website, YouTube, khóa học online).
- Nếu học viên chưa có mục tiêu, chủ động khảo sát: mục tiêu gì, trình độ, thời gian, kỹ năng yếu.
- Khi học viên yêu cầu tạo lộ trình, PHẢI gọi function tao_muc_tieu_va_lo_trinh để lưu vào hệ thống. KHÔNG từ chối vì "không có trong danh mục Learnify".
- Sau khi tạo lộ trình, nhắc học viên vào 🎯 Mục tiêu & Lộ trình trong Cài đặt để xem chi tiết.
"""

    contents = []
    contents.append({
        "role": "user",
        "parts": [{"text": f"[System Instructions]\n{enhanced_prompt}\n[End System Instructions]\n\nHãy chào học viên."}],
    })
    contents.append({
        "role": "model",
        "parts": [{"text": "Xin chào! 👋 Tôi là Learnify Tutor AI – gia sư cá nhân của bạn. Tôi sẵn sàng hỗ trợ bạn trong hành trình học tập. Bạn cần tôi giúp gì hôm nay? 😊"}],
    })

    for msg in lich_su[-10:]:
        role = "user" if msg["role"] == "user" else "model"
        contents.append({
            "role": role,
            "parts": [{"text": msg["content"]}],
        })

    contents.append({
        "role": "user",
        "parts": [{"text": tin_nhan_user}],
    })

    # ===== Function Calling Setup =====
    tools = [{
        "function_declarations": [{
            "name": "tao_muc_tieu_va_lo_trinh",
            "description": "Tạo mục tiêu học tập và lộ trình (milestones) cho học viên. Gọi khi học viên yêu cầu lập kế hoạch/lộ trình học.",
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {
                        "type": "string",
                        "description": "Tiêu đề mục tiêu. VD: 'Đạt TOEIC 750+'"
                    },
                    "target_score": {
                        "type": "number",
                        "description": "Điểm mục tiêu (nếu có)"
                    },
                    "current_level": {
                        "type": "string",
                        "description": "Trình độ hiện tại. VD: 'Intermediate', '550 điểm'"
                    },
                    "deadline": {
                        "type": "string",
                        "description": "Hạn chót. VD: '2026-08-31'"
                    },
                    "weak_skills": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Kỹ năng yếu cần tập trung"
                    },
                    "milestones": {
                        "type": "array",
                        "description": "Danh sách các milestone trong lộ trình",
                        "items": {
                            "type": "object",
                            "properties": {
                                "title": {"type": "string", "description": "Tên milestone"},
                                "month": {"type": "integer", "description": "Tháng thứ mấy"},
                                "target": {"type": "string", "description": "Mục tiêu của milestone"},
                                "courses": {
                                    "type": "array",
                                    "items": {
                                        "type": "object",
                                        "properties": {
                                            "course_id": {"type": "string"},
                                            "priority": {"type": "integer"}
                                        },
                                        "required": ["course_id", "priority"]
                                    },
                                    "description": "Khóa học trong milestone (từ danh mục)"
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

    try:
        response = gemini_client.models.generate_content(
            model="gemini-2.0-flash",
            contents=contents,
            config={"tools": tools},
        )

        # Check function call
        candidate = response.candidates[0]
        part = candidate.content.parts[0]

        if hasattr(part, "function_call") and part.function_call:
            fc = part.function_call
            if fc.name == "tao_muc_tieu_va_lo_trinh":
                args = dict(fc.args)
                print(f"🎯 Function call: tao_muc_tieu_va_lo_trinh({json.dumps(args, ensure_ascii=False, default=str)[:200]})")

                # Tạo goal
                goal = await goal_service.tao_muc_tieu(user_id, {
                    "title": args.get("title", ""),
                    "target_score": args.get("target_score"),
                    "current_level": args.get("current_level", ""),
                    "deadline": args.get("deadline", ""),
                    "weak_skills": args.get("weak_skills", []),
                    "daily_hours": 2,
                })

                # Tạo milestones
                milestones_data = args.get("milestones", [])
                for ms in milestones_data:
                    ms["milestone_id"] = f"ms_{uuid.uuid4().hex[:6]}"
                    ms["status"] = "pending"
                    ms["progress_pct"] = 0
                    if "courses" not in ms:
                        ms["courses"] = []

                plan = await goal_service.luu_lo_trinh(goal["goal_id"], user_id, milestones_data)

                # Gửi kết quả function call lại Gemini để nhận phản hồi tự nhiên
                function_response_part = types.Part.from_function_response(
                    name=fc.name,
                    response={
                        "goal_id": goal["goal_id"],
                        "plan_id": plan["plan_id"],
                        "total_milestones": len(milestones_data),
                        "status": "success",
                        "message": f"Đã tạo mục tiêu '{args.get('title')}' với {len(milestones_data)} milestones."
                    }
                )
                contents.append(response.candidates[0].content)
                contents.append(types.Content(role="user", parts=[function_response_part]))

                response2 = gemini_client.models.generate_content(
                    model="gemini-2.0-flash",
                    contents=contents,
                )
                return response2.text

        # Phản hồi text thường
        return response.text

    except Exception as e:
        print(f"❌ Lỗi Gemini API: {e}")
        return f"⚠️ Xin lỗi, tôi gặp sự cố khi xử lý. Vui lòng thử lại nhé! (Lỗi: {str(e)[:100]})"


# ===== Goals API =====

@app.get("/api/goals")
async def lay_danh_sach_muc_tieu():
    """Lấy danh sách mục tiêu."""
    goals = await goal_service.lay_muc_tieu_user("default")
    # Serialize datetime objects
    for g in goals:
        for key in ("created_at", "updated_at"):
            if key in g and g[key]:
                g[key] = str(g[key])
    return {"goals": goals}


@app.get("/api/goals/{goal_id}")
async def lay_chi_tiet_muc_tieu(goal_id: str):
    """Lấy mục tiêu + lộ trình."""
    goal = await goal_service.lay_muc_tieu(goal_id)
    plan = await goal_service.lay_lo_trinh(goal_id)
    if plan and "_id" in plan:
        del plan["_id"]
    # Serialize datetime
    for obj in [goal, plan]:
        if obj:
            for key in ("created_at", "updated_at"):
                if key in obj and obj[key]:
                    obj[key] = str(obj[key])
    return {"goal": goal, "plan": plan}


@app.post("/api/goals")
async def tao_muc_tieu_api(body: dict):
    """Tạo mục tiêu học tập mới."""
    goal = await goal_service.tao_muc_tieu("default", body)
    goal.pop("_id", None)
    for key in ("created_at", "updated_at"):
        if key in goal and goal[key]:
            goal[key] = str(goal[key])
    return {"goal": goal}


@app.delete("/api/goals/{goal_id}")
async def xoa_muc_tieu_api(goal_id: str):
    """Xóa mục tiêu + lộ trình."""
    ok = await goal_service.xoa_muc_tieu(goal_id)
    if ok:
        return {"message": "Đã xóa mục tiêu"}
    return {"error": "Không tìm thấy mục tiêu"}


@app.post("/api/goals/{goal_id}/generate-roadmap")
async def tao_lo_trinh_ai(goal_id: str):
    """Dùng Gemini AI để tự động tạo lộ trình cho mục tiêu."""
    goal = await goal_service.lay_muc_tieu(goal_id)
    if not goal:
        return {"error": "Không tìm thấy mục tiêu"}

    # Lấy danh mục khóa học
    all_courses = course_catalog.lay_tat_ca_khoa_hoc()
    course_list = "\n".join([
        f"- {c['course_id']}: {c['title']} ({c['category']}, {c['level']}, {c['duration_hours']}h)"
        for c in all_courses
    ])

    # Tính số tháng từ deadline
    deadline_str = goal.get("deadline", "")
    try:
        from datetime import date
        deadline_dt = date.fromisoformat(deadline_str[:10]) if deadline_str else None
        today = date.today()
        months_available = max(2, ((deadline_dt - today).days // 30) if deadline_dt else 6)
    except Exception:
        months_available = 6

    weak_skills = ", ".join(goal.get("weak_skills", [])) or "chưa xác định"
    strong_skills = ", ".join(goal.get("strong_skills", [])) or "chưa xác định"

    prompt = f"""Bạn là AI gia sư chuyên lập kế hoạch học tập. Hãy tạo lộ trình chi tiết cho mục tiêu sau:

MỤC TIÊU: {goal.get('title', '')}
Trình độ hiện tại: {goal.get('current_level', 'Beginner')}
Mục tiêu đạt được: {goal.get('target_score', 'không xác định')}
Thời gian còn lại: {months_available} tháng (deadline: {deadline_str})
Thời gian học: {goal.get('daily_hours', 2)}h/ngày + {goal.get('weekly_hours', 10)}h/tuần
Kỹ năng yếu: {weak_skills}
Kỹ năng mạnh: {strong_skills}
Mục đích học: {goal.get('purpose', '')}

DANH MỤC KHÓA HỌC CÓ SẴN (CHỈ DÙNG COURSE_ID TỪ DANH SÁCH NÀY):
{course_list}

YÊU CẦU: Tạo {min(months_available, 5)} milestones theo từng giai đoạn học tập. Mỗi milestone gồm:
- title: tên giai đoạn ngắn gọn
- month: tháng thứ mấy (1, 2, 3...)
- target: mục tiêu cụ thể của giai đoạn này
- courses: danh sách 1-3 khóa học phù hợp (course_id + priority 1,2,3...)

CHỈ trả về JSON thuần túy, không markdown, không giải thích:
{{
  "milestones": [
    {{"title": "...", "month": 1, "target": "...", "courses": [{{"course_id": "...", "priority": 1}}]}},
    ...
  ]
}}"""

    if not gemini_client:
        # Fallback: tạo lộ trình mẫu
        milestones_data = [
            {"title": "Xây dựng nền tảng", "month": 1, "target": f"Nắm vững kiến thức cơ bản về {goal.get('title','')}", "courses": []},
            {"title": "Phát triển kỹ năng", "month": 2, "target": "Luyện tập và áp dụng kiến thức", "courses": []},
            {"title": "Hoàn thiện & Kiểm tra", "month": 3, "target": f"Đạt {goal.get('target_score','mục tiêu')}", "courses": []},
        ]
    else:
        try:
            resp = gemini_client.models.generate_content(
                model="gemini-2.0-flash",
                contents=[{"role": "user", "parts": [{"text": prompt}]}],
                config={"temperature": 0.3},
            )
            raw = resp.text.strip()
            # Bóc JSON từ code block nếu có
            if "```" in raw:
                raw = raw.split("```")[1]
                if raw.startswith("json"):
                    raw = raw[4:]
            data = json.loads(raw)
            milestones_data = data.get("milestones", [])
        except Exception as e:
            print(f"❌ Lỗi generate roadmap: {e}")
            return {"error": f"Lỗi tạo lộ trình: {str(e)[:200]}"}

    # Gán milestone_id và status
    for ms in milestones_data:
        ms["milestone_id"] = f"ms_{uuid.uuid4().hex[:6]}"
        ms["status"] = "pending"
        ms["progress_pct"] = 0
        if "courses" not in ms:
            ms["courses"] = []

    # Xóa lộ trình cũ (nếu có) rồi lưu mới
    await goal_service._db.learning_plans.delete_many({"goal_id": goal_id})
    plan = await goal_service.luu_lo_trinh(goal_id, "default", milestones_data)

    plan.pop("_id", None)
    for key in ("created_at", "updated_at"):
        if key in plan and plan[key]:
            plan[key] = str(plan[key])

    return {"plan": plan, "milestones": milestones_data, "message": f"Đã tạo {len(milestones_data)} milestones!"}


@app.get("/api/greeting")
async def lay_loi_chao(user_id: str = "default"):
    """Tạo lời chào proactive dựa trên profile + goals."""
    profile = await learner_profile_service.get_profile(user_id)
    goals = await goal_service.lay_muc_tieu_user(user_id)

    name = profile.get("name", "") if profile else ""
    active_goals = [g["title"] for g in goals if g.get("status") == "active"]

    if not name and not active_goals:
        return {"greeting": "👋 Xin chào! Tôi là **Learnify AI Tutor** — gia sư cá nhân của bạn. Hãy cho tôi biết bạn muốn học gì nhé! 🎯"}

    parts = []
    if name:
        parts.append(f"👋 Xin chào **{name}**!")
    else:
        parts.append("👋 Xin chào!")

    if active_goals:
        goal_str = active_goals[0] if len(active_goals) == 1 else f"{active_goals[0]} và {len(active_goals)-1} mục tiêu khác"
        parts.append(f"Bạn đang theo đuổi mục tiêu **{goal_str}**.")
        parts.append("Hôm nay bạn muốn luyện phần nào? Tôi có thể giúp bạn ôn lý thuyết, luyện đề, hoặc lên kế hoạch học! 💪")
    else:
        parts.append("Bạn chưa có mục tiêu học tập nào. Hãy vào **🎯 Mục tiêu & Lộ trình** để tạo lộ trình cá nhân hoá nhé!")

    return {"greeting": " ".join(parts)}


@app.get("/api/nudge")
async def kiem_tra_nhac_nho(user_id: str = "default"):
    """Kiểm tra và trả về nudge nhắc nhở nếu user lâu không học."""
    from datetime import datetime, timezone, timedelta
    profile = await learner_profile_service.get_profile(user_id)
    if not profile:
        return {"nudge": None}

    last_active_str = profile.get("last_active", "")
    goals = await goal_service.lay_muc_tieu_user(user_id)
    active_goals = [g for g in goals if g.get("status") == "active"]

    if not active_goals:
        return {"nudge": None}

    # Kiểm tra last_active
    try:
        last_active = datetime.fromisoformat(last_active_str.replace("Z", "+00:00")) if last_active_str else None
        if last_active:
            days_since = (datetime.now(timezone.utc) - last_active).days
            if days_since >= 2:
                goal_title = active_goals[0]["title"]
                name = profile.get("name", "bạn")
                return {
                    "nudge": {
                        "message": f"⏰ **{name}** ơi, đã {days_since} ngày bạn chưa học rồi! Mục tiêu **{goal_title}** đang chờ bạn 💪",
                        "days_since": days_since,
                        "type": "idle"
                    }
                }
    except Exception:
        pass


    return {"nudge": None}


# ===== Phase 3: Streak Tracking =====

@app.get("/api/streak")
async def lay_streak(user_id: str = "default"):
    """Trả về streak + số tin nhắn mỗi ngày trong 7 ngày gần nhất."""
    from datetime import datetime, timedelta, timezone

    db = chat_service._db
    if db is None:
        return {"streak": 0, "last_active": None, "weekly_sessions": [0]*7}

    today = datetime.now(timezone.utc).date()
    seven_days = [(today - timedelta(days=6-i)).isoformat() for i in range(7)]

    # Đếm tin nhắn user mỗi ngày bằng aggregation pipeline
    pipeline = [
        {"$match": {"user_id": user_id, "messages": {"$exists": True, "$ne": []}}},
        {"$unwind": "$messages"},
        {"$match": {"messages.role": "user"}},
        {"$addFields": {
            "msg_date": {"$substr": ["$messages.timestamp", 0, 10]}
        }},
        {"$match": {"msg_date": {"$in": seven_days}}},
        {"$group": {"_id": "$msg_date", "count": {"$sum": 1}}},
    ]
    cursor = db.conversations.aggregate(pipeline)
    msg_per_day: dict[str, int] = {}
    async for doc in cursor:
        msg_per_day[doc["_id"]] = doc["count"]

    weekly_sessions = [msg_per_day.get(d, 0) for d in seven_days]

    # Streak: đếm ngày liên tiếp có ít nhất 1 tin gần đây
    # Cũng check những ngày xa hơn 7 ngày nếu streak >= 7
    streak = 0
    check = today
    while True:
        check_str = check.isoformat()
        count = msg_per_day.get(check_str, 0)
        if count == 0 and streak >= 7:
            # Cần query thêm
            older_pipeline = [
                {"$match": {"user_id": user_id, "messages": {"$exists": True}}},
                {"$unwind": "$messages"},
                {"$match": {"messages.role": "user"}},
                {"$addFields": {"msg_date": {"$substr": ["$messages.timestamp", 0, 10]}}},
                {"$match": {"msg_date": check_str}},
                {"$count": "total"},
            ]
            res = await db.conversations.aggregate(older_pipeline).to_list(length=1)
            count = res[0]["total"] if res else 0
        if count > 0:
            streak += 1
            check -= timedelta(days=1)
        else:
            break

    last_active = today.isoformat() if any(v > 0 for v in weekly_sessions[-1:]) else None

    return {"streak": streak, "last_active": last_active, "weekly_sessions": weekly_sessions}


# ===== Phase 3: Course Recommendations =====

COURSE_CATALOG = [
    {"id": "toeic-basics", "title": "TOEIC Listening & Reading Basics", "skills": ["listening", "reading", "vocabulary"]},
    {"id": "ielts-writing", "title": "IELTS Academic Writing Task 1 & 2", "skills": ["writing", "grammar", "vocabulary"]},
    {"id": "ielts-speaking", "title": "IELTS Speaking Band 6.5+", "skills": ["speaking", "pronunciation", "fluency"]},
    {"id": "english-grammar", "title": "Essential English Grammar A2-B2", "skills": ["grammar", "writing"]},
    {"id": "math-calculus", "title": "Calculus for University Entrance", "skills": ["calculus", "math"]},
    {"id": "math-algebra", "title": "Algebra & Equations Mastery", "skills": ["algebra", "math"]},
    {"id": "python-intro", "title": "Python Programming Fundamentals", "skills": ["programming", "python"]},
    {"id": "data-science", "title": "Data Science with Python", "skills": ["data", "python", "statistics"]},
]


@app.get("/api/recommendations")
async def lay_goi_y_khoa_hoc(user_id: str = "default"):
    """AI goi y khoa hoc phu hop dua tren goal va ky nang yeu."""
    profile = await learner_profile_service.get_profile(user_id)
    goals = await goal_service.lay_muc_tieu_user(user_id)
    active_goals = [g for g in goals if g.get("status") == "active"]
    if not profile and not active_goals:
        return {"recommendations": []}
    profile_ctx = await learner_profile_service.build_context(user_id) if profile else "Chua co ho so"
    goals_ctx = ", ".join([g["title"] for g in active_goals]) if active_goals else "Chua co muc tieu"
    catalog_ctx = "\n".join([f"- {c['id']}: {c['title']}" for c in COURSE_CATALOG])
    os_key = os.environ.get("GEMINI_API_KEY", "")
    if not os_key:
        return {"recommendations": [
            {"id": "toeic-basics", "title": "TOEIC Listening & Reading Basics", "reason": "Phu hop voi muc tieu TOEIC", "match": 90},
            {"id": "english-grammar", "title": "Essential English Grammar A2-B2", "reason": "Cung co nen tang ngu phap", "match": 80},
        ]}
    try:
        rec_prompt = (
            f"Ho so hoc vien: {profile_ctx}\nMuc tieu: {goals_ctx}\n"
            f"Catalog:\n{catalog_ctx}\n"
            "Goi y 3 khoa hoc phu hop nhat. Tra ve JSON array (khong markdown): "
            '[{"id":"...","title":"...","reason":"...","match":90}]'
        )
        response = gemini_client.models.generate_content(model="gemini-2.0-flash", contents=rec_prompt)
        text = response.text.strip()
        if text.startswith("```"):
            text = "\n".join(text.split("\n")[1:-1])
        recs = json.loads(text)
        return {"recommendations": recs[:3]}
    except Exception as e:
        print(f"Loi recommendations: {e}")
        return {"recommendations": []}


# ===== Quiz: Save Result =====

@app.post("/api/quiz/result")
async def luu_ket_qua_quiz(request: Request):
    """Lưu kết quả quiz vào MongoDB để theo dõi tiến độ."""
    from datetime import datetime, timezone
    body = await request.json()
    user_id = body.get("user_id", "default")
    db = chat_service._db
    if db is None:
        return {"success": False, "error": "DB not connected"}
    result_doc = {
        "user_id": user_id,
        "goal_title": body.get("goal_title", ""),
        "course_id": body.get("course_id", ""),
        "course_title": body.get("course_title", ""),
        "score": body.get("score", 0),
        "total": body.get("total", 5),
        "percentage": round(body.get("score", 0) / max(body.get("total", 5), 1) * 100),
        "date": datetime.now(timezone.utc).isoformat(),
    }
    await db.quiz_results.insert_one(result_doc)
    return {"success": True}


# ===== Quiz: History & Analytics =====

@app.get("/api/quiz/history")
async def lay_lich_su_quiz(user_id: str = "default"):
    """Trả về lịch sử quiz, điểm theo ngày, và điểm trung bình theo chủ đề."""
    from datetime import datetime, timedelta, timezone
    db = chat_service._db
    if db is None:
        return {"daily": [], "recent": [], "by_topic": []}
    try:
        today = datetime.now(timezone.utc).date()
        seven_days_ago = (today - timedelta(days=6)).isoformat()

        # Lấy tất cả kết quả trong 7 ngày
        cursor = db.quiz_results.find(
            {"user_id": user_id, "date": {"$gte": seven_days_ago}},
            {"_id": 0}
        ).sort("date", -1)
        all_results = []
        async for doc in cursor:
            all_results.append(doc)

        # Nhóm theo ngày → điểm trung bình mỗi ngày
        daily_map: dict = {}
        for r in all_results:
            day = r.get("date", "")[:10]
            if day not in daily_map:
                daily_map[day] = []
            daily_map[day].append(r.get("percentage", 0))

        daily = []
        for i in range(7):
            day = (today - timedelta(days=6 - i)).isoformat()
            scores = daily_map.get(day, [])
            daily.append({
                "date": day,
                "avg_pct": round(sum(scores) / len(scores)) if scores else 0,
                "count": len(scores),
            })

        # 10 kết quả gần nhất (không giới hạn 7 ngày)
        cursor2 = db.quiz_results.find({"user_id": user_id}, {"_id": 0}).sort("date", -1).limit(10)
        recent = []
        async for doc in cursor2:
            recent.append(doc)

        # Điểm trung bình theo chủ đề (goal_title hoặc course_id)
        topic_map: dict = {}
        cursor3 = db.quiz_results.find({"user_id": user_id}, {"_id": 0})
        async for doc in cursor3:
            key = doc.get("course_id") or doc.get("goal_title") or "Khác"
            label = doc.get("course_title") or doc.get("goal_title") or key
            if key not in topic_map:
                topic_map[key] = {"label": label, "scores": [], "course_id": doc.get("course_id", "")}
            topic_map[key]["scores"].append(doc.get("percentage", 0))

        by_topic = []
        for k, v in topic_map.items():
            scores = v["scores"]
            by_topic.append({
                "key": k,
                "label": v["label"],
                "course_id": v["course_id"],
                "avg_pct": round(sum(scores) / len(scores)) if scores else 0,
                "attempts": len(scores),
            })
        by_topic.sort(key=lambda x: x["avg_pct"])  # yếu nhất lên đầu

        return {"daily": daily, "recent": recent, "by_topic": by_topic}
    except Exception as e:
        return {"daily": [], "recent": [], "by_topic": [], "error": str(e)}


# ===== Feature A: Spaced Repetition =====

@app.get("/api/spaced-repetition")
async def spaced_repetition(user_id: str = "default"):
    """Tính toán các chủ đề cần ôn lại dựa trên quiz history (Anki-style)."""
    from datetime import datetime, timedelta, timezone
    db = chat_service._db
    if db is None:
        return {"due": [], "upcoming": []}
    try:
        topic_map: dict = {}
        async for doc in db.quiz_results.find({"user_id": user_id}, {"_id": 0}):
            key = doc.get("course_id") or doc.get("goal_title") or ""
            if not key:
                continue
            label = doc.get("course_title") or doc.get("goal_title") or key
            pct = doc.get("percentage", 0)
            date_str = doc.get("date", "")
            topic_map.setdefault(key, {
                "label": label,
                "course_id": doc.get("course_id", ""),
                "goal_title": doc.get("goal_title", ""),
                "scores": [],
                "last_date": ""
            })
            topic_map[key]["scores"].append(pct)
            if date_str > topic_map[key]["last_date"]:
                topic_map[key]["last_date"] = date_str

        now = datetime.now(timezone.utc)
        due = []
        upcoming = []
        for k, v in topic_map.items():
            avg = round(sum(v["scores"]) / len(v["scores"]))
            # SM-2 simplified: interval based on score
            if avg >= 80:
                interval_days = 7
            elif avg >= 60:
                interval_days = 3
            else:
                interval_days = 1

            last_date = datetime.fromisoformat(v["last_date"].replace("Z", "+00:00")) if v["last_date"] else now - timedelta(days=999)
            next_review = last_date + timedelta(days=interval_days)
            days_until = (next_review.date() - now.date()).days

            entry = {
                "key": k,
                "label": v["label"],
                "course_id": v["course_id"],
                "goal_title": v["goal_title"],
                "avg_pct": avg,
                "last_quiz_date": v["last_date"][:10] if v["last_date"] else "",
                "interval_days": interval_days,
                "days_until_review": days_until,
                "overdue": days_until <= 0,
            }
            if days_until <= 0:
                due.append(entry)
            else:
                upcoming.append(entry)

        due.sort(key=lambda x: x["days_until_review"])
        upcoming.sort(key=lambda x: x["days_until_review"])
        return {"due": due, "upcoming": upcoming[:5]}
    except Exception as e:
        return {"due": [], "upcoming": [], "error": str(e)}


# ===== Feature B: Weekly Report =====

@app.get("/api/weekly-report")
async def weekly_report(user_id: str = "default"):
    """Tổng hợp báo cáo tuần: quiz, streak, milestone progress."""
    from datetime import datetime, timedelta, timezone
    db = chat_service._db
    if db is None:
        return {"report": {}}
    try:
        now = datetime.now(timezone.utc)
        week_ago = (now - timedelta(days=7)).isoformat()

        # Quiz tuần này
        quiz_scores_this_week = []
        async for doc in db.quiz_results.find({"user_id": user_id, "date": {"$gte": week_ago}}, {"_id": 0}):
            quiz_scores_this_week.append(doc.get("percentage", 0))

        # Quiz tuần trước
        two_weeks_ago = (now - timedelta(days=14)).isoformat()
        quiz_scores_last_week = []
        async for doc in db.quiz_results.find({"user_id": user_id, "date": {"$gte": two_weeks_ago, "$lt": week_ago}}, {"_id": 0}):
            quiz_scores_last_week.append(doc.get("percentage", 0))

        avg_this = round(sum(quiz_scores_this_week) / len(quiz_scores_this_week)) if quiz_scores_this_week else 0
        avg_last = round(sum(quiz_scores_last_week) / len(quiz_scores_last_week)) if quiz_scores_last_week else 0
        quiz_trend = avg_this - avg_last

        # Streak data
        streak_data = await db.streaks.find_one({"user_id": user_id}) if hasattr(db, "streaks") else None
        streak = streak_data.get("streak", 0) if streak_data else 0

        # Active days this week
        active_days_set: set = set()
        async for doc in db.quiz_results.find({"user_id": user_id, "date": {"$gte": week_ago}}, {"_id": 0}):
            d = doc.get("date", "")[:10]
            if d:
                active_days_set.add(d)

        # Message count this week
        msg_count = 0
        async for conv in db.conversations.find({"user_id": user_id}):
            for msg in conv.get("messages", []):
                if msg.get("timestamp", "") >= week_ago and msg.get("role") == "user":
                    msg_count += 1

        # Milestone progress
        total_milestones = 0
        completed_milestones = 0
        async for plan in db.learning_plans.find({"user_id": user_id}):
            for m in plan.get("milestones", []):
                total_milestones += 1
                if m.get("status") == "completed":
                    completed_milestones += 1

        # Weak topic this week
        topic_map: dict = {}
        async for doc in db.quiz_results.find({"user_id": user_id, "date": {"$gte": week_ago}}, {"_id": 0}):
            label = doc.get("course_title") or doc.get("goal_title") or "Không xác định"
            topic_map.setdefault(label, []).append(doc.get("percentage", 0))
        weakest = min(topic_map.items(), key=lambda x: sum(x[1]) / len(x[1])) if topic_map else None
        weakest_topic = {"label": weakest[0], "avg_pct": round(sum(weakest[1]) / len(weakest[1]))} if weakest else None

        return {
            "report": {
                "quiz_count": len(quiz_scores_this_week),
                "avg_quiz_pct": avg_this,
                "quiz_trend": quiz_trend,
                "active_days": len(active_days_set),
                "msg_count": msg_count,
                "streak": streak,
                "milestone_progress": f"{completed_milestones}/{total_milestones}",
                "weakest_topic": weakest_topic,
            }
        }
    except Exception as e:
        return {"report": {}, "error": str(e)}


# ===== Feature C: Chat Notes =====

@app.get("/api/notes")
async def lay_ghi_chu(user_id: str = "default"):
    """Lấy danh sách ghi chú đã lưu."""
    db = chat_service._db
    if db is None:
        return {"notes": []}
    try:
        notes = []
        async for doc in db.notes.find({"user_id": user_id}).sort("created_at", -1).limit(50):
            doc["note_id"] = str(doc.pop("_id"))   # expose _id as string for frontend delete
            notes.append(doc)
        return {"notes": notes}
    except Exception as e:
        return {"notes": [], "error": str(e)}

@app.post("/api/notes")
async def luu_ghi_chu(request: Request):
    """Lưu ghi chú mới từ tin nhắn chat."""
    from datetime import datetime, timezone
    body = await request.json()
    db = chat_service._db
    if db is None:
        return {"success": False}
    try:
        note = {
            "user_id": body.get("user_id", "default"),
            "content": body.get("content", ""),
            "source": body.get("source", "chat"),
            "session_id": body.get("session_id", ""),   # for navigating back to chat
            "tags": body.get("tags", []),
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.notes.insert_one(note)
        return {"success": True}
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.delete("/api/notes/{note_id}")
async def xoa_ghi_chu(note_id: str, user_id: str = "default"):
    """Xóa ghi chú theo ID."""
    from bson import ObjectId
    db = chat_service._db
    if db is None:
        return {"success": False}
    try:
        await db.notes.delete_one({"_id": ObjectId(note_id), "user_id": user_id})
        return {"success": True}
    except Exception as e:
        return {"success": False, "error": str(e)}


# ===== Feature D: Study Schedule =====

@app.get("/api/study-schedule")
async def lay_lich_hoc(user_id: str = "default"):
    """Lấy lịch học hàng ngày của user."""
    db = chat_service._db
    if db is None:
        return {"schedule": None}
    try:
        doc = await db.study_schedules.find_one({"user_id": user_id}, {"_id": 0})
        return {"schedule": doc}
    except Exception as e:
        return {"schedule": None, "error": str(e)}

@app.post("/api/study-schedule")
async def luu_lich_hoc(request: Request):
    """Lưu/cập nhật lịch học hàng ngày."""
    from datetime import datetime, timezone
    body = await request.json()
    db = chat_service._db
    if db is None:
        return {"success": False}
    try:
        user_id = body.get("user_id", "default")
        schedule = {
            "user_id": user_id,
            "hour": body.get("hour", 20),       # giờ học (0-23)
            "minute": body.get("minute", 0),
            "days": body.get("days", [1, 2, 3, 4, 5]),  # 0=CN, 1=T2...
            "duration_min": body.get("duration_min", 30),
            "reminder_text": body.get("reminder_text", "Đến giờ học rồi! 📚"),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.study_schedules.replace_one({"user_id": user_id}, schedule, upsert=True)
        return {"success": True}
    except Exception as e:
        return {"success": False, "error": str(e)}


# ===== User: Enrolled Courses =====

@app.get("/api/user/courses")
async def lay_khoa_hoc_dang_ky(user_id: str = "default"):
    """Trả về danh sách khóa học từ lộ trình học của user."""
    db = chat_service._db
    if db is None:
        return {"courses": course_catalog.lay_tat_ca_khoa_hoc()}
    try:
        # Lấy tất cả learning_plans của user
        plans_cursor = db.learning_plans.find({"user_id": user_id})
        course_ids_seen: set = set()
        enrolled_courses = []
        async for plan in plans_cursor:
            for milestone in plan.get("milestones", []):
                cid = milestone.get("course_id", "")
                if cid and cid not in course_ids_seen:
                    course_ids_seen.add(cid)
                    course = course_catalog.lay_khoa_hoc(cid)
                    if course:
                        enrolled_courses.append(course)
        # Nếu không có enrolled → fallback toàn bộ catalog
        if not enrolled_courses:
            enrolled_courses = course_catalog.lay_tat_ca_khoa_hoc()
        return {"courses": enrolled_courses}
    except Exception as e:
        return {"courses": course_catalog.lay_tat_ca_khoa_hoc(), "error": str(e)}


# ===== User: All Learning Goals =====

@app.get("/api/user/goals")
async def lay_muc_tieu_user(user_id: str = "default"):
    """Trả về tất cả mục tiêu học tập của user kèm thông tin plan."""
    db = chat_service._db
    if db is None:
        return {"goals": []}
    try:
        goals_cursor = db.learning_goals.find({"user_id": user_id}).sort("created_at", -1)
        goals = []
        async for g in goals_cursor:
            goal_id = g.get("goal_id", str(g.get("_id", "")))
            # Lấy plan để biết các khóa học trong lộ trình
            plan = await db.learning_plans.find_one({"goal_id": goal_id})
            plan_courses: list[str] = []
            if plan:
                for milestone in plan.get("milestones", []):
                    for c in milestone.get("courses", []):
                        cid = c.get("course_id", c) if isinstance(c, dict) else c
                        if cid and cid not in plan_courses:
                            plan_courses.append(cid)
            goals.append({
                "goal_id": goal_id,
                "title": g.get("title", ""),
                "current_level": g.get("current_level", ""),
                "target_score": g.get("target_score", ""),
                "deadline": g.get("deadline", ""),
                "plan_course_ids": plan_courses,
            })
        return {"goals": goals}
    except Exception as e:
        return {"goals": [], "error": str(e)}


# ===== Phase 3: Adaptive Quiz Generation =====

@app.post("/api/quiz/generate")
async def tao_quiz(request: Request):
    """Tao 5 MCQ dua tren goal_id/course_id - cau hoi gan voi noi dung lo trinh."""
    body = await request.json()
    user_id = body.get("user_id", "default")
    topic = body.get("topic", "")
    goal_title = body.get("goal_title", "")
    goal_id = body.get("goal_id", "")
    course_id = body.get("course_id", "")
    profile = await learner_profile_service.get_profile(user_id)
    level = profile.get("level", "Intermediate") if profile else "Intermediate"

    # ── Adaptive difficulty dựa trên quiz history ──
    difficulty_note = ""
    try:
        db_hist = chat_service._db
        if db_hist is not None:
            topic_key = course_id or goal_id or goal_title
            if topic_key:
                past = []
                async for doc in db_hist.quiz_results.find(
                    {"user_id": user_id, "$or": [{"course_id": topic_key}, {"goal_title": topic_key}, {"goal_title": goal_title}]},
                    {"percentage": 1}
                ):
                    past.append(doc.get("percentage", 0))
                if past:
                    avg = sum(past) / len(past)
                    if avg >= 80:
                        difficulty_note = f" Trình độ THỰC TẾ: CAO (avg {round(avg)}%) → tăng độ khó, câu hỏi nâng cao, bẫy tinh tế."
                    elif avg >= 50:
                        difficulty_note = f" Trình độ THỰC TẾ: TRUNG BÌNH (avg {round(avg)}%) → giữ độ khó vừa phải."
                    else:
                        difficulty_note = f" Trình độ THỰC TẾ: YẾU (avg {round(avg)}%) → câu hỏi cơ bản, tập trung ôn nền tảng."
    except Exception:
        pass

    course_title = ""
    course_context = ""
    db = chat_service._db

    # ── Ưu tiên 1: quiz theo 1 khóa học cụ thể ──
    if course_id:
        course = course_catalog.lay_khoa_hoc(course_id)
        if course:
            course_title = course["title"]
            desc = course.get("description", "")
            skills = ", ".join(course.get("skills", []))
            course_context = (
                f"Khóa học '{course_title}': {desc} "
                f"Kỹ năng trọng tâm: {skills}. "
                f"Câu hỏi PHẢI gắn với nội dung và kỹ năng của khóa học này."
            )
            goal_title = course_title

    # ── Ưu tiên 2: quiz theo mục tiêu → lấy các khóa học trong lộ trình ──
    elif goal_id and db is not None:
        try:
            goal_doc = await db.learning_goals.find_one({"goal_id": goal_id})
            if not goal_doc:
                goal_doc = await db.learning_goals.find_one({"_id": goal_id})
            if goal_doc:
                goal_title = goal_doc.get("title", goal_title)
                plan = await db.learning_plans.find_one({"goal_id": goal_id})
                plan_course_descs = []
                if plan:
                    for milestone in plan.get("milestones", []):
                        for c in milestone.get("courses", []):
                            cid = c.get("course_id", c) if isinstance(c, dict) else c
                            course_info = course_catalog.lay_khoa_hoc(str(cid))
                            if course_info:
                                plan_course_descs.append(
                                    f"- {course_info['title']}: {course_info.get('description','')} [{', '.join(course_info.get('skills',[]))}]"
                                )
                if plan_course_descs:
                    course_context = (
                        f"Mục tiêu '{goal_title}'. Lộ trình gồm các khóa học:\n"
                        + "\n".join(plan_course_descs)
                        + "\nCâu hỏi PHẢI liên quan đến nội dung có trong lộ trình này."
                    )
                else:
                    course_context = f"Mục tiêu: {goal_title} (trình độ hiện tại: {goal_doc.get('current_level','')}, target: {goal_doc.get('target_score','')})"
        except Exception:
            pass

    # ── Fallback: lấy goal mới nhất từ DB ──
    elif not topic and not goal_title and db is not None:
        try:
            goal_doc = await db.learning_goals.find_one({"user_id": user_id}, sort=[("created_at", -1)])
            if goal_doc:
                goal_title = goal_doc.get("title", "")
                course_context = f"Trình độ: {goal_doc.get('current_level','')}, target: {goal_doc.get('target_score','')}"
        except Exception:
            pass

    os_key = os.environ.get("GEMINI_API_KEY", "")
    if not os_key:
        return {"quiz": [
            {"question": "Which tense is used for actions happening now?", "options": ["Past Simple", "Present Continuous", "Future Simple", "Past Perfect"], "correct": 1, "explanation": "Present Continuous (is/are + V-ing) for current actions."},
        ], "goal_title": goal_title, "course_id": course_id, "course_title": course_title}
    try:
        if course_id and course_context:
            subject = f"khóa học:\n{course_context}"
        elif goal_id and course_context:
            subject = course_context
        elif topic:
            subject = f"chủ đề: {topic}"
        else:
            subject = f"mục tiêu học tập: {goal_title}. {course_context}"

        quiz_prompt = (
            f"Tạo ĐÚNG 5 câu trắc nghiệm (MCQ) bằng tiếng Việt cho học viên trình độ {level} về:\n{subject}\n\n"
            f"Yêu cầu BẮT BUỘC:\n"
            f"- Câu hỏi PHẢI trực tiếp kiểm tra kiến thức về '{subject}' - TUYỆT ĐỐI KHÔNG hỏi từ vựng đơn giản (màu sắc, chào hỏi, số đếm) không liên quan chủ đề\n"
            f"- Nếu chủ đề là IELTS Reading: hỏi về skimming/scanning, question types (True/False/NG, Matching Headings, Summary), inference skills, chiến thuật đọc nhanh\n"
            f"- Nếu chủ đề là IELTS Writing: hỏi về cấu trúc Task 1/2, thesis statement, coherence, grammar points thường gặp\n"
            f"- Nếu chủ đề là Toán: hỏi về công thức, định lý, bài toán tính toán theo đúng phạm vi chủ đề\n"
            f"- Nếu chủ đề là Python: hỏi về cú pháp, built-in functions, data structures, OOP concepts tương ứng\n"
            f"- 4 lựa chọn A/B/C/D, đáp án sai phải có vẻ hợp lý (không quá rõ ràng)\n"
            f"- Độ khó: {difficulty_note if difficulty_note else 'phù hợp với trình độ'}\n"
            "- Giải thích ngắn gọn sau khi trả lời đúng\n"
            'Trả về JSON array: [{"question":"...","options":["A...","B...","C...","D..."],"correct":0,"explanation":"..."}]. '
            "correct là index 0-3. Chỉ JSON, không markdown, không text thừa."
        )
        response = gemini_client.models.generate_content(model="gemini-2.0-flash", contents=quiz_prompt)
        text = response.text.strip()
        if text.startswith("```"):
            text = "\n".join(text.split("\n")[1:-1])
        quiz = json.loads(text)
        return {"quiz": quiz[:5], "goal_title": goal_title, "course_id": course_id, "course_title": course_title}
    except Exception as e:
        print(f"Loi quiz: {e}")
        return {"quiz": [], "goal_title": goal_title}


# ===== WebSocket Endpoint =====


@app.websocket("/ws/chat/{session_id}")
async def websocket_chat(websocket: WebSocket, session_id: str, user_id: str = "guest"):
    """Endpoint WebSocket cho chat real-time."""
    await websocket.accept()
    print(f"🔗 WebSocket kết nối: session={session_id}, user={user_id}")

    # Kiểm tra hoặc tạo hội thoại với user_id đúng
    hoi_thoai = await chat_service.lay_hoi_thoai(session_id)
    if not hoi_thoai:
        hoi_thoai = await chat_service.tao_hoi_thoai(user_id, session_id)

    try:
        while True:
            # Nhận tin nhắn từ client
            du_lieu = await websocket.receive_json()
            loai = du_lieu.get("type", "message")

            if loai == "message":
                noi_dung = du_lieu.get("content", "").strip()
                if not noi_dung:
                    continue

                # 1. Lưu tin nhắn user
                await chat_service.luu_tin_nhan(session_id, "user", noi_dung)

                # 2. Lấy lịch sử để đưa vào context
                lich_su = await chat_service.lay_lich_su_tin_nhan(session_id)

                # 3. Gửi trạng thái "đang trả lời"
                msg_id = f"msg_{uuid.uuid4().hex[:8]}"
                await websocket.send_json({
                    "type": "stream_start",
                    "message_id": msg_id,
                })

                # 4. Tạo phản hồi AI
                phan_hoi = await tao_phan_hoi_ai(noi_dung, lich_su[:-1])  # Bỏ tin nhắn cuối (vừa gửi)

                # 5. Gửi phản hồi (giả lập streaming – gửi từng đoạn)
                cac_doan = chia_doan_van_ban(phan_hoi)
                for doan in cac_doan:
                    await websocket.send_json({
                        "type": "stream_chunk",
                        "message_id": msg_id,
                        "content": doan,
                    })

                # 6. Gửi kết thúc stream
                await websocket.send_json({
                    "type": "stream_end",
                    "message_id": msg_id,
                    "content": phan_hoi,
                })

                # 7. Lưu phản hồi AI
                await chat_service.luu_tin_nhan(session_id, "assistant", phan_hoi)

            elif loai == "typing":
                # Client thông báo đang gõ – có thể broadcast cho các client khác
                pass

    except WebSocketDisconnect:
        print(f"🔌 WebSocket ngắt kết nối: session={session_id}")
    except Exception as e:
        print(f"❌ Lỗi WebSocket: {e}")
        try:
            await websocket.send_json({
                "type": "error",
                "content": f"Đã xảy ra lỗi: {str(e)[:200]}",
            })
        except Exception:
            pass


def chia_doan_van_ban(van_ban: str, kich_thuoc: int = 20) -> list[str]:
    """Chia văn bản thành các đoạn nhỏ để giả lập streaming."""
    if not van_ban:
        return [""]
    cac_doan = []
    for i in range(0, len(van_ban), kich_thuoc):
        cac_doan.append(van_ban[i:i + kich_thuoc])
    return cac_doan


# ===== REST API Endpoints =====

@app.get("/health")
async def kiem_tra_suc_khoe():
    """Kiểm tra trạng thái server."""
    return {
        "status": "ok",
        "service": "Learnify Tutor AI",
        "version": "1.0.0",
    }


# ===== Learner Profile API =====

@app.get("/api/profile/{user_id}")
async def lay_profile(user_id: str):
    """Lấy hồ sơ học viên."""
    profile = await learner_profile_service.get_profile(user_id)
    if not profile:
        return {"profile": {
            "user_id": user_id,
            "name": "",
            "level": "Beginner",
            "target": "",
            "target_score": None,
            "current_score": None,
            "deadline": "",
            "daily_hours": 2,
            "weak_skills": [],
            "strong_skills": [],
            "interests": [],
            "learning_style": "",
            "notes": "",
        }}
    return {"profile": profile}


@app.put("/api/profile/{user_id}")
async def cap_nhat_profile(user_id: str, body: dict):
    """Cập nhật hồ sơ học viên."""
    profile = await learner_profile_service.upsert_profile(user_id, body)
    return {"profile": profile, "message": "Đã lưu hồ sơ thành công!"}


@app.get("/api/conversations")
async def lay_danh_sach(user_id: str = "guest"):
    """Lấy danh sách hội thoại theo user_id."""
    danh_sach = await chat_service.lay_danh_sach_hoi_thoai(user_id)
    return {"conversations": danh_sach}


@app.get("/api/conversations/starred")
async def lay_hoi_thoai_yeu_thich():
    """Lấy danh sách hội thoại yêu thích."""
    collection = chat_service.lay_collection()
    cursor = collection.find(
        {"starred": True},
        {"_id": 0, "session_id": 1, "title": 1, "updated_at": 1, "starred": 1}
    ).sort("updated_at", -1)
    danh_sach = await cursor.to_list(length=100)
    return {"conversations": danh_sach}


@app.get("/api/conversations/{session_id}")
async def lay_chi_tiet(session_id: str):
    """Lấy chi tiết hội thoại."""
    hoi_thoai = await chat_service.lay_hoi_thoai(session_id)
    if not hoi_thoai:
        return {"error": "Không tìm thấy hội thoại"}, 404

    return {
        "session_id": session_id,
        "title": hoi_thoai.get("title", ""),
        "messages": hoi_thoai.get("messages", []),
    }


@app.delete("/api/conversations/{session_id}")
async def xoa_cuoc_tro_chuyen(session_id: str):
    """Xóa hội thoại."""
    thanh_cong = await chat_service.xoa_hoi_thoai(session_id)
    if thanh_cong:
        return {"message": "Đã xóa hội thoại"}
    return {"error": "Không tìm thấy hội thoại"}, 404


@app.delete("/api/conversations")
async def xoa_tat_ca_hoi_thoai():
    """Xóa toàn bộ lịch sử hội thoại."""
    if chat_service._db is not None:
        result = await chat_service.lay_collection().delete_many({})
        return {"message": f"Đã xóa {result.deleted_count} hội thoại"}
    return {"error": "Database chưa kết nối"}, 500


@app.put("/api/conversations/{session_id}/rename")
async def doi_ten_hoi_thoai(session_id: str, body: dict):
    """Đổi tên hội thoại."""
    title = body.get("title", "").strip()
    if not title:
        return {"error": "Tiêu đề không được để trống"}, 400
    result = await chat_service.lay_collection().update_one(
        {"session_id": session_id},
        {"$set": {"title": title}}
    )
    if result.modified_count > 0:
        return {"message": "Đã đổi tên", "title": title}
    return {"error": "Không tìm thấy hội thoại"}, 404


@app.put("/api/conversations/{session_id}/star")
async def danh_sao_hoi_thoai(session_id: str, body: dict):
    """Đánh sao / bỏ sao hội thoại."""
    starred = body.get("starred", False)
    result = await chat_service.lay_collection().update_one(
        {"session_id": session_id},
        {"$set": {"starred": starred}}
    )
    if result.matched_count > 0:
        return {"message": "Đã cập nhật", "starred": starred}
    return {"error": "Không tìm thấy hội thoại"}, 404




# ===== GOALS & PLANS API =====

@app.get("/api/courses")
async def lay_danh_muc_khoa_hoc():
    """Lấy danh mục khóa học."""
    return {"courses": course_catalog.lay_tat_ca_khoa_hoc()}


@app.get("/api/progress/{user_id}")
async def lay_tien_do_api(user_id: str):
    """Lấy tiến độ khóa học của user."""
    tien_do = await goal_service.lay_tien_do_khoa_hoc(user_id)
    # Chuyển từ dict {course_id: pct} sang list
    progress_list = [
        {"course_id": cid, "percent_complete": pct}
        for cid, pct in tien_do.items()
    ]
    return {"progress": progress_list}


@app.post("/api/goals")
async def tao_muc_tieu_api(body: dict):
    """Tạo mục tiêu học tập."""
    user_id = body.get("user_id", "default")
    goal = await goal_service.tao_muc_tieu(user_id, body)
    # Tạo plan rỗng nếu chưa có
    await goal_service.luu_lo_trinh(goal["goal_id"], user_id, [])
    return {"goal": goal}


@app.put("/api/goals/{goal_id}/milestones")
async def cap_nhat_milestones(goal_id: str, body: dict):
    """Cập nhật toàn bộ danh sách milestones của 1 goal."""
    goal = await goal_service.lay_muc_tieu(goal_id)
    if not goal:
        return {"error": "Không tìm thấy mục tiêu"}, 404
    milestones = body.get("milestones", [])
    # Đảm bảo mỗi milestone có milestone_id
    for ms in milestones:
        if not ms.get("milestone_id"):
            ms["milestone_id"] = f"ms_{uuid.uuid4().hex[:6]}"
        ms.setdefault("status", "pending")
        ms.setdefault("progress_pct", 0)
        ms.setdefault("courses", [])
    plan = await goal_service.luu_lo_trinh(goal_id, goal["user_id"], milestones)
    return {"plan": plan}


@app.get("/api/goals")
async def lay_danh_sach_muc_tieu(user_id: str = "default"):
    """Lấy danh sách mục tiêu."""
    goals = await goal_service.lay_muc_tieu_user(user_id)
    return {"goals": goals}


@app.get("/api/goals/{goal_id}")
async def lay_chi_tiet_muc_tieu(goal_id: str):
    """Lấy chi tiết mục tiêu + lộ trình."""
    goal = await goal_service.lay_muc_tieu(goal_id)
    if not goal:
        return {"error": "Không tìm thấy mục tiêu"}, 404
    plan = await goal_service.lay_lo_trinh(goal_id)
    progress = await goal_service.lay_tien_do_khoa_hoc(goal.get("user_id", "default"))
    return {"goal": goal, "plan": plan, "course_progress": progress}


@app.post("/api/goals/{goal_id}/generate-plan")
async def tao_lo_trinh_api(goal_id: str):
    """AI tạo lộ trình từ mục tiêu."""
    goal = await goal_service.lay_muc_tieu(goal_id)
    if not goal:
        return {"error": "Không tìm thấy mục tiêu"}, 404

    all_courses = course_catalog.lay_tat_ca_khoa_hoc()
    course_info = json.dumps(all_courses, ensure_ascii=False, indent=2)

    prompt = f"""Với mục tiêu: {goal['title']}
Trình độ: {goal.get('current_level', 'chưa rõ')}
Thời gian: {goal.get('weekly_hours', 10)}h/tuần, deadline {goal.get('deadline', '6 tháng')}
Kỹ năng yếu: {', '.join(goal.get('weak_skills', []))}

Danh mục khóa Learnify:
{course_info}

Hãy tạo lộ trình 4-6 milestones. Output dạng JSON array (không markdown):
[{{
  "milestone_id": "ms_01",
  "title": "Tên milestone",
  "month": 1,
  "courses": [{{
    "course_id": "xxx",
    "priority": 1
  }}],
  "target": "Mục tiêu của milestone",
  "status": "pending",
  "progress_pct": 0
}}]"""

    try:
        if gemini_client:
            response = gemini_client.models.generate_content(
                model="gemini-2.0-flash",
                contents=[{"role": "user", "parts": [{"text": prompt}]}],
            )
            text = response.text.strip()
            # Clean markdown wrapping
            if text.startswith("```"):
                text = text.split("\n", 1)[1]
                text = text.rsplit("```", 1)[0]
            milestones = json.loads(text)
        else:
            # Mock milestones nếu không có API key
            milestones = [
                {"milestone_id": "ms_01", "title": "Nền tảng", "month": 1, "courses": [{"course_id": "vocab_5", "priority": 1}, {"course_id": "grammar_ielts", "priority": 2}], "target": "Xây dựng nền tảng", "status": "pending", "progress_pct": 0},
                {"milestone_id": "ms_02", "title": "Kỹ năng chính", "month": 2, "courses": [{"course_id": "reading_strategies", "priority": 1}, {"course_id": "listening_strategies", "priority": 2}], "target": "Nắm chiến thuật", "status": "pending", "progress_pct": 0},
                {"milestone_id": "ms_03", "title": "Luyện đề", "month": 4, "courses": [{"course_id": "practice_reading_listening", "priority": 1}], "target": "Luyện đề", "status": "pending", "progress_pct": 0},
                {"milestone_id": "ms_04", "title": "Sprint cuối", "month": 6, "courses": [{"course_id": "mock_full", "priority": 1}], "target": "Thi thử", "status": "pending", "progress_pct": 0},
            ]

        plan = await goal_service.luu_lo_trinh(goal_id, goal["user_id"], milestones)
        return {"plan": plan}
    except Exception as e:
        print(f"❌ Lỗi tạo lộ trình: {e}")
        return {"error": str(e)}, 500


@app.put("/api/goals/{goal_id}")
async def cap_nhat_muc_tieu_api(goal_id: str, body: dict):
    """Cập nhật mục tiêu."""
    ok = await goal_service.cap_nhat_muc_tieu(goal_id, body)
    return {"success": ok}


@app.delete("/api/goals/{goal_id}")
async def xoa_muc_tieu_api(goal_id: str):
    """Xóa mục tiêu."""
    ok = await goal_service.xoa_muc_tieu(goal_id)
    return {"success": ok}


@app.get("/api/progress")
async def lay_tien_do(user_id: str = "default"):
    """Lấy tiến độ khóa học."""
    progress = await goal_service.lay_tien_do_khoa_hoc(user_id)
    return {"progress": progress}


@app.put("/api/progress/{course_id}")
async def cap_nhat_tien_do_api(course_id: str, body: dict):
    """Cập nhật tiến độ 1 khóa."""
    user_id = body.get("user_id", "default")
    pct = body.get("progress_pct", 0)
    await goal_service.cap_nhat_tien_do_khoa_hoc(user_id, course_id, pct)
    return {"success": True}

@app.post("/api/seed")
async def force_seed(user_id: str = "default"):
    """Force re-seed dữ liệu mẫu (xóa hết rồi tạo mới)."""
    try:
        if chat_service._db is not None:
            await chat_service._db.course_progress.delete_many({"user_id": user_id})
            await chat_service._db.learning_goals.delete_many({"user_id": user_id})
            await chat_service._db.learning_plans.delete_many({"user_id": user_id})
        await goal_service.seed_tien_do_mau(user_id)
        return {"success": True, "message": "Đã seed lại dữ liệu 3 môn: Toán, IELTS, Python"}
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"success": False, "error": str(e)}


# ========== Phase 3: Streak & Weekly Sessions Tracking ==========

@app.get("/api/streak")
async def get_streak(user_id: str = "default"):
    """
    Trả về streak ngày liên tiếp + mảng 7 ngày gần nhất (1 = có học, 0 = nghỉ).
    Mỗi lần gọi endpoint này được xem là 1 phiên học trong ngày hôm nay.
    """
    from datetime import datetime, timedelta, timezone

    db = chat_service._db
    if db is None:
        return {"streak": 0, "last_active": None, "weekly_sessions": [0]*7}

    col = db.streak_sessions
    today = datetime.now(timezone.utc).date()

    # Ghi nhận phiên học hôm nay (upsert theo ngày)
    today_str = today.isoformat()
    await col.update_one(
        {"user_id": user_id, "date": today_str},
        {"$set": {"user_id": user_id, "date": today_str, "active": True}},
        upsert=True,
    )

    # Lấy 7 ngày gần nhất
    seven_days = [(today - timedelta(days=6-i)).isoformat() for i in range(7)]
    records = await col.find({"user_id": user_id, "date": {"$in": seven_days}}).to_list(length=100)
    active_dates = {r["date"] for r in records}
    weekly_sessions = [1 if d in active_dates else 0 for d in seven_days]

    # Tính streak: đếm ngày liên tiếp từ hôm nay ngược về
    streak = 0
    check = today
    while True:
        if check.isoformat() in active_dates:
            streak += 1
            check -= timedelta(days=1)
            # Kiểm tra thêm ngày xa hơn 7 ngày
            if streak > 7:
                older = await col.find_one({"user_id": user_id, "date": check.isoformat()})
                if not older:
                    break
        else:
            break

    return {
        "streak": streak,
        "last_active": today_str,
        "weekly_sessions": weekly_sessions,
    }


# ========== Quiz Result & History ==========

@app.post("/api/quiz/result")
async def luu_ket_qua_quiz(body: dict):
    """Save quiz result from QuizModal + mark streak active."""
    from datetime import datetime, timezone
    db = chat_service._db
    if db is None:
        return {"success": False}
    user_id = body.get("user_id", "default")
    score = body.get("score", 0)
    total = body.get("total", 1)
    percentage = round(score / total * 100) if total else 0
    result = {
        "user_id": user_id,
        "goal_title": body.get("goal_title", ""),
        "course_title": body.get("topic", body.get("goal_title", "")),
        "score": score,
        "total": total,
        "percentage": percentage,
        "date": datetime.now(timezone.utc).isoformat(),
    }
    await db.quiz_results.insert_one(result)
    # Mark streak active for today
    today_str = datetime.now(timezone.utc).date().isoformat()
    await db.streak_sessions.update_one(
        {"user_id": user_id, "date": today_str},
        {"$set": {"user_id": user_id, "date": today_str, "active": True}},
        upsert=True,
    )
    return {"success": True, "percentage": percentage}


@app.get("/api/quiz/history")
async def lay_lich_su_quiz(user_id: str = "default"):
    """Quiz history for GoalsScreen: daily 7 days, recent, by_topic."""
    from datetime import datetime, timedelta, timezone
    db = chat_service._db
    if db is None:
        return {"daily": [{"date": "", "avg_pct": 0, "count": 0}]*7, "recent": [], "by_topic": []}
    today = datetime.now(timezone.utc).date()
    seven_days = [(today - timedelta(days=6-i)).isoformat() for i in range(7)]
    cutoff = (today - timedelta(days=6)).isoformat()
    results = await db.quiz_results.find(
        {"user_id": user_id, "date": {"$gte": cutoff}}
    ).sort("date", -1).to_list(200)
    # Daily aggregation
    daily_map: dict = {d: {"count": 0, "total_pct": 0} for d in seven_days}
    for r in results:
        day = r.get("date", "")[:10]
        if day in daily_map:
            pct = r.get("percentage", round(r.get("score", 0) / max(r.get("total", 1), 1) * 100))
            daily_map[day]["count"] += 1
            daily_map[day]["total_pct"] += pct
    daily = []
    for d in seven_days:
        cnt = daily_map[d]["count"]
        avg = round(daily_map[d]["total_pct"] / cnt) if cnt else 0
        daily.append({"date": d, "avg_pct": avg, "count": cnt})
    # Recent
    recent_docs = await db.quiz_results.find({"user_id": user_id}).sort("date", -1).to_list(10)
    recent = []
    for r in recent_docs:
        r.pop("_id", None)
        r["percentage"] = r.get("percentage", round(r.get("score", 0) / max(r.get("total", 1), 1) * 100))
        recent.append(r)
    # By topic
    topic_map: dict = {}
    all_res = await db.quiz_results.find({"user_id": user_id}).to_list(500)
    for r in all_res:
        key = r.get("course_title") or r.get("goal_title") or "Chung"
        if key not in topic_map:
            topic_map[key] = {"total_pct": 0, "count": 0}
        pct = r.get("percentage", round(r.get("score", 0) / max(r.get("total", 1), 1) * 100))
        topic_map[key]["total_pct"] += pct
        topic_map[key]["count"] += 1
    by_topic = [
        {"key": k, "label": k, "avg_pct": round(v["total_pct"] / v["count"]), "attempts": v["count"]}
        for k, v in topic_map.items()
    ]
    return {"daily": daily, "recent": recent, "by_topic": by_topic}


# ===== Chạy server =====

if __name__ == "__main__":
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8000"))
    print(f"🚀 Khởi động Learnify Tutor AI tại http://{host}:{port}")
    uvicorn.run("server:app", host=host, port=port, reload=True)
