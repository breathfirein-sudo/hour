# Investhour Device & Gadget E-Commerce Exchange
## Comprehensive Architectural & UI/UX Implementation Plan

---

### Executive Summary

This implementation plan details the addition of a full-fledged **Device & Gadget E-Commerce Exchange** into the Investhour platform, complete with **SuperAdmin Order & Return Management**, **Full Address Collection**, and **Zero-Spread Price Parity with 10-Year Return Protection**:

1. **Identical Purchase & Sell-Back Base Price**: A user can purchase a product and later sell/return it to Investhour at the **exact same base cost** ($P_{return} = P_{base}$).
2. **10-Year Warranty & Parity Return Guarantee (+₹2,000)**: Users can opt for an extended 10-year protection guarantee for a flat ₹2,000 fee.
3. **Strict Physical Integrity Clause**: Returns at 100% price parity are strictly conditional on the device being in working, undamaged condition. **Any external physical damage (cracks, heavy dents, screen breaks) or internal physical/water damage voids the return parity guarantee**.
4. **Complete Customer Delivery / Pickup Address Capture**:
   - Every Buy and Sell request collects full address details (Full Name, Primary Mobile, Alternate Contact, House/Flat No, Street/Area, Landmark, City, State, PIN code, and Delivery/Pickup Instructions).
5. **Dedicated SuperAdmin Management Tab (`📱 Mobile & Device Requests`)**:
   - Live badge counter of pending requests.
   - Comprehensive real-time table of all incoming **BUY** and **SELL / RETURN** orders.
   - Full customer address inspection, courier tracking dispatch controls, and physical damage inspection verification checklist with one-click 100% wallet buyback payout approval.

---

### 1. Symbolic System Architecture

```mermaid
flowchart TD
    subgraph ClientStoreFront["Customer Storefront (React)"]
        Nav["Navbar: 'Device Exchange' Tab"]
        CondSelect["Condition Switcher: Brand New vs Refurbished"]
        BrandGrid["Brand Grid (Apple, Samsung, etc.)"]
        ModelSearch["Model Search & Filter Engine"]
        VariantConfig["Variant Configurator (RAM / ROM / Color)"]
        PriceCard["Live Benchmark vs Investhour Parity Price"]
        WarrantyToggle["10-Year Return Warranty Toggle (+₹2,000)"]
        AddressModal["Address & Contact Details Capture Drawer"]
        OrderSubmit["Submit Buy / Return Request"]
    end

    subgraph AdminControl["SuperAdmin Command Center"]
        AdminNav["Admin Tab: 📱 Mobile & Device Requests"]
        OrderList["Incoming Requests Queue (Buy vs Sell-Back)"]
        AddressViewer["Full Address & Contact Inspector"]
        DispatchEngine["Buy Order Dispatch (Carrier & Tracking ID)"]
        InspectionPortal["Return QA & Damage Verification Checklist"]
        PayoutApproval["Approve 100% Base Cost Wallet Credit"]
    end

    subgraph BackendAPI["Backend API & Services"]
        RouteDevices["/api/devices/catalog, /api/devices/models"]
        RouteOrders["/api/devices/order/buy, /api/devices/order/return-request"]
        RouteAdmin["/api/admin/devices/requests, /api/admin/devices/dispatch, /api/admin/devices/verify-return"]
        BrokerEngine["Broker Commission Attribution Service"]
        WalletEngine["Wallet Ledger Service (Debit Buy / Credit Return)"]
    end

    subgraph Database["PostgreSQL (Prisma ORM)"]
        DBProducts["Product & Variant Tables"]
        DBOrders["DeviceOrder & ShippingAddress Tables"]
        DBWarranty["DeviceWarranty & Parity Protection"]
        DBInspection["DamageInspectionLogs"]
        DBWallet["Wallet & Transaction Tables"]
    end

    Nav --> CondSelect --> BrandGrid --> ModelSearch --> VariantConfig --> PriceCard --> WarrantyToggle --> AddressModal --> OrderSubmit
    OrderSubmit --> RouteOrders
    RouteOrders --> DBOrders
    RouteOrders --> WalletEngine
    RouteOrders --> BrokerEngine

    AdminNav --> OrderList
    OrderList --> AddressViewer
    OrderList --> DispatchEngine
    OrderList --> InspectionPortal --> PayoutApproval
    DispatchEngine --> RouteAdmin
    PayoutApproval --> RouteAdmin
    RouteAdmin --> WalletEngine
    RouteAdmin --> DBInspection
```

