export const WHITEGATOR_CONSTANTS = {
  APP_NAME: "WhiteGator AI Gateway",
  DEFAULT_GATEWAY_URL: "https://llm.testinggator.online/api/",
  DEFAULT_UI_URL: "http://localhost:3000",
  API_V1_PREFIX: "/api/v1",
  OPENAI_GATEWAY_PREFIX: "/v1",
};

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 4,
    maximumFractionDigits: 6,
  }).format(amount);
}
