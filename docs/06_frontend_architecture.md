# 🖥️ Frontend Architecture – Chat Panel Component

## 1. Tổng quan

Chat Panel là một React component tích hợp vào layout chính của Learnify (bản User), hoạt động như side panel bên phải, có thể mở/gập, với đầy đủ tính năng chat, hiển thị rich content, và context awareness.

## 2. Component Tree

```
App Layout
├── LeftNavigation
├── MainContent (children pages)
└── ChatPanelWrapper
    ├── ChatPanelToggle (collapsed state)
    │   ├── ChatIcon
    │   └── NotificationBadge
    └── ChatPanel (expanded state)
        ├── ChatHeader
        │   ├── AIVersionLabel ("Learnify Tutor AI v2.6")
        │   ├── ModelSelector (dropdown)
        │   └── PanelControls (minimize, expand, close)
        ├── ChatSidebar (right sub-panel, optional)
        │   ├── CalendarSection
        │   ├── LearningResources
        │   ├── RecommendedCourses
        │   └── ChatHistory
        │       ├── TodayGroup
        │       ├── YesterdayGroup
        │       └── PreviousGroup
        ├── ChatMessageArea
        │   ├── WelcomeMessage
        │   ├── MessageList
        │   │   ├── UserMessage
        │   │   ├── AIMessage
        │   │   │   ├── TextContent (markdown)
        │   │   │   ├── RoadmapCard
        │   │   │   ├── ProgressCard
        │   │   │   └── FeedbackButtons
        │   │   ├── TypingIndicator
        │   │   └── SuggestionChips
        │   └── ScrollAnchor
        ├── ContextTabs
        │   ├── Tab: Context
        │   ├── Tab: Context Members
        │   ├── Tab: Learning Resource
        │   └── Tab: Course
        ├── ChatInputBar
        │   ├── AttachButton
        │   ├── TextInput
        │   ├── VoiceButton
        │   ├── EmojiPicker
        │   └── SendButton
        └── QuickActionBubble
            ├── NotificationText
            └── MascotAvatar
```

## 3. State Management

### 3.1 Chat Store (Zustand / Context API)

```typescript
interface ChatState {
  // Panel state
  isPanelOpen: boolean;
  panelWidth: number;
  panelMode: 'collapsed' | 'expanded' | 'fullpage';

  // Connection
  wsConnection: WebSocket | null;
  connectionStatus: 'connecting' | 'connected' | 'disconnected';

  // Conversations
  conversations: Conversation[];
  activeConversationId: string | null;
  messages: Message[];

  // Input
  inputText: string;
  isTyping: boolean;
  isAITyping: boolean;

  // Context
  pageContext: PageContext;
  learnerProfile: LearnerProfile | null;
  roadmap: Roadmap | null;

  // Notifications
  unreadCount: number;
  proactiveMessages: ProactiveMessage[];

  // Actions
  togglePanel: () => void;
  setPanelMode: (mode: PanelMode) => void;
  sendMessage: (content: string) => void;
  loadConversation: (id: string) => void;
  createNewConversation: () => void;
  setPageContext: (context: PageContext) => void;
}
```

### 3.2 Key Types

```typescript
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: {
    card_type?: 'roadmap' | 'progress' | 'schedule';
    card_data?: any;
    tools_used?: string[];
    feedback?: 'thumbs_up' | 'thumbs_down' | null;
  };
  status: 'sending' | 'sent' | 'streaming' | 'complete' | 'error';
}

interface Conversation {
  id: string;
  title: string;
  lastMessage: string;
  updatedAt: Date;
  messageCount: number;
}

interface PageContext {
  path: string;
  courseId?: string;
  videoId?: string;
  quizId?: string;
  courseName?: string;
  chapter?: number;
}

interface LearnerProfile {
  target: string;
  deadline: string;
  currentLevel: string;
  commitment: {
    hoursPerDay: number;
    daysPerWeek: number;
    preferredStudyTime: string;
  };
}
```

## 4. WebSocket Hook

```typescript
// hooks/useChatWebSocket.ts
function useChatWebSocket(sessionId: string) {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const wsRef = useRef<WebSocket | null>(null);

  const connect = useCallback(() => {
    const token = getAuthToken();
    const ws = new WebSocket(
      `${WS_BASE_URL}/ws/chat/${sessionId}?token=${token}`
    );

    ws.onopen = () => setStatus('connected');
    ws.onclose = () => {
      setStatus('disconnected');
      // Auto reconnect with exponential backoff
      scheduleReconnect();
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      handleServerMessage(data);
    };

    wsRef.current = ws;
  }, [sessionId]);

  const sendMessage = useCallback((content: string, metadata?: any) => {
    wsRef.current?.send(JSON.stringify({
      type: 'message',
      content,
      metadata
    }));
  }, []);

  return { status, connect, sendMessage, disconnect };
}
```

