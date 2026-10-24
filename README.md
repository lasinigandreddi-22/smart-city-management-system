# SMART CITY MANAGEMENT SYSTEM
## Full-Stack Civic Administration Platform

[![Django](https://img.shields.io/badge/Backend-Django%206.0%20%7C%20DRF-092e20?style=flat&logo=django)](https://www.djangoproject.com/)
[![React](https://img.shields.io/badge/Frontend-React%2019%20%7C%20Vite-61dafb?style=flat&logo=react)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Styling-Tailwind%20CSS%20v4-38bdf8?style=flat&logo=tailwindcss)](https://tailwindcss.com/)
[![Database](https://img.shields.io/badge/Database-SQLite3%20Persistent-003B57?style=flat&logo=sqlite)](https://www.sqlite.org/)
[![Status](https://img.shields.io/badge/Tests-11%20Passed-emerald?style=flat)](#testing-and-verification)

---

## 1. Project Overview

The **Smart City Management System** is a complete, working full-stack civic administration web platform.

It provides a centralized digital portal connecting municipal citizens, administrative leadership, utility service departments, and traffic officers to manage civic services, lodge complaints, monitor utilities, review real-time traffic advisories, and assess property taxes.

### Five Major Services Implemented:
1. **Water Management**: Check scheduled pipeline maintenance, potable water quality reports, and submit water leakage/pressure requests.
2. **Electricity Management**: Review power outage advisories, scheduled grid overhauls, and lodge streetlight/electrical failure requests.
3. **Traffic Management**: Arterial corridor flow indicators, accident alerts, road closure notices, and citizen traffic hazard reporting.
4. **Complaint Management**: End-to-end grievance lifecycle (`Submitted` → `Assigned` → `In Progress` → `Resolved` → `Closed`) with automated reference generation (`CMP-2026-XXXX`) and an immutable status audit trail.
5. **Property Tax Management**: Municipal property assessment records, calculated balances, simulated sandbox UPI/Net Banking payments, and printable digital tax receipts.

---

## 2. Technology Stack

- **Frontend**: React 19, Vite, Tailwind CSS v4, React Router 7, Lucide React icons
- **Backend**: Python 3.10+, Django 6.0+, Django REST Framework (DRF), `django-cors-headers`
- **Authentication**: Django built-in auth with Token-based API authorization (`rest_framework.authtoken`) and session support
- **Database**: SQLite3 (`backend/db.sqlite3`) with atomic transactions for payment processing

---

## 3. Project Structure

```
smart-city-management-system/
├── backend/
│   ├── manage.py
│   ├── db.sqlite3                      # SQLite persistent database
│   ├── requirements.txt                # Python dependencies
│   ├── build.sh                        # Render backend deployment script
│   ├── .env.example
│   ├── config/                         # Root Django project configuration
│   │   ├── settings.py                 # CORS, DRF, Apps, Auth
│   │   ├── urls.py                     # Root API router
│   │   ├── wsgi.py
│   │   └── asgi.py
│   ├── accounts/                       # Auth, UserProfile, Role enforcement & Notifications
│   │   ├── models.py                   # UserProfile, UserRole, Notification
│   │   ├── permissions.py              # IsAdmin, IsCitizen, IsDepartment, IsTrafficOfficer
│   │   ├── views.py                    # Login, Me, Profile, Citizens, Notifications
│   │   ├── serializers.py
│   │   ├── urls.py
│   │   ├── tests.py                    # Automated test suite (11 tests)
│   │   └── management/commands/
│   │       └── seed_data.py            # Idempotent repeatable demonstration data seed
│   ├── complaints/                     # Grievance lifecycle and audit history
│   │   ├── models.py                   # Complaint, ComplaintStatusHistory
│   │   ├── views.py                    # Scoped list/create, detail, patch, history
│   │   ├── serializers.py
│   │   └── urls.py
│   ├── utilities/                      # Water & Electricity services
│   │   ├── models.py                   # WaterNotice, WaterRequest, ElectricityNotice, ElectricityRequest
│   │   ├── views.py
│   │   ├── serializers.py
│   │   └── urls.py
│   ├── traffic/                        # Traffic corridor monitoring & incidents
│   │   ├── models.py                   # TrafficIncident, TrafficCitizenReport
│   │   ├── views.py
│   │   ├── serializers.py
│   │   └── urls.py
│   ├── property_tax/                   # Property records, tax bills & simulated payments
│   │   ├── models.py                   # Property, PropertyTaxRecord, PaymentRecord
│   │   ├── views.py                    # Properties, tax records, atomic pay, payment history
│   │   ├── serializers.py
│   │   └── urls.py
│   └── dashboard/                      # Aggregated role-specific metrics
│       ├── views.py                    # Citizen, Admin, Department & Traffic aggregations
│       └── urls.py
├── frontend/
│   ├── package.json
│   ├── vite.config.js                  # Tailwind CSS v4 & proxy config
│   ├── .env                            # VITE_API_BASE_URL
│   ├── .env.example
│   ├── public/
│   ├── src/
│   │   ├── main.jsx
│   │   ├── App.jsx                     # Router, role guards & route definitions
│   │   ├── index.css                   # Tailwind CSS & print styles
│   │   ├── context/
│   │   │   └── AuthContext.jsx         # User state, token, role & notifications
│   │   ├── services/
│   │   │   └── api.js                  # Centralized REST client with token injection
│   │   ├── layouts/
│   │   │   └── DashboardLayout.jsx     # Master layout with Navbar & Sidebar
│   │   ├── components/
│   │   │   ├── Navbar.jsx              # Branding, unread count badge & user profile menu
│   │   │   ├── ProfileMenu.jsx         # Reusable profile menu with view & edit modals/tabs
│   │   │   ├── Sidebar.jsx             # Role-aware navigation links
│   │   │   ├── StatCard.jsx            # Reusable metric card
│   │   │   ├── Badge.jsx               # Status, priority & severity badges
│   │   │   ├── Modal.jsx               # Accessible dialog window
│   │   │   └── NotificationDrawer.jsx  # Notification list popover
│   │   └── pages/
│   │       ├── LoginPage.jsx           # Login with 1-click demo role switcher
│   │       ├── citizen/
│   │       │   └── CitizenDashboard.jsx
│   │       ├── services/
│   │       │   ├── WaterManagementPage.jsx
│   │       │   ├── ElectricityManagementPage.jsx
│   │       │   └── TrafficManagementPage.jsx
│   │       ├── complaints/
│   │       │   ├── ComplaintListPage.jsx
│   │       │   ├── SubmitComplaintPage.jsx
│   │       │   └── ComplaintDetailPage.jsx
│   │       ├── property_tax/
│   │       │   ├── PropertyTaxPage.jsx
│   │       │   └── TaxBillDetailPage.jsx
│   │       ├── admin/
│   │       │   ├── AdminDashboard.jsx
│   │       │   ├── CitizenManagementPage.jsx
│   │       │   ├── ComplaintAdminPage.jsx
│   │       │   ├── UtilityNoticesPage.jsx
│   │       │   └── TrafficIncidentAdminPage.jsx
│   │       ├── department/
│   │       │   ├── DepartmentDashboard.jsx
│   │       │   └── AssignedRequestsPage.jsx
│   │       ├── traffic_officer/
│   │       │   └── TrafficOfficerDashboard.jsx
│   │       └── common/
│   │           └── AccessDeniedPage.jsx
├── render.yaml                         # Production infrastructure configuration
├── run_servers.ps1                     # One-click startup script for both servers
├── setup.ps1                           # One-click automated setup & migration script
└── README.md
```

---

## 4. Demonstration Login Credentials

> [!IMPORTANT]
> The accounts below are created automatically by `python manage.py seed_data`. They are local sandbox credentials intended for demonstration. Change them before any public production deployment.

| Role | Username | Password | Key Permissions & Responsibilities |
|---|---|---|---|
| **Citizen** | `citizen1` | `Citizen@12345` | Lodge grievances, check water/power schedules, report traffic problems, pay property tax bills (simulated). Access restricted strictly to own records. |
| **Admin** | `admin` | `Admin@12345` | Complete governance access. Reviews citizens, assigns complaints to departments, publishes utility notices, oversees tax receipts. |
| **Service Department** | `department1` | `Dept@12345` | Receives assigned civic jobs, starts field work (`In Progress`), logs diagnostics, and marks jobs as `Resolved` with resolution details. |
| **Traffic Officer** | `traffic1` | `Traffic@12345` | Real-time traffic monitoring, logs road closures and collisions, updates incident severity, broadcasts public citizen alerts. |

> **Convenience Feature**: The Login page includes **1-click Role Switcher Chips** at the top that instantly populate the username and password fields for rapid testing during live demonstrations!

---

## 5. Prerequisites

Before running the project on Windows, verify that the following tools are installed:
- **Python**: 3.10 or higher (`python --version`)
- **Node.js**: v18 or higher (`node --version`)
- **npm**: v9 or higher (`npm --version`)
- **PowerShell**: Built-in Windows PowerShell

---

## 6. How to Run the Application

### Option A: Frontend-Only in VS Code (Recommended)
When your Django backend is already running separately at `http://127.0.0.1:8000`:

1. Open the integrated terminal (`Ctrl + ` `) in the repository root and run:
   ```powershell
   npm run dev
   ```
   *The React + Vite frontend starts in the current terminal. Open `http://localhost:5173` in your browser.*

---

### Option B: Step-by-Step Manual Commands

#### 1. Backend Setup & Startup (Terminal 1)
Open a terminal in the `backend` folder:
```powershell
cd backend

# Install backend dependencies
python -m pip install -r requirements.txt

# Apply database migrations
python manage.py makemigrations
python manage.py migrate

# Seed demonstration accounts and sample data
python manage.py seed_data

# Run the Django REST development server
python manage.py runserver 127.0.0.1:8000
```
*Backend will be active at: `http://127.0.0.1:8000/api/`*

#### 2. Frontend Setup & Startup (Terminal 2)
Open a second terminal in the project root folder:
```powershell
cd frontend

# Install frontend dependencies
npm install

# Start Vite development server
npm run dev
```
*Frontend will be active at: `http://localhost:5173/`*

---

### Option C: Launch Both Servers Simultaneously
To launch both the Django backend and Vite frontend:
```powershell
npm run start:both
# or: .\run_servers.ps1
```

---

## 7. Testing and Verification

To execute the automated backend test suite covering authentication, role isolation, complaint citizen boundaries, profile view/edit permissions, and property tax balance atomicity:

```powershell
cd backend
python manage.py test
```

### Verified Test Results:
```text
Creating test database for alias 'default'...
...........
----------------------------------------------------------------------
Ran 11 tests in 49.287s

OK
Destroying test database for alias 'default'...
System check identified no issues (0 silenced).
```

### Key Automated Test Scenarios:
1. `test_login_success_and_token`: Validates token issuance and role profile return.
2. `test_login_invalid_credentials`: Verifies 401 Unauthorized upon incorrect password.
3. `test_complaint_citizen_isolation`: Verifies Citizen 2 gets HTTP 403 Forbidden when attempting to access Citizen 1's complaint.
4. `test_admin_access_control`: Verifies non-admin roles cannot access `/api/auth/citizens/`.
5. `test_property_tax_payment_balance_consistency`: Validates atomic partial payment balance deduction and state change to `Partially Paid` and subsequently `Paid`.
6. `test_get_profile_authenticated`: Verifies profile retrieval with username, role, date joined, and contact information.
7. `test_patch_profile_success`: Verifies permitted field updates (name, phone, address, email) via `/api/auth/profile/`.
8. `test_cannot_modify_role`: Enforces that non-admin and general users cannot escalate or change their role.
9. `test_cannot_modify_username`: Enforces that username cannot be modified via profile update.
10. `test_user_isolation_cannot_edit_another_profile`: Enforces that users cannot edit another user's profile.
11. `test_duplicate_email_rejected`: Rejects profile update if the provided email is already assigned to another account.

---

## 8. REST API Endpoints Overview

| App | Method | Endpoint | Allowed Roles | Description |
|---|---|---|---|---|
| **Auth** | POST | `/api/auth/login/` | Any | Authenticate with username/password, returns Auth Token & role |
| **Auth** | POST | `/api/auth/logout/` | Authenticated | Invalidate token and session |
| **Auth** | GET/PATCH | `/api/auth/profile/` | Authenticated | View or edit permitted profile fields (name, email, phone, address) |
| **Auth** | GET/PATCH | `/api/auth/me/` | Authenticated | Retrieve / update current user contact profile |
| **Auth** | GET | `/api/auth/citizens/` | Admin | Directory listing of all registered citizen profiles |
| **Auth** | GET | `/api/auth/notifications/` | Authenticated | List user notifications with unread counter |
| **Complaints** | GET | `/api/complaints/` | Authenticated | Scoped complaint list (Citizen: own; Dept: assigned; Admin: all) |
| **Complaints** | POST | `/api/complaints/` | Citizen, Admin | Submit new complaint; generates `CMP-2026-XXXX` |
| **Complaints** | GET | `/api/complaints/<id>/` | Authorized | Complaint details with complete chronological status history |
| **Complaints** | PATCH | `/api/complaints/<id>/` | Admin, Dept | Update status, assign department, record work notes / resolution |
| **Complaints** | DELETE | `/api/complaints/<id>/` | Admin | Delete complaint record (destructive action) |
| **Utilities** | GET | `/api/utilities/water/notices/` | Authenticated | Active and scheduled water maintenance advisories |
| **Utilities** | POST | `/api/utilities/water/requests/` | Authenticated | Submit water leakage, supply cut, or pressure request |
| **Utilities** | GET | `/api/utilities/electricity/notices/` | Authenticated | Power outage notices and grid overhaul schedules |
| **Utilities** | POST | `/api/utilities/electricity/requests/` | Authenticated | Report streetlight fault, voltage fluctuation, or power cut |
| **Traffic** | GET | `/api/traffic/incidents/` | Authenticated | Live traffic incident feed with severity filtering |
| **Traffic** | POST | `/api/traffic/incidents/` | Officer, Admin | Log road closure, accident, or congestion alert |
| **Traffic** | POST | `/api/traffic/reports/` | Citizen | Submit citizen report of road hazard |
| **Property Tax**| GET | `/api/tax/properties/` | Authenticated | Properties owned (Citizen: own; Admin: all) |
| **Property Tax**| GET | `/api/tax/tax-records/<id>/` | Authorized | Full assessment bill with breakdown & payment history |
| **Property Tax**| POST | `/api/tax/pay/` | Citizen, Admin | Atomic simulated sandbox tax payment with balance deduction |
| **Dashboard** | GET | `/api/dashboard/citizen/` | Citizen | Aggregated citizen KPI metrics, notices & recent complaints |
| **Dashboard** | GET | `/api/dashboard/admin/` | Admin | City-wide analytics, category & status distribution charts |
| **Dashboard** | GET | `/api/dashboard/department/` | Department | Assigned work order queue and urgent priority jobs |
| **Dashboard** | GET | `/api/dashboard/traffic/` | Traffic Officer | Traffic corridor status, critical accidents & road closures |

---

## 9. Common Errors and Troubleshooting

1. **"Unable to connect to Smart City API server"**:
   - Ensure the Django backend is running on `http://127.0.0.1:8000`.
   - Verify `python manage.py runserver 127.0.0.1:8000` is active without errors.

2. **CORS issues or Network Error in browser console**:
   - Verify that `CORS_ALLOW_ALL_ORIGINS = True` is active in `backend/config/settings.py`.
   - Check that `frontend/.env` contains `VITE_API_BASE_URL=http://127.0.0.1:8000/api`.

3. **Database is locked or changes not reflecting**:
   - Run `python manage.py migrate` and re-seed with `python manage.py seed_data`.

4. **Port 8000 or 5173 already in use**:
   - Specify alternative ports if required:
     - Backend: `python manage.py runserver 127.0.0.1:8001`
     - Frontend: `npm run dev -- --port 5174` (update `frontend/.env` accordingly).
