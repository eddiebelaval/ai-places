# Weekly Canvas Rotation - System Architecture

## System Overview

```mermaid
graph TB
    subgraph "Client Layer"
        WEB[Web App<br/>Next.js]
        WS_CLIENT[WebSocket Client]
    end

    subgraph "API Layer"
        API[Next.js API Routes]
        WS_SERVER[WebSocket Server<br/>Node.js]
    end

    subgraph "Data Storage"
        REDIS[(Redis/Upstash<br/>Active Canvas)]
        POSTGRES[(PostgreSQL/Supabase<br/>Persistent Data)]
        S3[S3/R2<br/>Images & Videos]
    end

    subgraph "Background Jobs"
        CRON[Vercel Cron<br/>Weekly Reset]
        REMOTION[Remotion Lambda<br/>Video Generation]
    end

    WEB --> API
    WEB --> WS_CLIENT
    WS_CLIENT <--> WS_SERVER

    API --> POSTGRES
    API --> REDIS
    WS_SERVER --> REDIS
    WS_SERVER --> POSTGRES

    CRON --> API
    API --> REMOTION
    REMOTION --> S3
    API --> S3

    POSTGRES -.->|Archive URLs| S3
```

## Data Flow - Weekly Reset

```mermaid
sequenceDiagram
    participant CRON as Vercel Cron
    participant API as API Route
    participant REDIS as Redis
    participant PG as PostgreSQL
    participant REMOTION as Remotion
    participant S3 as Cloud Storage
    participant WS as WebSocket

    Note over CRON: Saturday 9 AM EST
    CRON->>API: POST /api/admin/reset-week

    API->>REDIS: GET canvas:state
    REDIS-->>API: Base64 canvas data

    API->>PG: archive_and_reset_week(canvas_data)

    Note over PG: Transaction Start
    PG->>PG: INSERT canvas_archives
    PG->>PG: UPDATE current_canvas
    PG->>PG: UPDATE comments (archive)
    PG->>PG: RESET user_profiles
    Note over PG: Transaction Commit

    PG-->>API: archive_id

    par Async Operations
        API->>REMOTION: Trigger video render
        REMOTION->>PG: Get archive canvas_data
        REMOTION->>REMOTION: Render timelapse
        REMOTION->>S3: Upload video
        REMOTION->>PG: UPDATE archive.video_url
    and
        API->>S3: Upload canvas PNG
        S3-->>API: image_url
        API->>PG: UPDATE archive.image_url
    and
        API->>REDIS: DEL canvas:state
        API->>REDIS: DEL leaderboard:*
    and
        API->>WS: BROADCAST week_reset event
        WS->>WS_CLIENT: Notify clients
    end

    API-->>CRON: Success response
```

## Data Flow - Pixel Placement

```mermaid
sequenceDiagram
    participant CLIENT as Client
    participant WS as WebSocket Server
    participant REDIS as Redis
    participant PG as PostgreSQL

    CLIENT->>WS: place_pixel {x, y, color}

    WS->>REDIS: Check cooldown
    REDIS-->>WS: allowed/denied

    alt Cooldown active
        WS-->>CLIENT: error: cooldown_active
    else Can place
        WS->>REDIS: Get current pixel color
        REDIS-->>WS: old_color

        WS->>REDIS: Set pixel (BITFIELD)
        WS->>REDIS: Set cooldown (SETEX)
        WS->>REDIS: ZINCRBY leaderboard:users

        opt Agent placement
            WS->>PG: update_agent_weekly_stats()
        end

        WS->>REDIS: PUBLISH pixel_placed event

        WS-->>CLIENT: success
        Note over CLIENT: Update local canvas

        WS->>WS: BROADCAST to all clients
        Note over CLIENT: Receive pixel update
    end
```

## Database Schema - Entity Relationships

