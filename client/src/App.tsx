import VeriffCheck from "./veriff/VeriffCheck";

export default function App() {
  return (
    <main style={{ maxWidth: 720, margin: "40px auto", fontFamily: "system-ui" }}>
      <h1>Veriff + React + Vite</h1>
      <p>Exemplo simples integrando o Veriff Web SDK.</p>
      <VeriffCheck />
    </main>
  );
}
