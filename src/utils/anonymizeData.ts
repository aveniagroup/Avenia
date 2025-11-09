const PII_REPLACEMENTS: Record<string, string> = {
  'email': '[EMAIL REDACTED]',
  'phone': '[PHONE REDACTED]',
  'ssn': '[SSN REDACTED]',
  'credit_card': '[CREDIT CARD REDACTED]',
  'name': '[NAME REDACTED]',
  'address': '[ADDRESS REDACTED]',
  'ip_address': '[IP ADDRESS REDACTED]',
  'date_of_birth': '[DOB REDACTED]',
  'passport': '[PASSPORT REDACTED]',
  'driver_license': '[LICENSE REDACTED]',
  'bank_account': '[ACCOUNT REDACTED]',
  'medical': '[MEDICAL INFO REDACTED]',
  'financial': '[FINANCIAL INFO REDACTED]',
  'personal': '[PERSONAL INFO REDACTED]',
  'auth': '[CREDENTIALS REDACTED]',
  'postal_code': '[ZIP CODE REDACTED]',
};

const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/gi;
const PHONE_REGEX = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
const SSN_REGEX = /\b\d{3}-\d{2}-\d{4}\b/g;
// Match credit cards with separators (spaces, dashes) or without
const CREDIT_CARD_WITH_SEP = /\b\d{4}[\s\-]+\d{4}[\s\-]+\d{4}[\s\-]+\d{4}\b/g;
const CREDIT_CARD_NO_SEP = /\b\d{16}\b/g;
const IP_REGEX = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;
const POSTAL_CODE_REGEX = /\b\d{5}(?:-\d{4})?\b/g;

// Keyword-based patterns for sensitive categories
const MEDICAL_KEYWORDS = ['diagnosis', 'prescription', 'medication', 'symptom', 'treatment', 'patient', 'doctor', 'hospital', 'medical history'];
const FINANCIAL_KEYWORDS = ['bank account', 'routing number', 'credit card', 'debit card', 'payment', 'invoice', 'balance', 'transaction'];
const PERSONAL_KEYWORDS = ['date of birth', 'dob', 'birthdate', 'passport', 'driver license', 'driver\'s license', 'social security'];
const AUTH_KEYWORDS = ['password', 'pin', 'passcode', 'secret', 'api key', 'token', 'credentials'];

export function anonymizeText(text: string, piiTypes: string[]): string {
  let anonymized = text;

  // Apply regex-based replacements
  if (piiTypes.includes('email')) {
    anonymized = anonymized.replace(EMAIL_REGEX, PII_REPLACEMENTS.email);
  }
  if (piiTypes.includes('phone')) {
    anonymized = anonymized.replace(PHONE_REGEX, PII_REPLACEMENTS.phone);
  }
  if (piiTypes.includes('ssn')) {
    anonymized = anonymized.replace(SSN_REGEX, PII_REPLACEMENTS.ssn);
  }
  // Anonymize credit cards if either 'credit_card' OR 'financial' is detected
  if (piiTypes.includes('credit_card') || piiTypes.includes('financial')) {
    anonymized = anonymized.replace(CREDIT_CARD_WITH_SEP, PII_REPLACEMENTS.credit_card);
    anonymized = anonymized.replace(CREDIT_CARD_NO_SEP, PII_REPLACEMENTS.credit_card);
  }
  if (piiTypes.includes('ip_address')) {
    anonymized = anonymized.replace(IP_REGEX, PII_REPLACEMENTS.ip_address);
  }
  if (piiTypes.includes('postal_code')) {
    anonymized = anonymized.replace(POSTAL_CODE_REGEX, PII_REPLACEMENTS.postal_code);
  }

  // Keyword-based anonymization
  if (piiTypes.includes('medical')) {
    for (const keyword of MEDICAL_KEYWORDS) {
      const regex = new RegExp(`\\b${keyword}\\b[^.!?]*[.!?]`, 'gi');
      anonymized = anonymized.replace(regex, PII_REPLACEMENTS.medical);
    }
  }
  if (piiTypes.includes('financial')) {
    for (const keyword of FINANCIAL_KEYWORDS) {
      const regex = new RegExp(`\\b${keyword}\\b[^.!?]*[.!?]`, 'gi');
      anonymized = anonymized.replace(regex, PII_REPLACEMENTS.financial);
    }
  }
  if (piiTypes.includes('personal')) {
    for (const keyword of PERSONAL_KEYWORDS) {
      const regex = new RegExp(`\\b${keyword}\\b[^.!?]*[.!?]`, 'gi');
      anonymized = anonymized.replace(regex, PII_REPLACEMENTS.personal);
    }
  }
  if (piiTypes.includes('auth')) {
    for (const keyword of AUTH_KEYWORDS) {
      const regex = new RegExp(`\\b${keyword}\\b[^.!?]*[.!?]`, 'gi');
      anonymized = anonymized.replace(regex, PII_REPLACEMENTS.auth);
    }
  }

  return anonymized;
}

export function anonymizeTicketData(ticketData: any, piiTypes: string[]) {
  const anonymized = { ...ticketData };

  if (anonymized.title) {
    anonymized.title = anonymizeText(anonymized.title, piiTypes);
  }
  if (anonymized.description) {
    anonymized.description = anonymizeText(anonymized.description, piiTypes);
  }
  if (piiTypes.includes('email') && anonymized.customer_email) {
    anonymized.customer_email = PII_REPLACEMENTS.email;
  }
  if (piiTypes.includes('phone') && anonymized.customer_phone) {
    anonymized.customer_phone = PII_REPLACEMENTS.phone;
  }
  if (piiTypes.includes('name') && anonymized.customer_name) {
    anonymized.customer_name = PII_REPLACEMENTS.name;
  }

  return anonymized;
}

export function anonymizeMessages(messages: any[], piiTypes: string[]) {
  return messages.map(msg => ({
    ...msg,
    content: anonymizeText(msg.content, piiTypes),
    sender_email: piiTypes.includes('email') ? PII_REPLACEMENTS.email : msg.sender_email,
    sender_name: piiTypes.includes('name') ? PII_REPLACEMENTS.name : msg.sender_name,
  }));
}