---

### 2. Complete End-to-End User & Admin State Machine

```mermaid
stateDiagram-v2
    [*] --> CustomerBrowsing: User clicks "Device Exchange"
    CustomerBrowsing --> SelectModel: Select Condition -> Brand -> Model -> RAM/ROM
    SelectModel --> ConfigureCheckout: Toggle 10-Yr Warranty (+₹2,000) & View Price Parity
    ConfigureCheckout --> InputAddress: Enter Full Delivery / Pickup Address
    InputAddress --> ExecuteOrder: Confirm Order (Buy or Sell-Back)
    
    state ExecuteOrder {
        BuyFlow: Wallet Debited (P_base + ₹2,000) -> Status: PENDING_DISPATCH
        SellFlow: Return Claim Submitted -> Status: PENDING_INSPECTION
    }
    
    ExecuteOrder --> SuperAdminNotification: Request Appears in SuperAdmin '📱 Mobile & Device Requests'
    
    state SuperAdminNotification {
        AdminReview: Admin inspects Device, Specs, Financials & Complete Address
        state AdminReview {
            DispatchAction: BUY ORDER -> Input Courier & Tracking ID -> Mark Dispatched
            InspectionAction: SELL-BACK -> Schedule Pickup -> Physical Damage QA Check
        }
    }
    
    DispatchAction --> CustomerDelivered: Buy Order Delivered -> Active 10-Year Warranty
    
    InspectionAction --> InspectionDecision
    state InspectionDecision {
        DamageFree: Screen & Body Intact, No Liquid Damage -> QA Approved
        DamageFound: Cracks, Dents, or Internal Board Damage -> QA Rejected
    }
    
    DamageFree --> WalletRefundSettled: 100% of Base Purchase Price Credited to User Wallet
    DamageFound --> ReturnVoidedNotice: Return Voided Under Damage Exclusion Clause
```

---

### 3. Detailed Buy & Sell Transaction Sequences

#### 3.1. Buy Order & Dispatch Flow with Complete Address Capture
```mermaid
sequenceDiagram
    autonumber
    actor Customer
    participant UI as Customer Storefront
    participant API as Backend API
    participant Wallet as Wallet Engine
    participant Broker as Broker Service
    participant DB as PostgreSQL
    actor Admin as SuperAdmin

    Customer->>UI: Selects Model, RAM/ROM, Color & Opts for 10-Yr Warranty (+₹2,000)
    Customer->>UI: Fills Complete Address (Name, Phone, House/Street, City, PIN, Landmark)
    Customer->>UI: Clicks "Authorize Purchase via Wallet"
    UI->>API: POST /api/devices/order/buy { variantId, includeWarranty: true, address }
    API->>Wallet: Verify and debit wallet (P_base + ₹2,000)
    API->>DB: Create DeviceOrder (status: 'PENDING_DISPATCH') & ShippingAddress
    API->>Broker: Credit referral commission to assigned broker
    API-->>UI: Order Placed! Vault Certificate & Order ID generated
    Note over Admin, API: Live notification appears in SuperAdmin '📱 Mobile & Device Requests'
    Admin->>API: GET /api/admin/devices/requests?status=PENDING_DISPATCH
    Admin->>Admin: Reviews order, device specs, and full customer delivery address
    Admin->>API: POST /api/admin/devices/dispatch { orderId, courierName, trackingNumber }
    API->>DB: Update status to 'DISPATCHED'
    API-->>Customer: Order Dispatched with Tracking Details
```

