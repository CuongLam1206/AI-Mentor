"""
main.py – Entry point cho Learnify Tutor AI Backend.

Cấu trúc:
  core/        – MongoDB connection, Gemini AI client
  services/    – Business logic (chat, goals, profile, catalog)
  routes/      – API endpoints (conversations, profile, goals, websocket)
"""

import json
import os
from contextlib import asynccontextmanager

import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core import database, ai_client
from services import goal_service, chat_service, learner_profile_service, course_catalog

from routes import conversations, profile, goals, websocket as ws_router

load_dotenv()


# ===== Vòng đời ứng dụng =====

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Khởi tạo DB
    await database.connect()
    # Khởi tạo Gemini client
    ai_client.init_client()
    # Seed dữ liệu mẫu
    await goal_service.seed_tien_do_mau()
    # Dọn conversations trống
    db = database.get_db()
    if db is not None:
        r = await db.conversations.delete_many({"messages": {"$size": 0}})
        if r.deleted_count > 0:
            print(f"🧹 Đã xóa {r.deleted_count} conversation trống")
    print("🚀 Learnify Tutor AI Backend đã khởi động!")
    yield
    await database.disconnect()


# ===== Khởi tạo FastAPI =====

app = FastAPI(
    title="Learnify Tutor AI",
    description="Backend cho AI Tutor Chat Panel",
    version="2.0.0",
    lifespan=lifespan,
)

