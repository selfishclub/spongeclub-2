import { readFileSync } from "node:fs";

const VAPI_API_KEY = process.env.VAPI_API_KEY;
const VAPI_PHONE_NUMBER_ID = process.env.VAPI_PHONE_NUMBER_ID;
const TARGET_PHONE_NUMBER = process.env.TARGET_PHONE_NUMBER;
const PROPERTY_ADDRESS = process.argv[2] || process.env.PROPERTY_ADDRESS;

if (!VAPI_API_KEY || !VAPI_PHONE_NUMBER_ID || !TARGET_PHONE_NUMBER) {
  console.error(
    "Missing env vars. Set VAPI_API_KEY, VAPI_PHONE_NUMBER_ID, TARGET_PHONE_NUMBER (see .env.example)."
  );
  process.exit(1);
}
if (!PROPERTY_ADDRESS) {
  console.error("Usage: node make-call.js \"123 Main St, Philadelphia PA\"");
  process.exit(1);
}

const assistant = JSON.parse(readFileSync(new URL("./assistant-config.json", import.meta.url)));
assistant.firstMessage = assistant.firstMessage.replaceAll("{{propertyAddress}}", PROPERTY_ADDRESS);
assistant.model.systemPrompt = assistant.model.systemPrompt.replaceAll("{{propertyAddress}}", PROPERTY_ADDRESS);

const response = await fetch("https://api.vapi.ai/call", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${VAPI_API_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    assistant,
    phoneNumberId: VAPI_PHONE_NUMBER_ID,
    customer: { number: TARGET_PHONE_NUMBER },
  }),
});

const result = await response.json();
if (!response.ok) {
  console.error("Call request failed:", result);
  process.exit(1);
}
console.log("Call started:", result.id ?? result);
