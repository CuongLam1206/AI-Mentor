"""
core/database.py – MongoDB connection singleton.
Import get_db() to access the database anywhere.
"""

import os
from typing import Optional
from motor.motor_asyncio import AsyncIOMotorClient

_client: Optional[AsyncIOMotorClient] = None
_db = None


async def connect():
    """Khởi tạo kết nối MongoDB."""
    global _client, _db
    uri = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
    db_name = os.getenv("MONGODB_DATABASE") or os.getenv("MONGODB_DB_NAME", "learnify_tutor")
    _client = AsyncIOMotorClient(uri)
    _db = _client[db_name]
    await _db.conversations.create_index("user_id")
    await _db.conversations.create_index("updated_at")
    print(f"✅ Đã kết nối MongoDB: {db_name}")


async def disconnect():
    """Đóng kết nối MongoDB."""
    global _client
    if _client:
        _client.close()
        print("🔌 Đã đóng kết nối MongoDB")


def get_db():
    """Trả về database instance hiện tại."""
    return _db
