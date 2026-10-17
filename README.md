# Pharma Compass

# Build/Upgrade: Student Pharma — Professional B.Pharm Learning Platform

Upgrade the existing **Student Pharma B.Pharm** website into a polished, production-ready digital learning platform for B.Pharm students.

The existing website content, subject structure, pricing, and overall concept should be retained, but the application should become a real functional platform rather than a static landing page.

## 1. Brand & Design

Brand name:

**Student Pharma B.Pharm**

Tagline:

**Your B.Pharm Journey, Organized.**

Design a premium, modern educational website.

### Visual style

* Primary background: **white**
* Use a very clean professional healthcare/education aesthetic.
* Use subtle light-gray sections/cards for visual separation.
* Avoid excessive gradients.
* Avoid dark/heavy backgrounds.
* Use generous whitespace.
* Rounded cards with subtle borders and shadows.
* Professional icons.
* Smooth hover effects and transitions.
* Fully responsive on desktop, tablet, and mobile.
* The interface should feel similar to a premium modern SaaS/education platform.

### Typography

Use a highly readable professional font such as:

**Inter**

Use appropriate font weights:

* 400 regular
* 500 medium
* 600 semibold
* 700 bold

Headings should be strong and clean while body text remains easy to read.

---

# 2. Main Website

Keep the existing sections:

* Home
* B.Pharm
* Resources
* Why Student Pharma
* About
* How It Works
* Student Benefits
* AI in Pharmacy
* Footer

Improve the layout and interactions.

The homepage should prominently contain:

### Hero

**Your B.Pharm Journey, Organized.**

Master every semester with structured notes, premium study guides, and exam-focused learning resources designed specifically for B.Pharm students.

Buttons:

**Explore B.Pharm Resources**

**How It Works**

Add a professional pharmacy/education visual treatment without making the page cluttered.

---

# 3. B.Pharm Resource Structure

Organize resources using:

**Year → Semester → Subject → Material**

Support:

### Year 1

* Human Anatomy & Physiology I
* Pharmaceutical Analysis I
* Pharmaceutics I
* Pharmaceutical Inorganic Chemistry
* Communication Skills
* Remedial Biology
* Remedial Mathematics

### Year 2

* Human Anatomy & Physiology II
* Physical Pharmaceutics I
* Pharmaceutical Organic Chemistry II
* Pharmaceutical Microbiology
* Pharmaceutical Engineering
* Pharmacognosy & Phytochemistry
* Biochemistry

### Year 3

* Pharmacology II
* Medicinal Chemistry II
* Industrial Pharmacy I
* Pharmaceutical Jurisprudence
* Herbal Drug Technology
* Pharmaceutical Biotechnology
* Pharmacotherapeutics

### Year 4

* Instrumental Methods of Analysis
* Industrial Pharmacy II
* Pharmacy Practice
* Novel Drug Delivery Systems
* Biostatistics & Research
* Quality Assurance
* Project & Viva Preparation

Allow the admin to add/edit/remove subjects in the future.

---

# 4. Student Authentication

Create a simple student authentication system.

Students should be able to:

### Create Account

Collect basic details:

* Full Name
* Mobile Number
* Email
* B.Pharm Year
* Semester
* College Name
* Password

Do NOT collect unnecessary sensitive information.

After registration, save the student's basic profile information in the application's local store/database.

### Login

Students should be able to log in using:

* Email/mobile number
* Password

After login, redirect them to:

**Student Dashboard**

---

# 5. Student Dashboard

Create a professional dashboard.

Show:

**Welcome, [Student Name]**

Display:

* Current B.Pharm year
* Semester
* Recently viewed materials
* Available subjects
* Purchased/unlocked resources
* Saved/favourite materials
* Learning progress
* Profile information

Example dashboard navigation:

* Dashboard
* My Resources
* Subjects
* Purchased Resources
* Saved Materials
* Profile
* Logout

Make the dashboard responsive and visually polished.

---

# 6. Student Profile

Students can view/edit:

* Name
* Email
* Mobile number
* College
* B.Pharm year
* Semester

