# 🗄️ Data Architecture & Context Management

## 1. Tổng quan

AI Tutor cần **hiểu context** của học viên ở mọi thời điểm. Document này mô tả cách tổ chức, lưu trữ, và truy xuất context data.

## 2. Context Layers

```
┌─────────────────────────────────────────────────────┐
│                 CONTEXT LAYERS                       │
│                                                      │
│  Layer 1: IDENTITY CONTEXT (Ít thay đổi)            │
│  ├── User profile, preferences, learning style       │
│  └── Organization, role                              │
│                                                      │
│  Layer 2: GOAL CONTEXT (Thay đổi theo milestone)     │
│  ├── Target (IELTS 6.5), deadline                    │
│  ├── Commitment (hours/day, days/week)               │
│  └── Custom scope/preferences                        │
│                                                      │
│  Layer 3: PROGRESS CONTEXT (Thay đổi liên tục)      │
│  ├── Roadmap milestones status                       │
│  ├── Course progress, quiz scores                    │
│  └── AI evaluations, weak points                     │
│                                                      │
│  Layer 4: SESSION CONTEXT (Ephemeral)                │
│  ├── Current page/course being viewed                │
│  ├── Current chat conversation                       │
│  └── Real-time actions                               │
│                                                      │
└─────────────────────────────────────────────────────┘
```

## 3. Data Models

### 3.1 Learner Profile (Layer 1 + 2)

```json
{
  "user_id": "user_12345",
  "organization_id": "org_001",
  "display_name": "Nguyen Van A",
  "learning_style": "visual",
  "preferred_language": "vi",
  "onboarding_completed": true,
  "learning_profile": {
    "target": "6.5 IELTS",
    "deadline": "2026-09-10",
    "current_level": "5.0",
    "commitment": {
      "hours_per_day": 2,
      "days_per_week": 5,
      "preferred_study_time": "Evening"
    }
  }
}
```

### 3.2 Roadmap & Progress (Layer 3)

```json
{
  "user_id": "user_12345",
  "roadmap": {
    "total_progress": 35,
    "status": "on_track",
    "last_updated": "2026-03-10T09:00:00Z",
    "milestones": [
      {
        "milestone_id": "ms_01",
        "title": "Nền tảng Vocabulary & Grammar",
        "expected_completion": "2026-04-15",
        "status": "completed",
        "actual_completion_date": "2026-04-10",
        "assigned_courses": [
          {
            "course_id": "course_ielts_vocab_01",
            "title": "Vocabulary for 6.5 - Part 1",
            "system_progress": 100,
            "quiz_avg_score": 8.5,
            "required_to_pass": true
          }
        ]
      },
      {
        "milestone_id": "ms_02",
        "title": "Kỹ năng Listening & Reading Chiến thuật",
        "expected_completion": "2026-06-01",
        "status": "in_progress",
        "assigned_courses": [
          {
            "course_id": "course_ielts_reading_02",
            "title": "Reading Strategies Masterclass",
            "system_progress": 45,
            "quiz_avg_score": 6.0,
            "ai_evaluation": "Học viên đang yếu phần Matching Headings"
          }
        ]
      }
    ]
  }
}
```

### 3.3 AI Agent State (Layer 3 + 4)

```json
{
  "user_id": "user_12345",
  "agent_state": {
    "last_interaction": "2026-03-10T09:00:00Z",
    "current_focus": "Reading Milestone",
    "suggested_next_action": "Hoàn thành bài Quiz chương 3 của khóa Reading",
    "conversation_summary": "Đã tạo lộ trình IELTS 6.5, đang theo dõi milestone 2",
    "identified_weaknesses": ["Matching Headings", "Paraphrasing"],
    "coaching_style": "encouraging",
    "proactive_nudges_sent": 3,
    "last_nudge_at": "2026-03-09T18:00:00Z"
  }
}
```

### 3.4 Session Context (Layer 4)

```json
{
  "session_id": "sess_abc123",
  "user_id": "user_12345",
  "current_page": "/courses/course_ielts_reading_02/chapter/3",
  "active_course_id": "course_ielts_reading_02",
  "active_video_id": null,
  "active_quiz_id": "quiz_reading_ch3",
  "started_at": "2026-03-10T09:00:00Z",
  "page_context": {
    "course_title": "Reading Strategies Masterclass",
    "chapter": 3,
    "topic": "Matching Headings Strategy"
  }
}
```

## 4. Storage Architecture

### 4.1 Database Mapping

| Data Layer | Storage | Lý do |
|---|---|---|
| **Identity Context** | PostgreSQL/SQLite (Prisma) | Structured, relational, existing system |
| **Goal Context** | PostgreSQL + JSON column | Semi-structured, linked to user |
| **Progress Context** | PostgreSQL + Redis cache | Frequent reads, cần performance |
| **Session Context** | Redis | Ephemeral, expire sau 24h |
| **Chat History** | MongoDB | Flexible schema, large documents |
| **Agent Memory** | MongoDB + Vector DB | Long-term semantic memory |

