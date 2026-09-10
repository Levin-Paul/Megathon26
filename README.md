# Megathon26 — AEROGUARD: Drone Activity Monitoring & Coastal Surveillance Console

> **Track-A: Civil Law Enforcement & Airspace Governance Command Platform**  
> *Autonomous Multi-Sensor Fusion, Remote ID Telemetry Ingestion, 7-Point DGCA Validation, Tactical Geofencing, and Tamper-Evident Cryptographic Audit Ledger*

---

## 🎯 Scope & Strict Boundaries (Track-A Compliance)

AeroGuard is engineered strictly for **civil law enforcement, airspace compliance monitoring, and evidentiary logging**:
- **In-Scope**: Passive radar detection, Remote ID / telemetry ingestion, optical sensor fusion, DGCA rule correlation, advisory alerting, tactical geofencing, and tamper-evident evidence logging.
- **Strictly Out-of-Scope (Prohibited)**: Zero RF jamming, spoofing, GNSS interference, drone takeover/hijacking, facial recognition, or offensive kinetic/electronic interdiction mechanisms.
- **Targets**: Aircraft, UAVs, and vessels only; zero tracking of human persons.
- **Track-B Boundary Note (`DARK_VESSEL`)**: Marine automatic identification system (AIS) dark-vessel tracking is classified strictly under **Track-B (Maritime Coastal Vessel Domain)** and is marked not applicable in Track-A airspace surveillance.

---

## 🏛️ Three Dedicated User Portals (Locked Architecture)

AeroGuard maintains three distinct, dedicated role-based portals with role-tailored authentication flows:

| Role | Portal Entry | Dashboard Route | Core Responsibilities |
|---|---|---|---|
| **Public / Drone Operator** | `/operator/login` | `/operator/dashboard` | UAS registration, DigitalSky flight permission applications, fleet status, pre-flight corridor verification. |
| **Law Enforcement Officer / Admin** | `/admin/login` | `/admin/dashboard` | 24/7 airspace command console, live Leaflet radar map, pop-out tactical scope, camera cueing, reason-coded alert dispositions, temporary red zone authoring. |
| **Super Admin** | `/super-admin/login` | `/super-admin/dashboard` | Global governance, GeoJSON boundary layer ingestion, cryptographic audit chain verification, retention policy enforcement, system watchdog settings. |

---

## 📐 System Architecture & Core Pipeline

```
[ Remote ID / Radar Telemetry ] 
              ↓ (POST /api/ingest/telemetry)
[ Telemetry Ingestion Layer ] ──> Latency Benchmark (Recorded in DB: ~51.5ms, <= 2000ms Target)
              ↓
[ Track Manager & Watchdog ] ──> 5-Second Heartbeat Watchdog (Declares LOST_LINK on timeout)
              ↓
[ ASTRA Micro-Doppler Model ] ──> 300 Spectral Features -> RF Classifier (99.82% Accuracy)
              ↓
[ Optical PTZ Sensor Fusion ] ──> Spatial FOV Boresight Lock -> YOLOv8 Vision Inference
              ↓
[ Rules & 7-Point DGCA Engine ] ──> Evaluates Registry, Permits, Time, Corridor, and Altitude
              ↓
[ Spatial Engine (Ray-Casting) ] ──> Permanent Naval Geofences & Dynamic Temporary Red Zones
              ↓
[ Primary Alert Taxonomy ] ──> AUTHORIZED / UNREGISTERED / OUT_OF_ENVELOPE / LOST_LINK
              ↓
[ Officer Disposition Workflow ] ──> Mandatory Reason-Code Enforcement (CONFIRMED/DISMISSED/ESCALATED)
              ↓
[ Tamper-Evident Audit Ledger ] ──> Cryptographic SHA-256 Hash Chain (Genesis to Block N)
```

---

## 🔬 Key Technical Features

### 1. Telemetry Ingestion Layer (`POST /api/ingest/telemetry`)
- Validates latitude `[-90, 90]`, longitude `[-180, 180]`, altitude envelope `[-50m, 20000m]`, speed, and heading.
- High-throughput processing pipeline connecting directly to SQLite and SSE broadcasting.
- **Measured Ingestion Latency**: **~51.5ms** network roundtrip (exceeds the $\le 2000	ext{ms}$ report-to-console requirement).

### 2. 7-Point DGCA DigitalSky Authorization Engine
Every incoming report is validated against seven strict legal conditions:
1. **Registry Existence**: Drone record exists in the civil UAS registry.
2. **UAS Identifier Match**: Reported UIN matches official registration certificate.
3. **Status Check**: UAS registration is marked `VERIFIED` / `APPROVED`.
4. **Active Permission**: An approved flight permission exists for the current date.
5. **Time Window**: Current UTC timestamp falls strictly within `[start_time, end_time]`.
6. **Horizontal Flight Corridor**: Target position is inside approved corridor polygon (Jordan Ray-Casting).
7. **Altitude Envelope**: Drone altitude does not breach approved ceiling (e.g. $\le 80	ext{m}$ AGL).

### 3. Primary Alert Taxonomy & Advisory Actions
Alerts are mapped to clear, standardized classifications:
- **`AUTHORIZED`**: Compliant flight within approved envelope. Suggested action: `MONITOR`.
- **`UNREGISTERED`**:
  - `NO_REGISTRY_MATCH`: UAS not found in civil registry. Suggested action: `VERIFY REGISTRY / IDENTIFY OPERATOR`.
  - `INVALID_UIN`: UIN formatting or serial mismatch.
  - `NO_APPROVED_PERMISSION`: Registered drone flying without permission.
