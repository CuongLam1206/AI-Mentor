# 🤖 Learnify Tutor AI — Tổng hợp năng lực & Hướng phát triển

> Cập nhật: 2026-03-13

---

## 🧠 AI hiểu gì về học viên?

Mỗi lần chat, AI được inject đầy đủ **context cá nhân** gồm 5 lớp thông tin:

| Lớp | Nguồn dữ liệu | Ví dụ AI nhận được |
|---|---|---|
| **Hồ sơ học viên** | `learner_profiles` | "Lâm Đức Cương, Beginner, học 2h/ngày, yếu Speaking" |
| **Mục tiêu & Lộ trình** | `learning_goals` + `learning_plans` | "Mục tiêu: TOEIC 750, deadline 6 tháng, đang Milestone 2/5" |
| **Thói quen học** | `conversations.messages` | "Streak 3 ngày 🔥, peak: Thứ 6, hôm nay chưa học" |
| **Kết quả Quiz** | `quiz_results` | "IELTS Reading: avg 42% ⚠️ yếu, TOEIC Vocab: 85% ✅" |
| **Danh mục khóa học** | `course_catalog.py` | Toàn bộ 20+ khóa Toán/IELTS/Python |

---

## ⚡ AI làm được gì cho học viên?

### 💬 Hội thoại thông minh
- Trả lời câu hỏi học thuật (Toán, IELTS, Python, ML...)
- Giải thích khái niệm → ví dụ cụ thể → liên hệ thực tế
- Ghi nhớ lịch sử hội thoại, tiếp nối mạch chat
- Chip gợi ý sau mỗi tin nhắn: Giải thích thêm / Ví dụ cụ thể / Làm quiz / Liên hệ thực tế / Ghi chú của tôi

### 🎯 Lập kế hoạch & lộ trình
- Khảo sát mục tiêu (level hiện tại, deadline, kỹ năng yếu/mạnh)
- Tự động tạo lộ trình milestones + gán khóa học phù hợp từ catalog
- Lưu vào MongoDB, xem lại trong Goals Screen với RoadmapDiagram

### 🧩 Quiz thích nghi (Adaptive)
- Sinh câu hỏi đúng nội dung khóa học / lộ trình cụ thể
- Tự động tăng/giảm độ khó dựa theo điểm quiz lịch sử (avg ≥80% → câu khó hơn)
- Chọn theo từng **mục tiêu** hoặc **khóa học**, hoặc kích hoạt trực tiếp từ chip "🧠 Làm quiz về chủ đề này"
- Kết quả lưu vào `quiz_results` trong MongoDB

### 📊 Tracking tiến độ (Goals Screen — nút 📊 Ẩn/Hiện)
- Biểu đồ tin nhắn 7 ngày (hoạt động học hàng ngày)
- Biểu đồ điểm quiz 7 ngày (màu đỏ < 50% / vàng 50–79% / xanh ≥ 80%)
- Lịch sử 5 lần quiz gần nhất với dot màu 🟢🟡🔴
- Banner cảnh báo môn yếu (avg < 60%) với nút "🔄 Quiz lại"

### 🔔 Coaching chủ động
- AI tự biết điểm yếu của học viên → chủ động gợi ý ôn khi chat
- Streak reminder: nếu hôm nay chưa học, AI nhắc nhẹ nhàng

---

## ✅ Tính năng ngắn hạn đã triển khai

### 🔁 A — Spaced Repetition (Goals Screen → 📊)
- Cards "⚠️ Cần ôn hôm nay" và "📅 Sắp đến hạn" tự động tính từ quiz history
- Thuật toán: `< 60%` → ôn sau 1 ngày · `60–79%` → 3 ngày · `≥ 80%` → 7 ngày
- Nút **"Quiz ngay 🔄"** mở quiz trực tiếp cho môn đó
- Backend: `GET /api/spaced-repetition`

### 📋 B — Báo cáo tuần (Goals Screen → 📊, thu gọn mặc định)
- 4 chỉ số: Quiz đã làm / Điểm TB 📈📉 / Ngày học / Câu hỏi
- Tiến độ milestone + môn yếu nhất + trend so với tuần trước
- Backend: `GET /api/weekly-report`

### 📝 C — Ghi chú từ chat
- Hover vào tin nhắn AI → icon **📌** xuất hiện → bấm để lưu excerpt
- Chip "📌 Ghi chú của tôi" sau tin nhắn cuối → mở NotesPanel với danh sách ghi chú
- Có thể xóa từng ghi chú
- Backend: `GET /api/notes` · `POST /api/notes` · `DELETE /api/notes/{id}`

### 🗓️ D — Lịch học hàng ngày (Goals Screen → 📊)
- Chọn thứ (CN–T7) + giờ học → lưu vào DB
- Khi mở chat đúng giờ đúng thứ → **banner tím** "📚 Đến giờ học rồi!" với nút "✅ Bắt đầu học"
- Backend: `GET /api/study-schedule` · `POST /api/study-schedule`

---

## 🗄️ Dữ liệu lưu trong MongoDB

