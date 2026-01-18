<div align="center">
<img width="1200" height="475" alt="CreativeScale Banner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# CreativeScale - Agency Pricing Optimizer

**CreativeScale** is an intelligent pricing estimation and audit tool designed for creative agencies. It leverages **Google Gemini 2.0 Flash** to automate the complex process of quoting projects, analyzing historical work, and maintaining brand-specific rate cards.

## 🚀 Key Features

### 1. AI Pricing Estimator
*   **Instant Quotes**: Paste a raw email, Slack message, or project brief into the Estimator.
*   **Smart Parsing**: The AI extracts deliverables (e.g., "3 Instagram Reels", "15-page Deck") and maps them to your agency's standardized services.
*   **Context Aware**: It understands simple tasks vs. complex productions and suggests appropriate tiers.

### 2. Brand Intelligence (Memory Mode)
*   **Learned Rates**: The AI "remembers" specific rates for different clients (e.g., *Client A pays $500 for a blog, but Client B pays $800*).
*   **Billing Models**: Supports Retainer, Project-based, or Hourly billing models per brand.
*   **Consistent Pricing**: Ensures that every Account Manager quotes the same rates for the same client.

### 3. Client Audit & History
*   **Historical Analysis**: Paste a spreadsheet of past work to audit it against your global rate card.
*   **Health Check**: Identifies if you are undercharging (Loss) or operating sustainably (Healthy) on a specific retainer.
*   **Invoice Analysis**: Upload or paste invoice text to automatically extract and categorize line items.

### 4. Knowledge Base
*   **Global Rate Card**: Define your agency's standard base rates for all services.
*   **Pricing Philosophy**: Teach the AI your agency's "vibe" (e.g., "We are a premium agency, never undercharge" or "We value volume over high margins").

---

## 🛠 Tech Stack

*   **Frontend**: React (Vite) + TypeScript
*   **Styling**: Modern CSS (Glassmorphism, Dark Mode)
*   **AI Core**: Google Gemini 2.0 Flash (via `@google/genai`)
*   **Backend**: Azure Functions (Node.js 18)
*   **Hosting**: Azure Static Web Apps
*   **CI/CD**: GitHub Actions

---

## ⚡️ Getting Started

### Prerequisites
*   Node.js (v18 or higher)
*   Google Gemini API Key

### Installation
1.  **Clone the repository**:
    ```bash
    git clone https://github.com/Edit-Tree/creative-price-estimator.git
    cd creative-price-estimator
    ```

2.  **Install Dependencies**:
    ```bash
    npm install
    cd api && npm install && cd ..
    ```

3.  **Local Environment**:
    Create a `.env.local` file in the root for local testing (optional, as the backend proxy handles this in prod):
    ```env
    GEMINI_API_KEY=your_key_here
    ```

4.  **Run Locally**:
    ```bash
    npm run dev
    ```

---

## ☁️ Deployment (Azure)

This project is configured for **Seamless CI/CD** with Azure Static Web Apps.

### Architecture
*   **Frontend**: Served securely from Azure's global edge network.
*   **Backend**: The `/api` folder contains a Serverless Function that acts as a proxy. It holds the API keys so they are never exposed to the client.

### Automated Deployment
The project uses **GitHub Actions** (`.github/workflows/azure-static-web-apps-deploy.yml`).
1.  Push changes to `main`.
2.  GitHub Actions automatically builds the React app and the Node.js API.
3.  Deploys to: `https://mango-field-045ff5a0f.6.azurestaticapps.net`

### Configuration
Environment variables are managed in the **Azure Portal**:
1.  Go to your Static Web App resource.
2.  Navigate to **Environment variables**.
3.  Set `GEMINI_API_KEY` to your production key.
