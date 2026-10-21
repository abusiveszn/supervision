# SmartSupervise

SmartSupervise is a React and Vite application for managing university project supervision. It provides separate workflows for students, supervisors, and administrators, including topics, documents, reviews, meetings, messaging, progress tracking, allocation, and reports.

## Requirements

- Node.js 18 or newer
- npm
- Base44 CLI for local backend development

## Install

```bash
npm install
```

## Credentials and Environment

### Administrator Access

You can log into the **Admin Dashboard** using the administrator credentials:

| Account Type | Email | Password | Role / Access |
| :--- | :--- | :--- | :--- |
| **System Admin** | `admin@smartsupervise.edu` | `Admin12345!` | Full System Administrator |

### How to Log In as Admin

1. Open the dedicated **Administrator Portal** at:
   - **[http://localhost:5173/admin](http://localhost:5173/admin)**
2. Enter the email and password above (or click the **Autofill** button).
3. Click **Log in to Admin Dashboard →**.
4. You will be redirected to `/admin/dashboard` with full administrative privileges.

*(Note: Admin credentials can also be entered on standard login pages such as `/login` or `/supervisor-auth` and will automatically route you to the Admin Dashboard.)*

### Supervisor Registration & Secret Authorization Code

To register as a Supervisor, faculty members must provide an institutional authorization code:

| Setting | Value | Description |
| :--- | :--- | :--- |
| **Supervisor Secret Code** | `12345` | Required during supervisor sign up at `/supervisor-register` or `/supervisor-auth` |

Supervisors cannot complete registration without this code, preventing unauthorized faculty access.

### Dedicated Portals & Dashboards

Each user group has its own dedicated portal and dashboard:
- **Student Dashboard**: `/student/dashboard` (Sign in / register at `/login` or `/register`)
- **Supervisor Dashboard**: `/supervisor/dashboard` (Sign in / register with code `12345` at `/supervisor-auth`)
- **Admin Dashboard**: `/admin/dashboard` (Sign in at `/admin`)
- Registered students and supervisors immediately appear in the **Admin Dashboard** overview and directories (`/students`, `/supervisors`).

### Administrator Capabilities

Upon logging in as an administrator, you gain access to:
- **System Overview**: High-level statistics and navigation hub.
- **Students**: Manage student profiles, project allocations, and academic progress.
- **Supervisors**: Manage faculty supervisors, review workloads, and invite supervisors.
- **Departments**: Configure university departments and academic units.
- **Supervisor Performance**: Analyze supervisor review velocity, turnaround times, and metrics.
- **Allocation**: Matching and assigning students to supervisors and projects.
- **Topic Approvals**: Review and approve research topics submitted across faculties.
- **Reports**: Generate system-wide progress summaries and exports.
