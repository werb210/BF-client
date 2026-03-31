import MayaClientChat from "../components/MayaClientChat";

export function MayaPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-4 text-2xl font-semibold">Maya Assistant</h1>
      <MayaClientChat />
    </main>
  );
}
