# Smart Auto-Checkout Trolley

An AI-powered retail self-checkout system for trolley-mounted tablets. Customers scan products, the system verifies each item via computer vision and weight sensing, and checkout is processed through EcoCash — no cashier required.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    Tablet (Next.js PWA)                       │
│   Idle Screen → Scan → Cart → Verify → Checkout → Receipt    │
└─────────────────────────┬────────────────────────────────────┘
                          │ HTTP + WebSocket
         ┌────────────────▼──────────────────┐
         │         FastAPI Backend :8000      │
         │  Sessions · Products · Payments    │
         │  WebSocket manager (realtime)      │
         └──────┬────────────┬───────────────┘
                │            │
    ┌───────────▼──┐  ┌──────▼──────────┐
    │ Vision :8001 │  │ Hardware :8002  │
    │ YOLOv8 detect│  │ Load cell / HX711│
    │ Camera feed  │  │ Barcode scanner  │
    └──────────────┘  └─────────────────┘
                          │
                  ┌───────▼──────┐
                  │ PostgreSQL   │
                  │ :5432        │
                  └──────────────┘
```

### Services

| Service           | Port | Tech                          | Purpose                         |
|-------------------|------|-------------------------------|---------------------------------|
| `frontend`        | 3000 | Next.js 15, Tailwind, Framer  | Tablet PWA (trolley UI + admin) |
| `backend`         | 8000 | FastAPI, SQLAlchemy, asyncpg  | Core API + WebSocket server     |
| `vision-service`  | 8001 | FastAPI, YOLOv8, OpenCV       | Product image verification      |
| `hardware-service`| 8002 | FastAPI, HX711/mock           | Load cell + barcode hardware    |
| `db`              | 5432 | PostgreSQL 16                 | Persistent store                |

---

## Quick Start

### Option A — Docker Compose (recommended)

```bash
# Clone repo and start everything
docker compose up --build
```

- Trolley UI:   http://localhost:3000
- Admin Panel:  http://localhost:3000/admin
- API docs:     http://localhost:8000/docs
- Vision API:   http://localhost:8001/docs
- Hardware API: http://localhost:8002/docs

### Option B — Manual (development)

#### 1. Database

```bash
# Start PostgreSQL
psql -U postgres -c "CREATE USER trolley WITH PASSWORD 'trolley';"
psql -U postgres -c "CREATE DATABASE smart_trolley OWNER trolley;"
psql -U trolley -d smart_trolley -f database/schema.sql
psql -U trolley -d smart_trolley -f database/seed.sql
```

#### 2. Backend

```bash
cd backend
python -m venv .venv && .venv\Scripts\activate   # Windows
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000
```

#### 3. Vision Service

```bash
cd vision-service
python -m venv .venv && .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8001
```

#### 4. Hardware Service

```bash
cd hardware-service
python -m venv .venv && .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8002
```

#### 5. Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local   # or set NEXT_PUBLIC_API_URL manually
npm run dev
```

---

## Barcode Scan Flow

```
Customer scans barcode
        │
        ▼
POST /api/v1/sessions/{token}/scan
        │
        ├─ Product lookup (barcode DB)
        ├─ Item added as "pending"
        ├─ WS event: item_added → UI shows pending card
        │
        ▼
Background verification (parallel):
  ├─ Vision Service: capture frame → YOLOv8 detect → compare class
  └─ Hardware Service: read load cell → compare weight range
        │
        ▼
Both pass?
  ├─ YES → status = "verified" → WS: item_verified
  └─ NO  → status = "flagged"  → WS: item_flagged + MismatchLog created
```

---

## Item Removal Flow

```
Weight decreases significantly
        │
Hardware Service detects delta
        │
POST /api/v1/sessions/{token}/weight
        │
Backend matches delta to last-added item
        │
Item status → "removed"
        │
WS event: item_removed → UI updates cart + total
```

---

## Checkout Flow

```
Customer taps Checkout
        │
GET /api/v1/checkout/{token}/status
  └─ Validates: no flagged, no pending, items > 0
        │
Customer enters phone number
        │
POST /api/v1/checkout/{token}/initiate
  └─ Creates Transaction (pending)
  └─ Triggers EcoCash payment request
        │
EcoCash sends USSD push to customer phone
        │
Customer approves on phone
        │
EcoCash calls POST /api/v1/payments/callback/ecocash
  OR mock simulates after 4s
        │
Transaction status → "completed"
WS event: payment_completed + receipt_data
        │
Receipt Modal shown → "New Cart" resets session
```

---

## WebSocket Events

Connect to: `ws://localhost:8000/ws/session/{token}`

### Server → Client

| Event               | Description                              |
|---------------------|------------------------------------------|
| `connected`         | Session WS connected                     |
| `item_added`        | New item added to cart (pending)         |
| `item_updated`      | Item status changed (verified/flagged)   |
| `weight_update`     | Weight sensor reading                    |
| `payment_update`    | Payment status changed (processing)      |
| `payment_completed` | Payment success + receipt data           |
| `payment_failed`    | Payment failed                           |

