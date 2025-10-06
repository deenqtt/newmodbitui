# Layout2D Canvas Feature - Migration Guide

## 📋 Overview

Layout2D Canvas adalah fitur visualisasi 2D interaktif untuk memantau data IoT secara real-time. Fitur ini menyediakan:

- **Canvas Interaktif**: Menggunakan HTML5 Canvas dengan background image support
- **Data Points**: Penunjuk data real-time dari sensor MQTT
- **Flow Indicators**: Indikator aliran dengan logika kondisional dan animasi
- **Manage Mode**: Mode editing dengan drag-and-drop
- **Real-time Updates**: Integrasi MQTT untuk data live
- **Modals Konfigurasi**: UI untuk mengatur data points dan flow indicators

## 📁 Files Related to Layout2D Canvas

Berikut adalah semua file yang terkait dengan fitur Layout2D Canvas beserta lokasi penyimpanan di project baru:

### 🎨 **Core Components** (`[project]/components/layout2d/`)

1. **`components/layout2d/Layout2DCanvas.tsx`** → **`[project]/components/layout2d/Layout2DCanvas.tsx`**

   - **Fungsi**: Komponen utama canvas interaktif
   - **Dependencies**:
     - React Hooks (useState, useEffect, useCallback, useRef)
     - @/contexts/MqttContext untuk MQTT
     - Lucide React icons
     - Shadcn/UI components (Card, Button, Tooltip, AlertDialog)

2. **`components/layout2d/DataPointConfigModal.tsx`** → **`[project]/components/layout2d/DataPointConfigModal.tsx`**

   - **Fungsi**: Form untuk menambah/edit data points
   - **Dependencies**:
     - React Hook Form (@hookform/resolvers, react-hook-form)
     - Zod validation
     - Shadcn/UI components

3. **`components/layout2d/FlowIndicatorConfigModal.tsx`** → **`[project]/components/layout2d/FlowIndicatorConfigModal.tsx`**

   - **Fungsi**: Form untuk menambah/edit flow indicators dengan logika kompleks
   - **Dependencies**:
     - React Hook Form
     - Zod validation
     - Shadcn/UI components

4. **`components/layout2d/IconPicker.tsx`** → **`[project]/components/layout2d/IconPicker.tsx`**

   - **Fungsi**: Dropdown untuk memilih icon dari Lucide React
   - **Dependencies**: Lucide React icons

5. **`components/layout2d/Layout2DList.tsx`** → **`[project]/components/layout2d/Layout2DList.tsx`**

   - **Fungsi**: Daftar layout 2D dengan create/edit/delete
   - **Dependencies**: Shadcn/UI components

6. **`components/layout2d/DeviceDetailModal.tsx`** → **`[project]/components/layout2d/DeviceDetailModal.tsx`**
   - **Fungsi**: Menampilkan informasi detail device dari data point
   - **Dependencies**: Shadcn/UI components

### 🌐 **API Routes** (`[project]/app/api/layout2d/`)

7. **`app/api/layout2d/route.ts`** → **`[project]/app/api/layout2d/route.ts`**

   - **Endpoint**: `/api/layout2d`
   - **Methods**: GET, POST
   - **Functions**:
     - GET: List semua layouts
     - POST: Create layout baru

8. **`app/api/layout2d/[id]/route.ts`** → **`[project]/app/api/layout2d/[id]/route.ts`**

   - **Endpoint**: `/api/layout2d/[id]`
   - **Methods**: GET, PUT, DELETE
   - **Functions**:
     - GET: Detail layout
     - PUT: Update layout
     - DELETE: Delete layout

9. **`app/api/layout2d/active/route.ts`** → **`[project]/app/api/layout2d/active/route.ts`**

   - **Endpoint**: `/api/layout2d/active`
   - **Methods**: GET, POST
   - **Functions**:
     - GET: Get active layout
     - POST: Set active layout

10. **`app/api/layout2d/[id]/datapoints/route.ts`** → **`[project]/app/api/layout2d/[id]/datapoints/route.ts`**

    - **Endpoint**: `/api/layout2d/[id]/datapoints`
    - **Methods**: GET, POST
    - **Functions**:
      - GET: List data points di layout
      - POST: Create data point baru

