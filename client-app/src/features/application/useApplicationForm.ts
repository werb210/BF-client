import { useState } from "react";

export function useApplicationForm() {
  const [form, setForm] = useState<Record<string, any>>({});

  function updateField(key: string, value: any) {
    setForm(prev => ({
      ...prev,
      [key]: value,
    }));
  }

  return {
    form,
    updateField,
    setForm,
  };
}