#### 3.2. Sell-Back / Return Flow & SuperAdmin Damage Inspection
```mermaid
sequenceDiagram
    autonumber
    actor Customer
    participant UI as Customer Storefront
    participant API as Backend API
    participant DB as PostgreSQL
    actor Admin as SuperAdmin
    participant Wallet as Wallet Engine

    Customer->>UI: In Portfolio, clicks "Sell Back to Investhour (100% Price Parity)"
    UI->>Customer: Displays Damage Exclusion Warning (Cracks/Dents/Liquid void return)
    Customer->>UI: Confirms Pickup Address, IMEI, and Condition Self-Declaration
    UI->>API: POST /api/devices/order/return-request { orderId, pickupAddress, imei, declaration }
    API->>DB: Update order status to 'PENDING_INSPECTION'
    Note over Admin, API: Alert appears on SuperAdmin '📱 Mobile & Device Requests' button
    Admin->>API: GET /api/admin/devices/requests?type=RETURN
    Admin->>Admin: Schedules pickup & receives device at Investhour QA lab
    Admin->>Admin: Performs 4-point damage inspection: Screen, Chassis, Liquid Sensor, Diagnostics
    alt Device is Undamaged (Pass)
        Admin->>API: POST /api/admin/devices/verify-return { orderId, passed: true }
        API->>Wallet: Credit 100% of Base Purchase Price (P_base) to Customer Wallet
        API->>DB: Update status to 'RETURNED_AND_REFUNDED'
        API-->>Customer: Notification: 100% Purchase Price Credited to Investhour Wallet!
    else Device has External or Internal Damage (Fail)
        Admin->>API: POST /api/admin/devices/verify-return { orderId, passed: false, rejectionReason }
        API->>DB: Update status to 'RETURN_REJECTED'
        API-->>Customer: Notification: Return rejected due to physical damage (Device returned)
    end
```

---

### 4. Complete Address & Contact Information Schema

Every Buy or Sell request captures the complete delivery/pickup details:

```json
{
  "shippingAddress": {
    "fullName": "Shiva Prasad",
    "primaryPhone": "9949215690",
    "alternatePhone": "9010672087",
    "email": "kshivaprasad33987@gmail.com",
    "houseNumber": "Plot 42, Flat 301, Sri Sai Residency",
    "street": "Road No. 12, Jubilee Hills",
    "landmark": "Near Apollo Hospital",
    "city": "Hyderabad",
    "state": "Telangana",
    "pinCode": "500033",
    "country": "India",
    "addressType": "Home",
    "deliveryInstructions": "Please call before arrival. Deliver between 10 AM - 6 PM."
  }
}
```

---

### 5. SuperAdmin Panel: "📱 Mobile & Device Requests" Specifications

#### 5.1. Navigation Button & Badge
- **Placement**: Directly in the SuperAdmin tab bar alongside *Client Watchlist*, *Broker Requests*, *Contest Leaderboard*, *Referral Program*, *Withdrawals*, and *Deposits*.
- **Style**:
  ```jsx
  <button
    type="button"
    onClick={() => setAdminTab('devices')}
    style={{
      background: adminTab === 'devices' ? '#f43f5e' : 'transparent',
      borderColor: adminTab === 'devices' ? '#f43f5e' : 'rgba(255,255,255,0.15)',
      ...
    }}
  >
    📱 Mobile & Device Requests
    {devicePendingCount > 0 && (
      <span className="badge-pending">{devicePendingCount}</span>
    )}
  </button>
  ```

#### 5.2. Admin Management Dashboard Layout

````carousel
```markdown
### View 1: Top Metrics & Real-Time Counters
- 📦 Total Orders Processed
- 🚚 Pending Dispatches (New Buys)
- 🔍 Pending Inspections (Sell-Back Returns)
- 🛡️ Total 10-Year Protected Devices
- 💰 Total Parity Buyback Volume Disbursed
```
<!-- slide -->
```markdown
### View 2: Filterable Orders Queue
- Filter Tabs: `All Requests` | `Buy Orders (Dispatch)` | `Sell-Back (Returns)` | `Completed / Closed`
- Search Bar: Search by Customer ID, Customer Name, Mobile Number, City, or Order ID
- Column Layout:
  1. Date & Time
  2. Order ID & Type Badge ([BUY] in Green, [SELL-BACK] in Amber)
  3. Customer Info: Name, Customer ID (e.g. CUST-84 / CUST-B-83), Phone, Email
  4. Device Details: Brand, Model, Condition (New/Refurbished), RAM/ROM, Color
  5. Financials: Base Price (₹), 10-Yr Warranty (₹2,000 / None), Total Paid
  6. Address & Contact: One-click "View Full Address" modal
  7. Status & Actions
```
<!-- slide -->
```markdown
### View 3: Expandable Address & Dispatch Drawer
- Full Address Breakdown:
  - Recipient: Full Name & Mobile Number
  - Destination: House/Flat, Street, Landmark, City, State, PIN
  - Instructions: Notes provided by the user
- Action Controls:
  - Input: Courier / Delivery Partner Name (e.g. BlueDart, DTDC, Investhour Logistics)
  - Input: Tracking ID / AWB Number
  - Button: "Confirm Dispatch & Notify Customer"
```
<!-- slide -->
```markdown
### View 4: QA Return Damage Verification Checklist
- Interactive Checklist:
  - [ ] External Chassis: Free of deep dents, edge impacts, or frame bends
  - [ ] Screen & Glass: 100% free of hairline/deep cracks or touch issues
  - [ ] Liquid Ingress: Internal Liquid Contact Indicators (LCI) white & untripped
  - [ ] Hardware Diagnostics: Motherboard, Cameras, WiFi, Biometrics fully functional
- Decision Buttons:
  - Green CTA: "Approve Return & Credit 100% Base Price to Wallet (₹P_base)"
  - Red CTA: "Reject Return (Physical Damage Found)" + Reason textarea
```
````