Store these details in the local application store/database.

Do not expose one student's information to another student.

---

# 7. Admin System

Create a separate secure:

**Admin Login**

Admin login credentials for the initial demo/admin account:

**User ID:** `siddu`

**Password:** `@2026`

Also associate the admin account with:

**Phone:** `7801064412`

IMPORTANT:

* Treat these credentials as demo credentials.
* Do not expose the password anywhere in the public website.
* Do not hard-code admin credentials into frontend code.
* Implement authentication/authorization properly.
* Admin pages must not be accessible to ordinary students.
* Protect all admin routes.
* If a backend/authentication service is available, store credentials securely using proper password hashing/authentication mechanisms.

---

# 8. Admin Dashboard

Create:

**Admin Dashboard**

with a professional management interface.

Admin navigation:

* Dashboard
* Students
* Years
* Semesters
* Subjects
* Materials
* Google Drive
* Orders/Purchases
* Settings
* Logout

Dashboard statistics:

* Total Students
* Total Subjects
* Total Materials
* Total Purchases
* Recently Added Materials
* Recently Registered Students

Use attractive statistic cards.

---

# 9. Admin Student Management

Admin should be able to:

* View registered students
* Search students
* Filter by B.Pharm year
* Filter by semester
* View student profile
* Edit student information
* Disable/enable student account if necessary

Show a clean table on desktop and responsive cards on mobile.

---

# 10. Admin Material Management

This is a critical feature.

Admin should be able to:

### Add Material

Fields:

* Material title
* Description
* Year
* Semester
* Subject
* Material type
* Price
* Free/Premium
* Thumbnail/image
* Google Drive file/folder URL
* Important topics
* Status
* Display order

Material types can include:

* PDF Notes
* Study Guide
* Question Bank
* Important Questions
* Formula Sheet
* Revision Notes
* Diagrams
* Previous Papers
* Video
* Other

Admin should be able to:

* Create material
* Edit material
* Delete material
* Publish/unpublish material
* Mark material as Premium
* Change price
* Change subject/year/semester
* Add Google Drive link
* Preview material
* Reorder materials

---

# 11. Google Drive Integration

Connect the application with **Google Drive**.

The goal is for the admin to manage learning materials stored in Google Drive while Student Pharma manages the catalogue and access information.

Create a Google Drive integration/settings section for the admin.

Admin should be able to:

* Connect Google Drive
* Select/use a Drive folder
* Add Drive file URLs
* Store Drive file ID
* Store Drive folder ID
* Display file name
* Display file type
* Display file size when available
* Associate Drive files with a B.Pharm year/semester/subject/material

Do not expose private Google Drive credentials or access tokens to the frontend.

Use secure OAuth/API handling.

### Recommended structure

Google Drive:

Student Pharma/
├── Year 1/
│   ├── Semester 1/
│   └── Semester 2/
├── Year 2/
│   ├── Semester 3/
│   └── Semester 4/
├── Year 3/
│   ├── Semester 5/
│   └── Semester 6/
└── Year 4/
├── Semester 7/
└── Semester 8/

The application should store the relationship between a material and its Google Drive file/folder.

---

# 12. Important Google Drive Security

Do not make every Google Drive file publicly accessible by default.

Premium material should only be accessible to students who have permission/unlocked access.

Where possible:

* Keep Drive files private.
* Use authenticated access.
* Use secure backend/server-side handling.
* Never expose Google API secrets in frontend JavaScript.
* Never place OAuth client secrets in the browser.
* Do not put private credentials into localStorage.

If full Google Drive API integration cannot be implemented in the current environment, build the integration architecture and admin UI cleanly and provide a clear configuration point for the required Google OAuth credentials/API setup.

---

# 13. Resource Detail Page

When a student clicks:

**View Resource**

open a professional resource detail page.

Show:

* Resource title
* Subject
* Year
* Semester
* Description
* Material type
* Important topics
* Price
* Free/Premium badge
* Preview
* What's included
* Related resources

For premium materials:

**Unlock Resource**

For free materials:

