"""
core/ai_client.py – Gemini AI client singleton + prompt builder.
"""

import os
from google import genai
from google.genai import types

_client = None


def init_client():
    """Khởi tạo Gemini client."""
    global _client
    api_key = os.getenv("GEMINI_API_KEY", "")
    if not api_key:
        print("⚠️  Chưa cấu hình GEMINI_API_KEY – sẽ dùng chế độ echo")
        _client = None
        return None
    _client = genai.Client(api_key=api_key)
    return _client


def get_client():
    """Trả về Gemini client instance."""
    return _client


# Re-export types for use in other modules
__all__ = ["init_client", "get_client", "types"]
