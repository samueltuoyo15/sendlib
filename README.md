# Sendlib: Transactional Email API for Your Customers 

The fastest way for founders and devs to send transactional emails to your customers (welcome messages, password resets, receipts) using their product's existing Gmail account. Zero domains to verify. Zero stress. Just connect and send.

## Demo

<a href="https://res.cloudinary.com/dpswl8vzgkk/video/upload/q_auto/v1786180780/fadfas_fakwqx.mp4" target="_blank">
  <br />
  <b>🎥 Click here to watch the 60-second Sendlib demo</b>
</a>

## Features

### Secure Gmail Integration

Easily connect your personal or Google Workspace Gmail accounts using secure OAuth 2.0. Sendlib only requests the minimum necessary permissions to send emails on your behalf, and your credentials are never stored directly. This approach ensures high deliverability, as emails are sent from a trusted Google server.

```mermaid
sequenceDiagram
    actor User
    participant Frontend as "Web Client"
    participant Backend as "API Server"
    participant GoogleAuth as "Google OAuth"
    participant Database as "MongoDB"

    User->>Frontend: Clicks "Connect Gmail"
    Frontend->>Backend: Request Gmail Auth URL
    Backend->>GoogleAuth: Generate OAuth URL (scope: gmail.send)
    GoogleAuth->>User: Presents Google Consent Screen
    User->>GoogleAuth: Grants Permissions
    GoogleAuth->>Backend: Redirect to Callback URL (with code)
    Backend->>GoogleAuth: Exchange Code for Access/Refresh Tokens
    GoogleAuth->>Backend: Returns Tokens
    Backend->>Backend: Encrypt Tokens
    Backend->>Database: Save Gmail Account (with encrypted tokens)
    Backend->>Frontend: Redirect to Dashboard (Success)
    Frontend->>User: Displays Connected Account
```

### Effortless Email Sending via API

Send transactional emails with a single, straightforward REST API call. Whether you're sending welcome emails, password resets, or notifications, Sendlib handles the delivery without needing any SMTP port configuration.

```mermaid
sequenceDiagram
    participant DevApp as "Developer Application"
    participant ApiServer as "API Server"
    participant Database as "MongoDB"
    participant GmailAPI as "Gmail API"

    DevApp->>ApiServer: POST /api/send (with API Key in header)
    ApiServer->>ApiServer: Extract Key Prefix
    ApiServer->>Database: Query API Key
    Database->>ApiServer: Return Matching Keys
    ApiServer->>ApiServer: Verify API Key Hash & Request Origin
    ApiServer->>Database: Update API Key lastUsedAt
    ApiServer->>Database: Fetch Gmail Account Credentials
    Database->>ApiServer: Return Encrypted Gmail Tokens
    ApiServer->>ApiServer: Decrypt Gmail Tokens
    ApiServer->>GmailAPI: Send Email Request
    GmailAPI->>ApiServer: Email Sent / Error Response
    ApiServer->>Database: Log Email Details (status, to, subject)
    ApiServer->>DevApp: Return Success / Error
```

### Flexible API Key Management

Generate and manage multiple API keys for different applications or environments. Each key can be configured with allowed origins, adding an extra layer of security. Easily revoke compromised keys directly from your dashboard.

### Real-time Analytics and Logging

Keep an eye on your email sending activity with a dashboard that provides daily cap usage for each connected Gmail account and a detailed log of all sent and failed emails over the last 7 days.

## System Architecture / Design

Sendlib leverages a Next.js application for both its frontend dashboard and backend API routes. User authentication is handled via GitHub or Google OAuth, and connected Gmail accounts are used to relay emails through the Gmail API. All user and application data is persisted in a MongoDB database.

