import { ReactNode } from "react";

const ALLOWED_HOSTS = [
  "abc.rune-ai.xyz",
];

const DEV_HOST_PATTERNS = [
  /\.replit\.dev$/i,
  /\.repl\.co$/i,
  /\.replit\.app$/i,
  /^localhost$/i,
  /^127\.0\.0\.1$/,
];

function isAllowedHost(host: string) {
  if (ALLOWED_HOSTS.includes(host.toLowerCase())) return true;
  return DEV_HOST_PATTERNS.some((re) => re.test(host));
}

export default function HostGate({ children }: { children: ReactNode }) {
  const host = typeof window !== "undefined" ? window.location.hostname : "";
  if (isAllowedHost(host)) return <>{children}</>;

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0b1120",
        color: "#94a3b8",
        fontFamily: "system-ui, sans-serif",
        textAlign: "center",
        padding: "2rem",
      }}
    >
      <div>
        <h1 style={{ fontSize: "5rem", margin: 0, color: "#f8fafc", fontWeight: 700 }}>
          404
        </h1>
        <p style={{ marginTop: "0.5rem", fontSize: "1rem" }}>
          Page not found
        </p>
      </div>
    </div>
  );
}
