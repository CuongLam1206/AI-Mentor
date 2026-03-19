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
from services import goal_service, chat_service, learner_profile_service

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
    # Course catalog removed — AI generates roadmaps independently
    return {"courses": []}


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
        ms.setdefault("topics", [])
        ms.setdefault("activities", [])
        ms.setdefault("resources", [])
        ms.setdefault("courses", [])  # backward compat
    plan = await goal_service.luu_lo_trinh(goal_id, goal["user_id"], milestones)
    return {"plan": plan}


@app.post("/api/goals/{goal_id}/generate-plan")
async def tao_lo_trinh(goal_id: str):
    import re as _re
    goal = await goal_service.lay_muc_tieu(goal_id)
    if not goal:
        return {"error": "Không tìm thấy mục tiêu"}
    title = goal.get("title", "")
    level = goal.get("current_level", "beginner")
    hours = goal.get("weekly_hours", 10)
    deadline = goal.get("deadline", "6 tháng")

    client = _get_client()
    if not client:
        milestones = [{"milestone_id": "ms_01", "title": "Nền tảng", "month": 1,
                       "target": "Xây dựng nền tảng", "status": "pending", "progress_pct": 0,
                       "topics": [], "activities": [], "resources": []}]
        plan = await goal_service.luu_lo_trinh(goal_id, goal["user_id"], milestones)
        return {"plan": plan}

    def extract_json_array(text: str):
        text = text.strip()
        match = _re.search(r'\[.*\]', text, _re.DOTALL)
        if match:
            return _json.loads(match.group(0))
        return _json.loads(text)

    # === PASS 1: Generate milestone structure ===
    prompt1 = (
        f"Tạo lộ trình học cho: \"{title}\" (trình độ: {level}, {hours}h/tuần, {deadline})\n"
        "Trả về JSON array 4-6 milestones. Mỗi milestone:\n"
        "{milestone_id, title, month(số), target, topics[3-5 chủ đề], activities[2-3 hoạt động], "
        "status:'pending', progress_pct:0}\n"
        "CHỈ JSON array không markdown không giải thích."
    )
    try:
        resp1 = client.models.generate_content(model="gemini-2.0-flash", contents=prompt1)
        milestones = extract_json_array(resp1.text)
        print(f"✅ Pass 1: {len(milestones)} milestones")
    except Exception as e:
        print(f"❌ Pass 1 lỗi: {e}")
        return {"error": f"Không tạo được lộ trình: {e}"}

    # Normalize milestone fields
    for i, ms in enumerate(milestones):
        ms.setdefault("milestone_id", f"ms_{i+1:02d}")
        ms.setdefault("status", "pending")
        ms.setdefault("progress_pct", 0)
        ms.setdefault("topics", [])
        ms.setdefault("activities", [])
        ms["resources"] = []  # will fill in pass 2

    # === PASS 2: Generate ALL resources in one batch call ===
    # Use 0-based index to match Gemini's expected idx
    ms_list = "\n".join(
        f"{i}. \"{ms.get('title','')}\" - chủ đề: {', '.join(ms.get('topics', [])[:3])}"
        for i, ms in enumerate(milestones)
    )
    prompt2 = (
        f"Cho {len(milestones)} milestones (index 0 đến {len(milestones)-1}) học \"{title}\":\n{ms_list}\n\n"
        "Gợi ý 2-3 tài liệu thực tế cho TỪNG milestone với idx tương ứng (0-based).\n"
        "Trả về JSON array:\n"
        '[{"idx":0,"resources":[{"name":"...","type":"website","url":"https://...","description":"2 câu","skills":["..."]}]}]\n'
        "CHỈ JSON array, không giải thích."
    )
    try:
        resp2 = client.models.generate_content(model="gemini-2.0-flash", contents=prompt2)
        resource_data = extract_json_array(resp2.text)
        print(f"✅ Pass 2: resources for {len(resource_data)} milestones")
        # Match by order as primary, idx as secondary (safer)
        for pos, item in enumerate(resource_data):
            idx = item.get("idx", pos)
            # Clamp to valid range
            if idx >= len(milestones): idx = pos
            if 0 <= idx < len(milestones):
                resources = item.get("resources", [])
                if resources:
                    milestones[idx]["resources"] = [dict(r, completed=False) for r in resources]
    except Exception as e:
        print(f"⚠️ Pass 2 lỗi: {e}")

    # Post-pass-2 fallback: fill any milestone still without resources
    for ms in milestones:
        if not ms.get("resources"):
            query = ms.get("title", title)
            ms["resources"] = [{
                "name": f"Tìm kiếm: {query}",
                "type": "website",
                "url": f"https://www.google.com/search?q={query.replace(' ', '+')}+tutorial",
                "description": f"Tìm kiếm tài liệu học {query} trên Google.",
                "skills": ms.get("topics", [])[:3] or [query],
                "completed": False,
            }]
            print(f"  → Fallback resource cho: {query}")

    plan = await goal_service.luu_lo_trinh(goal_id, goal["user_id"], milestones)
    return {"plan": plan}


