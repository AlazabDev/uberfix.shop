const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const ALLOWED_MIME = /^(image\/|application\/pdf|video\/|audio\/)/i;
const MAX_FILE_BYTES = 25 * 1024 * 1024; // 25 MB
const ALLOWED_FOLDERS = new Set([
  "/chat-uploads",
  "/documents",
  "/technician-uploads",
  "/customer-uploads",
]);

function sanitizeFileName(name: string): string {
  // Strip directory components and dangerous chars
  const base = name.split(/[\\/]/).pop() || "file";
  return base.replace(/\.{2,}/g, ".").replace(/[^\w.\-\u0600-\u06FF ]+/g, "_").slice(0, 200) || "file";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS });
  }

  // ── AUTH: require a valid Supabase user JWT ──────────────────────────────
  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
  const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: { user }, error: userErr } = await authClient.auth.getUser();
  if (userErr || !user) {
    return new Response(JSON.stringify({ error: "Invalid or expired token" }), {
      status: 401,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  const SEAFILE_BASE_URL = Deno.env.get("SEAFILE_BASE_URL");
  const SEAFILE_API_TOKEN = Deno.env.get("SEAFILE_API_TOKEN");
  const REPO_ID = "c51e76e8-052a-49fd-b03a-bf2727986cf3";

  if (!SEAFILE_BASE_URL || !SEAFILE_API_TOKEN) {
    return new Response(JSON.stringify({ error: "Seafile not configured" }), {
      status: 500,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const requestedFolder = (formData.get("folder") as string) || "/chat-uploads";
    const folder = ALLOWED_FOLDERS.has(requestedFolder) ? requestedFolder : "/chat-uploads";

    if (!file) {
      return new Response(JSON.stringify({ error: "No file provided" }), {
        status: 400,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const safeName = sanitizeFileName(file.name);

    // ── File validation ────────────────────────────────────────────────────
    if (file.size > MAX_FILE_BYTES) {
      return new Response(JSON.stringify({ error: "File too large (max 25MB)" }), {
        status: 413,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }
    if (file.type && !ALLOWED_MIME.test(file.type)) {
      return new Response(JSON.stringify({ error: "Unsupported file type" }), {
        status: 415,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    // Step 1: Get upload link
    const uploadLinkResp = await fetch(
      `${SEAFILE_BASE_URL}/api2/repos/${REPO_ID}/upload-link/?p=${encodeURIComponent(folder)}`,
      {
        headers: { Authorization: `Token ${SEAFILE_API_TOKEN}` },
      }
    );

    if (!uploadLinkResp.ok) {
      const errText = await uploadLinkResp.text();
      console.error("Upload link error:", errText);
      return new Response(JSON.stringify({ error: "Failed to get upload link" }), {
        status: 500,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const uploadLink = (await uploadLinkResp.json()) as string;

    // Step 2: Upload the file
    const uploadForm = new FormData();
    uploadForm.append("file", file, safeName);
    uploadForm.append("parent_dir", folder);
    uploadForm.append("replace", "1");

    const uploadResp = await fetch(uploadLink, {
      method: "POST",
      headers: { Authorization: `Token ${SEAFILE_API_TOKEN}` },
      body: uploadForm,
    });

    if (!uploadResp.ok) {
      const errText = await uploadResp.text();
      console.error("Upload error:", errText);
      return new Response(JSON.stringify({ error: "Upload failed" }), {
        status: 500,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    // Step 3: Get share link for the file
    const filePath = `${folder}/${safeName}`;

    // Create a file share link
    const shareLinkResp = await fetch(
      `${SEAFILE_BASE_URL}/api/v2.1/share-links/`,
      {
        method: "POST",
        headers: {
          Authorization: `Token ${SEAFILE_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          repo_id: REPO_ID,
          path: filePath,
          permissions: { can_download: true },
        }),
      }
    );

    let fileUrl = "";
    if (shareLinkResp.ok) {
      const shareData = await shareLinkResp.json();
      fileUrl = shareData.link || "";
    } else {
      // Fallback: construct a direct download URL
      fileUrl = `${SEAFILE_BASE_URL}/lib/${REPO_ID}/file${encodeURIComponent(filePath)}`;
    }

    return new Response(
      JSON.stringify({
        success: true,
        file_name: safeName,
        file_size: file.size,
        file_type: file.type,
        file_url: fileUrl,
        file_path: filePath,
      }),
      {
        headers: { ...CORS, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Seafile upload error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...CORS, "Content-Type": "application/json" },
      }
    );
  }
});