### 4.2 Database Schema Extensions (Prisma)

```prisma
// Thêm vào schema.prisma hiện tại

model LearnerProfile {
  id              String   @id @default(uuid())
  userId          String   @unique
  user            User     @relation(fields: [userId], references: [id])
  target          String?                    // "6.5 IELTS"
  deadline        DateTime?
  currentLevel    String?                    // "5.0"
  hoursPerDay     Int      @default(2)
  daysPerWeek     Int      @default(5)
  studyTime       String   @default("Evening")
  learningStyle   String?                    // "visual", "auditory"
  onboardingDone  Boolean  @default(false)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  roadmap         Roadmap?
}

model Roadmap {
  id              String      @id @default(uuid())
  profileId       String      @unique
  profile         LearnerProfile @relation(fields: [profileId], references: [id])
  totalProgress   Int         @default(0)
  status          String      @default("not_started") // on_track, behind, ahead
  milestones      Milestone[]
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt
}

model Milestone {
  id                  String    @id @default(uuid())
  roadmapId           String
  roadmap             Roadmap   @relation(fields: [roadmapId], references: [id])
  title               String
  orderIndex          Int
  expectedCompletion  DateTime?
  actualCompletion    DateTime?
  status              String    @default("locked") // locked, in_progress, completed
  assignedCourses     Json?     // Array of course assignments
  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt
}

model AIAgentState {
  id                  String   @id @default(uuid())
  userId              String   @unique
  currentFocus        String?
  suggestedNextAction String?
  conversationSummary String?  @db.Text
  identifiedWeaknesses Json?   // ["Matching Headings", ...]
  coachingStyle       String   @default("encouraging")
  lastInteraction     DateTime?
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
}
```

### 4.3 MongoDB Collections (Chat & Memory)

```javascript
// Collection: chat_conversations
{
  _id: ObjectId,
  user_id: "user_12345",
  session_id: "sess_abc123",
  title: "IELTS Plan Discussion",
  created_at: ISODate,
  updated_at: ISODate,
  messages: [
    {
      role: "user",
      content: "Help me create a 6-month IELTS study plan.",
      timestamp: ISODate,
      metadata: {
        page_context: "/dashboard"
      }
    },
    {
      role: "assistant",
      content: "Great! Let's get started...",
      timestamp: ISODate,
      metadata: {
        tools_used: ["get_learner_profile", "create_roadmap"],
        confidence: 0.95
      }
    }
  ],
  summary: "Học viên muốn đạt IELTS 6.5 trong 6 tháng..."
}

// Collection: agent_memory
{
  _id: ObjectId,
  user_id: "user_12345",
  memory_type: "semantic",  // semantic, episodic, procedural
  content: "Học viên yếu Matching Headings, đã gợi ý tập trung luyện.",
  embedding: [0.012, -0.034, ...],  // Vector embedding for retrieval
  relevance_score: 0.9,
  created_at: ISODate,
  expires_at: null  // null = permanent
}
```

## 5. Context Assembly Pipeline

Khi user gửi message, hệ thống cần assemble context:

```
User Message
    │
    ▼
┌──────────────────────────────────────┐
│      CONTEXT ASSEMBLER               │
│                                      │
│  1. Load Session Context (Redis)     │
│     → Current page, active course    │
│                                      │
│  2. Load Learner Profile (Prisma)    │
│     → Target, level, commitment      │
│                                      │
│  3. Load Progress (Prisma + Cache)   │
│     → Roadmap, milestones, scores    │
│                                      │
│  4. Load Agent State (Prisma)        │
│     → Focus, suggestions, weaknesses │
│                                      │
│  5. Search Agent Memory (MongoDB)    │
│     → Relevant past interactions     │
│                                      │
│  6. Load Recent Chat (MongoDB)       │
│     → Last N messages for continuity │
│                                      │
│  OUTPUT: Assembled Context Object    │
└──────────────────────────────────────┘
    │
    ▼
  AI Agent (LangGraph)
```

## 6. Context Update Triggers

| Trigger | Context Updated | Source |
|---|---|---|
| User hoàn thành quiz | Progress, Agent State | Quiz system webhook |
| User hoàn thành video | Progress | Video completion event |
| User gửi chat message | Session, Chat History | Real-time |
| AI tạo roadmap | Goal, Roadmap | Agent action |
| Milestone completed | Progress, Agent State | System check |
| Daily cron job | Agent State (suggested_next_action) | Scheduled |
| User login | Session Context | Auth event |