@app.post("/api/resource-info")
async def tao_thong_tin_tai_lieu(request: _Request):
    """Dùng Gemini để sinh thông tin chi tiết cho 1 tài liệu học viên tự nhập."""
    body = await request.json()
    resource_name = body.get("resource_name", "").strip()
    milestone_topic = body.get("milestone_topic", "")

    if not resource_name:
        return {"error": "Thiếu resource_name"}

    client = _get_client()
    if not client:
        return {"resource": {"name": resource_name, "type": "book", "description": "Chưa thể tải mô tả.", "skills": []}}

    prompt = (
        f"Tôi muốn học từ tài liệu sau: \"{resource_name}\".\n"
        f"Chủ đề milestone: {milestone_topic or 'học tập nói chung'}.\n\n"
        "Hãy trả về JSON object MÔ TẢ tài liệu này:\n"
        "- name: tên đầy đủ\n"
        "- type: book | website | video | app | course | tool\n"
        "- url: link thực (nếu biết, không bịa)\n"
        "- description: 2-3 câu mô tả tài liệu dạy gì, phù hợp người học như thế nào\n"
        "- skills: mảng 3-5 kỹ năng cụ thể học được\n\n"
        "Chỉ JSON, không markdown:\n"
        '{"name":"...","type":"...","url":"...","description":"...","skills":["..."]}'
    )
    try:
        resp = client.models.generate_content(model="gemini-2.0-flash", contents=prompt)
        text = resp.text.strip()
        if text.startswith("```"): text = "\n".join(text.split("\n")[1:-1])
        resource = _json.loads(text)
        resource.setdefault("name", resource_name)
        return {"resource": resource}
    except Exception as e:
        return {"resource": {"name": resource_name, "type": "book", "description": f"({str(e)[:80]})", "skills": []}}


@app.post("/api/goals/{goal_id}/enrich-resources")
async def lam_giau_tai_nguyen(goal_id: str, request: _Request):
    """Sinh tài liệu AI cho tất cả milestones còn rỗng resources."""
    import re as _re
    body = await request.json()
    user_id = body.get("user_id", "guest")
    print(f"🔮 Enrich resources: goal={goal_id}, user={user_id}")

    plan = await goal_service.lay_lo_trinh(goal_id)
    if not plan:
        print(f"❌ Không tìm thấy plan cho goal_id={goal_id}")
        return {"error": "Không tìm thấy lộ trình", "enriched": 0, "milestones": []}

    milestones = plan.get("milestones", [])
    print(f"📋 Tổng milestones: {len(milestones)}")
    client = _get_client()
    if not client:
        return {"error": "Chưa cấu hình Gemini API", "enriched": 0, "milestones": milestones}

    enriched_count = 0
    for ms in milestones:
        resources = ms.get("resources") or []
        needs = not resources or all(isinstance(r, str) for r in resources)
        print(f"  → {ms.get('title')}: needs={needs}, resources={len(resources)}")
        if not needs:
            continue
        topics_str = ", ".join(ms.get("topics", [])[:3]) or ms.get("title", "")
        prompt = (
            f"Gợi ý 3 tài liệu học thực tế cho milestone: \"{ms.get('title','')}\"\n"
            f"Chủ đề: {topics_str}\n\n"
            "Trả về JSON array (KHÔNG có markdown, KHÔNG giải thích), mỗi item:\n"
            "name, type(book|website|video|app|course|tool), url(link thực), description(2 câu), skills(mảng 3 kỹ năng)\n"
            "Ví dụ: [{\"name\":\"Real Python\",\"type\":\"website\",\"url\":\"https://realpython.com\","
            "\"description\":\"...\",\"skills\":[\"...\",\"...\",\"...\"]}]"
        )
        try:
            resp = client.models.generate_content(model="gemini-2.0-flash", contents=prompt)
            raw = resp.text.strip()
            print(f"  📩 Raw response ({len(raw)} chars): {raw[:200]}")
            # Robust JSON extraction: find [ ... ] - greedy to capture nested objects
            match = _re.search(r'\[.*\]', raw, _re.DOTALL)
            text = match.group(0) if match else raw
            rich = _json.loads(text)
            if isinstance(rich, list) and rich:
                ms["resources"] = [dict(r, completed=False) for r in rich]
                enriched_count += 1
                print(f"  ✅ Enriched: {[r.get('name') for r in rich]}")
            else:
                print(f"  ⚠️ Empty or invalid list: {rich}")
        except Exception as e:
            print(f"  ❌ Enrich lỗi {ms.get('title')}: {e} | raw: {raw[:100] if 'raw' in dir() else '?'}")

    if enriched_count > 0:
        await goal_service.luu_lo_trinh(goal_id, user_id, milestones)
        print(f"✅ Saved enriched plan: {enriched_count} milestones updated")

    return {"enriched": enriched_count, "milestones": milestones}