```mermaid
flowchart LR
    User["Web Client / Dashboard"]
    Developer["Developer Application"]
    NextJSApp["Next.js Application"]
    ApiRoutes["API Routes"]
    MongoDB[("MongoDB Database")]
    GoogleAuth["Google OAuth2"]
    GmailAPI["Gmail API"]
    GitHubAuth["GitHub OAuth"]

    User -- "Access Dashboard" --> NextJSApp
    Developer -- "API Requests (with API Key)" --> ApiRoutes
    NextJSApp -- "Backend Calls" --> ApiRoutes
    
    ApiRoutes -- "User Auth" --> GoogleAuth
    ApiRoutes -- "User Auth" --> GitHubAuth
    ApiRoutes -- "User Data" --> MongoDB
    ApiRoutes -- "Gmail Connection & Send" --> GmailAPI

    GoogleAuth -- "Authentication" --> ApiRoutes
    GitHubAuth -- "Authentication" --> ApiRoutes
    GmailAPI -- "Email Relay" --> ApiRoutes

    style User fill:#1e1b4b,stroke:#6366f1,stroke-width:2px,color:#fff
    style Developer fill:#1e1b4b,stroke:#6366f1,stroke-width:2px,color:#fff
    style NextJSApp fill:#2e1065,stroke:#8b5cf6,stroke-width:2px,color:#fff
    style ApiRoutes fill:#2e1065,stroke:#8b5cf6,stroke-width:2px,color:#fff
    style MongoDB fill:#022c22,stroke:#10b981,stroke-width:2px,color:#fff
    style GoogleAuth fill:#451a03,stroke:#f59e0b,stroke-width:2px,color:#fff
    style GmailAPI fill:#451a03,stroke:#f59e0b,stroke-width:2px,color:#fff
    style GitHubAuth fill:#451a03,stroke:#f59e0b,stroke-width:2px,color:#fff
```

## Installation

To get Sendlib up and running on your local machine, follow these steps:

1.  **Clone the Repository**:
    ```bash
    git clone https://github.com/samueltuoyo15/sendliberty.git
    cd sendliberty
    ```

2.  **Install Dependencies**:
    ```bash
    npm install
    # or
    yarn install
    ```

