const personalDomains = new Set([
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "yahoo.co.in",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "icloud.com",
  "proton.me",
  "protonmail.com",
  "rediffmail.com",
  "aol.com",
  "zoho.com",
]);
export function isWorkEmail(email: string) {
  const domain = email.trim().toLowerCase().split("@")[1];
  return !!domain && !personalDomains.has(domain);
}
