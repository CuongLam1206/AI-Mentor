# 🔌 API & Integration Architecture

## 1. Tổng quan

Tài liệu này mô tả kiến trúc API và cách tích hợp AI Tutor Agent vào hệ thống Learnify hiện tại, bao gồm WebSocket cho real-time chat, REST APIs cho data operations, và event system cho progress tracking.

## 2. System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT (Next.js)                         │
│  ┌────────────────┐  ┌────────────────┐  ┌───────────────────┐  │
│  │  Main App      │  │  Chat Panel    │  │  Notification     │  │
│  │  (Pages)       │  │  (WebSocket)   │  │  (SSE/WS)         │  │
│  └───────┬────────┘  └───────┬────────┘  └────────┬──────────┘  │
│          │                    │                     │             │
└──────────┼────────────────────┼─────────────────────┼─────────────┘
           │ REST               │ WebSocket            │ SSE
           │                    │                      │
┌──────────┼────────────────────┼──────────────────────┼─────────────┐
│          ▼                    ▼                      ▼             │
│  ┌────────────────┐  ┌────────────────┐  ┌───────────────────┐   │
│  │  Next.js API   │  │  FastAPI       │  │  Event Service    │   │
│  │  Routes        │  │  WebSocket     │  │  (Notifications)  │   │
│  │  /api/*        │  │  Server        │  │                   │   │
│  └───────┬────────┘  └───────┬────────┘  └────────┬──────────┘   │
│          │                    │                     │              │
│          ▼                    ▼                     ▼              │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │                    SERVICE LAYER                          │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │    │
│  │  │ Profile  │ │ Roadmap  │ │ Progress │ │ AI Agent │   │    │
│  │  │ Service  │ │ Service  │ │ Service  │ │ Service  │   │    │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │                    DATA LAYER                             │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │    │
│  │  │PostgreSQL│ │ MongoDB  │ │  Redis   │ │Vector DB │   │    │
│  │  │ (Prisma) │ │  (Chat)  │ │ (Cache)  │ │(Embeddings)│  │    │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │    │
│  └──────────────────────────────────────────────────────────┘    │
│                          BACKEND                                  │
└───────────────────────────────────────────────────────────────────┘
```

## 3. WebSocket API (Chat)

### 3.1 Connection

```
WebSocket URL: ws://api.learnify.com/ws/chat/{session_id}
Headers:
  Authorization: Bearer {jwt_token}
```

### 3.2 Message Protocol

#### Client → Server

```json
// Text message
{
  "type": "message",
  "content": "Help me create a 6-month IELTS study plan.",
  "metadata": {
    "page_context": "/courses/reading-strategies/chapter-3",
    "active_course_id": "course_ielts_reading_02"
  }
}

// Action request
{
  "type": "action",
  "action": "view_roadmap"
}

// Feedback
{
  "type": "feedback",
  "message_id": "msg_123",
  "rating": "thumbs_up"
}

// Typing indicator
{
  "type": "typing",
  "is_typing": true
}
```

#### Server → Client

```json
// Text response (streaming)
{
  "type": "stream_start",
  "message_id": "msg_456"
}
{
  "type": "stream_chunk",
  "message_id": "msg_456",
  "content": "Tuyệt vời! "
}
{
  "type": "stream_end",
  "message_id": "msg_456",
  "content": "Tuyệt vời! Để tạo lộ trình IELTS, tôi cần biết..."
}

// Rich card response
{
  "type": "rich_card",
  "message_id": "msg_457",
  "card_type": "roadmap",
  "data": {
    "target": "6.5 IELTS",
    "deadline": "2026-09-10",
    "total_progress": 35,
    "milestones": [...]
  }
}

// Quick reply suggestions
{
  "type": "suggestions",
  "message_id": "msg_458",
  "items": [
    {"label": "📋 Xem lộ trình", "action": "view_roadmap"},
    {"label": "📊 Kiểm tra tiến độ", "action": "check_progress"},
    {"label": "📚 Gợi ý bài học", "action": "suggest_lesson"}
  ]
}

// Proactive notification
{
  "type": "proactive",
  "message_id": "msg_459",
  "content": "Bạn đã hoàn thành quiz! Tiến độ milestone 2 tăng lên 60%.",
  "action": {
    "label": "Xem chi tiết",
    "route": "/roadmap"
  }
}

// Error
{
  "type": "error",
  "code": "RATE_LIMIT",
  "message": "Vui lòng chờ giây lát..."
}
```

## 4. REST APIs

### 4.1 Learner Profile APIs

```
GET    /api/tutor/profile                    → Lấy learner profile
PUT    /api/tutor/profile                    → Cập nhật profile
POST   /api/tutor/profile/onboarding         → Hoàn thành onboarding
```

### 4.2 Roadmap APIs

```
GET    /api/tutor/roadmap                    → Lấy roadmap hiện tại
POST   /api/tutor/roadmap                    → Tạo roadmap mới
PUT    /api/tutor/roadmap/:id                → Cập nhật roadmap
GET    /api/tutor/roadmap/:id/milestones     → Lấy milestones
PUT    /api/tutor/roadmap/:id/milestones/:mid → Cập nhật milestone
```

### 4.3 Chat History APIs

```
GET    /api/tutor/conversations              → Danh sách conversations
GET    /api/tutor/conversations/:id          → Chi tiết conversation
DELETE /api/tutor/conversations/:id          → Xóa conversation
POST   /api/tutor/conversations/:id/title    → Đổi tên conversation
```

### 4.4 Progress APIs

```
GET    /api/tutor/progress                   → Tổng tiến độ
GET    /api/tutor/progress/courses/:id       → Tiến độ khóa học
POST   /api/tutor/progress/events            → Gửi progress event
```

## 5. Event System

### 5.1 Event-Driven Architecture

```
┌──────────────────┐     ┌─────────────┐     ┌──────────────────┐
│  Event Producers │────►│  Event Bus  │────►│  Event Consumers │
│                  │     │  (Redis     │     │                  │
│  - Quiz Complete │     │   Pub/Sub)  │     │  - AI Agent      │
│  - Video Watched │     │             │     │  - Progress Svc  │
│  - Course Enroll │     │             │     │  - Notification   │
│  - Login         │     │             │     │  - Analytics      │
└──────────────────┘     └─────────────┘     └──────────────────┘
```

### 5.2 Event Types

```json
// Quiz completed
{
  "type": "quiz.completed",
  "user_id": "user_12345",
  "data": {
    "quiz_id": "quiz_reading_ch3",
    "course_id": "course_ielts_reading_02",
    "score": 7.5,
    "total_questions": 5,
    "correct_answers": 4,
    "time_spent_seconds": 180
  },
  "timestamp": "2026-03-10T10:30:00Z"
}

// Course progress updated
{
  "type": "course.progress_updated",
  "user_id": "user_12345",
  "data": {
    "course_id": "course_ielts_reading_02",
    "new_progress": 50,
    "previous_progress": 45
  }
}

// Milestone status changed
{
  "type": "milestone.status_changed",
  "user_id": "user_12345",
  "data": {
    "milestone_id": "ms_02",
    "new_status": "completed",
    "previous_status": "in_progress"
  }
}
```

### 5.3 Event → AI Agent Pipeline

```python
async def handle_progress_event(event: dict):
    """Process learning events and update AI context"""

    user_id = event["user_id"]

    # 1. Update progress in database
    await progress_service.update(event)

    # 2. Update AI agent state
    await agent_state_service.process_event(user_id, event)

    # 3. Check if proactive message needed
    nudge = await agent_service.check_proactive_nudge(user_id, event)
    if nudge:
        await notification_service.send(user_id, nudge)
```

## 6. Integration with Existing Learnify

### 6.1 Integration Points

| Hệ thống hiện tại | Integration | Mô tả |
|---|---|---|
| **NextAuth** | Authentication | Dùng JWT token hiện tại cho WebSocket auth |
| **Prisma Schema** | Data Layer | Mở rộng schema thêm LearnerProfile, Roadmap |
| **Video System** | Events | Video completion → progress event |
| **Quiz System** | Events | Quiz results → progress event + AI evaluation |
| **Dashboard** | UI | Embed chat panel component |
| **Course Pages** | Context | Gửi page_context cho AI agent |

### 6.2 Deployment Architecture

```
┌────────────────────────────────────────────────┐
│              DOCKER COMPOSE                     │
│                                                 │
│  ┌──────────────┐  ┌──────────────────────────┐│
│  │  Next.js App │  │  FastAPI Agent Server    ││
│  │  (Port 3000) │  │  (Port 8000)             ││
│  │              │  │  - WebSocket endpoint     ││
│  │  - Frontend  │  │  - LangGraph workflow     ││
│  │  - REST APIs │  │  - Tool execution         ││
│  └──────┬───────┘  └──────────┬───────────────┘│
│         │                      │                │
│  ┌──────┴──────────────────────┴───────────┐   │
│  │         Shared Infrastructure            │   │
│  │  ┌──────┐ ┌───────┐ ┌──────┐ ┌───────┐ │   │
│  │  │Postgres│ │MongoDB│ │Redis │ │Chroma │ │   │
│  │  │ :5432 │ │ :27017│ │:6379 │ │ :8001 │ │   │
│  │  └──────┘ └───────┘ └──────┘ └───────┘ │   │
│  └─────────────────────────────────────────┘   │
└────────────────────────────────────────────────┘
```

## 7. Security Considerations

| Concern | Solution |
|---|---|
| **WebSocket Auth** | JWT verification on connect, auto-disconnect on expire |
| **Rate Limiting** | 30 messages/minute per user, 1000/day |
| **Input Sanitization** | Sanitize user messages before processing |
| **Data Privacy** | Chat data encrypted at rest, user can delete history |
| **CORS** | Whitelist specific origins only |
| **Audit Log** | Log all AI interactions for review |
