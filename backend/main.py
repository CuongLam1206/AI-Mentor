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
from services import goal_service, chat_service

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

cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
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

if __name__ == "__main__":
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8000"))
    print(f"🚀 Khởi động tại http://{host}:{port}")
    uvicorn.run("main:app", host=host, port=port, reload=True)