11. **`app/api/layout2d/[id]/datapoints/[datapointId]/route.ts`** → **`[project]/app/api/layout2d/[id]/datapoints/[datapointId]/route.ts`**

    - **Endpoint**: `/api/layout2d/[id]/datapoints/[datapointId]`
    - **Methods**: PUT, DELETE
    - **Functions**:
      - PUT: Update data point
      - DELETE: Delete data point

12. **`app/api/layout2d/[id]/flowindicators/route.ts`** → **`[project]/app/api/layout2d/[id]/flowindicators/route.ts`**

    - **Endpoint**: `/api/layout2d/[id]/flowindicators`
    - **Methods**: GET, POST
    - **Functions**:
      - GET: List flow indicators di layout
      - POST: Create flow indicator baru

13. **`app/api/layout2d/[id]/flowindicators/[indicatorId]/route.ts`** → **`[project]/app/api/layout2d/[id]/flowindicators/[indicatorId]/route.ts`**

    - **Endpoint**: `/api/layout2d/[id]/flowindicators/[indicatorId]`
    - **Methods**: PUT, DELETE
    - **Functions**:
      - PUT: Update flow indicator
      - DELETE: Delete flow indicator

14. **`app/api/layout2d/[id]/flowindicators/[indicatorId]/copy/route.ts`** → **`[project]/app/api/layout2d/[id]/flowindicators/[indicatorId]/copy/route.ts`**
    - **Endpoint**: `/api/layout2d/[id]/flowindicators/[indicatorId]/copy`
    - **Methods**: POST
    - **Functions**: Create copy dari existing flow indicator

### 🗄️ **Database Models** (`[project]/prisma/schema.prisma`)

15. **`Model Layout2D`** → **`[project]/prisma/schema.prisma`** (tambahkan dalam file schema)

    ```prisma
    model Layout2D {
      id             String                  @id @default(cuid())
      name           String                  @unique
      isUse          Boolean                 @default(false)
      image          String?
      createdAt      DateTime                @default(now())
      updatedAt      DateTime                @updatedAt
      dataPoints     Layout2DDataPoint[]
      flowIndicators Layout2DFlowIndicator[]
    }
    ```

16. **`Model Layout2DDataPoint`** → **`[project]/prisma/schema.prisma`** (tambahkan dalam file schema)

    ```prisma
    model Layout2DDataPoint {
      id            String   @id @default(cuid())
      layoutId      String
      deviceUniqId  String
      // Legacy single-key format (for backward compatibility)
      selectedKey   String?
      // New multi-key format
      selectedKeys  String? // JSON string containing array of KeyConfig
      units         String?
      multiply      Float?   @default(1)
      customName    String
      positionX     Float
      positionY     Float
      fontSize      Int?     @default(14)
      color         String?  @default("#000000")
      iconName      String?
      iconColor     String?  @default("#666666")
      showIcon      Boolean? @default(false)
      displayLayout String?  @default("vertical") // "vertical", "horizontal", "grid"
      createdAt     DateTime @default(now())
      updatedAt     DateTime @updatedAt

      layout Layout2D       @relation(fields: [layoutId], references: [id], onDelete: Cascade)
      device DeviceExternal @relation(fields: [deviceUniqId], references: [uniqId])

      // Update unique constraint to allow multiple keys per device
      @@unique([layoutId, deviceUniqId, customName])
    }
    ```

17. **`Model Layout2DFlowIndicator`** → **`[project]/prisma/schema.prisma`** (tambahkan dalam file schema)

    ```prisma
    model Layout2DFlowIndicator {
      id             String @id @default(cuid())
      layoutId       String
      deviceUniqId   String
      selectedKey    String
      customName     String
      positionX      Float
      positionY      Float
      arrowDirection String @default("right") // "right", "left", "up", "down"

      // Logic conditions (Legacy - kept for backward compatibility)
      logicOperator String // ">", "<", ">=", "<=", "==", "!="
      compareValue  String // Value to compare (supports number, string, boolean)
      valueType     String @default("number") // "number", "string", "boolean"

      // Visual states based on condition result (Legacy)
      // When condition is TRUE
      trueColor     String  @default("#22c55e") // green
      trueAnimation Boolean @default(true)

      // When condition is FALSE
      falseColor     String  @default("#ef4444") // red
      falseAnimation Boolean @default(false)

      // Warning state (optional for range conditions) (Legacy)
      warningColor     String  @default("#f59e0b") // orange
      warningAnimation Boolean @default(true)
      warningEnabled   Boolean @default(false)
      warningOperator  String? // Secondary condition for warning
      warningValue     String?

      // NEW: Flexible Multi-Logic Configuration (JSON format)
      // This allows unlimited conditions and states
      multiLogicConfig String? // JSON: { conditions: [...], states: [...]}
      useMultiLogic    Boolean @default(false) // Switch between legacy and new system

      createdAt DateTime @default(now())
      updatedAt DateTime @updatedAt

      // Relations
      layout Layout2D       @relation(fields: [layoutId], references: [id], onDelete: Cascade)
      device DeviceExternal @relation(fields: [deviceUniqId], references: [uniqId])

      @@unique([layoutId, deviceUniqId, selectedKey, positionX, positionY])
    }
    ```

