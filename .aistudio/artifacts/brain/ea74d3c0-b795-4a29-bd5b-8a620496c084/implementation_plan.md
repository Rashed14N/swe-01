# SWE Portal AI Assistant & Quota-Protected Chatbot

A smart, responsive academic chatbot embedded directly within the SWE Student Portal that answers student queries (exam schedules, class routines, faculty details, notices) in English and Banglish while maintaining near-zero Supabase API quota consumption.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> **No External Platforms Required**: Everything runs 100% inside your existing Google AI Studio applet using the native `@google/genai` SDK (`gemini-3.8-flash`) and your current server. You do not need Cloud CoWorker or any other third-party services.

- **Supabase Quota Protection Strategy**: In-memory server cache (5-minute TTL) for portal academic data. The bot reads from RAM, so 10,000 questions generate **zero extra Supabase queries**.
- **Dual Engine (Hybrid Speed & AI)**:
  - *Instant Template Fast-Path*: Common queries (e.g., "Kal ki exam?", "Tomorrow routine") respond in <50ms without invoking external APIs.
  - *Gemini 3.8 Flash AI Engine*: Natural language questions in Banglish, Bengali, or English are answered with full semantic understanding.
- **Floating Widget UI**: Collapsible bottom-right assistant button with quick-prompt chips for one-tap answers.

---

## 1. Overview & Core Concept

### What It Does
An interactive floating chat assistant on the SWE Portal that answers student questions regarding:
1. **Upcoming Exams & Tests**: Exam dates, courses, rooms, and schedules ("Kal ki exam kab hai?").
2. **Faculty Contact & Rooms**: Faculty designations, official emails, phone numbers, and office locations.
3. **Class Routine & Schedule**: Daily schedule, class times, and room numbers.
4. **Notices & Class Tasks**: Recent announcements and pending homework/assignments.

### Target Audience & Persona
- **SWE Students & CRs**: Frequently checking upcoming exams, tomorrow's schedule, and teacher contact info on mobile or desktop without navigating multiple tabs.

### Key Value
- **Zero Quota Exhaustion**: Caches routine, exam, and faculty data on the server so repeated student questions do not pause or exhaust your Supabase free tier.
- **Banglish & Multilingual Fluency**: Understands colloquial queries ("Kal ki exam ache?", "Aagami kal tomorrow will be exam", "Sir er cabin number koto").

---

## 2. User Experience & Visual Design

### Key User Flows

1. **Floating Trigger**:
   - A discreet, elegant blue floating button in the bottom-right corner (`fixed bottom-5 right-5 z-40`) displaying a subtle sparkle/message icon and "SWE Assistant".
   - Shows a notification dot when there's an exam scheduled for tomorrow.

2. **Expanding the Chat Panel**:
   - Clicking the trigger expands a sleek, compact chat window ($380\text{px}$ wide on desktop, full-width bottom sheet on mobile).
   - Welcomes the student with personalized context: *"Hi Tanvir (SWE 9th Batch, Sem 5), how can I help you today?"*

3. **Quick Action Chips (One-Tap Inquiries)**:
   - *"📅 Tomorrow's Exam"*
   - *"⏰ Today's Class Routine"*
   - *"👨‍🏫 Faculty Directory"*
   - *"📢 Latest Department Notices"*

4. **Conversational Responses**:
   - Clean, structured markdown message cards with bold course codes and formatted times.
   - For exam queries: returns course code, title, exam date, remaining time countdown, and syllabus notes.

### Visual Identity & Theme
- **Theme Consistency**: Fully integrated with the portal's light/dark mode (`#F8FAFC` light, `#0F172A` navy dark).
- **Typography & Formatting**: Clean unboxed metadata with font-semibold headers and mono course codes (`SWE-211`, `SWE-223`).
- **Interactive Feedback**: Typing indicator pulse, smooth slide-up reveal, auto-scrolling message list, and copy-to-clipboard for teacher contacts.

---

## 3. Key Product Decisions & Trade-Offs

