import { getApiKey } from "../api";

export default function McpSetup() {
  const apiKey = getApiKey() ?? "YOUR_API_KEY";
  const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

  const claudeConfig = JSON.stringify(
    {
      mcpServers: {
        yaas: {
          command: "npx",
          args: ["tsx", "apps/mcp/src/index.ts"],
          env: {
            YAAS_API_URL: apiUrl,
            YAAS_API_KEY: apiKey,
          },
        },
      },
    },
    null,
    2
  );

  return (
    <div className="max-w-2xl">
      <h2 className="text-2xl font-bold mb-4">MCP Setup</h2>
      <p className="text-gray-600 mb-6">
        Connect Claude Desktop (or any MCP client) to the YAAS{" "}
        <code className="bg-gray-100 px-1 rounded">requestHuman</code> tool.
      </p>

      <h3 className="font-semibold mb-2">Claude Desktop Config</h3>
      <p className="text-sm text-gray-600 mb-2">
        Add to{" "}
        <code className="bg-gray-100 px-1 rounded">
          ~/Library/Application Support/Claude/claude_desktop_config.json
        </code>
      </p>
      <pre className="bg-gray-900 text-green-400 p-4 rounded-lg text-sm overflow-x-auto mb-4">
        {claudeConfig}
      </pre>
      <button
        className="btn-secondary mb-8"
        onClick={() => navigator.clipboard.writeText(claudeConfig)}
      >
        Copy Config
      </button>

      <h3 className="font-semibold mb-2">Tool: requestHuman</h3>
      <div className="bg-gray-50 border rounded-lg p-4 text-sm">
        <p className="mb-2">
          <strong>taskType:</strong> verify | collect | judge | act | fix
        </p>
        <p className="mb-2">
          <strong>description:</strong> What the human should do
        </p>
        <p className="mb-2">
          <strong>budget_usd:</strong> Payment amount in USD
        </p>
        <p className="mb-2">
          <strong>urgency:</strong> sync_60s | async_1h | async_24h
        </p>
        <p>
          <strong>proofRequired:</strong> photo | gps | signature | text | video
        </p>
      </div>

      <h3 className="font-semibold mt-6 mb-2">Example</h3>
      <pre className="bg-gray-50 border p-4 rounded-lg text-sm overflow-x-auto">
{`{
  "taskType": "verify",
  "description": "Photograph storefront at 123 Main St",
  "location": { "lat": 37.7749, "lng": -122.4194, "radius_km": 1 },
  "budget_usd": 5,
  "urgency": "sync_60s",
  "proofRequired": "photo"
}`}
      </pre>
    </div>
  );
}