### 📱 **Pages**

18. **`app/(dashboard)/layout2d/page.tsx`** → **`[project]/app/(dashboard)/layout2d/page.tsx`**

    - **Fungsi**: Dashboard dengan tabs untuk view dan manage
    - **Dependencies**:
      - Dynamic imports untuk Layout2DCanvas dan Layout2DList
      - React Router navigation

19. **`app/monitoring/layout-2d/page.tsx`** → **`[project]/app/monitoring/layout-2d/page.tsx`**
    - **Fungsi**: View-only monitoring page
    - **Dependencies**: Same as above

### 🎭 **Contexts**

20. **`contexts/AuthContext.tsx`** → **`[project]/contexts/AuthContext.tsx`**

    - **Diperlukan untuk**: API authentication
    - **Interface**: User role checking

21. **`contexts/MqttContext.tsx`** → **`[project]/contexts/MqttContext.tsx`**
    - **Diperlukan untuk**: Real-time data updates
    - **Dependencies**: Paho MQTT client

### 🛠️ **Utilities**

22. **`lib/icon-library.ts`** → **`[project]/lib/icon-library.ts`**

    - **Fungsi**: Mapping icon names ke komponen Lucide

23. **`lib/image-utils.ts`** → **`[project]/lib/image-utils.ts`**
    - **Fungsi**: Image processing untuk background canvas

## ⚙️ **Configuration Setup**

### 1. **Environment Variables**

Tambahkan ke `.env.local`:

```env
# MQTT Configuration
NEXT_PUBLIC_MQTT_HOST=localhost
NEXT_PUBLIC_MQTT_PORT=9000

# API Base URL
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000/api

# Image Upload (jika diperlukan)
NEXT_PUBLIC_UPLOAD_PATH=/public/images
```

### 2. **Prisma Database Setup**

```bash
# Generate Prisma client
npx prisma generate

# Push schema ke database
npx prisma db push

# (Opsional) Seed data awal
npx prisma db seed
```

### 3. **Dependencies Package.json**

Tambahkan ke `package.json` dependencies:

```json
{
  "@hookform/resolvers": "^5.2.1",
  "@prisma/client": "^6.14.0",
  "@radix-ui/react-accordion": "^1.2.11",
  "@radix-ui/react-alert-dialog": "^1.1.14",
  "@radix-ui/react-dialog": "^1.1.14",
  "@radix-ui/react-dropdown-menu": "^2.1.15",
  "@radix-ui/react-label": "^2.1.7",
  "@radix-ui/react-popover": "^1.1.15",
  "@radix-ui/react-select": "^2.2.5",
  "@radix-ui/react-separator": "^1.1.7",
  "@radix-ui/react-tabs": "^1.1.12",
  "@radix-ui/react-tooltip": "^1.2.7",
  "@radix-ui/react-scroll-area": "^1.2.9",
  "@radix-ui/react-collapsible": "^1.1.11",
  "axios": "^1.11.0",
  "framer-motion": "^12.23.12",
  "lodash": "^4.17.21",
  "lucide-react": "^0.518.0",
  "moment": "^2.30.1",
  "mqtt": "^5.3.4",
  "paho-mqtt": "^1.1.0",
  "react-hook-form": "^7.62.0",
  "react-use-measure": "^2.1.7",
  "three": "^0.179.1",
  "zod": "^4.0.17"
}
```

### 4. **Context Providers Setup**

Wrap aplikasi dengan providers di `app/layout.tsx`:

