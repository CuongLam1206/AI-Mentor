# 💬 Learnify Tutor AI — Tóm tắt cho tích hợp

> Cập nhật: 2026-03-16

---

## 🎓 Chat AI giúp học viên gì & cần gì để làm được?

---

### 1. Gia sư 24/7 — hỏi bất cứ điều gì

Chat hoạt động như một gia sư riêng, giải thích bài, gợi ý hướng suy nghĩ (phương pháp Socratic), nhớ lịch sử hội thoại để nói chuyện tự nhiên xuyên suốt.

**Để làm được điều này cần:**
- **Google Gemini API** — bộ não tạo ra câu trả lời. Gemini được chọn vì hỗ trợ *streaming* (trả lời từng chữ như người thật đang gõ) và xử lý ngữ cảnh dài (nhiều lượt hội thoại).
- **FastAPI WebSocket** — kết nối 2 chiều, real-time giữa trình duyệt và server. Dùng WebSocket thay vì REST vì cần stream từng token ngay khi Gemini sinh ra, không chờ response hoàn chỉnh.
- **MongoDB (`conversations.messages`)** — lưu toàn bộ lịch sử tin nhắn theo `session_id`. Mỗi lần chat, server đọc lại lịch sử và inject vào prompt để AI "nhớ" cuộc hội thoại.

---

### 2. AI biết học viên đang học khóa nào

Khi học viên click vào một khóa học trong Learnify, AI ngay lập tức biết và điều chỉnh câu trả lời đúng với nội dung khóa đó.

**Để làm được điều này cần:**
- **Browser CustomEvent** — cơ chế giao tiếp giữa trang Learnify và widget Chat mà không cần reload hay API call. Learnify fire 1 event với thông tin khóa học, Chat lắng nghe và cập nhật context ngay lập tức.
- **Dynamic System Prompt** — mỗi lần gửi tin nhắn, server tự động xây lại system prompt bằng cách chèn thông tin khóa học (tên, tiến độ, mô tả) vào đầu cuộc hội thoại. AI nhờ đó tự điều chỉnh câu trả lời mà không cần học viên phải giới thiệu lại.

---

### 3. Tạo lộ trình học tập cá nhân

AI phỏng vấn học viên về mục tiêu, deadline, mức hiện tại → tự động thiết kế lộ trình milestones + đề xuất khóa học phù hợp.

**Để làm được điều này cần:**
- **Gemini với structured output (JSON mode)** — AI không chỉ trả lời chữ mà còn xuất ra JSON có cấu trúc chặt (tên milestone, thứ tự, khóa học gán vào, deadline). JSON này được lưu thẳng vào DB mà không cần parse thủ công.
- **MongoDB (`learning_goals`, `learning_plans`)** — lưu mục tiêu và lộ trình. Mỗi lần AI có context mới, server truy vấn 2 collection này để inject vào prompt, giúp AI biết học viên đang ở milestone nào.

---

### 4. Quiz thích nghi theo trình độ

AI sinh câu hỏi phù hợp với nội dung khóa đang học, và tự động điều chỉnh độ khó dựa trên lịch sử điểm của học viên.

**Để làm được điều này cần:**
- **Gemini prompt engineering (few-shot)** — prompt có mẫu câu hỏi MCQ chuẩn kèm metadata (chủ đề, độ khó, đáp án đúng). Gemini dựa vào đó tạo ra câu hỏi đúng định dạng, sẵn sàng hiển thị mà không cần chỉnh sửa.
- **Adaptive difficulty logic** — server tính điểm trung bình từ lịch sử quiz (`quiz_results`): nếu avg ≥ 80% → sinh câu Advanced; 60–79% → Intermediate; < 60% → Beginner. Logic này chạy phía server (Python), không phụ thuộc AI quyết định độ khó.
- **MongoDB (`quiz_results`)** — lưu từng lần làm quiz với score, topic, timestamp. Dùng để tính avg động và hiển thị lịch sử.

---

### 5. Nhắc ôn bài đúng lúc (Spaced Repetition)

AI biết môn nào học viên đã quên và nhắc ôn lại vào đúng thời điểm có hiệu quả nhất.

**Để làm được điều này cần:**
- **SM-2 algorithm** — thuật toán khoa học tính khoảng cách ôn tập tối ưu. Dựa vào điểm quiz: < 60% → ôn sau 1 ngày, 60–79% → 3 ngày, ≥ 80% → 7 ngày. Server chạy thuật toán này khi có kết quả quiz mới, lưu `next_review_date` vào `quiz_results`.
- **MongoDB aggregation pipeline** — truy vấn `quiz_results` theo topic, tính `next_review_date`, lọc những môn đến hạn ôn. Dùng `$group` và `$sort` để aggregate nhanh mà không cần load toàn bộ data.

---

### 6. Theo dõi tiến độ & báo cáo tuần

Học viên thấy được mình đã học bao nhiêu ngày, điểm quiz tăng hay giảm, streak liên tiếp mấy ngày.

**Để làm được điều này cần:**
- **MongoDB aggregation** — tổng hợp dữ liệu 7 ngày từ `conversations.messages` (đếm ngày có chat) và `quiz_results` (điểm TB theo ngày). Một query duy nhất trả về cả báo cáo tuần.
- **Custom chart components (React)** — vẽ biểu đồ điểm quiz 7 ngày bằng CSS + SVG thuần, không cần thư viện chart nặng. Màu tự động: đỏ < 50%, vàng 50–79%, xanh ≥ 80%.

---

### 7. Lịch học & Banner nhắc học đúng giờ