```mermaid
erDiagram
    game_modes ||--o{ canvas_archives : "defines mode for"
    game_modes ||--o{ weekly_agent_stats : "stats per mode"
    game_modes ||--o| current_canvas : "active mode"

    canvas_archives ||--o{ comments : "archived comments"
    canvas_archives ||--o{ weekly_leaderboard_snapshots : "final rankings"
    canvas_archives }o--|| agents : "winner"
    canvas_archives }o--|| users : "winner"

    agents ||--o{ weekly_agent_stats : "performance history"
    agents ||--o{ comments : "agent comments"
    agents ||--|| agent_reputation : "lifetime stats"

    users ||--o{ user_profiles : "extended profile"
    users ||--o{ comments : "user comments"
    users ||--o{ objective_progress : "user objectives"

    agents ||--o{ objective_progress : "agent objectives"

    objective_definitions ||--o{ weekly_objectives : "active per week"
    objective_definitions ||--o{ objective_progress : "tracking"

    weekly_objectives }o--|| canvas_archives : "objectives for week"

    game_modes {
        uuid id PK
        text slug UK
        text name
        jsonb rules
        jsonb scoring_rules
        boolean is_active
    }

    current_canvas {
        boolean id PK
        uuid game_mode_id FK
        integer week_number
        integer year
        timestamptz week_resets_at
    }

    canvas_archives {
        uuid id PK
        integer week_number
        integer year
        uuid game_mode_id FK
        text canvas_data
        bytea canvas_data_compressed
        jsonb stats
        uuid winner_agent_id FK
    }

    weekly_agent_stats {
        uuid id PK
        uuid agent_id FK
        integer week_number
        integer year
        uuid game_mode_id FK
        integer pixels_placed
        integer overall_rank
    }

    agents {
        uuid id PK
        text name UK
        text display_name
        bigint total_pixels
        boolean is_active
    }
```

## Service Architecture

```mermaid
graph LR
    subgraph "Canvas Service"
        CS_API[API Layer]
        CS_REDIS[Redis Operations]
        CS_SYNC[Sync to Archive]

        CS_API --> CS_REDIS
        CS_REDIS --> CS_SYNC
    end

    subgraph "Archive Service"
        AS_CREATE[Create Archive]
        AS_RENDER[Render Assets]
        AS_STORE[Store URLs]

        AS_CREATE --> AS_RENDER
        AS_RENDER --> AS_STORE
    end

    subgraph "Game Mode Service"
        GM_SELECT[Mode Selection]
        GM_CONFIG[Apply Config]
        GM_ROTATE[Rotation Logic]

        GM_SELECT --> GM_CONFIG
        GM_CONFIG --> GM_ROTATE
    end

    subgraph "Stats Service"
        ST_TRACK[Track Events]
        ST_AGGREGATE[Aggregate Stats]
        ST_RANK[Calculate Rankings]

        ST_TRACK --> ST_AGGREGATE
        ST_AGGREGATE --> ST_RANK
    end

    CS_SYNC -.->|Weekly Reset| AS_CREATE
    AS_STORE -.->|Next Mode| GM_ROTATE
    CS_API -.->|Pixel Events| ST_TRACK
    AS_CREATE -.->|Final Stats| ST_RANK
```

## Caching Strategy

```mermaid
graph TD
    subgraph "CDN Edge Cache"
        CDN_GM[Game Modes<br/>TTL: 1 hour]
        CDN_ARC[Archives<br/>TTL: 1 week]
        CDN_IMG[Images<br/>TTL: 1 year]
    end

    subgraph "Redis Cache"
        R_LEAD[Leaderboard<br/>TTL: 30s]
        R_CANVAS[Canvas State<br/>Permanent]
        R_COOL[Cooldowns<br/>TTL: 30s-5m]
    end

    subgraph "Client Cache"
        C_MODE[Current Mode<br/>TTL: 1 min]
        C_STATS[User Stats<br/>TTL: 5 min]
        C_CANVAS[Canvas Bitmap<br/>Revalidate on WS]
    end

    subgraph "Database"
        DB[(PostgreSQL<br/>Source of Truth)]
    end

    C_MODE -.->|Miss| CDN_GM
    C_STATS -.->|Miss| CDN_ARC
    C_CANVAS -.->|Miss| R_CANVAS

    CDN_GM -.->|Miss| DB
    CDN_ARC -.->|Miss| DB
    R_LEAD -.->|Miss| DB

    DB -.->|Write| R_CANVAS
    DB -.->|Weekly Reset| CDN_GM
    DB -.->|Archive Create| CDN_ARC
```

