export default {
  async email(message, env, ctx) {
    try {
      // message.raw is a ReadableStream of the full RFC822 MIME email
      const raw = await new Response(message.raw).arrayBuffer();
      const backendUrl = env.RESDROP_BACKEND_URL || "https://resdrop.app/api/inbound/cloudflare-email";

      const res = await fetch(backendUrl, {
        method: "POST",
        headers: {
          "Content-Type": "message/rfc822",
          "X-Inbound-Secret": env.INBOUND_WEBHOOK_SECRET || "",
        },
        body: raw,
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error(`[ResDrop Inbound] POST failed (${res.status}): ${errorText}`);
      } else {
        console.log(`[ResDrop Inbound] Email processed successfully (${res.status})`);
      }
    } catch (err) {
      console.error(`[ResDrop Inbound] Worker error: ${err.message}`);
    }
  },
};