cors_origins = os.getenv("CORS_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ===== Register Routes =====

app.include_router(conversations.router)
app.include_router(profile.router)
app.include_router(goals.router)
app.include_router(ws_router.router)


# ===== Health & Misc =====

@app.get("/health")
async def health():
    return {"status": "ok", "service": "Learnify Tutor AI", "version": "2.0.0"}


@app.get("/api/courses")
async def lay_danh_muc():
    from services import course_catalog
    return {"courses": course_catalog.lay_tat_ca_khoa_hoc()}


@app.get("/api/progress/{user_id}")
async def lay_tien_do(user_id: str):
    tien_do = await goal_service.lay_tien_do_khoa_hoc(user_id)
    return {"progress": [{"course_id": cid, "percent_complete": pct} for cid, pct in tien_do.items()]}


@app.post("/api/seed")
async def force_seed(user_id: str = "default"):
    db = database.get_db()
    if db:
        await db.course_progress.delete_many({"user_id": user_id})
        await db.learning_goals.delete_many({"user_id": user_id})
        await db.learning_plans.delete_many({"user_id": user_id})
    await goal_service.seed_tien_do_mau(user_id)
    return {"success": True, "message": "Đã seed lại dữ liệu mẫu"}


# ===== Run =====

# ===== Missing Routes (not in routes/ modules) =====

import json as _json
import uuid as _uuid
from fastapi import Request as _Request
from core.ai_client import get_client as _get_client


@app.post("/api/goals")
async def tao_muc_tieu(body: dict):
    user_id = body.get("user_id", "guest")
    goal = await goal_service.tao_muc_tieu(user_id, body)
    await goal_service.luu_lo_trinh(goal["goal_id"], user_id, [])
    return {"goal": goal}


@app.put("/api/goals/{goal_id}")
async def cap_nhat_muc_tieu(goal_id: str, body: dict):
    ok = await goal_service.cap_nhat_muc_tieu(goal_id, body)
    return {"success": ok}


@app.delete("/api/goals/{goal_id}")
async def xoa_muc_tieu(goal_id: str):
    ok = await goal_service.xoa_muc_tieu(goal_id)
    return {"success": ok}


@app.put("/api/goals/{goal_id}/milestones")
async def cap_nhat_milestones(goal_id: str, body: dict):
    goal = await goal_service.lay_muc_tieu(goal_id)
    if not goal:
        return {"error": "Không tìm thấy mục tiêu"}
    milestones = body.get("milestones", [])
    for ms in milestones:
        if not ms.get("milestone_id"):
            ms["milestone_id"] = f"ms_{_uuid.uuid4().hex[:6]}"
        ms.setdefault("status", "pending")
        ms.setdefault("progress_pct", 0)
        ms.setdefault("courses", [])
    plan = await goal_service.luu_lo_trinh(goal_id, goal["user_id"], milestones)
    return {"plan": plan}


@app.post("/api/goals/{goal_id}/generate-plan")
async def tao_lo_trinh(goal_id: str):
    goal = await goal_service.lay_muc_tieu(goal_id)
    if not goal:
        return {"error": "Không tìm thấy mục tiêu"}
    all_courses = course_catalog.lay_tat_ca_khoa_hoc()
    course_info = _json.dumps(all_courses, ensure_ascii=False, indent=2)
    weak_skills = ", ".join(goal.get("weak_skills", []))
    title = goal.get("title", "")
    level = goal.get("current_level", "")
    hours = goal.get("weekly_hours", 10)
    deadline = goal.get("deadline", "6 tháng")
    prompt = (
        f"Với mục tiêu: {title}, trình độ: {level}, "
        f"thời gian: {hours}h/tuần, deadline: {deadline}, kỹ năng yếu: {weak_skills}.\n"
        f"Danh mục khóa Learnify:\n{course_info}\n"
        "Tạo 4-6 milestones. JSON array không markdown: "
        '[{"milestone_id":"ms_01","title":"...","month":1,"courses":[{"course_id":"xxx","priority":1}],"target":"...","status":"pending","progress_pct":0}]'
    )
    try:
        client = _get_client()
        if client:
            resp = client.models.generate_content(model="gemini-2.0-flash", contents=prompt)
            text = resp.text.strip()
            if text.startswith("```"): text = "\n".join(text.split("\n")[1:-1])
            milestones = _json.loads(text)
        else:
            milestones = [{"milestone_id": "ms_01", "title": "Nền tảng", "month": 1, "courses": [], "target": "Xây dựng nền tảng", "status": "pending", "progress_pct": 0}]
        plan = await goal_service.luu_lo_trinh(goal_id, goal["user_id"], milestones)
        return {"plan": plan}
    except Exception as e:
        return {"error": str(e)}


@app.get("/api/notes")
async def lay_ghi_chu(user_id: str = "guest"):
    db = database.get_db()
    if not db: return {"notes": []}
    notes = []
    async for doc in db.notes.find({"user_id": user_id}).sort("created_at", -1).limit(50):
        doc["note_id"] = str(doc.pop("_id"))
        notes.append(doc)
    return {"notes": notes}


@app.post("/api/notes")
async def luu_ghi_chu(request: _Request):
    from datetime import datetime, timezone
    body = await request.json()
    db = database.get_db()
    if not db: return {"success": False}
    note = {"user_id": body.get("user_id", "guest"), "content": body.get("content", ""), "source": body.get("source", "chat"), "session_id": body.get("session_id", ""), "tags": body.get("tags", []), "created_at": datetime.now(timezone.utc).isoformat()}
    await db.notes.insert_one(note)
    return {"success": True}


@app.delete("/api/notes/{note_id}")
async def xoa_ghi_chu(note_id: str, user_id: str = "guest"):
    from bson import ObjectId
    db = database.get_db()
    if not db: return {"success": False}
    await db.notes.delete_one({"_id": ObjectId(note_id), "user_id": user_id})
    return {"success": True}


@app.get("/api/streak")
async def get_streak(user_id: str = "guest"):
    from datetime import datetime, timedelta, timezone
    db = database.get_db()
    if not db: return {"streak": 0, "last_active": None, "weekly_sessions": [0]*7}
    col = db.streak_sessions
    today = datetime.now(timezone.utc).date()
    today_str = today.isoformat()
    await col.update_one({"user_id": user_id, "date": today_str}, {"$set": {"user_id": user_id, "date": today_str, "active": True}}, upsert=True)
    seven_days = [(today - timedelta(days=6-i)).isoformat() for i in range(7)]
    records = await col.find({"user_id": user_id, "date": {"$in": seven_days}}).to_list(length=100)
    active_dates = {r["date"] for r in records}
    weekly_sessions = [1 if d in active_dates else 0 for d in seven_days]
    streak = 0
    check = today
    while check.isoformat() in active_dates:
        streak += 1
        check = check - timedelta(days=1)
    return {"streak": streak, "last_active": today_str, "weekly_sessions": weekly_sessions}


@app.get("/api/greeting")
async def get_greeting(user_id: str = "guest"):
    from routes.websocket import tao_loi_chao_proactive
    greeting = await tao_loi_chao_proactive(user_id)
    return {"greeting": greeting}


@app.get("/api/nudge")
async def get_nudge(user_id: str = "guest"):
    return {"nudge": None}


@app.post("/api/quiz/generate")
async def tao_quiz(body: dict):
    user_id = body.get("user_id", "guest")
    topic = body.get("topic", "")
    goal_title = body.get("goal_title", "")
    client = _get_client()
    if not client:
        return {"quiz": [], "goal_title": goal_title}
    prompt = f"Tạo ĐÚNG 5 câu trắc nghiệm MCQ bằng tiếng Việt về: {topic or goal_title or 'kiến thức chung'}.\n4 lựa chọn A/B/C/D. Giải thích ngắn sau khi trả lời đúng.\nJSON array: [{{\"question\":\"...\",\"options\":[\"A...\",\"B...\",\"C...\",\"D...\"],\"correct\":0,\"explanation\":\"...\"}}]. Chỉ JSON không markdown."
    try:
        resp = client.models.generate_content(model="gemini-2.0-flash", contents=prompt)
        text = resp.text.strip()
        if text.startswith("```"): text = "\n".join(text.split("\n")[1:-1])
        quiz = _json.loads(text)
        return {"quiz": quiz[:5], "goal_title": goal_title}
    except Exception as e:
        return {"quiz": [], "error": str(e)}


@app.post("/api/quiz/submit")
async def nop_quiz(body: dict):
    from datetime import datetime, timezone
    db = database.get_db()
    if not db: return {"success": False}
    result = {"user_id": body.get("user_id", "guest"), "date": datetime.now(timezone.utc).isoformat(), **body}
    await db.quiz_results.insert_one(result)
    return {"success": True}


@app.get("/api/user/courses")
async def lay_khoa_hoc(user_id: str = "guest"):
    return {"courses": course_catalog.lay_tat_ca_khoa_hoc()}


@app.get("/api/user/goals")
async def lay_goals_user(user_id: str = "guest"):
    goals = await goal_service.lay_muc_tieu_user(user_id)
    return {"goals": goals}


@app.get("/api/progress")
async def lay_tien_do_all(user_id: str = "guest"):
    progress = await goal_service.lay_tien_do_khoa_hoc(user_id)
    return {"progress": progress}


@app.put("/api/progress/{course_id}")
async def cap_nhat_tien_do(course_id: str, body: dict):
    user_id = body.get("user_id", "guest")
    pct = body.get("progress_pct", 0)
    await goal_service.cap_nhat_tien_do_khoa_hoc(user_id, course_id, pct)
    return {"success": True}


if __name__ == "__main__":
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8000"))
    print(f"🚀 Khởi động tại http://{host}:{port}")
    uvicorn.run("main:app", host=host, port=port, reload=True)