**Access Material**

---

# 14. Premium Resource System

Support two resource types:

### Free

Student can directly access the resource.

### Premium

Student must purchase/unlock the resource before accessing the protected material.

Display:

* Premium badge
* Price
* Purchase button

Do not claim a payment has succeeded unless an actual payment gateway confirms it.

For now, build the architecture so a payment gateway can be connected later.

---

# 15. Google Drive Material Viewer

For accessible materials, provide a clean:

**Open Material**

button.

If the Drive file is a PDF, provide a suitable document viewer where technically possible.

Include:

* Open
* Back
* Resource information
* Related resources

Do not unnecessarily expose the raw Drive URL in the interface.

---

# 16. Search & Filtering

Add global resource search.

Students can search:

* Subject
* Topic
* Material title
* Year
* Semester

Filters:

* Year
* Semester
* Subject
* Free/Premium
* Material type

Make search fast and mobile friendly.

---

# 17. Resource Cards

Redesign the resource cards.

Each card should show:

**Premium**

Subject name

Short description

Year / Semester

Price

Button:

**View Resource**

Use consistent card dimensions and professional spacing.

---

# 18. Local Store / Persistence

For the demo version, implement a clean local persistence layer for:

* Student accounts
* Student profiles
* Subjects
* Years
* Semesters
* Materials
* Material metadata
* Student favourites
* Recently viewed resources
* Demo purchases/unlocked resources
* Admin settings

Use a structured local store such as localStorage/IndexedDB where appropriate.

IMPORTANT:

Do not store plaintext passwords in localStorage for a production implementation.

If a backend/database is already available in the project, prefer the backend database and authentication over localStorage.

---

# 19. Demo Data

Prepopulate the application with the B.Pharm subjects and materials currently displayed on the website.

Use the existing prices:

Examples:

* ₹199
* ₹179
* ₹149
* ₹219
* ₹299

Keep the current resource descriptions unless improving them for consistency.

Clearly mark demo materials as demo content where appropriate.

---

# 20. Admin Add Material Flow

Make this workflow extremely simple:

Admin Dashboard

→ Materials

→ Add Material

→ Select Year

→ Select Semester

→ Select Subject

→ Enter Material Details

→ Add Google Drive File/Folder

→ Set Free/Premium

→ Set Price

→ Upload thumbnail

→ Publish

After publishing, the material should immediately appear in the correct student resource section.

---

# 21. Admin Editing

When admin edits a material, changes should automatically reflect everywhere the material is displayed.

Avoid duplicated hard-coded material data.

Create a central data model/store for resources.

---

# 22. Empty States & Error Handling

Create professional empty states.

Examples:

**No resources found**

Try changing your filters or search terms.

**No materials available**

New study resources will appear here soon.

**Google Drive not connected**

Connect Google Drive from Admin Settings.

Also add useful loading states and error messages.

---

# 23. Mobile Experience

The website must be fully responsive.

On mobile:

* Use bottom navigation or compact navigation where appropriate.
* Admin sidebar should become a mobile drawer.
* Resource cards should become single-column.
* Tables should become responsive cards.
* Buttons should be easy to tap.
* Forms should use full-width fields.
* Avoid horizontal scrolling.

---

# 24. Footer

Keep:

**Student Pharma B.Pharm**

Premium digital learning platform for B.Pharm students.

Links:

* Home
* B.Pharm
* Resources
* About
* Contact
* Privacy
* Terms
* Refund Policy

Update the copyright year automatically.

---

# 25. About Section

Explain:

**Student Pharma is a structured digital learning platform designed specifically for B.Pharm students.**

Focus on:

* Organized study resources
* Subject-wise learning
* Exam-focused preparation
* Quick revision
* Visual learning
* Structured semester preparation

---

# 26. AI in Pharmacy

Keep the existing:

**Coming Soon — AI in Pharmacy**

section.

Explain that future resources may cover:

* AI in pharmacy education
* Literature review
* Research assistance
* Academic productivity
* Pharmacy research
* Career development
* AI tools for students

---

# 27. Navigation Behaviour

