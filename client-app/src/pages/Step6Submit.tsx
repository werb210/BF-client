import { useState } from "react";

export default function Step6Submit({ onSubmit }: { onSubmit: (data: any) => void }) {
  const [accepted, setAccepted] = useState(false);
  const [signature, setSignature] = useState("");

  function handleSubmit() {
    if (!accepted || !signature) {
      alert("Must accept terms and sign");
      return;
    }

    onSubmit({
      accepted,
      signature,
    });
  }

  return (
    <div>
      <h2>Terms & Signature</h2>

      <label>
        <input
          type="checkbox"
          checked={accepted}
          onChange={(e) => setAccepted(e.target.checked)}
        />
        Accept Terms
      </label>

      <input
        type="text"
        placeholder="Type your name"
        value={signature}
        onChange={(e) => setSignature(e.target.value)}
      />

      <button onClick={handleSubmit}>Submit</button>
    </div>
  );
}
