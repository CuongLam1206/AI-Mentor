# 🚀 Deploy Guide — Learnify Tutor AI

> Cập nhật: 2026-03-18

---

## Kiến trúc hệ thống

| Layer | Service | URL |
|-------|---------|-----|
| Frontend | Vercel (auto-deploy từ GitHub) | `ai-mentor-mauve.vercel.app` |
| Backend | Render (auto-deploy từ GitHub) | `ai-mentor-iwkf.onrender.com` |
| Database | MongoDB Atlas | Qua env var `MONGODB_URI` |

---

## ⚠️ Các lỗi hay gặp khi deploy

### 1. NEXT_PUBLIC_* env vars không set trên Vercel
- **Triệu chứng:** Tất cả REST API bị lỗi, chat history trống, quiz/goals không làm được — chỉ WebSocket (chat) hoạt động
- **Nguyên nhân:** `NEXT_PUBLIC_API_URL` không set → frontend gọi `http://localhost:8000`
- **Fix:** Set env vars trên Vercel Dashboard **TRƯỚC** khi deploy:
  ```
  NEXT_PUBLIC_API_URL = https://xxx.onrender.com
  NEXT_PUBLIC_WS_URL  = wss://xxx.onrender.com
  ```
- **Hoặc:** hardcode Render URL làm fallback trong code:
  ```ts
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://xxx.onrender.com";
  ```

---

### 2. CORS chặn REST API từ browser
- **Triệu chứng:** WebSocket work, nhưng tất cả `fetch()` bị block (`CORS error` trong console)
- **Nguyên nhân:** Backend không allow origin của Vercel frontend
- **Fix:**
  ```python
  app.add_middleware(CORSMiddleware,
      allow_origins=["*"],        # hoặc liệt kê ["https://xxx.vercel.app"]
      allow_credentials=False,    # PHẢI False nếu dùng allow_origins=["*"]
      allow_methods=["*"],
      allow_headers=["*"],
  )
  ```
- **⚠️ Lưu ý:** Không kết hợp `allow_credentials=True` + `allow_origins=["*"]` — browser sẽ block

---

### 3. Sai entry point (render.yaml bị override bởi Render dashboard)
- **Triệu chứng:** Đổi `render.yaml` nhưng backend vẫn chạy file cũ
- **Nguyên nhân:** Render dashboard config override `render.yaml` khi service đã tạo thủ công
- **Debug nhanh:** Gọi `/health` → xem `version` trả về để biết đang chạy file nào
- **Fix:** Vào **Render Dashboard → Settings → Build & Deploy → Start Command** → sửa thủ công

---

### 4. Hardcode `user_id` trong backend
- **Triệu chứng:** Mọi user dùng chung history, data lẫn lộn
- **Nguyên nhân:** `user_id="default"` hardcode trong WebSocket handler và API endpoints
- **Fix:** Nhận `user_id` từ query param:
  ```python
  @router.websocket("/ws/chat/{session_id}")
  async def websocket_chat(websocket: WebSocket, session_id: str, user_id: str = "guest"):
      ...
  
  @app.get("/api/conversations")
  async def lay_danh_sach(user_id: str = "guest"):
      ...
  ```

---

### 5. Routes thiếu trong entry point (main.py vs server.py)
- **Triệu chứng:** Một số features work (chat, profile) nhưng features khác fail 404 (quiz, notes, goals POST)
- **Nguyên nhân:** Hai app entry points (`main.py` và `server.py`) có routes khác nhau
- **Fix:** Đảm bảo **MỌI endpoint** đều có trong file entry point đang dùng

---

## ✅ Checklist deploy dự án mới

```
□ Vercel — Environment Variables:
  ✓ NEXT_PUBLIC_API_URL = https://backend.onrender.com
  ✓ NEXT_PUBLIC_WS_URL  = wss://backend.onrender.com

□ Render — Environment Variables:
  ✓ MONGODB_URI     = mongodb+srv://...
  ✓ GEMINI_API_KEY  = AIza...
  ✓ CORS_ORIGINS    = * (hoặc https://frontend.vercel.app)

□ Render — Start Command:
  ✓ Kiểm tra đúng file đang chạy (main.py hay server.py)
  ✓ uvicorn main:app --host 0.0.0.0 --port $PORT

□ Code:
  ✓ Không hardcode user_id, URL localhost trong code
  ✓ Mọi endpoint có try/except + return sensible default (no 500)
  ✓ CORS configured đúng
```

---

## 🔍 Debug nhanh khi deploy lỗi

| Triệu chứng | Kiểm tra | Fix |
|-------------|----------|-----|
| Chat work, REST fail | CORS / API URL | Set env vars Vercel, fix CORS |
| Tất cả fail | Backend chưa start | Check Render logs |
| Chạy được local, fail deploy | Sai entry point | Check Start Command Render |
| History/data không riêng user | hardcode user_id | Nhận user_id từ query param |
| 500 một số endpoints | Routes thiếu hoặc exception | Check entry point có đủ routes, thêm try/except |

**Debug tool nhanh nhất:**
```bash
# 1. Check backend có up không
curl https://your-backend.onrender.com/health

# 2. Check data có trong DB không (bypass browser CORS)
curl "https://your-backend.onrender.com/api/conversations?user_id=test"

# 3. Nếu 1+2 OK mà browser vẫn fail → CORS issue
# Mở DevTools → Network → xem error message
```

---

## 🔌 Tích hợp Learnify

### Flow xác thực (không cần login)
```
Learnify mở URL:
https://ai-mentor-mauve.vercel.app?token=learnify_secret_2025&user={USER_ID}

→ Frontend đọc token, validate, lưu userId vào sessionStorage
→ Mọi WebSocket/API call dùng userId này làm user_id
→ Mỗi user có history, goals, notes riêng
```

### Kết nối context khóa học
```js
// Learnify fire event khi user chọn khóa học:
window.dispatchEvent(new CustomEvent("learnify:course-context", {
  detail: { courseId, title, category, description, progress }
}));
```

### userId flow
```
URL ?user=xxx → useTokenAuth → SplitLayout → ChatPanel (prop userId)
                                                    ↓
                            useChatWebSocket: wss://...?user_id=xxx
                            taiLichSu(): GET /api/conversations?user_id=xxx
                            quizModal: POST /api/quiz/generate {user_id: xxx}
```