### Decision 1: Quota Protection via Server Memory Caching
- **Chosen Approach**: Server-side in-memory snapshot of academic data (`routine`, `exams`, `faculty`, `courses`, `notices`) refreshed on a 5-minute background timer or invalidated upon admin updates.
- **Why**: Supabase free-tier projects pause if request limits are exceeded. Serving the bot from server memory prevents database throttling while maintaining real-time accuracy.
- **Alternatives Considered**: Direct Supabase query per chat message (rejected: would quickly burn daily quotas with multiple concurrent users).

### Decision 2: Hybrid Query Handling (Template Matcher + Gemini AI)
- **Chosen Approach**:
  1. Fast-path regex matcher for standard repetitive phrases ("tomorrow exam", "faculty phone", "today routine").
  2. Gemini 3.8 Flash (`@google/genai`) for conversational, ambiguous, or mixed-language Banglish queries.
- **Why**: Delivers instant (<50ms) replies for 70% of routine questions, reserving AI calls only when semantic understanding is truly needed.

### Decision 3: Zero Third-Party Services
- **Chosen Approach**: Rely exclusively on Google AI Studio's native environment (`@google/genai` and Node Express backend).
- **Why**: Eliminates third-party subscription fees, API token expiration issues, and external network latency.

---

## 4. Technical Architecture & Data Strategy

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                       Client Browser                        │
│  ┌───────────────────────────────────────────────────────┐  │
│  │   Floating Chat Widget (ChatBotWidget.tsx)             │  │
│  │   - Quick prompt pills ("Tomorrow's Exam")            │  │
│  │   - Student Batch & Semester context payload          │  │
│  └───────────────────────────┬───────────────────────────┘  │
└──────────────────────────────┼──────────────────────────────┘
                               │ POST /api/assistant/chat
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                      Express Backend                        │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ 1. Server Academic Cache (5-min TTL Memory Snapshot)  │  │
│  │    [Exams, Routine, Faculty, Notices, Courses]        │  │
│  └───────────────────────────┬───────────────────────────┘  │
│                              │                              │
│       ┌──────────────────────┴──────────────────────┐       │
│       ▼ (Standard Keywords)                         ▼ (NL)  │
│  ┌─────────────────────────┐     ┌───────────────────────┐  │
│  │ Fast Template Matcher   │     │ Gemini 3.8 Flash      │  │
│  │ (<50ms RAM Response)    │     │ (@google/genai SDK)   │  │
│  └────────────┬────────────┘     └───────────┬───────────┘  │
└───────────────┼──────────────────────────────┼──────────────┘
                │                              │
                └──────────────►◄──────────────┘
                               │
                               ▼
                   Structured Answer to Client
```

### Data Pipeline & Endpoints
- **Server Endpoint**: `POST /api/assistant/chat`
  - Accepts: `{ message: string, history?: Message[], userContext?: { batchId, batchName, currentSemester } }`
  - Checks in-memory cache for relevant courses, exams, and routines matching the student's batch.
  - If fast pattern matches, formats structured response immediately.
  - Otherwise, prompts `gemini-3.8-flash` with system instructions containing the cached portal snapshot.

### Example Response Templates
- **Exam Query**:
  > "For **SWE 9th Batch (5th Semester)**:
  > - **SWE-211 (Computer Architecture)**: Midterm on **Nov 15, 2026 at 10:00 AM** (Room 502)
  > - Course Teacher: **Engr. Sarah Ahmed**"
- **Faculty Query**:
  > "**Dr. Mohammad Mizanur Rahman** (Associate Professor)
  > - Email: `mizan@diu.edu.bd`
  > - Office: Faculty Lounge, Level 5"

---

## 5. Verification Plan

1. **Compilation**: Run `compile_applet` and `lint_applet` to ensure zero TypeScript build errors.
2. **Quota Verification**: Test multiple consecutive queries to confirm zero excessive database roundtrips.
3. **Banglish Testing**:
   - "Kal ki exam kab hai?"
   - "Faculty er detail dao"
   - "Amar batch er class kokhon?"
4. **Responsiveness**: Verify smooth collapsible interactions across both mobile viewports and desktop layouts.