Public navigation:

Home
B.Pharm
Resources
Why Student Pharma
About
Login
Create Account

After student login:

Dashboard
Resources
My Resources
Profile
Logout

After admin login:

Admin Dashboard
Students
Subjects
Materials
Google Drive
Orders
Settings
Logout

Do not show admin navigation to students.

---

# 28. Authentication Routing

Implement protected routes.

Examples:

`/login`

`/register`

`/dashboard`

`/admin/login`

`/admin`

`/admin/students`

`/admin/materials`

`/admin/google-drive`

`/admin/settings`

Unauthenticated users attempting to access `/dashboard` should be redirected to login.

Non-admin users attempting to access `/admin` should be denied and redirected appropriately.

---

# 29. Professional UI Details

Use:

* Consistent 8px spacing system
* Subtle borders
* 12–16px card radius
* Professional icons
* Clear CTA buttons
* Accessible contrast
* Focus states
* Hover states
* Skeleton loaders
* Toast notifications
* Confirmation dialogs for destructive actions

Do not overuse animations.

Use animations only when they improve usability.

---

# 30. Accessibility

Ensure:

* Keyboard navigation
* Proper labels
* Accessible buttons
* Good contrast
* Focus indicators
* Semantic HTML
* Responsive typography
* Alt text for meaningful images

---

# 31. Technical Architecture

Build the application using a clean component-based architecture.

Avoid putting all application logic into one component.

Separate:

* Authentication
* Student dashboard
* Admin dashboard
* Resource catalogue
* Material management
* Google Drive integration
* Local persistence
* UI components

Use reusable components for:

* Navbar
* Footer
* ResourceCard
* SubjectCard
* DashboardCard
* Modal
* Form fields
* Tables
* Badges
* Toast notifications

Keep data models centralized.

---

# 32. Important Security Requirements

Never expose:

* Admin password
* Google OAuth client secret
* Google API secret
* Private Drive credentials
* Payment secrets

in frontend source code.

Do not rely only on frontend route hiding for admin security.

If backend authentication is available, enforce authorization server-side.

If this is currently a frontend-only demo, clearly structure the code so production authentication can be connected without rebuilding the UI.

---

# 33. Admin Demo Account

Create the initial demo admin:

User ID:

`siddu`

Password:

`@2026`

Phone:

`7801064412`

Label this as the initial demo administrator.

Do not display the password anywhere except the login flow/documentation intended for the administrator.

---

# 34. Student Demo Account

Create a demo student account with:

User ID:

`student`

Allow the student profile to contain basic editable information such as:

* Name
* Email
* Phone
* B.Pharm Year
* Semester
* College

The student should be able to log in and experience the complete student dashboard.

Use a safe demo password rather than exposing a production credential.

---

# 35. Final Quality Requirement

The final website should NOT look like a generic template.

It should feel like a real premium B.Pharm educational product.

Prioritize:

**Professional + Clean + Trustworthy + Simple + Fast + Academic + Pharmacy-focused**

Do not use placeholder testimonials such as "Student A/B/C" in the final polished interface unless they are clearly labelled as demo testimonials.

Remove broken SVG placeholders and malformed text such as:

`svg`

from the visible UI.

Ensure all buttons work.

Ensure all navigation works.

Ensure forms work.

Ensure login/logout works.

Ensure student/admin roles work.

Ensure materials added by admin appear in the correct year/semester/subject.

Ensure Google Drive integration is structured securely.

Ensure the website works correctly on desktop and mobile.

Finally, test the complete user journeys:

### Student

Register → Login → Dashboard → Select Year → Select Semester → Select Subject → View Resource → Access Free Material / Unlock Premium Material → Profile → Logout

### Admin

Admin Login → Dashboard → Add Subject/Material → Connect/Add Google Drive Material → Publish → Edit → Unpublish/Delete → View Students → Logout

Make the entire application feel polished, coherent, and production-ready.
if admin add metirial then add those metirials in google drive and evething works

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/07f2dc77-c3d3-40e3-b1de-00a8a53c3245).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