3.  **Set Up Environment Variables**:
    Create a `.env.local` file in the root of the project based on the `.env.example` file. You'll need to fill in your MongoDB connection string and OAuth credentials.

    ```
    # MongoDB
    MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/send-lib?retryWrites=true&w=majority

    # Auth
    JWT_SECRET=your_random_64_char_hex_string_here
    ENCRYPTION_KEY=a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2

    # System Emails (via Sendlib Dogfooding)
    SENDLIB_API_KEY=sl_...
    SENDLIB_FROM="Sendlib" <youremail@gmail.com>

    # Google OAuth (for login AND Gmail connect same credentials)
    GOOGLE_CLIENT_ID=your_google_client_id
    GOOGLE_CLIENT_SECRET=your_google_client_secret
    GOOGLE_CALLBACK_URL=http://localhost:3000/api/gmail/callback # For local dev

    # GitHub OAuth
    GITHUB_CLIENT_ID=your_github_client_id
    GITHUB_CLIENT_SECRET=your_github_client_secret

    # Public env vars
    NEXT_PUBLIC_APP_URL=http://localhost:3000
    NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_live_...
    REDIS_URL=redis://localhost:6379

    # Paystack Billing (Recurring Subscriptions)
    PAYSTACK_SECRET_KEY=sk_live_...
    PAYSTACK_PUBLIC_KEY=pk_live_...
    PAYSTACK_PLAN_CODE=PLN_...
    ```

    *   **MONGODB\_URI**: Your MongoDB connection string.
    *   **JWT\_SECRET**: A long, random string for JWT signing. You can generate one with `node -e "console.log(crypto.randomBytes(32).toString('hex'))"`.
    *   **ENCRYPTION\_KEY**: A 64-character hex string (32 bytes) for encrypting sensitive data like Gmail tokens. Generate with `node -e "console.log(crypto.randomBytes(32).toString('hex'))"`.
    *   **SENDLIB_API_KEY** / **SENDLIB_FROM**: Used for system transactional emails (auth, 2FA, password resets). Go to [sendlib.samueltuoyo.com](https://sendlib.samueltuoyo.com), log in, and generate an API key to use here. Set the From address to your connected Gmail account.
    *   **REDIS_URL**: Enables shared rate limiting across instances; without it, the app falls back to in-process limits.
    *   **GOOGLE\_CLIENT\_ID** / **GOOGLE\_CLIENT\_SECRET**: Obtain these from the Google Cloud Console for OAuth. Make sure to add `http://localhost:3000/api/auth/google/callback` and `http://localhost:3000/api/gmail/callback` to your authorized redirect URIs.
    *   **GITHUB\_CLIENT\_ID** / **GITHUB\_CLIENT\_SECRET**: Obtain these from your GitHub OAuth Apps settings. Add `http://localhost:3000/api/auth/github/callback` to your authorized redirect URIs.
    *   **NEXT\_PUBLIC\_APP\_URL**: The public URL of your application. Use `http://localhost:3000` for local development.

4.  **Run the Development Server**:
    ```bash
    npm run dev
    # or
    yarn dev
    ```
    Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## Usage

Once your Sendlib instance is running and you've connected a Gmail account and generated an API key from the dashboard, you can start sending emails via the `/api/send` endpoint.

Here's how you can use the API in various languages:

### cURL

```bash
curl -X POST http://localhost:3000/api/send \
  -H "Authorization: Bearer YOUR_SECRET_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "sender@gmail.com",
    "to": "user@example.com",
    "subject": "Hello via Sendlib Webhook!",
    "html": "<p>This email was sent with <strong>Sendlib</strong>, delivering straight to your customers!</p>",
    "text": "This email was sent with Sendlib, delivering straight to your customers!",
    "replyTo": "support@yourdomain.com",
    "cc": "anotheruser@example.com",
    "bcc": ["audit@example.com"],
    "attachments": [
      {
        "filename": "document.pdf",
        "content": "JVBERi0xLjQKJcOkw7zD... (base64 encoded content)",
        "type": "application/pdf"
      }
    ]
  }'
```

### JavaScript (fetch API)

```javascript
const response = await fetch('http://localhost:3000/api/send', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_SECRET_API_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    from: 'sender@gmail.com',
    to: 'user@example.com',
    subject: 'Hello via Sendlib Webhook!',
    html: '<p>This email was sent with <strong>Sendlib</strong>, delivering straight to your customers!</p>',
    text: 'This email was sent with Sendlib, delivering straight to your customers!',
    replyTo: 'support@yourdomain.com',
    cc: 'anotheruser@example.com',
    bcc: ['audit@example.com'],
    attachments: [
      {
        filename: 'document.pdf',
        content: 'JVBERi0xLjQKJcOkw7zD... (base64 encoded content)',
        type: 'application/pdf'
      }
    ]
  })
});

const data = await response.json();
console.log(data);
```

### Python (requests)

```python
import requests
import json

url = "http://localhost:3000/api/send"
headers = {
  "Authorization": "Bearer YOUR_SECRET_API_KEY",
  "Content-Type": "application/json"
}
payload = {
  "from": "sender@gmail.com",
  "to": "user@example.com",
  "subject": "Hello via Sendlib Webhook!",
  "html": "<p>This email was sent with <strong>Sendlib</strong>, delivering straight to your customers!</p>",
  "text": "This email was sent with Sendlib, delivering straight to your customers!",
  "replyTo": "support@yourdomain.com",
  "cc": "anotheruser@example.com",
  "bcc": ["audit@example.com"],
  "attachments": [
    {
      "filename": "document.pdf",
      "content": "JVBERi0xLjQKJcOkw7zD... (base64 encoded content)",
      "type": "application/pdf"
    }
  ]
}

response = requests.post(url, headers=headers, data=json.dumps(payload))
print(response.json())
```

### Go

```go
package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
)

func main() {
	payload := map[string]interface{}{
		"from":    "sender@gmail.com",
		"to":      "user@example.com",
		"subject": "Hello via Sendlib Webhook!",
		"html":    "<p>This email was sent with <strong>Sendlib</strong>, delivering straight to your customers!</p>",
		"text":    "This email was sent with Sendlib, delivering straight to your customers!",
		"replyTo": "support@yourdomain.com",
		"cc":      "anotheruser@example.com",
		"bcc":     []string{"audit@example.com"},
		"attachments": []map[string]string{
			{"filename": "document.pdf", "content": "JVBERi0xLjQKJcOkw7zD... (base64 encoded content)", "type": "application/pdf"},
		},
	}
	jsonPayload, _ := json.Marshal(payload)

	req, err := http.NewRequest("POST", "http://localhost:3000/api/send", bytes.NewBuffer(jsonPayload))
	if err != nil {
		fmt.Println("Error creating request:", err)
		return
	}
	req.Header.Set("Authorization", "Bearer YOUR_SECRET_API_KEY")
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		fmt.Println("Error sending request:", err)
		return
	}
	defer resp.Body.Close()

	var result map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&result)
	fmt.Println(result)
}
```

### Rust

```rust
use serde_json::json;
use reqwest::Client;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = Client::new();
    let payload = json!({
        "from": "sender@gmail.com",
        "to": "user@example.com",
        "subject": "Hello via Sendlib Webhook!",
        "html": "<p>This email was sent with <strong>Sendlib</strong>, delivering straight to your customers!</p>",
        "text": "This email was sent with Sendlib, delivering straight to your customers!",
        "replyTo": "support@yourdomain.com",
        "cc": "anotheruser@example.com",
        "bcc": ["audit@example.com"],
        "attachments": [
            {
                "filename": "document.pdf",
                "content": "JVBERi0xLjQKJcOkw7zD... (base64 encoded content)",
                "type": "application/pdf"
            }
        ]
    });

    let res = client.post("http://localhost:3000/api/send")
        .header("Authorization", "Bearer YOUR_SECRET_API_KEY")
        .json(&payload)
        .send()
        .await?;

    let body = res.json::<serde_json::Value>().await?;
    println!("{:?}", body);

    Ok(())
}
```

### PHP

```php
<?php
$url = 'http://localhost:3000/api/send';
$apiKey = 'YOUR_SECRET_API_KEY';

$payload = [
    'from' => 'sender@gmail.com',
    'to' => 'user@example.com',
    'subject' => 'Hello via Sendlib Webhook!',
    'html' => '<p>This email was sent with <strong>Sendlib</strong>, delivering straight to your customers!</p>',
    'text' => 'This email was sent with Sendlib, delivering straight to your customers!',
    'replyTo' => 'support@yourdomain.com',
    'cc' => 'anotheruser@example.com',
    'bcc' => ['audit@example.com'],
    'attachments' => [
        [
            'filename' => 'document.pdf',
            'content' => 'JVBERi0xLjQKJcOkw7zD... (base64 encoded content)',
            'type' => 'application/pdf'
        ]
    ]
];

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Authorization: Bearer ' . $apiKey,
    'Content-Type: application/json'
]);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));

$response = curl_exec($ch);
if (curl_errno($ch)) {
    echo 'cURL Error: ' . curl_error($ch);
} else {
    echo $response;
}
curl_close($ch);
```

### .NET (C# HttpClient)

```csharp
using System;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using Newtonsoft.Json; // Make sure to install Newtonsoft.Json

public class EmailSender
{
    private static readonly HttpClient client = new HttpClient();

    public static async Task Main(string[] args)
    {
        string apiUrl = "http://localhost:3000/api/send";
        string apiKey = "YOUR_SECRET_API_KEY";

        var payload = new
        {
            from = "sender@gmail.com",
            to = "user@example.com",
            subject = "Hello via Sendlib Webhook!",
            html = "<p>This email was sent with <strong>Sendlib</strong>, delivering straight to your customers!</p>",
            text = "This email was sent with Sendlib, delivering straight to your customers!",
            replyTo = "support@yourdomain.com",
            cc = "anotheruser@example.com",
            bcc = new[] { "audit@example.com" },
            attachments = new[] {
                new {
                    filename = "document.pdf",
                    content = "JVBERi0xLjQKJcOkw7zD... (base64 encoded content)",
                    type = "application/pdf"
                }
            }
        };

        client.DefaultRequestHeaders.Add("Authorization", $"Bearer {apiKey}");
        string jsonPayload = JsonConvert.SerializeObject(payload);
        var content = new StringContent(jsonPayload, Encoding.UTF8, "application/json");

        HttpResponseMessage response = await client.PostAsync(apiUrl, content);
        response.EnsureSuccessStatusCode(); // Throws an exception if not successful
        string responseBody = await response.Content.ReadAsStringAsync();
        Console.WriteLine(responseBody);
    }
}
```

### Java (HttpClient)

```java
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

public class EmailSender {

    public static void main(String[] args) throws Exception {
        HttpClient client = HttpClient.newHttpClient();
        String apiUrl = "http://localhost:3000/api/send";
        String apiKey = "YOUR_SECRET_API_KEY";

        String jsonPayload = """
            {
              "from": "sender@gmail.com",
              "to": "user@example.com",
              "subject": "Hello via Sendlib Webhook!",
              "html": "<p>This email was sent with <strong>Sendlib</strong>, delivering straight to your customers!</p>",
              "text": "This email was sent with Sendlib, delivering straight to your customers!",
              "replyTo": "support@yourdomain.com",
              "cc": "anotheruser@example.com",
              "bcc": ["audit@example.com"],
              "attachments": [
                {
                  "filename": "document.pdf",
                  "content": "JVBERi0xLjQKJcOkw7zD... (base64 encoded content)",
                  "type": "application/pdf"
                }
              ]
            }
            """;

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(apiUrl))
                .header("Authorization", "Bearer " + apiKey)
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(jsonPayload))
                .build();

        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
        System.out.println(response.body());
    }
}
```

## Technologies Used

| Technology         | Description                                     |
| :----------------- | :---------------------------------------------- |
| **Next.js**        | React framework for production                  |
| **React**          | Frontend library for building user interfaces   |
| **TypeScript**     | Superset of JavaScript for type safety          |
| **Node.js**        | JavaScript runtime for server-side logic        |
| **MongoDB**        | NoSQL database for data persistence             |
| **Mongoose**       | ODM for MongoDB and Node.js                     |
| **`argon2`**       | Password hashing library                        |
| **`jsonwebtoken`** | JWT for secure authentication                   |
| **`googleapis`**   | Official Node.js client library for Google APIs |
| **`axios`**        | Promise-based HTTP client for the browser and Node.js |
| **`@tanstack/react-query`** | Powerful asynchronous state management for React |
| **Tailwind CSS**   | Utility-first CSS framework for rapid UI development |
| **Shadcn UI**      | Reusable UI components built with Tailwind CSS  |
| **`sonner`**       | Accessible toast notifications                  |
| **`canvas-confetti`** | For celebratory visual effects on milestones |

## Contributing

We welcome contributions! To keep our codebase clean and organized, we follow a strict "Issue First" workflow. 

Please read our full [CONTRIBUTING.md](./CONTRIBUTING.md) guide before you start. In short:
1. Open an issue and wait for approval.
2. Fork the repository and create a branch.
3. Open a Pull Request referencing your approved issue.
4. Ensure all CI checks (linting and building) pass.

## Author Info

*   **LinkedIn**: [Samuel Tuoyo](https://linkedin.com/in/samuel-tuoyo)
*   **X (Twitter)**: [@TuoyoS26091](https://x.com/TuoyoS26091)

---

[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/en)
[![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

[![Readme was generated by Dokugen](https://img.shields.io/badge/Readme%20was%20generated%20by-Dokugen-brightgreen)](https://dokugen-readme.vercel.app)
