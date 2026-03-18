# 🗺️ Roadmap & Phased Delivery

## 1. Tổng quan

Dự án được chia thành **4 Phase**, mỗi phase có deliverables rõ ràng và có thể demo/deploy độc lập.

## 2. Phase Overview

```
Phase 1 (MVP)          Phase 2               Phase 3               Phase 4
──────────────        ──────────────        ──────────────        ──────────────
Chat Panel UI         Context-Aware         Roadmap Engine        Advanced
+ Basic AI Chat       + Progress Track      + Proactive AI        Intelligence
                                                                   + Analytics

   2-3 tuần              2-3 tuần              3-4 tuần              3-4 tuần
```

---

## 3. Phase 1: MVP – Chat Panel + Basic AI (2-3 tuần)

### Mục tiêu
Có một chat panel hoạt động được, user có thể chat và nhận phản hồi AI.

### Deliverables

| # | Task | Priority | Effort |
|---|---|---|---|
| 1.1 | Chat Panel UI component (open/close, responsive) | P0 | 3 ngày |
| 1.2 | Chat input bar (text, send, emoji) | P0 | 1 ngày |
| 1.3 | Message display (bubbles, markdown rendering) | P0 | 2 ngày |
| 1.4 | FastAPI WebSocket server (basic) | P0 | 2 ngày |
| 1.5 | Basic AI chat (Gemini/GPT-4, no tools) | P0 | 2 ngày |
| 1.6 | Streaming response | P1 | 1 ngày |
| 1.7 | Chat history (MongoDB) | P1 | 2 ngày |
| 1.8 | Conversation list | P1 | 1 ngày |

### Definition of Done
- ✅ User mở panel, gửi tin nhắn, nhận phản hồi AI
- ✅ Streaming response
- ✅ Panel hoạt động responsive (desktop + mobile)
- ✅ Lưu và load chat history

---

## 4. Phase 2: Context-Aware + Progress Tracking (2-3 tuần)

### Mục tiêu
AI hiểu context người dùng – biết đang học gì, tiến độ ra sao.

### Deliverables

| # | Task | Priority | Effort |
|---|---|---|---|
| 2.1 | Learner Profile model (Prisma schema) | P0 | 1 ngày |
| 2.2 | Page context detection (frontend hook) | P0 | 1 ngày |
| 2.3 | Context Assembler service | P0 | 3 ngày |
| 2.4 | LangGraph workflow (basic nodes) | P0 | 3 ngày |
| 2.5 | AI tools: get_profile, get_progress | P0 | 2 ngày |
| 2.6 | Onboarding flow (collect target, level) | P1 | 2 ngày |
| 2.7 | Contextual welcome message | P1 | 1 ngày |
| 2.8 | Event system (quiz/video → progress) | P1 | 2 ngày |

### Definition of Done
- ✅ AI biết user đang ở trang nào, khóa học nào
- ✅ AI biết tiến độ, điểm quiz
- ✅ Onboarding thu thập mục tiêu, trình độ
- ✅ Event system cập nhật progress từ quiz/video

---

## 5. Phase 3: Roadmap Engine + Proactive AI (3-4 tuần)

### Mục tiêu
AI có thể tạo roadmap, theo dõi milestone, và chủ động nhắc nhở.

### Deliverables

| # | Task | Priority | Effort |
|---|---|---|---|
| 3.1 | Roadmap & Milestone models | P0 | 2 ngày |
| 3.2 | AI tool: create_roadmap, update_roadmap | P0 | 3 ngày |
| 3.3 | Roadmap Card component (rich message) | P0 | 2 ngày |
| 3.4 | Progress Card component | P0 | 1 ngày |
| 3.5 | Proactive nudge system | P1 | 3 ngày |
| 3.6 | Calendar integration (study schedule) | P1 | 3 ngày |
| 3.7 | Milestone tracking automation | P1 | 2 ngày |
| 3.8 | Quick action chips/suggestions | P1 | 1 ngày |
| 3.9 | Notification bubble (mascot) | P2 | 1 ngày |

### Definition of Done
- ✅ AI tạo learning roadmap cá nhân hóa
- ✅ Rich cards hiển thị roadmap, progress
- ✅ Proactive notifications ("Đã đến giờ học!")
- ✅ Milestone tracking tự động cập nhật

---

## 6. Phase 4: Advanced Intelligence + Analytics (3-4 tuần)

### Mục tiêu
AI thông minh hơn: memory dài hạn, Socratic tutoring, analytics.

### Deliverables

| # | Task | Priority | Effort |
|---|---|---|---|
| 4.1 | Long-term memory (Vector DB) | P1 | 3 ngày |
| 4.2 | Socratic tutoring mode | P1 | 3 ngày |
| 4.3 | AI evaluation (identify weaknesses) | P1 | 3 ngày |
| 4.4 | Learning analytics dashboard | P2 | 4 ngày |
| 4.5 | Teacher oversight panel | P2 | 3 ngày |
| 4.6 | Multi-language support | P2 | 2 ngày |
| 4.7 | Voice input/output | P3 | 3 ngày |
| 4.8 | A/B testing framework for prompts | P3 | 2 ngày |

### Definition of Done
- ✅ AI nhớ insights từ các phiên trước
- ✅ Socratic method hoạt động (không cho đáp án trực tiếp)
- ✅ Teacher có thể xem student interactions
- ✅ Learning analytics hiển thị trends

---

## 7. Tech Stack Summary

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | Next.js + React | Chat panel UI, state management |
| **WebSocket** | FastAPI + WebSocket | Real-time chat communication |
| **AI Framework** | LangGraph + LangChain | Agent workflow orchestration |
| **LLM** | Gemini 2.0 Flash / GPT-4 | Natural language understanding |
| **SQL Database** | PostgreSQL (Prisma) | User profiles, roadmaps, progress |
| **Document DB** | MongoDB | Chat history, agent memory |
| **Cache** | Redis | Session context, event pub/sub |
| **Vector DB** | ChromaDB | Long-term semantic memory |
| **Container** | Docker Compose | Deployment orchestration |

## 8. Risk & Mitigation

| Risk | Impact | Mitigation |
|---|---|---|
| LLM hallucination | Sai thông tin tiến độ | Tool-based verification, no generated stats |
| WebSocket disconnect | Mất tin nhắn | Auto-reconnect + message queue |
| High latency LLM | UX kém | Streaming + loading states |
| State complexity | Bugs | Clear state machine, unit tests |
| Data privacy | Legal risk | Data encryption, user consent, delete ability |
| Scale per-user state | Memory/cost | Redis TTL, lazy loading, archival |

## 9. Success Metrics

| Metric | Target (Phase 1) | Target (Phase 4) |
|---|---|---|
| User engagement (% dùng chat) | 30% | 70% |
| Avg messages/session | 3 | 8+ |
| AI accuracy (helpful rate) | 70% | 90% |
| Response time | <3s | <2s |
| Context accuracy | N/A | 85%+ |
| Roadmap completion rate | N/A | 60% |