Học viên đặt lịch học (thứ mấy, mấy giờ) → đến giờ mở chat thấy banner nhắc ngay.

**Để làm được điều này cần:**
- **`setInterval` phía client (React)** — cứ mỗi phút, frontend so sánh giờ hiện tại (`Date().getDay()` + `getHours()`) với lịch học đã lưu. Nếu khớp → hiện banner tím "📚 Đến giờ học rồi!". Không cần push notification hay server-sent event vì học viên đang mở sẵn tab.
- **MongoDB (`study_schedules`)** — lưu cấu hình lịch học. Load 1 lần khi mở chat, giữ trong React state để `setInterval` so sánh.

---

### 8. Ghi chú từ chat, nhảy về đoạn chat nguồn

Học viên pin tin nhắn AI bất kỳ → lưu vào ghi chú → bấm xem lại → nhảy thẳng về đúng cuộc hội thoại đó.

**Để làm được điều này cần:**
- **`session_id` reference** — khi lưu ghi chú (`POST /api/notes`), backend lưu thêm `session_id` của cuộc hội thoại nguồn. Nhờ đó `NotesPanel` có thể gọi `onGoToChat(sessionId)` để load đúng cuộc chat đó mà không cần tìm kiếm.
- **MongoDB (`notes`)** — lưu ghi chú kèm excerpt (300 ký tự đầu), `user_id`, `session_id`, timestamp.

---

### 9. Tóm tắt phiên học

Sau khi tích lũy đủ 10 tin nhắn, nút **"📋 Tóm tắt phiên học"** tự xuất hiện. Bấm vào, AI đọc toàn bộ lịch sử cuộc hội thoại hiện tại và tổng hợp thành:
- **Những gì đã ôn luyện** trong buổi học
- **Điểm mạnh** — kiến thức nắm được, thái độ học tập
- **Điểm cần cải thiện + Lời khuyên** — bước tiếp theo cụ thể

**Để làm được điều này cần:**
- **Ngưỡng 10 tin nhắn** — frontend đếm `danhSachTinNhan.length >= 10`, chỉ hiện nút khi đủ nội dung để AI tổng hợp có ý nghĩa.
- **Conversation history trong MongoDB** — toàn bộ lịch sử phiên đó đã được lưu liên tục (`luu_tin_nhan`). Khi trigger, AI nhận được context đầy đủ của phiên học mà không cần load thêm gì.
- **Gemini với conversation context** — prompt yêu cầu AI phân tích _toàn bộ lịch sử_ (không chỉ tin cuối), nhận diện pattern học tập và đưa ra nhận xét sư phạm.

---

## 🔌 Cần làm gì để tích hợp vào Learnify thật?

### Kiến trúc hiện tại — Chat là widget độc lập

```
Learnify (mock)          Chat AI (độc lập)
─────────────────        ─────────────────────────────
page.tsx                 components/chat/
  └─ selectCourse()  ──→   ChatPanel.tsx
     dispatchEvent()         ChatMessageArea.tsx
                             ChatHistory.tsx
                             NotesPanel.tsx ...

backend/ (FastAPI + MongoDB) — deploy riêng
```

**Điểm kết nối duy nhất:**
```js
window.dispatchEvent(new CustomEvent("learnify:course-context", {
  detail: { courseId, title, category, description, progress }
}));
```

---

### Checklist tích hợp

#### Backend (sẵn sàng — chỉ cần deploy)
- [ ] Deploy `backend/` lên server (FastAPI + MongoDB)
- [ ] Set domain/IP cho backend, lấy URL
- [ ] Cấu hình biến môi trường: `GOOGLE_API_KEY`, `MONGODB_URL`
- [ ] (Tuỳ chọn) Thêm xác thực user vào API nếu Learnify có auth

#### Frontend — Copy widget chat vào Learnify thật
- [ ] Copy thư mục `components/chat/` vào project Learnify
- [ ] Copy các CSS liên quan (`chat.css`, `settings-screens.css`)
- [ ] Set biến môi trường: `NEXT_PUBLIC_API_URL=<backend-url>`
- [ ] Mount `<SplitLayout>` hoặc `<ChatPanel>` vào layout chính

#### Kết nối dữ liệu — 1 điểm kết nối
- [ ] Khi user click vào khóa học → fire event:
  ```js
  window.dispatchEvent(new CustomEvent("learnify:course-context", {
    detail: { courseId, title, category, description, progress }
  }));
  ```
- [ ] Truyền `userId` thật (từ session Learnify) vào props của ChatPanel thay vì `"default"`

#### Dữ liệu học viên — Sync với Learnify thật
- [ ] Sync hồ sơ học viên (`learner_profiles`) từ Learnify DB → MongoDB của chat
- [ ] Sync tiến độ khóa học (`course_progress`) để AI có context đầy đủ
- [ ] (Nâng cao) Webhook: Learnify thật cập nhật tiến độ → tự động cập nhật context AI

---

### Thứ tự ưu tiên tích hợp

| Giai đoạn | Việc làm | Mức độ |
|-----------|----------|--------|
| **Phase 1** | Deploy backend + mount ChatPanel vào Learnify | 🟢 Dễ |
| **Phase 2** | Fire `course-context` event khi user chọn khóa | 🟢 Dễ |
| **Phase 3** | Truyền `userId` thật từ session Learnify | 🟡 Trung bình |
| **Phase 4** | Sync dữ liệu học viên (profile, progress) 2 chiều | 🔴 Phức tạp |

> **Phase 1 + 2 có thể làm trong 1 ngày.** Chat sẽ hoạt động đầy đủ với context khóa học thật ngay lập tức.
