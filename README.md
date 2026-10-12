# 💈 BarberShop App ChopTime - Full-Stack Appointment Management System 

A production-ready web application designed to optimize schedule management, appointment control, and operational workflows for a local business. This project was engineered following a modern decoupled architecture, focusing on solving real-world logical bottlenecks, relational data persistence, and strict role-based access control.

## 🚀 Core Features

- **End-to-End Authentication:** Secure signup and login flows powered by Supabase Auth.
- **True Relational Database:** Cloud data persistence built on **PostgreSQL** via Supabase, utilizing normalized tables and strict Foreign Key constraints.
- **Administrative Dashboard:** Role-based conditional UI routing that splits the user experience depending on the profile level (`Client` vs. `Barber/Admin`).
- **Robust State Management:** Clean control of asynchronous operations including loading states (`loading`, `isSubmitting`), network failure containment via `try/catch` blocks, and real-time visual syncing.
- **Client-Side Security:** Strict password complexity verification using Regular Expressions (RegEx) to capture data vulnerabilities before hitting network transport.

## 🛠️ Tech Stack

- **Frontend:** React JS, Vite, JavaScript (ES6+), HTML5.
- **Backend as a Service (BaaS):** Supabase (PostgreSQL, Data API, Auth).
- **Deployment:** Vercel (Continuous Integration / Continuous Deployment).

---

## 📐 Relational Database Schema

The core system architecture was designed and executed via structured query language (SQL) under the following normalized relational model:

- **`profiles`:** Stores authenticated user metadata and establishes access control flags (`role: 'client' | 'barber'`).
- **`barbers`:** Catalog of industry professionals available in the shop along with their active specialties.
- **`appointments`:** A central relational table containing Foreign Keys referencing `profiles` and `barbers`. It orchestrates dates, times, and workflows (`status`) with cascading integrity constraints (`ON DELETE CASCADE`).

---

## 📈 Engineering Stories (Real-World Architecture Pillars)

To demonstrate competitive engineering skills within enterprise environments, the development of this application actively tackled and mitigated the following technical challenges:

### 1. The Production Bug Story 🐛
*   **The Issue:** During the initial testing phase, shop operators reported a critical data duplication bug: a single customer was being booked multiple times for the exact same barber at the identical hour. Upon analyzing the telemetry, I discovered that when network speeds throttled on the client side, users repeatedly clicked the "Confirm Booking" button out of frustration before the server could respond, firing multiple concurrent `POST` requests to Supabase.
*   **The Solution:** I resolved this concurrency issue by implementing a boolean flag called `isSubmitting` in React. The moment the click event triggers, the state mutates to `true`, **instantly disabling the DOM node** (`disabled={isSubmitting}`) and changing the copy to "Checking availability...". Once the asynchronous lifecycle settles, a `finally` block returns the state to `false`. This front-line validation eliminated 100% of interface-driven scheduling collisions.

### 2. The Mid-Project Changing Requirement 🔄
*   **Context:** Originally, the system was scoped as a read-only static schedule tracker. Midway through development, the stakeholder introduced a critical business constraint: clients needed to cancel last-minute bookings via mobile, and barbers required the capacity to approve or reject time slots dynamically from their management panels.
*   **The Solution:** Leveraging a modular decoupled design pattern, I extended the `appointments` PostgreSQL entity by inserting a status column defaulting to `'pending'`. On the frontend, I scaled the `AdminDashboard` component to include reactive interactive triggers linked to an asynchronous workflow executing data mutations (`UPDATE`). Clicking **Aceptar** or **Cancelar** fires a targeted payload over the Supabase REST API, altering state at the cloud layer and forcing a clean virtual DOM re-render without destabilizing existing code.

---

## 🔧 Local Installation and Setup

1. Clone the repository:
   ```bash
   git clone https://github.com
   ```
2. Install the node packages:
   ```bash
   npm install
   ```
3. Set up your environment variables inside a `.env` file at the root layer:
   ```text
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_public_anon_key
   ```
4. Fire up the local development engine:
   ```bash
   npm run dev
   ```

## 🔧 Project Link

You can view the live project here: 👉 