```tsx
import { AuthProvider } from "@/contexts/AuthContext";
import { MqttProvider } from "@/contexts/MqttContext";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <MqttProvider>{children}</MqttProvider>
    </AuthProvider>
  );
}
```

### 5. **Router Setup**

Tambahkan routes ke Next.js app router:

```
app/(dashboard)/layout2d/
├── page.tsx          # Main dashboard page
└── layout.tsx        # Layout wrapper (optional)

app/monitoring/layout-2d/
└── page.tsx          # Monitoring-only page
```

## 🚀 **Migration Steps**

### Step 1: Copy Files

```bash
# Copy semua komponen
cp -r components/layout2d/ [new-project]/components/

# Copy API routes
cp -r app/api/layout2d/ [new-project]/app/api/

# Copy contexts (jika belum ada)
cp contexts/AuthContext.tsx [new-project]/contexts/
cp contexts/MqttContext.tsx [new-project]/contexts/

# Copy utilities
cp lib/icon-library.ts [new-project]/lib/
cp lib/image-utils.ts [new-project]/lib/

# Copy prisma models (tambahkan ke schema.prisma)
# Copy model definitions dari file ini
```

### Step 2: Install Dependencies

```bash
npm install [dependencies dari daftar di atas]
```

### Step 3: Update Next.js Configuration

Tambahkan ke `next.config.mjs` jika perlu:

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ["localhost"], // untuk image uploads
  },
  experimental: {
    serverComponentsExternalPackages: ["paho-mqtt"],
  },
};
```

### Step 4: Setup Database

```bash
# Tambahkan models ke schema.prisma
# Jalankan migration
npx prisma generate
npx prisma db push
```

### Step 5: Environment Configuration

```bash
# Copy environment variables
cp .env.local [new-project]/
```

### Step 6: Integration Testing

1. **MQTT Connection**: Pastikan MQTT broker running
2. **Device Data**: Pastikan ada DeviceExternal records
3. **Canvas Rendering**: Test background image loading
4. **Data Points**: Test real-time data updates
5. **Flow Indicators**: Test conditional logic dan animasi

## 🔧 **Key Features Implementation**

### **Canvas Rendering**

- HTML5 Canvas dengan image background
- Responsive sizing berdasarkan container
- Grid fallback jika tidak ada background

### **Data Points**

- Multi-key support (JSON array)
- Real-time MQTT data formatting
- Icon integration dengan Lucide React
- Draggable dalam manage mode

### **Flow Indicators**

- Conditional logic dengan operators (>, <, ==, etc.)
- Multi-logic configuration (JSON)
- Animated arrows berdasarkan state
- Color-coded states (true/warning/false)

### **Manage Mode**

- Drag and drop untuk positioning
- Double-click untuk edit
- Right-click context menu dihapus
- Selection highlighting

### **Real-time Updates**

- MQTT subscription per device topic
- Automatic payload parsing
- State management dengan React hooks

## 🐛 **Troubleshooting**

### Common Issues:

1. **Canvas tidak render background image**

   - Check image URL validity
   - Ensure CORS policy allows image loading
   - Verify NEXT_PUBLIC_UPLOAD_PATH

2. **MQTT data tidak update**

   - Check MqttContext connection status
   - Verify device topics dalam data points
   - Test MQTT broker connectivity

3. **Drag and drop tidak bekerja**

   - Ensure manage mode aktif
   - Check containerRef availability
   - Verify mouse event handlers

4. **API calls fail**
   - Check authentication context
   - Verify API_BASE_URL environment variable
   - Test API endpoints manually

### Debug Mode:

```typescript
// Enable console logging di Layout2DCanvas
const DEBUG_MODE = true;
if (DEBUG_MODE) {
  console.log("Canvas state:", { dataPoints, flowIndicators, dataValues });
}
```

## 📊 **Performance Optimizations**

1. **Image Caching**: CachedImage untuk menghindari reload
2. **MQTT Subscriptions**: Unsubscribe otomatis saat unmount
3. **Canvas Rendering**: Efficient redraw dengan requestAnimationFrame
4. **State Updates**: useCallback untuk expensive computations
5. **Memory Cleanup**: Timeout clearing untuk tooltips

---

**Status**: ✅ **Ready for Migration**  
**Estimated Migration Time**: 2-4 hours  
**Complexity**: Medium-High (many files, complex state management)