---

### 6. Database Entity Relationship Model (Updated)

```mermaid
erDiagram
    User ||--o{ DeviceOrder : places
    User ||--o{ WalletTransaction : transacts
    Brand ||--o{ ProductModel : manufactures
    ProductModel ||--o{ ProductVariant : offers
    ProductVariant ||--o{ DeviceOrder : ordered_as
    DeviceOrder ||--|| ShippingAddress : delivers_to
    DeviceOrder ||--o| DeviceWarranty : protects
    DeviceOrder ||--o| DeviceReturnRequest : initiates
    DeviceReturnRequest ||--o| DamageInspectionLog : audited_by

    ShippingAddress {
        string id PK
        string orderId FK
        string fullName
        string primaryPhone
        string alternatePhone
        string houseNumber
        string street
        string landmark
        string city
        string state
        string pinCode
        string addressType
        text deliveryInstructions
    }

    DeviceOrder {
        string id PK
        int userId FK
        int variantId FK
        string orderType "BUY or SELL_RETURN"
        decimal basePrice
        decimal warrantyFee
        decimal totalAmount
        boolean hasWarranty
        string courierName
        string trackingNumber
        string status "PENDING_DISPATCH, DISPATCHED, DELIVERED, PENDING_INSPECTION, RETURN_APPROVED, RETURN_REJECTED"
        datetime createdAt
        datetime updatedAt
    }

    DamageInspectionLog {
        string id PK
        string returnRequestId FK
        boolean screenCrackFree
        boolean chassisDamageFree
        boolean liquidDamageFree
        boolean diagnosticsPassed
        text inspectionNotes
        string inspectorEmail
        datetime inspectedAt
    }
```

---

### 7. Step-by-Step Implementation Roadmap

```mermaid
flowchart TD
    Phase1["Phase 1: Database Migration<br/>- Add Brand, ProductModel, ProductVariant, DeviceOrder, ShippingAddress, DamageInspectionLog"]
    Phase2["Phase 2: Backend API Endpoints<br/>- Customer Buy/Sell routes with complete address persistence<br/>- SuperAdmin request fetch, dispatch tracking, and return approval routes"]
    Phase3["Phase 3: Customer Storefront UI & Address Drawer<br/>- Nav button, condition selector, brand logo grid, variant configurator<br/>- 10-Yr warranty toggle (+₹2,000) & comprehensive address form"]
    Phase4["Phase 4: SuperAdmin '📱 Mobile & Device Requests' Panel<br/>- Tab button with pending counter badge<br/>- Data table of all orders with address drawer, dispatch inputs, and damage QA checklist"]
    Phase5["Phase 5: Wallet Integration & Broker Commission Attribution<br/>- Real-time balance debit on Buy, instant 100% price credit on return approval<br/>- Broker commission attribution via brokerCommissionService"]
    Phase6["Phase 6: End-to-End Testing & Zero Data Loss Verification<br/>- Quota-compliant storage, verified API responses, production build"]

    Phase1 --> Phase2
    Phase2 --> Phase3
    Phase3 --> Phase4
    Phase4 --> Phase5
    Phase5 --> Phase6
```

---

### 8. Architectural & Legal Guardrails

> [!IMPORTANT]
> **Complete Address Requirement**: Neither a Buy nor a Sell request can be finalized without a validated 6-digit Indian PIN code and 10-digit primary phone number, guaranteeing seamless logistics.

> [!WARNING]
> **Damage Return Exclusion Enforcement**:
> In the SuperAdmin QA panel, the "Approve 100% Refund" button is disabled until the inspector verifies all four physical integrity checkboxes (Screen, Chassis, Liquid, Diagnostics), ensuring no damaged devices are settled at full parity.