| Collection | Nội dung |
|---|---|
| `conversations` | Lịch sử các cuộc hội thoại |
| `conversations.messages` | Từng tin nhắn (role, content, timestamp) |
| `learning_goals` | Mục tiêu học tập của user |
| `learning_plans` | Lộ trình milestones + khóa học gán vào |
| `learner_profiles` | Hồ sơ: level, kỹ năng, giờ học |
| `quiz_results` | Kết quả quiz: score, percentage, topic, date |
| `notes` | Ghi chú được pin từ chat |
| `study_schedules` | Lịch học hàng ngày của user |

---

## 🚀 Hướng phát triển tiếp theo

### 🟡 Trung hạn

| Tính năng | Mô tả |
|---|---|
| **Voice chat** | Luyện Speaking IELTS/TOEIC với AI (Web Speech API) |
| **Upload ảnh/file** | Chụp bài tập → AI giải, chấm điểm |
| **Gamification** | Badge, XP, leaderboard theo streak & quiz score |
| **Study group** | Phòng học nhóm, quiz real-time cùng nhau |

### 🔴 Dài hạn

| Tính năng | Mô tả |
|---|---|
| **Learning DNA** | Phân tích toàn bộ pattern học → predict điểm thi thật |
| **AI Video lessons** | Tạo bài giảng video ngắn cho từng điểm yếu cụ thể |
| **LMS Integration** | Sync với Moodle / Google Classroom / IELTS platforms |
| **Predictive coaching** | AI biết trước học viên sắp bỏ cuộc → can thiệp sớm |

---

## 🏗️ Kiến trúc tổng quan

```
Frontend (Next.js)
├── ChatPanel            ← Quản lý session, NotesPanel overlay, check-in banner
├── ChatMessageArea      ← Render tin nhắn + chips + pin button (📌)
├── NotesPanel           ← Danh sách ghi chú đã lưu
├── QuizModal            ← Quiz thích nghi (select → generate → result)
├── GoalsScreen          ← Mục tiêu + ProgressDashboard + 📊 analytics block:
│   ├── QuizScoreChart       ← Biểu đồ điểm quiz 7 ngày
│   ├── QuizHistory          ← 5 lần quiz gần nhất
│   ├── WeakTopicBanner      ← Cảnh báo môn yếu
│   ├── SpacedRepetitionPanel ← Cards cần ôn hôm nay / sắp đến hạn
│   ├── WeeklyReport         ← Báo cáo tuần (collapsible)
│   └── StudyScheduleCard    ← Đặt lịch học (ngày + giờ)
├── RecommendationsPanel ← Gợi ý khóa học
└── SplitLayout          ← Split/fullscreen (single mount, no remount)

Backend (FastAPI + MongoDB)
├── /api/chat                ← WebSocket streaming với Gemini
├── /api/quiz/generate       ← Sinh câu hỏi adaptive
├── /api/quiz/result         ← Lưu kết quả
├── /api/quiz/history        ← Lịch sử + analytics theo ngày/chủ đề
├── /api/spaced-repetition   ← Tính due-date theo SM-2 algorithm ✅ NEW
├── /api/weekly-report       ← Báo cáo 7 ngày tổng hợp ✅ NEW
├── /api/notes               ← CRUD ghi chú từ chat ✅ NEW
├── /api/study-schedule      ← Lịch học hàng ngày ✅ NEW
├── /api/user/goals          ← Danh sách mục tiêu + plan courses
├── /api/user/courses        ← Khóa học đã đăng ký
└── /api/streak              ← Streak + weekly activity
```

---

## 🔌 Tách biệt Chat & Learnify — Sẵn sàng tích hợp

> **Learnify hiện tại là giả định (mock)**. Chat AI là module độc lập, sau này sẽ được bóc ra tích hợp vào Learnify thật.

### Cấu trúc tách biệt

```
frontend/app/
├── page.tsx              ← Learnify giả định (khóa học, progress bar)
├── goals/                ← Trang Mục tiêu
├── roadmap/              ← Trang Lộ trình
└── components/
    └── chat/             ← ✅ Chat AI — hoàn toàn độc lập
        ├── ChatPanel.tsx
        ├── ChatMessageArea.tsx
        ├── ChatHistory.tsx
        └── ...
```

### Điểm kết nối duy nhất (1 dòng)

```js
// Learnify gửi context khi user chọn khóa học
window.dispatchEvent(new CustomEvent("learnify:course-context", { detail: {
    courseId, title, category, description, progress
}}));
// ChatPanel lắng nghe event này để inject context vào AI
```

### Khi tích hợp vào Learnify thật, chỉ cần

| Bước | Việc làm |
|------|----------|
| 1 | Copy thư mục `components/chat/` vào Learnify thật |
| 2 | Deploy `backend/` (FastAPI + MongoDB) độc lập |
| 3 | Fire event `learnify:course-context` khi user click khóa |
| 4 | Set `NEXT_PUBLIC_API_URL` trỏ vào backend URL |

> **Không có coupling nào khác** giữa mock Learnify và Chat. Chat tự quản lý session, lịch sử, notes, quiz hoàn toàn qua backend riêng.
