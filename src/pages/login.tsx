import Head from "next/head";
import { useRouter } from "next/router";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseClient";

export default function LoginPage() {
  const r = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  return (
    <>
      <Head><title>15 Admin — Login</title></Head>

      <main className="aShell">
        <section className="aCard">
          <div className="aBrand">15 ADMIN</div>
          <h1 className="aH1">Sign in</h1>
          <p className="aP">Authorized personnel only.</p>

          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setErr(null);
              setLoading(true);

     const { data, error } = await supabaseBrowser.auth.signInWithPassword({
  email,
  password,
});

if (error) {
  console.log("LOGIN ERROR:", error);
  setErr(error.message);
  setLoading(false);
  return;
}

// ★ ここが差し込みポイント（ログイン成功確認）
console.log("LOGIN OK user:", data.session?.user?.id);
console.log("ACCESS TOKEN:", data.session?.access_token);

// admin判定（/api/admin/me）
const token = data.session?.access_token;
const me = await fetch("/api/admin/me", {
  headers: { Authorization: `Bearer ${token}` },
});

if (!me.ok) {
  console.log("ADMIN CHECK FAILED", me.status);
  await supabaseBrowser.auth.signOut();
  setErr("Not an admin account.");
  setLoading(false);
  return;
}

console.log("ADMIN CHECK OK");
r.push("/admin");


            }}
          >
            <label className="aLabel">Email</label>
            <input className="aInput" value={email} onChange={(e) => setEmail(e.target.value)} />

            <label className="aLabel" style={{ marginTop: 14 }}>Password</label>
            <input className="aInput" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />

            {err ? <div className="aErr">{err}</div> : null}

            <button className="aBtn" disabled={loading}>
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </section>
      </main>
    </>
  );
}