@app.get("/api/notes")
async def lay_ghi_chu(user_id: str = "guest"):
    try:
        db = database.get_db()
        if not db:
            return {"notes": []}
        docs = await db.notes.find({"user_id": user_id}).sort("created_at", -1).to_list(50)
        notes = []
        for doc in docs:
            doc["note_id"] = str(doc.pop("_id", ""))
            notes.append(doc)
        return {"notes": notes}
    except Exception as e:
        print(f"Notes error: {e}")
        return {"notes": []}


@app.post("/api/notes")
async def luu_ghi_chu(request: _Request):
    try:
        from datetime import datetime, timezone
        body = await request.json()
        db = database.get_db()
        if not db:
            return {"success": False}
        note = {"user_id": body.get("user_id", "guest"), "content": body.get("content", ""), "source": body.get("source", "chat"), "session_id": body.get("session_id", ""), "tags": body.get("tags", []), "created_at": datetime.now(timezone.utc).isoformat()}
        await db.notes.insert_one(note)
        return {"success": True}
    except Exception as e:
        print(f"Notes POST error: {e}")
        return {"success": False}


@app.delete("/api/notes/{note_id}")
async def xoa_ghi_chu(note_id: str, user_id: str = "guest"):
    try:
        from bson import ObjectId
        db = database.get_db()
        if not db:
            return {"success": False}
        await db.notes.delete_one({"_id": ObjectId(note_id), "user_id": user_id})
        return {"success": True}
    except Exception as e:
        print(f"Notes DELETE error: {e}")
        return {"success": False}


@app.get("/api/streak")
async def get_streak(user_id: str = "guest"):
    try:
        from datetime import datetime, timedelta, timezone
        db = database.get_db()
        if not db:
            return {"streak": 0, "last_active": None, "weekly_sessions": [0]*7}
        col = db.streak_sessions
        today = datetime.now(timezone.utc).date()
        today_str = today.isoformat()
        await col.update_one({"user_id": user_id, "date": today_str}, {"$set": {"user_id": user_id, "date": today_str, "active": True}}, upsert=True)
        seven_days = [(today - timedelta(days=6-i)).isoformat() for i in range(7)]
        records = await col.find({"user_id": user_id, "date": {"$in": seven_days}}).to_list(100)
        active_dates = {r["date"] for r in records}
        weekly_sessions = [1 if d in active_dates else 0 for d in seven_days]
        streak = 0
        check = today
        while check.isoformat() in active_dates:
            streak += 1
            check = check - timedelta(days=1)
        return {"streak": streak, "last_active": today_str, "weekly_sessions": weekly_sessions}
    except Exception as e:
        print(f"Streak error: {e}")
        return {"streak": 0, "last_active": None, "weekly_sessions": [0]*7}


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