---

## Database Schema

```
categories          → Product categories with icons
aisle_map           → Physical store layout (x/y grid)
products            → Full product catalogue with SKU/barcode/weight
trolley_sessions    → Active/completed shopping sessions
trolley_items       → Line items with verification status
transactions        → EcoCash payment records
mismatch_logs       → Vision/weight verification failures
recipes             → Recipe definitions
recipe_items        → Ingredients mapped to products
```

---

## Computer Vision

The vision service uses **YOLOv8** (Ultralytics).

### Development (mock mode)
- `VISION_MOCK=true` returns simulated detections
- 92% match rate, random confidence 0.72–0.97

### Production setup
1. Collect product images (50–200 per class)
2. Label with Roboflow or LabelImg
3. Fine-tune: `yolo train model=yolov8n.pt data=trolley.yaml epochs=100`
4. Set `YOLO_MODEL_PATH=models/trolley_yolov8n.pt` and `VISION_MOCK=false`

Each product's `yolo_class_name` field maps to a YOLO class label.

---

## Hardware Integration

### Weight Sensor (HX711 + Load Cell)
- Mock mode: simulates weight changes with realistic noise
- Production: uncomment `RPi.GPIO` and `hx711` in `hardware-service/requirements.txt`
- Connect HX711 DOUT → GPIO5, SCK → GPIO6 on Raspberry Pi

### Barcode Scanner
- Any USB HID barcode scanner works (appears as keyboard input)
- The frontend `<ScanInput>` auto-focuses — scanner output submits automatically

---

## EcoCash Integration

| Mode        | Behaviour                                                        |
|-------------|------------------------------------------------------------------|
| Mock (dev)  | Simulates: pending → processing (2s) → completed (4s) · 95% success |
| Production  | Set `ECOCASH_MOCK_MODE=false` and real `ECOCASH_API_KEY`         |

EcoCash callback webhook: `POST /api/v1/payments/callback/ecocash`

---

## Admin Panel

Navigate to `/admin` on the frontend.

| Page        | Features                                              |
|-------------|-------------------------------------------------------|
| Dashboard   | Live stats, system status, revenue today              |
| Products    | Catalogue table, search, edit (add coming soon)       |
| Trolleys    | All sessions with status filter                       |
| Mismatches  | Vision/weight failures — resolve them manually        |
| Payments    | Full EcoCash payment log with status filter           |

---

## Project Structure

```
smart-checkout-trolley/
├── frontend/                    Next.js 15 PWA
│   └── src/
│       ├── app/                 App router pages
│       │   ├── page.tsx         Main trolley interface
│       │   └── admin/           Admin dashboard
│       ├── components/
│       │   ├── trolley/         Cart, scan input, bill
│       │   ├── checkout/        Checkout, EcoCash, receipt modals
│       │   ├── assistant/       AI shopping assistant
│       │   ├── map/             Animated store map
│       │   └── ui/              Shared glass components
│       ├── store/               Zustand state (cart, ui)
│       ├── hooks/               useIdleTimer
│       ├── lib/                 api.ts, websocket.ts, utils.ts
│       └── types/               TypeScript interfaces
│
├── backend/                     FastAPI
│   └── app/
│       ├── api/                 Route handlers
│       ├── models/              SQLAlchemy ORM models
│       ├── schemas/             Pydantic v2 schemas
│       ├── services/            Business logic + WS manager
│       └── core/               Config
│
├── vision-service/              YOLOv8 detection service
├── hardware-service/            Weight sensor + barcode service
├── database/                    schema.sql + seed.sql
├── docker-compose.yml
└── README.md
```

---

## Extending for Production

- **Add more products**: insert into `products` table with correct `yolo_class_name`
- **Train custom YOLO model**: fine-tune on your store's product photos
- **Real load cells**: swap `MockLoadCell` with `HX711` driver in `hardware-service`
- **Real EcoCash**: set `ECOCASH_MOCK_MODE=false` + real API credentials
- **Authentication**: add JWT middleware to admin routes
- **Multi-trolley**: each trolley connects to `/ws/session/{token}` — already supported
- **Receipt printing**: hook into `payment_completed` WebSocket event to trigger ESC/POS printer

---

## Tech Stack Summary

| Layer       | Technology                                |
|-------------|-------------------------------------------|
| Frontend    | Next.js 15, React 19, TypeScript          |
| Styling     | Tailwind CSS, Framer Motion, Glassmorphism|
| State       | Zustand                                   |
| Realtime    | Native WebSocket (auto-reconnect)         |
| Backend     | FastAPI, SQLAlchemy 2.0 async, Pydantic v2|
| Database    | PostgreSQL 16                             |
| Vision      | YOLOv8 (Ultralytics), OpenCV              |
| Hardware    | Raspberry Pi / Jetson, HX711              |
| Payment     | EcoCash (mock + real webhook)             |
| Containers  | Docker Compose                            |