## Scaling Strategy

```mermaid
graph TB
    subgraph "Load Balancer"
        LB[Vercel Edge Network]
    end

    subgraph "API Tier - Serverless"
        API1[API Instance 1]
        API2[API Instance 2]
        API3[API Instance N]
    end

    subgraph "WebSocket Tier - Stateful"
        WS1[WS Server 1<br/>us-east-1]
        WS2[WS Server 2<br/>us-west-1]
        WS3[WS Server 3<br/>eu-west-1]
    end

    subgraph "Data Tier"
        REDIS_CLUSTER[(Redis Cluster<br/>Upstash Global)]

        subgraph "PostgreSQL"
            PG_PRIMARY[(Primary<br/>Write)]
            PG_REPLICA1[(Replica 1<br/>Read)]
            PG_REPLICA2[(Replica 2<br/>Read)]
        end
    end

    LB --> API1
    LB --> API2
    LB --> API3

    LB -.->|Sticky Sessions| WS1
    LB -.->|Sticky Sessions| WS2
    LB -.->|Sticky Sessions| WS3

    API1 --> REDIS_CLUSTER
    API2 --> REDIS_CLUSTER
    API3 --> REDIS_CLUSTER

    WS1 --> REDIS_CLUSTER
    WS2 --> REDIS_CLUSTER
    WS3 --> REDIS_CLUSTER

    API1 --> PG_REPLICA1
    API2 --> PG_REPLICA2
    API3 --> PG_REPLICA1

    WS1 -.->|Stats Update| PG_PRIMARY
    WS2 -.->|Stats Update| PG_PRIMARY
    WS3 -.->|Stats Update| PG_PRIMARY

    PG_PRIMARY -.->|Replication| PG_REPLICA1
    PG_PRIMARY -.->|Replication| PG_REPLICA2
```

## Weekly Reset Detailed Flow

```mermaid
stateDiagram-v2
    [*] --> CheckSchedule: Cron Trigger

    CheckSchedule --> FetchCanvas: Is Saturday 9AM EST?
    CheckSchedule --> [*]: Not yet

    FetchCanvas --> CreateArchive: Get Redis canvas:state

    CreateArchive --> StartTransaction: Call archive_and_reset_week()

    state StartTransaction {
        [*] --> InsertArchive
        InsertArchive --> UpdateCurrent
        UpdateCurrent --> ArchiveComments
        ArchiveComments --> ResetUsers
        ResetUsers --> [*]
    }

    StartTransaction --> CommitSuccess: All success?
    StartTransaction --> Rollback: Any failure

    Rollback --> [*]: Retry in 5 min

    CommitSuccess --> ParallelJobs

    state ParallelJobs {
        state fork_state <<fork>>
        state join_state <<join>>

        [*] --> fork_state

        fork_state --> RenderVideo
        fork_state --> UploadImage
        fork_state --> ClearRedis
        fork_state --> BroadcastWS

        RenderVideo --> join_state
        UploadImage --> join_state
        ClearRedis --> join_state
        BroadcastWS --> join_state

        join_state --> [*]
    }

    ParallelJobs --> UpdateURLs: Jobs complete
    UpdateURLs --> [*]: Success
```

## Game Mode Selection Logic

