SYSTEM_CONTRACT.md

Boreal Financial – Client Application & Client Portal

This document defines the non-negotiable contract for the Boreal Client App and Client Portal.

The Client App is not a CRM, not underwriting, and not a decision engine.
It is a guided intake + status + document completion interface driven entirely by the Staff Server.

⸻

1. Identity & Authentication

1.1 Authentication Model
	•	OTP only
	•	Phone number is mandatory
	•	No passwords
	•	No email-only accounts
	•	No social login

1.2 Identity Rules
	•	Same phone number = same client profile
	•	Multiple applications may exist under one client
	•	Client identity is immutable once created

1.3 Re-Authentication
	•	OTP is required every visit
	•	Session persistence is allowed only after successful OTP
	•	No silent re-auth

⸻

2. First Visit vs Returning Visit

2.1 First Visit
	•	User lands directly in the Application Flow
	•	No portal access until first application is submitted

2.2 After Submission
	•	User is redirected to the Client Portal
	•	All future visits land in the Client Portal after OTP

⸻

3. Application Flow (Strict Order)

The application flow is fixed and must render in this exact order:

Step 1 — Know Your Client
	•	Amount requested
	•	Country
	•	Business type
	•	High-level intent

⸻

Step 2 — Product Category Selection
	•	User selects a product category
	•	Categories are always shown
	•	Matching happens server-side
	•	UI shows number of matching lender products
	•	One lender may contribute multiple products

⸻

Step 3 — Business Information
	•	Business details
	•	Ownership structure
	•	Operating history

⸻

Step 4 — Applicant Information
	•	Primary applicant
	•	Ability to add business partners
	•	All applicants must later sign and provide ID

⸻

Step 5 — Required Documents
	•	Dynamic list derived from:
	•	Country (Step 1)
	•	Amount (Step 1)
	•	Product Category (Step 2)
	•	Matching lender products
	•	All required docs are checkboxes
	•	6 months of bank statements are always required
	•	“Skip documents” button allowed
	•	Upload later handled in Client Portal
	•	Re-upload allowed if staff rejects a document

⸻

Step 6 — Terms & Typed Signature
	•	Typed signature only
	•	No DocuSign / SignNow here
	•	Final application submission

⸻

4. Required Documents Logic (Critical)

4.1 How Required Docs Are Determined
	•	Server polls all lender products that match:
	•	Country
	•	Amount range
	•	Product category
	•	Required documents are the union of all matching products
	•	Client sees one consolidated checklist
	•	No lender names exposed at this stage

4.2 Rejection Flow
	•	Staff may reject one or multiple documents
	•	Client receives:
	•	SMS
	•	Email
	•	Messaging behavior:
	•	Prefer one aggregated message after X minutes
	•	If not possible, one message per rejected document is acceptable

⸻

5. Client Portal (Post-Submission)

5.1 Layout
	•	Top: Status timeline
	•	Right: Persistent chat
	•	Left: Action buttons (documents, profile, etc.)

5.2 Status Timeline
	•	Reflects Sales Pipeline stages in real time
	•	Updates when staff moves application cards
	•	Timeline is read-only

⸻

6. Messaging & Chat

6.1 Chatbot
	•	Always visible
	•	Present on:
	•	Application flow
	•	Client Portal
	•	Future AI agent may:
	•	Assist applications
	•	Handle voice
	•	Guide uploads

6.2 Client ↔ Staff Chat
	•	Real-time
	•	Persistent per application
	•	Used for clarification and support

⸻

7. Document Upload & Re-Upload
	•	Client can upload documents at any time
	•	Staff may reject documents
	•	Rejected documents:
	•	Trigger notifications
	•	Require re-upload
	•	Upload loop continues until complete

⸻

8. Electronic Signing (Post-Acceptance)
	•	Happens only after:
	•	All documents accepted
	•	OCR complete
	•	Credit summary generated
	•	All applicants must:
	•	Sign
	•	Provide ID
	•	Signature is typed
	•	Signing occurs in Client Portal

⸻

9. Multiple Applications
	•	Client may create multiple applications
	•	Equipment financing may spawn a second linked application
	•	Staff Portal may also initiate additional applications
	•	All applications appear in the Client Portal

⸻

10. Permissions & Visibility

The Client App must never show:
	•	Internal notes
	•	Credit summary internals
	•	OCR raw data
	•	Lender names before acceptance
	•	Commission data
	•	Underwriting logic

⸻

11. Error Handling
	•	Server is authoritative
	•	Client must not infer success
	•	All failures must be visible
	•	No silent retries

⸻

12. Extensibility Guarantees

The Client App must support without refactor:
	•	New product categories
	•	New required documents
	•	New application steps (server-driven)
	•	AI-assisted flows
	•	Voice-based intake

⸻

13. Enforcement
	•	Any deviation from this contract is a bug
	•	UI logic must mirror server state exactly
	•	Tests should validate:
	•	Step order
	•	Required document aggregation
	•	Rejection → re-upload loop
	•	Timeline updates

⸻

14. React Router
	•	`<BrowserRouter>` MUST wrap `<App />` in `src/main.tsx`.
	•	Never remove the BrowserRouter from `src/main.tsx`.
	•	Never add a second BrowserRouter anywhere else in the tree — only one Router provider is allowed per React app.
	•	Components using `useLocation`, `useNavigate`, `useParams`, or `<Routes>` will crash with "basename null" if rendered outside the BrowserRouter.
