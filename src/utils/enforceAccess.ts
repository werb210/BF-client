import { CLIENT_ACCESS_RULES } from '../constants/accessRules';

export function enforceClientAccess(requestedField: string) {
  if (
    requestedField in CLIENT_ACCESS_RULES &&
    CLIENT_ACCESS_RULES[requestedField as keyof typeof CLIENT_ACCESS_RULES] === false
  ) {
    throw new Error('SYSTEM CONTRACT VIOLATION: Unauthorized client access');
  }
}