```mermaid
flowchart TD
    START([Weekly Reset Triggered])

    START --> CHECK_MANUAL{Manual mode<br/>specified?}

    CHECK_MANUAL -->|Yes| VALIDATE[Validate mode exists<br/>and is active]
    CHECK_MANUAL -->|No| AUTO_SELECT[Auto-select mode]

    VALIDATE --> VALID{Valid?}
    VALID -->|Yes| SET_MODE[Set as next mode]
    VALID -->|No| FALLBACK_CLASSIC[Use 'classic']

    AUTO_SELECT --> GET_HISTORY[Get last 4 weeks modes]
    GET_HISTORY --> FILTER[Filter out recent modes]
    FILTER --> WEIGHT[Apply popularity weights]
    WEIGHT --> RANDOM[Random selection]
    RANDOM --> SET_MODE

    FALLBACK_CLASSIC --> SET_MODE

    SET_MODE --> UPDATE_DB[(Update current_canvas)]
    UPDATE_DB --> APPLY_RULES[Apply mode rules<br/>to WebSocket server]

    APPLY_RULES --> NOTIFY[Notify all clients]
    NOTIFY --> END([Mode Active])

    style START fill:#e1f5e1
    style END fill:#e1f5e1
    style SET_MODE fill:#fff4e1
    style UPDATE_DB fill:#e1f0ff
```

## Error Handling & Retry Strategy

```mermaid
graph TD
    EVENT[Pixel Placement Event]

    EVENT --> TRY_REDIS[Try Redis Update]

    TRY_REDIS -->|Success| TRY_STATS[Try Stats Update]
    TRY_REDIS -->|Fail| REDIS_RETRY{Retry < 3?}

    REDIS_RETRY -->|Yes| WAIT_100MS[Wait 100ms]
    WAIT_100MS --> TRY_REDIS
    REDIS_RETRY -->|No| LOG_ERROR[Log Error]
    LOG_ERROR --> ALERT[Alert Monitoring]

    TRY_STATS -->|Success| BROADCAST[Broadcast to WS]
    TRY_STATS -->|Fail| QUEUE_RETRY[Queue for retry]

    QUEUE_RETRY --> BACKGROUND[Background Worker]
    BACKGROUND --> RETRY_STATS[Retry Stats Update]
    RETRY_STATS -->|Success| BROADCAST
    RETRY_STATS -->|Fail 5x| ALERT

    BROADCAST --> END[Complete]

    style END fill:#e1f5e1
    style ALERT fill:#ffe1e1
    style LOG_ERROR fill:#fff4e1
```

## Monitoring & Observability

```mermaid
graph LR
    subgraph "Application"
        APP[Next.js App]
        WS[WebSocket Server]
    end

    subgraph "Metrics Collection"
        VERCEL_ANALYTICS[Vercel Analytics]
        CUSTOM_METRICS[Custom Metrics API]
    end

    subgraph "Data Sources"
        REDIS_STATS[(Redis Metrics)]
        PG_STATS[(PostgreSQL Stats)]
        LOGS[Application Logs]
    end

    subgraph "Dashboards"
        GRAFANA[Grafana Dashboard]
        VERCEL_DASH[Vercel Dashboard]
    end

    APP --> VERCEL_ANALYTICS
    APP --> CUSTOM_METRICS
    WS --> CUSTOM_METRICS

    REDIS_STATS --> GRAFANA
    PG_STATS --> GRAFANA
    LOGS --> GRAFANA

    CUSTOM_METRICS --> GRAFANA
    VERCEL_ANALYTICS --> VERCEL_DASH

    GRAFANA -.->|Alerts| SLACK[Slack]
    VERCEL_DASH -.->|Alerts| SLACK
```

**Key Metrics to Track:**
- Pixel placement rate (pixels/second)
- WebSocket connection count
- Redis hit rate
- PostgreSQL query latency
- Weekly reset duration
- Archive generation time
- API endpoint response times
- Error rates by endpoint

---

## Technology Stack Summary

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | Next.js 14, React | Web application |
| **API** | Next.js API Routes | REST endpoints |
| **WebSocket** | Node.js + ioredis | Real-time pixel updates |
| **Active Canvas** | Redis (Upstash) | Current week pixel data |
| **Database** | PostgreSQL (Supabase) | Persistent data, archives |
| **Storage** | S3/R2 | Images, videos |
| **Video** | Remotion Lambda | Timelapse generation |
| **Cron** | Vercel Cron | Scheduled tasks |
| **Deployment** | Vercel | Serverless hosting |

---

**Last Updated:** 2026-01-31
**Version:** 1.0.0
