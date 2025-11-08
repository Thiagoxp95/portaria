"use client";

import { useState, useEffect } from "react";
import { api } from "~/trpc/react";

interface Diagnostics {
  timestamp: string;
  environment: string;
  checks: {
    database: {
      configured: boolean;
      url: string;
    };
    twilio: {
      accountSid: boolean;
      authToken: boolean;
      whatsappFrom: boolean;
      contentSid: boolean;
      statusWebhook: boolean;
      whatsappFromValue: string;
      contentSidValue: string;
    };
    auth: {
      betterAuthSecret: boolean;
      githubClientId: boolean;
      githubClientSecret: boolean;
    };
  };
  endpoints: {
    mcpSse: string;
    mcpTest: string;
    twilioWebhook: string;
    diagnostics: string;
  };
  recommendations: string[];
}

export function DebugPanel() {
  const [phoneNumber, setPhoneNumber] = useState("+5511999999999");
  const [apartment, setApartment] = useState("1507");
  const [visitorName, setVisitorName] = useState("Test Visitor");
  const [companyName, setCompanyName] = useState("Amazon");
  const [lastConversationSid, setLastConversationSid] = useState<string | null>(
    null,
  );
  const [diagnostics, setDiagnostics] = useState<Diagnostics | null>(null);
  const [diagnosticsLoading, setDiagnosticsLoading] = useState(true);

  // Fetch diagnostics on mount
  useEffect(() => {
    fetch("/api/diagnostics")
      .then((res) => res.json())
      .then((data) => {
        setDiagnostics(data as Diagnostics);
        setDiagnosticsLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch diagnostics:", err);
        setDiagnosticsLoading(false);
      });
  }, []);

  // Query recent consents
  const { data: recentConsents, refetch: refetchConsents } =
    api.whatsappConsent.getConsentByPhone.useQuery(
      { toNumber: phoneNumber },
      { enabled: phoneNumber.length > 0 },
    );

  // Query specific consent status
  const { data: consentStatus, refetch: refetchStatus } =
    api.whatsappConsent.getConsentStatus.useQuery(
      { conversationSid: lastConversationSid ?? "" },
      { enabled: !!lastConversationSid },
    );

  // Mutation to start consent
  const startConsentMutation = api.whatsappConsent.startConsent.useMutation({
    onSuccess: (data) => {
      setLastConversationSid(data.conversationSid);
      void refetchConsents();
    },
  });

  // Mutation to mark expired
  const markExpiredMutation =
    api.whatsappConsent.markExpiredConsents.useMutation({
      onSuccess: () => {
        void refetchConsents();
        void refetchStatus();
      },
    });

  const handleStartConsent = async () => {
    await startConsentMutation.mutateAsync({
      to: phoneNumber,
      apt: apartment,
      visitor: visitorName,
      company: companyName,
      ttl: 300,
    });
  };

  const handleCheckStatus = () => {
    void refetchStatus();
    void refetchConsents();
  };

  return (
    <div className="w-full max-w-4xl rounded-xl bg-white/5 p-6 text-white">
      <h2 className="mb-6 text-3xl font-bold">
        WhatsApp Consent System Debug Panel
      </h2>

      {/* System Status */}
      <div className="mb-6 rounded-lg bg-white/10 p-4">
        <h3 className="mb-3 text-xl font-semibold">System Status</h3>
        {diagnosticsLoading ? (
          <div className="text-gray-400">Loading diagnostics...</div>
        ) : diagnostics ? (
          <>
            <div className="mb-4 grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
              <div>
                <span className="text-gray-300">Environment:</span>{" "}
                <span className="font-mono text-yellow-400">
                  {diagnostics.environment}
                </span>
              </div>
              <div>
                <span className="text-gray-300">Database:</span>{" "}
                <span
                  className={`font-mono ${diagnostics.checks.database.configured ? "text-green-400" : "text-red-400"}`}
                >
                  {diagnostics.checks.database.configured
                    ? "Configured"
                    : "Not Configured"}
                </span>
              </div>
              <div>
                <span className="text-gray-300">Twilio Account:</span>{" "}
                <span
                  className={`font-mono ${diagnostics.checks.twilio.accountSid && diagnostics.checks.twilio.authToken ? "text-green-400" : "text-red-400"}`}
                >
                  {diagnostics.checks.twilio.accountSid &&
                  diagnostics.checks.twilio.authToken
                    ? "Configured"
                    : "Missing Credentials"}
                </span>
              </div>
              <div>
                <span className="text-gray-300">WhatsApp Config:</span>{" "}
                <span
                  className={`font-mono ${diagnostics.checks.twilio.whatsappFrom && diagnostics.checks.twilio.contentSid ? "text-green-400" : "text-red-400"}`}
                >
                  {diagnostics.checks.twilio.whatsappFrom &&
                  diagnostics.checks.twilio.contentSid
                    ? "Configured"
                    : "Missing Config"}
                </span>
              </div>
            </div>

            {/* Twilio Details */}
            <div className="mb-4 rounded-lg bg-black/20 p-3">
              <h4 className="mb-2 font-semibold text-sm">Twilio Configuration:</h4>
              <div className="space-y-1 text-xs font-mono">
                <div>
                  <span className="text-gray-400">WhatsApp From:</span>{" "}
                  <span
                    className={
                      diagnostics.checks.twilio.whatsappFrom
                        ? "text-green-400"
                        : "text-red-400"
                    }
                  >
                    {diagnostics.checks.twilio.whatsappFromValue}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">Content SID:</span>{" "}
                  <span
                    className={
                      diagnostics.checks.twilio.contentSid
                        ? "text-green-400"
                        : "text-red-400"
                    }
                  >
                    {diagnostics.checks.twilio.contentSidValue}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">Status Webhook:</span>{" "}
                  <span
                    className={
                      diagnostics.checks.twilio.statusWebhook
                        ? "text-green-400"
                        : "text-red-400"
                    }
                  >
                    {diagnostics.checks.twilio.statusWebhook
                      ? "Configured"
                      : "NOT_SET"}
                  </span>
                </div>
              </div>
            </div>

            {/* Recommendations */}
            {diagnostics.recommendations.length > 0 && (
              <div
                className={`rounded-lg p-3 text-sm ${
                  diagnostics.recommendations[0]?.includes("All required")
                    ? "bg-green-500/20 text-green-200"
                    : "bg-yellow-500/20 text-yellow-200"
                }`}
              >
                <h4 className="mb-2 font-semibold">
                  {diagnostics.recommendations[0]?.includes("All required")
                    ? "✓ System Ready"
                    : "⚠ Configuration Needed:"}
                </h4>
                <ul className="list-inside list-disc space-y-1 text-xs">
                  {diagnostics.recommendations.map((rec, idx) => (
                    <li key={idx}>{rec}</li>
                  ))}
                </ul>
              </div>
            )}
          </>
        ) : (
          <div className="text-red-400">Failed to load diagnostics</div>
        )}
      </div>

      {/* Test Consent Request */}
      <div className="mb-6 rounded-lg bg-white/10 p-4">
        <h3 className="mb-3 text-xl font-semibold">Test Consent Request</h3>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-sm text-gray-300">
              Phone Number (with country code)
            </label>
            <input
              type="text"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="w-full rounded bg-white/20 px-3 py-2 text-white placeholder-gray-400"
              placeholder="+5511999999999"
            />
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm text-gray-300">
                Apartment
              </label>
              <input
                type="text"
                value={apartment}
                onChange={(e) => setApartment(e.target.value)}
                className="w-full rounded bg-white/20 px-3 py-2 text-white"
                placeholder="1507"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-gray-300">
                Visitor Name
              </label>
              <input
                type="text"
                value={visitorName}
                onChange={(e) => setVisitorName(e.target.value)}
                className="w-full rounded bg-white/20 px-3 py-2 text-white"
                placeholder="John Doe"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-gray-300">
                Company
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full rounded bg-white/20 px-3 py-2 text-white"
                placeholder="Amazon"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleStartConsent}
              disabled={startConsentMutation.isPending}
              className="rounded-lg bg-blue-600 px-6 py-2 font-semibold transition hover:bg-blue-700 disabled:opacity-50"
            >
              {startConsentMutation.isPending
                ? "Sending..."
                : "Send WhatsApp Consent"}
            </button>
            <button
              onClick={handleCheckStatus}
              className="rounded-lg bg-green-600 px-6 py-2 font-semibold transition hover:bg-green-700"
            >
              Refresh Status
            </button>
            <button
              onClick={() => markExpiredMutation.mutate()}
              disabled={markExpiredMutation.isPending}
              className="rounded-lg bg-yellow-600 px-6 py-2 font-semibold transition hover:bg-yellow-700 disabled:opacity-50"
            >
              {markExpiredMutation.isPending
                ? "Processing..."
                : "Mark Expired"}
            </button>
          </div>

          {/* Error Display */}
          {startConsentMutation.error && (
            <div className="rounded bg-red-500/20 p-3 text-sm text-red-200">
              <strong>Error:</strong> {startConsentMutation.error.message}
            </div>
          )}

          {/* Success Display */}
          {startConsentMutation.isSuccess && (
            <div className="rounded bg-green-500/20 p-3 text-sm text-green-200">
              <strong>Success!</strong> Consent request sent. Conversation SID:{" "}
              <span className="font-mono">
                {startConsentMutation.data.conversationSid}
              </span>
            </div>
          )}

          {/* Mark Expired Result */}
          {markExpiredMutation.isSuccess && (
            <div className="rounded bg-blue-500/20 p-3 text-sm text-blue-200">
              <strong>Expired consents marked:</strong>{" "}
              {markExpiredMutation.data.marked}
            </div>
          )}
        </div>
      </div>

      {/* Last Consent Status */}
      {consentStatus && (
        <div className="mb-6 rounded-lg bg-white/10 p-4">
          <h3 className="mb-3 text-xl font-semibold">
            Last Consent Request Status
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-gray-300">Status:</span>
              <span
                className={`rounded px-2 py-1 font-mono font-semibold ${
                  consentStatus.status === "approved"
                    ? "bg-green-600"
                    : consentStatus.status === "denied"
                      ? "bg-red-600"
                      : consentStatus.status === "pending"
                        ? "bg-yellow-600"
                        : "bg-gray-600"
                }`}
              >
                {consentStatus.status.toUpperCase()}
              </span>
            </div>
            <div>
              <span className="text-gray-300">Apartment:</span>{" "}
              <span className="font-mono">{consentStatus.apt}</span>
            </div>
            <div>
              <span className="text-gray-300">Visitor:</span>{" "}
              <span className="font-mono">{consentStatus.visitor}</span>
            </div>
            <div>
              <span className="text-gray-300">Company:</span>{" "}
              <span className="font-mono">{consentStatus.company}</span>
            </div>
            {consentStatus.decidedAt && (
              <div>
                <span className="text-gray-300">Decided At:</span>{" "}
                <span className="font-mono">
                  {new Date(consentStatus.decidedAt).toLocaleString()}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Recent Consents */}
      {recentConsents && recentConsents.length > 0 && (
        <div className="rounded-lg bg-white/10 p-4">
          <h3 className="mb-3 text-xl font-semibold">
            Recent Consent Requests for {phoneNumber}
          </h3>
          <div className="space-y-3">
            {recentConsents.map((consent) => (
              <div
                key={consent.conversationSid}
                className="rounded-lg bg-white/5 p-3"
              >
                <div className="grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
                  <div>
                    <span className="text-gray-300">Apartment:</span>{" "}
                    <span className="font-mono">{consent.apt}</span>
                  </div>
                  <div>
                    <span className="text-gray-300">Visitor:</span>{" "}
                    <span className="font-mono">{consent.visitor}</span>
                  </div>
                  <div>
                    <span className="text-gray-300">Company:</span>{" "}
                    <span className="font-mono">{consent.company}</span>
                  </div>
                  <div>
                    <span className="text-gray-300">Status:</span>{" "}
                    <span
                      className={`rounded px-2 py-0.5 font-mono text-xs font-semibold ${
                        consent.status === "approved"
                          ? "bg-green-600"
                          : consent.status === "denied"
                            ? "bg-red-600"
                            : consent.status === "pending"
                              ? "bg-yellow-600"
                              : "bg-gray-600"
                      }`}
                    >
                      {consent.status}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-300">Conversation SID:</span>{" "}
                    <button
                      onClick={() =>
                        setLastConversationSid(consent.conversationSid)
                      }
                      className="font-mono text-xs text-blue-400 hover:text-blue-300"
                    >
                      {consent.conversationSid}
                    </button>
                  </div>
                  {consent.createdAt && (
                    <div className="col-span-2 text-xs text-gray-400">
                      Created:{" "}
                      {new Date(
                        typeof consent.createdAt === "number"
                          ? consent.createdAt * 1000
                          : consent.createdAt,
                      ).toLocaleString()}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Environment Info */}
      <div className="mt-6 rounded-lg bg-white/10 p-4">
        <h3 className="mb-3 text-xl font-semibold">Configuration Guide</h3>
        <div className="space-y-2 text-sm text-gray-300">
          <p>
            <strong>MCP Server:</strong> Run <code>pnpm mcp:server</code> for
            stdio mode
          </p>
          <p>
            <strong>MCP SSE Endpoint:</strong>{" "}
            <code>/api/mcp/sse</code> for ElevenLabs
          </p>
          <p>
            <strong>Webhook Endpoint:</strong>{" "}
            <code>/api/webhooks/twilio/whatsapp</code>
          </p>
          <p>
            <strong>Test Endpoint:</strong> <code>/api/mcp/test</code>
          </p>
          <p className="pt-2">
            Check <code>WHATSAPP_CONSENT_SETUP.md</code> for full documentation
          </p>
        </div>
      </div>
    </div>
  );
}
