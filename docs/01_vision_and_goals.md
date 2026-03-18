# 📌 Learnify Tutor AI – Tầm nhìn & Mục tiêu

## 1. Tầm nhìn sản phẩm

Xây dựng một **AI Tutor Panel** tích hợp trực tiếp vào giao diện Learnify (bản User), hoạt động như một **gia sư cá nhân thông minh** – luôn hiểu được trạng thái, mục tiêu, và tiến độ của học viên để đưa ra hỗ trợ chủ động, cá nhân hóa.

> "Không chỉ trả lời câu hỏi, mà còn hiểu bạn đang ở đâu, muốn đi đâu, và giúp bạn đến đó."

## 2. Vị trí trong hệ sinh thái Learnify

```
┌─────────────────────────────────────────────────────┐
│                  Learnify Platform                   │
│                                                      │
│  ┌──────────────────────┐  ┌───────────────────────┐ │
│  │   Main Content Area  │  │   🤖 AI Tutor Panel   │ │
│  │                      │  │   (Side Chat Panel)   │ │
│  │  - Courses           │  │                       │ │
│  │  - Videos            │  │  - Chat Interface     │ │
│  │  - Quizzes           │  │  - Context Awareness  │ │
│  │  - Learning Path     │  │  - Roadmap Suggest    │ │
│  │  - Dashboard         │  │  - Progress Tracking  │ │
│  │                      │  │  - Quick Actions      │ │
│  └──────────────────────┘  └───────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

## 3. Mục tiêu cốt lõi

### 3.1 Gia sư cá nhân (Primary Goal)

| Khả năng | Mô tả | Ví dụ |
|---|---|---|
| **Hiểu Context** | Biết học viên đang học gì, ở milestone nào, tiến độ ra sao | "Bạn đang ở milestone 2/3, reading đạt 45%" |
| **Đề xuất lộ trình** | Tạo & điều chỉnh learning roadmap cá nhân hóa | "Nên hoàn thành Reading trước, tập trung Matching Headings" |
| **Proactive Surveying** | Chủ động hỏi thông tin cần thiết (mục tiêu, thời gian, trình độ) | "Mỗi tuần bạn có thể dành bao nhiêu giờ?" |
| **Update tiến độ** | Theo dõi & cập nhật progress liên tục | "Bạn vừa hoàn thành quiz chương 3 – milestone 2 tiến lên 60%!" |
| **Cá nhân hóa** | Adapt theo phong cách học, tốc độ, và điểm yếu | "Bạn yếu Matching Headings – đây là bài tập bổ trợ" |

### 3.2 Trợ lý hỏi đáp (Secondary Goal)

| Khả năng | Mô tả |
|---|---|
| **Q&A tổng quát** | Trả lời câu hỏi về bất kỳ chủ đề học nào |
| **Giải thích bài học** | Giải thích nội dung khóa học đang xem |
| **Hướng dẫn làm quiz** | Gợi ý cách tiếp cận (Socratic method – không cho đáp án trực tiếp) |
| **Tìm kiếm tài nguyên** | Gợi ý khóa học, tài liệu phù hợp từ hệ thống |

### 3.3 Lịch trình & Lập kế hoạch (Tertiary Goal)

| Khả năng | Mô tả |
|---|---|
| **Calendar Planning** | Lên lịch học tuần/tháng dựa trên cam kết thời gian |
| **Milestone Tracking** | Theo dõi tiến trình so với deadline mục tiêu |
| **Cảnh báo trễ tiến độ** | Notify khi học viên có nguy cơ trễ milestone |

## 4. Nguyên tắc thiết kế

1. **Context-First**: Mọi tương tác đều dựa trên hiểu biết về trạng thái hiện tại của học viên
2. **Guided Discovery**: Hướng dẫn khám phá (Socratic), không đưa đáp án trực tiếp
3. **Non-Intrusive**: Panel hỗ trợ, không làm gián đoạn trải nghiệm học chính
4. **Transparent AI**: Luôn rõ ràng là AI, hiển thị nguồn gốc thông tin
5. **Learner Control**: Học viên luôn kiểm soát – có thể mở/gập, tùy chỉnh

## 5. Benchmark thế giới

| Sản phẩm | Điểm học hỏi | Áp dụng cho Learnify |
|---|---|---|
| **Khanmigo** (Khan Academy) | Socratic tutoring, step-level feedback, teacher oversight | Guided Discovery method, không cho đáp án |
| **Duolingo Max** | Explain My Answer, Roleplay, adaptive difficulty | Context-aware explanation, tự điều chỉnh độ khó |
| **GitHub Copilot Chat** | Side panel UX, inline suggestions, quick actions | Layout tham khảo, cách toggle panel |
| **Notion AI** | Sidebar AI, context từ workspace | Cách lấy context từ nội dung đang xem |
| **ChatGPT (Custom GPTs)** | Persistent memory, custom instructions | Long-term learning profile |

## 6. Đánh giá tính khả thi

### ✅ Hoàn toàn khả thi

- **Chat Panel UI**: Đã có pattern chuẩn (Copilot-style), dùng React component
- **Context Tracking**: `UX.json` đã phác họa data model (learning_profile, roadmap, milestones)
- **WebSocket Communication**: Đã có KI về FastAPI WebSocket wrapper
- **AI Agent**: LangGraph + Gemini/GPT-4 đã có nhiều case study thành công

### ⚠️ Cần lưu ý

- **State Persistence**: Cần MongoDB/Redis cho long-term memory
- **Real-time Sync**: WebSocket kết hợp event-driven cho progress update
- **Guardrails**: Cần prompt engineering kỹ lưỡng cho Socratic method
- **Scale**: Agent state per-user cần thiết kế tối ưu

> **Kết luận**: Mục tiêu hoàn toàn khả thi với stack hiện tại. Cần thiết kế kỹ data model cho context management.
