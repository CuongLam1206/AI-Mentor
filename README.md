# 🎓 Learnify Mentor AI

**Nền tảng học trực tuyến thông minh với AI Tutor cá nhân hóa**

Learnify là một ứng dụng e-learning tích hợp AI Tutor (Gemini AI) hoạt động như gia sư cá nhân – hiểu context học viên, đề xuất lộ trình, theo dõi tiến độ, và trả lời câu hỏi real-time qua WebSocket.

---

## 📋 Mục lục

- [Tính năng](#-tính-năng)
- [Kiến trúc hệ thống](#-kiến-trúc-hệ-thống)
- [Yêu cầu hệ thống](#-yêu-cầu-hệ-thống)
- [Cài đặt & Chạy](#-cài-đặt--chạy)
  - [1. Clone repository](#1-clone-repository)
  - [2. Cài đặt Backend](#2-cài-đặt-backend)
  - [3. Cài đặt Frontend](#3-cài-đặt-frontend)
  - [4. Chạy hệ thống](#4-chạy-hệ-thống)
- [Cấu trúc thư mục](#-cấu-trúc-thư-mục)
- [API Endpoints](#-api-endpoints)
- [Biến môi trường](#-biến-môi-trường)
- [Xử lý lỗi thường gặp](#-xử-lý-lỗi-thường-gặp)

---

## ✨ Tính năng

| Tính năng | Mô tả |
|-----------|-------|
| 💬 **AI Chat (Split Screen)** | Chat real-time với Gemini AI, giao diện chia đôi màn hình kiểu VS Code Copilot, kéo resize tùy ý |
| 📚 **Danh mục khóa học** | 22 khóa học từ 3 lĩnh vực: Toán, IELTS, Python – filter theo môn |
| 🎯 **Mục tiêu cá nhân** | Đặt mục tiêu (VD: IELTS 6.5 trong 6 tháng) → AI tạo plan + milestones |
| 🗺️ **Roadmap visual** | Timeline lộ trình học dark-mode premium với stat cards, phase nodes |
| 📊 **Tiến độ thời gian thực** | Theo dõi % hoàn thành từng khóa, giai đoạn |
| 🧠 **Context-aware AI** | AI biết user đang xem khóa nào, tiến độ bao nhiêu → trả lời chính xác |
| 📱 **Responsive** | Sidebar collapsible, split screen responsive |

---

## 🏗 Kiến trúc hệ thống

```
┌─────────────────┐     WebSocket      ┌──────────────────┐     API     ┌───────────┐
│   Next.js 15    │ ◄──────────────── │  FastAPI Server  │ ◄────────► │  MongoDB  │
│   (Frontend)    │     REST API       │  (Backend)       │            │           │
│   Port: 3000    │ ──────────────────►│  Port: 8000      │            │ Port:27017│
└─────────────────┘                    └──────────────────┘            └───────────┘
                                              │
                                              ▼
                                       ┌──────────────┐
                                       │  Gemini AI   │
                                       │  (Google)    │
                                       └──────────────┘
```

---

## 📦 Yêu cầu hệ thống

| Thành phần | Phiên bản tối thiểu |
|-----------|---------------------|
| **Python** | 3.10+ |
| **Node.js** | 18+ |
| **MongoDB** | 6.0+ (đang chạy) |
| **npm** | 9+ |

---

## 🚀 Cài đặt & Chạy

### 1. Clone repository

```bash
git clone <repo-url>
cd Learnify_Mentor_AI
```

### 2. Cài đặt Backend

```bash
# Di chuyển vào thư mục backend
cd backend

# (Khuyến nghị) Tạo virtual environment
python -m venv venv

# Kích hoạt venv
# Windows:
venv\Scripts\activate
# macOS/Linux:
# source venv/bin/activate

# Cài đặt dependencies
pip install -r requirements.txt
```

**Cấu hình biến môi trường:**

```bash
# Copy file mẫu
copy .env.example .env

# Sửa file .env với các giá trị thực
notepad .env
```

Nội dung file `.env`:

```env
# ===== Gemini AI =====
GEMINI_API_KEY=your_gemini_api_key_here    # Lấy tại https://aistudio.google.com/apikey

# ===== MongoDB =====
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB_NAME=learnify_tutor

# ===== Server =====
HOST=0.0.0.0
PORT=8000
CORS_ORIGINS=http://localhost:3000,http://localhost:3001
```

> ⚠️ **Bắt buộc**: Phải có `GEMINI_API_KEY` hợp lệ để chat AI hoạt động.

### 3. Cài đặt Frontend

```bash
# Mở terminal MỚI, di chuyển vào thư mục frontend
cd frontend

# Cài đặt dependencies
npm install
```

### 4. Chạy hệ thống

Cần **3 service** chạy đồng thời (mỗi cái 1 terminal):

#### Terminal 1 – MongoDB

```bash
# Nếu MongoDB chưa chạy như service:
mongod --dbpath <đường-dẫn-data>

# Hoặc nếu đã cài MongoDB như Windows Service, nó tự chạy.
# Kiểm tra:
mongosh --eval "db.runCommand({ping: 1})"
```

#### Terminal 2 – Backend (FastAPI)

```bash
cd backend
# Kích hoạt venv (nếu dùng)
venv\Scripts\activate

# Chạy server
python server.py
```

Kết quả mong đợi:
```
🧹 Đã xóa X conversation trống
🚀 Learnify Tutor AI Backend đã khởi động!
INFO:     Uvicorn running on http://0.0.0.0:8000
```

#### Terminal 3 – Frontend (Next.js)

```bash
cd frontend

# Chạy dev server
npm run dev
```

Kết quả mong đợi:
```
▲ Next.js 15.x
- Local:   http://localhost:3000
✓ Ready
```

### 5. Truy cập ứng dụng

| URL | Trang |
|-----|-------|
| http://localhost:3000 | 🏠 Trang chủ – Danh mục 22 khóa học |
| http://localhost:3000/goals | 🎯 Mục tiêu học tập |
| http://localhost:3000/roadmap | 🗺️ Lộ trình visual timeline |
| http://localhost:8000/docs | 📖 Swagger API docs (auto-generated) |

> 💡 **Mẹo**: Click con bot 🤖 ở góc phải dưới để mở Split Chat với AI Tutor!

---

## 📁 Cấu trúc thư mục

```
Learnify_Mentor_AI/
├── backend/
│   ├── server.py              # FastAPI server chính + WebSocket + REST API
│   ├── chat_service.py        # MongoDB chat CRUD (hội thoại, tin nhắn)
│   ├── goal_service.py        # Mục tiêu, kế hoạch, tiến độ, seed data
│   ├── course_catalog.py      # Mock data 22 khóa học (3 lĩnh vực)
│   ├── requirements.txt       # Python dependencies
│   ├── .env.example           # Mẫu biến môi trường
│   └── .env                   # Biến môi trường (không commit)
│
├── frontend/
│   ├── app/
│   │   ├── layout.tsx         # Root layout + SplitLayout wrapper
│   │   ├── page.tsx           # Trang chủ – khóa học dynamic
│   │   ├── globals.css        # Global styles
│   │   ├── goals/             # Trang Mục tiêu
│   │   │   ├── page.tsx
│   │   │   └── goals.css
│   │   ├── roadmap/           # Trang Lộ trình (dark mode)
│   │   │   ├── page.tsx
│   │   │   └── roadmap.css
│   │   ├── components/chat/   # Chat components
│   │   │   ├── SplitLayout.tsx      # Split screen container
│   │   │   ├── ChatPanel.tsx        # Chat chính + context-aware
│   │   │   ├── ChatPanelWrapper.tsx  # Wrapper cho legacy pages
│   │   │   ├── ChatInputBar.tsx     # Input box + voice/emoji
│   │   │   ├── ChatMessageArea.tsx  # Khu vực hiển thị tin nhắn
│   │   │   ├── ChatHistory.tsx      # Lịch sử hội thoại + xóa
│   │   │   ├── ChatHeader.tsx       # Header chat
│   │   │   ├── BotAvatar.tsx        # Avatar mascot
│   │   │   ├── chat.css             # Toàn bộ styles chat
│   │   │   └── messages/            # Message components
│   │   ├── hooks/
│   │   │   └── useChatWebSocket.ts  # WebSocket hook
│   │   └── types/
│   │       └── chat.ts              # TypeScript interfaces
│   ├── package.json
│   └── tsconfig.json
│
├── docs/                      # Tài liệu nghiên cứu
├── Idea.md                    # Ý tưởng ban đầu
└── README.md                  # ← File này
```

---

## 🔌 API Endpoints

### REST API

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| `GET` | `/api/courses` | Lấy toàn bộ 22 khóa học |
| `GET` | `/api/progress/{user_id}` | Tiến độ khóa học của user |
| `GET` | `/api/goals` | Danh sách mục tiêu |
| `GET` | `/api/goals/{goal_id}` | Chi tiết mục tiêu + plan |
| `POST` | `/api/goals` | Tạo mục tiêu mới |
| `GET` | `/api/chat/conversations` | Lịch sử hội thoại |
| `DELETE` | `/api/chat/conversations/{session_id}` | Xóa hội thoại |
| `DELETE` | `/api/chat/clear-all` | Xóa toàn bộ (dev only) |

### WebSocket

| Endpoint | Mô tả |
|----------|-------|
| `ws://localhost:8000/ws/chat/{session_id}` | Chat real-time với AI |

**Protocol**: JSON messages

```json
// Client gửi
{"type": "message", "content": "Xin chào!"}

// Server trả về (streaming)
{"type": "stream_start", "message_id": "..."}
{"type": "stream_chunk", "message_id": "...", "content": "Xin "}
{"type": "stream_chunk", "message_id": "...", "content": "chào!"}
{"type": "stream_end", "message_id": "..."}
```

---

## 🔐 Biến môi trường

| Biến | Bắt buộc | Mô tả |
|------|----------|-------|
| `GEMINI_API_KEY` | ✅ | API key Google Gemini AI |
| `MONGODB_URI` | ✅ | MongoDB connection string |
| `MONGODB_DB_NAME` | ❌ | Tên database (default: `learnify_tutor`) |
| `HOST` | ❌ | Server host (default: `0.0.0.0`) |
| `PORT` | ❌ | Server port (default: `8000`) |
| `CORS_ORIGINS` | ❌ | Allowed origins (default: `localhost:3000`) |

**Frontend** (file `.env.local` trong `/frontend`):

| Biến | Mô tả |
|------|-------|
| `NEXT_PUBLIC_API_URL` | URL backend (default: `http://localhost:8000`) |

---

## 🔧 Xử lý lỗi thường gặp

### ❌ "Lỗi WebSocket" / Chat không kết nối

```bash
# Kiểm tra backend đang chạy
curl http://localhost:8000/docs

# Nếu không phản hồi → khởi động lại backend
cd backend && python server.py
```

### ❌ MongoDB connection error

```bash
# Kiểm tra MongoDB
mongosh --eval "db.runCommand({ping: 1})"

# Nếu lỗi → khởi động MongoDB
# Windows Service:
net start MongoDB

# Hoặc chạy manual:
mongod --dbpath C:\data\db
```

### ❌ "GEMINI_API_KEY not found"

```bash
# Kiểm tra file .env trong /backend
cat backend/.env

# Đảm bảo key hợp lệ tại https://aistudio.google.com/apikey
```

### ❌ Frontend build error

```bash
cd frontend
# Xóa cache và cài lại
rmdir /s /q .next node_modules
npm install
npm run dev
```

### ❌ Hydration error (Console)

Lỗi `data-jetski-tab-id` hoặc tương tự → do **browser extension** inject attribute. Không ảnh hưởng chức năng, đã được suppress bằng `suppressHydrationWarning`.

---

## 🛠 Tech Stack

| Layer | Công nghệ |
|-------|-----------|
| **Frontend** | Next.js 15, React 19, TypeScript |
| **Backend** | FastAPI, Python 3.10+, Uvicorn |
| **AI** | Google Gemini AI (gemini-2.0-flash) |
| **Database** | MongoDB (Motor async driver) |
| **Real-time** | WebSocket (native) |
| **Styling** | Vanilla CSS (dark mode + light mode) |

---

## 📝 Ghi chú phát triển

- **Không lưu chat trống**: Conversation chỉ hiện trong lịch sử khi có ≥ 1 tin nhắn
- **Seed data tự động**: Backend tự tạo 3 mục tiêu mẫu (Toán, IELTS, Python) + tiến độ khi khởi động
- **Context-aware**: Khi user chọn khóa trên trang chủ, thông tin khóa tự động inject vào chat để AI trả lời chính xác hơn

---

**Made with ❤️ by Learnify Team**
