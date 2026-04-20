const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const API = `${BASE}/api`;

export async function apiFetch(
  path: string,
  token: string,
  options?: RequestInit
): Promise<Response> {
  return fetch(`${API}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options?.headers ?? {}),
    },
  });
}

export async function uploadFile(file: File, token: string): Promise<{ fileUrl: string; originalName: string }> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${API}/admin/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  if (!res.ok) throw new Error("Upload failed");
  return res.json();
}