- **`OUT_OF_ENVELOPE`**:
  - `ALTITUDE`: Altitude ceiling exceeded.
  - `HORIZONTAL_GEOFENCE`: Breach of restricted or temporary exclusion zone.
  - `TIME_WINDOW`: Flight occurring outside permitted operating hours.
  - `PERMISSION_ENVELOPE`: Drone deviated from its authorized path corridor.
- **`LOST_LINK`**:
  - `TELEMETRY_TIMEOUT`: Remote ID signal lost for $>5.0	ext{s}$. Suggested action: `VERIFY SENSOR / SECONDARY OBSERVATION`.

### 4. Tactical Temporary Red Zones with Live Auto-Expiration
- Officers can click **"CREATE TEMP RED ZONE"** directly on the live map and draw a custom tactical polygon (e.g. VIP movement, bomb squad cordon, maritime accident perimeter).
- Includes duration selector (default 60 seconds) with an interactive **live countdown badge** (`Expires in: 00:00:48`).
- **Autonomous Expiration**: When expired, the spatial engine automatically deactivates the zone (`active = 0`), dims its visualization, and exempts subsequent drone flights from geofence violations.

### 5. GeoJSON Boundary Ingestion (`POST /api/zones/import-geojson`)
- Allows law enforcement and GIS administrators to upload `.geojson` / `.json` files or paste standard RFC 7946 FeatureCollections.
- Auto-extracts polygon vertices, altitude ceilings, and security classifications into the database.

### 6. Tamper-Evident SHA-256 Audit Ledger
- Every critical action (system initialization, zone creation, alert disposition, settings updates) is cryptographically chained.
- **Chaining Formula**:  
  $$	ext{Current Hash} = 	ext{SHA-256}(	ext{timestamp} + 	ext{operator\_id} + 	ext{action} + 	ext{resource\_id} + 	ext{result} + 	ext{reason\_code} + 	ext{details} + 	ext{previous\_hash})$$
- Thread-safe concurrency lock guarantees immutable linear chaining under multi-threaded telemetry.
- **Verification Endpoint**: `GET /api/audit/verify` audits the full chain from genesis (`0` * 64) and verifies 2,600+ historical blocks (`CHAIN VALID`).
- **Forensic Exports**: One-click download in CSV (`/api/audit/export?format=csv`) and structured JSON (`/api/audit/export?format=json`).
- **Mandatory Reason-Code Dispositions**: Active alerts cannot be closed without selecting a valid, auditable reason code (`CONFIRMED`, `DISMISSED`, `ESCALATED`).

### 7. AI Model Transparency & Benchmark Evaluation
- **ASTRA Micro-Doppler ML**: Random Forest classifier trained on 2,800 real sweeps across 300 spectral bins. Verified accuracy: **99.82%**.
- **YOLOv8 Optical Vision**: Clean separation between simulated sensor feeds and real deep learning models (`VISION MODE: YOLO` vs `VISION MODE: SIMULATION / MODEL PENDING`).
- **Evaluation Benchmark**: Standalone script `backend/scripts/evaluate_vision.py` outputs real Precision, Recall, F1, and mAP@50 without synthetic placeholders.

---

## 🚀 Running the Automated Test Suite

AeroGuard includes a complete Track-A end-to-end automated test suite:

```bash
python backend/tests/test_track_a_e2e.py
```

### Verified Test Cases:
1. `test_01_telemetry_ingestion_and_latency`: Verifies Remote ID ingestion and confirms pipeline latency $\le 2000	ext{ms}$ (**~51.5ms achieved**).
2. `test_02_seven_point_dgca_authorization`: Verifies 7-point DGCA validation across `AUTHORIZED`, `UNREGISTERED`, and `OUT_OF_ENVELOPE` targets.
3. `test_03_temporary_red_zone_lifecycle_and_auto_expiry`: Validates dynamic 3-second temporary red zone creation, active violation alerting, auto-expiry deactivation, and post-expiry violation clearance.
4. `test_04_lost_link_heartbeat_timeout`: Validates background watchdog timeout detection at 5 seconds and declaration of `LOST_LINK: TELEMETRY_TIMEOUT`.
5. `test_05_tamper_evident_audit_ledger_and_dispositions`: Tests mandatory reason-code dispositions, SHA-256 chain integrity verification (`CHAIN VALID`), and CSV/JSON exports.
6. `test_06_geojson_zone_layer_import`: Validates parsing, coordinate extraction, and persistence of GeoJSON boundary layers.

---

## 💻 Quick Start & Deployment

### 1. Launch Backend Server
```bash
cd backend
python app.py
```
*(Runs on `http://127.0.0.1:5000` with SQLite database `backend/data/aeroguard.db`)*

### 2. Launch Frontend Command Center
```bash
cd frontend
npm install
npm run dev
```
*(Runs on `http://localhost:5173`)*

### 3. Default Login Credentials
- **Public Drone Operator**: `operator` / `operator123`
- **Law Enforcement Officer**: `officer.raman` / `officer123`
- **Super Administrator**: `superadmin` / `superadmin123`
>>>>>>> 63b52f4 (feat: AeroGuard Track-A coastal surveillance console with 3 locked portals, demo scenarios, radar pipeline, camera fusion, and immutable audit ledger)
