"use client";

import { useState } from "react";
import { api } from "~/trpc/react";

export function ResidentsManager() {
  const [isAddingResident, setIsAddingResident] = useState(false);
  const [apartmentNumber, setApartmentNumber] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [residentName, setResidentName] = useState("");
  const [notes, setNotes] = useState("");

  // Add resident mutation
  const addResidentMutation = api.resident.addResident.useMutation({
    onSuccess: () => {
      setApartmentNumber("");
      setPhoneNumber("");
      setResidentName("");
      setNotes("");
      setIsAddingResident(false);
    },
  });

  const handleAddResident = async () => {
    await addResidentMutation.mutateAsync({
      apartmentNumber,
      phoneNumber,
      residentName: residentName || undefined,
      notes: notes || undefined,
    });
  };

  return (
    <div className="w-full max-w-4xl rounded-xl bg-white/5 p-6 text-white">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-3xl font-bold">Residents Directory</h2>
        <button
          onClick={() => setIsAddingResident(!isAddingResident)}
          className="rounded-lg bg-blue-600 px-4 py-2 font-semibold transition hover:bg-blue-700"
        >
          {isAddingResident ? "Cancel" : "+ Add Resident"}
        </button>
      </div>

      <p className="mb-6 text-sm text-gray-300">
        Manage apartment-to-phone number mappings. Use this to configure which
        phone number receives WhatsApp consent requests for each apartment.
      </p>

      {/* Add Resident Form */}
      {isAddingResident && (
        <div className="mb-6 rounded-lg bg-white/10 p-4">
          <h3 className="mb-3 text-xl font-semibold">Add New Resident</h3>
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm text-gray-300">
                  Apartment Number *
                </label>
                <input
                  type="text"
                  value={apartmentNumber}
                  onChange={(e) => setApartmentNumber(e.target.value)}
                  className="w-full rounded bg-white/20 px-3 py-2 text-white placeholder-gray-400"
                  placeholder="1507"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-gray-300">
                  Phone Number (with country code) *
                </label>
                <input
                  type="text"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full rounded bg-white/20 px-3 py-2 text-white placeholder-gray-400"
                  placeholder="+5511999999999"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm text-gray-300">
                Resident Name (optional)
              </label>
              <input
                type="text"
                value={residentName}
                onChange={(e) => setResidentName(e.target.value)}
                className="w-full rounded bg-white/20 px-3 py-2 text-white placeholder-gray-400"
                placeholder="John Doe"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-gray-300">
                Notes (optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full rounded bg-white/20 px-3 py-2 text-white placeholder-gray-400"
                placeholder="Additional information..."
                rows={2}
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleAddResident}
                disabled={
                  !apartmentNumber ||
                  !phoneNumber ||
                  addResidentMutation.isPending
                }
                className="rounded-lg bg-green-600 px-6 py-2 font-semibold transition hover:bg-green-700 disabled:opacity-50"
              >
                {addResidentMutation.isPending ? "Adding..." : "Add Resident"}
              </button>
            </div>

            {addResidentMutation.error && (
              <div className="rounded bg-red-500/20 p-3 text-sm text-red-200">
                <strong>Error:</strong> {addResidentMutation.error.message}
              </div>
            )}

            {addResidentMutation.isSuccess && (
              <div className="rounded bg-green-500/20 p-3 text-sm text-green-200">
                <strong>Success!</strong> Resident added successfully.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quick Test Lookup */}
      <div className="rounded-lg bg-blue-500/10 border border-blue-500/30 p-4">
        <h3 className="mb-3 text-xl font-semibold text-blue-300">
          Test Apartment Lookup
        </h3>
        <p className="mb-3 text-sm text-gray-300">
          Test the MCP <code>get_phone_by_apartment</code> tool by entering an
          apartment number:
        </p>
        <TestApartmentLookup />
      </div>

      {/* Instructions */}
      <div className="mt-6 rounded-lg bg-white/10 p-4">
        <h3 className="mb-3 text-xl font-semibold">How It Works</h3>
        <div className="space-y-2 text-sm text-gray-300">
          <p>
            1. <strong>Add residents</strong> using the form above to map
            apartment numbers to phone numbers
          </p>
          <p>
            2. <strong>ElevenLabs Agent workflow:</strong>
          </p>
          <ul className="ml-6 list-disc space-y-1">
            <li>
              Visitor arrives and tells agent which apartment they&apos;re
              visiting
            </li>
            <li>
              Agent calls <code>get_phone_by_apartment</code> with the apartment
              number
            </li>
            <li>
              Agent receives the resident&apos;s phone number automatically
            </li>
            <li>
              Agent calls <code>start_whatsapp_consent</code> with the retrieved
              phone number
            </li>
            <li>Agent tracks response with <code>get_consent_status</code></li>
          </ul>
          <p className="pt-2">
            <strong>Example agent prompt:</strong>
          </p>
          <pre className="mt-2 overflow-x-auto rounded bg-black/30 p-3 text-xs">
            {`When a visitor arrives:
1. Ask "Which apartment are you visiting?"
2. Call get_phone_by_apartment with the apartment number
3. If found, call start_whatsapp_consent with the phone number
4. Poll get_consent_status every 10 seconds
5. Inform visitor of the decision`}
          </pre>
        </div>
      </div>
    </div>
  );
}

function TestApartmentLookup() {
  const [testApartment, setTestApartment] = useState("");
  const [lastLookupResult, setLastLookupResult] = useState<{
    apartmentNumber: string;
    phoneNumber: string;
    residentName?: string | null;
  } | null>(null);

  const lookupMutation = api.resident.getPhoneByApartment.useQuery(
    { apartmentNumber: testApartment },
    { enabled: false },
  );

  const handleLookup = () => {
    void lookupMutation.refetch().then((result) => {
      if (result.data) {
        setLastLookupResult(result.data);
      }
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        <input
          type="text"
          value={testApartment}
          onChange={(e) => setTestApartment(e.target.value)}
          className="flex-1 rounded bg-white/20 px-3 py-2 text-white placeholder-gray-400"
          placeholder="Enter apartment number (e.g., 1507)"
          onKeyDown={(e) => e.key === "Enter" && handleLookup()}
        />
        <button
          onClick={handleLookup}
          disabled={!testApartment || lookupMutation.isFetching}
          className="rounded-lg bg-blue-600 px-6 py-2 font-semibold transition hover:bg-blue-700 disabled:opacity-50"
        >
          {lookupMutation.isFetching ? "Looking up..." : "Lookup"}
        </button>
      </div>

      {lookupMutation.error && (
        <div className="rounded bg-red-500/20 p-3 text-sm text-red-200">
          <strong>Not Found:</strong> {lookupMutation.error.message}
        </div>
      )}

      {lastLookupResult && (
        <div className="rounded bg-green-500/20 p-3 text-sm text-green-200">
          <strong>Found!</strong>
          <div className="mt-2 space-y-1">
            <div>
              <span className="text-gray-300">Apartment:</span>{" "}
              <span className="font-mono">{lastLookupResult.apartmentNumber}</span>
            </div>
            <div>
              <span className="text-gray-300">Phone:</span>{" "}
              <span className="font-mono">{lastLookupResult.phoneNumber}</span>
            </div>
            {lastLookupResult.residentName && (
              <div>
                <span className="text-gray-300">Name:</span>{" "}
                <span className="font-mono">{lastLookupResult.residentName}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
