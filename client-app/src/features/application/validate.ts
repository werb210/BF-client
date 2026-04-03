export function validateApplication(form: any) {
  const errors: Record<string, string> = {};

  if (!form.email || !form.email.includes("@")) {
    errors.email = "Invalid email";
  }

  if (!form.firstName) {
    errors.firstName = "Required";
  }

  if (!form.lastName) {
    errors.lastName = "Required";
  }

  return errors;
}