## 5. Rich Message Rendering

```typescript
// components/chat/MessageRenderer.tsx
function MessageRenderer({ message }: { message: Message }) {
  if (message.metadata?.card_type === 'roadmap') {
    return <RoadmapCard data={message.metadata.card_data} />;
  }
  if (message.metadata?.card_type === 'progress') {
    return <ProgressCard data={message.metadata.card_data} />;
  }
  if (message.status === 'streaming') {
    return <StreamingMessage content={message.content} />;
  }
  return <MarkdownMessage content={message.content} />;
}
```

## 6. CSS Architecture

### 6.1 Panel Positioning

```css
/* Chat Panel Positioning */
.chat-panel-wrapper {
  position: fixed;
  top: 0;
  right: 0;
  height: 100vh;
  z-index: 1000;
  transition: width 300ms cubic-bezier(0.4, 0, 0.2, 1);
}

.chat-panel--collapsed {
  width: 48px;
}

.chat-panel--expanded {
  width: 400px;
  box-shadow: -4px 0 24px rgba(0, 0, 0, 0.08);
}

.chat-panel--fullpage {
  width: 100vw;
}

/* Main content adjustment */
.main-content {
  transition: margin-right 300ms cubic-bezier(0.4, 0, 0.2, 1);
}

.main-content--panel-open {
  margin-right: 400px;
}

/* Responsive */
@media (max-width: 768px) {
  .chat-panel--expanded {
    width: 100vw;
    border-radius: 16px 16px 0 0;
    bottom: 0;
    top: auto;
    height: 85vh;
  }
}
```

### 6.2 Design Tokens

```css
:root {
  /* Chat Panel Colors */
  --chat-bg: #FFFFFF;
  --chat-user-bubble: #4A90D9;
  --chat-ai-bubble: #F0F4F8;
  --chat-text: #1A1A2E;
  --chat-text-secondary: #6B7280;
  --chat-border: #E5E7EB;
  --chat-accent: #3B82F6;

  /* Spacing */
  --chat-padding: 16px;
  --chat-gap: 12px;
  --chat-bubble-radius: 16px;

  /* Typography */
  --chat-font-size: 14px;
  --chat-line-height: 1.5;

  /* Animation */
  --chat-transition: 300ms cubic-bezier(0.4, 0, 0.2, 1);
}
```

## 7. Accessibility

| Requirement | Implementation |
|---|---|
| **Keyboard Navigation** | Ctrl+L toggle panel, Tab qua messages, Enter gửi |
| **Screen Reader** | ARIA labels cho tất cả interactive elements |
| **Focus Management** | Focus trap trong panel khi mở, return focus khi đóng |
| **Color Contrast** | WCAG AA compliance cho text contrast |
| **Responsive** | Hoạt động trên mọi screen size |
| **Reduced Motion** | Respect `prefers-reduced-motion` |

## 8. File Structure

```
src/
├── components/
│   └── chat/
│       ├── ChatPanelWrapper.tsx      # Main wrapper, handles open/close
│       ├── ChatPanel.tsx             # Full panel layout
│       ├── ChatHeader.tsx            # Header with controls
│       ├── ChatMessageArea.tsx       # Message list container
│       ├── ChatInputBar.tsx          # Input area
│       ├── ChatSidebar.tsx           # Right sub-panel
│       ├── ChatHistory.tsx           # Conversation list
│       ├── ContextTabs.tsx           # Context/Resources tabs
│       ├── QuickActionBubble.tsx     # Mascot + notification
│       ├── messages/
│       │   ├── UserMessage.tsx
│       │   ├── AIMessage.tsx
│       │   ├── StreamingMessage.tsx
│       │   ├── TypingIndicator.tsx
│       │   └── SuggestionChips.tsx
│       ├── cards/
│       │   ├── RoadmapCard.tsx
│       │   ├── ProgressCard.tsx
│       │   └── ScheduleCard.tsx
│       └── styles/
│           ├── chat-panel.css
│           ├── chat-messages.css
│           └── chat-cards.css
├── hooks/
│   ├── useChatWebSocket.ts
│   ├── useChatStore.ts
│   └── usePageContext.ts
├── services/
│   └── chatService.ts
└── types/
    └── chat.ts
```
